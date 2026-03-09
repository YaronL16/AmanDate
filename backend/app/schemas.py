from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class UserBase(BaseModel):
    name: str = Field(..., min_length=1)
    bio: Optional[str] = None
    photo_url: Optional[str] = None
    department: Optional[str] = None
    chat_id: str = Field(..., min_length=1)


class UserCreate(UserBase):
    is_active: Optional[bool] = None


class UserUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1)
    bio: Optional[str] = None
    photo_url: Optional[str] = None
    department: Optional[str] = None
    chat_id: Optional[str] = Field(None, min_length=1)
    is_active: Optional[bool] = None


class UserOut(BaseModel):
    id: UUID
    name: str
    bio: Optional[str]
    photo_url: Optional[str]
    department: Optional[str]
    chat_id: str
    is_active: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class UserCard(BaseModel):
    id: UUID
    name: str
    department: Optional[str]
    photo_url: Optional[str]

    model_config = ConfigDict(from_attributes=True)


class SwipeRequest(BaseModel):
    swiper_id: UUID
    swiped_id: UUID
    direction: str = Field(..., pattern="^(right|left)$")


class MatchUser(BaseModel):
    id: UUID
    name: str
    department: Optional[str]
    photo_url: Optional[str]
    chat_id: str

    model_config = ConfigDict(from_attributes=True)


class MatchOut(BaseModel):
    id: UUID
    created_at: datetime
    other_user: MatchUser
    chat_thread_url: Optional[str] = None


class SwipeResult(BaseModel):
    matched: bool
    match: Optional[MatchOut] = None

