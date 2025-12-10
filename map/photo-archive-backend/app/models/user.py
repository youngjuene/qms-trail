from sqlalchemy import Column, String, Integer, BigInteger, DateTime, JSON, func
from sqlalchemy.orm import relationship
from app.models.database import Base
import uuid
from datetime import datetime, timezone


class User(Base):
    """
    User model for photo archive system.

    Each user has:
    - Unique identifier (UUID)
    - Profile information (username, display name, email, avatar)
    - Statistics (photo count, storage usage)
    - Relationships to their uploaded photos
    - Timestamps for tracking
    """
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    username = Column(String(100), unique=True, nullable=False, index=True)
    display_name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True)

    # User avatar/profile
    avatar_path = Column(String(512))

    # Statistics (denormalized for performance, updated via triggers)
    photo_count = Column(Integer, default=0, nullable=False)
    total_storage_bytes = Column(BigInteger, default=0, nullable=False)

    # Metadata
    user_metadata = Column(JSON)

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    last_upload_at = Column(DateTime(timezone=True))

    # Relationships
    # Note: photos relationship is defined via foreign key in Photo model
    # Access via query: user.photos or Photo.query.filter_by(user_id=user.id)

    def __repr__(self):
        return f"<User(id={self.id}, username={self.username}, photos={self.photo_count})>"

    def to_dict(self, include_stats=True):
        """
        Convert user model to dictionary for API responses.

        Args:
            include_stats: Include photo count and storage statistics
        """
        result = {
            "id": self.id,
            "username": self.username,
            "display_name": self.display_name,
            "email": self.email,
            "avatar_url": f"/api/v1/users/{self.id}/avatar" if self.avatar_path else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }

        if include_stats:
            result.update({
                "photo_count": self.photo_count,
                "total_storage_bytes": self.total_storage_bytes,
                "last_upload_at": self.last_upload_at.isoformat() if self.last_upload_at else None,
            })

        return result

    def to_dict_minimal(self):
        """
        Minimal user info for embedding in photo responses.
        """
        return {
            "id": self.id,
            "username": self.username,
            "display_name": self.display_name,
        }
