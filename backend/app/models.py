from datetime import datetime
from uuid import uuid4

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Column,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    JSON,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from .db import Base


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    name = Column(String, nullable=False)
    bio = Column(Text, nullable=True)
    photo_url = Column(String, nullable=True)
    chat_id = Column(String, nullable=False, unique=True)
    department = Column(String, nullable=True)
    gender = Column(Enum("male", "female", name="user_gender"), nullable=True)
    age = Column(Integer, nullable=True)
    favorite_genres = Column(JSON, nullable=True)
    region = Column(String, nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)
    last_active_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    swipes_made = relationship(
        "Swipe",
        back_populates="swiper",
        foreign_keys="Swipe.swiper_id",
        cascade="all, delete-orphan",
    )
    swipes_received = relationship(
        "Swipe",
        back_populates="swiped",
        foreign_keys="Swipe.swiped_id",
        cascade="all, delete-orphan",
    )


class Swipe(Base):
    __tablename__ = "swipes"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    swiper_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    swiped_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    direction = Column(Enum("right", "left", name="swipe_direction"), nullable=False)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    __table_args__ = (
        UniqueConstraint("swiper_id", "swiped_id", name="uq_swipe_swiper_swiped"),
        CheckConstraint("swiper_id <> swiped_id", name="ck_swipe_not_self"),
    )

    swiper = relationship(
        "User", back_populates="swipes_made", foreign_keys=[swiper_id]
    )
    swiped = relationship(
        "User", back_populates="swipes_received", foreign_keys=[swiped_id]
    )


class Match(Base):
    __tablename__ = "matches"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    user1_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    user2_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    chat_thread_url = Column(String, nullable=True)

    __table_args__ = (
        UniqueConstraint("user1_id", "user2_id", name="uq_match_user_pair"),
        CheckConstraint("user1_id <> user2_id", name="ck_match_not_self"),
    )

