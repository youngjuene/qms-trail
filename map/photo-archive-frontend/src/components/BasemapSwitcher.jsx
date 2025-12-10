import React, { useState } from 'react';
import './BasemapSwitcher.css';

/**
 * BasemapSwitcher Component
 *
 * 3-to-1 toggle button for switching between different basemap tile layers
 * Provides: OpenStreetMap (default), Satellite, and Terrain views
 *
 * @param {Function} onBasemapChange - Callback when basemap selection changes
 * @param {string} currentBasemap - Currently selected basemap ('osm' | 'satellite' | 'terrain')
 */
function BasemapSwitcher({ onBasemapChange, currentBasemap = 'osm' }) {
  const [isExpanded, setIsExpanded] = useState(false);

  const basemaps = [
    {
      id: 'osm',
      name: 'Street',
      icon: '🗺️',
      description: 'OpenStreetMap',
    },
    {
      id: 'satellite',
      name: 'Satellite',
      icon: '🛰️',
      description: 'Satellite Imagery',
    },
    {
      id: 'terrain',
      name: 'Terrain',
      icon: '⛰️',
      description: 'Topographic',
    },
  ];

  const currentBasemapData = basemaps.find(b => b.id === currentBasemap) || basemaps[0];

  const handleBasemapSelect = (basemapId) => {
    onBasemapChange(basemapId);
    setIsExpanded(false);
  };

  const handleToggle = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <div className={`basemap-switcher ${isExpanded ? 'expanded' : ''}`}>
      {/* Main Toggle Button */}
      <button
        onClick={handleToggle}
        className="basemap-switcher__toggle"
        title={`Current: ${currentBasemapData.description}`}
      >
        <span className="basemap-switcher__icon">{currentBasemapData.icon}</span>
        <span className="basemap-switcher__text">{currentBasemapData.name}</span>
        <svg
          className="basemap-switcher__arrow"
          viewBox="0 0 24 24"
          fill="currentColor"
        >
          <path d="M7 10l5 5 5-5z"/>
        </svg>
      </button>

      {/* Dropdown Options */}
      {isExpanded && (
        <div className="basemap-switcher__dropdown">
          {basemaps.map(basemap => (
            <button
              key={basemap.id}
              onClick={() => handleBasemapSelect(basemap.id)}
              className={`basemap-switcher__option ${
                basemap.id === currentBasemap ? 'active' : ''
              }`}
              title={basemap.description}
            >
              <span className="basemap-switcher__option-icon">{basemap.icon}</span>
              <span className="basemap-switcher__option-text">{basemap.name}</span>
              {basemap.id === currentBasemap && (
                <svg
                  className="basemap-switcher__check"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default BasemapSwitcher;
