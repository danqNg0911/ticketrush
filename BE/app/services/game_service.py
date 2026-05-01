"""Game engine services: weighted random, daily limits, discount vouchers."""

from __future__ import annotations

import hmac
import json
import secrets
from datetime import UTC, date, datetime, timedelta
from hashlib import sha256
from random import randint

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.cache import GAME_STATUS_CACHE_NAMESPACE, game_status_cache_namespace, public_api_cache
from app.core.config import get_settings
from app.core.redis_client import get_redis_client
from app.models.event import Event
from app.models.game import GameAuditLog, GameConfig, GameDailyLog, PrizePool, UserDailyPlay, WonDiscount
from app.schemas.game import GamePlayRequest, GamePlayResponse, GameStatusResponse, MyDiscountResponse

settings = get_settings()
redis_client = get_redis_client()
RAPID_FIRE_MS = 120
RAPID_FIRE_BURST_LIMIT = 3
REQ_PER_MINUTE_FLAG_LIMIT = 30
REQ_PER_MINUTE_HARD_LIMIT = 60
IP_SHARED_ACCOUNTS_FLAG_LIMIT = 12


def _next_midnight_utc(now: datetime) -> datetime:
    base = now.astimezone(UTC)
    return datetime(base.year, base.month, base.day, tzinfo=UTC) + timedelta(days=1)


async def _verify_signature(payload: GamePlayRequest, user_id: int) -> None:
    now_ts = int(datetime.now(UTC).timestamp())
    if abs(now_ts - payload.timestamp) > 120:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Expired signed payload")

    sign_body = f"{user_id}:{payload.event_id}:{payload.game_type}:{payload.nonce}:{payload.timestamp}"
    expected = hmac.new(settings.game_secret.encode("utf-8"), sign_body.encode("utf-8"), sha256).hexdigest()
    if not hmac.compare_digest(expected, payload.signed_payload):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid signed payload")

    nonce_key = f"game:nonce:{user_id}:{payload.event_id}:{payload.game_type}:{payload.nonce}"
    nonce_exists = await redis_client.get(nonce_key)
    if nonce_exists:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Replay payload detected")
    await redis_client.set(nonce_key, "1", ex=180)


def _weighted_pick_segment(pools: list[PrizePool]) -> PrizePool | None:
    weighted = [pool for pool in pools if pool.remaining_qty > 0 and pool.weight > 0]
    if not weighted:
        return None

    total_weight = sum(pool.weight for pool in weighted)
    roll = randint(1, total_weight)
    current = 0
    for pool in weighted:
        current += pool.weight
        if roll <= current:
            return pool
    return weighted[-1]


def _generate_discount_code() -> str:
    return f"TRD-{secrets.token_hex(6).upper()}"


async def _get_event_or_404(session: AsyncSession, event_id: int) -> Event:
    event = await session.scalar(select(Event).where(Event.id == event_id, Event.is_deleted.is_(False)))
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")
    return event


async def play_game(
    session: AsyncSession,
    user_id: int,
    payload: GamePlayRequest,
    ip: str = "unknown",
    user_agent: str = "",
) -> GamePlayResponse:
    await _verify_signature(payload, user_id)
    event = await _get_event_or_404(session, payload.event_id)
    now = datetime.now(UTC)
    today = now.date()

    config = await session.scalar(
        select(GameConfig).where(GameConfig.event_id == payload.event_id, GameConfig.game_type == payload.game_type)
    )
    if not config or not config.is_active:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Game is not active for this event")

    risk_flags: list[str] = []
    status_code = 200
    result_tier = "none"
    try:
        # Anti-fraud signals from Redis.
        signal_key = f"game:signal:{payload.event_id}:{user_id}:{payload.game_type}"
        ip_key = f"game:ip:{payload.event_id}:{ip}"
        last_ts_raw = await redis_client.get(signal_key)
        now_ms = int(datetime.now(UTC).timestamp() * 1000)
        if last_ts_raw:
            try:
                if now_ms - int(last_ts_raw) < RAPID_FIRE_MS:
                    burst_hits = await redis_client.incr(f"game:rapid:{payload.event_id}:{user_id}:{payload.game_type}")
                    if burst_hits == 1:
                        await redis_client.expire(f"game:rapid:{payload.event_id}:{user_id}:{payload.game_type}", 10)
                    if burst_hits >= RAPID_FIRE_BURST_LIMIT:
                        risk_flags.append("rapid_fire_burst")
            except ValueError:
                pass
        await redis_client.set(signal_key, str(now_ms), ex=120)

        per_minute = await redis_client.incr(f"game:req:min:{user_id}")
        if per_minute == 1:
            await redis_client.expire(f"game:req:min:{user_id}", 60)
        if per_minute > REQ_PER_MINUTE_FLAG_LIMIT:
            risk_flags.append("req_gt_30_per_min")
        if per_minute > REQ_PER_MINUTE_HARD_LIMIT:
            raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail="Too many game requests")

        await redis_client.sadd(ip_key, str(user_id))
        await redis_client.expire(ip_key, 3600)
        account_count = await redis_client.scard(ip_key)
        if account_count > IP_SHARED_ACCOUNTS_FLAG_LIMIT:
            risk_flags.append("multi_accounts_same_ip")

        strict_flags = {"rapid_fire_burst", "req_gt_30_per_min"}
        if strict_flags.intersection(risk_flags) and payload.captcha_token != "passed":
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="CAPTCHA required")

        daily = await session.scalar(
            select(UserDailyPlay).where(UserDailyPlay.user_id == user_id, UserDailyPlay.play_date == today).with_for_update()
        )
        if not daily:
            daily = UserDailyPlay(user_id=user_id, play_date=today, wheel_count=0, scratch_count=0)
            session.add(daily)
            await session.flush()

        play_count = daily.wheel_count if payload.game_type == "wheel" else daily.scratch_count
        if play_count >= config.max_plays_per_user_per_day:
            raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail="Daily play limit reached")

        pools = list(
            await session.scalars(
                select(PrizePool)
                .where(PrizePool.event_id == payload.event_id)
                .order_by(PrizePool.discount_percent.desc(), PrizePool.id.asc())
                .with_for_update()
            )
        )
        if not pools:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Prize pool is not configured")

        winner_pool = _weighted_pick_segment(pools)
        if winner_pool is None:
            fallback = min(pools, key=lambda p: float(p.discount_percent))
            response = GamePlayResponse(
                segment_index=pools.index(fallback),
                discount_code=None,
                tier_name="Chuc ban may man lan sau",
                discount_percent=0,
                message="Da het qua hom nay",
            )
            result_tier = response.tier_name
        else:
            winner_pool.remaining_qty -= 1
            code = _generate_discount_code()
            won = WonDiscount(
                code=code,
                user_id=user_id,
                event_id=event.id,
                tier=winner_pool.tier_name,
                discount_percent=winner_pool.discount_percent,
                expires_at=now + timedelta(days=7),
                status="active",
            )
            session.add(won)
            response = GamePlayResponse(
                segment_index=pools.index(winner_pool),
                discount_code=code,
                tier_name=winner_pool.tier_name,
                discount_percent=float(winner_pool.discount_percent),
                message="Trung thuong",
            )
            result_tier = response.tier_name

        if payload.game_type == "wheel":
            daily.wheel_count += 1
        else:
            daily.scratch_count += 1

        await session.commit()
    except HTTPException as exc:
        status_code = exc.status_code
        result_tier = result_tier or "error"
        await session.rollback()
        raise
    except Exception:
        status_code = 500
        await session.rollback()
        raise
    finally:
        try:
            session.add(
                GameAuditLog(
                    user_id=user_id,
                    event_id=payload.event_id,
                    game_type=payload.game_type,
                    ip=ip,
                    user_agent=user_agent[:255],
                    result_tier=result_tier,
                    status_code=status_code,
                    risk_flags=json.dumps(risk_flags),
                )
            )
            await session.commit()
        except Exception:
            await session.rollback()

    await public_api_cache.invalidate_namespace(game_status_cache_namespace(payload.event_id))
    return response


def issue_signed_payload(user_id: int, event_id: int, game_type: str) -> tuple[str, int, str]:
    nonce = secrets.token_hex(8)
    timestamp = int(datetime.now(UTC).timestamp())
    sign_body = f"{user_id}:{event_id}:{game_type}:{nonce}:{timestamp}"
    signature = hmac.new(settings.game_secret.encode("utf-8"), sign_body.encode("utf-8"), sha256).hexdigest()
    return nonce, timestamp, signature


async def game_status(session: AsyncSession, user_id: int, event_id: int) -> GameStatusResponse:
    await _get_event_or_404(session, event_id)
    now = datetime.now(UTC)
    today = now.date()

    namespace = game_status_cache_namespace(event_id)
    cache_key = (user_id, event_id, today.isoformat())
    cached = await public_api_cache.get(namespace, cache_key)
    if cached is not None:
        return cached

    pools = list(await session.scalars(select(PrizePool).where(PrizePool.event_id == event_id).order_by(PrizePool.id.asc())))
    daily = await session.scalar(select(UserDailyPlay).where(UserDailyPlay.user_id == user_id, UserDailyPlay.play_date == today))
    response = GameStatusResponse(
        remaining_prizes=[
            {
                "tier_name": pool.tier_name,
                "discount_percent": float(pool.discount_percent),
                "remaining_qty": pool.remaining_qty,
                "weight": pool.weight,
            }
            for pool in pools
        ],
        user_plays_today={
            "wheel_count": daily.wheel_count if daily else 0,
            "scratch_count": daily.scratch_count if daily else 0,
        },
        next_reset_time=_next_midnight_utc(now),
    )
    return await public_api_cache.set(namespace, cache_key, response, ttl_seconds=15)


async def my_discounts(session: AsyncSession, user_id: int) -> list[MyDiscountResponse]:
    rows = list(
        await session.scalars(
            select(WonDiscount)
            .where(WonDiscount.user_id == user_id)
            .order_by(WonDiscount.created_at.desc())
        )
    )
    return [
        MyDiscountResponse(
            code=row.code,
            event_id=row.event_id,
            tier=row.tier,
            discount_percent=float(row.discount_percent),
            status=row.status,
            expires_at=row.expires_at,
            used_at=row.used_at,
        )
        for row in rows
    ]


async def consume_discount_for_checkout(session: AsyncSession, user_id: int, event_id: int, code: str) -> float:
    now = datetime.now(UTC)
    voucher = await session.scalar(
        select(WonDiscount)
        .where(
            WonDiscount.code == code,
            WonDiscount.user_id == user_id,
            WonDiscount.event_id == event_id,
            WonDiscount.status == "active",
        )
        .with_for_update()
    )
    if not voucher:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid discount code")
    if voucher.expires_at < now:
        voucher.status = "expired"
        await session.flush()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Discount code expired")

    voucher.status = "used"
    voucher.used_at = now
    await session.flush()
    return float(voucher.discount_percent)


async def reset_daily_game_state(session: AsyncSession) -> None:
    today = date.today()
    yesterday = today - timedelta(days=1)
    day_start = datetime(yesterday.year, yesterday.month, yesterday.day, tzinfo=UTC)
    day_end = day_start + timedelta(days=1)

    event_ids = list(await session.scalars(select(PrizePool.event_id).distinct()))
    for event_id in event_ids:
        total_plays = int(
            (
                await session.scalar(
                    select(func.coalesce(func.sum(UserDailyPlay.wheel_count + UserDailyPlay.scratch_count), 0)).where(
                        UserDailyPlay.play_date == yesterday
                    )
                )
            )
            or 0
        )
        total_wins = int(
            (
                await session.scalar(
                    select(func.count(WonDiscount.id)).where(
                        WonDiscount.event_id == event_id,
                        WonDiscount.created_at >= day_start,
                        WonDiscount.created_at < day_end,
                    )
                )
            )
            or 0
        )
        log = GameDailyLog(
            log_date=yesterday,
            event_id=event_id,
            total_plays=total_plays,
            total_wins=total_wins,
            summary_json=json.dumps({"source": "cron", "event_id": event_id}),
        )
        session.add(log)

    for pool in list(await session.scalars(select(PrizePool).with_for_update())):
        pool.remaining_qty = pool.initial_qty

    await session.execute(
        UserDailyPlay.__table__.delete().where(UserDailyPlay.play_date < today)
    )
    await session.commit()
    await public_api_cache.invalidate_pattern(f"cache:{GAME_STATUS_CACHE_NAMESPACE}:*")


async def upsert_game_config(
    session: AsyncSession,
    event_id: int,
    game_type: str,
    is_active: bool,
    daily_reset_cron: str,
    max_plays_per_user_per_day: int,
) -> GameConfig:
    row = await session.scalar(select(GameConfig).where(GameConfig.event_id == event_id, GameConfig.game_type == game_type))
    if not row:
        row = GameConfig(
            event_id=event_id,
            game_type=game_type,
            is_active=is_active,
            daily_reset_cron=daily_reset_cron,
            max_plays_per_user_per_day=max_plays_per_user_per_day,
        )
        session.add(row)
    else:
        row.is_active = is_active
        row.daily_reset_cron = daily_reset_cron
        row.max_plays_per_user_per_day = max_plays_per_user_per_day
    await session.commit()
    await session.refresh(row)
    return row


async def list_game_configs(session: AsyncSession, event_id: int) -> list[GameConfig]:
    return list(await session.scalars(select(GameConfig).where(GameConfig.event_id == event_id).order_by(GameConfig.id.asc())))


async def list_prize_pools(session: AsyncSession, event_id: int) -> list[PrizePool]:
    return list(await session.scalars(select(PrizePool).where(PrizePool.event_id == event_id).order_by(PrizePool.discount_percent.desc())))


async def create_prize_pool(
    session: AsyncSession,
    event_id: int,
    tier_name: str,
    discount_percent: float,
    initial_qty: int,
    weight: int,
) -> PrizePool:
    pool = PrizePool(
        event_id=event_id,
        tier_name=tier_name,
        discount_percent=discount_percent,
        initial_qty=initial_qty,
        remaining_qty=initial_qty,
        weight=weight,
    )
    session.add(pool)
    await session.commit()
    await session.refresh(pool)
    await public_api_cache.invalidate_namespace(game_status_cache_namespace(event_id))
    return pool


async def update_prize_pool(
    session: AsyncSession,
    pool_id: int,
    tier_name: str,
    discount_percent: float,
    initial_qty: int,
    remaining_qty: int,
    weight: int,
) -> PrizePool | None:
    pool = await session.scalar(select(PrizePool).where(PrizePool.id == pool_id))
    if not pool:
        return None
    pool.tier_name = tier_name
    pool.discount_percent = discount_percent
    pool.initial_qty = initial_qty
    pool.remaining_qty = remaining_qty
    pool.weight = weight
    await session.commit()
    await session.refresh(pool)
    await public_api_cache.invalidate_namespace(game_status_cache_namespace(pool.event_id))
    return pool


async def delete_prize_pool(session: AsyncSession, pool_id: int) -> bool:
    pool = await session.scalar(select(PrizePool).where(PrizePool.id == pool_id))
    if not pool:
        return False
    await session.delete(pool)
    await session.commit()
    await public_api_cache.invalidate_namespace(game_status_cache_namespace(pool.event_id))
    return True
