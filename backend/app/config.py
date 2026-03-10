from functools import lru_cache
import os
from typing import List
from urllib.parse import quote


def _resolve_database_url() -> str:
    explicit_url = os.getenv("DATABASE_URL", "").strip()
    if explicit_url:
        return explicit_url

    db_host = os.getenv("DB_HOST", "localhost").strip()
    db_port = os.getenv("DB_PORT", "5432").strip()
    db_name = os.getenv("DB_NAME", "amandate").strip()
    db_user = os.getenv("DB_USER", "amandate").strip()
    db_password = os.getenv("DB_PASSWORD", "amandate")
    db_driver = os.getenv("DB_DRIVER", "postgresql+psycopg2").strip()

    encoded_user = quote(db_user, safe="")
    encoded_password = quote(db_password, safe="")
    return f"{db_driver}://{encoded_user}:{encoded_password}@{db_host}:{db_port}/{db_name}"


class Settings:
    def __init__(self) -> None:
        self.app_env: str = os.getenv("APP_ENV", "development")
        self.database_url: str = _resolve_database_url()
        self.cors_allowed_origins: List[str] = [
            origin.strip()
            for origin in os.getenv("CORS_ALLOWED_ORIGINS", "http://localhost:5173").split(",")
            if origin.strip()
        ]
        self.chat_deep_link_base_url: str = os.getenv("CHAT_DEEP_LINK_BASE_URL", "").strip()
        self.enable_admin_view: bool = os.getenv(
            "ENABLE_ADMIN_VIEW", "false"
        ).strip().lower() in {
            "1",
            "true",
            "yes",
            "on",
        }
        self.admin_user_id: str = os.getenv("ADMIN_USER_ID", "").strip()

    def build_chat_deep_link(self, chat_id: str | None) -> str | None:
        if not chat_id or not self.chat_deep_link_base_url:
            return None
        base_url = self.chat_deep_link_base_url.rstrip("/")
        encoded_chat_id = quote(chat_id, safe="")
        return f"{base_url}/{encoded_chat_id}"

    def is_admin_enabled(self) -> bool:
        return self.enable_admin_view and bool(self.admin_user_id)

    def is_authorized_admin(self, user_id: str | None) -> bool:
        if not self.is_admin_enabled():
            return False
        if not user_id:
            return False
        return user_id.strip() == self.admin_user_id


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()

