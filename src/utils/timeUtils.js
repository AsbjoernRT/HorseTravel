/**
 * Calculate duration between two ISO timestamps
 * @param {string} startTime - ISO timestamp
 * @param {string} endTime - ISO timestamp (optional, defaults to now)
 * @returns {Object} Duration object with hours, minutes, and formatted string
 */
export const calculateDuration = (startTime, endTime = null) => {
  if (!startTime) {
    return {
      hours: 0,
      minutes: 0,
      totalMinutes: 0,
      formatted: '0 min',
    };
  }

  const start = new Date(startTime);
  const end = endTime ? new Date(endTime) : new Date();

  const durationMs = end - start;
  const totalMinutes = Math.floor(durationMs / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  let formatted = '';
  if (hours > 0) {
    formatted = `${hours} timer${minutes > 0 ? ` ${minutes} min` : ''}`;
  } else {
    formatted = `${minutes} min`;
  }

  return {
    hours,
    minutes,
    totalMinutes,
    formatted,
    durationMs,
  };
};

/**
 * Format a duration in minutes to a human-readable string
 * @param {number} minutes - Duration in minutes
 * @returns {string} Formatted duration
 */
export const formatDuration = (minutes) => {
  if (!minutes || minutes === 0) return '0 min';

  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (hours > 0) {
    return `${hours} timer${mins > 0 ? ` ${mins} min` : ''}`;
  }
  return `${mins} min`;
};

/**
 * Format an ISO timestamp to a readable date/time string
 * @param {string} isoString - ISO timestamp
 * @param {Object} options - Formatting options
 * @returns {string} Formatted date/time
 */
export const formatDateTime = (isoString, options = {}) => {
  if (!isoString) return 'Ikke angivet';

  const date = new Date(isoString);
  const {
    includeDate = true,
    includeTime = true,
    includeSeconds = false,
  } = options;

  const datePart = includeDate
    ? date.toLocaleDateString('da-DK', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : '';

  const timePart = includeTime
    ? date.toLocaleTimeString('da-DK', {
        hour: '2-digit',
        minute: '2-digit',
        ...(includeSeconds && { second: '2-digit' }),
      })
    : '';

  if (includeDate && includeTime) {
    return `${datePart} kl. ${timePart}`;
  }
  return datePart || timePart;
};

/**
 * Get relative time string (e.g., "2 timer siden")
 * @param {string} isoString - ISO timestamp
 * @returns {string} Relative time string
 */
export const getRelativeTime = (isoString) => {
  if (!isoString) return '';

  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now - date;
  const diffMinutes = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMinutes < 1) {
    return 'Lige nu';
  } else if (diffMinutes < 60) {
    return `${diffMinutes} min siden`;
  } else if (diffHours < 24) {
    return `${diffHours} timer siden`;
  } else if (diffDays === 1) {
    return 'I går';
  } else if (diffDays < 7) {
    return `${diffDays} dage siden`;
  } else {
    return formatDateTime(isoString, { includeTime: false });
  }
};
