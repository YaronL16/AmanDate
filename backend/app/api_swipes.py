from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from .db import get_db
from . import models, schemas


router = APIRouter(prefix="/api", tags=["swipes", "matches"])


def _get_user_or_404(db: Session, user_id: UUID) -> models.User:
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")
    return user


@router.post("/swipe", response_model=schemas.SwipeResult)
def swipe(payload: schemas.SwipeRequest, db: Session = Depends(get_db)):
    if payload.swiper_id == payload.swiped_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User cannot swipe on themselves.",
        )

    swiper = _get_user_or_404(db, payload.swiper_id)
    swiped = _get_user_or_404(db, payload.swiped_id)

    if not swiper.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Enable your account before swiping.",
        )

    if not swiped.is_active or not swiped.chat_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot swipe on users who have not enabled their account or users without a chat_id.",
        )

    # Idempotency: do not create duplicate swipe records.
    existing_swipe = (
        db.query(models.Swipe)
        .filter(
            models.Swipe.swiper_id == payload.swiper_id,
            models.Swipe.swiped_id == payload.swiped_id,
        )
        .first()
    )

    if not existing_swipe:
        swipe_record = models.Swipe(
            swiper_id=payload.swiper_id,
            swiped_id=payload.swiped_id,
            direction=payload.direction,
        )
        db.add(swipe_record)

    matched = False
    match_obj = None

    if payload.direction == "right":
        reciprocal = (
            db.query(models.Swipe)
            .filter(
                models.Swipe.swiper_id == payload.swiped_id,
                models.Swipe.swiped_id == payload.swiper_id,
                models.Swipe.direction == "right",
            )
            .first()
        )

        if reciprocal:
            # Enforce canonical ordering for matches so each pair has at most one row.
            user1_id, user2_id = sorted([payload.swiper_id, payload.swiped_id])

            match_obj = (
                db.query(models.Match)
                .filter(
                    models.Match.user1_id == user1_id,
                    models.Match.user2_id == user2_id,
                )
                .first()
            )

            if not match_obj:
                match_obj = models.Match(user1_id=user1_id, user2_id=user2_id)
                db.add(match_obj)

            matched = True

    db.commit()

    if matched and match_obj:
        db.refresh(match_obj)
        other_user = swiped if swiper.id == payload.swiper_id else swiper

        return schemas.SwipeResult(
            matched=True,
            match=schemas.MatchOut(
                id=match_obj.id,
                created_at=match_obj.created_at,
                other_user=schemas.MatchUser.model_validate(other_user),
                chat_thread_url=match_obj.chat_thread_url,
            ),
        )

    return schemas.SwipeResult(matched=False, match=None)


@router.get("/matches/{user_id}", response_model=List[schemas.MatchOut])
def list_matches(user_id: UUID, db: Session = Depends(get_db)):
    user = _get_user_or_404(db, user_id)

    matches = (
        db.query(models.Match)
        .filter(
            (models.Match.user1_id == user.id)
            | (models.Match.user2_id == user.id)
        )
        .order_by(models.Match.created_at.desc())
        .all()
    )

    results: List[schemas.MatchOut] = []

    for match in matches:
        other_user_id = match.user2_id if match.user1_id == user.id else match.user1_id
        other_user = db.query(models.User).filter(models.User.id == other_user_id).first()
        if not other_user:
            continue

        results.append(
            schemas.MatchOut(
                id=match.id,
                created_at=match.created_at,
                other_user=schemas.MatchUser.model_validate(other_user),
                chat_thread_url=match.chat_thread_url,
            )
        )

    return results

