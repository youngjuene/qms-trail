from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import FileResponse, StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy import text, func
import logging
import os
import uuid
from typing import Optional
from PIL import Image
import io

from app.models.database import get_db
from app.models.photo import Photo
from app.models.user import User
from app.config import get_settings
from app.api.schemas import (
    PhotoUploadResponse,
    PhotoLocationUpdate,
    PhotoDetail,
    PhotoListResponse,
    PhotoDeleteResponse,
    HealthResponse
)

# Configure logging
logger = logging.getLogger(__name__)
settings = get_settings()

router = APIRouter()

# Storage configuration
STORAGE_DIR = os.getenv("STORAGE_DIR", "./storage/photos")
THUMBNAIL_DIR = os.getenv("THUMBNAIL_DIR", "./storage/thumbnails")
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".mp4", ".mov", ".avi", ".webm"}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB for images
MAX_VIDEO_SIZE = 100 * 1024 * 1024  # 100MB for videos

# Ensure storage directories exist
os.makedirs(STORAGE_DIR, exist_ok=True)
os.makedirs(THUMBNAIL_DIR, exist_ok=True)


def is_video_file(filename: str) -> bool:
    """Check if file is a video based on extension"""
    ext = os.path.splitext(filename)[1].lower()
    return ext in {".mp4", ".mov", ".avi", ".webm"}


def create_thumbnail(image_path: str, thumbnail_path: str, size=(200, 200)):
    """Create a thumbnail from an image"""
    try:
        with Image.open(image_path) as img:
            # Convert to RGB if necessary
            if img.mode in ('RGBA', 'LA', 'P'):
                img = img.convert('RGB')

            # Create thumbnail
            img.thumbnail(size, Image.Resampling.LANCZOS)
            img.save(thumbnail_path, "JPEG", quality=85, optimize=True)
            return True
    except Exception as e:
        logger.error(f"Failed to create thumbnail: {e}")
        return False


def create_video_thumbnail(video_path: str, thumbnail_path: str, time_offset: str = "00:00:01"):
    """Create a thumbnail from a video using ffmpeg"""
    import subprocess
    try:
        # Use ffmpeg to extract a frame from the video
        cmd = [
            'ffmpeg',
            '-i', video_path,
            '-ss', time_offset,
            '-vframes', '1',
            '-vf', 'scale=200:200:force_original_aspect_ratio=decrease',
            '-y',  # Overwrite output file
            thumbnail_path
        ]
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=10)

        if result.returncode == 0 and os.path.exists(thumbnail_path):
            return True
        else:
            logger.error(f"ffmpeg failed: {result.stderr}")
            return False
    except subprocess.TimeoutExpired:
        logger.error("Video thumbnail generation timed out")
        return False
    except FileNotFoundError:
        logger.error("ffmpeg not found. Install ffmpeg to generate video thumbnails.")
        return False
    except Exception as e:
        logger.error(f"Failed to create video thumbnail: {e}")
        return False


@router.get("/health", response_model=HealthResponse)
async def health_check(db: Session = Depends(get_db)):
    """Health check endpoint"""
    try:
        # Test database connection
        db.execute(text("SELECT 1"))
        db_status = "connected"
    except Exception as e:
        logger.error(f"Database health check failed: {e}")
        db_status = "disconnected"

    return HealthResponse(
        status="healthy" if db_status == "connected" else "unhealthy",
        version="1.0.0",
        database=db_status
    )


@router.post("/photos/upload", response_model=PhotoUploadResponse)
async def upload_photo(
    file: UploadFile = File(...),
    user_id: str = Form(...),
    latitude: float = Form(...),
    longitude: float = Form(...),
    db: Session = Depends(get_db)
):
    """
    Upload a photo with geographic location.

    - **file**: Image file (JPEG, PNG, WEBP, max 10MB)
    - **user_id**: ID of the user uploading the photo
    - **latitude**: Geographic latitude (-90 to 90)
    - **longitude**: Geographic longitude (-180 to 180)
    """
    # Validate user exists
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail=f"User not found: {user_id}")
    # Validate file extension
    file_ext = os.path.splitext(file.filename)[1].lower()
    if file_ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type. Allowed: {', '.join(ALLOWED_EXTENSIONS)}"
        )

    # Validate coordinates
    if not (-90 <= latitude <= 90):
        raise HTTPException(status_code=400, detail=f"Invalid latitude: {latitude}")
    if not (-180 <= longitude <= 180):
        raise HTTPException(status_code=400, detail=f"Invalid longitude: {longitude}")

    try:
        # Generate unique ID and file paths
        photo_id = str(uuid.uuid4())
        storage_filename = f"{photo_id}{file_ext}"
        storage_path = os.path.join(STORAGE_DIR, storage_filename)
        thumbnail_filename = f"{photo_id}_thumb.jpg"
        thumbnail_path = os.path.join(THUMBNAIL_DIR, thumbnail_filename)

        # Read and validate file size
        contents = await file.read()
        file_size = len(contents)

        # Check file size based on type (video vs image)
        is_video = is_video_file(file.filename)
        max_size = MAX_VIDEO_SIZE if is_video else MAX_FILE_SIZE
        max_size_mb = max_size / (1024*1024)

        if file_size > max_size:
            raise HTTPException(
                status_code=400,
                detail=f"File too large. Maximum size for {'videos' if is_video else 'images'}: {max_size_mb:.0f}MB"
            )

        # Save file
        with open(storage_path, "wb") as f:
            f.write(contents)

        # Create thumbnail (different logic for images vs videos)
        if is_video:
            thumbnail_created = create_video_thumbnail(storage_path, thumbnail_path)
        else:
            thumbnail_created = create_thumbnail(storage_path, thumbnail_path)

        # Create database record
        photo = Photo(
            id=photo_id,
            user_id=user_id,
            filename=file.filename,
            storage_path=storage_path,
            thumbnail_path=thumbnail_path if thumbnail_created else None,
            latitude=latitude,
            longitude=longitude,
            file_size=file_size,
            mime_type=file.content_type or "image/jpeg"
        )

        db.add(photo)
        db.commit()
        db.refresh(photo)

        logger.info(f"Photo uploaded: {photo_id} at ({latitude}, {longitude})")

        return PhotoUploadResponse(
            id=photo.id,
            filename=photo.filename,
            location={"latitude": latitude, "longitude": longitude},
            upload_date=photo.upload_date.isoformat(),
            thumbnail_url=f"/api/v1/photos/{photo.id}/thumbnail" if thumbnail_created else None,
            image_url=f"/api/v1/photos/{photo.id}/image"
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Photo upload failed: {e}")
        # Cleanup files if database operation failed
        if os.path.exists(storage_path):
            os.remove(storage_path)
        if os.path.exists(thumbnail_path):
            os.remove(thumbnail_path)
        raise HTTPException(status_code=500, detail="Failed to upload photo")


@router.get("/photos", response_model=PhotoListResponse)
async def get_photos(
    limit: int = 100,
    offset: int = 0,
    db: Session = Depends(get_db)
):
    """
    Get list of all photos.

    - **limit**: Maximum number of photos to return (default: 100)
    - **offset**: Number of photos to skip (default: 0)
    """
    try:
        # Get total count
        total = db.query(func.count(Photo.id)).scalar()

        # Get photos
        photos = db.query(Photo).order_by(Photo.upload_date.desc()).limit(limit).offset(offset).all()

        photo_list = [photo.to_dict() for photo in photos]

        return PhotoListResponse(
            photos=photo_list,
            total=total,
            limit=limit,
            offset=offset
        )

    except Exception as e:
        logger.error(f"Failed to fetch photos: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch photos")


@router.get("/photos/{photo_id}", response_model=PhotoDetail)
async def get_photo(photo_id: str, db: Session = Depends(get_db)):
    """Get photo details by ID"""
    photo = db.query(Photo).filter(Photo.id == photo_id).first()

    if not photo:
        raise HTTPException(status_code=404, detail="Photo not found")

    return photo.to_dict()


@router.get("/photos/{photo_id}/image")
async def get_photo_image(photo_id: str, db: Session = Depends(get_db)):
    """Get full-size photo image"""
    photo = db.query(Photo).filter(Photo.id == photo_id).first()

    if not photo:
        raise HTTPException(status_code=404, detail="Photo not found")

    if not os.path.exists(photo.storage_path):
        raise HTTPException(status_code=404, detail="Image file not found")

    return FileResponse(photo.storage_path, media_type=photo.mime_type)


@router.get("/photos/{photo_id}/thumbnail")
async def get_photo_thumbnail(photo_id: str, db: Session = Depends(get_db)):
    """Get photo thumbnail"""
    photo = db.query(Photo).filter(Photo.id == photo_id).first()

    if not photo:
        raise HTTPException(status_code=404, detail="Photo not found")

    if not photo.thumbnail_path or not os.path.exists(photo.thumbnail_path):
        raise HTTPException(status_code=404, detail="Thumbnail not found")

    return FileResponse(photo.thumbnail_path, media_type="image/jpeg")


@router.patch("/photos/{photo_id}/location", response_model=PhotoDetail)
async def update_photo_location(
    photo_id: str,
    location: PhotoLocationUpdate,
    db: Session = Depends(get_db)
):
    """Update photo location"""
    photo = db.query(Photo).filter(Photo.id == photo_id).first()

    if not photo:
        raise HTTPException(status_code=404, detail="Photo not found")

    try:
        photo.latitude = location.latitude
        photo.longitude = location.longitude

        db.commit()
        db.refresh(photo)

        logger.info(f"Photo location updated: {photo_id} to ({location.latitude}, {location.longitude})")

        return photo.to_dict()

    except Exception as e:
        logger.error(f"Failed to update photo location: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail="Failed to update photo location")


@router.delete("/photos/{photo_id}", response_model=PhotoDeleteResponse)
async def delete_photo(photo_id: str, db: Session = Depends(get_db)):
    """Delete a photo"""
    photo = db.query(Photo).filter(Photo.id == photo_id).first()

    if not photo:
        raise HTTPException(status_code=404, detail="Photo not found")

    try:
        # Delete files
        if os.path.exists(photo.storage_path):
            os.remove(photo.storage_path)
        if photo.thumbnail_path and os.path.exists(photo.thumbnail_path):
            os.remove(photo.thumbnail_path)

        # Delete database record
        db.delete(photo)
        db.commit()

        logger.info(f"Photo deleted: {photo_id}")

        return PhotoDeleteResponse(
            success=True,
            message="Photo deleted successfully"
        )

    except Exception as e:
        logger.error(f"Failed to delete photo: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail="Failed to delete photo")
