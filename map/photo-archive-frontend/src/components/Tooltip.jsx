import React, { useState } from 'react';

/**
 * Tooltip component for displaying helpful information
 *
 * @param {string} content - The tooltip text to display
 * @param {React.ReactNode} children - Optional custom trigger element
 */
const Tooltip = ({ content, children }) => {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <span className="tooltip-wrapper">
      <span
        className="tooltip-trigger"
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        onFocus={() => setIsVisible(true)}
        onBlur={() => setIsVisible(false)}
        tabIndex={0}
        role="tooltip"
        aria-label={content}
      >
        {children || '?'}
      </span>
      {isVisible && (
        <span className="tooltip-content">
          {content}
        </span>
      )}
    </span>
  );
};

export default Tooltip;
