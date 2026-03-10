from datetime import datetime
from typing import Literal, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from .profile_options import DISCOVERY_GENDERS, ISRAEL_REGIONS, MUSIC_GENRES


def _normalize_string_list(value: Optional[list[str]]) -> Optional[list[str]]:
    if value is None:
        return value
    cleaned = [item.strip() for item in value]
    if any(not item for item in cleaned):
        raise ValueError("List values cannot be empty.")
    # Preserve order while deduping.
    return list(dict.fromkeys(cleaned))


class UserBase(BaseModel):
    name: str = Field(..., min_length=1)
    bio: Optional[str] = None
    photo_urls: Optional[list[str]] = None
    department: Optional[str] = None
    chat_id: str = Field(..., min_length=1)
    gender: Optional[Literal["male", "female"]] = None
    age: Optional[int] = Field(default=None, ge=18, le=120)
    favorite_genres: Optional[list[str]] = None
    region: Optional[str] = None
    preferred_age_min: Optional[int] = Field(default=None, ge=18, le=120)
    preferred_age_max: Optional[int] = Field(default=None, ge=18, le=120)
    preferred_regions: Optional[list[str]] = None
    preferred_genders: Optional[list[str]] = None

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

    @field_validator("photo_urls")
    @classmethod
    def validate_photo_urls(cls, value: Optional[list[str]]) -> Optional[list[str]]:
        if value is None:
            return value
        if len(value) > 5:
            raise ValueError("photo_urls can include at most 5 URLs.")
        cleaned = [url.strip() for url in value]
        if any(not url for url in cleaned):
            raise ValueError("photo_urls cannot contain empty values.")
        return cleaned

    @field_validator("region")
    @classmethod
    def validate_region(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return value
        if value not in ISRAEL_REGIONS:
            raise ValueError("Invalid region.")
        return value

    @field_validator("preferred_regions")
    @classmethod
    def validate_preferred_regions(cls, value: Optional[list[str]]) -> Optional[list[str]]:
        normalized = _normalize_string_list(value)
        if normalized is None:
            return normalized
        invalid = [region for region in normalized if region not in ISRAEL_REGIONS]
        if invalid:
            raise ValueError(f"Invalid preferred region(s): {', '.join(invalid)}.")
        return normalized

    @field_validator("preferred_genders")
    @classmethod
    def validate_preferred_genders(cls, value: Optional[list[str]]) -> Optional[list[str]]:
        normalized = _normalize_string_list(value)
        if normalized is None:
            return normalized
        invalid = [gender for gender in normalized if gender not in DISCOVERY_GENDERS]
        if invalid:
            raise ValueError(f"Invalid preferred gender(s): {', '.join(invalid)}.")
        return normalized

    @model_validator(mode="after")
    def validate_preferred_age_range(self):
        if (
            self.preferred_age_min is not None
            and self.preferred_age_max is not None
            and self.preferred_age_min > self.preferred_age_max
        ):
            raise ValueError("preferred_age_min must be less than or equal to preferred_age_max.")
        return self


class UserCreate(UserBase):
    is_active: Optional[bool] = None


class UserUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1)
    bio: Optional[str] = None
    photo_urls: Optional[list[str]] = None
    department: Optional[str] = None
    chat_id: Optional[str] = Field(None, min_length=1)
    gender: Optional[Literal["male", "female"]] = None
    age: Optional[int] = Field(default=None, ge=18, le=120)
    favorite_genres: Optional[list[str]] = None
    region: Optional[str] = None
    preferred_age_min: Optional[int] = Field(default=None, ge=18, le=120)
    preferred_age_max: Optional[int] = Field(default=None, ge=18, le=120)
    preferred_regions: Optional[list[str]] = None
    preferred_genders: Optional[list[str]] = None
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

    @field_validator("photo_urls")
    @classmethod
    def validate_photo_urls(cls, value: Optional[list[str]]) -> Optional[list[str]]:
        if value is None:
            return value
        if len(value) > 5:
            raise ValueError("photo_urls can include at most 5 URLs.")
        cleaned = [url.strip() for url in value]
        if any(not url for url in cleaned):
            raise ValueError("photo_urls cannot contain empty values.")
        return cleaned

    @field_validator("region")
    @classmethod
    def validate_region(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return value
        if value not in ISRAEL_REGIONS:
            raise ValueError("Invalid region.")
        return value

    @field_validator("preferred_regions")
    @classmethod
    def validate_preferred_regions(cls, value: Optional[list[str]]) -> Optional[list[str]]:
        normalized = _normalize_string_list(value)
        if normalized is None:
            return normalized
        invalid = [region for region in normalized if region not in ISRAEL_REGIONS]
        if invalid:
            raise ValueError(f"Invalid preferred region(s): {', '.join(invalid)}.")
        return normalized

    @field_validator("preferred_genders")
    @classmethod
    def validate_preferred_genders(cls, value: Optional[list[str]]) -> Optional[list[str]]:
        normalized = _normalize_string_list(value)
        if normalized is None:
            return normalized
        invalid = [gender for gender in normalized if gender not in DISCOVERY_GENDERS]
        if invalid:
            raise ValueError(f"Invalid preferred gender(s): {', '.join(invalid)}.")
        return normalized

    @model_validator(mode="after")
    def validate_preferred_age_range(self):
        if (
            self.preferred_age_min is not None
            and self.preferred_age_max is not None
            and self.preferred_age_min > self.preferred_age_max
        ):
            raise ValueError("preferred_age_min must be less than or equal to preferred_age_max.")
        return self


class UserOut(BaseModel):
    id: UUID
    name: str
    bio: Optional[str]
    photo_urls: Optional[list[str]]
    department: Optional[str]
    chat_id: str
    gender: Optional[Literal["male", "female"]]
    age: Optional[int]
    favorite_genres: Optional[list[str]]
    region: Optional[str]
    preferred_age_min: Optional[int]
    preferred_age_max: Optional[int]
    preferred_regions: Optional[list[str]]
    preferred_genders: Optional[list[str]]
    is_active: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class UserCard(BaseModel):
    id: UUID
    name: str
    bio: Optional[str]
    age: Optional[int]
    region: Optional[str]
    favorite_genres: Optional[list[str]]
    department: Optional[str]
    photo_urls: Optional[list[str]]
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
    photo_urls: Optional[list[str]]
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
    discovery_genders: list[str]
