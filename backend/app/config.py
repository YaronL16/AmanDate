from functools import lru_cache
import os


class Settings:
    app_env: str = os.getenv("APP_ENV", "development")
    database_url: str = os.getenv(
        "DATABASE_URL",
        "postgresql+psycopg2://amandate:amandate@localhost:5432/amandate",
    )


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()

