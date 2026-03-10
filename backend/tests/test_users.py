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
        "photo_urls": ["https://example.com/alice.jpg"],
        "department": "Eng",
        "chat_id": "U001",
    }
    r = client.post("/api/users", json=payload)
    assert r.status_code == 201
    data = r.json()
    assert data["name"] == "Alice"
    assert data["bio"] == "Hello world"
    assert data["photo_urls"] == payload["photo_urls"]
    assert data["department"] == "Eng"
    assert data["chat_id"] == "U001"
    assert data["is_active"] is True
    assert "id" in data
    assert "created_at" in data


def test_get_profile_options_200(client: TestClient):
    r = client.get("/api/users/options")
    assert r.status_code == 200
    data = r.json()
    assert "music_genres" in data
    assert "israel_regions" in data
    assert "discovery_genders" in data
    assert len(data["music_genres"]) > 0
    assert len(data["israel_regions"]) > 0
    assert set(data["discovery_genders"]) == {"male", "female"}


def test_create_user_201_with_profile_fields(client: TestClient):
    payload = {
        "name": "Profile User",
        "chat_id": "U_PROFILE_1",
        "age": 29,
        "photo_urls": ["https://example.com/p1.jpg", "https://example.com/p2.jpg"],
        "favorite_genres": ["Pop", "Rock", "Jazz"],
        "region": "Gush Dan",
    }
    r = client.post("/api/users", json=payload)
    assert r.status_code == 201
    data = r.json()
    assert data["age"] == 29
    assert data["photo_urls"] == ["https://example.com/p1.jpg", "https://example.com/p2.jpg"]
    assert data["favorite_genres"] == ["Pop", "Rock", "Jazz"]
    assert data["region"] == "Gush Dan"


def test_create_user_201_with_discovery_preferences(client: TestClient):
    payload = {
        "name": "Preference User",
        "chat_id": "U_PREF_1",
        "preferred_age_min": 25,
        "preferred_age_max": 35,
        "preferred_regions": ["Gush Dan", "The Sharon", "Gush Dan"],
        "preferred_genders": ["female", "male", "female"],
    }
    r = client.post("/api/users", json=payload)
    assert r.status_code == 201
    data = r.json()
    assert data["preferred_age_min"] == 25
    assert data["preferred_age_max"] == 35
    assert data["preferred_regions"] == ["Gush Dan", "The Sharon"]
    assert data["preferred_genders"] == ["female", "male"]


def test_create_user_422_invalid_age(client: TestClient):
    payload = {"name": "Too Young", "chat_id": "U_PROFILE_2", "age": 17}
    r = client.post("/api/users", json=payload)
    assert r.status_code == 422


def test_create_user_422_more_than_3_genres(client: TestClient):
    payload = {
        "name": "Genre Overflow",
        "chat_id": "U_PROFILE_3",
        "favorite_genres": ["Pop", "Rock", "Jazz", "Metal"],
    }
    r = client.post("/api/users", json=payload)
    assert r.status_code == 422


def test_create_user_422_invalid_genre(client: TestClient):
    payload = {
        "name": "Invalid Genre",
        "chat_id": "U_PROFILE_4",
        "favorite_genres": ["Pop", "Opera"],
    }
    r = client.post("/api/users", json=payload)
    assert r.status_code == 422


def test_create_user_422_invalid_region(client: TestClient):
    payload = {
        "name": "Invalid Region",
        "chat_id": "U_PROFILE_5",
        "region": "Atlantis",
    }
    r = client.post("/api/users", json=payload)
    assert r.status_code == 422


def test_create_user_422_more_than_5_photos(client: TestClient):
    payload = {
        "name": "Too Many Photos",
        "chat_id": "U_PROFILE_5B",
        "photo_urls": [
            "https://example.com/1.jpg",
            "https://example.com/2.jpg",
            "https://example.com/3.jpg",
            "https://example.com/4.jpg",
            "https://example.com/5.jpg",
            "https://example.com/6.jpg",
        ],
    }
    r = client.post("/api/users", json=payload)
    assert r.status_code == 422


def test_create_user_422_invalid_preferred_age_range(client: TestClient):
    payload = {
        "name": "Bad Preference Range",
        "chat_id": "U_PREF_2",
        "preferred_age_min": 40,
        "preferred_age_max": 30,
    }
    r = client.post("/api/users", json=payload)
    assert r.status_code == 422


def test_create_user_422_invalid_preferred_region(client: TestClient):
    payload = {
        "name": "Bad Preferred Region",
        "chat_id": "U_PREF_3",
        "preferred_regions": ["Atlantis"],
    }
    r = client.post("/api/users", json=payload)
    assert r.status_code == 422


def test_create_user_422_invalid_preferred_gender(client: TestClient):
    payload = {
        "name": "Bad Preferred Gender",
        "chat_id": "U_PREF_4",
        "preferred_genders": ["non-binary"],
    }
    r = client.post("/api/users", json=payload)
    assert r.status_code == 422


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


def test_update_user_200_with_profile_fields(client: TestClient):
    create_r = client.post("/api/users", json={"name": "Updater", "chat_id": "U_PROFILE_6"})
    user_id = create_r.json()["id"]

    r = client.put(
        f"/api/users/{user_id}",
        json={
            "age": 35,
            "favorite_genres": ["Electronic", "Rock"],
            "region": "The Sharon",
        },
    )
    assert r.status_code == 200
    data = r.json()
    assert data["age"] == 35
    assert data["favorite_genres"] == ["Electronic", "Rock"]
    assert data["region"] == "The Sharon"


def test_update_user_200_with_discovery_preferences(client: TestClient):
    create_r = client.post("/api/users", json={"name": "Pref Updater", "chat_id": "U_PREF_5"})
    user_id = create_r.json()["id"]

    r = client.put(
        f"/api/users/{user_id}",
        json={
            "preferred_age_min": 27,
            "preferred_age_max": 40,
            "preferred_regions": ["The Negev", "Gush Dan", "The Negev"],
            "preferred_genders": ["female", "female"],
        },
    )
    assert r.status_code == 200
    data = r.json()
    assert data["preferred_age_min"] == 27
    assert data["preferred_age_max"] == 40
    assert data["preferred_regions"] == ["The Negev", "Gush Dan"]
    assert data["preferred_genders"] == ["female"]


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
