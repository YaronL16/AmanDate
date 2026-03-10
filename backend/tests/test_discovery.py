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


def test_discovery_filters_by_preferred_age_range(client: TestClient):
    seeker = client.post(
        "/api/users",
        json={
            "name": "Seeker",
            "chat_id": "U_D_PREF_1",
            "preferred_age_min": 25,
            "preferred_age_max": 30,
        },
    )
    seeker_id = seeker.json()["id"]
    client.post("/api/users", json={"name": "Young", "chat_id": "U_D_PREF_2", "age": 24})
    client.post("/api/users", json={"name": "InRange", "chat_id": "U_D_PREF_3", "age": 28})
    client.post("/api/users", json={"name": "Old", "chat_id": "U_D_PREF_4", "age": 31})
    client.post("/api/users", json={"name": "NoAge", "chat_id": "U_D_PREF_5"})

    r = client.get(f"/api/discovery/{seeker_id}")
    assert r.status_code == 200
    names = [item["name"] for item in r.json()]
    assert names == ["InRange"]


def test_discovery_filters_by_preferred_regions(client: TestClient):
    seeker = client.post(
        "/api/users",
        json={
            "name": "Region Seeker",
            "chat_id": "U_D_PREF_6",
            "preferred_regions": ["Gush Dan"],
        },
    )
    seeker_id = seeker.json()["id"]
    client.post("/api/users", json={"name": "MatchRegion", "chat_id": "U_D_PREF_7", "region": "Gush Dan"})
    client.post(
        "/api/users",
        json={"name": "OtherRegion", "chat_id": "U_D_PREF_8", "region": "The Sharon"},
    )
    client.post("/api/users", json={"name": "NoRegion", "chat_id": "U_D_PREF_9"})

    r = client.get(f"/api/discovery/{seeker_id}")
    assert r.status_code == 200
    names = [item["name"] for item in r.json()]
    assert names == ["MatchRegion"]


def test_discovery_filters_by_preferred_genders(client: TestClient):
    seeker = client.post(
        "/api/users",
        json={
            "name": "Gender Seeker",
            "chat_id": "U_D_PREF_10",
            "preferred_genders": ["female"],
        },
    )
    seeker_id = seeker.json()["id"]
    client.post("/api/users", json={"name": "Male", "chat_id": "U_D_PREF_11", "gender": "male"})
    client.post("/api/users", json={"name": "Female", "chat_id": "U_D_PREF_12", "gender": "female"})
    client.post("/api/users", json={"name": "NoGender", "chat_id": "U_D_PREF_13"})

    r = client.get(f"/api/discovery/{seeker_id}")
    assert r.status_code == 200
    names = [item["name"] for item in r.json()]
    assert names == ["Female"]


def test_discovery_applies_combined_preference_filters(client: TestClient):
    seeker = client.post(
        "/api/users",
        json={
            "name": "Combined Seeker",
            "chat_id": "U_D_PREF_14",
            "preferred_age_min": 25,
            "preferred_age_max": 35,
            "preferred_regions": ["Gush Dan"],
            "preferred_genders": ["female"],
        },
    )
    seeker_id = seeker.json()["id"]
    client.post(
        "/api/users",
        json={
            "name": "AllMatch",
            "chat_id": "U_D_PREF_15",
            "age": 30,
            "region": "Gush Dan",
            "gender": "female",
        },
    )
    client.post(
        "/api/users",
        json={
            "name": "AgeMismatch",
            "chat_id": "U_D_PREF_16",
            "age": 40,
            "region": "Gush Dan",
            "gender": "female",
        },
    )
    client.post(
        "/api/users",
        json={
            "name": "RegionMismatch",
            "chat_id": "U_D_PREF_17",
            "age": 30,
            "region": "The Sharon",
            "gender": "female",
        },
    )
    client.post(
        "/api/users",
        json={
            "name": "GenderMismatch",
            "chat_id": "U_D_PREF_18",
            "age": 30,
            "region": "Gush Dan",
            "gender": "male",
        },
    )

    r = client.get(f"/api/discovery/{seeker_id}")
    assert r.status_code == 200
    names = [item["name"] for item in r.json()]
    assert names == ["AllMatch"]


def test_discovery_null_or_empty_preferences_mean_no_restriction(client: TestClient):
    seeker = client.post("/api/users", json={"name": "No Prefs", "chat_id": "U_D_PREF_19"})
    seeker_id = seeker.json()["id"]
    client.post("/api/users", json={"name": "A", "chat_id": "U_D_PREF_20"})
    client.post("/api/users", json={"name": "B", "chat_id": "U_D_PREF_21"})

    r = client.get(f"/api/discovery/{seeker_id}")
    assert r.status_code == 200
    names = [item["name"] for item in r.json()]
    assert sorted(names) == ["A", "B"]
