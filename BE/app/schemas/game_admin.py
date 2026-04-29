"""Admin schemas for game management dashboard."""

from datetime import datetime

from pydantic import BaseModel, Field


class GameConfigUpsertRequest(BaseModel):
    game_type: str = Field(pattern="^(wheel|scratch)$")
    is_active: bool = True
    daily_reset_cron: str = "0 0 * * *"
    max_plays_per_user_per_day: int = Field(default=3, ge=1, le=100)


class GameConfigResponse(BaseModel):
    id: int
    event_id: int
    game_type: str
    is_active: bool
    daily_reset_cron: str
    max_plays_per_user_per_day: int


class PrizePoolCreateRequest(BaseModel):
    tier_name: str = Field(min_length=1, max_length=80)
    discount_percent: float = Field(ge=0, le=100)
    initial_qty: int = Field(ge=1)
    weight: int = Field(ge=0)


class PrizePoolUpdateRequest(BaseModel):
    tier_name: str = Field(min_length=1, max_length=80)
    discount_percent: float = Field(ge=0, le=100)
    initial_qty: int = Field(ge=1)
    remaining_qty: int = Field(ge=0)
    weight: int = Field(ge=0)


class PrizePoolResponse(BaseModel):
    id: int
    event_id: int
    tier_name: str
    discount_percent: float
    initial_qty: int
    remaining_qty: int
    weight: int


class GameMonitorResponse(BaseModel):
    total_plays_today: int
    total_vouchers_remaining: int
    top_users: list[dict]
    pool_by_tier: list[dict]


class GameAuditRowResponse(BaseModel):
    user_id: int
    event_id: int
    game_type: str
    result_tier: str
    status_code: int
    ip: str
    created_at: datetime

