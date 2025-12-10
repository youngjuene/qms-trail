-- Photo Archive Database Schema
-- PostgreSQL with PostGIS extension

-- Create PostGIS extension if not exists
CREATE EXTENSION IF NOT EXISTS postgis;

-- Drop existing tables if they exist (for clean reinstall)
DROP TABLE IF EXISTS photos CASCADE;

-- Photos table: stores uploaded images with geographic location
CREATE TABLE photos (
    id VARCHAR(36) PRIMARY KEY,
    filename VARCHAR(255) NOT NULL,
    storage_path VARCHAR(512) NOT NULL,
    thumbnail_path VARCHAR(512),

    -- Geographic location
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    location GEOMETRY(POINT, 4326) NOT NULL,

    -- File information
    file_size INTEGER NOT NULL,
    mime_type VARCHAR(100) NOT NULL,

    -- Optional metadata (EXIF, tags, etc.)
    photo_metadata JSONB,

    -- Timestamps
    upload_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create spatial index on location for fast geographic queries
CREATE INDEX idx_photos_location ON photos USING GIST(location);

-- Create index on upload_date for chronological queries
CREATE INDEX idx_photos_upload_date ON photos(upload_date DESC);

-- Create index on created_at for sorting
CREATE INDEX idx_photos_created_at ON photos(created_at DESC);

-- Optional: Create function to update updated_at timestamp automatically
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_photos_updated_at
    BEFORE UPDATE ON photos
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Example queries:

-- Find photos within a bounding box
-- SELECT * FROM photos
-- WHERE ST_Contains(
--     ST_MakeEnvelope(west, south, east, north, 4326),
--     location
-- );

-- Find photos within radius of a point
-- SELECT *, ST_Distance(location, ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)) as distance
-- FROM photos
-- WHERE ST_DWithin(
--     location,
--     ST_SetSRID(ST_MakePoint(target_longitude, target_latitude), 4326)::geography,
--     radius_in_meters
-- )
-- ORDER BY distance;

-- Count photos in area
-- SELECT COUNT(*) FROM photos
-- WHERE ST_Contains(
--     ST_MakeEnvelope(west, south, east, north, 4326),
--     location
-- );
