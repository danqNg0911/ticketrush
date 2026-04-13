"""Seat lock, release, checkout and ticket management routes."""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.db import get_db_session
from app.models.user import User
from app.schemas.booking import (
    CheckoutRequest,
    CheckoutResponse,
    LockSeatsRequest,
    LockSeatsResponse,
    MyTicketResponse,
    ReleaseSeatsRequest,
)
from app.schemas.common import APIMessage
from app.services.booking_service import checkout_locked_seats, fetch_my_tickets, lock_seats, release_seats

router = APIRouter(prefix="/bookings", tags=["bookings"])


@router.post("/lock", response_model=LockSeatsResponse)
async def lock_event_seats(
    payload: LockSeatsRequest,
    session: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> LockSeatsResponse:
    """Lock one or many seats for current authenticated customer."""

    return await lock_seats(
        session=session,
        user_id=current_user.id,
        event_id=payload.event_id,
        seat_ids=payload.seat_ids,
        queue_token=payload.queue_token,
    )


@router.post("/release", response_model=APIMessage)
async def release_event_seats(
    payload: ReleaseSeatsRequest,
    session: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> APIMessage:
    """Release selected seats if they are currently locked by the same user."""

    released_count = await release_seats(
        session=session,
        user_id=current_user.id,
        event_id=payload.event_id,
        seat_ids=payload.seat_ids,
    )
    return APIMessage(detail=f"Released {released_count} seats")


@router.post("/checkout", response_model=CheckoutResponse)
async def checkout(
    payload: CheckoutRequest,
    session: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> CheckoutResponse:
    """Confirm checkout and mark user locked seats as sold tickets."""

    return await checkout_locked_seats(
        session=session,
        user_id=current_user.id,
        event_id=payload.event_id,
        queue_token=payload.queue_token,
    )


@router.get("/my-tickets", response_model=list[MyTicketResponse])
async def my_tickets(
    session: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> list[MyTicketResponse]:
    """List current user's purchased e-tickets with QR payload."""

    return await fetch_my_tickets(session, user_id=current_user.id)
