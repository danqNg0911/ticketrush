"""Admin dashboard schemas."""

from pydantic import BaseModel


class DashboardSummaryResponse(BaseModel):
    """High-level KPI metrics for admin cards."""

    total_revenue: float
    tickets_sold: int
    active_events: int
    waiting_queue_users: int


class RevenuePoint(BaseModel):
    """Revenue trend point."""

    date: str
    revenue: float


class AudienceDistributionResponse(BaseModel):
    """Audience demographics grouped by age bucket and gender."""

    age_groups: dict[str, int]
    gender_groups: dict[str, int]


class DashboardStreamResponse(BaseModel):
    """Payload broadcasted over WebSocket for near real-time updates."""

    total_revenue: float
    tickets_sold: int
    active_events: int
    waiting_queue_users: int
