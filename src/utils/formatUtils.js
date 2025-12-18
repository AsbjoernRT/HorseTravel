/**
 * Shared formatting utilities
 * Centralizes common formatting patterns used across the app
 */

/**
 * Format file size for display
 * @param {number} bytes - File size in bytes
 * @returns {string} Formatted file size string
 */
export const formatFileSize = (bytes) => {
  if (!bytes || bytes === 0) return 'N/A';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

/**
 * Format date for Danish locale
 * @param {Date|string} date - Date object or ISO string
 * @param {Object} options - Formatting options
 * @param {boolean} options.short - Use short month format
 * @param {boolean} options.includeYear - Include year (default: true)
 * @returns {string} Formatted date string
 */
export const formatDate = (date, options = {}) => {
  if (!date) return 'Ikke angivet';

  const d = date instanceof Date ? date : new Date(date);

  if (isNaN(d.getTime())) return 'Ugyldig dato';

  const { short = false, includeYear = true } = options;

  return d.toLocaleDateString('da-DK', {
    year: includeYear ? 'numeric' : undefined,
    month: short ? 'short' : 'long',
    day: 'numeric',
  });
};

/**
 * Format distance in meters to readable string
 * @param {number} meters - Distance in meters
 * @returns {string} Formatted distance string
 */
export const formatDistance = (meters) => {
  if (!meters || meters === 0) return 'Ukendt';

  const km = meters / 1000;

  if (km >= 1) {
    return `${km.toFixed(1)} km`;
  }
  return `${Math.round(meters)} m`;
};

/**
 * Format a number with Danish thousand separators
 * @param {number} num - Number to format
 * @returns {string} Formatted number string
 */
export const formatNumber = (num) => {
  if (num === null || num === undefined) return '0';
  return num.toLocaleString('da-DK');
};

/**
 * Format a price in Danish Kroner
 * @param {number} amount - Amount in DKK
 * @param {boolean} includeCurrency - Include 'kr.' suffix
 * @returns {string} Formatted price string
 */
export const formatPrice = (amount, includeCurrency = true) => {
  if (amount === null || amount === undefined) return includeCurrency ? '0 kr.' : '0';

  const formatted = amount.toLocaleString('da-DK', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });

  return includeCurrency ? `${formatted} kr.` : formatted;
};

/**
 * Format phone number for display
 * @param {string} phone - Phone number
 * @returns {string} Formatted phone number
 */
export const formatPhoneNumber = (phone) => {
  if (!phone) return '';

  // Remove all non-digits
  const digits = phone.replace(/\D/g, '');

  // Danish phone format: XX XX XX XX
  if (digits.length === 8) {
    return `${digits.slice(0, 2)} ${digits.slice(2, 4)} ${digits.slice(4, 6)} ${digits.slice(6, 8)}`;
  }

  // Return as-is if not standard Danish format
  return phone;
};

/**
 * Truncate text with ellipsis
 * @param {string} text - Text to truncate
 * @param {number} maxLength - Maximum length before truncation
 * @returns {string} Truncated text
 */
export const truncateText = (text, maxLength = 50) => {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 3)}...`;
};
