import React, { useState, useEffect, useRef } from 'react';
import { Marker, Popup, Polygon, useMap } from 'react-leaflet';
import L from 'leaflet';
import {
  calculateFOVCone,
  getDefaultFOVParameters,
  normalizeDirection,
} from '../utils/fovGeometry';
import { getPhotoImageUrl } from '../services/api';
import VideoPlayer from './VideoPlayer';
import './DirectionalPhotoMarker.css';

/**
 * DirectionalPhotoMarker Component
 *
 * Photo marker with directional indicator and Field-of-View (FOV) cone
 * Used in GIS and photogrammetry to show camera direction and capture extent
 *
 * @param {Object} photo - Photo data with location and metadata
 * @param {boolean} isSelected - Whether this marker is currently selected
 * @param {Function} onSelect - Callback when marker is clicked
 * @param {Function} onDelete - Callback to delete photo
 * @param {Function} onDirectionChange - Callback when direction is updated
 * @param {boolean} showFOV - Whether to display the FOV cone
 * @param {boolean} draggable - Whether marker position can be dragged
 */
const DirectionalPhotoMarker = ({
  photo,
  isSelected = false,
  isPreview = false,
  onSelect,
  onDelete,
  onDirectionChange,
  onLocationChange,
  showFOV = true,
  draggable = true,
}) => {
  const map = useMap();
  const markerRef = useRef(null);

  // Direction state (from metadata or default to North)
  const [direction, setDirection] = useState(
    photo.metadata?.direction?.degrees || 0
  );

  // FOV parameters based on camera metadata
  const [fovParams, setFovParams] = useState(() =>
    getDefaultFOVParameters(photo.metadata?.camera || {})
  );

  // Rotating state for interaction feedback
  const [isRotating, setIsRotating] = useState(false);

  // Track spacebar key state for rotation mode
  const [isSpacebarPressed, setIsSpacebarPressed] = useState(false);

  // Track initial mouse position for rotation calculation
  const [rotationStartY, setRotationStartY] = useState(null);
  const [rotationStartDirection, setRotationStartDirection] = useState(null);

  // Update direction if photo metadata changes
  useEffect(() => {
    if (photo.metadata?.direction?.degrees !== undefined) {
      setDirection(photo.metadata.direction.degrees);
    }
  }, [photo.metadata?.direction?.degrees]);

  // Listen for spacebar press/release for rotation mode
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.code === 'Space' || e.key === ' ') {
        e.preventDefault(); // Prevent page scroll
        setIsSpacebarPressed(true);
      }
    };

    const handleKeyUp = (e) => {
      if (e.code === 'Space' || e.key === ' ') {
        setIsSpacebarPressed(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Calculate FOV cone vertices
  const fovVertices = showFOV
    ? calculateFOVCone(
        photo.location.latitude,
        photo.location.longitude,
        direction,
        fovParams.fovAngle,
        fovParams.distance
      )
    : [];

  /**
   * Create directional camera icon with rotation
   */
  const createDirectionalIcon = (rotationDegrees, selected, preview) => {
    const iconColor = preview ? '#F59E0B' : (selected ? '#EC4899' : '#5E6AD2'); // Orange for preview, pink for selected, indigo for normal
    const size = preview ? 38 : (selected ? 36 : 32);

    return new L.divIcon({
      html: `
        <div class="directional-marker-container ${selected ? 'selected' : ''} ${preview ? 'preview' : ''}" style="transform: rotate(${rotationDegrees}deg);">
          <svg viewBox="0 0 24 24" fill="${iconColor}" class="directional-camera-icon">
            <path d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/>
            <circle cx="12" cy="13" r="3"/>
          </svg>
          <!-- Direction arrow indicator -->
          <div class="direction-arrow" style="border-top-color: ${iconColor};"></div>
        </div>
      `,
      className: 'directional-marker-wrapper',
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2],
      popupAnchor: [0, -size / 2],
    });
  };

  /**
   * Handle marker click - select photo
   */
  const handleMarkerClick = () => {
    if (onSelect) {
      onSelect(photo.id);
    }
  };

  /**
   * Handle marker drag - update position
   */
  const handleDragEnd = (e) => {
    const marker = e.target;
    const position = marker.getLatLng();

    // Call parent's location change handler if provided
    if (onLocationChange) {
      onLocationChange(photo.id, position.lat, position.lng);
    }
  };

  /**
   * Handle drag start - detect if rotation mode (Spacebar)
   */
  const handleDragStart = (e) => {
    if (isSpacebarPressed) {
      setIsRotating(true);
      // Store initial mouse Y position and current direction for relative rotation
      const point = map.latLngToContainerPoint(e.target.getLatLng());
      setRotationStartY(point.y);
      setRotationStartDirection(direction);
    } else {
      setIsRotating(false);
      setRotationStartY(null);
      setRotationStartDirection(null);
    }
  };

  /**
   * Handle direction rotation via Spacebar+Drag
   * Uses vertical mouse movement to rotate 360° smoothly
   */
  const handleMarkerDrag = (e) => {
    // Check if Spacebar is currently pressed OR if we started rotation mode
    const shouldRotate = isSpacebarPressed || isRotating;

    if (!shouldRotate || rotationStartY === null || rotationStartDirection === null) return;

    const marker = markerRef.current;
    if (!marker) return;

    // Get the original marker position (don't let it move during rotation)
    const markerPos = L.latLng(photo.location.latitude, photo.location.longitude);

    // Calculate vertical mouse movement
    const currentMousePoint = map.latLngToContainerPoint(e.latlng);
    const deltaY = rotationStartY - currentMousePoint.y; // Inverted: dragging up = positive

    // Convert vertical movement to rotation angle
    // 200 pixels of vertical movement = 360° rotation (adjustable sensitivity)
    const pixelsPerFullRotation = 200;
    const rotationDelta = (deltaY / pixelsPerFullRotation) * 360;

    // Calculate new direction based on initial direction + delta
    const newDirection = rotationStartDirection + rotationDelta;
    const normalizedAngle = normalizeDirection(newDirection);

    // Update direction and snap marker back to original position
    setDirection(normalizedAngle);
    e.target.setLatLng(markerPos);
  };

  /**
   * Save direction change when rotation ends
   */
  const handleMarkerDragEnd = (e) => {
    if (isRotating) {
      // Ensure marker is at original position after rotation
      const originalPos = L.latLng(photo.location.latitude, photo.location.longitude);
      e.target.setLatLng(originalPos);

      // Save direction change
      if (onDirectionChange) {
        onDirectionChange(photo.id, direction);
      }

      // Reset rotation state
      setIsRotating(false);
      setRotationStartY(null);
      setRotationStartDirection(null);
    } else {
      // Normal position drag - update location
      handleDragEnd(e);
    }
  };

  /**
   * FOV polygon styling
   */
  const fovStyle = {
    color: isPreview ? '#F59E0B' : (isSelected ? '#EC4899' : '#5E6AD2'),
    fillColor: isPreview ? '#F59E0B' : (isSelected ? '#EC4899' : '#5E6AD2'),
    fillOpacity: isPreview ? 0.2 : 0.15,
    weight: isPreview ? 3 : 2,
    opacity: isPreview ? 0.8 : 0.6,
    dashArray: isPreview ? '10, 5' : '5, 5',
  };

  /**
   * Format photo metadata for popup
   */
  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <>
      {/* FOV Cone Polygon */}
      {showFOV && fovVertices.length > 0 && (
        <Polygon
          positions={fovVertices}
          pathOptions={fovStyle}
          eventHandlers={{
            click: handleMarkerClick,
          }}
        />
      )}

      {/* Directional Camera Marker */}
      <Marker
        ref={markerRef}
        position={[photo.location.latitude, photo.location.longitude]}
        icon={createDirectionalIcon(direction, isSelected)}
        draggable={draggable}
        eventHandlers={{
          click: handleMarkerClick,
          dragstart: handleDragStart,
          drag: handleMarkerDrag,
          dragend: handleMarkerDragEnd,
        }}
      >
        <Popup className="photo-popup">
          <div className="photo-popup__content">
            {/* Media Thumbnail - Image or Video */}
            {photo.metadata?.isVideo ? (
              <VideoPlayer
                src={getPhotoImageUrl(photo.id, false)}
                poster={getPhotoImageUrl(photo.id, true)}
                className="photo-popup__video"
                controls={true}
                muted={true}
              />
            ) : (
              <img
                src={getPhotoImageUrl(photo.id, true)}
                alt={photo.filename || 'Photo'}
                className="photo-popup__image"
              />
            )}

            {/* Photo Info */}
            <div className="photo-popup__info">
              <h3 className="photo-popup__filename">
                {photo.filename || 'Untitled'}
              </h3>

              {/* User ID */}
              {photo.user_id && (
                <p className="photo-popup__user">
                  👤 User: {photo.user_id}
                </p>
              )}

              {/* Upload Date */}
              <p className="photo-popup__date">
                📅 {formatDate(photo.upload_date)}
              </p>

              {/* GPS Coordinates */}
              <p className="photo-popup__coordinates">
                📍 {photo.location.latitude.toFixed(5)},{' '}
                {photo.location.longitude.toFixed(5)}
              </p>

              {/* Direction Info */}
              {photo.metadata?.direction?.hasDirection && (
                <p className="photo-popup__direction">
                  🧭 Direction: {Math.round(direction)}°
                </p>
              )}

              {/* Video Duration */}
              {photo.metadata?.isVideo && photo.metadata?.duration && (
                <p className="photo-popup__duration">
                  ⏱️ Duration: {Math.round(photo.metadata.duration)}s
                </p>
              )}

              {/* Camera Info */}
              {photo.metadata?.camera?.fullName &&
                photo.metadata.camera.fullName !== 'Unknown Camera' && (
                  <p className="photo-popup__camera">
                    📷 {photo.metadata.camera.fullName}
                  </p>
                )}
            </div>

            {/* Action Buttons */}
            <div className="photo-popup__actions">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  window.open(getPhotoImageUrl(photo.id, false), '_blank');
                }}
                className="photo-popup__button photo-popup__button--view"
              >
                {photo.metadata?.isVideo ? 'View Video' : 'View Full'}
              </button>
              {onDelete && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (
                      window.confirm(
                        'Are you sure you want to delete this photo?'
                      )
                    ) {
                      onDelete(photo.id);
                    }
                  }}
                  className="photo-popup__button photo-popup__button--delete"
                >
                  Delete
                </button>
              )}
            </div>

            {/* Rotation Hint */}
            {draggable && (
              <p className="photo-popup__hint">
                💡 Hold SPACEBAR and drag marker to adjust direction
              </p>
            )}
          </div>
        </Popup>
      </Marker>
    </>
  );
};

export default DirectionalPhotoMarker;
