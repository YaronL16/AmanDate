from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "0001_initial"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("bio", sa.Text(), nullable=True),
        sa.Column("photo_url", sa.String(), nullable=True),
        sa.Column("chat_id", sa.String(), nullable=False, unique=True),
        sa.Column("department", sa.String(), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("last_active_at", sa.DateTime(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP"),
        ),
    )

    op.create_index("ix_users_department", "users", ["department"])
    op.create_index("ix_users_created_at", "users", ["created_at"])
    op.create_index("ix_users_last_active_at", "users", ["last_active_at"])

    op.create_table(
        "swipes",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "swiper_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id"),
            nullable=False,
        ),
        sa.Column(
            "swiped_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id"),
            nullable=False,
        ),
        sa.Column(
            "direction",
            sa.Enum("right", "left", name="swipe_direction"),
            nullable=False,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP"),
        ),
        sa.UniqueConstraint("swiper_id", "swiped_id", name="uq_swipe_swiper_swiped"),
        sa.CheckConstraint("swiper_id <> swiped_id", name="ck_swipe_not_self"),
    )

    op.create_index(
        "ix_swipes_swiper_created_at",
        "swipes",
        ["swiper_id", "created_at"],
    )

    op.create_table(
        "matches",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "user1_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id"),
            nullable=False,
        ),
        sa.Column(
            "user2_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id"),
            nullable=False,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP"),
        ),
        sa.Column("chat_thread_url", sa.String(), nullable=True),
        sa.UniqueConstraint("user1_id", "user2_id", name="uq_match_user_pair"),
        sa.CheckConstraint("user1_id <> user2_id", name="ck_match_not_self"),
    )


def downgrade() -> None:
    op.drop_table("matches")
    op.drop_index("ix_swipes_swiper_created_at", table_name="swipes")
    op.drop_table("swipes")
    swipe_direction = postgresql.ENUM("right", "left", name="swipe_direction")
    swipe_direction.drop(op.get_bind(), checkfirst=True)
    op.drop_index("ix_users_last_active_at", table_name="users")
    op.drop_index("ix_users_created_at", table_name="users")
    op.drop_index("ix_users_department", table_name="users")
    op.drop_table("users")

