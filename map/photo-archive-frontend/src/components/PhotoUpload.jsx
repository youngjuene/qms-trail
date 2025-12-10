import React, { useState, useRef } from 'react';
import { extractPhotoMetadata, formatCameraInfo } from '../utils/exifExtractor';
import './PhotoUpload.css';

/**
 * PhotoUpload Component
 *
 * Handles photo file selection and upload workflow with review/confirmation.
 * Workflow: File select → EXIF extraction → Review mode → Confirmation → Upload
 *
 * @param {string} uploadState - Current upload state ('idle' | 'file_selected' | 'reviewing' | 'uploading' | 'success' | 'error')
 * @param {Object} pendingUpload - Pending upload data ({ file, metadata, location, direction })
 * @param {Function} onFileSelect - Callback when file is selected (file, metadata)
 * @param {Function} onConfirm - Callback when user confirms upload
 * @param {Function} onCancel - Callback when user cancels
 * @param {Function} onUploadAnother - Callback when user wants to upload another photo
 * @param {number} maxFileSize - Max file size in bytes (default: 10MB)
 * @param {Array} acceptedFormats - Accepted MIME types
 */
const PhotoUpload = ({
  uploadState = 'idle',
  pendingUpload = null,
  onFileSelect,
  onConfirm,
  onCancel,
  onUploadAnother,
  maxFileSize = 10 * 1024 * 1024, // 10MB
  acceptedFormats = ['image/jpeg', 'image/png', 'image/webp'],
}) => {
  const [previewUrl, setPreviewUrl] = useState(null);
  const [extractingMetadata, setExtractingMetadata] = useState(false);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  /**
   * Validate selected file
   */
  const validateFile = (file) => {
    // Check file type
    if (!acceptedFormats.includes(file.type)) {
      return `Invalid file type. Accepted formats: ${acceptedFormats.join(', ')}`;
    }

    // Check file size
    if (file.size > maxFileSize) {
      const maxSizeMB = (maxFileSize / (1024 * 1024)).toFixed(1);
      return `File too large. Maximum size: ${maxSizeMB}MB`;
    }

    return null;
  };

  /**
   * Handle file selection with EXIF extraction
   */
  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      setPreviewUrl(null);
      return;
    }

    // Create preview URL
    const preview = URL.createObjectURL(file);
    setPreviewUrl(preview);
    setError(null);

    // Extract EXIF metadata
    setExtractingMetadata(true);
    try {
      const exifData = await extractPhotoMetadata(file);

      // Notify parent component with file and metadata
      if (onFileSelect) {
        onFileSelect(file, exifData);
      }
    } catch (err) {
      console.error('EXIF extraction failed:', err);
      // Still notify parent even if EXIF extraction fails
      if (onFileSelect) {
        onFileSelect(file, null);
      }
    } finally {
      setExtractingMetadata(false);
    }
  };

  /**
   * Cancel and reset
   */
  const handleCancel = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    if (onCancel) {
      onCancel();
    }
  };

  /**
   * Trigger file input click
   */
  const handleBrowseClick = () => {
    fileInputRef.current?.click();
  };

  /**
   * Handle drag over
   */
  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  /**
   * Handle file drop
   */
  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();

    const file = e.dataTransfer.files[0];
    if (file) {
      // Simulate file input change
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      fileInputRef.current.files = dataTransfer.files;
      handleFileChange({ target: fileInputRef.current });
    }
  };

  return (
    <div className="photo-upload">
      <h3 className="photo-upload__title">Upload Photo</h3>

      {/* File Input (hidden) */}
      <input
        ref={fileInputRef}
        type="file"
        accept={acceptedFormats.join(',')}
        onChange={handleFileChange}
        className="photo-upload__file-input"
        disabled={uploadState !== 'idle'}
      />

      {/* STATE: IDLE - Upload drop zone */}
      {uploadState === 'idle' && (
        <div
          className="photo-upload__drop-zone"
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={handleBrowseClick}
        >
          <svg
            className="photo-upload__icon"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
            />
          </svg>
          <p className="photo-upload__text">
            Drag and drop or <span className="photo-upload__browse">browse</span>
          </p>
          <p className="photo-upload__hint">
            JPEG, PNG, or WEBP (max {(maxFileSize / (1024 * 1024)).toFixed(0)}MB)
          </p>
        </div>
      )}

      {/* STATE: FILE_SELECTED - Extracting metadata */}
      {uploadState === 'file_selected' && extractingMetadata && (
        <div className="photo-upload__extracting">
          <div className="photo-upload__spinner"></div>
          <p className="photo-upload__extracting-text">Extracting metadata...</p>
        </div>
      )}

      {/* STATE: REVIEWING - Show preview with confirmation UI */}
      {uploadState === 'reviewing' && pendingUpload && (
        <div className="photo-upload__review">
          <div className="photo-upload__image-container">
            <img
              src={previewUrl}
              alt="Preview"
              className="photo-upload__preview-image"
            />
            {/* GPS Badge */}
            {pendingUpload.metadata?.gps?.hasGPS && (
              <div className="photo-upload__gps-badge">
                <svg viewBox="0 0 24 24" fill="currentColor" className="photo-upload__gps-icon">
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                </svg>
                <span>GPS Detected</span>
              </div>
            )}
          </div>

          <div className="photo-upload__review-info">
            <p className="photo-upload__filename">{pendingUpload.file.name}</p>
            <p className="photo-upload__filesize">
              {(pendingUpload.file.size / 1024).toFixed(1)} KB
            </p>

            {/* Location Display */}
            {pendingUpload.location && (
              <p className="photo-upload__metadata photo-upload__metadata--location">
                📍 {pendingUpload.location.lat.toFixed(5)}, {pendingUpload.location.lng.toFixed(5)}
              </p>
            )}

            {/* Direction Display */}
            <p className="photo-upload__metadata">
              🧭 Direction: {Math.round(pendingUpload.direction)}°
            </p>

            {/* Camera Info */}
            {pendingUpload.metadata?.camera?.fullName &&
             pendingUpload.metadata.camera.fullName !== 'Unknown Camera' && (
              <p className="photo-upload__metadata">
                📷 {formatCameraInfo(pendingUpload.metadata.camera)}
              </p>
            )}
          </div>

          <div className="photo-upload__instructions">
            <p className="photo-upload__instruction-text">
              💡 Review location and direction on map
            </p>
            <p className="photo-upload__instruction-hint">
              • Drag marker to adjust location
              <br />
              • <strong>Hold SPACEBAR and drag</strong> marker to adjust direction
            </p>
          </div>

          <div className="photo-upload__actions">
            <button
              onClick={handleCancel}
              className="photo-upload__button photo-upload__button--cancel"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              className="photo-upload__button photo-upload__button--confirm"
              disabled={!pendingUpload.location}
            >
              Confirm & Upload
            </button>
          </div>
        </div>
      )}

      {/* STATE: UPLOADING - Progress spinner */}
      {uploadState === 'uploading' && (
        <div className="photo-upload__uploading">
          <div className="photo-upload__spinner"></div>
          <p className="photo-upload__uploading-text">Uploading photo...</p>
        </div>
      )}

      {/* STATE: SUCCESS - Success message with upload another button */}
      {uploadState === 'success' && (
        <div className="photo-upload__success">
          <svg
            className="photo-upload__success-icon"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <p className="photo-upload__success-text">✓ Photo uploaded successfully!</p>
          <button
            onClick={onUploadAnother}
            className="photo-upload__button photo-upload__button--primary"
          >
            Upload Another Photo
          </button>
        </div>
      )}

      {/* STATE: ERROR - Error message with retry */}
      {uploadState === 'error' && (
        <div className="photo-upload__error-state">
          <svg
            className="photo-upload__error-icon"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <p className="photo-upload__error-text">Upload failed</p>
          <div className="photo-upload__actions">
            <button
              onClick={handleCancel}
              className="photo-upload__button photo-upload__button--cancel"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              className="photo-upload__button photo-upload__button--retry"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Error Message (validation errors) */}
      {error && (
        <div className="photo-upload__error">
          <svg
            className="photo-upload__error-icon"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <p className="photo-upload__error-text">{error}</p>
        </div>
      )}
    </div>
  );
};

export default PhotoUpload;
