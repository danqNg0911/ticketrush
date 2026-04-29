"""Security utility tests."""

from datetime import UTC, datetime, timedelta

import pytest
from fastapi import HTTPException

from app.models.enums import EventStatus
from app.models.game import GameConfig, PrizePool
from app.schemas.event import EventCreateRequest, SeatZoneCreate
from app.schemas.game import GamePlayRequest
from app.core.security import create_access_token, decode_access_token, hash_password, verify_password
from app.services.event_service import create_event_with_matrix
from app.services.game_service import issue_signed_payload, play_game


def test_password_hashing_roundtrip() -> None:
    """Password hash should verify only the same plain text."""

    password = "StrongPass@123"
    hashed = hash_password(password)

    assert hashed != password
    assert verify_password(password, hashed)
    assert not verify_password("wrong-password", hashed)


def test_jwt_roundtrip() -> None:
    """JWT helper should encode and decode subject claim."""

    token = create_access_token("42")
    payload = decode_access_token(token)

    assert payload["sub"] == "42"


def test_game_signed_payload_shape() -> None:
    nonce, timestamp, signature = issue_signed_payload(user_id=1, event_id=2, game_type="wheel")
    assert len(nonce) >= 16
    assert isinstance(timestamp, int)
    assert len(signature) == 64


class _FakeRedis:
    def __init__(self) -> None:
        self.store: dict[str, str] = {}
        self.counters: dict[str, int] = {}
        self.sets: dict[str, set[str]] = {}

    async def get(self, key: str):
        return self.store.get(key)

    async def set(self, key: str, value: str, ex: int | None = None):
        self.store[key] = value

    async def incr(self, key: str):
        current = self.counters.get(key, 0) + 1
        self.counters[key] = current
        return current

    async def expire(self, key: str, ttl: int):
        return True

    async def sadd(self, key: str, value: str):
        if key not in self.sets:
            self.sets[key] = set()
        self.sets[key].add(value)
        return True

    async def scard(self, key: str):
        return len(self.sets.get(key, set()))

    async def keys(self, pattern: str):
        return []

    async def delete(self, *keys: str):
        return 0


@pytest.mark.asyncio
async def test_game_replay_same_signed_payload_is_rejected(db_session, admin_user, customer_users, monkeypatch) -> None:
    customer, _ = customer_users
    event = await create_event_with_matrix(
        db_session,
        admin_user.id,
        EventCreateRequest(
            title="Replay Test Event",
            description="Security replay checks",
            category="Concert",
            venue="Test Hall",
            start_at=datetime.now(UTC) + timedelta(days=1),
            end_at=datetime.now(UTC) + timedelta(days=1, hours=2),
            cover_image_url="",
            status=EventStatus.LIVE,
            hold_minutes=10,
            queue_enabled=False,
            queue_release_batch=50,
            max_active_queue_tokens=100,
            zones=[SeatZoneCreate(code="A", name="Zone A", row_count=1, seats_per_row=1, price=100, color="#ffffff")],
        ),
    )
    db_session.add(GameConfig(event_id=event.id, game_type="wheel", is_active=True, daily_reset_cron="0 0 * * *", max_plays_per_user_per_day=3))
    db_session.add(PrizePool(event_id=event.id, tier_name="Tier 10", discount_percent=10, initial_qty=100, remaining_qty=100, weight=100))
    await db_session.commit()

    monkeypatch.setattr("app.services.game_service.redis_client", _FakeRedis())

    nonce, ts, sig = issue_signed_payload(user_id=customer.id, event_id=event.id, game_type="wheel")
    payload = GamePlayRequest(event_id=event.id, game_type="wheel", nonce=nonce, timestamp=ts, signed_payload=sig, captcha_token="passed")
    await play_game(db_session, user_id=customer.id, payload=payload, ip="127.0.0.1", user_agent="pytest")

    with pytest.raises(HTTPException) as replay_err:
        await play_game(db_session, user_id=customer.id, payload=payload, ip="127.0.0.1", user_agent="pytest")
    assert replay_err.value.status_code == 400


@pytest.mark.asyncio
async def test_game_tampered_signed_payload_is_rejected(db_session, admin_user, customer_users, monkeypatch) -> None:
    customer, _ = customer_users
    event = await create_event_with_matrix(
        db_session,
        admin_user.id,
        EventCreateRequest(
            title="Tamper Test Event",
            description="Tamper checks",
            category="Concert",
            venue="Test Hall",
            start_at=datetime.now(UTC) + timedelta(days=1),
            end_at=datetime.now(UTC) + timedelta(days=1, hours=2),
            cover_image_url="",
            status=EventStatus.LIVE,
            hold_minutes=10,
            queue_enabled=False,
            queue_release_batch=50,
            max_active_queue_tokens=100,
            zones=[SeatZoneCreate(code="A", name="Zone A", row_count=1, seats_per_row=1, price=100, color="#ffffff")],
        ),
    )
    db_session.add(GameConfig(event_id=event.id, game_type="wheel", is_active=True, daily_reset_cron="0 0 * * *", max_plays_per_user_per_day=3))
    db_session.add(PrizePool(event_id=event.id, tier_name="Tier 10", discount_percent=10, initial_qty=100, remaining_qty=100, weight=100))
    await db_session.commit()
    monkeypatch.setattr("app.services.game_service.redis_client", _FakeRedis())

    nonce, ts, sig = issue_signed_payload(user_id=customer.id, event_id=event.id, game_type="wheel")
    tampered = sig[:-1] + ("0" if sig[-1] != "0" else "1")
    payload = GamePlayRequest(event_id=event.id, game_type="wheel", nonce=nonce, timestamp=ts, signed_payload=tampered)
    with pytest.raises(HTTPException) as tamper_err:
        await play_game(db_session, user_id=customer.id, payload=payload, ip="127.0.0.1", user_agent="pytest")
    assert tamper_err.value.status_code == 400


@pytest.mark.asyncio
async def test_game_bruteforce_rate_limit_or_captcha_blocks(db_session, admin_user, customer_users, monkeypatch) -> None:
    customer, _ = customer_users
    event = await create_event_with_matrix(
        db_session,
        admin_user.id,
        EventCreateRequest(
            title="Bruteforce Test Event",
            description="Bruteforce checks",
            category="Concert",
            venue="Test Hall",
            start_at=datetime.now(UTC) + timedelta(days=1),
            end_at=datetime.now(UTC) + timedelta(days=1, hours=2),
            cover_image_url="",
            status=EventStatus.LIVE,
            hold_minutes=10,
            queue_enabled=False,
            queue_release_batch=50,
            max_active_queue_tokens=100,
            zones=[SeatZoneCreate(code="A", name="Zone A", row_count=1, seats_per_row=1, price=100, color="#ffffff")],
        ),
    )
    db_session.add(GameConfig(event_id=event.id, game_type="wheel", is_active=True, daily_reset_cron="0 0 * * *", max_plays_per_user_per_day=200))
    db_session.add(PrizePool(event_id=event.id, tier_name="Tier 10", discount_percent=10, initial_qty=200, remaining_qty=200, weight=100))
    await db_session.commit()
    monkeypatch.setattr("app.services.game_service.redis_client", _FakeRedis())

    blocked = False
    for _ in range(20):
        nonce, ts, sig = issue_signed_payload(user_id=customer.id, event_id=event.id, game_type="wheel")
        payload = GamePlayRequest(event_id=event.id, game_type="wheel", nonce=nonce, timestamp=ts, signed_payload=sig)
        try:
            await play_game(db_session, user_id=customer.id, payload=payload, ip="127.0.0.1", user_agent="pytest")
        except HTTPException as exc:
            assert exc.status_code in (403, 429)
            blocked = True
            break
    assert blocked
