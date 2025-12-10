import React, { useState, useEffect } from 'react';
import { listUsers, listUserPhotos } from '../services/api';
import PhotoGallery from './PhotoGallery';
import UserCard from './PhotoArchive/UserCard';
import LoadingSpinner from './LoadingSpinner';
import './MapSidebar.css';

/**
 * MapSidebar Component
 * Collapsible sidebar with user selection and photo gallery
 *
 * @param {Object} props
 * @param {Function} props.onPhotoSelect - Called when photo is selected from gallery
 * @param {Function} props.onUserSelect - Called when user is selected
 * @param {Function} props.onPhotoDelete - Called when photo is deleted
 * @param {string} props.selectedPhotoId - Currently selected photo ID
 */
function MapSidebar({
  onPhotoSelect,
  onUserSelect,
  onPhotoDelete,
  selectedPhotoId,
}) {
  // Sidebar state
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState('users'); // 'users' | 'photos'

  // Users state
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState(null);

  // Selected user and photos
  const [selectedUser, setSelectedUser] = useState(null);
  const [userPhotos, setUserPhotos] = useState([]);
  const [photosLoading, setPhotosLoading] = useState(false);
  const [photosError, setPhotosError] = useState(null);

  // Load users on mount
  useEffect(() => {
    loadUsers();
  }, []);

  // Auto-collapse on mobile
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setIsCollapsed(true);
      }
    };

    handleResize(); // Check on mount
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  /**
   * Load all users
   */
  const loadUsers = async () => {
    setUsersLoading(true);
    setUsersError(null);
    try {
      const response = await listUsers({
        sort: 'last_upload',
        order: 'desc',
        limit: 100,
      });
      setUsers(response.users || []);
    } catch (error) {
      console.error('Error loading users:', error);
      setUsersError('Failed to load users');
    } finally {
      setUsersLoading(false);
    }
  };

  /**
   * Handle user selection
   */
  const handleUserClick = async (user) => {
    setSelectedUser(user);
    setActiveTab('photos');
    setPhotosLoading(true);
    setPhotosError(null);

    try {
      const response = await listUserPhotos(user.id, {
        limit: 500,
        sort: 'upload_date',
        order: 'desc',
      });
      const photos = response.photos || [];
      setUserPhotos(photos);

      // Notify parent component
      if (onUserSelect) {
        onUserSelect(user, photos);
      }
    } catch (error) {
      console.error('Error loading user photos:', error);
      setPhotosError('Failed to load photos');
    } finally {
      setPhotosLoading(false);
    }
  };

  /**
   * Handle back to users list
   */
  const handleBackToUsers = () => {
    setSelectedUser(null);
    setUserPhotos([]);
    setActiveTab('users');
    setPhotosError(null);

    // Notify parent to clear selection
    if (onUserSelect) {
      onUserSelect(null, []);
    }
  };

  /**
   * Toggle sidebar collapse
   */
  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  return (
    <aside className={`map-sidebar ${isCollapsed ? 'collapsed' : ''}`}>
      {/* Collapse Toggle Button */}
      <button
        className="map-sidebar__toggle"
        onClick={toggleCollapse}
        title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {isCollapsed ? '▶' : '◀'}
      </button>

      {/* Sidebar Content */}
      <div className="map-sidebar__content">
        {/* Header */}
        <div className="map-sidebar__header">
          {selectedUser ? (
            <>
              <button
                onClick={handleBackToUsers}
                className="map-sidebar__back-btn"
                title="Back to users"
              >
                ← Back
              </button>
              <div className="map-sidebar__header-info">
                <h2 className="map-sidebar__title">{selectedUser.display_name}</h2>
                <p className="map-sidebar__subtitle">
                  {userPhotos.length} {userPhotos.length === 1 ? 'photo' : 'photos'}
                </p>
              </div>
            </>
          ) : (
            <>
              <h2 className="map-sidebar__title">Photo Archive</h2>
              <div className="map-sidebar__stats">
                <span className="map-sidebar__stat">
                  {users.length} {users.length === 1 ? 'user' : 'users'}
                </span>
                <span className="map-sidebar__stat-divider">•</span>
                <span className="map-sidebar__stat">
                  {users.reduce((total, user) => total + (user.photo_count || 0), 0)} photos archived
                </span>
              </div>
            </>
          )}
        </div>

        {/* Users List */}
        {!selectedUser && (
          <div className="map-sidebar__section map-sidebar__users">
            {usersLoading && (
              <div className="map-sidebar__loading">
                <LoadingSpinner />
              </div>
            )}

            {usersError && (
              <div className="map-sidebar__error">
                <p>{usersError}</p>
                <button onClick={loadUsers} className="map-sidebar__retry-btn">
                  Retry
                </button>
              </div>
            )}

            {!usersLoading && !usersError && users.length === 0 && (
              <div className="map-sidebar__empty">
                <p>No users found</p>
              </div>
            )}

            {!usersLoading && !usersError && users.length > 0 && (
              <div className="map-sidebar__users-list">
                {users.map(user => (
                  <UserCard
                    key={user.id}
                    user={user}
                    onClick={handleUserClick}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Photo Gallery (when user selected) */}
        {selectedUser && (
          <div className="map-sidebar__section map-sidebar__photos">
            {photosLoading && (
              <div className="map-sidebar__loading">
                <LoadingSpinner />
              </div>
            )}

            {photosError && (
              <div className="map-sidebar__error">
                <p>{photosError}</p>
                <button
                  onClick={() => handleUserClick(selectedUser)}
                  className="map-sidebar__retry-btn"
                >
                  Retry
                </button>
              </div>
            )}

            {!photosLoading && !photosError && (
              <PhotoGallery
                photos={userPhotos}
                selectedPhotoId={selectedPhotoId}
                onPhotoClick={onPhotoSelect}
                onPhotoDelete={onPhotoDelete}
                loading={false}
              />
            )}
          </div>
        )}
      </div>
    </aside>
  );
}

export default MapSidebar;
