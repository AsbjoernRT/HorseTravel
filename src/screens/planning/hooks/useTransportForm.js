/**
 * Custom hook for managing transport form state and data loading
 */
import { useState, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { getVehicles } from '../../../services/vehicleService';
import { getHorses } from '../../../services/horseService';
import { getTransportsByStatus } from '../../../services/transportService';

/**
 * Manages form state, data loading, and edit mode for transport creation
 *
 * @param {Object} options
 * @param {string} options.activeMode - 'private' or 'organization'
 * @param {Object} options.activeOrganization - Active organization object
 * @param {Object} options.editTransport - Transport to edit (optional)
 * @returns {Object} Form state and handlers
 */
export const useTransportForm = ({ activeMode, activeOrganization, editTransport }) => {
  const isEditMode = !!editTransport;

  // Form state
  const [fromLocation, setFromLocation] = useState('');
  const [toLocation, setToLocation] = useState('');
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [selectedTrailer, setSelectedTrailer] = useState(null);
  const [selectedHorses, setSelectedHorses] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState(null);
  const [departureDate, setDepartureDate] = useState('');
  const [departureTime, setDepartureTime] = useState('');
  const [notes, setNotes] = useState('');

  // Data state
  const [vehicles, setVehicles] = useState([]);
  const [horses, setHorses] = useState([]);
  const [loading, setLoading] = useState(true);

  /**
   * Reset form to initial state
   */
  const resetForm = useCallback(() => {
    setFromLocation('');
    setToLocation('');
    setSelectedVehicle(null);
    setSelectedTrailer(null);
    setSelectedHorses([]);
    setSelectedDate(null);
    setSelectedTime(null);
    setDepartureDate('');
    setDepartureTime('');
    setNotes('');
  }, []);

  /**
   * Load vehicles and horses data
   */
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [vehiclesData, horsesData, activeTransports] = await Promise.all([
        getVehicles(activeMode, activeOrganization?.id),
        getHorses(activeMode, activeOrganization?.id),
        getTransportsByStatus('active', activeMode, activeOrganization?.id),
      ]);

      // Mark vehicles and horses that are in use
      const usedVehicleIds = new Set();
      const usedTrailerIds = new Set();
      const usedHorseIds = new Set();

      activeTransports.forEach(transport => {
        if (transport.vehicleId) usedVehicleIds.add(transport.vehicleId);
        if (transport.trailerId) usedTrailerIds.add(transport.trailerId);
        if (transport.horseIds) {
          transport.horseIds.forEach(id => usedHorseIds.add(id));
        }
      });

      // Add inUse flag to vehicles
      const vehiclesWithStatus = vehiclesData.map(v => ({
        ...v,
        inUse: usedVehicleIds.has(v.id) || usedTrailerIds.has(v.id),
      }));

      // Add inUse flag to horses
      const horsesWithStatus = horsesData.map(h => ({
        ...h,
        inUse: usedHorseIds.has(h.id),
      }));

      setVehicles(vehiclesWithStatus);
      setHorses(horsesWithStatus);
    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert('Fejl', 'Kunne ikke indlæse data');
    } finally {
      setLoading(false);
    }
  }, [activeMode, activeOrganization?.id]);

  /**
   * Toggle horse selection
   */
  const toggleHorseSelection = useCallback((horse) => {
    setSelectedHorses(prev => {
      if (prev.find(h => h.id === horse.id)) {
        return prev.filter(h => h.id !== horse.id);
      }
      return [...prev, horse];
    });
  }, []);

  /**
   * Handle date change
   */
  const handleDateChange = useCallback((event, date) => {
    if (event.type === 'set' && date) {
      setSelectedDate(date);
      setDepartureDate(date.toISOString().split('T')[0]);
    }
  }, []);

  /**
   * Handle time change
   */
  const handleTimeChange = useCallback((event, time) => {
    if (event.type === 'set' && time) {
      setSelectedTime(time);
      setDepartureTime(time.toTimeString().split(' ')[0].substring(0, 5));
    }
  }, []);

  /**
   * Clear date selection
   */
  const clearDate = useCallback(() => {
    setSelectedDate(null);
    setDepartureDate('');
  }, []);

  /**
   * Clear time selection
   */
  const clearTime = useCallback(() => {
    setSelectedTime(null);
    setDepartureTime('');
  }, []);

  // Load data on mount and when mode/org changes
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Reset form and refresh data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      if (!isEditMode) {
        resetForm();
      }
      loadData();
    }, [isEditMode, resetForm, loadData])
  );

  // Load transport data when in edit mode
  useEffect(() => {
    if (isEditMode && editTransport && vehicles.length > 0 && horses.length > 0) {
      // Populate form with existing transport data
      setFromLocation(editTransport.fromLocation || '');
      setToLocation(editTransport.toLocation || '');
      setDepartureDate(editTransport.departureDate || '');
      setDepartureTime(editTransport.departureTime || '');
      setNotes(editTransport.notes || '');

      // Find and set vehicle
      const vehicle = vehicles.find(v => v.id === editTransport.vehicleId);
      if (vehicle) setSelectedVehicle(vehicle);

      // Find and set trailer
      if (editTransport.trailerId) {
        const trailer = vehicles.find(v => v.id === editTransport.trailerId);
        if (trailer) setSelectedTrailer(trailer);
      }

      // Find and set horses
      if (editTransport.horseIds && editTransport.horseIds.length > 0) {
        const selectedHorsesData = horses.filter(h => editTransport.horseIds.includes(h.id));
        setSelectedHorses(selectedHorsesData);
      }

      // Parse and set dates
      if (editTransport.departureDate) {
        try {
          const date = new Date(editTransport.departureDate);
          setSelectedDate(date);
        } catch (e) {
          console.error('Error parsing date:', e);
        }
      }

      if (editTransport.departureTime) {
        try {
          const [hours, minutes] = editTransport.departureTime.split(':');
          const time = new Date();
          time.setHours(parseInt(hours), parseInt(minutes));
          setSelectedTime(time);
        } catch (e) {
          console.error('Error parsing time:', e);
        }
      }
    }
  }, [isEditMode, editTransport, vehicles, horses]);

  return {
    // Form state
    fromLocation,
    setFromLocation,
    toLocation,
    setToLocation,
    selectedVehicle,
    setSelectedVehicle,
    selectedTrailer,
    setSelectedTrailer,
    selectedHorses,
    setSelectedHorses,
    selectedDate,
    selectedTime,
    departureDate,
    departureTime,
    notes,
    setNotes,

    // Data state
    vehicles,
    horses,
    loading,

    // Flags
    isEditMode,

    // Handlers
    toggleHorseSelection,
    handleDateChange,
    handleTimeChange,
    clearDate,
    clearTime,
    resetForm,
    loadData,
  };
};

export default useTransportForm;
