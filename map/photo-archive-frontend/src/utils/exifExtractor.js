import EXIF from 'exif-js';

/**
 * Convert GPS coordinates from EXIF format to decimal degrees
 * @param {Array} gpsData - GPS coordinate array [degrees, minutes, seconds]
 * @param {string} ref - Reference direction (N/S for latitude, E/W for longitude)
 * @returns {number} Decimal degree coordinate
 */
const convertGPSToDecimal = (gpsData, ref) => {
  if (!gpsData || gpsData.length !== 3) return null;

  const degrees = gpsData[0];
  const minutes = gpsData[1];
  const seconds = gpsData[2];

  let decimal = degrees + minutes / 60 + seconds / 3600;

  // Apply negative sign for South and West
  if (ref === 'S' || ref === 'W') {
    decimal = -decimal;
  }

  return decimal;
};

/**
 * Extract comprehensive metadata from an image file
 * @param {File} file - Image file to extract EXIF data from
 * @returns {Promise<Object>} Extracted metadata object
 */
export const extractPhotoMetadata = (file) => {
  return new Promise((resolve) => {
    EXIF.getData(file, function () {
      const allTags = EXIF.getAllTags(this);

      // Extract GPS coordinates
      const gpsLat = EXIF.getTag(this, 'GPSLatitude');
      const gpsLatRef = EXIF.getTag(this, 'GPSLatitudeRef');
      const gpsLng = EXIF.getTag(this, 'GPSLongitude');
      const gpsLngRef = EXIF.getTag(this, 'GPSLongitudeRef');

      // Convert GPS to decimal degrees
      const latitude = convertGPSToDecimal(gpsLat, gpsLatRef);
      const longitude = convertGPSToDecimal(gpsLng, gpsLngRef);

      // Extract camera direction (ImgDirection)
      const imgDirection = EXIF.getTag(this, 'GPSImgDirection');
      const imgDirectionRef = EXIF.getTag(this, 'GPSImgDirectionRef'); // T (true) or M (magnetic)

      // Extract camera information
      const cameraMake = EXIF.getTag(this, 'Make');
      const cameraModel = EXIF.getTag(this, 'Model');

      // Extract timestamp
      const dateTime = EXIF.getTag(this, 'DateTime') || EXIF.getTag(this, 'DateTimeOriginal');

      // Extract image dimensions
      const imageWidth = EXIF.getTag(this, 'PixelXDimension') || EXIF.getTag(this, 'ExifImageWidth');
      const imageHeight = EXIF.getTag(this, 'PixelYDimension') || EXIF.getTag(this, 'ExifImageHeight');

      // Extract exposure settings
      const iso = EXIF.getTag(this, 'ISOSpeedRatings');
      const fNumber = EXIF.getTag(this, 'FNumber');
      const exposureTime = EXIF.getTag(this, 'ExposureTime');
      const focalLength = EXIF.getTag(this, 'FocalLength');

      const metadata = {
        // GPS data
        gps: {
          latitude,
          longitude,
          hasGPS: !!(latitude && longitude),
          raw: {
            latitude: gpsLat,
            latitudeRef: gpsLatRef,
            longitude: gpsLng,
            longitudeRef: gpsLngRef,
          },
        },

        // Camera direction
        direction: {
          degrees: imgDirection || null,
          reference: imgDirectionRef || null, // 'T' for true north, 'M' for magnetic north
          hasDirection: !!imgDirection,
        },

        // Camera information
        camera: {
          make: cameraMake || 'Unknown',
          model: cameraModel || 'Unknown',
          fullName: cameraMake && cameraModel ? `${cameraMake} ${cameraModel}` : 'Unknown Camera',
        },

        // Timestamp
        timestamp: dateTime || null,
        parsedTimestamp: dateTime ? new Date(dateTime.replace(/(\d{4}):(\d{2}):(\d{2})/, '$1-$2-$3')) : null,

        // Image properties
        dimensions: {
          width: imageWidth || null,
          height: imageHeight || null,
        },

        // Exposure settings
        exposure: {
          iso: iso || null,
          fNumber: fNumber || null,
          exposureTime: exposureTime || null,
          focalLength: focalLength ? `${focalLength}mm` : null,
        },

        // Raw EXIF data (for debugging or advanced use)
        rawEXIF: allTags,
      };

      resolve(metadata);
    });
  });
};

/**
 * Check if a file has GPS coordinates in EXIF
 * @param {File} file - Image file to check
 * @returns {Promise<boolean>} True if GPS data exists
 */
export const hasGPSData = async (file) => {
  const metadata = await extractPhotoMetadata(file);
  return metadata.gps.hasGPS;
};

/**
 * Format direction for display
 * @param {number} degrees - Direction in degrees (0-360)
 * @returns {string} Formatted direction with cardinal direction
 */
export const formatDirection = (degrees) => {
  if (degrees === null || degrees === undefined) return 'Unknown';

  const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const index = Math.round(degrees / 45) % 8;
  return `${Math.round(degrees)}° ${directions[index]}`;
};

/**
 * Format camera info for display
 * @param {Object} camera - Camera metadata object
 * @returns {string} Formatted camera string
 */
export const formatCameraInfo = (camera) => {
  if (!camera) return 'Unknown Camera';
  if (camera.make === 'Unknown' && camera.model === 'Unknown') return 'Unknown Camera';
  return camera.fullName;
};

/**
 * Format exposure info for display
 * @param {Object} exposure - Exposure metadata object
 * @returns {string} Formatted exposure string
 */
export const formatExposureInfo = (exposure) => {
  if (!exposure) return '';

  const parts = [];
  if (exposure.fNumber) parts.push(`f/${exposure.fNumber}`);
  if (exposure.exposureTime) parts.push(`${exposure.exposureTime}s`);
  if (exposure.iso) parts.push(`ISO ${exposure.iso}`);
  if (exposure.focalLength) parts.push(exposure.focalLength);

  return parts.join(' • ');
};

export default {
  extractPhotoMetadata,
  hasGPSData,
  formatDirection,
  formatCameraInfo,
  formatExposureInfo,
};
