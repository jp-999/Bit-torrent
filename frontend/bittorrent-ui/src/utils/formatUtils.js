/**
 * Utility functions for formatting torrent data
 */

/**
 * Format bytes to human-readable size
 * @param {number} bytes - Size in bytes
 * @param {number} decimals - Number of decimal places
 * @returns {string} Formatted size with unit
 */
export const formatSize = (bytes, decimals = 2) => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

/**
 * Format speed in bytes/sec to human-readable format
 * @param {number} bytesPerSec - Speed in bytes per second
 * @returns {string} Formatted speed with unit
 */
export const formatSpeed = (bytesPerSec) => {
  if (bytesPerSec === 0) return '0 B/s';
  return formatSize(bytesPerSec) + '/s';
};

/**
 * Format time duration in seconds to human-readable format
 * @param {number} seconds - Time in seconds
 * @returns {string} Formatted time
 */
export const formatTime = (seconds) => {
  if (!seconds || seconds === Infinity || isNaN(seconds)) {
    return 'Unknown';
  }
  
  const units = [
    { label: 'y', seconds: 31536000 },
    { label: 'mo', seconds: 2592000 },
    { label: 'd', seconds: 86400 },
    { label: 'h', seconds: 3600 },
    { label: 'min', seconds: 60 },
    { label: 'sec', seconds: 1 }
  ];
  
  // Find the two most significant units
  let time = seconds;
  let result = '';
  let count = 0;
  
  for (const unit of units) {
    if (time >= unit.seconds) {
      const value = Math.floor(time / unit.seconds);
      time %= unit.seconds;
      result += `${value}${unit.label} `;
      count++;
      if (count >= 2) break;
    }
  }
  
  return result.trim() || '< 1sec';
};

/**
 * Format date to a human-readable string
 * @param {Date|string} date - Date object or date string
 * @returns {string} Formatted date
 */
export const formatDate = (date) => {
  if (!date) return 'Unknown';
  
  try {
    const dateObj = new Date(date);
    return dateObj.toLocaleString();
  } catch (e) {
    return 'Invalid date';
  }
};

/**
 * Calculate and format remaining time based on current size, total size, and speed
 * @param {number} downloadedBytes - Currently downloaded bytes
 * @param {number} totalBytes - Total size in bytes
 * @param {number} speedBytesPerSec - Current download speed in bytes per second
 * @returns {string} Formatted ETA
 */
export const calculateETA = (downloadedBytes, totalBytes, speedBytesPerSec) => {
  if (!speedBytesPerSec || speedBytesPerSec === 0) {
    return 'Unknown';
  }
  
  const remainingBytes = totalBytes - downloadedBytes;
  if (remainingBytes <= 0) return 'Complete';
  
  const etaSeconds = Math.ceil(remainingBytes / speedBytesPerSec);
  return formatTime(etaSeconds);
}; 