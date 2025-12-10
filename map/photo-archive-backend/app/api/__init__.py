"""
REST API Module

This package contains the FastAPI REST API:
- routes.py: API endpoint handlers
- schemas.py: Pydantic request/response schemas
"""

from app.api import routes, schemas

__all__ = ["routes", "schemas"]
