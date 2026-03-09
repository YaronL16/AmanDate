from app.db import SessionLocal
from app import models


demo_users = [
    {"name": "Avi Cohen", "department": "Engineering", "gender": "male", "chat_id": "UDEMO001", "bio": "Backend engineer who loves coffee.", "photo_url": None},
    {"name": "Noa Levi", "department": "Product", "gender": "female", "chat_id": "UDEMO002", "bio": "Product thinker and team connector.", "photo_url": None},
    {"name": "Yuval Katz", "department": "Design", "gender": "male", "chat_id": "UDEMO003", "bio": "Designing simple and elegant flows.", "photo_url": None},
    {"name": "Maya Azulay", "department": "Marketing", "gender": "female", "chat_id": "UDEMO004", "bio": "Storytelling and growth enthusiast.", "photo_url": None},
    {"name": "Daniel Mor", "department": "Finance", "gender": "male", "chat_id": "UDEMO005", "bio": "Numbers with empathy.", "photo_url": None},
    {"name": "Lior Bar", "department": "People", "gender": "male", "chat_id": "UDEMO006", "bio": "Building healthy team culture.", "photo_url": None},
    {"name": "Shani Tal", "department": "Operations", "gender": "female", "chat_id": "UDEMO007", "bio": "Operations and process optimizer.", "photo_url": None},
    {"name": "Omer Hadad", "department": "Support", "gender": "male", "chat_id": "UDEMO008", "bio": "Customer advocate and problem solver.", "photo_url": None},
]


def main() -> None:
    db = SessionLocal()
    inserted = 0
    skipped = 0

    try:
        for payload in demo_users:
            existing = (
                db.query(models.User)
                .filter(models.User.chat_id == payload["chat_id"])
                .first()
            )
            if existing:
                skipped += 1
                continue

            db.add(
                models.User(
                    name=payload["name"],
                    bio=payload["bio"],
                    photo_url=payload["photo_url"],
                    department=payload["department"],
                    gender=payload["gender"],
                    chat_id=payload["chat_id"],
                    is_active=True,
                )
            )
            inserted += 1

        db.commit()
        print(f"Seed complete: inserted={inserted}, skipped={skipped}")
    finally:
        db.close()


if __name__ == "__main__":
    main()
