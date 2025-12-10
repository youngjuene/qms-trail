import React, { useEffect, useRef, useState, useMemo } from 'react';
import './MiniMap.css';

/**
 * MiniMap Component
 *
 * Provides a bird's-eye view of all routes for quick spatial navigation.
 * Renders routes using Canvas API for performance, with SVG viewport indicator.
 *
 * @param {Object} props - Component configuration
 * @param {Array} props.queryRoute - Query route coordinates [[lat, lng], ...]
 * @param {Array} props.results - Search result routes
 * @param {Array} props.pinnedResults - IDs of pinned routes
 * @param {Object} props.selectedResult - Currently selected result
 * @param {string} props.viewMode - 'all' or 'query-only'
 * @param {Object} props.mapBounds - Current visible map bounds {north, south, east, west}
 * @param {boolean} props.drawMode - Whether draw mode is active
 * @param {boolean} props.editMode - Whether edit mode is active
 */
const MiniMap = ({
  queryRoute,
  results = [],
  pinnedResults = [],
  selectedResult = null,
  viewMode = 'all',
  mapBounds,
  drawMode = false,
  editMode = false,
}) => {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [isHovered, setIsHovered] = useState(false);
  const [minimapBounds, setMinimapBounds] = useState(null);

  // Calculate bounds encompassing all visible routes
  const calculateBounds = useMemo(() => {
    const allCoords = [];

    // Add query route
    if (queryRoute) {
      allCoords.push(...queryRoute);
    }

    // Add result routes based on view mode
    results.forEach(result => {
      const coords = result.snapped_coordinates || result.coordinates;
      if (viewMode === 'query-only') {
        // Only include pinned results in query-only mode
        if (pinnedResults.includes(result.id)) {
          allCoords.push(...coords);
        }
      } else {
        // Include all results in all mode
        allCoords.push(...coords);
      }
    });

    if (allCoords.length === 0) return null;

    const lats = allCoords.map(c => c[0]);
    const lngs = allCoords.map(c => c[1]);

    return {
      minLat: Math.min(...lats),
      maxLat: Math.max(...lats),
      minLng: Math.min(...lngs),
      maxLng: Math.max(...lngs),
    };
  }, [queryRoute, results, viewMode, pinnedResults]);

  // Project geographic coordinates to canvas pixels
  const projectToCanvas = (lat, lng, bounds, size) => {
    if (!bounds) return { x: 0, y: 0 };

    const padding = 8; // 8px internal padding
    const drawableSize = size - (padding * 2);

    const x = padding + ((lng - bounds.minLng) / (bounds.maxLng - bounds.minLng)) * drawableSize;
    const y = padding + ((bounds.maxLat - lat) / (bounds.maxLat - bounds.minLat)) * drawableSize;

    return { x, y };
  };

  // Simplify route geometry using Douglas-Peucker algorithm
  const simplifyRoute = (coords, tolerance = 0.0005) => {
    if (coords.length <= 2) return coords;

    // Simple implementation - for production, consider using turf.js simplify
    // For now, just sample points to reduce density
    const step = Math.max(1, Math.floor(coords.length / 30)); // Target ~30 points
    return coords.filter((_, idx) => idx % step === 0 || idx === coords.length - 1);
  };

  // Render routes on canvas
  useEffect(() => {
    // Skip if component shouldn't render
    if (!queryRoute || queryRoute.length < 2 || drawMode) return;

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

    // Helper function to draw a route
    const drawRoute = (coords, color, width, opacity) => {
      if (!coords || coords.length < 2) return;

      const simplified = simplifyRoute(coords);
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.globalAlpha = opacity;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      ctx.beginPath();
      simplified.forEach((coord, idx) => {
        const { x, y } = projectToCanvas(coord[0], coord[1], calculateBounds, size);
        if (idx === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });
      ctx.stroke();
    };

    // Get theme colors
    const themeColors = {
      queryRoute: getComputedStyle(document.documentElement).getPropertyValue('--color-indigo').trim() || '#5E6AD2',
      candidateStroke: getComputedStyle(document.documentElement).getPropertyValue('--color-map-stroke').trim() || '#52525B',
      selectedHighlight: getComputedStyle(document.documentElement).getPropertyValue('--color-volt').trim() || '#EC4899',
    };

    // Draw candidate routes first (bottom layer)
    if (viewMode === 'all') {
      results.forEach(result => {
        const isSelected = selectedResult?.id === result.id;
        const isPinned = pinnedResults.includes(result.id);

        // Skip pinned and selected routes in this pass
        if (isPinned || isSelected) return;

        const coords = result.snapped_coordinates || result.coordinates;
        drawRoute(
          coords,
          editMode ? 'rgba(82, 82, 91, 0.2)' : themeColors.candidateStroke,
          1,
          editMode ? 0.2 : 0.4
        );
      });
    }

    // Draw pinned routes (middle layer)
    results.forEach(result => {
      if (!pinnedResults.includes(result.id)) return;
      if (selectedResult?.id === result.id) return; // Skip selected, draw it last

      const coords = result.snapped_coordinates || result.coordinates;
      drawRoute(coords, themeColors.queryRoute, 2, 0.8);
    });

    // Draw selected route (if not query route)
    if (selectedResult && selectedResult.id) {
      const coords = selectedResult.snapped_coordinates || selectedResult.coordinates;
      drawRoute(coords, themeColors.selectedHighlight, 2.5, 0.9);
    }

    // Draw query route (top layer)
    if (queryRoute) {
      drawRoute(
        queryRoute,
        themeColors.queryRoute,
        editMode ? 4 : 3,
        1.0
      );
    }
  }, [
    queryRoute,
    results,
    pinnedResults,
    selectedResult,
    viewMode,
    calculateBounds,
    isHovered,
    editMode,
    drawMode,
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

    // Don't show viewport indicator if it covers the entire minimap (no context needed)
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

  // Hide minimap when no routes exist or during draw mode
  if (!queryRoute || queryRoute.length < 2 || drawMode) {
    return null;
  }

  return (
    <div
      ref={containerRef}
      className={`minimap-container ${isHovered ? 'hovered' : ''}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      role="img"
      aria-label="Route overview map showing query route and similar results"
      aria-hidden="true"
    >
      <canvas ref={canvasRef} className="minimap-canvas" />
      {renderViewportIndicator()}
    </div>
  );
};

export default MiniMap;
