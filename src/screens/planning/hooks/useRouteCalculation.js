/**
 * Custom hook for route calculation and compliance checking
 */
import { useState, useEffect } from 'react';
import Toast from 'react-native-toast-message';
import { getDirections } from '../../../services/mapsService';
import { getComplianceRequirements } from '../../../services/transportRegulationsService';
import { getAutoConfirmedDocuments } from '../../../services/documents/certificateComplianceService';

/**
 * Manages route calculation and compliance requirements
 *
 * @param {Object} options
 * @param {string} options.fromLocation - Start location
 * @param {string} options.toLocation - End location
 * @param {Object} options.selectedVehicle - Selected vehicle
 * @param {Object} options.selectedTrailer - Selected trailer (optional)
 * @param {Array} options.selectedHorses - Selected horses array
 * @param {string} options.activeMode - 'private' or 'organization'
 * @param {Object} options.activeOrganization - Active organization object
 * @param {Object} options.editTransport - Transport being edited (optional)
 * @returns {Object} Route and compliance state
 */
export const useRouteCalculation = ({
  fromLocation,
  toLocation,
  selectedVehicle,
  selectedTrailer,
  selectedHorses,
  activeMode,
  activeOrganization,
  editTransport,
}) => {
  // Route state
  const [routeInfo, setRouteInfo] = useState(null);
  const [loadingRoute, setLoadingRoute] = useState(false);
  const [routeExpanded, setRouteExpanded] = useState(true);

  // Compliance state
  const [complianceRequirements, setComplianceRequirements] = useState(null);
  const [confirmedDocuments, setConfirmedDocuments] = useState([]);
  const [autoConfirmedDocuments, setAutoConfirmedDocuments] = useState([]);
  const [loadingCertificates, setLoadingCertificates] = useState(false);

  /**
   * Toggle document confirmation
   */
  const toggleDocumentConfirmation = (docId) => {
    setConfirmedDocuments(prev =>
      prev.includes(docId)
        ? prev.filter(id => id !== docId)
        : [...prev, docId]
    );
  };

  /**
   * Reset compliance state
   */
  const resetCompliance = () => {
    setComplianceRequirements(null);
    setConfirmedDocuments([]);
    setAutoConfirmedDocuments([]);
  };

  /**
   * Refresh auto-confirmed documents (call after uploading new documents)
   */
  const refreshAutoConfirmed = async () => {
    if (!complianceRequirements || activeMode !== 'organization' || !activeOrganization?.id) {
      return;
    }

    setLoadingCertificates(true);
    try {
      const horseIds = selectedHorses.map(h => h.id);
      const autoConfirmed = await getAutoConfirmedDocuments(
        complianceRequirements,
        activeOrganization.id,
        selectedVehicle?.id,
        horseIds
      );

      setAutoConfirmedDocuments(autoConfirmed);
      setConfirmedDocuments(prev => {
        const merged = new Set([...autoConfirmed, ...prev]);
        return Array.from(merged);
      });

      if (autoConfirmed.length > 0) {
        Toast.show({
          type: 'success',
          text1: 'Certifikater opdateret',
          text2: `${autoConfirmed.length} dokument(er) auto-bekræftet`,
          visibilityTime: 2000,
        });
      }
    } catch (error) {
      console.error('Error refreshing auto-confirmed documents:', error);
    } finally {
      setLoadingCertificates(false);
    }
  };

  // Load route info from edit transport if available
  useEffect(() => {
    if (editTransport?.routeInfo) {
      setRouteInfo(editTransport.routeInfo);
    }
  }, [editTransport]);

  // Calculate route and compliance requirements when locations change
  useEffect(() => {
    const calculateRoute = async () => {
      // Only calculate if both locations are filled and have reasonable length
      if (fromLocation.trim().length > 5 && toLocation.trim().length > 5) {
        setLoadingRoute(true);
        try {
          // Pass vehicle type and trailer status to get adjusted duration
          const route = await getDirections(
            fromLocation,
            toLocation,
            selectedVehicle?.vehicleType,
            !!selectedTrailer // hasTrailer
          );
          setRouteInfo(route);

          // Calculate compliance requirements based on route
          const distanceKm = route.distance.km || (route.distance.value / 1000);
          const requirements = getComplianceRequirements(
            route,
            distanceKm,
            route.borderCrossing,
            route.countries,
            selectedVehicle?.vehicleType
          );
          setComplianceRequirements(requirements);

          // Auto-check documents based on available certificates (only for organization mode)
          if (activeMode === 'organization' && activeOrganization?.id) {
            setLoadingCertificates(true);
            try {
              const horseIds = selectedHorses.map(h => h.id);
              const autoConfirmed = await getAutoConfirmedDocuments(
                requirements,
                activeOrganization.id,
                selectedVehicle?.id,
                horseIds
              );

              // Store auto-confirmed and reset confirmed to only auto-confirmed
              // This ensures previous manual checks don't persist to new transports
              setAutoConfirmedDocuments(autoConfirmed);
              setConfirmedDocuments(autoConfirmed);

              if (autoConfirmed.length > 0) {
                const sources = [];
                if (activeOrganization?.id) sources.push('organisation');
                if (selectedVehicle?.id) sources.push('køretøj');
                if (horseIds.length > 0) sources.push('heste');

                Toast.show({
                  type: 'success',
                  text1: 'Certifikater fundet',
                  text2: `${autoConfirmed.length} dokument(er) auto-bekræftet fra ${sources.join(', ')}`,
                  visibilityTime: 3000,
                });
              }
            } catch (error) {
              console.error('Error auto-confirming documents:', error);
            } finally {
              setLoadingCertificates(false);
            }
          }

        } catch (error) {
          console.error('Error calculating route:', error);
          setRouteInfo(null);
          setComplianceRequirements(null);
        } finally {
          setLoadingRoute(false);
        }
      } else {
        // Reset all state when locations are cleared/empty
        setRouteInfo(null);
        setComplianceRequirements(null);
        setConfirmedDocuments([]);
        setAutoConfirmedDocuments([]);
      }
    };

    // Debounce route calculation
    const timeoutId = setTimeout(calculateRoute, 1000);
    return () => clearTimeout(timeoutId);
  }, [
    fromLocation,
    toLocation,
    selectedVehicle?.vehicleType,
    selectedVehicle?.id,
    selectedTrailer,
    selectedHorses,
    activeMode,
    activeOrganization?.id,
  ]);

  return {
    // Route state
    routeInfo,
    loadingRoute,
    routeExpanded,
    setRouteExpanded,

    // Compliance state
    complianceRequirements,
    confirmedDocuments,
    autoConfirmedDocuments,
    loadingCertificates,

    // Handlers
    toggleDocumentConfirmation,
    resetCompliance,
    refreshAutoConfirmed,
  };
};

export default useRouteCalculation;
