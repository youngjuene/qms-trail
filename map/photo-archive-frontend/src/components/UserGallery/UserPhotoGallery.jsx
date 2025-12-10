import React, { useState, useEffect } from 'react';
import { listUserPhotos, getUser } from '../../services/api';
import PhotoThumbnailGrid from './PhotoThumbnailGrid';
import LoadingSpinner from '../LoadingSpinner';
import './UserPhotoGallery.css';

/**
 * UserPhotoGallery Component
 * Displays all photos for a specific user in a grid
 *
 * @param {Object} props
 * @param {string} props.userId - User ID
 * @param {Object} props.user - User data (optional, will fetch if not provided)
 * @param {Function} props.onBack - Callback for back button
 * @param {Function} props.onPhotoClick - Callback when photo is clicked
 * @param {Function} props.onViewMap - Callback to view photos on map
 */
function UserPhotoGallery({ userId, user: initialUser, onBack, onPhotoClick, onViewMap }) {
  const [user, setUser] = useState(initialUser);
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('grid');
  const [error, setError] = useState(null);

  useEffect(() => {
    loadUserAndPhotos();
  }, [userId]);

  const loadUserAndPhotos = async () => {
    setLoading(true);
    setError(null);

    try {
      // Load user data if not provided
      if (!user) {
        const userData = await getUser(userId);
        setUser(userData);
      }

      // Load user's photos
      const response = await listUserPhotos(userId, { limit: 500 });
      setPhotos(response.photos || []);
    } catch (error) {
      console.error('Error loading user gallery:', error);
      setError('Failed to load user gallery');
    } finally {
      setLoading(false);
    }
  };

  const handleViewMapClick = () => {
    if (onViewMap) {
      onViewMap(user, photos);
    }
  };

  if (loading) {
    return (
      <div className="user-photo-gallery">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="user-photo-gallery">
        <div className="error-state">
          <p>{error}</p>
          <button onClick={onBack} className="back-button">
            ← Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="user-photo-gallery">
      <div className="gallery-header">
        <button onClick={onBack} className="back-button">
          ← Back to Archive
        </button>

        <div className="user-info">
          <div className="user-avatar-small">
            {user?.avatar_url ? (
              <img src={user.avatar_url} alt={user.display_name} />
            ) : (
              <div className="user-avatar-fallback-small">
                {user?.display_name?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)}
              </div>
            )}
          </div>
          <div>
            <h1>{user?.display_name}'s Photos</h1>
            <p className="user-username">@{user?.username}</p>
          </div>
        </div>

        <div className="gallery-controls">
          <div className="view-toggle">
            <button
              className={`toggle-button ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => setViewMode('grid')}
              title="Grid view"
            >
              ⊞ Grid
            </button>
            <button
              className={`toggle-button ${viewMode === 'map' ? 'active' : ''}`}
              onClick={handleViewMapClick}
              title="Map view"
            >
              🗺 Map
            </button>
          </div>

          <div className="photo-count">
            {photos.length} {photos.length === 1 ? 'photo' : 'photos'}
          </div>
        </div>
      </div>

      {photos.length === 0 ? (
        <div className="no-photos">
          <div className="no-photos-icon">📷</div>
          <p>No photos yet</p>
          <p className="no-photos-subtitle">
            This user hasn't uploaded any photos
          </p>
        </div>
      ) : (
        <PhotoThumbnailGrid
          photos={photos}
          onPhotoClick={onPhotoClick}
        />
      )}
    </div>
  );
}

export default UserPhotoGallery;
