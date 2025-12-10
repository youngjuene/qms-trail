import React, { useEffect, useRef, useState, useMemo } from 'react';
import './MiniMap.css';

/**
 * PhotoMiniMap Component
 *
 * Provides a bird's-eye view of photo distribution for quick spatial navigation.
 * Renders photo locations using Canvas API for performance, with SVG viewport indicator.
 *
 * @param {Array} photos - Array of photo objects with location data
 * @param {Object} selectedPhoto - Currently selected photo
 * @param {Object} mapBounds - Current visible map bounds {north, south, east, west}
 */
const PhotoMiniMap = ({
  photos = [],
  selectedPhoto = null,
  mapBounds,
}) => {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [isHovered, setIsHovered] = useState(false);
  const [minimapBounds, setMinimapBounds] = useState(null);

  // Calculate bounds encompassing all photos
  const calculateBounds = useMemo(() => {
    if (photos.length === 0) return null;

    const lats = photos.map(p => p.location.latitude);
    const lngs = photos.map(p => p.location.longitude);

    return {
      minLat: Math.min(...lats),
      maxLat: Math.max(...lats),
      minLng: Math.min(...lngs),
      maxLng: Math.max(...lngs),
    };
  }, [photos]);

  // Project geographic coordinates to canvas pixels
  const projectToCanvas = (lat, lng, bounds, size) => {
    if (!bounds) return { x: 0, y: 0 };

    const padding = 8; // 8px internal padding
    const drawableSize = size - (padding * 2);

    const x = padding + ((lng - bounds.minLng) / (bounds.maxLng - bounds.minLng)) * drawableSize;
    const y = padding + ((bounds.maxLat - lat) / (bounds.maxLat - bounds.minLat)) * drawableSize;

    return { x, y };
  };

  /**
   * Determine if photo is recent (< 7 days old)
   */
  const isRecentPhoto = (uploadDate) => {
    const now = new Date();
    const photoDate = new Date(uploadDate);
    const diffTime = Math.abs(now - photoDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays < 7;
  };

  // Render photos on canvas
  useEffect(() => {
    if (photos.length === 0) return;

    const canvas = canvasRef.current;
    if (!canvas || !calculateBounds) return;

    const ctx = canvas.getContext('2d');
    const size = isHovered ? 180 : 160;
    const dpr = window.devicePixelRatio || 1;

    // Set canvas size for retina displays
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;
    ctx.scale(dpr, dpr);

    // Clear canvas
    ctx.clearRect(0, 0, size, size);

    setMinimapBounds(calculateBounds);

    // Get theme colors
    const themeColors = {
      recent: getComputedStyle(document.documentElement).getPropertyValue('--color-volt').trim() || '#EC4899',
      older: getComputedStyle(document.documentElement).getPropertyValue('--color-indigo').trim() || '#5E6AD2',
      selected: getComputedStyle(document.documentElement).getPropertyValue('--color-selected-highlight').trim() || '#EC4899',
    };

    // Draw non-selected photos first
    photos.forEach(photo => {
      if (selectedPhoto && photo.id === selectedPhoto.id) return; // Draw selected last

      const { x, y } = projectToCanvas(
        photo.location.latitude,
        photo.location.longitude,
        calculateBounds,
        size
      );

      // Determine color based on recency
      const color = isRecentPhoto(photo.upload_date) ? themeColors.recent : themeColors.older;

      // Draw photo dot
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.globalAlpha = 0.8;
      ctx.fill();

      // Add subtle glow
      ctx.beginPath();
      ctx.arc(x, y, 5, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.globalAlpha = 0.2;
      ctx.fill();
    });

    // Draw selected photo on top
    if (selectedPhoto) {
      const { x, y } = projectToCanvas(
        selectedPhoto.location.latitude,
        selectedPhoto.location.longitude,
        calculateBounds,
        size
      );

      // Outer glow
      ctx.beginPath();
      ctx.arc(x, y, 8, 0, Math.PI * 2);
      ctx.fillStyle = themeColors.selected;
      ctx.globalAlpha = 0.3;
      ctx.fill();

      // Middle ring
      ctx.beginPath();
      ctx.arc(x, y, 5, 0, Math.PI * 2);
      ctx.fillStyle = themeColors.selected;
      ctx.globalAlpha = 0.6;
      ctx.fill();

      // Center dot
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fillStyle = themeColors.selected;
      ctx.globalAlpha = 1.0;
      ctx.fill();
    }
  }, [
    photos,
    selectedPhoto,
    calculateBounds,
    isHovered,
  ]);

  // Render viewport indicator
  const renderViewportIndicator = () => {
    if (!mapBounds || !minimapBounds) return null;

    const size = isHovered ? 180 : 160;
    const padding = 8;
    const drawableSize = size - (padding * 2);

    // Project map bounds to minimap coordinates
    const topLeft = projectToCanvas(mapBounds.north, mapBounds.west, minimapBounds, size);
    const bottomRight = projectToCanvas(mapBounds.south, mapBounds.east, minimapBounds, size);

    const width = Math.abs(bottomRight.x - topLeft.x);
    const height = Math.abs(bottomRight.y - topLeft.y);

    // Don't show viewport indicator if it covers the entire minimap
    const coverageRatio = (width * height) / (drawableSize * drawableSize);
    if (coverageRatio > 0.9) return null;

    const voltColor = getComputedStyle(document.documentElement).getPropertyValue('--color-volt').trim() || '#EC4899';
    const voltSubtle = getComputedStyle(document.documentElement).getPropertyValue('--color-volt-subtle').trim() || 'rgba(236, 72, 153, 0.1)';

    return (
      <svg
        className="minimap-viewport"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: size,
          height: size,
          pointerEvents: 'none',
        }}
      >
        <rect
          x={topLeft.x}
          y={topLeft.y}
          width={width}
          height={height}
          fill={voltSubtle}
          stroke={voltColor}
          strokeWidth="2"
          rx="2"
        />
      </svg>
    );
  };

  // Hide minimap when no photos exist
  if (photos.length === 0) {
    return null;
  }

  return (
    <div
      ref={containerRef}
      className={`minimap-container ${isHovered ? 'hovered' : ''}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      role="img"
      aria-label="Photo distribution overview map"
      aria-hidden="true"
    >
      <canvas ref={canvasRef} className="minimap-canvas" />
      {renderViewportIndicator()}
    </div>
  );
};

export default PhotoMiniMap;
