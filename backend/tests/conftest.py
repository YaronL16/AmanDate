"""
Pytest fixtures for Phase 2 API tests.
Uses the same database as the app; cleans tables between tests for isolation.
"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text

from app.db import SessionLocal, engine
from app.main import app


@pytest.fixture
def db_session():
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture(autouse=True)
def clean_db(db_session):
    """Truncate app tables before each test so tests don't affect each other."""
    db_session.execute(text("TRUNCATE users CASCADE"))
    db_session.commit()
    yield


@pytest.fixture
def client():
    """FastAPI TestClient; each test gets a clean DB due to clean_db."""
    return TestClient(app)
