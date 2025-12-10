import React from 'react';
import './SearchHistoryPanel.css';

/**
 * SearchHistoryPanel component for managing search history
 */
const SearchHistoryPanel = ({
  history,
  isExpanded,
  onToggle,
  onRestore,
  onClear
}) => {
  if (history.length === 0) return null;

  /**
   * Generate a mini SVG preview of a route
   */
  const generateRoutePreview = (coordinates) => {
    if (!coordinates || coordinates.length < 2) return null;

    // Calculate bounds
    const lats = coordinates.map(c => c[0]);
    const lngs = coordinates.map(c => c[1]);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);

    // Normalize to 0-1 range
    const normalize = (coord) => {
      const lat = (coord[0] - minLat) / (maxLat - minLat || 1);
      const lng = (coord[1] - minLng) / (maxLng - minLng || 1);
      return { x: lng * 70 + 5, y: (1 - lat) * 30 + 5 }; // 80x40 SVG, with 5px padding
    };

    const points = coordinates.map(normalize);
    const pathData = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x},${p.y}`).join(' ');

    return (
      <svg width="80" height="40" className="route-preview-svg">
        <path
          d={pathData}
          fill="none"
          stroke="var(--color-indigo)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  };

  return (
    <div className={`search-history-panel ${isExpanded ? 'expanded' : 'collapsed'}`}>
      <div className="history-header" onClick={onToggle}>
        <h3>
          📜 Search History ({history.length})
        </h3>
        <div className="history-controls">
          {isExpanded && (
            <button
              className="clear-history-button"
              onClick={(e) => {
                e.stopPropagation();
                if (window.confirm('Clear all search history?')) {
                  onClear();
                }
              }}
              title="Clear all history"
            >
              Clear All
            </button>
          )}
          <button className="toggle-icon" aria-label={isExpanded ? 'Collapse' : 'Expand'}>
            {isExpanded ? '▼' : '▲'}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="history-list">
          {history.map((item) => (
            <div key={item.id} className="history-item">
              <div className="history-item-header">
                <span className="history-timestamp">🕐 {item.timestamp}</span>
                <span className="history-results">{item.resultCount} results</span>
              </div>

              <div className="history-preview">
                {generateRoutePreview(item.route)}
              </div>

              <div className="history-params">
                <span className="param">
                  Turn: {item.params.turnWeight?.toFixed(2)}
                </span>
                <span className="param">
                  Sinuosity: {item.params.sinuosityWeight?.toFixed(2) || '0.10'}
                </span>
                {item.params.patternWeight !== undefined && (
                  <span className="param">
                    Pat: {item.params.patternWeight?.toFixed(2)}
                  </span>
                )}
              </div>

              <button
                className="restore-button"
                onClick={() => onRestore(item)}
                title="Restore this search"
              >
                ↻ Restore
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SearchHistoryPanel;
