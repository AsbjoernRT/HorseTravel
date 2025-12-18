/**
 * Custom hook for transport details loading and management
 */
import { useState, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import { getTransport, updateTransport } from '../../../services/transportService';
import { getHorses } from '../../../services/horseService';
import { calculateDuration, formatDateTime } from '../../../utils/timeUtils';

/**
 * Manages transport details loading, elapsed time tracking, and status updates
 *
 * @param {Object} options
 * @param {string} options.transportId - ID of the transport
 * @param {string} options.activeMode - 'private' or 'organization'
 * @param {Function} options.onNavigateBack - Callback to navigate back
 * @param {Function} options.startTransportContext - Context method to start transport
 * @param {Function} options.stopTransportContext - Context method to stop transport
 * @returns {Object} Transport state and handlers
 */
export const useTransportDetails = ({
  transportId,
  activeMode,
  onNavigateBack,
  startTransportContext,
  stopTransportContext,
}) => {
  const [transport, setTransport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [elapsedTime, setElapsedTime] = useState(null);
  const [estimatedArrival, setEstimatedArrival] = useState(null);

  // Modal states
  const [showStartModal, setShowStartModal] = useState(false);
  const [showStopModal, setShowStopModal] = useState(false);
  const [startingTransport, setStartingTransport] = useState(false);
  const [stoppingTransport, setStoppingTransport] = useState(false);

  /**
   * Load transport details with horse information
   */
  const loadTransportDetails = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getTransport(transportId);

      // Load full horse details if we have horseIds
      // Use the transport's ownerType and organizationId directly from the data
      if (data.horseIds && data.horseIds.length > 0) {
        try {
          const allHorses = await getHorses(data.ownerType, data.organizationId);
          const transportHorses = allHorses.filter(horse => data.horseIds.includes(horse.id));
          data.horses = transportHorses;
        } catch (horseError) {
          console.error('Error loading horse details:', horseError);
          data.horses = [];
        }
      }

      setTransport(data);
    } catch (error) {
      console.error('Error loading transport details:', error);
      Alert.alert('Fejl', 'Kunne ikke indlæse transport detaljer');
    } finally {
      setLoading(false);
    }
  }, [transportId]);

  /**
   * Check if scheduled time is in the past
   */
  const isScheduledInPast = useCallback(() => {
    if (!transport || !transport.departureDate || !transport.departureTime) return false;
    const scheduledTime = new Date(`${transport.departureDate}T${transport.departureTime}`);
    return scheduledTime < new Date();
  }, [transport]);

  /**
   * Start transport
   */
  const handleStartTransport = useCallback(async (startFromScheduledTime = false) => {
    try {
      setStartingTransport(true);

      const now = new Date();
      const updatedTransport = {
        ...transport,
        status: 'active',
        actualStartTime: now.toISOString(),
      };

      if (!startFromScheduledTime) {
        updatedTransport.departureDate = now.toISOString().split('T')[0];
        updatedTransport.departureTime = now.toTimeString().split(' ')[0].substring(0, 5);

        if (transport.routeInfo?.duration) {
          const estimatedArrivalTime = new Date(now.getTime() + (transport.routeInfo.duration * 1000));
          updatedTransport.estimatedArrivalDate = estimatedArrivalTime.toISOString().split('T')[0];
          updatedTransport.estimatedArrivalTime = estimatedArrivalTime.toTimeString().split(' ')[0].substring(0, 5);
        }
      }

      await updateTransport(transportId, updatedTransport);
      startTransportContext?.({ ...updatedTransport, id: transportId });

      Alert.alert('Succes', 'Transport startet', [
        {
          text: 'OK',
          onPress: () => {
            setShowStartModal(false);
          }
        }
      ]);
    } catch (error) {
      console.error('Error starting transport:', error);
      Alert.alert('Fejl', 'Kunne ikke starte transport');
    } finally {
      setStartingTransport(false);
    }
  }, [transport, transportId, startTransportContext]);

  /**
   * Stop transport
   */
  const handleStopTransport = useCallback(async (newStatus) => {
    try {
      setStoppingTransport(true);

      const updatedTransport = {
        ...transport,
        status: newStatus,
      };

      if (newStatus === 'completed') {
        const now = new Date();
        updatedTransport.arrivalDate = now.toISOString().split('T')[0];
        updatedTransport.arrivalTime = now.toTimeString().split(' ')[0].substring(0, 5);
        updatedTransport.actualEndTime = now.toISOString();
      }

      await updateTransport(transportId, updatedTransport);
      stopTransportContext?.();

      const statusText = newStatus === 'completed' ? 'afsluttet' : 'fortrudt - sat tilbage til planlagt';
      Alert.alert('Succes', `Transport ${statusText}`, [
        {
          text: 'OK',
          onPress: () => {
            setShowStopModal(false);
            loadTransportDetails();
          }
        }
      ]);
    } catch (error) {
      console.error('Error stopping transport:', error);
      Alert.alert('Fejl', 'Kunne ikke stoppe transport');
    } finally {
      setStoppingTransport(false);
    }
  }, [transport, transportId, stopTransportContext, loadTransportDetails]);

  // Load transport on mount
  useEffect(() => {
    loadTransportDetails();
  }, [loadTransportDetails]);

  // Update elapsed time and estimated arrival every minute for active transports
  useEffect(() => {
    if (transport?.status === 'active' && transport?.actualStartTime) {
      const updateTimeInfo = () => {
        const duration = calculateDuration(transport.actualStartTime);
        setElapsedTime(duration.formatted);

        if (transport.routeInfo?.duration) {
          const startTime = new Date(transport.actualStartTime);
          const estimatedArrivalTime = new Date(startTime.getTime() + (transport.routeInfo.duration * 1000));

          const now = new Date();
          if (estimatedArrivalTime < now) {
            const overdueDuration = calculateDuration(estimatedArrivalTime.toISOString());
            setEstimatedArrival(`Forsinket med ${overdueDuration.formatted}`);
          } else {
            setEstimatedArrival(formatDateTime(estimatedArrivalTime.toISOString()));
          }
        } else {
          setEstimatedArrival(null);
        }
      };
      updateTimeInfo();

      const interval = setInterval(updateTimeInfo, 60000);
      return () => clearInterval(interval);
    } else {
      setElapsedTime(null);
      setEstimatedArrival(null);
    }
  }, [transport?.status, transport?.actualStartTime, transport?.routeInfo?.duration]);

  return {
    // Data
    transport,
    loading,
    elapsedTime,
    estimatedArrival,

    // Modal states
    showStartModal,
    setShowStartModal,
    showStopModal,
    setShowStopModal,
    startingTransport,
    stoppingTransport,

    // Handlers
    loadTransportDetails,
    handleStartTransport,
    handleStopTransport,
    isScheduledInPast,
  };
};

export default useTransportDetails;
