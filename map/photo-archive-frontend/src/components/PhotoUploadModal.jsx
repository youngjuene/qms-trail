import React, { useState, useEffect } from 'react';
import './PhotoUploadModal.css';

/**
 * PhotoUploadModal Component
 * Modal for uploading photos with user ID selection
 *
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether modal is open
 * @param {Function} props.onClose - Close modal handler
 * @param {Function} props.onFileSelect - File selection handler
 * @param {string} props.uploadState - Current upload state
 * @param {Object} props.pendingUpload - Pending upload data
 */
function PhotoUploadModal({
  isOpen,
  onClose,
  onFileSelect,
  uploadState,
  pendingUpload,
}) {
  const [step, setStep] = useState(1); // 1: user ID input, 2: file upload
  const [customUserId, setCustomUserId] = useState('');
  const [error, setError] = useState(null);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setStep(1);
      setCustomUserId('');
      setError(null);
    }
  }, [isOpen]);

  /**
   * Handle next step (user ID entered → file upload)
   */
  const handleNext = () => {
    if (!customUserId.trim()) {
      setError('Please enter a user ID');
      return;
    }
    setStep(2);
    setError(null);
  };

  /**
   * Handle file selection
   */
  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type (images and videos)
    const isImage = file.type.match(/^image\/(jpeg|jpg|png|webp)$/i);
    const isVideo = file.type.match(/^video\/(mp4|quicktime|x-msvideo|webm)$/i);

    if (!isImage && !isVideo) {
      setError('Please select a valid image (JPEG, PNG, WEBP) or video (MP4, MOV, AVI, WEBM) file');
      return;
    }

    // Validate file size (10MB for images, 100MB for videos)
    const maxSize = isVideo ? 100 * 1024 * 1024 : 10 * 1024 * 1024;
    const maxSizeMB = isVideo ? 100 : 10;

    if (file.size > maxSize) {
      setError(`File size must be less than ${maxSizeMB}MB for ${isVideo ? 'videos' : 'images'}`);
      return;
    }

    // Extract EXIF metadata
    const metadata = await extractMetadata(file);

    // Store userId in the file selection callback
    onFileSelect(file, metadata, customUserId);

    // Modal stays open so user can see the map for location/FOV selection
  };

  /**
   * Extract metadata from image or video
   */
  const extractMetadata = async (file) => {
    const isVideo = file.type.startsWith('video/');

    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (isVideo) {
          // For videos, create a video element to get dimensions/duration
          const video = document.createElement('video');
          video.preload = 'metadata';
          video.onloadedmetadata = () => {
            resolve({
              filename: file.name,
              fileSize: file.size,
              mimeType: file.type,
              width: video.videoWidth,
              height: video.videoHeight,
              duration: video.duration,
              isVideo: true,
              captureDate: file.lastModifiedDate || new Date(),
              gps: { hasGPS: false }, // Would extract from EXIF/metadata in production
              direction: { degrees: 0, hasDirection: false },
            });
            URL.revokeObjectURL(video.src);
          };
          video.src = URL.createObjectURL(file);
        } else {
          // For images, create an img element
          const img = new Image();
          img.onload = () => {
            resolve({
              filename: file.name,
              fileSize: file.size,
              mimeType: file.type,
              width: img.width,
              height: img.height,
              isVideo: false,
              captureDate: file.lastModifiedDate || new Date(),
              gps: { hasGPS: false }, // Would extract from EXIF in production
              direction: { degrees: 0, hasDirection: false },
            });
          };
          img.src = e.target.result;
        }
      };
      reader.readAsDataURL(file);
    });
  };

  /**
   * Handle back button
   */
  const handleBack = () => {
    setStep(1);
    setError(null);
  };

  if (!isOpen) return null;

  return (
    <div className="upload-modal-overlay" onClick={onClose}>
      <div className="upload-modal" onClick={(e) => e.stopPropagation()}>
        <div className="upload-modal__header">
          <h2 className="upload-modal__title">
            {step === 1 ? 'Enter User ID' : 'Upload Photo'}
          </h2>
          <button
            className="upload-modal__close"
            onClick={onClose}
            title="Close"
          >
            ✕
          </button>
        </div>

        <div className="upload-modal__content">
          {/* Step 1: User ID Input */}
          {step === 1 && (
            <div className="upload-modal__step">
              {error && <div className="upload-modal__error">{error}</div>}

              <div className="upload-modal__section">
                <h3>Enter User ID</h3>
                <input
                  type="text"
                  className="upload-modal__input"
                  placeholder="Enter user ID"
                  value={customUserId}
                  onChange={(e) => setCustomUserId(e.target.value)}
                  autoFocus
                />
                <p className="upload-modal__hint">
                  Enter a unique identifier for this photo upload
                </p>
              </div>

              <div className="upload-modal__actions">
                <button className="upload-modal__btn" onClick={onClose}>
                  Cancel
                </button>
                <button
                  className="upload-modal__btn upload-modal__btn--primary"
                  onClick={handleNext}
                  disabled={!customUserId.trim()}
                >
                  Next
                </button>
              </div>
            </div>
          )}

          {/* Step 2: File Upload */}
          {step === 2 && (
            <div className="upload-modal__step">
              {error && <div className="upload-modal__error">{error}</div>}

              <div className="upload-modal__file-upload">
                <input
                  type="file"
                  id="file-input"
                  accept="image/jpeg,image/jpg,image/png,image/webp,video/mp4,video/quicktime,video/x-msvideo,video/webm"
                  onChange={handleFileChange}
                  className="upload-modal__file-input"
                />
                <label htmlFor="file-input" className="upload-modal__file-label">
                  <div className="upload-modal__file-icon">📷</div>
                  <p className="upload-modal__file-text">
                    Click to select photo or video
                  </p>
                  <p className="upload-modal__file-hint">
                    Images: JPEG, PNG, WEBP (max 10MB)<br/>
                    Videos: MP4, MOV, AVI, WEBM (max 100MB)
                  </p>
                </label>
              </div>

              <div className="upload-modal__info">
                <p>After selecting a photo:</p>
                <ol>
                  <li>Click on the map to set the photo location</li>
                  <li>Drag the marker to adjust position</li>
                  <li><strong>Hold SPACEBAR and drag</strong> marker to adjust viewing direction</li>
                  <li>Click "Confirm & Upload" button when ready</li>
                </ol>
              </div>

              <div className="upload-modal__actions">
                <button className="upload-modal__btn" onClick={handleBack}>
                  Back
                </button>
                <button className="upload-modal__btn" onClick={onClose}>
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default PhotoUploadModal;
