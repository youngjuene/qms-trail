import React from 'react';
import { getPhotoImageUrl } from '../../services/api';
import './UserPhotoGallery.css';

/**
 * PhotoThumbnailGrid Component
 * Displays photos in a responsive grid layout
 *
 * @param {Object} props
 * @param {Array} props.photos - Array of photo objects
 * @param {Function} props.onPhotoClick - Callback when photo is clicked
 */
function PhotoThumbnailGrid({ photos, onPhotoClick }) {
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${Math.round(bytes / Math.pow(k, i) * 10) / 10} ${sizes[i]}`;
  };

  return (
    <div className="photo-thumbnail-grid">
      {photos.map((photo) => (
        <div
          key={photo.id}
          className="photo-thumbnail-card"
          onClick={() => onPhotoClick && onPhotoClick(photo)}
        >
          <div className="photo-thumbnail-image">
            <img
              src={photo.thumbnail_url || photo.image_url}
              alt={photo.filename}
              loading="lazy"
            />
            <div className="photo-thumbnail-overlay">
              <span className="photo-thumbnail-icon">🔍</span>
            </div>
          </div>
          <div className="photo-thumbnail-info">
            <div className="photo-thumbnail-filename" title={photo.filename}>
              {photo.filename}
            </div>
            <div className="photo-thumbnail-meta">
              <span className="photo-thumbnail-date">
                📅 {formatDate(photo.upload_date)}
              </span>
              <span className="photo-thumbnail-size">
                💾 {formatFileSize(photo.file_size)}
              </span>
            </div>
            <div className="photo-thumbnail-location">
              📍 {photo.location.latitude.toFixed(5)}, {photo.location.longitude.toFixed(5)}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default PhotoThumbnailGrid;
