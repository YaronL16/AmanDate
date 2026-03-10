"""
Phase 2: Tests for Swiping and Matching API.
- POST /api/swipe, GET /api/matches/{user_id}
"""
import pytest
from fastapi.testclient import TestClient

from app import api_swipes


def test_swipe_left_200_not_matched(client: TestClient):
    a = client.post("/api/users", json={"name": "Alice", "chat_id": "U20"})
    b = client.post("/api/users", json={"name": "Bob", "chat_id": "U21"})
    alice_id = a.json()["id"]
    bob_id = b.json()["id"]

    r = client.post(
        "/api/swipe",
        json={"swiper_id": alice_id, "swiped_id": bob_id, "direction": "left"},
    )
    assert r.status_code == 200
    data = r.json()
    assert data["matched"] is False
    assert data["match"] is None


def test_swipe_right_no_reciprocal_200_not_matched(client: TestClient):
    a = client.post("/api/users", json={"name": "Alice", "chat_id": "U22"})
    b = client.post("/api/users", json={"name": "Bob", "chat_id": "U23"})
    alice_id = a.json()["id"]
    bob_id = b.json()["id"]

    r = client.post(
        "/api/swipe",
        json={"swiper_id": alice_id, "swiped_id": bob_id, "direction": "right"},
    )
    assert r.status_code == 200
    assert r.json()["matched"] is False


def test_swipe_right_reciprocal_200_matched(client: TestClient):
    api_swipes.settings.chat_deep_link_base_url = "https://chat.internal/users"
    a = client.post("/api/users", json={"name": "Alice", "chat_id": "U24", "photo_urls": ["https://a.jpg"]})
    b = client.post("/api/users", json={"name": "Bob", "chat_id": "U25", "department": "Eng"})
    alice_id = a.json()["id"]
    bob_id = b.json()["id"]

    client.post(
        "/api/swipe",
        json={"swiper_id": bob_id, "swiped_id": alice_id, "direction": "right"},
    )
    r = client.post(
        "/api/swipe",
        json={"swiper_id": alice_id, "swiped_id": bob_id, "direction": "right"},
    )
    assert r.status_code == 200
    data = r.json()
    assert data["matched"] is True
    assert data["match"] is not None
    assert data["match"]["other_user"]["name"] == "Bob"
    assert data["match"]["other_user"]["chat_id"] == "U25"
    assert data["match"]["other_user"]["department"] == "Eng"
    assert data["match"]["chat_thread_url"] == "https://chat.internal/users/U25"


def test_swipe_400_self_swipe(client: TestClient):
    a = client.post("/api/users", json={"name": "Solo", "chat_id": "U26"})
    user_id = a.json()["id"]

    r = client.post(
        "/api/swipe",
        json={"swiper_id": user_id, "swiped_id": user_id, "direction": "right"},
    )
    assert r.status_code == 400


def test_swipe_404_swiper_not_found(client: TestClient):
    b = client.post("/api/users", json={"name": "Bob", "chat_id": "U27"})
    bob_id = b.json()["id"]

    r = client.post(
        "/api/swipe",
        json={
            "swiper_id": "00000000-0000-0000-0000-000000000000",
            "swiped_id": bob_id,
            "direction": "right",
        },
    )
    assert r.status_code == 404


def test_swipe_404_swiped_not_found(client: TestClient):
    a = client.post("/api/users", json={"name": "Alice", "chat_id": "U28"})
    alice_id = a.json()["id"]

    r = client.post(
        "/api/swipe",
        json={
            "swiper_id": alice_id,
            "swiped_id": "00000000-0000-0000-0000-000000000000",
            "direction": "right",
        },
    )
    assert r.status_code == 404


def test_swipe_400_swiper_not_enabled(client: TestClient):
    a = client.post("/api/users", json={"name": "Alice", "chat_id": "U28B", "is_active": False})
    b = client.post("/api/users", json={"name": "Bob", "chat_id": "U28C"})
    alice_id = a.json()["id"]
    bob_id = b.json()["id"]

    r = client.post(
        "/api/swipe",
        json={
            "swiper_id": alice_id,
            "swiped_id": bob_id,
            "direction": "right",
        },
    )
    assert r.status_code == 400
    assert "Enable your account" in r.json().get("detail", "")


def test_swipe_idempotent_duplicate_same_direction(client: TestClient):
    a = client.post("/api/users", json={"name": "Alice", "chat_id": "U29"})
    b = client.post("/api/users", json={"name": "Bob", "chat_id": "U30"})
    alice_id = a.json()["id"]
    bob_id = b.json()["id"]

    r1 = client.post(
        "/api/swipe",
        json={"swiper_id": alice_id, "swiped_id": bob_id, "direction": "right"},
    )
    r2 = client.post(
        "/api/swipe",
        json={"swiper_id": alice_id, "swiped_id": bob_id, "direction": "right"},
    )
    assert r1.status_code == 200
    assert r2.status_code == 200


# --- Matches ---


def test_matches_404_unknown_user(client: TestClient):
    r = client.get("/api/matches/00000000-0000-0000-0000-000000000000")
    assert r.status_code == 404


def test_matches_200_empty(client: TestClient):
    a = client.post("/api/users", json={"name": "NoMatches", "chat_id": "U31"})
    user_id = a.json()["id"]

    r = client.get(f"/api/matches/{user_id}")
    assert r.status_code == 200
    assert r.json() == []


def test_matches_200_returns_list(client: TestClient):
    api_swipes.settings.chat_deep_link_base_url = "https://chat.internal/users"
    a = client.post("/api/users", json={"name": "Alice", "chat_id": "U32"})
    b = client.post("/api/users", json={"name": "Bob", "chat_id": "U33", "department": "Eng"})
    alice_id = a.json()["id"]
    bob_id = b.json()["id"]

    client.post("/api/swipe", json={"swiper_id": bob_id, "swiped_id": alice_id, "direction": "right"})
    client.post("/api/swipe", json={"swiper_id": alice_id, "swiped_id": bob_id, "direction": "right"})

    r = client.get(f"/api/matches/{alice_id}")
    assert r.status_code == 200
    data = r.json()
    assert len(data) == 1
    assert data[0]["other_user"]["name"] == "Bob"
    assert data[0]["other_user"]["chat_id"] == "U33"
    assert data[0]["other_user"]["department"] == "Eng"
    assert data[0]["chat_thread_url"] == "https://chat.internal/users/U33"
    assert "id" in data[0]
    assert "created_at" in data[0]
