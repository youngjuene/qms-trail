import React from 'react';
import './PhotoArchiveMenu.css';

/**
 * UserCard Component
 * Displays a card with user information and photo statistics
 *
 * @param {Object} props
 * @param {Object} props.user - User data
 * @param {Function} props.onClick - Click handler
 */
function UserCard({ user, onClick }) {
  // Format last upload time as relative time
  const getRelativeTime = (dateString) => {
    if (!dateString) return 'Never';

    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} week${Math.floor(diffDays / 7) > 1 ? 's' : ''} ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} month${Math.floor(diffDays / 30) > 1 ? 's' : ''} ago`;
    return `${Math.floor(diffDays / 365)} year${Math.floor(diffDays / 365) > 1 ? 's' : ''} ago`;
  };

  // Get initials for avatar fallback
  const getInitials = (displayName) => {
    return displayName
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Format storage size
  const formatStorageSize = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${Math.round(bytes / Math.pow(k, i) * 10) / 10} ${sizes[i]}`;
  };

  return (
    <div className="user-card" onClick={() => onClick(user)}>
      <div className="user-card-avatar">
        {user.avatar_url ? (
          <img src={user.avatar_url} alt={user.display_name} />
        ) : (
          <div className="user-card-avatar-fallback">
            {getInitials(user.display_name)}
          </div>
        )}
      </div>
      <div className="user-card-info">
        <h3 className="user-card-name">{user.display_name}</h3>
        <p className="user-card-username">@{user.username}</p>
      </div>
      <div className="user-card-stats">
        <div className="user-card-stat">
          <span className="user-card-stat-icon">📷</span>
          <span className="user-card-stat-value">{user.photo_count}</span>
          <span className="user-card-stat-label">
            {user.photo_count === 1 ? 'photo' : 'photos'}
          </span>
        </div>
        <div className="user-card-stat">
          <span className="user-card-stat-icon">🕒</span>
          <span className="user-card-stat-value">{getRelativeTime(user.last_upload_at)}</span>
        </div>
        {user.total_storage_bytes > 0 && (
          <div className="user-card-stat">
            <span className="user-card-stat-icon">💾</span>
            <span className="user-card-stat-value">{formatStorageSize(user.total_storage_bytes)}</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default UserCard;
