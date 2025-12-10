from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api import routes, user_routes
from app.config import get_settings
from app.logging_config import setup_logging
import os

settings = get_settings()

# Setup logging
log_level = os.getenv("LOG_LEVEL", "INFO")
log_format = os.getenv("LOG_FORMAT", "text")
setup_logging(level=log_level, format_type=log_format)

app = FastAPI(
    title="Photo Archive API",
    description="Geographic photo archiving system with map-based organization",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS - configured based on environment
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.get_cors_origins(),
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
    allow_headers=["*"],
)

# Include routers
app.include_router(routes.router, prefix=settings.API_V1_PREFIX, tags=["photos"])
app.include_router(user_routes.router, prefix=settings.API_V1_PREFIX)

@app.get("/")
async def root():
    return {
        "message": "Photo Archive API",
        "docs": "/docs",
        "health": f"{settings.API_V1_PREFIX}/health"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
