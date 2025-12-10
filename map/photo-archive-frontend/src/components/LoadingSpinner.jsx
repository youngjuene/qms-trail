import React from 'react';
import './LoadingSpinner.css';

const LoadingSpinner = ({ message = 'Loading...', size = 'medium' }) => {
  return (
    <div className="loading-spinner-container">
      <div className={`loading-spinner loading-spinner-${size}`} />
      <p className="loading-spinner-message">{message}</p>
    </div>
  );
};

export default LoadingSpinner;
