"""
Pytest fixtures for Phase 2 API tests.
Uses the same database as the app; cleans tables between tests for isolation.
"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text
from alembic import command
from alembic.config import Config

from app.db import SessionLocal, engine
from app.main import app


@pytest.fixture(scope="session", autouse=True)
def apply_migrations():
    """Ensure database schema is up-to-date before running tests."""
    alembic_cfg = Config("alembic.ini")
    command.upgrade(alembic_cfg, "head")
    yield


@pytest.fixture
def db_session():
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture(autouse=True)
def clean_db(db_session, apply_migrations):
    """Truncate app tables before each test so tests don't affect each other."""
    db_session.execute(text("TRUNCATE users CASCADE"))
    db_session.commit()
    yield


@pytest.fixture
def client():
    """FastAPI TestClient; each test gets a clean DB due to clean_db."""
    return TestClient(app)
