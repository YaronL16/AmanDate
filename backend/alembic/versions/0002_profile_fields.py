from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "0003_profile_fields"
down_revision: Union[str, None] = "0002_add_user_gender"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("age", sa.Integer(), nullable=True))
    op.add_column("users", sa.Column("favorite_genres", sa.JSON(), nullable=True))
    op.add_column("users", sa.Column("region", sa.String(), nullable=True))


def downgrade() -> None:
    op.drop_column("users", "region")
    op.drop_column("users", "favorite_genres")
    op.drop_column("users", "age")
