# Photo Archive

Geo-spatial photo management system with interactive map interface.

## Prerequisites

- PostgreSQL 15+ with PostGIS extension
- Python 3.11+
- Node.js 18+

## Quick Start

### 1. Database Setup

```bash
# Create database
createdb photo_archive

# Enable PostGIS
psql photo_archive -c "CREATE EXTENSION IF NOT EXISTS postgis;"

# Initialize schema
psql photo_archive < photo-archive-backend/schema.sql
```

### 2. Backend Setup

```bash
cd photo-archive-backend

# Create virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env and set DATABASE_URL=postgresql://username:password@localhost:5432/photo_archive

# Run backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Backend runs at: http://localhost:8000

### 3. Frontend Setup

```bash
cd photo-archive-frontend

# Install dependencies
npm install

# Run frontend
npm run dev
```

Frontend runs at: http://localhost:3000

## Features

- 📸 Photo upload with automatic EXIF extraction
- 🗺️ Interactive map with directional field-of-view visualization
- 👤 Multi-user support with user galleries
- 🔍 Spatial search and filtering
- 📊 Photo statistics and analytics

## Project Structure

```
├── photo-archive-backend/   # FastAPI backend with PostGIS
│   ├── app/
│   │   ├── api/            # API routes and schemas
│   │   ├── models/         # Database models
│   │   └── main.py         # Application entry point
│   └── schema.sql          # Database schema
│
├── photo-archive-frontend/  # React + Vite frontend
│   └── src/
│       ├── components/     # React components
│       ├── services/       # API client
│       └── utils/          # EXIF extraction, FOV geometry
│
└── docs/                   # Documentation
    ├── design/            # Architecture specs
    ├── guides/            # Integration guides
    └── implementation/    # Implementation logs
```

## API Documentation

Visit http://localhost:8000/docs for interactive API documentation (Swagger UI).

## Development

```bash
# Backend tests
cd photo-archive-backend
pytest

# Frontend tests
cd photo-archive-frontend
npm test
```

## License

See LICENSE file for details.
