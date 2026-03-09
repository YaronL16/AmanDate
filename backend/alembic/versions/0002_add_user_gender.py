from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "0002_add_user_gender"
down_revision: Union[str, None] = "0001_initial"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    user_gender = postgresql.ENUM("male", "female", name="user_gender")
    user_gender.create(op.get_bind(), checkfirst=True)
    op.add_column("users", sa.Column("gender", user_gender, nullable=True))


def downgrade() -> None:
    op.drop_column("users", "gender")
    user_gender = postgresql.ENUM("male", "female", name="user_gender")
    user_gender.drop(op.get_bind(), checkfirst=True)
