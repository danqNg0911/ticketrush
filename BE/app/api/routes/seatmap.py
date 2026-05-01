"""Seat map and coordinate-based seat browsing routes."""

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_optional_current_user
from app.core.cache import event_seat_cache_namespace, public_api_cache
from app.core.db import get_db_session
from app.models.user import User
from app.models.venue import Section
from app.schemas.seatmap import SeatMapResponse, SeatMapSectionResponse
from app.services.event_service import get_event_by_slug_or_id
from app.services.inventory_service import get_seatmap

router = APIRouter(prefix="/events", tags=["seatmap"])


@router.get("/{event_key}/seatmap", response_model=SeatMapResponse)
async def event_seatmap(
    event_key: str,
    session: AsyncSession = Depends(get_db_session),
    current_user: User | None = Depends(get_optional_current_user),
) -> SeatMapResponse:
    """Get full seat map with coordinates for frontend rendering."""

    event = await get_event_by_slug_or_id(session, event_key)

    if current_user is None:
        cached = await public_api_cache.get(event_seat_cache_namespace(event.id), "seatmap_anonymous")
        if cached is not None:
            return cached

    response = SeatMapResponse.model_validate(
        await get_seatmap(
            session,
            event.id,
            current_user_id=current_user.id if current_user else None,
        )
    )

    if current_user is None:
        return await public_api_cache.set(
            event_seat_cache_namespace(event.id), "seatmap_anonymous", response, ttl_seconds=10
        )
    return response


@router.get("/{event_key}/sections", response_model=list[SeatMapSectionResponse])
async def event_sections(
    event_key: str,
    session: AsyncSession = Depends(get_db_session),
) -> list[SeatMapSectionResponse]:
    """Get section list with prices for an event."""

    event = await get_event_by_slug_or_id(session, event_key)

    if not event.venue_layout_id:
        return []

    sections = list(
        await session.scalars(
            select(Section)
            .where(Section.venue_layout_id == event.venue_layout_id)
            .order_by(Section.sort_order.asc())
        )
    )

    return [
        SeatMapSectionResponse(
            id=s.id,
            name=s.name,
            code=s.code,
            color=s.color,
            price_base=float(s.price_base),
        )
        for s in sections
    ]
