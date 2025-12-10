import React, { useState, useEffect, useCallback, useRef } from 'react';
import { MapContainer, TileLayer, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { uploadPhoto, deletePhoto, updatePhotoLocation } from './services/api';
import Notification from './components/Notification';
import DirectionalPhotoMarker from './components/DirectionalPhotoMarker';
import PhotoMiniMap from './components/PhotoMiniMap';
import MapSidebar from './components/MapSidebar';
import PhotoUploadModal from './components/PhotoUploadModal';
import './App.css';

// Map center coordinates
const MAP_CENTER = [37.549292, 126.938785];
const DEFAULT_ZOOM = 17;

// Satellite basemap configuration (hardcoded)
const SATELLITE_BASEMAP = {
  url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
  attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
  maxZoom: 19,
};

/**
 * MapClickHandler Component
 * Handles map click events for photo location placement
 */
function MapClickHandler({ onMapClick, uploadState }) {
  useMapEvents({
    click: (e) => {
      if (uploadState === 'reviewing' && onMapClick) {
        onMapClick(e.latlng.lat, e.latlng.lng);
      }
    },
  });
  return null;
}

/**
 * BoundsTracker Component
 * Tracks map viewport bounds for photo filtering
 */
function BoundsTracker({ onBoundsChange }) {
  const mapEvents = useMapEvents({
    moveend: () => {
      const bounds = mapEvents.getBounds();
      onBoundsChange({
        north: bounds.getNorth(),
        south: bounds.getSouth(),
        east: bounds.getEast(),
        west: bounds.getWest(),
      });
    },
  });
  return null;
}

function App() {
  // User and photo state
  const [selectedUser, setSelectedUser] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [selectedPhoto, setSelectedPhoto] = useState(null);

  // Upload state
  const [uploadState, setUploadState] = useState('idle');
  // States: 'idle' | 'file_selected' | 'reviewing' | 'uploading' | 'success' | 'error'

  const [pendingUpload, setPendingUpload] = useState(null);
  // Structure: { file, metadata, location: {lat, lng}, direction }

  const [previewMarker, setPreviewMarker] = useState(null);
  // Temporary marker for preview before confirmation

  // Map state
  const [mapBounds, setMapBounds] = useState(null);
  const [mapCenter, setMapCenter] = useState(MAP_CENTER);
  const [mapZoom, setMapZoom] = useState(DEFAULT_ZOOM);
  const mapRef = useRef(null);

  // UI state
  const [notification, setNotification] = useState(null);
  const [showFOV, setShowFOV] = useState(true);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);


  /**
   * Show notification message
   */
  const showNotification = (message, type = 'info') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000);
  };

  /**
   * Handle user selection from sidebar
   */
  const handleUserSelect = (user, userPhotos) => {
    // Clear any ongoing upload workflow when switching users
    if (uploadState !== 'idle') {
      setPendingUpload(null);
      setPreviewMarker(null);
      setUploadState('idle');
      setUploadModalOpen(false);
    }

    setSelectedUser(user);
    setPhotos(userPhotos || []);
    setSelectedPhoto(null);

    // If photos exist, center on first photo
    if (userPhotos && userPhotos.length > 0) {
      const firstPhoto = userPhotos[0];
      setMapCenter([firstPhoto.location.latitude, firstPhoto.location.longitude]);
      setMapZoom(15);
    }
  };

  /**
   * Handle file selection with metadata - sets up review mode
   */
  const handleFileSelect = (file, metadata, userId) => {
    setUploadState('file_selected');

    const direction = metadata?.direction?.degrees || 0;

    // Close the upload modal
    setUploadModalOpen(false);

    // If GPS coordinates exist, auto-place preview marker
    if (metadata && metadata.gps.hasGPS) {
      const { latitude, longitude } = metadata.gps;

      setPendingUpload({
        file,
        metadata,
        location: { lat: latitude, lng: longitude },
        direction,
        userId, // Store userId for later upload
      });

      setPreviewMarker({
        lat: latitude,
        lng: longitude,
        direction,
      });

      // Center map on GPS location
      setMapCenter([latitude, longitude]);
      setMapZoom(17);

      setUploadState('reviewing');
      showNotification('✓ Location set! Hold SPACEBAR and drag marker to adjust direction', 'info');
    } else {
      // No GPS - wait for manual placement
      setPendingUpload({
        file,
        metadata,
        location: null,
        direction,
        userId, // Store userId for later upload
      });

      setUploadState('reviewing');
      showNotification('Click on the map to set photo location', 'info');
    }
  };

  /**
   * Handle map click for manual location placement (review mode)
   */
  const handleMapClick = (lat, lng) => {
    // Only handle clicks when in reviewing mode and no location set yet
    if (uploadState !== 'reviewing' || !pendingUpload || pendingUpload.location) {
      return;
    }

    // Set preview marker at clicked location
    setPendingUpload({
      ...pendingUpload,
      location: { lat, lng },
    });

    setPreviewMarker({
      lat,
      lng,
      direction: pendingUpload.direction,
    });

    // Center map on clicked location
    setMapCenter([lat, lng]);
    setMapZoom(17);

    showNotification('✓ Location set! Hold SPACEBAR and drag marker to adjust direction', 'info');
  };

  /**
   * Handle photo selection from gallery or marker
   */
  const handlePhotoSelect = (photoId) => {
    const photo = photos.find(p => p.id === photoId);
    if (photo) {
      setSelectedPhoto(photo);
      setMapCenter([photo.location.latitude, photo.location.longitude]);
      setMapZoom(17); // Zoom in closer
    }
  };

  /**
   * Handle photo deletion
   */
  const handlePhotoDelete = async (photoId) => {
    try {
      await deletePhoto(photoId);
      showNotification('Photo deleted successfully', 'success');

      // Remove from state
      setPhotos(prev => prev.filter(p => p.id !== photoId));

      // Clear selection if deleted photo was selected
      if (selectedPhoto?.id === photoId) {
        setSelectedPhoto(null);
      }
    } catch (error) {
      console.error('Error deleting photo:', error);
      showNotification('Failed to delete photo', 'error');
    }
  };

  /**
   * Handle photo location update (marker drag)
   */
  const handleLocationChange = async (photoId, lat, lng) => {
    try {
      const result = await updatePhotoLocation(photoId, lat, lng);
      showNotification('Photo location updated', 'success');

      // Update in state
      setPhotos(prev => prev.map(p =>
        p.id === photoId
          ? { ...p, location: { latitude: lat, longitude: lng } }
          : p
      ));

      // Update selected photo if it's the one being moved
      if (selectedPhoto?.id === photoId) {
        setSelectedPhoto(prev => ({
          ...prev,
          location: { latitude: lat, longitude: lng },
        }));
      }
    } catch (error) {
      console.error('Error updating photo location:', error);
      showNotification('Failed to update location', 'error');
    }
  };

  /**
   * Handle photo direction change (rotation)
   */
  const handleDirectionChange = async (photoId, direction) => {
    try {
      // Update direction in metadata
      // Note: Backend API would need direction update endpoint
      console.log(`Direction updated for photo ${photoId}: ${direction}°`);
      showNotification(`Direction set to ${Math.round(direction)}°`, 'success');

      // Update in state
      setPhotos(prev => prev.map(p =>
        p.id === photoId
          ? {
              ...p,
              metadata: {
                ...p.metadata,
                direction: {
                  degrees: direction,
                  hasDirection: true,
                },
              },
            }
          : p
      ));

      // Update selected photo
      if (selectedPhoto?.id === photoId) {
        setSelectedPhoto(prev => ({
          ...prev,
          metadata: {
            ...prev.metadata,
            direction: {
              degrees: direction,
              hasDirection: true,
            },
          },
        }));
      }
    } catch (error) {
      console.error('Error updating direction:', error);
      showNotification('Failed to update direction', 'error');
    }
  };

  /**
   * Handle preview marker location change (drag)
   */
  const handlePreviewLocationChange = (lat, lng) => {
    if (!pendingUpload) return;

    setPendingUpload({
      ...pendingUpload,
      location: { lat, lng },
    });

    setPreviewMarker({
      ...previewMarker,
      lat,
      lng,
    });
  };

  /**
   * Handle preview marker direction change (Alt+Drag rotation)
   */
  const handlePreviewDirectionChange = (direction) => {
    if (!pendingUpload) return;

    setPendingUpload({
      ...pendingUpload,
      direction,
    });

    setPreviewMarker({
      ...previewMarker,
      direction,
    });
  };

  /**
   * Confirm upload - final step before API call
   */
  const handleConfirmUpload = async () => {
    if (!pendingUpload || !pendingUpload.location) {
      showNotification('Please set a location on the map', 'error');
      return;
    }

    setUploadState('uploading');

    try {
      const { file, metadata, location, direction, userId } = pendingUpload;

      // Add direction to metadata
      const enrichedMetadata = {
        ...metadata,
        direction: {
          degrees: direction,
          hasDirection: true,
        },
      };

      const result = await uploadPhoto(
        file,
        userId,
        location.lat,
        location.lng,
        enrichedMetadata
      );

      // Add new photo to state
      setPhotos(prev => [...prev, result]);

      // Clear preview marker
      setPreviewMarker(null);

      // Set success state
      setUploadState('success');
      showNotification('Photo uploaded successfully!', 'success');

      // Center map on uploaded photo
      setMapCenter([location.lat, location.lng]);
      setSelectedPhoto(result);
    } catch (error) {
      console.error('Error uploading photo:', error);
      setUploadState('error');
      showNotification(error.message || 'Failed to upload photo', 'error');
    }
  };

  /**
   * Cancel upload - reset to idle state
   */
  const handleCancelUpload = () => {
    setPendingUpload(null);
    setPreviewMarker(null);
    setUploadState('idle');
    showNotification('Upload cancelled', 'info');
  };

  /**
   * Upload another photo - reset from success state and reopen modal
   */
  const handleUploadAnother = () => {
    // Clear previous upload data
    setPendingUpload(null);
    setPreviewMarker(null);
    setUploadState('idle');

    // Reopen modal for next upload (user can upload multiple photos in sequence)
    setUploadModalOpen(true);
  };

  /**
   * Handle map bounds change
   */
  const handleBoundsChange = useCallback((bounds) => {
    setMapBounds(bounds);
  }, []);

  // Change cursor style during review mode
  useEffect(() => {
    const mapContainer = document.querySelector('.leaflet-container');
    if (mapContainer) {
      mapContainer.style.cursor = uploadState === 'reviewing' && !pendingUpload?.location ? 'crosshair' : '';
    }
  }, [uploadState, pendingUpload]);

  return (
    <div className="app">
      {/* Notification */}
      {notification && (
        <Notification
          message={notification.message}
          type={notification.type}
          onClose={() => setNotification(null)}
        />
      )}

      {/* Header */}
      <header className="app-header">
        <div className="app-header__content">
          <h1 className="app-title">
            {selectedUser ? `${selectedUser.display_name}'s Photos` : ''}
          </h1>
          <div className="app-header__controls">
            <button
              onClick={() => setUploadModalOpen(true)}
              className="upload-btn"
              title="Upload Photo"
            >
              <span className="upload-btn__icon">📷</span>
              <span className="upload-btn__text">Upload</span>
            </button>
            <button
              onClick={() => setShowFOV(!showFOV)}
              className={`fov-toggle ${showFOV ? 'active' : ''}`}
              title={showFOV ? 'Hide Field of View cones' : 'Show Field of View cones'}
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="fov-toggle__icon">
                <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
              </svg>
              <span className="fov-toggle__text">FOV</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="app-content">
        {/* Collapsible Sidebar */}
        <MapSidebar
          onPhotoSelect={handlePhotoSelect}
          onUserSelect={handleUserSelect}
          onPhotoDelete={handlePhotoDelete}
          selectedPhotoId={selectedPhoto?.id}
        />

        {/* Map Container */}
        <main className="app-map">
          <MapContainer
            center={mapCenter}
            zoom={mapZoom}
            className="map-container"
            zoomControl={true}
            ref={mapRef}
          >
            <TileLayer
              attribution={SATELLITE_BASEMAP.attribution}
              url={SATELLITE_BASEMAP.url}
              maxZoom={SATELLITE_BASEMAP.maxZoom}
            />

            {/* Preview Marker (temporary, before confirmation) */}
            {previewMarker && pendingUpload && (
              <DirectionalPhotoMarker
                key="preview-marker"
                photo={{
                  id: 'preview',
                  location: {
                    latitude: previewMarker.lat,
                    longitude: previewMarker.lng,
                  },
                  metadata: {
                    ...pendingUpload.metadata,
                    direction: {
                      degrees: previewMarker.direction,
                      hasDirection: true,
                    },
                  },
                  filename: pendingUpload.file.name,
                }}
                isPreview={true}
                isSelected={false}
                onDirectionChange={(_id, direction) => handlePreviewDirectionChange(direction)}
                onLocationChange={(_id, lat, lng) => handlePreviewLocationChange(lat, lng)}
                showFOV={showFOV}
                draggable={true}
              />
            )}

            {/* Photo Markers with FOV */}
            {photos.map(photo => (
              <DirectionalPhotoMarker
                key={photo.id}
                photo={photo}
                isSelected={selectedPhoto?.id === photo.id}
                onSelect={handlePhotoSelect}
                onDelete={handlePhotoDelete}
                onDirectionChange={handleDirectionChange}
                showFOV={showFOV}
                draggable={true}
              />
            ))}

            {/* Map Event Handlers */}
            <MapClickHandler
              onMapClick={handleMapClick}
              uploadState={uploadState}
            />
            <BoundsTracker onBoundsChange={handleBoundsChange} />
          </MapContainer>

          {/* MiniMap Overlay */}
          <PhotoMiniMap
            photos={photos}
            selectedPhoto={selectedPhoto}
            mapBounds={mapBounds}
          />
        </main>
      </div>

      {/* Review Mode Indicator */}
      {uploadState === 'reviewing' && !pendingUpload?.location && (
        <div className="placement-indicator">
          📍 Click on the map to place photo
        </div>
      )}

      {/* Upload Action Panel - Reviewing State */}
      {uploadState === 'reviewing' && pendingUpload?.location && (
        <div className="upload-action-panel">
          <div className="upload-action-panel__header">
            <h3>📷 Review Photo Upload</h3>
          </div>

          <div className="upload-action-panel__info">
            <p className="upload-action-panel__filename">
              📸 {pendingUpload.file.name}
            </p>
            <p className="upload-action-panel__location">
              📍 {pendingUpload.location.lat.toFixed(5)}, {pendingUpload.location.lng.toFixed(5)}
            </p>
            <p className="upload-action-panel__direction">
              🧭 Direction: {Math.round(pendingUpload.direction)}°
            </p>
          </div>

          <div className="upload-action-panel__instructions">
            <p className="upload-action-panel__instruction-title">💡 Adjust marker on map:</p>
            <ul className="upload-action-panel__instruction-list">
              <li>Drag to move location</li>
              <li><strong>Hold SPACEBAR + drag</strong> to rotate direction</li>
            </ul>
          </div>

          <div className="upload-action-panel__actions">
            <button
              onClick={handleCancelUpload}
              className="upload-action-panel__button upload-action-panel__button--cancel"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmUpload}
              className="upload-action-panel__button upload-action-panel__button--confirm"
            >
              Confirm & Upload
            </button>
          </div>
        </div>
      )}

      {/* Upload Success Panel */}
      {uploadState === 'success' && (
        <div className="upload-success-panel">
          <div className="upload-success-panel__icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>

          <h3 className="upload-success-panel__title">✓ Photo Uploaded Successfully!</h3>

          <p className="upload-success-panel__message">
            Your photo has been added to {selectedUser?.display_name || 'the'} collection
          </p>

          <div className="upload-success-panel__actions">
            <button
              onClick={handleUploadAnother}
              className="upload-success-panel__button upload-success-panel__button--primary"
            >
              Upload Another Photo
            </button>
            <button
              onClick={() => setUploadState('idle')}
              className="upload-success-panel__button upload-success-panel__button--secondary"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* Upload Error Panel */}
      {uploadState === 'error' && (
        <div className="upload-error-panel">
          <div className="upload-error-panel__icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>

          <h3 className="upload-error-panel__title">Upload Failed</h3>

          <p className="upload-error-panel__message">
            {notification?.message || 'An error occurred during upload'}
          </p>

          <div className="upload-error-panel__actions">
            <button
              onClick={handleCancelUpload}
              className="upload-error-panel__button upload-error-panel__button--cancel"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmUpload}
              className="upload-error-panel__button upload-error-panel__button--retry"
            >
              Retry Upload
            </button>
          </div>
        </div>
      )}

      {/* Photo Upload Modal */}
      <PhotoUploadModal
        isOpen={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        onFileSelect={handleFileSelect}
        uploadState={uploadState}
        pendingUpload={pendingUpload}
      />
    </div>
  );
}

export default App;
