"""Game-related ORM models (lucky wheel/scratch card)."""

from datetime import date, datetime

from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Integer, Numeric, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin


class GameConfig(TimestampMixin, Base):
    __tablename__ = "game_configs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    event_id: Mapped[int] = mapped_column(ForeignKey("events.id", ondelete="CASCADE"), nullable=False, index=True, unique=True)
    game_type: Mapped[str] = mapped_column(String(30), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    daily_reset_cron: Mapped[str] = mapped_column(String(60), default="0 0 * * *", nullable=False)
    max_plays_per_user_per_day: Mapped[int] = mapped_column(Integer, default=3, nullable=False)


class PrizePool(TimestampMixin, Base):
    __tablename__ = "prize_pools"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    event_id: Mapped[int] = mapped_column(ForeignKey("events.id", ondelete="CASCADE"), nullable=False, index=True)
    tier_name: Mapped[str] = mapped_column(String(80), nullable=False)
    discount_percent: Mapped[float] = mapped_column(Numeric(5, 2), nullable=False)
    initial_qty: Mapped[int] = mapped_column(Integer, nullable=False)
    remaining_qty: Mapped[int] = mapped_column(Integer, nullable=False)
    weight: Mapped[int] = mapped_column(Integer, nullable=False)


class UserDailyPlay(TimestampMixin, Base):
    __tablename__ = "user_daily_plays"
    __table_args__ = (UniqueConstraint("user_id", "play_date", name="uq_user_daily_play"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    play_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    wheel_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    scratch_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)


class WonDiscount(TimestampMixin, Base):
    __tablename__ = "won_discounts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    code: Mapped[str] = mapped_column(String(40), nullable=False, unique=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    event_id: Mapped[int] = mapped_column(ForeignKey("events.id", ondelete="CASCADE"), nullable=False, index=True)
    tier: Mapped[str] = mapped_column(String(80), nullable=False)
    discount_percent: Mapped[float] = mapped_column(Numeric(5, 2), nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="active", nullable=False, index=True)
    used_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class GameDailyLog(TimestampMixin, Base):
    __tablename__ = "game_daily_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    log_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    event_id: Mapped[int] = mapped_column(ForeignKey("events.id", ondelete="CASCADE"), nullable=False, index=True)
    total_plays: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    total_wins: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    summary_json: Mapped[str] = mapped_column(Text, default="{}", nullable=False)


class GameAuditLog(TimestampMixin, Base):
    __tablename__ = "game_audit_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    event_id: Mapped[int] = mapped_column(ForeignKey("events.id", ondelete="CASCADE"), nullable=False, index=True)
    game_type: Mapped[str] = mapped_column(String(30), nullable=False)
    ip: Mapped[str] = mapped_column(String(80), nullable=False, index=True)
    user_agent: Mapped[str] = mapped_column(String(255), nullable=False, default="")
    result_tier: Mapped[str] = mapped_column(String(80), nullable=False)
    status_code: Mapped[int] = mapped_column(Integer, nullable=False)
    risk_flags: Mapped[str] = mapped_column(Text, default="[]", nullable=False)
