from fastapi.testclient import TestClient
import pytest

from app import api_admin


@pytest.fixture(autouse=True)
def reset_admin_settings():
    prev_enabled = api_admin.settings.enable_admin_view
    prev_user_id = api_admin.settings.admin_user_id
    try:
        yield
    finally:
        api_admin.settings.enable_admin_view = prev_enabled
        api_admin.settings.admin_user_id = prev_user_id


def test_admin_disabled_returns_403(client: TestClient):
    api_admin.settings.enable_admin_view = False
    api_admin.settings.admin_user_id = "yaron"

    r = client.get("/api/admin/users", headers={"X-Admin-User-Id": "yaron"})
    assert r.status_code == 403
    assert "disabled" in r.json().get("detail", "").lower()


def test_admin_wrong_user_returns_403(client: TestClient):
    api_admin.settings.enable_admin_view = True
    api_admin.settings.admin_user_id = "yaron"

    r = client.get("/api/admin/users", headers={"X-Admin-User-Id": "not-admin"})
    assert r.status_code == 403
    assert "denied" in r.json().get("detail", "").lower()


def test_admin_users_swipes_matches_readonly_lists(client: TestClient):
    api_admin.settings.enable_admin_view = True
    api_admin.settings.admin_user_id = "yaron"
    headers = {"X-Admin-User-Id": "yaron"}

    a = client.post("/api/users", json={"name": "Alice", "chat_id": "ADMIN_U1"})
    b = client.post("/api/users", json={"name": "Bob", "chat_id": "ADMIN_U2"})
    alice_id = a.json()["id"]
    bob_id = b.json()["id"]

    client.post("/api/swipe", json={"swiper_id": alice_id, "swiped_id": bob_id, "direction": "right"})
    client.post("/api/swipe", json={"swiper_id": bob_id, "swiped_id": alice_id, "direction": "right"})

    users_res = client.get("/api/admin/users", headers=headers)
    swipes_res = client.get("/api/admin/swipes", headers=headers)
    matches_res = client.get("/api/admin/matches", headers=headers)

    assert users_res.status_code == 200
    assert swipes_res.status_code == 200
    assert matches_res.status_code == 200

    users = users_res.json()
    swipes = swipes_res.json()
    matches = matches_res.json()

    assert len(users) >= 2
    assert any(u["chat_id"] == "ADMIN_U1" for u in users)
    assert any(s["direction"] == "right" for s in swipes)
    assert len(matches) == 1
