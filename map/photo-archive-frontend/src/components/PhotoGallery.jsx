import React, { useRef, useEffect } from 'react';
import { getPhotoImageUrl } from '../services/api';
import './PhotoGallery.css';

/**
 * PhotoGallery Component
 *
 * Displays a scrollable list of photos with thumbnails
 *
 * @param {Array} photos - Array of photo objects
 * @param {string} selectedPhotoId - ID of currently selected photo
 * @param {Function} onPhotoClick - Callback when photo is clicked
 * @param {Function} onPhotoDelete - Callback to delete photo
 * @param {boolean} loading - Whether photos are loading
 */
const PhotoGallery = ({
  photos = [],
  selectedPhotoId = null,
  onPhotoClick,
  onPhotoDelete,
  loading = false,
}) => {
  const selectedRef = useRef(null);

  /**
   * Scroll to selected photo
   */
  useEffect(() => {
    if (selectedRef.current) {
      selectedRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    }
  }, [selectedPhotoId]);

  /**
   * Format date for display
   */
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    });
  };

  /**
   * Handle photo click
   */
  const handlePhotoClick = (photoId) => {
    if (onPhotoClick) {
      onPhotoClick(photoId);
    }
  };

  /**
   * Handle delete click
   */
  const handleDeleteClick = (e, photoId, filename) => {
    e.stopPropagation();
    if (window.confirm(`Delete "${filename}"?`)) {
      if (onPhotoDelete) {
        onPhotoDelete(photoId);
      }
    }
  };

  return (
    <div className="photo-gallery">
      <div className="photo-gallery__header">
        <h3 className="photo-gallery__title">Photo Archive</h3>
        <span className="photo-gallery__count">
          {photos.length} {photos.length === 1 ? 'photo' : 'photos'}
        </span>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="photo-gallery__loading">
          <div className="photo-gallery__spinner"></div>
          <p className="photo-gallery__loading-text">Loading photos...</p>
        </div>
      )}

      {/* Empty State */}
      {!loading && photos.length === 0 && (
        <div className="photo-gallery__empty">
          <svg
            className="photo-gallery__empty-icon"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          <p className="photo-gallery__empty-text">No photos yet</p>
          <p className="photo-gallery__empty-hint">Upload a photo to get started</p>
        </div>
      )}

      {/* Photo List */}
      {!loading && photos.length > 0 && (
        <div className="photo-gallery__list">
          {photos.map((photo) => {
            const isSelected = photo.id === selectedPhotoId;
            return (
              <div
                key={photo.id}
                ref={isSelected ? selectedRef : null}
                className={`photo-gallery__item ${isSelected ? 'photo-gallery__item--selected' : ''}`}
                onClick={() => handlePhotoClick(photo.id)}
              >
                {/* Thumbnail */}
                <div className="photo-gallery__thumbnail">
                  <img
                    src={getPhotoImageUrl(photo.id, true)}
                    alt={photo.filename}
                    className="photo-gallery__thumbnail-image"
                    loading="lazy"
                  />
                </div>

                {/* Info */}
                <div className="photo-gallery__info">
                  <h4 className="photo-gallery__filename">{photo.filename}</h4>
                  <p className="photo-gallery__date">{formatDate(photo.upload_date)}</p>
                  <p className="photo-gallery__coordinates">
                    {photo.location.latitude.toFixed(4)}, {photo.location.longitude.toFixed(4)}
                  </p>
                </div>

                {/* Delete Button */}
                <button
                  className="photo-gallery__delete"
                  onClick={(e) => handleDeleteClick(e, photo.id, photo.filename)}
                  aria-label="Delete photo"
                >
                  <svg
                    className="photo-gallery__delete-icon"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                </button>

                {/* Selected Indicator */}
                {isSelected && (
                  <div className="photo-gallery__selected-indicator"></div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default PhotoGallery;
