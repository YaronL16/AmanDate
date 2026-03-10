"""
Phase 2: Tests for Discovery API.
- GET /api/discovery/{user_id} (candidates, exclude swiped, exclude inactive)
"""
import pytest
from fastapi.testclient import TestClient


def test_discovery_404_unknown_user(client: TestClient):
    r = client.get("/api/discovery/00000000-0000-0000-0000-000000000000")
    assert r.status_code == 404


def test_discovery_200_empty(client: TestClient):
    create_r = client.post(
        "/api/users",
        json={"name": "Solo", "chat_id": "U10"},
    )
    user_id = create_r.json()["id"]

    r = client.get(f"/api/discovery/{user_id}")
    assert r.status_code == 200
    assert r.json() == []


def test_discovery_200_returns_candidates(client: TestClient):
    a = client.post("/api/users", json={"name": "Alice", "chat_id": "U11"})
    b = client.post("/api/users", json={"name": "Bob", "chat_id": "U12", "department": "Eng"})
    alice_id = a.json()["id"]
    _bob_id = b.json()["id"]

    r = client.get(f"/api/discovery/{alice_id}")
    assert r.status_code == 200
    data = r.json()
    assert len(data) == 1
    assert data[0]["name"] == "Bob"
    assert data[0]["department"] == "Eng"
    assert "id" in data[0]
    assert "photo_urls" in data[0]


def test_discovery_excludes_requester(client: TestClient):
    a = client.post("/api/users", json={"name": "Only", "chat_id": "U13"})
    alice_id = a.json()["id"]

    r = client.get(f"/api/discovery/{alice_id}")
    assert r.status_code == 200
    assert r.json() == []


def test_discovery_excludes_already_swiped(client: TestClient):
    a = client.post("/api/users", json={"name": "Swiper", "chat_id": "U14"})
    b = client.post("/api/users", json={"name": "Swiped", "chat_id": "U15"})
    alice_id = a.json()["id"]
    bob_id = b.json()["id"]

    client.post(
        "/api/swipe",
        json={"swiper_id": alice_id, "swiped_id": bob_id, "direction": "left"},
    )

    r = client.get(f"/api/discovery/{alice_id}")
    assert r.status_code == 200
    assert len(r.json()) == 0


def test_discovery_excludes_inactive(client: TestClient):
    a = client.post("/api/users", json={"name": "Active", "chat_id": "U16"})
    b = client.post("/api/users", json={"name": "Inactive", "chat_id": "U17"})
    alice_id = a.json()["id"]
    bob_id = b.json()["id"]

    client.post(f"/api/users/{bob_id}/deactivate")

    r = client.get(f"/api/discovery/{alice_id}")
    assert r.status_code == 200
    assert len(r.json()) == 0


def test_discovery_limit_and_offset(client: TestClient):
    a = client.post("/api/users", json={"name": "Me", "chat_id": "U18"})
    for i in range(5):
        client.post(
            "/api/users",
            json={"name": f"Cand{i}", "chat_id": f"U18-{i}"},
        )
    me_id = a.json()["id"]

    r = client.get(f"/api/discovery/{me_id}?limit=2&offset=0")
    assert r.status_code == 200
    assert len(r.json()) == 2

    r2 = client.get(f"/api/discovery/{me_id}?limit=2&offset=2")
    assert r2.status_code == 200
    assert len(r2.json()) == 2
