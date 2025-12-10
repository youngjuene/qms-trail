# Map-Based Photo Archiving Web Application - System Design

## Overview

A simplified map-based photo archiving system that allows users to upload images and associate them with geographic locations by clicking on an interactive map. The system includes a minimap visualization to show the distribution of archived photos.

**Design Date**: 2025-10-29
**Based On**: Existing route-similarity-frontend map rendering and MiniMap components

---

## Core Requirements

### Minimal Functionality (MVP)
1. **Image Upload Interface**: Allow users to upload photos from their device
2. **Location Placement**: Click on map to set the geographic location for uploaded photos
3. **Map Rendering System**: Interactive map display using Leaflet.js (retained from existing system)
4. **MiniMap Visualization**: Bird's-eye view showing spatial distribution of archived photos
5. **Photo Archive Display**: Show photos associated with their map locations

### Explicitly Excluded Features (Clean Sheet Approach)
- ❌ Route drawing functionality
- ❌ Route similarity search
- ❌ Navigation/routing features
- ❌ DTW matching algorithms
- ❌ Complex search parameters and filtering

---

## System Architecture

### Technology Stack

#### Frontend
- **React 18**: UI framework (retained from existing system)
- **Leaflet.js**: Interactive map rendering (retained from existing system)
- **Vite**: Build tool (retained from existing system)
- **Axios**: HTTP client for API communication

#### Backend
- **Python 3.11+**: Backend runtime
- **FastAPI**: Modern web framework
- **PostgreSQL + PostGIS**: Spatial database for photo locations
- **SQLAlchemy + GeoAlchemy2**: ORM with geospatial support

#### Storage
- **File System or S3-compatible storage**: For photo file storage
- **Database**: Photo metadata and location data

---

## Component Architecture

### Frontend Components

```
src/
├── App.jsx                      # Main application container
├── App.css                      # Global styles (reuse existing theme)
├── components/
│   ├── MapView.jsx              # Main interactive map component
│   ├── PhotoUpload.jsx          # Photo upload interface (NEW)
│   ├── PhotoMarker.jsx          # Map marker for photos (NEW)
│   ├── PhotoGallery.jsx         # Photo display sidebar (NEW)
│   ├── MiniMap.jsx              # Adapted from existing MiniMap
│   └── Notification.jsx         # User feedback (retained)
├── services/
│   └── api.js                   # API client for backend communication
└── utils/
    └── mapHelpers.js            # Map projection and coordinate utilities
```

### Backend API Structure

```
app/
├── main.py                      # FastAPI application entry point
├── config.py                    # Configuration management
├── models/
│   ├── photo.py                 # Photo model (metadata + location)
│   └── database.py              # Database connection
├── api/
│   ├── photos.py                # Photo CRUD endpoints
│   └── schemas.py               # Pydantic schemas for API
└── storage/
    └── file_handler.py          # File upload/storage logic
```

---

## Data Models

### Photo Model

```python
class Photo:
    id: UUID                     # Unique identifier
    filename: str                # Original filename
    storage_path: str            # Path to stored file
    latitude: float              # Geographic latitude
    longitude: float             # Geographic longitude
    location: Point              # PostGIS geometry point
    upload_date: datetime        # When photo was uploaded
    file_size: int               # File size in bytes
    mime_type: str               # Image MIME type
    thumbnail_path: str          # Path to thumbnail (optional)
    metadata: JSON               # EXIF data (optional)
```

### Database Schema

```sql
CREATE TABLE photos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    filename VARCHAR(255) NOT NULL,
    storage_path VARCHAR(512) NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    location GEOMETRY(POINT, 4326) NOT NULL,
    upload_date TIMESTAMP NOT NULL DEFAULT NOW(),
    file_size INTEGER NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    thumbnail_path VARCHAR(512),
    metadata JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_photos_location ON photos USING GIST(location);
CREATE INDEX idx_photos_upload_date ON photos(upload_date DESC);
```

---

## API Design

### Endpoints

#### 1. Upload Photo
```http
POST /api/v1/photos/upload
Content-Type: multipart/form-data

Request:
- file: <image file>
- latitude: float
- longitude: float
- metadata: JSON (optional)

Response:
{
  "id": "uuid",
  "filename": "photo.jpg",
  "location": {
    "latitude": 37.5420,
    "longitude": 127.0490
  },
  "upload_date": "2025-10-29T12:00:00Z",
  "thumbnail_url": "/api/v1/photos/{id}/thumbnail"
}
```

#### 2. Get All Photos
```http
GET /api/v1/photos

Query Parameters:
- bounds: "north,south,east,west" (optional, filter by map bounds)
- limit: int (default: 100)
- offset: int (default: 0)

Response:
{
  "photos": [
    {
      "id": "uuid",
      "filename": "photo.jpg",
      "location": {"latitude": 37.5420, "longitude": 127.0490},
      "upload_date": "2025-10-29T12:00:00Z",
      "thumbnail_url": "/api/v1/photos/{id}/thumbnail"
    }
  ],
  "total": 42,
  "limit": 100,
  "offset": 0
}
```

#### 3. Get Photo by ID
```http
GET /api/v1/photos/{photo_id}

Response:
{
  "id": "uuid",
  "filename": "photo.jpg",
  "location": {"latitude": 37.5420, "longitude": 127.0490},
  "upload_date": "2025-10-29T12:00:00Z",
  "file_size": 2048576,
  "mime_type": "image/jpeg",
  "image_url": "/api/v1/photos/{id}/image",
  "thumbnail_url": "/api/v1/photos/{id}/thumbnail",
  "metadata": {}
}
```

#### 4. Get Photo Image
```http
GET /api/v1/photos/{photo_id}/image
Response: Binary image data

GET /api/v1/photos/{photo_id}/thumbnail
Response: Binary thumbnail image data
```

#### 5. Delete Photo
```http
DELETE /api/v1/photos/{photo_id}

Response:
{
  "success": true,
  "message": "Photo deleted successfully"
}
```

#### 6. Update Photo Location
```http
PATCH /api/v1/photos/{photo_id}/location

Request:
{
  "latitude": 37.5430,
  "longitude": 127.0500
}

Response:
{
  "id": "uuid",
  "location": {"latitude": 37.5430, "longitude": 127.0500}
}
```

---

## User Workflows

### 1. Upload and Place Photo

```
User Action Flow:
1. Click "Upload Photo" button
2. Select image file from device
3. Photo preview appears in upload panel
4. Click on map to set location
5. Confirm upload
6. Photo marker appears on map
7. Photo appears in gallery sidebar

Technical Flow:
1. User selects file → File validation (size, type)
2. User clicks map → Capture lat/lng coordinates
3. POST /api/v1/photos/upload with file + coordinates
4. Backend: Store file, create thumbnail, save metadata
5. Frontend: Receive photo data, display marker and gallery entry
```

### 2. View Photo Distribution

```
User Action Flow:
1. Look at MiniMap overlay
2. See all photo locations as dots/clusters
3. Zoom to specific area of interest
4. Click photo marker to view photo

Technical Flow:
1. GET /api/v1/photos with current map bounds
2. MiniMap component renders photo locations
3. Main map shows detailed photo markers
4. Click marker → Show photo preview popup
```

### 3. Manage Photos

```
User Action Flow:
1. Click photo marker on map
2. View photo details in popup
3. Options: View full size, Move location, Delete
4. Drag marker to update location (optional)
5. Confirm changes

Technical Flow:
1. Click marker → Fetch photo details
2. Move location → PATCH /api/v1/photos/{id}/location
3. Delete → DELETE /api/v1/photos/{id}
4. Update gallery and minimap display
```

---

## UI/UX Design

### Layout Structure

```
┌────────────────────────────────────────────────────┐
│  Header: "Photo Archive Map"                      │
├──────────┬─────────────────────────────────────────┤
│          │                                         │
│  Photo   │         Interactive Map                 │
│  Gallery │     (Leaflet + Photo Markers)           │
│  Sidebar │                                         │
│          │                                         │
│  Upload  │         ┌──────────┐                    │
│  Button  │         │ MiniMap  │                    │
│          │         │ Overlay  │                    │
│  Photos  │         └──────────┘                    │
│  List    │                                         │
│          │                                         │
└──────────┴─────────────────────────────────────────┘
```

### Sidebar Components

**Upload Section**
- Large "Upload Photo" button
- File input (drag-and-drop support)
- Upload progress indicator
- Instructions: "Click map to set location"

**Gallery Section**
- Scrollable list of uploaded photos
- Each entry shows:
  - Thumbnail
  - Filename
  - Upload date
  - Location coordinates
- Click to center map on photo location

### Map Interactions

**Photo Markers**
- Custom icon: Camera/photo symbol
- Cluster markers when zoomed out (multiple photos close together)
- Click marker → Photo popup with:
  - Photo preview
  - Filename and date
  - "View Full Size" button
  - "Move Location" button
  - "Delete" button

**Upload Mode**
- After selecting photo file, map shows cursor as crosshair
- Click map → Place marker at that location
- Confirm dialog: "Place photo here?"

### MiniMap Adaptation

**From Route MiniMap → Photo MiniMap**

Changes needed:
- Instead of drawing route lines, show photo marker dots
- Color coding:
  - Recent photos (< 7 days): Volt/Pink (#EC4899)
  - Older photos: Indigo (#5E6AD2)
- Density visualization: Cluster overlapping markers
- Viewport indicator: Show current visible map area

Retained features:
- Canvas rendering for performance
- Hover to expand
- Viewport rectangle overlay
- Theme color consistency

---

## Reusable Components from Existing System

### 1. Map Rendering System ✅
- **Leaflet.js integration**: Keep as-is
- **MapContainer configuration**: Reuse setup
- **Tile layer**: Retain OpenStreetMap tiles
- **Theme styling**: Keep Linear "Indigo & Volt" theme

### 2. MiniMap Component ✅
- **Canvas rendering logic**: Adapt for point markers instead of routes
- **Projection functions**: Reuse `projectToCanvas`
- **Bounds calculation**: Adapt for photo coordinates
- **Hover interactions**: Keep behavior

### 3. UI Design System ✅
- **CSS variables**: Retain entire design system
- **Color scheme**: Keep Indigo & Volt theme
- **Component styling**: Reuse buttons, panels, cards
- **Notification system**: Keep existing component

### 4. API Client Structure ✅
- **Axios setup**: Reuse HTTP client configuration
- **Error handling**: Keep existing patterns

---

## Implementation Phases

### Phase 1: Core Upload & Display (MVP)
- [ ] Setup project structure (clean frontend + backend)
- [ ] Implement photo upload API endpoint
- [ ] Create PhotoUpload component
- [ ] Implement basic photo marker display on map
- [ ] Setup database schema and storage

### Phase 2: Location Management
- [ ] Click-to-place location functionality
- [ ] Photo marker clustering on map
- [ ] Update photo location API
- [ ] Delete photo functionality

### Phase 3: Gallery & Organization
- [ ] Photo gallery sidebar
- [ ] Filter photos by map bounds
- [ ] Search/filter by date
- [ ] Photo metadata display

### Phase 4: MiniMap Integration
- [ ] Adapt MiniMap for photo markers
- [ ] Density visualization
- [ ] Interactive navigation from minimap

### Phase 5: Polish & Optimization
- [ ] Thumbnail generation
- [ ] Image optimization
- [ ] Loading states and error handling
- [ ] Responsive design
- [ ] Performance optimization

---

## File Storage Strategy

### Option 1: Local File System (Simple)
```
storage/
├── photos/
│   ├── 2025/
│   │   ├── 10/
│   │   │   ├── {uuid}.jpg
│   │   │   └── {uuid}.jpg
│   └── thumbnails/
│       └── {uuid}_thumb.jpg
```

### Option 2: S3-Compatible Storage (Scalable)
```
Bucket: photo-archive
Structure:
- photos/{year}/{month}/{uuid}.{ext}
- thumbnails/{uuid}_thumb.jpg
```

### Recommendation
Start with **Option 1** (local file system) for MVP simplicity. Add S3 support in Phase 5 if needed for scalability.

---

## Security Considerations

1. **File Upload Validation**
   - Limit file size (e.g., 10MB max)
   - Validate MIME types (image/jpeg, image/png, image/webp)
   - Scan for malware (future enhancement)

2. **Location Data**
   - Validate latitude: -90 to 90
   - Validate longitude: -180 to 180
   - Prevent SQL injection via parameterized queries

3. **Access Control**
   - Add authentication in future phase
   - For MVP: Public read, authenticated upload/delete

---

## Performance Optimization

1. **Image Processing**
   - Generate thumbnails on upload (200x200px)
   - Compress full-size images if needed
   - Lazy load images in gallery

2. **Map Rendering**
   - Use marker clustering for dense areas
   - Fetch photos by visible map bounds only
   - Canvas rendering for minimap (already implemented)

3. **Database**
   - Spatial index on location column
   - Index on upload_date for chronological queries
   - Pagination for large photo collections

---

## Development Environment Setup

### Prerequisites
- Node.js 18+
- Python 3.11+
- PostgreSQL 13+ with PostGIS extension

### Quick Start

```bash
# Clone repository
git clone <repo-url>
cd qms-trail

# Backend setup
cd photo-archive-backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Create database
createdb photo_archive
psql -d photo_archive -c "CREATE EXTENSION postgis;"

# Frontend setup
cd photo-archive-frontend
npm install

# Start development servers
# Terminal 1: Backend
uvicorn app.main:app --reload --port 8000

# Terminal 2: Frontend
npm run dev
```

---

## Testing Strategy

### Unit Tests
- File upload validation
- Coordinate validation
- Storage operations
- API endpoint responses

### Integration Tests
- Upload workflow end-to-end
- Location update workflow
- Photo deletion workflow
- Gallery loading with filters

### Manual Testing Checklist
- [ ] Upload various image formats (JPEG, PNG, WEBP)
- [ ] Place photo at different map locations
- [ ] Move photo location by dragging marker
- [ ] Delete photo and verify removal
- [ ] Test minimap visualization accuracy
- [ ] Test on mobile viewport

---

## Future Enhancements (Post-MVP)

1. **Photo Organization**
   - Tags and categories
   - Albums/collections
   - Batch operations

2. **Advanced Features**
   - Photo timeline view
   - Heatmap visualization
   - EXIF data extraction and display
   - Geolocation from photo metadata

3. **Social Features**
   - User accounts
   - Sharing photos/albums
   - Comments and annotations

4. **Search & Discovery**
   - Full-text search
   - Filter by date range
   - Nearby photo suggestions

---

## Design Decisions & Rationale

### Why Remove Navigation Features?
- **Focus**: Core use case is photo archiving, not navigation
- **Complexity**: Routing algorithms add unnecessary complexity
- **Performance**: Simpler system = faster performance

### Why Keep MiniMap?
- **Context**: Provides spatial overview of photo distribution
- **Usability**: Quick navigation to photo clusters
- **Proven**: Already implemented and working well

### Why Leaflet Over Google Maps?
- **Consistency**: Already in use, team familiar
- **Cost**: Free and open source
- **Flexibility**: Easy customization

### Why FastAPI Backend?
- **Performance**: Async support for file uploads
- **Documentation**: Auto-generated API docs
- **Typing**: Type safety with Pydantic
- **Consistency**: Matches existing backend patterns

---

## Appendix: Component API Reference

### PhotoUpload Component Props

```typescript
interface PhotoUploadProps {
  onUploadStart: () => void;
  onUploadComplete: (photo: Photo) => void;
  onUploadError: (error: Error) => void;
  maxFileSize?: number;          // Default: 10MB
  acceptedFormats?: string[];    // Default: ['image/jpeg', 'image/png', 'image/webp']
}
```

### PhotoMarker Component Props

```typescript
interface PhotoMarkerProps {
  photo: Photo;
  isSelected: boolean;
  onSelect: (photoId: string) => void;
  onLocationChange: (photoId: string, lat: number, lng: number) => void;
  onDelete: (photoId: string) => void;
}
```

### MiniMap Component Props (Adapted)

```typescript
interface MiniMapProps {
  photos: Photo[];              // Changed from routes
  selectedPhoto?: Photo;        // Changed from selectedResult
  mapBounds: Bounds;
  onPhotoClick?: (photoId: string) => void;
}
```

---

## Questions for User

Before implementation, please confirm:

1. **Storage preference**: Local file system or S3-compatible storage?
2. **Authentication**: Should we add user accounts in MVP or later?
3. **Map boundaries**: Any specific geographic area to focus on? (Default: keep existing Seongsu bounds)
4. **Photo formats**: JPEG, PNG, WEBP only, or include others?
5. **Gallery sorting**: Default sort by upload date (newest first)?

---

**End of Design Document**
