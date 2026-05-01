"""fix_game_config_unique_per_event_and_type

Revision ID: 7f3c1a5c2d11
Revises: b16913c86cb7
Create Date: 2026-04-29 15:20:00.000000

"""
from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = "7f3c1a5c2d11"
down_revision: Union[str, Sequence[str], None] = "b16913c86cb7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.drop_index("ix_ticket_rush_game_configs_event_id", table_name="game_configs", schema="ticket_rush")
    op.create_index(
        "ix_ticket_rush_game_configs_event_id",
        "game_configs",
        ["event_id"],
        unique=False,
        schema="ticket_rush",
    )
    op.create_unique_constraint(
        "uq_game_configs_event_game_type",
        "game_configs",
        ["event_id", "game_type"],
        schema="ticket_rush",
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_constraint("uq_game_configs_event_game_type", "game_configs", schema="ticket_rush", type_="unique")
    op.drop_index("ix_ticket_rush_game_configs_event_id", table_name="game_configs", schema="ticket_rush")
    op.create_index(
        "ix_ticket_rush_game_configs_event_id",
        "game_configs",
        ["event_id"],
        unique=True,
        schema="ticket_rush",
    )
