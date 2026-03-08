from functools import lru_cache
import os
from typing import List


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


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()

