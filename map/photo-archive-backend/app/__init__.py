"""
Route Similarity Backend Application

This package contains the FastAPI-based backend for the Route Similarity Matching System.
It provides RESTful APIs for finding geometrically similar street routes using DTW matching.

Main modules:
- models: Database models and route data structures
- processors: Route geometry processing and signature extraction
- matchers: DTW-based similarity matching algorithms
- api: REST API endpoints and request/response schemas
"""

__version__ = "1.0.0"
__author__ = "Route Similarity Team"

# Package-level exports
from app.config import get_settings

__all__ = ["get_settings"]
