"""Game API schemas."""

from datetime import datetime

from pydantic import BaseModel, Field


class GamePlayRequest(BaseModel):
    game_type: str = Field(pattern="^(wheel|scratch)$")
    event_id: int
    signed_payload: str
    nonce: str = Field(min_length=8, max_length=120)
    timestamp: int
    captcha_token: str | None = None


class GamePlayResponse(BaseModel):
    segment_index: int
    discount_code: str | None = None
    tier_name: str
    discount_percent: float
    message: str


class GameStatusResponse(BaseModel):
    remaining_prizes: list[dict]
    user_plays_today: dict[str, int]
    next_reset_time: datetime


class GameSignedPayloadResponse(BaseModel):
    nonce: str
    timestamp: int
    signed_payload: str


class MyDiscountResponse(BaseModel):
    code: str
    event_id: int
    tier: str
    discount_percent: float
    status: str
    expires_at: datetime
    used_at: datetime | None = None
