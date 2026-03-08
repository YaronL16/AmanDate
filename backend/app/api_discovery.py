from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from .db import get_db
from . import models, schemas


router = APIRouter(prefix="/api/discovery", tags=["discovery"])


@router.get("/{user_id}", response_model=List[schemas.UserCard])
def get_discovery_candidates(
    user_id: UUID,
    limit: int = Query(20, ge=1, le=50),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")

    # Users current user has already swiped on.
    subquery = select(models.Swipe.swiped_id).filter(models.Swipe.swiper_id == user_id)

    candidates = (
        db.query(models.User)
        .filter(models.User.id != user_id)
        .filter(models.User.is_active.is_(True))
        .filter(models.User.chat_id.is_not(None))
        .filter(~models.User.id.in_(subquery))
        .order_by(models.User.created_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )

    return candidates

