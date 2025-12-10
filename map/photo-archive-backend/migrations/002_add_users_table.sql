-- Migration: Add users table and modify photos table for user organization
-- Version: 002
-- Date: 2025-10-29

-- ============================================================
-- STEP 1: Create users table
-- ============================================================

CREATE TABLE users (
    id VARCHAR(36) PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    display_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE,

    -- User avatar/profile
    avatar_path VARCHAR(512),

    -- Statistics (denormalized for performance)
    photo_count INTEGER DEFAULT 0,
    total_storage_bytes BIGINT DEFAULT 0,

    -- Metadata
    user_metadata JSONB,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_upload_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes for user queries
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_created_at ON users(created_at DESC);
CREATE INDEX idx_users_photo_count ON users(photo_count DESC);
CREATE INDEX idx_users_last_upload ON users(last_upload_at DESC);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_users_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at_trigger
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_users_updated_at();

-- ============================================================
-- STEP 2: Create default user for existing photos
-- ============================================================

INSERT INTO users (id, username, display_name, email)
VALUES (
    'default-user-000000000000',
    'anonymous',
    'Anonymous User',
    'anonymous@example.com'
);

-- ============================================================
-- STEP 3: Add user_id column to photos table
-- ============================================================

ALTER TABLE photos
ADD COLUMN user_id VARCHAR(36) REFERENCES users(id) ON DELETE CASCADE;

-- Set all existing photos to default user
UPDATE photos
SET user_id = 'default-user-000000000000'
WHERE user_id IS NULL;

-- Make user_id NOT NULL after setting defaults
ALTER TABLE photos
ALTER COLUMN user_id SET NOT NULL;

-- Create indexes for photo-user relationships
CREATE INDEX idx_photos_user_id ON photos(user_id);
CREATE INDEX idx_photos_user_upload ON photos(user_id, upload_date DESC);

-- ============================================================
-- STEP 4: Create triggers to update user statistics
-- ============================================================

CREATE OR REPLACE FUNCTION update_user_stats_on_photo_insert()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE users
    SET
        photo_count = photo_count + 1,
        total_storage_bytes = total_storage_bytes + NEW.file_size,
        last_upload_at = NEW.upload_date
    WHERE id = NEW.user_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_user_stats_on_photo_delete()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE users
    SET
        photo_count = GREATEST(photo_count - 1, 0),
        total_storage_bytes = GREATEST(total_storage_bytes - OLD.file_size, 0)
    WHERE id = OLD.user_id;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER photo_insert_update_user_stats
    AFTER INSERT ON photos
    FOR EACH ROW
    EXECUTE FUNCTION update_user_stats_on_photo_insert();

CREATE TRIGGER photo_delete_update_user_stats
    AFTER DELETE ON photos
    FOR EACH ROW
    EXECUTE FUNCTION update_user_stats_on_photo_delete();

-- ============================================================
-- STEP 5: Initialize statistics for default user
-- ============================================================

UPDATE users
SET
    photo_count = (SELECT COUNT(*) FROM photos WHERE user_id = 'default-user-000000000000'),
    total_storage_bytes = (SELECT COALESCE(SUM(file_size), 0) FROM photos WHERE user_id = 'default-user-000000000000'),
    last_upload_at = (SELECT MAX(upload_date) FROM photos WHERE user_id = 'default-user-000000000000')
WHERE id = 'default-user-000000000000';
