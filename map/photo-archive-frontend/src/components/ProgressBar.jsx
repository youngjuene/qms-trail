import React from 'react';
import './ProgressBar.css';

const ProgressBar = ({ visible, stage, percent, message }) => {
  if (!visible) return null;

  return (
    <div
      className="progress-bar-container"
      role="progressbar"
      aria-valuenow={Math.round(percent)}
      aria-valuemin="0"
      aria-valuemax="100"
      aria-label={message}
    >
      <div className="progress-bar-track">
        <div
          className={`progress-bar-fill stage-${stage}`}
          style={{ width: `${percent}%` }}
        />
      </div>
      <div className="progress-bar-message">
        <span className="progress-bar-text">{message}</span>
        <span className="progress-bar-percent">{Math.round(percent)}%</span>
      </div>
    </div>
  );
};

export default ProgressBar;
