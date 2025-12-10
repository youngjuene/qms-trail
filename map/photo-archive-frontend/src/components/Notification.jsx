import React, { useEffect } from 'react';
import './Notification.css';

const Notification = ({ message, type = 'info', duration = 5000, onClose }) => {
  useEffect(() => {
    if (duration && onClose) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  const icons = {
    success: '✓',
    error: '✗',
    warning: '⚠',
    info: 'ℹ',
  };

  const icon = icons[type] || icons.info;

  return (
    <div className={`notification notification-${type}`}>
      <span className="notification-icon">
        {icon}
      </span>
      <div className="notification-content">
        {message}
      </div>
      {onClose && (
        <button
          onClick={onClose}
          className="notification-close"
          aria-label="Close notification"
        >
          ×
        </button>
      )}
    </div>
  );
};

export default Notification;
