import { useState, useEffect } from 'react';
import { calculateDuration } from '../utils/timeUtils';

/**
 * Custom hook for tracking elapsed time since a start time
 * Updates every minute to show real-time duration
 *
 * @param {string|Date} startTime - ISO timestamp or Date object
 * @returns {string|null} Formatted elapsed time string or null if no start time
 *
 * @example
 * const elapsedTime = useElapsedTime(transport.actualStartTime);
 * // Returns: "2 timer 30 min" or "45 min" or null
 */
export const useElapsedTime = (startTime) => {
  const [elapsedTime, setElapsedTime] = useState(null);

  useEffect(() => {
    if (!startTime) {
      setElapsedTime(null);
      return;
    }

    const updateElapsed = () => {
      const duration = calculateDuration(startTime);
      setElapsedTime(duration.formatted);
    };

    // Initial update
    updateElapsed();

    // Update every minute
    const interval = setInterval(updateElapsed, 60000);

    return () => clearInterval(interval);
  }, [startTime]);

  return elapsedTime;
};

/**
 * Custom hook for tracking elapsed time with more detailed info
 * Returns the full duration object for more control
 *
 * @param {string|Date} startTime - ISO timestamp or Date object
 * @param {number} updateInterval - Update interval in ms (default: 60000)
 * @returns {Object|null} Duration object or null
 */
export const useElapsedDuration = (startTime, updateInterval = 60000) => {
  const [duration, setDuration] = useState(null);

  useEffect(() => {
    if (!startTime) {
      setDuration(null);
      return;
    }

    const updateDuration = () => {
      setDuration(calculateDuration(startTime));
    };

    updateDuration();
    const interval = setInterval(updateDuration, updateInterval);

    return () => clearInterval(interval);
  }, [startTime, updateInterval]);

  return duration;
};
