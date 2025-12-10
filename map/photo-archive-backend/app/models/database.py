from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime, JSON, func
from sqlalchemy.orm import declarative_base, sessionmaker
from geoalchemy2 import Geometry
from datetime import datetime, timezone
from app.config import get_settings
import logging

logger = logging.getLogger(__name__)
settings = get_settings()

# Create engine with connection pooling
engine = create_engine(
    settings.DATABASE_URL,
    pool_size=settings.DATABASE_POOL_SIZE,
    max_overflow=settings.DATABASE_MAX_OVERFLOW,
    pool_pre_ping=True,  # Verify connections before using
    echo=False,  # Set to True for SQL debugging
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    """Database session dependency for FastAPI"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
