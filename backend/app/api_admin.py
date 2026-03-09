from typing import List

from fastapi import APIRouter, Depends, Header, HTTPException, Query, status
from sqlalchemy.orm import Session

from . import models, schemas
from .config import get_settings
from .db import get_db


router = APIRouter(prefix="/api/admin", tags=["admin"])
settings = get_settings()


def _require_admin(admin_user_id: str | None) -> None:
    if not settings.is_admin_enabled():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin view is disabled.",
        )
    if not settings.is_authorized_admin(admin_user_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access denied.",
        )


@router.get("/users", response_model=List[schemas.UserOut])
def list_admin_users(
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    admin_user_id: str | None = Header(default=None, alias="X-Admin-User-Id"),
    db: Session = Depends(get_db),
):
    _require_admin(admin_user_id)
    return (
        db.query(models.User)
        .order_by(models.User.created_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )


@router.get("/swipes", response_model=List[schemas.AdminSwipeOut])
def list_admin_swipes(
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    admin_user_id: str | None = Header(default=None, alias="X-Admin-User-Id"),
    db: Session = Depends(get_db),
):
    _require_admin(admin_user_id)
    return (
        db.query(models.Swipe)
        .order_by(models.Swipe.created_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )


@router.get("/matches", response_model=List[schemas.AdminMatchOut])
def list_admin_matches(
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    admin_user_id: str | None = Header(default=None, alias="X-Admin-User-Id"),
    db: Session = Depends(get_db),
):
    _require_admin(admin_user_id)
    return (
        db.query(models.Match)
        .order_by(models.Match.created_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )
