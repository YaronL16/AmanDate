from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from .db import get_db
from . import models, schemas
from .profile_options import ISRAEL_REGIONS, MUSIC_GENRES


router = APIRouter(prefix="/api/users", tags=["users"])


@router.get("", response_model=List[schemas.UserOut])
def list_users(
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
):
    users = (
        db.query(models.User)
        .order_by(models.User.created_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )
    return users


@router.post("", response_model=schemas.UserOut, status_code=status.HTTP_201_CREATED)
def create_user(payload: schemas.UserCreate, db: Session = Depends(get_db)):
    user = models.User(
        name=payload.name,
        bio=payload.bio,
        photo_url=payload.photo_url,
        department=payload.department,
        chat_id=payload.chat_id,
        gender=payload.gender,
        age=payload.age,
        favorite_genres=payload.favorite_genres,
        region=payload.region,
        is_active=payload.is_active if payload.is_active is not None else True,
    )
    db.add(user)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="User with this chat_id already exists.",
        )
    db.refresh(user)
    return user


@router.get("/options", response_model=schemas.ProfileOptionsOut)
def get_profile_options():
    return schemas.ProfileOptionsOut(
        music_genres=MUSIC_GENRES,
        israel_regions=ISRAEL_REGIONS,
    )


@router.get("/{user_id}", response_model=schemas.UserOut)
def get_user(user_id: UUID, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")
    return user


@router.put("/{user_id}", response_model=schemas.UserOut)
def update_user(user_id: UUID, payload: schemas.UserUpdate, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(user, field, value)

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Update would violate a uniqueness constraint (likely chat_id).",
        )
    db.refresh(user)
    return user


@router.post("/{user_id}/deactivate", response_model=schemas.UserOut)
def deactivate_user(user_id: UUID, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")

    user.is_active = False
    db.commit()
    db.refresh(user)
    return user

