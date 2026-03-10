from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "0004_photo_urls"
down_revision: Union[str, None] = "0003_profile_fields"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("photo_urls", sa.JSON(), nullable=True))
    op.execute(
        """
        UPDATE users
        SET photo_urls = json_build_array(photo_url)
        WHERE photo_url IS NOT NULL AND btrim(photo_url) <> ''
        """
    )
    op.drop_column("users", "photo_url")


def downgrade() -> None:
    op.add_column("users", sa.Column("photo_url", sa.String(), nullable=True))
    op.execute(
        """
        UPDATE users
        SET photo_url = photo_urls->>0
        WHERE photo_urls IS NOT NULL
        """
    )
    op.drop_column("users", "photo_urls")
