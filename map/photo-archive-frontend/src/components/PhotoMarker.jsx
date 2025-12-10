import React from 'react';
import { Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { getPhotoImageUrl } from '../services/api';
import './PhotoMarker.css';

// Custom camera icon for photo markers
const cameraIcon = new L.divIcon({
  html: `<svg viewBox="0 0 24 24" fill="currentColor" class="photo-marker-icon">
    <path d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/>
    <circle cx="12" cy="13" r="3"/>
  </svg>`,
  className: 'photo-marker-container',
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32],
});

/**
 * PhotoMarker Component
 *
 * Displays a photo location marker on the map with popup
 *
 * @param {Object} photo - Photo data object
 * @param {boolean} isSelected - Whether this photo is currently selected
 * @param {Function} onSelect - Callback when marker is clicked
 * @param {Function} onDelete - Callback to delete photo
 * @param {Function} onLocationChange - Callback when location is updated
 * @param {boolean} draggable - Whether marker can be dragged
 */
const PhotoMarker = ({
  photo,
  isSelected = false,
  onSelect,
  onDelete,
  onLocationChange,
  draggable = false,
}) => {
  const position = [photo.location.latitude, photo.location.longitude];

  /**
   * Handle marker click
   */
  const handleClick = () => {
    if (onSelect) {
      onSelect(photo.id);
    }
  };

  /**
   * Handle marker drag end
   */
  const handleDragEnd = (event) => {
    const marker = event.target;
    const newPos = marker.getLatLng();
    if (onLocationChange) {
      onLocationChange(photo.id, newPos.lat, newPos.lng);
    }
  };

  /**
   * Handle delete button click
   */
  const handleDelete = (e) => {
    e.stopPropagation();
    if (window.confirm(`Delete "${photo.filename}"?`)) {
      if (onDelete) {
        onDelete(photo.id);
      }
    }
  };

  /**
   * Format date for display
   */
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Marker
      position={position}
      icon={cameraIcon}
      eventHandlers={{
        click: handleClick,
        dragend: handleDragEnd,
      }}
      draggable={draggable}
    >
      <Popup className="photo-marker-popup" maxWidth={300}>
        <div className="photo-popup">
          {/* Photo Preview */}
          <div className="photo-popup__image-container">
            <img
              src={getPhotoImageUrl(photo.id, true)}
              alt={photo.filename}
              className="photo-popup__image"
              loading="lazy"
            />
          </div>

          {/* Photo Info */}
          <div className="photo-popup__info">
            <h4 className="photo-popup__filename">{photo.filename}</h4>
            <p className="photo-popup__date">{formatDate(photo.upload_date)}</p>
            <div className="photo-popup__coordinates">
              <span className="photo-popup__coord">
                📍 {photo.location.latitude.toFixed(5)}, {photo.location.longitude.toFixed(5)}
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="photo-popup__actions">
            <a
              href={getPhotoImageUrl(photo.id, false)}
              target="_blank"
              rel="noopener noreferrer"
              className="photo-popup__button photo-popup__button--view"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="photo-popup__button-icon">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              View Full Size
            </a>
            <button
              onClick={handleDelete}
              className="photo-popup__button photo-popup__button--delete"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="photo-popup__button-icon">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Delete
            </button>
          </div>

          {/* Drag Hint */}
          {draggable && (
            <p className="photo-popup__hint">
              💡 Drag marker to move photo location
            </p>
          )}
        </div>
      </Popup>
    </Marker>
  );
};

export default PhotoMarker;
