"""
Phase 2: Tests for User CRUD API.
- POST /api/users, GET /api/users/{user_id}, PUT /api/users/{user_id}, POST /api/users/{user_id}/deactivate
"""
import pytest
from fastapi.testclient import TestClient


def test_create_user_201(client: TestClient):
    payload = {
        "name": "Alice",
        "bio": "Hello world",
        "photo_url": "https://example.com/alice.jpg",
        "department": "Eng",
        "chat_id": "U001",
    }
    r = client.post("/api/users", json=payload)
    assert r.status_code == 201
    data = r.json()
    assert data["name"] == "Alice"
    assert data["bio"] == "Hello world"
    assert data["photo_url"] == payload["photo_url"]
    assert data["department"] == "Eng"
    assert data["chat_id"] == "U001"
    assert data["is_active"] is True
    assert "id" in data
    assert "created_at" in data


def test_create_user_400_missing_chat_id(client: TestClient):
    payload = {"name": "Bob", "bio": "No chat_id"}
    r = client.post("/api/users", json=payload)
    assert r.status_code == 422  # validation error


def test_create_user_400_empty_chat_id(client: TestClient):
    payload = {"name": "Bob", "chat_id": ""}
    r = client.post("/api/users", json=payload)
    assert r.status_code == 422


def test_create_user_409_duplicate_chat_id(client: TestClient):
    payload = {"name": "Alice", "chat_id": "U001"}
    client.post("/api/users", json=payload)
    r = client.post("/api/users", json={"name": "Bob", "chat_id": "U001"})
    assert r.status_code == 409
    assert "chat_id" in r.json().get("detail", "").lower() or "already" in r.json().get("detail", "").lower()


def test_get_user_200(client: TestClient):
    create_r = client.post(
        "/api/users",
        json={"name": "Carol", "chat_id": "U002"},
    )
    assert create_r.status_code == 201
    user_id = create_r.json()["id"]

    r = client.get(f"/api/users/{user_id}")
    assert r.status_code == 200
    assert r.json()["name"] == "Carol"
    assert r.json()["chat_id"] == "U002"


def test_get_user_404(client: TestClient):
    r = client.get("/api/users/00000000-0000-0000-0000-000000000000")
    assert r.status_code == 404


def test_update_user_200(client: TestClient):
    create_r = client.post(
        "/api/users",
        json={"name": "Dave", "chat_id": "U003"},
    )
    user_id = create_r.json()["id"]

    r = client.put(
        f"/api/users/{user_id}",
        json={"name": "Dave Updated", "bio": "New bio"},
    )
    assert r.status_code == 200
    assert r.json()["name"] == "Dave Updated"
    assert r.json()["bio"] == "New bio"
    assert r.json()["chat_id"] == "U003"


def test_update_user_404(client: TestClient):
    r = client.put(
        "/api/users/00000000-0000-0000-0000-000000000000",
        json={"name": "Nobody"},
    )
    assert r.status_code == 404


def test_update_user_409_duplicate_chat_id(client: TestClient):
    client.post("/api/users", json={"name": "User A", "chat_id": "U004"})
    create_b = client.post("/api/users", json={"name": "User B", "chat_id": "U005"})
    user_b_id = create_b.json()["id"]

    r = client.put(
        f"/api/users/{user_b_id}",
        json={"chat_id": "U004"},
    )
    assert r.status_code == 409


def test_deactivate_user_200(client: TestClient):
    create_r = client.post(
        "/api/users",
        json={"name": "Eve", "chat_id": "U006"},
    )
    user_id = create_r.json()["id"]

    r = client.post(f"/api/users/{user_id}/deactivate")
    assert r.status_code == 200
    assert r.json()["is_active"] is False


def test_deactivate_user_404(client: TestClient):
    r = client.post("/api/users/00000000-0000-0000-0000-000000000000/deactivate")
    assert r.status_code == 404
