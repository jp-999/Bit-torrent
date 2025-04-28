/**
 * Formatting utilities for the BitTorrent client
 */

/**
 * Formats bytes to a human-readable size
 * @param {number} bytes - The size in bytes
 * @param {number} decimals - Number of decimal places (default: 2)
 * @returns {string} Formatted size with unit
 */
export const formatSize = (bytes, decimals = 2) => {
  if (bytes === 0) return '0 Bytes';
  if (!bytes || isNaN(bytes)) return '-';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(decimals)) + ' ' + sizes[i];
};

/**
 * Formats bytes into human-readable file size
 * @param {number} bytes - The size in bytes
 * @param {number} decimals - Number of decimal places to show
 * @returns {string} Formatted size with appropriate unit
 */
export const formatFileSize = (bytes, decimals = 2) => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB'];
  
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(decimals)) + ' ' + sizes[i];
};

/**
 * Formats seconds into human-readable time format
 * @param {number} seconds - Time in seconds
 * @returns {string} Formatted time string
 */
export const formatTime = (seconds) => {
  if (!seconds || isNaN(seconds) || seconds === Infinity) {
    return 'Unknown';
  }
  
  if (seconds < 60) {
    return `${Math.floor(seconds)}s`;
  }
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else {
    return `${minutes}m`;
  }
};

/**
 * Formats bytes/second into human-readable speed
 * @param {number} bytesPerSecond - The speed in bytes per second
 * @returns {string} Formatted speed with appropriate unit
 */
export const formatSpeed = (bytesPerSecond) => {
  if (bytesPerSecond === 0) return '0 B/s';
  if (!bytesPerSecond || isNaN(bytesPerSecond)) return '0 B/s';
  
  return formatFileSize(bytesPerSecond, 1) + '/s';
};

/**
 * Calculates the download progress percentage
 * @param {number} downloaded - Bytes downloaded so far
 * @param {number} total - Total size in bytes
 * @returns {number} Progress percentage (0-100)
 */
export const calculateProgress = (downloaded, total) => {
  if (!downloaded || !total || total === 0) return 0;
  
  const progress = (downloaded / total) * 100;
  return Math.min(100, progress); // Ensure progress doesn't exceed 100%
};

/**
 * Calculates and formats the progress percentage
 * @param {number} completed - Amount completed
 * @param {number} total - Total amount
 * @returns {string} Formatted percentage
 */
export const formatProgress = (completed, total) => {
  if (!total || total === 0) return '0%';
  
  const percentage = (completed / total) * 100;
  return `${percentage.toFixed(1)}%`;
};

/**
 * Formats a date to a readable string
 * @param {Date|string|number} date - Date to format
 * @returns {string} Formatted date string
 */
export const formatDate = (date) => {
  if (!date) return '-';
  
  const dateObj = new Date(date);
  if (isNaN(dateObj)) return '-';
  
  return dateObj.toLocaleString();
}; 