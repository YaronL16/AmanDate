from datetime import datetime
from typing import Literal, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator

from .profile_options import ISRAEL_REGIONS, MUSIC_GENRES


class UserBase(BaseModel):
    name: str = Field(..., min_length=1)
    bio: Optional[str] = None
    photo_url: Optional[str] = None
    department: Optional[str] = None
    chat_id: str = Field(..., min_length=1)
    gender: Optional[Literal["male", "female"]] = None
    age: Optional[int] = Field(default=None, ge=18, le=120)
    favorite_genres: Optional[list[str]] = None
    region: Optional[str] = None

    @field_validator("favorite_genres")
    @classmethod
    def validate_favorite_genres(cls, value: Optional[list[str]]) -> Optional[list[str]]:
        if value is None:
            return value
        if len(value) > 3:
            raise ValueError("favorite_genres can include at most 3 genres.")
        if len(set(value)) != len(value):
            raise ValueError("favorite_genres cannot contain duplicates.")
        invalid = [genre for genre in value if genre not in MUSIC_GENRES]
        if invalid:
            raise ValueError(f"Invalid favorite genre(s): {', '.join(invalid)}.")
        return value

    @field_validator("region")
    @classmethod
    def validate_region(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return value
        if value not in ISRAEL_REGIONS:
            raise ValueError("Invalid region.")
        return value


class UserCreate(UserBase):
    is_active: Optional[bool] = None


class UserUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1)
    bio: Optional[str] = None
    photo_url: Optional[str] = None
    department: Optional[str] = None
    chat_id: Optional[str] = Field(None, min_length=1)
    gender: Optional[Literal["male", "female"]] = None
    age: Optional[int] = Field(default=None, ge=18, le=120)
    favorite_genres: Optional[list[str]] = None
    region: Optional[str] = None
    is_active: Optional[bool] = None

    @field_validator("favorite_genres")
    @classmethod
    def validate_favorite_genres(cls, value: Optional[list[str]]) -> Optional[list[str]]:
        if value is None:
            return value
        if len(value) > 3:
            raise ValueError("favorite_genres can include at most 3 genres.")
        if len(set(value)) != len(value):
            raise ValueError("favorite_genres cannot contain duplicates.")
        invalid = [genre for genre in value if genre not in MUSIC_GENRES]
        if invalid:
            raise ValueError(f"Invalid favorite genre(s): {', '.join(invalid)}.")
        return value

    @field_validator("region")
    @classmethod
    def validate_region(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return value
        if value not in ISRAEL_REGIONS:
            raise ValueError("Invalid region.")
        return value


class UserOut(BaseModel):
    id: UUID
    name: str
    bio: Optional[str]
    photo_url: Optional[str]
    department: Optional[str]
    chat_id: str
    gender: Optional[Literal["male", "female"]]
    age: Optional[int]
    favorite_genres: Optional[list[str]]
    region: Optional[str]
    is_active: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class UserCard(BaseModel):
    id: UUID
    name: str
    department: Optional[str]
    photo_url: Optional[str]
    gender: Optional[Literal["male", "female"]]

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


class AdminSwipeOut(BaseModel):
    id: UUID
    swiper_id: UUID
    swiped_id: UUID
    direction: Literal["right", "left"]
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class AdminMatchOut(BaseModel):
    id: UUID
    user1_id: UUID
    user2_id: UUID
    created_at: datetime
    chat_thread_url: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class ProfileOptionsOut(BaseModel):
    music_genres: list[str]
    israel_regions: list[str]
