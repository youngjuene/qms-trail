from sqlalchemy import Column, String, Float, DateTime, Integer, JSON, func, ForeignKey
from sqlalchemy.orm import relationship
from app.models.database import Base
import uuid
from datetime import datetime, timezone


class Photo(Base):
    """
    Photo model for storing uploaded images with geographic location.

    Each photo has:
    - Unique identifier (UUID)
    - File storage information (filename, path, size, type)
    - Geographic location (latitude, longitude)
    - Optional metadata (EXIF data, tags, etc.)
    - Timestamps for tracking
    """
    __tablename__ = "photos"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    filename = Column(String(255), nullable=False)
    storage_path = Column(String(512), nullable=False)
    thumbnail_path = Column(String(512))

    # Geographic location
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)

    # File information
    file_size = Column(Integer, nullable=False)  # Size in bytes
    mime_type = Column(String(100), nullable=False)

    # Optional metadata (EXIF data, user tags, etc.)
    photo_metadata = Column(JSON)

    # Timestamps
    upload_date = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    user = relationship("User", backref="photos")

    def __repr__(self):
        return f"<Photo(id={self.id}, filename={self.filename}, location=({self.latitude}, {self.longitude}))>"

    def to_dict(self, include_user=False):
        """
        Convert photo model to dictionary for API responses.

        Args:
            include_user: Include minimal user information
        """
        result = {
            "id": self.id,
            "user_id": self.user_id,
            "filename": self.filename,
            "location": {
                "latitude": self.latitude,
                "longitude": self.longitude
            },
            "upload_date": self.upload_date.isoformat() if self.upload_date else None,
            "file_size": self.file_size,
            "mime_type": self.mime_type,
            "metadata": self.photo_metadata,
            "thumbnail_url": f"/api/v1/photos/{self.id}/thumbnail" if self.thumbnail_path else None,
            "image_url": f"/api/v1/photos/{self.id}/image"
        }

        if include_user and self.user:
            result["user"] = self.user.to_dict_minimal()

        return result
