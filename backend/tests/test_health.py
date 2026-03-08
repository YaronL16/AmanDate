from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def test_health_no_db(monkeypatch):
    """
    Smoke test that the /health route is mounted.
    The actual DB connectivity is exercised when running against a real database.
    """
    response = client.get("/health")
    # In local unit tests without a DB, this may raise; so we just assert route exists or 500.
    assert response.status_code in (200, 500)

