"""Admin management and analytics routes."""

from fastapi import APIRouter, Depends, Query
from sqlalchemy import case, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_active_admin
from app.core.db import get_db_session
from app.models.enums import SeatStatus
from app.models.event import Event
from app.models.seat import Seat
from app.models.user import User
from app.schemas.admin import AudienceDistributionResponse, DashboardSummaryResponse, RevenuePoint
from app.schemas.event import EventCardResponse, EventCreateRequest, EventDetailResponse, EventOccupancyResponse
from app.services.dashboard_service import get_audience_distribution, get_dashboard_summary, get_revenue_series
from app.services.event_service import create_event_with_matrix, get_event_seat_matrix

router = APIRouter(prefix="/admin", tags=["admin"])


@router.post("/events", response_model=EventDetailResponse)
async def create_event(
    payload: EventCreateRequest,
    session: AsyncSession = Depends(get_db_session),
    admin_user: User = Depends(get_current_active_admin),
) -> EventDetailResponse:
    """Create new event and generate seat matrix."""

    try:
        event = await create_event_with_matrix(session, admin_user.id, payload)
        await session.commit()
    except Exception:
        await session.rollback()
        raise

    zones, _ = await get_event_seat_matrix(session, event.id)
    return EventDetailResponse(
        id=event.id,
        slug=event.slug,
        title=event.title,
        description=event.description,
        category=event.category,
        venue=event.venue,
        start_at=event.start_at,
        end_at=event.end_at,
        cover_image_url=event.cover_image_url,
        status=event.status,
        queue_enabled=event.queue_enabled,
        hold_minutes=event.hold_minutes,
        queue_release_batch=event.queue_release_batch,
        max_active_queue_tokens=event.max_active_queue_tokens,
        zones=zones,
    )


@router.get("/events", response_model=list[EventCardResponse])
async def list_admin_events(
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    session: AsyncSession = Depends(get_db_session),
    _: User = Depends(get_current_active_admin),
) -> list[EventCardResponse]:
    """List all events for admin management view."""

    events = list(await session.scalars(select(Event).order_by(Event.created_at.desc()).limit(limit).offset(offset)))
    return [EventCardResponse.model_validate(event) for event in events]


@router.get("/dashboard/summary", response_model=DashboardSummaryResponse)
async def dashboard_summary(
    session: AsyncSession = Depends(get_db_session),
    _: User = Depends(get_current_active_admin),
) -> DashboardSummaryResponse:
    """Return headline KPI values."""

    return await get_dashboard_summary(session)


@router.get("/dashboard/revenue", response_model=list[RevenuePoint])
async def dashboard_revenue(
    days: int = Query(default=14, ge=7, le=90),
    session: AsyncSession = Depends(get_db_session),
    _: User = Depends(get_current_active_admin),
) -> list[RevenuePoint]:
    """Return historical revenue points."""

    return await get_revenue_series(session, days=days)


@router.get("/dashboard/audience", response_model=AudienceDistributionResponse)
async def dashboard_audience(
    session: AsyncSession = Depends(get_db_session),
    _: User = Depends(get_current_active_admin),
) -> AudienceDistributionResponse:
    """Return age and gender distributions for ticket buyers."""

    return await get_audience_distribution(session)


@router.get("/dashboard/occupancy", response_model=list[EventOccupancyResponse])
async def dashboard_occupancy(
    session: AsyncSession = Depends(get_db_session),
    _: User = Depends(get_current_active_admin),
) -> list[EventOccupancyResponse]:
    """Return occupancy snapshot for each event."""

    stmt = (
        select(
            Event.id,
            Event.title,
            func.count(Seat.id).label("total_seats"),
            func.sum(case((Seat.status == SeatStatus.SOLD, 1), else_=0)).label("sold_seats"),
            func.sum(case((Seat.status == SeatStatus.LOCKED, 1), else_=0)).label("locked_seats"),
        )
        .join(Seat, Seat.event_id == Event.id)
        .group_by(Event.id, Event.title)
        .order_by(Event.start_at.asc())
    )
    rows = (await session.execute(stmt)).all()

    result: list[EventOccupancyResponse] = []
    for row in rows:
        total = int(row.total_seats or 0)
        sold = int(row.sold_seats or 0)
        locked = int(row.locked_seats or 0)
        occupancy = round((sold / total) * 100, 2) if total else 0
        result.append(
            EventOccupancyResponse(
                event_id=row.id,
                event_title=row.title,
                total_seats=total,
                sold_seats=sold,
                locked_seats=locked,
                occupancy_rate=occupancy,
            )
        )

    return result
