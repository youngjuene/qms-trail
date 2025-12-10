from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc, asc, func
from typing import Optional
import logging

from app.models import get_db, User, Photo
from app.api.schemas import (
    UserCreate, UserUpdate, UserDetail, UserListResponse,
    PhotoListResponse, PhotoDetail
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/users", tags=["users"])


# ============================================================
# User CRUD Endpoints
# ============================================================

@router.get("", response_model=UserListResponse)
async def list_users(
    sort: str = Query("last_upload", description="Sort by: created_at, photo_count, last_upload, username"),
    order: str = Query("desc", description="Order: asc or desc"),
    limit: int = Query(50, ge=1, le=100, description="Maximum number of users to return"),
    offset: int = Query(0, ge=0, description="Number of users to skip"),
    search: Optional[str] = Query(None, description="Search by username or display name"),
    db: Session = Depends(get_db)
):
    """
    List all users with optional filtering and sorting.

    Query Parameters:
    - sort: Field to sort by (created_at, photo_count, last_upload, username)
    - order: Sort order (asc or desc)
    - limit: Maximum results (1-100)
    - offset: Pagination offset
    - search: Search term for username/display_name
    """
    try:
        # Base query
        query = db.query(User)

        # Apply search filter
        if search:
            search_term = f"%{search}%"
            query = query.filter(
                (User.username.ilike(search_term)) |
                (User.display_name.ilike(search_term))
            )

        # Apply sorting
        sort_column = {
            "created_at": User.created_at,
            "photo_count": User.photo_count,
            "last_upload": User.last_upload_at,
            "username": User.username
        }.get(sort, User.last_upload_at)

        if order == "asc":
            query = query.order_by(asc(sort_column))
        else:
            query = query.order_by(desc(sort_column))

        # Get total count
        total = query.count()

        # Apply pagination
        users = query.offset(offset).limit(limit).all()

        # Convert to response format
        user_list = [
            UserDetail(**user.to_dict(include_stats=True))
            for user in users
        ]

        return UserListResponse(
            users=user_list,
            total=total,
            limit=limit,
            offset=offset
        )

    except Exception as e:
        logger.error(f"Error listing users: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to list users: {str(e)}")


@router.get("/{user_id}", response_model=UserDetail)
async def get_user(
    user_id: str,
    db: Session = Depends(get_db)
):
    """
    Get detailed information about a specific user.
    """
    try:
        user = db.query(User).filter(User.id == user_id).first()

        if not user:
            raise HTTPException(status_code=404, detail=f"User not found: {user_id}")

        return UserDetail(**user.to_dict(include_stats=True))

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting user {user_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get user: {str(e)}")


@router.post("", response_model=UserDetail, status_code=201)
async def create_user(
    user_data: UserCreate,
    db: Session = Depends(get_db)
):
    """
    Create a new user.

    Request Body:
    - username: Unique username (3-100 characters)
    - display_name: Display name (1-255 characters)
    - email: Optional email address
    """
    try:
        # Check if username already exists
        existing_user = db.query(User).filter(User.username == user_data.username).first()
        if existing_user:
            raise HTTPException(status_code=400, detail=f"Username already exists: {user_data.username}")

        # Check if email already exists (if provided)
        if user_data.email:
            existing_email = db.query(User).filter(User.email == user_data.email).first()
            if existing_email:
                raise HTTPException(status_code=400, detail=f"Email already exists: {user_data.email}")

        # Create new user
        new_user = User(
            username=user_data.username,
            display_name=user_data.display_name,
            email=user_data.email
        )

        db.add(new_user)
        db.commit()
        db.refresh(new_user)

        logger.info(f"Created user: {new_user.username} (id: {new_user.id})")

        return UserDetail(**new_user.to_dict(include_stats=True))

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error creating user: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to create user: {str(e)}")


@router.patch("/{user_id}", response_model=UserDetail)
async def update_user(
    user_id: str,
    user_data: UserUpdate,
    db: Session = Depends(get_db)
):
    """
    Update user information.

    Request Body (all optional):
    - display_name: New display name
    - email: New email address
    """
    try:
        user = db.query(User).filter(User.id == user_id).first()

        if not user:
            raise HTTPException(status_code=404, detail=f"User not found: {user_id}")

        # Update fields if provided
        if user_data.display_name is not None:
            user.display_name = user_data.display_name

        if user_data.email is not None:
            # Check if email already exists for another user
            existing_email = db.query(User).filter(
                User.email == user_data.email,
                User.id != user_id
            ).first()
            if existing_email:
                raise HTTPException(status_code=400, detail=f"Email already exists: {user_data.email}")
            user.email = user_data.email

        db.commit()
        db.refresh(user)

        logger.info(f"Updated user: {user.username} (id: {user.id})")

        return UserDetail(**user.to_dict(include_stats=True))

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error updating user {user_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to update user: {str(e)}")


@router.delete("/{user_id}")
async def delete_user(
    user_id: str,
    db: Session = Depends(get_db)
):
    """
    Delete a user and all their photos (CASCADE).
    """
    try:
        user = db.query(User).filter(User.id == user_id).first()

        if not user:
            raise HTTPException(status_code=404, detail=f"User not found: {user_id}")

        username = user.username
        photo_count = user.photo_count

        db.delete(user)
        db.commit()

        logger.info(f"Deleted user: {username} (id: {user_id}) with {photo_count} photos")

        return {
            "success": True,
            "message": f"User deleted: {username}",
            "photos_deleted": photo_count
        }

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error deleting user {user_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to delete user: {str(e)}")


# ============================================================
# User Photos Endpoints
# ============================================================

@router.get("/{user_id}/photos", response_model=PhotoListResponse)
async def list_user_photos(
    user_id: str,
    limit: int = Query(100, ge=1, le=500, description="Maximum number of photos to return"),
    offset: int = Query(0, ge=0, description="Number of photos to skip"),
    sort: str = Query("upload_date", description="Sort by: upload_date or file_size"),
    order: str = Query("desc", description="Order: asc or desc"),
    bounds: Optional[str] = Query(None, description="Geographic bounds: north,south,east,west"),
    db: Session = Depends(get_db)
):
    """
    List all photos for a specific user.

    Query Parameters:
    - limit: Maximum results (1-500)
    - offset: Pagination offset
    - sort: Field to sort by (upload_date, file_size)
    - order: Sort order (asc or desc)
    - bounds: Geographic bounding box "north,south,east,west"
    """
    try:
        # Verify user exists
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail=f"User not found: {user_id}")

        # Base query
        query = db.query(Photo).filter(Photo.user_id == user_id)

        # Apply geographic bounds filter if provided
        if bounds:
            try:
                north, south, east, west = map(float, bounds.split(','))
                query = query.filter(
                    Photo.latitude >= south,
                    Photo.latitude <= north,
                    Photo.longitude >= west,
                    Photo.longitude <= east
                )
            except ValueError:
                raise HTTPException(status_code=400, detail="Invalid bounds format. Use: north,south,east,west")

        # Apply sorting
        sort_column = {
            "upload_date": Photo.upload_date,
            "file_size": Photo.file_size
        }.get(sort, Photo.upload_date)

        if order == "asc":
            query = query.order_by(asc(sort_column))
        else:
            query = query.order_by(desc(sort_column))

        # Get total count
        total = query.count()

        # Apply pagination
        photos = query.offset(offset).limit(limit).all()

        # Convert to response format
        photo_list = [
            PhotoDetail(**photo.to_dict(include_user=False))
            for photo in photos
        ]

        return PhotoListResponse(
            photos=photo_list,
            total=total,
            limit=limit,
            offset=offset
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error listing photos for user {user_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to list photos: {str(e)}")
