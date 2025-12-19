/**
 * Custom hook for vehicle list management
 */
import { useState, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import { getVehicles } from '../../../services/vehicleService';
import { getTransportsByStatus } from '../../../services/transportService';
import { getCertificates } from '../../../services/documents/certificateService';

/**
 * Manages vehicle list loading and sorting
 *
 * @param {Object} options
 * @param {string} options.activeMode - 'private' or 'organization'
 * @param {Object} options.activeOrganization - Active organization object
 * @returns {Object} List state and handlers
 */
export const useVehicleList = ({ activeMode, activeOrganization }) => {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('recent');

  /**
   * Load vehicles with status and certificate counts
   */
  const loadVehicles = useCallback(async () => {
    try {
      setLoading(true);
      const [vehiclesData, activeTransports] = await Promise.all([
        getVehicles(activeMode, activeOrganization?.id),
        getTransportsByStatus('active', activeMode, activeOrganization?.id),
      ]);

      // Mark vehicles that are in active transports
      const usedVehicleIds = new Set();
      const usedTrailerIds = new Set();
      activeTransports.forEach(transport => {
        if (transport.vehicleId) usedVehicleIds.add(transport.vehicleId);
        if (transport.trailerId) usedTrailerIds.add(transport.trailerId);
      });

      // Fetch certificate counts for all vehicles
      const vehiclesWithCertCounts = await Promise.all(
        vehiclesData.map(async (v) => {
          try {
            const certificates = await getCertificates('vehicle', v.id);
            return {
              ...v,
              inTransport: usedVehicleIds.has(v.id) || usedTrailerIds.has(v.id),
              certificateCount: certificates.length,
            };
          } catch (error) {
            console.error(`Error fetching certificates for vehicle ${v.id}:`, error);
            return {
              ...v,
              inTransport: usedVehicleIds.has(v.id) || usedTrailerIds.has(v.id),
              certificateCount: 0,
            };
          }
        })
      );

      setVehicles(vehiclesWithCertCounts);
    } catch (error) {
      console.error('Error loading vehicles:', error);
      Alert.alert('Fejl', 'Kunne ikke indlæse køretøjer');
    } finally {
      setLoading(false);
    }
  }, [activeMode, activeOrganization?.id]);

  /**
   * Get sorted vehicles based on current sort option
   */
  const getSortedVehicles = useCallback(() => {
    const sorted = [...vehicles];

    switch (sortBy) {
      case 'name':
        return sorted.sort((a, b) => {
          const nameA = `${a.make} ${a.model}`.toLowerCase();
          const nameB = `${b.make} ${b.model}`.toLowerCase();
          return nameA.localeCompare(nameB);
        });

      case 'type':
        return sorted.sort((a, b) => {
          const typeA = a.vehicleType || '';
          const typeB = b.vehicleType || '';
          return typeA.localeCompare(typeB);
        });

      case 'weight':
        return sorted.sort((a, b) => {
          const weightA = a.totalWeight || 0;
          const weightB = b.totalWeight || 0;
          return weightB - weightA;
        });

      case 'plate':
        return sorted.sort((a, b) => {
          const plateA = a.licensePlate || '';
          const plateB = b.licensePlate || '';
          return plateA.localeCompare(plateB);
        });

      case 'recent':
      default:
        return sorted;
    }
  }, [vehicles, sortBy]);

  // Load vehicles on mount and when mode/org changes
  useEffect(() => {
    loadVehicles();
  }, [loadVehicles]);

  return {
    vehicles,
    loading,
    sortBy,
    setSortBy,
    loadVehicles,
    getSortedVehicles,
  };
};

export default useVehicleList;
