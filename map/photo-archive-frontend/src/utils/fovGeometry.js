/**
 * Field-of-View (FOV) Geometry Utilities
 *
 * Calculates view cone/sector geometry for directional photo markers
 * Common in GIS, mapping, and photogrammetry applications
 */

/**
 * Convert degrees to radians
 * @param {number} degrees - Angle in degrees
 * @returns {number} Angle in radians
 */
const toRadians = (degrees) => degrees * (Math.PI / 180);

/**
 * Convert radians to degrees
 * @param {number} radians - Angle in radians
 * @returns {number} Angle in degrees
 */
const toDegrees = (radians) => radians * (180 / Math.PI);

/**
 * Calculate destination point given distance and bearing from start point
 * Uses Haversine formula for spherical earth calculations
 *
 * @param {number} lat - Starting latitude in decimal degrees
 * @param {number} lng - Starting longitude in decimal degrees
 * @param {number} bearing - Bearing in degrees (0 = North, 90 = East)
 * @param {number} distance - Distance in meters
 * @returns {{lat: number, lng: number}} Destination coordinates
 */
export const calculateDestinationPoint = (lat, lng, bearing, distance) => {
  const R = 6371000; // Earth radius in meters
  const δ = distance / R; // Angular distance in radians
  const θ = toRadians(bearing); // Bearing in radians
  const φ1 = toRadians(lat); // Latitude in radians
  const λ1 = toRadians(lng); // Longitude in radians

  const φ2 = Math.asin(
    Math.sin(φ1) * Math.cos(δ) +
    Math.cos(φ1) * Math.sin(δ) * Math.cos(θ)
  );

  const λ2 = λ1 + Math.atan2(
    Math.sin(θ) * Math.sin(δ) * Math.cos(φ1),
    Math.cos(δ) - Math.sin(φ1) * Math.sin(φ2)
  );

  return {
    lat: toDegrees(φ2),
    lng: toDegrees(λ2),
  };
};

/**
 * Calculate FOV cone vertices for visualization
 * Creates a sector/wedge shape showing camera field of view
 *
 * @param {number} centerLat - Camera position latitude
 * @param {number} centerLng - Camera position longitude
 * @param {number} direction - Camera direction in degrees (0 = North, 90 = East)
 * @param {number} fovAngle - Field of view angle in degrees (default: 60°)
 * @param {number} distance - View distance in meters (default: 80m)
 * @param {number} arcPoints - Number of points for smooth arc (default: 20)
 * @returns {Array<[number, number]>} Array of [lat, lng] coordinates for polygon
 */
export const calculateFOVCone = (
  centerLat,
  centerLng,
  direction,
  fovAngle = 60,
  distance = 80,
  arcPoints = 20
) => {
  const halfAngle = fovAngle / 2;
  const vertices = [];

  // Start at camera position (apex of cone)
  vertices.push([centerLat, centerLng]);

  // Calculate arc points from left edge to right edge
  const startBearing = direction - halfAngle;
  const bearingStep = fovAngle / (arcPoints - 1);

  for (let i = 0; i < arcPoints; i++) {
    const bearing = startBearing + (bearingStep * i);
    const point = calculateDestinationPoint(centerLat, centerLng, bearing, distance);
    vertices.push([point.lat, point.lng]);
  }

  // Close the polygon back to center
  vertices.push([centerLat, centerLng]);

  return vertices;
};

/**
 * Calculate arrow points for directional indicator
 * Creates a small arrow showing camera direction
 *
 * @param {number} centerLat - Camera position latitude
 * @param {number} centerLng - Camera position longitude
 * @param {number} direction - Camera direction in degrees
 * @param {number} length - Arrow length in meters (default: 30m)
 * @param {number} width - Arrow width in meters (default: 10m)
 * @returns {Array<[number, number]>} Array of [lat, lng] coordinates for arrow polygon
 */
export const calculateDirectionArrow = (
  centerLat,
  centerLng,
  direction,
  length = 30,
  width = 10
) => {
  // Arrow tip
  const tip = calculateDestinationPoint(centerLat, centerLng, direction, length);

  // Arrow base left
  const baseLeft = calculateDestinationPoint(
    centerLat,
    centerLng,
    direction - 90,
    width / 2
  );

  // Arrow base right
  const baseRight = calculateDestinationPoint(
    centerLat,
    centerLng,
    direction + 90,
    width / 2
  );

  return [
    [tip.lat, tip.lng],
    [baseLeft.lat, baseLeft.lng],
    [baseRight.lat, baseRight.lng],
    [tip.lat, tip.lng], // Close polygon
  ];
};

/**
 * Get default FOV parameters based on camera metadata
 * Different cameras and lenses have different FOV characteristics
 *
 * @param {Object} cameraMetadata - Camera metadata from EXIF
 * @param {string} cameraMetadata.make - Camera manufacturer
 * @param {string} cameraMetadata.model - Camera model
 * @param {string} cameraMetadata.focalLength - Focal length (e.g., "35mm")
 * @returns {{fovAngle: number, distance: number}} FOV parameters
 */
export const getDefaultFOVParameters = (cameraMetadata = {}) => {
  const { focalLength } = cameraMetadata;

  // Default values for typical smartphone cameras
  let fovAngle = 65; // degrees
  let distance = 80; // meters

  // Adjust based on focal length if available
  if (focalLength) {
    const focalLengthValue = parseInt(focalLength);

    if (focalLengthValue <= 24) {
      // Wide angle lens
      fovAngle = 84;
      distance = 100;
    } else if (focalLengthValue <= 35) {
      // Standard wide
      fovAngle = 63;
      distance = 80;
    } else if (focalLengthValue <= 50) {
      // Normal lens
      fovAngle = 47;
      distance = 60;
    } else if (focalLengthValue <= 85) {
      // Portrait lens
      fovAngle = 28;
      distance = 50;
    } else {
      // Telephoto lens
      fovAngle = 18;
      distance = 40;
    }
  }

  return { fovAngle, distance };
};

/**
 * Normalize direction to 0-360 range
 * @param {number} direction - Direction in degrees
 * @returns {number} Normalized direction (0-360)
 */
export const normalizeDirection = (direction) => {
  let normalized = direction % 360;
  if (normalized < 0) normalized += 360;
  return normalized;
};

export default {
  calculateFOVCone,
  calculateDirectionArrow,
  calculateDestinationPoint,
  getDefaultFOVParameters,
  normalizeDirection,
};
