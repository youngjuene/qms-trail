import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ============================================================
// User API Functions
// ============================================================

/**
 * Get all users with optional filtering and sorting
 * @param {Object} options - Query options
 * @param {string} options.sort - Sort by: created_at, photo_count, last_upload, username
 * @param {string} options.order - Order: asc or desc
 * @param {number} options.limit - Maximum results (1-100)
 * @param {number} options.offset - Pagination offset
 * @param {string} options.search - Search term for username/display_name
 * @returns {Promise<Object>} Users list with pagination info
 */
export const listUsers = async (options = {}) => {
  try {
    const params = {
      sort: options.sort || 'last_upload',
      order: options.order || 'desc',
      limit: options.limit || 50,
      offset: options.offset || 0,
    };
    if (options.search) {
      params.search = options.search;
    }

    const response = await api.get('/users', { params });
    return response.data;
  } catch (error) {
    console.error('Error listing users:', error);
    throw error;
  }
};

/**
 * Get user details by ID
 * @param {string} userId - User UUID
 * @returns {Promise<Object>} User details
 */
export const getUser = async (userId) => {
  try {
    const response = await api.get(`/users/${userId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching user:', error);
    throw error;
  }
};

/**
 * Create a new user
 * @param {Object} userData - User data
 * @param {string} userData.username - Unique username
 * @param {string} userData.display_name - Display name
 * @param {string} userData.email - Optional email
 * @returns {Promise<Object>} Created user data
 */
export const createUser = async (userData) => {
  try {
    const response = await api.post('/users', userData);
    return response.data;
  } catch (error) {
    console.error('Error creating user:', error);
    throw error;
  }
};

/**
 * Update user information
 * @param {string} userId - User UUID
 * @param {Object} userData - Updated user data
 * @returns {Promise<Object>} Updated user data
 */
export const updateUser = async (userId, userData) => {
  try {
    const response = await api.patch(`/users/${userId}`, userData);
    return response.data;
  } catch (error) {
    console.error('Error updating user:', error);
    throw error;
  }
};

/**
 * Delete a user
 * @param {string} userId - User UUID
 * @returns {Promise<Object>} Deletion confirmation
 */
export const deleteUser = async (userId) => {
  try {
    const response = await api.delete(`/users/${userId}`);
    return response.data;
  } catch (error) {
    console.error('Error deleting user:', error);
    throw error;
  }
};

/**
 * Get all photos for a specific user
 * @param {string} userId - User UUID
 * @param {Object} options - Query options
 * @param {number} options.limit - Maximum results
 * @param {number} options.offset - Pagination offset
 * @param {string} options.sort - Sort by: upload_date or file_size
 * @param {string} options.order - Order: asc or desc
 * @param {Object} options.bounds - Geographic bounds {north, south, east, west}
 * @returns {Promise<Object>} Photos list with pagination info
 */
export const listUserPhotos = async (userId, options = {}) => {
  try {
    const params = {
      limit: options.limit || 100,
      offset: options.offset || 0,
      sort: options.sort || 'upload_date',
      order: options.order || 'desc',
    };
    if (options.bounds) {
      params.bounds = `${options.bounds.north},${options.bounds.south},${options.bounds.east},${options.bounds.west}`;
    }

    const response = await api.get(`/users/${userId}/photos`, { params });
    return response.data;
  } catch (error) {
    console.error('Error listing user photos:', error);
    throw error;
  }
};

/**
 * Get user avatar URL
 * @param {string} userId - User UUID
 * @returns {string} Avatar URL
 */
export const getUserAvatarUrl = (userId) => {
  return `${API_BASE_URL}/users/${userId}/avatar`;
};

// ============================================================
// Photo API Functions (Modified)
// ============================================================

/**
 * Upload a photo with location and user
 * @param {File} file - Image file to upload
 * @param {string} userId - User ID uploading the photo
 * @param {number} latitude - Photo latitude
 * @param {number} longitude - Photo longitude
 * @param {Object} metadata - Optional photo metadata
 * @returns {Promise<Object>} Uploaded photo data
 */
export const uploadPhoto = async (file, userId, latitude, longitude, metadata = null) => {
  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('user_id', userId);
    formData.append('latitude', latitude.toString());
    formData.append('longitude', longitude.toString());
    if (metadata) {
      formData.append('metadata', JSON.stringify(metadata));
    }

    const response = await api.post('/photos/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error uploading photo:', error);
    throw error;
  }
};

/**
 * Get all photos or filter by map bounds
 * @param {Object} bounds - Optional map bounds {north, south, east, west}
 * @param {number} limit - Maximum number of photos to return
 * @param {number} offset - Pagination offset
 * @returns {Promise<Object>} Photos list with pagination info
 */
export const listPhotos = async (bounds = null, limit = 100, offset = 0) => {
  try {
    const params = { limit, offset };
    if (bounds) {
      params.bounds = `${bounds.north},${bounds.south},${bounds.east},${bounds.west}`;
    }

    const response = await api.get('/photos', { params });
    return response.data;
  } catch (error) {
    console.error('Error listing photos:', error);
    throw error;
  }
};

/**
 * Get photo details by ID
 * @param {string} photoId - Photo UUID
 * @returns {Promise<Object>} Photo details
 */
export const getPhoto = async (photoId) => {
  try {
    const response = await api.get(`/photos/${photoId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching photo:', error);
    throw error;
  }
};

/**
 * Delete a photo
 * @param {string} photoId - Photo UUID
 * @returns {Promise<Object>} Deletion confirmation
 */
export const deletePhoto = async (photoId) => {
  try {
    const response = await api.delete(`/photos/${photoId}`);
    return response.data;
  } catch (error) {
    console.error('Error deleting photo:', error);
    throw error;
  }
};

/**
 * Update photo location
 * @param {string} photoId - Photo UUID
 * @param {number} latitude - New latitude
 * @param {number} longitude - New longitude
 * @returns {Promise<Object>} Updated photo data
 */
export const updatePhotoLocation = async (photoId, latitude, longitude) => {
  try {
    const response = await api.patch(`/photos/${photoId}/location`, {
      latitude,
      longitude,
    });
    return response.data;
  } catch (error) {
    console.error('Error updating photo location:', error);
    throw error;
  }
};

/**
 * Get photo image URL
 * @param {string} photoId - Photo UUID
 * @param {boolean} thumbnail - Whether to get thumbnail (default: false)
 * @returns {string} Image URL
 */
export const getPhotoImageUrl = (photoId, thumbnail = false) => {
  const endpoint = thumbnail ? 'thumbnail' : 'image';
  return `${API_BASE_URL}/photos/${photoId}/${endpoint}`;
};

/**
 * Health check endpoint
 * @returns {Promise<Object>} Health status
 */
export const healthCheck = async () => {
  try {
    const response = await api.get('/health');
    return response.data;
  } catch (error) {
    console.error('Health check failed:', error);
    throw error;
  }
};

export default api;
