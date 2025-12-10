from pydantic_settings import BaseSettings
from pydantic import ConfigDict
from functools import lru_cache
from typing import List
import os

class Settings(BaseSettings):
    # Pydantic v2 configuration
    model_config = ConfigDict(
        env_file=".env",
        case_sensitive=True,
        extra='ignore'  # Ignore extra fields in .env
    )

    # Database
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        "postgresql://postgres:changeme@localhost/route_similarity"
    )

    # Redis (optional)
    REDIS_URL: str = "redis://localhost:6379/0"
    USE_REDIS: bool = False

    # API
    API_V1_PREFIX: str = "/api/v1"
    PROJECT_NAME: str = "Route Similarity API"

    # CORS Configuration
    ALLOWED_ORIGINS: List[str] = ["http://localhost:3000", "http://localhost:8080"]
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")

    # Processing parameters
    ANGLE_THRESHOLD: float = 10.0  # degrees
    CURVATURE_SAMPLES: int = 50

    # Similarity weights (must sum to 1.0 after normalization)
    # MECE System: Turn (DTW), Curvature (Pearson), Sinuosity (Global Tortuosity)
    TURN_WEIGHT: float = 0.6
    CURVATURE_WEIGHT: float = 0.3
    SINUOSITY_WEIGHT: float = 0.1  # Global tortuosity

    # Enhanced curvature feature flag (Phase 1: backward-compatible addition)
    ENABLE_ENHANCED_CURVATURE: bool = os.getenv("ENABLE_ENHANCED_CURVATURE", "false").lower() == "true"
    CURVATURE_SAMPLING_INTERVAL_M: float = 15.0  # Spatial sampling interval in meters

    # Search defaults
    DEFAULT_TOP_K: int = 10
    DEFAULT_MIN_SIMILARITY: float = 0.3
    MAX_TOP_K: int = 100

    # Performance tuning
    MAX_CANDIDATE_LIMIT: int = 1000
    DATABASE_POOL_SIZE: int = 10
    DATABASE_MAX_OVERFLOW: int = 20

    # Seongsu-specific settings
    SEONGSU_MODE: bool = os.getenv("SEONGSU_MODE", "false").lower() == "true"
    SEONGSU_BOUNDARY_FILE: str = "data/seongsu-boundary.geojson"
    ENFORCE_BOUNDARY: bool = os.getenv("ENFORCE_BOUNDARY", "true").lower() == "true"
    DEFAULT_NEIGHBORHOOD: str = "Seongsu-dong"

    # Map defaults (centered on Seongsu-dong)
    DEFAULT_MAP_CENTER_LAT: float = 37.5420
    DEFAULT_MAP_CENTER_LON: float = 127.0490
    DEFAULT_MAP_ZOOM: int = 15

    def get_cors_origins(self) -> List[str]:
        """Get CORS origins based on environment"""
        if self.ENVIRONMENT == "production":
            return self.ALLOWED_ORIGINS
        return ["*"]  # Allow all in development

@lru_cache()
def get_settings():
    return Settings()
