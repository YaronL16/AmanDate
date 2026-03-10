from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "0005_discovery_preferences"
down_revision: Union[str, None] = "0004_photo_urls"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("preferred_age_min", sa.Integer(), nullable=True))
    op.add_column("users", sa.Column("preferred_age_max", sa.Integer(), nullable=True))
    op.add_column("users", sa.Column("preferred_regions", sa.JSON(), nullable=True))
    op.add_column("users", sa.Column("preferred_genders", sa.JSON(), nullable=True))
    op.create_check_constraint(
        "ck_users_preferred_age_range",
        "users",
        "(preferred_age_min IS NULL OR preferred_age_max IS NULL OR preferred_age_min <= preferred_age_max)",
    )


def downgrade() -> None:
    op.drop_constraint("ck_users_preferred_age_range", "users", type_="check")
    op.drop_column("users", "preferred_genders")
    op.drop_column("users", "preferred_regions")
    op.drop_column("users", "preferred_age_max")
    op.drop_column("users", "preferred_age_min")
