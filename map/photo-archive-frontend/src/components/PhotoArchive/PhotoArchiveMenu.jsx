import React, { useState, useEffect } from 'react';
import { listUsers, createUser } from '../../services/api';
import UserCard from './UserCard';
import LoadingSpinner from '../LoadingSpinner';
import './PhotoArchiveMenu.css';

/**
 * PhotoArchiveMenu Component
 * Displays all users as cards with search and sort functionality
 *
 * @param {Object} props
 * @param {Function} props.onUserSelect - Callback when user is selected
 * @param {Function} props.onCreateUser - Callback to create new user
 */
function PhotoArchiveMenu({ onUserSelect, onCreateUser }) {
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('last_upload');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newUserData, setNewUserData] = useState({
    username: '',
    display_name: '',
    email: ''
  });
  const [createError, setCreateError] = useState(null);

  useEffect(() => {
    loadUsers();
  }, [sortBy]);

  useEffect(() => {
    filterUsers();
  }, [users, searchQuery]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const response = await listUsers({ sort: sortBy, limit: 100 });
      setUsers(response.users || []);
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterUsers = () => {
    if (!searchQuery.trim()) {
      setFilteredUsers(users);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = users.filter(user =>
      user.username.toLowerCase().includes(query) ||
      user.display_name.toLowerCase().includes(query)
    );
    setFilteredUsers(filtered);
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setCreateError(null);

    try {
      const newUser = await createUser(newUserData);
      setUsers([newUser, ...users]);
      setShowCreateForm(false);
      setNewUserData({ username: '', display_name: '', email: '' });
      if (onCreateUser) {
        onCreateUser(newUser);
      }
    } catch (error) {
      console.error('Error creating user:', error);
      setCreateError(error.response?.data?.detail || 'Failed to create user');
    }
  };

  const handleSortChange = (e) => {
    setSortBy(e.target.value);
  };

  return (
    <div className="photo-archive-menu">
      <div className="archive-header">
        <h1>Photo Archive</h1>
        <p className="archive-subtitle">Browse photos by photographer</p>
      </div>

      <div className="archive-controls">
        <div className="search-bar">
          <input
            type="text"
            placeholder="Search users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
          <span className="search-icon">🔍</span>
        </div>

        <div className="sort-controls">
          <label htmlFor="sort-select">Sort by:</label>
          <select
            id="sort-select"
            value={sortBy}
            onChange={handleSortChange}
            className="sort-select"
          >
            <option value="last_upload">Recent uploads</option>
            <option value="photo_count">Photo count</option>
            <option value="username">Username</option>
            <option value="created_at">Join date</option>
          </select>
        </div>

        <button
          className="create-user-button"
          onClick={() => setShowCreateForm(!showCreateForm)}
        >
          {showCreateForm ? '✕ Cancel' : '+ New User'}
        </button>
      </div>

      {showCreateForm && (
        <div className="create-user-form">
          <h3>Create New User</h3>
          <form onSubmit={handleCreateUser}>
            <div className="form-group">
              <label htmlFor="username">Username *</label>
              <input
                type="text"
                id="username"
                value={newUserData.username}
                onChange={(e) => setNewUserData({ ...newUserData, username: e.target.value })}
                required
                minLength={3}
                maxLength={100}
                placeholder="johndoe"
              />
            </div>
            <div className="form-group">
              <label htmlFor="display_name">Display Name *</label>
              <input
                type="text"
                id="display_name"
                value={newUserData.display_name}
                onChange={(e) => setNewUserData({ ...newUserData, display_name: e.target.value })}
                required
                maxLength={255}
                placeholder="John Doe"
              />
            </div>
            <div className="form-group">
              <label htmlFor="email">Email (optional)</label>
              <input
                type="email"
                id="email"
                value={newUserData.email}
                onChange={(e) => setNewUserData({ ...newUserData, email: e.target.value })}
                placeholder="john@example.com"
              />
            </div>
            {createError && <div className="error-message">{createError}</div>}
            <button type="submit" className="submit-button">Create User</button>
          </form>
        </div>
      )}

      {loading ? (
        <LoadingSpinner />
      ) : (
        <>
          <div className="user-count">
            {filteredUsers.length} {filteredUsers.length === 1 ? 'user' : 'users'}
            {searchQuery && ` matching "${searchQuery}"`}
          </div>

          <div className="user-grid">
            {filteredUsers.length === 0 ? (
              <div className="no-users">
                <p>No users found</p>
                {!showCreateForm && (
                  <button onClick={() => setShowCreateForm(true)} className="create-first-user">
                    Create your first user
                  </button>
                )}
              </div>
            ) : (
              filteredUsers.map(user => (
                <UserCard
                  key={user.id}
                  user={user}
                  onClick={onUserSelect}
                />
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default PhotoArchiveMenu;
