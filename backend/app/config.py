from functools import lru_cache
import os
from typing import List
from urllib.parse import quote


class Settings:
    app_env: str = os.getenv("APP_ENV", "development")
    database_url: str = os.getenv(
        "DATABASE_URL",
        # Default connection string if no environment variable is set
        "postgresql+psycopg2://amandate:amandate@localhost:5432/amandate",
    )
    cors_allowed_origins: List[str] = [
        origin.strip()
        for origin in os.getenv("CORS_ALLOWED_ORIGINS", "http://localhost:5173").split(",")
        if origin.strip()
    ]
    chat_deep_link_base_url: str = os.getenv("CHAT_DEEP_LINK_BASE_URL", "").strip()
    enable_admin_view: bool = os.getenv("ENABLE_ADMIN_VIEW", "false").strip().lower() in {
        "1",
        "true",
        "yes",
        "on",
    }
    admin_user_id: str = os.getenv("ADMIN_USER_ID", "").strip()

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

