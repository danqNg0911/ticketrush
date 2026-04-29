"""Game and discount APIs."""

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_customer
from app.core.db import get_db_session
from app.core.rate_limit import rate_limit
from app.models.user import User
from app.schemas.game import GamePlayRequest, GamePlayResponse, GameSignedPayloadResponse, GameStatusResponse, MyDiscountResponse
from app.services.game_service import game_status, issue_signed_payload, my_discounts, play_game

router = APIRouter(tags=["games"])


@router.post("/game/play", response_model=GamePlayResponse, dependencies=[Depends(rate_limit("game-play", times=15, seconds=60))])
async def play(
    payload: GamePlayRequest,
    request: Request,
    session: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_customer),
) -> GamePlayResponse:
    client_ip = request.client.host if request.client else "unknown"
    user_agent = request.headers.get("user-agent", "")
    return await play_game(session, user_id=current_user.id, payload=payload, ip=client_ip, user_agent=user_agent)


@router.get("/game/sign", response_model=GameSignedPayloadResponse)
async def sign_play_request(
    event_id: int = Query(ge=1),
    game_type: str = Query(pattern="^(wheel|scratch)$"),
    current_user: User = Depends(get_current_customer),
) -> GameSignedPayloadResponse:
    nonce, timestamp, signed_payload = issue_signed_payload(current_user.id, event_id=event_id, game_type=game_type)
    return GameSignedPayloadResponse(nonce=nonce, timestamp=timestamp, signed_payload=signed_payload)


@router.get("/game/status", response_model=GameStatusResponse)
async def status(
    event_id: int = Query(ge=1),
    session: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_customer),
) -> GameStatusResponse:
    return await game_status(session, user_id=current_user.id, event_id=event_id)


@router.get("/discounts/me", response_model=list[MyDiscountResponse])
async def my_reward_discounts(
    session: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_customer),
) -> list[MyDiscountResponse]:
    return await my_discounts(session, user_id=current_user.id)
