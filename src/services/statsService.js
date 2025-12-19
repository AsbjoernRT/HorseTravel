/**
 * Statistics calculation service
 * Extracted from HomeScreen for reusability and testability
 */

/**
 * Calculate date boundaries for stats periods
 * @returns {Object} Object containing startOfWeek, startOfMonth, startOfYear dates
 */
export const getDateBoundaries = () => {
  const now = new Date();

  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay()); // Sunday
  startOfWeek.setHours(0, 0, 0, 0);

  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  startOfMonth.setHours(0, 0, 0, 0);

  const startOfYear = new Date(now.getFullYear(), 0, 1);
  startOfYear.setHours(0, 0, 0, 0);

  return { startOfWeek, startOfMonth, startOfYear };
};

/**
 * Extract distance in meters from transport object
 * Handles multiple storage formats:
 * 1. t.distance (number in meters)
 * 2. t.distance (object with value property in meters)
 * 3. t.distanceText (string like "12.5 km")
 * 4. t.routeInfo.distance (number in meters)
 * 5. t.routeInfo.distanceText (string like "12.5 km")
 *
 * @param {Object} transport - Transport object
 * @returns {number} Distance in meters
 */
export const extractDistanceMeters = (transport) => {
  if (!transport) return 0;

  // Direct number value
  if (typeof transport.distance === 'number') {
    return transport.distance;
  }

  // Object with value property
  if (typeof transport.distance === 'object' && transport.distance?.value) {
    return transport.distance.value;
  }

  // From routeInfo
  if (transport.routeInfo?.distance) {
    return transport.routeInfo.distance;
  }

  // Parse from text formats
  const textSource = transport.distanceText || transport.routeInfo?.distanceText;
  if (textSource) {
    const match = textSource.match(/[\d.,]+/);
    if (match) {
      return parseFloat(match[0].replace(',', '.')) * 1000;
    }
  }

  return 0;
};

/**
 * Calculate transport stats for a period
 * @param {Array} transports - Array of transport objects
 * @param {Date|null} startDate - Start date for filtering (null for all time)
 * @returns {Object} Stats object with horses and km counts
 */
export const calculatePeriodStats = (transports, startDate = null) => {
  if (!transports || !Array.isArray(transports)) {
    return { horses: 0, km: 0 };
  }

  const filtered = startDate
    ? transports.filter(t => {
        // Use actualEndTime (completion time) for completed transports
        const completedAt = t.actualEndTime
          ? new Date(t.actualEndTime)
          : (t.createdAt?.toDate?.() || new Date(t.createdAt));
        return completedAt >= startDate;
      })
    : transports;

  const horses = filtered.reduce((sum, t) => sum + (t.horseCount || 0), 0);
  const totalMeters = filtered.reduce((sum, t) => sum + extractDistanceMeters(t), 0);
  const km = Math.round(totalMeters / 1000);

  return { horses, km };
};

/**
 * Load all transport stats for dashboard
 * @param {Array} completedTransports - Array of completed transports
 * @param {Array} plannedTransports - Array of planned/upcoming transports
 * @returns {Object} Complete stats object with week, month, year, allTime, and upcomingCount
 */
export const loadTransportStats = (completedTransports, plannedTransports = []) => {
  const { startOfWeek, startOfMonth, startOfYear } = getDateBoundaries();

  return {
    week: calculatePeriodStats(completedTransports, startOfWeek),
    month: calculatePeriodStats(completedTransports, startOfMonth),
    year: calculatePeriodStats(completedTransports, startOfYear),
    allTime: calculatePeriodStats(completedTransports, null),
    upcomingCount: plannedTransports?.length || 0,
  };
};

/**
 * Get default/empty stats object
 * @returns {Object} Empty stats object
 */
export const getEmptyStats = () => ({
  week: { horses: 0, km: 0 },
  month: { horses: 0, km: 0 },
  year: { horses: 0, km: 0 },
  allTime: { horses: 0, km: 0 },
  upcomingCount: 0,
});
