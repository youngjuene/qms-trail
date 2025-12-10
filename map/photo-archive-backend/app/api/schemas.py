from pydantic import BaseModel, Field, field_validator, EmailStr
from typing import List, Optional, Dict
from datetime import datetime


# ============================================================
# User Schemas
# ============================================================

class UserCreate(BaseModel):
    """Request to create a new user"""
    username: str = Field(..., min_length=3, max_length=100, description="Unique username")
    display_name: str = Field(..., min_length=1, max_length=255, description="Display name")
    email: Optional[EmailStr] = Field(None, description="Email address")


class UserUpdate(BaseModel):
    """Request to update user information"""
    display_name: Optional[str] = Field(None, min_length=1, max_length=255)
    email: Optional[EmailStr] = None


class UserMinimal(BaseModel):
    """Minimal user information for embedding"""
    id: str
    username: str
    display_name: str


class UserDetail(BaseModel):
    """Detailed user information"""
    id: str
    username: str
    display_name: str
    email: Optional[str]
    avatar_url: Optional[str]
    photo_count: int
    total_storage_bytes: int
    last_upload_at: Optional[str]
    created_at: str


class UserListResponse(BaseModel):
    """Response for listing users"""
    users: List[UserDetail]
    total: int
    limit: int
    offset: int


# ============================================================
# Photo Schemas (Modified)
# ============================================================

class PhotoUploadResponse(BaseModel):
    """Response after successful photo upload"""
    id: str
    filename: str
    location: Dict[str, float]  # {"latitude": float, "longitude": float}
    upload_date: str
    thumbnail_url: Optional[str] = None
    image_url: str


class PhotoLocationUpdate(BaseModel):
    """Request to update photo location"""
    latitude: float = Field(..., ge=-90, le=90, description="Latitude")
    longitude: float = Field(..., ge=-180, le=180, description="Longitude")

    @field_validator('latitude')
    @classmethod
    def validate_latitude(cls, v):
        if not (-90 <= v <= 90):
            raise ValueError(f'Invalid latitude: {v}')
        return v

    @field_validator('longitude')
    @classmethod
    def validate_longitude(cls, v):
        if not (-180 <= v <= 180):
            raise ValueError(f'Invalid longitude: {v}')
        return v


class PhotoDetail(BaseModel):
    """Detailed photo information"""
    id: str
    user_id: str
    filename: str
    location: Dict[str, float]  # {"latitude": float, "longitude": float}
    upload_date: str
    file_size: int
    mime_type: str
    image_url: str
    thumbnail_url: Optional[str] = None
    metadata: Optional[Dict] = None
    user: Optional[UserMinimal] = None


class PhotoListResponse(BaseModel):
    """Response for listing photos"""
    photos: List[PhotoDetail]
    total: int
    limit: int
    offset: int


class PhotoDeleteResponse(BaseModel):
    """Response after photo deletion"""
    success: bool
    message: str


class HealthResponse(BaseModel):
    """Health check response"""
    status: str
    version: str
    database: str
