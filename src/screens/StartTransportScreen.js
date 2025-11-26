import React, { useState, useEffect } from 'react';

// Guided workflow for planning or logging a transport, including vehicle, horse, and route selection.
import { View, Text, ScrollView, TextInput, TouchableOpacity, Alert, ActivityIndicator, Pressable, Platform, Modal } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { ChevronRight, MapPin, Clock, Navigation, AlertTriangle, Plus, Caravan, X, Truck, Car, CarFront } from 'lucide-react-native';
import Toast from 'react-native-toast-message';
import { useOrganization } from '../context/OrganizationContext';
import { useTransport } from '../context/TransportContext';
import { useAuth } from '../context/AuthContext';
import { getVehicles } from '../services/vehicleService';
import { getHorses } from '../services/horseService';
import { createTransport, getTransportsByStatus, updateTransport } from '../services/transportService';
import { theme, colors } from '../styles/theme';
import { SCREEN_NAMES, navigateToTab } from '../constants/navigation';
import { useFocusEffect } from '@react-navigation/native';
import VehicleSelectionModal from '../components/VehicleSelectionModal';
import HorseSelectionModal from '../components/HorseSelectionModal';
import RouteMapModal from '../components/RouteMapModal';
import LocationAutocomplete from '../components/LocationAutocomplete';
import ComplianceChecklist from '../components/ComplianceChecklist';
import { getDirections, getCurrentLocation, reverseGeocode } from '../services/mapsService';
import { getComplianceRequirements, checkCompliance } from '../services/transportRegulationsService';
import { getAutoConfirmedDocuments, getCertificateCoverage } from '../services/certificateComplianceService';

const StartTransportScreen = ({ navigation, route }) => {
  const { activeMode, activeOrganization, hasPermission } = useOrganization();
  const { activeTransport, startTransport } = useTransport();
  const { user } = useAuth();

  // Edit mode - check if we're editing an existing transport
  const editTransport = route?.params?.editTransport;
  const isEditMode = !!editTransport;

  // Get vehicle icon based on type
  const getVehicleIcon = (type) => {
    switch (type) {
      case 'Personbil':
        return CarFront;
      case 'Lastbil':
        return Truck;
      case 'Varebil':
        return Car;
      case 'Påhængsvogn':
        return Caravan;
      default:
        return Truck;
    }
  };

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
  const [creating, setCreating] = useState(false);

  // Modal state
  const [showVehicleModal, setShowVehicleModal] = useState(false);
  const [showTrailerModal, setShowTrailerModal] = useState(false);
  const [showHorseModal, setShowHorseModal] = useState(false);
  const [showRouteMapModal, setShowRouteMapModal] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [tempDate, setTempDate] = useState(null);

  // Route state
  const [routeInfo, setRouteInfo] = useState(null);
  const [loadingRoute, setLoadingRoute] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [routeExpanded, setRouteExpanded] = useState(true);

  // Compliance state
  const [complianceRequirements, setComplianceRequirements] = useState(null);
  const [confirmedDocuments, setConfirmedDocuments] = useState([]);
  const [autoConfirmedDocuments, setAutoConfirmedDocuments] = useState([]);
  const [loadingCertificates, setLoadingCertificates] = useState(false);

  // Everyone can create their own transports
  const canCreate = true;

  const cancelDateSelection = () => {
    setShowDatePicker(false);
  };

  const handleDateChange = (event, date) => {
    if (event.type === 'set' && date) {
      setSelectedDate(date);
      setDepartureDate(date.toISOString().split('T')[0]);
    }
  };

  const handleTimeChange = (event, time) => {
    if (event.type === 'set' && time) {
      setSelectedTime(time);
      setDepartureTime(time.toTimeString().split(' ')[0].substring(0, 5));
    }
  };

  useEffect(() => {
    loadData();
  }, [activeMode, activeOrganization]);

  // Reset form and refresh data when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      if (!isEditMode) {
        // Only reset form if NOT in edit mode
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
        setRouteInfo(null);
        setComplianceRequirements(null);
        setConfirmedDocuments([]);
        setAutoConfirmedDocuments([]);
      }

      // Load fresh data
      loadData();
    }, [activeMode, activeOrganization, isEditMode])
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

      // Set route info if available
      if (editTransport.routeInfo) {
        setRouteInfo(editTransport.routeInfo);
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

  const loadData = async () => {
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
  };

  const toggleHorseSelection = (horse) => {
    if (selectedHorses.find(h => h.id === horse.id)) {
      setSelectedHorses(selectedHorses.filter(h => h.id !== horse.id));
    } else {
      setSelectedHorses([...selectedHorses, horse]);
    }
  };

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

              // Store auto-confirmed separately and merge with confirmed
              setAutoConfirmedDocuments(autoConfirmed);
              setConfirmedDocuments(prev => {
                const merged = new Set([...autoConfirmed, ...prev]);
                return Array.from(merged);
              });

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
        setRouteInfo(null);
        setComplianceRequirements(null);
      }
    };

    // Debounce route calculation
    const timeoutId = setTimeout(calculateRoute, 1000);
    return () => clearTimeout(timeoutId);
  }, [fromLocation, toLocation, selectedVehicle?.vehicleType, selectedVehicle?.id, selectedTrailer, selectedHorses]);

  const handleUseCurrentLocation = async () => {
    try {
      setGettingLocation(true);
      const location = await getCurrentLocation();
      const address = await reverseGeocode(location.latitude, location.longitude);
      setFromLocation(address.formattedAddress);
    } catch (error) {
      Alert.alert('Fejl', 'Kunne ikke hente din lokation. Sørg for at tilladelser er aktiveret.');
    } finally {
      setGettingLocation(false);
    }
  };

  const getButtonText = () => {
    // If in edit mode, always show "Gem Ændringer"
    if (isEditMode) {
      return 'Gem Ændringer';
    }

    // If no date or time chosen, use "Start Transport"
    if (!departureDate && !departureTime) {
      return 'Start Transport';
    }

    // If date and time are chosen, compare with now
    const now = new Date();
    const selectedDateTime = new Date(`${departureDate}T${departureTime}`);

    if (selectedDateTime < now) {
      return 'Log Transport';
    } else {
      return 'Plan Transport';
    }
  };

  const handleCreateTransport = async () => {
    if (!fromLocation.trim() || !toLocation.trim()) {
      Toast.show({
        type: 'error',
        text1: 'Fejl',
        text2: 'Indtast venligst fra og til lokation',
      });
      return;
    }

    if (!selectedVehicle) {
      Toast.show({
        type: 'error',
        text1: 'Fejl',
        text2: 'Vælg venligst et køretøj',
      });
      return;
    }

    if (selectedHorses.length === 0) {
      Toast.show({
        type: 'error',
        text1: 'Fejl',
        text2: 'Vælg venligst mindst én hest',
      });
      return;
    }

    if (selectedVehicle.capacity && selectedHorses.length > selectedVehicle.capacity) {
      Toast.show({
        type: 'error',
        text1: 'Fejl',
        text2: `Køretøjet kan kun transportere ${selectedVehicle.capacity} heste`,
      });
      return;
    }

    // Check compliance requirements
    if (complianceRequirements) {
      const complianceCheck = checkCompliance(complianceRequirements, confirmedDocuments);
      if (!complianceCheck.isCompliant) {
        Toast.show({
          type: 'error',
          text1: 'Manglende Dokumentation',
          text2: `${complianceCheck.missing.length} påkrævet(e) dokument(er) er ikke bekræftet`,
        });
        return;
      }
    }

    // Determine status based on date/time
    const buttonText = getButtonText();
    let transportStatus = 'planned';

    // In edit mode, keep the existing status
    if (isEditMode) {
      transportStatus = editTransport.status;
      proceedWithCreation(transportStatus);
      return;
    }

    if (buttonText === 'Start Transport') {
      // Check if there's already an active transport owned by this user
      try {
        const activeTransports = await getTransportsByStatus('active', activeMode, activeOrganization?.id);
        const ownActiveTransports = activeTransports.filter(t => t.ownerId === user?.uid);
        if (ownActiveTransports && ownActiveTransports.length > 0) {
          Toast.show({
            type: 'error',
            text1: 'Aktiv Transport',
            text2: 'Du har allerede en aktiv transport. Afslut den først.',
          });
          return;
        }
      } catch (error) {
        console.error('Error checking active transports:', error);
      }
      transportStatus = 'active';
    } else if (buttonText === 'Log Transport') {
      // Ask user if they want to mark as active or log as past transport
      Alert.alert(
        'Log Transport',
        'Vil du markere denne transport som aktiv nu, eller logge den som tidligere transport?',
        [
          {
            text: 'Annuller',
            style: 'cancel',
            onPress: () => setCreating(false)
          },
          {
            text: 'Log som tidligere',
            onPress: () => proceedWithCreation('completed')
          },
          {
            text: 'Marker som aktiv',
            onPress: () => proceedWithCreation('active')
          }
        ]
      );
      return;
    } else if (buttonText === 'Plan Transport') {
      transportStatus = 'planned';
    }

    proceedWithCreation(transportStatus);
  };

  const proceedWithCreation = async (status) => {
    try {
      setCreating(true);

      // Use current date/time if not provided
      const now = new Date();
      const defaultDate = now.toISOString().split('T')[0]; // YYYY-MM-DD
      const defaultTime = now.toTimeString().split(' ')[0].substring(0, 5); // HH:MM

      // Calculate estimated arrival if we have route info
      let estimatedArrivalDate = null;
      let estimatedArrivalTime = null;
      if (routeInfo?.duration?.value) {
        const departureDateTime = new Date(`${departureDate.trim() || defaultDate}T${departureTime.trim() || defaultTime}`);
        if (!isNaN(departureDateTime.getTime())) {
          const estimatedArrival = new Date(departureDateTime.getTime() + (routeInfo.duration.value * 1000));
          if (!isNaN(estimatedArrival.getTime())) {
            estimatedArrivalDate = estimatedArrival.toISOString().split('T')[0];
            estimatedArrivalTime = estimatedArrival.toTimeString().split(' ')[0].substring(0, 5);
          }
        }
      }

      const transportData = {
        fromLocation: fromLocation.trim(),
        toLocation: toLocation.trim(),
        vehicleId: selectedVehicle.id,
        vehicleName: `${selectedVehicle.make} ${selectedVehicle.model} (${selectedVehicle.licensePlate})`,
        trailerId: selectedTrailer?.id || null,
        trailerName: selectedTrailer ? `${selectedTrailer.make} ${selectedTrailer.model} (${selectedTrailer.licensePlate})` : null,
        horseIds: selectedHorses.map(h => h.id),
        horseNames: selectedHorses.map(h => h.name),
        horseCount: selectedHorses.length,
        departureDate: departureDate.trim() || defaultDate,
        departureTime: departureTime.trim() || defaultTime,
        estimatedArrivalDate,
        estimatedArrivalTime,
        notes: notes.trim() || null,
        status: status, // planned, active, completed, cancelled
        // Track actual start time when status is active
        actualStartTime: status === 'active' ? now.toISOString() : null,
        actualEndTime: status === 'completed' ? now.toISOString() : null,
        // Route information
        routeInfo: routeInfo ? {
          distance: routeInfo.distance.value,
          distanceText: routeInfo.distance.text,
          duration: routeInfo.duration.value,
          durationText: routeInfo.duration.text,
          borderCrossing: routeInfo.borderCrossing,
          countries: routeInfo.countries,
          polyline: routeInfo.polyline,
        } : null,
        // Compliance information
        complianceRequirements: complianceRequirements,
        confirmedDocuments: confirmedDocuments,
      };

      let result;
      if (isEditMode) {
        // Update existing transport
        await updateTransport(editTransport.id, transportData);
        result = { id: editTransport.id, ...transportData };
      } else {
        // Create new transport
        result = await createTransport(transportData, activeMode, activeOrganization?.id);
      }

      // If status is active, update TransportContext
      if (status === 'active') {
        startTransport(result);
      }

      // Show success toast
      Toast.show({
        type: 'success',
        text1: 'Succes!',
        text2: isEditMode
          ? 'Transport opdateret'
          : status === 'active'
            ? 'Transport startet'
            : status === 'completed'
              ? 'Transport logget'
              : 'Transport planlagt',
      });

      // Navigate back or to home
      setTimeout(() => {
        if (isEditMode) {
          navigation.goBack();
        } else {
          navigation.navigate('MainTabs', { screen: 'Home' });
        }
      }, 1000);
    } catch (error) {
      console.error('Error creating transport:', error);
      Toast.show({
        type: 'error',
        text1: 'Fejl',
        text2: error.message || 'Kunne ikke oprette transport',
      });
    } finally {
      setCreating(false);
    }
  };

  if (!canCreate) {
    return (
      <View style={[theme.container, { justifyContent: 'center', alignItems: 'center', padding: 20 }]}>
        <Text style={{ fontSize: 16, color: colors.secondary, textAlign: 'center' }}>
          Du har ikke tilladelse til at oprette transporter i denne organisation.
        </Text>
        <TouchableOpacity
          style={[theme.primaryButton, { marginTop: 20 }]}
          onPress={() => navigation.goBack()}
        >
          <Text style={theme.primaryButtonText}>Tilbage</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={[theme.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.secondary} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.secondary }}>
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingTop: 60, paddingBottom: 400, flexGrow: 1 }}
        showsVerticalScrollIndicator={true}
        keyboardShouldPersistTaps="handled"
        scrollEnabled={true}
      >
        {/* Header */}
        <View style={{ marginBottom: 16 }}>
          <Text style={{ fontSize: 24, fontWeight: 'bold', color: colors.primary }}>
            {isEditMode ? 'Rediger Transport' : 'Start Ny Transport'}
          </Text>
          <Text style={{ fontSize: 14, color: '#666', marginTop: 4 }}>
            {activeMode === 'private' ? 'Privat transport' : `${activeOrganization?.name}`}
          </Text>
        </View>

        {/* From Location */}
        <View style={{ marginBottom: 16, zIndex: 20 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <Text style={{ fontSize: 14, fontWeight: '600', color: colors.primary }}>
              Fra lokation *
            </Text>
            <TouchableOpacity
              onPress={handleUseCurrentLocation}
              disabled={gettingLocation}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
            >
              {gettingLocation ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <>
                  <MapPin size={16} color={colors.primary} />
                  <Text style={{ fontSize: 12, color: colors.primary, fontWeight: '600' }}>
                    Brug min lokation
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
          <LocationAutocomplete
            value={fromLocation}
            onChangeText={setFromLocation}
            placeholder="F.eks. København"
            style={{
              backgroundColor: colors.white,
              padding: 14,
              borderRadius: 8,
              fontSize: 16,
              color: colors.primary,
              borderWidth: 1,
              borderColor: '#ccc',
            }}
          />
        </View>

        {/* To Location */}
        <View style={{ marginBottom: 16, zIndex: 10 }}>
          <Text style={{ fontSize: 14, fontWeight: '600', color: colors.primary, marginBottom: 8 }}>
            Til lokation *
          </Text>
          <LocationAutocomplete
            value={toLocation}
            onChangeText={setToLocation}
            placeholder="F.eks. Hamburg, Tyskland"
            style={{
              backgroundColor: colors.white,
              padding: 14,
              borderRadius: 8,
              fontSize: 16,
              color: colors.primary,
              borderWidth: 1,
              borderColor: '#ccc',
            }}
          />
        </View>

        {/* Route Preview */}
        {loadingRoute && (
          <View style={{
            backgroundColor: colors.white,
            padding: 16,
            borderRadius: 12,
            marginBottom: 20,
            alignItems: 'center',
          }}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={{ fontSize: 14, color: '#666', marginTop: 8 }}>
              Beregner rute...
            </Text>
          </View>
        )}

        {routeInfo && !loadingRoute && (
          <View style={{
            backgroundColor: colors.white,
            padding: 16,
            borderRadius: 12,
            marginBottom: 20,
            borderWidth: 1,
            borderColor: routeInfo.borderCrossing ? '#ffc107' : '#e0e0e0',
          }}>
            <TouchableOpacity
              style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}
              onPress={() => setRouteExpanded(!routeExpanded)}
            >
              <Navigation size={20} color={colors.primary} />
              <Text style={{ fontSize: 16, fontWeight: 'bold', color: colors.primary, marginLeft: 8, flex: 1 }}>
                Rute Oversigt
              </Text>
              <Text style={{ fontSize: 20, color: colors.primary }}>
                {routeExpanded ? '−' : '+'}
              </Text>
            </TouchableOpacity>

            {routeExpanded && <View style={{ flexDirection: 'row', gap: 16, marginBottom: 8 }}>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <MapPin size={16} color="#666" />
                  <Text style={{ fontSize: 14, color: '#666' }}>Afstand</Text>
                </View>
                <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.primary, marginTop: 4 }}>
                  {routeInfo.distance.text}
                </Text>
              </View>

              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Clock size={16} color="#666" />
                  <Text style={{ fontSize: 14, color: '#666' }}>Tid</Text>
                </View>
                <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.primary, marginTop: 4 }}>
                  {routeInfo.duration.text}
                </Text>
              </View>
            </View>}

            {routeExpanded && routeInfo.duration.isAdjusted && (
              <View style={{
                backgroundColor: '#e3f2fd',
                padding: 8,
                borderRadius: 6,
                marginTop: 8,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
              }}>
                <Clock size={14} color="#1976d2" />
                <Text style={{ fontSize: 12, color: '#1976d2', flex: 1 }}>
                  {selectedVehicle?.vehicleType === 'Lastbil'
                    ? 'Tid justeret for lastbil (max 90 km/t)'
                    : selectedTrailer
                    ? 'Tid justeret for køretøj med trailer (max 90 km/t)'
                    : 'Tid justeret (max 90 km/t)'}
                </Text>
              </View>
            )}

            {routeExpanded && routeInfo.trafficDelay.value > 300 && (
              <View style={{
                backgroundColor: '#fff3cd',
                padding: 8,
                borderRadius: 6,
                marginTop: 8,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
              }}>
                <Clock size={14} color="#856404" />
                <Text style={{ fontSize: 12, color: '#856404', flex: 1 }}>
                  +{routeInfo.trafficDelay.text} pga. trafik
                </Text>
              </View>
            )}

            {routeExpanded && routeInfo.borderCrossing && (
              <View style={{
                backgroundColor: '#fff3cd',
                padding: 12,
                borderRadius: 6,
                marginTop: 8,
                borderLeftWidth: 4,
                borderLeftColor: '#ffc107',
              }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <AlertTriangle size={16} color="#856404" />
                  <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#856404' }}>
                    Grænseoverskridelse
                  </Text>
                </View>
                <Text style={{ fontSize: 12, color: '#856404' }}>
                  Denne rute krydser landegrænser: {routeInfo.countries.join(', ')}
                </Text>
                <Text style={{ fontSize: 11, color: '#856404', marginTop: 4, fontStyle: 'italic' }}>
                  Husk sundhedscertifikater og tolddokumentation for hestetratsport.
                </Text>
              </View>
            )}

            {/* View Route Button */}
            {routeExpanded && <TouchableOpacity
              style={{
                backgroundColor: colors.primary,
                padding: 12,
                borderRadius: 8,
                marginTop: 12,
                alignItems: 'center',
              }}
              onPress={() => setShowRouteMapModal(true)}
            >
              <Text style={{ color: colors.white, fontSize: 14, fontWeight: '600' }}>
                Se Rute på Kort
              </Text>
            </TouchableOpacity>}
          </View>
        )}

        {/* Departure Date & Time */}
        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 20 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 14, fontWeight: '600', color: colors.primary, marginBottom: 8 }}>
              Dato (valgfri)
            </Text>
            <View style={{
              backgroundColor: colors.white,
              borderRadius: 8,
              borderWidth: 1,
              borderColor: '#ccc',
              paddingHorizontal: 14,
              paddingVertical: 4,
              minHeight: 50,
              justifyContent: 'center',
            }}>
              <DateTimePicker
                value={selectedDate || new Date()}
                mode="date"
                display="default"
                onChange={(event, date) => {
                  if (event.type === 'set' && date) {
                    setSelectedDate(date);
                    setDepartureDate(date.toISOString().split('T')[0]);
                  }
                }}
                style={{
                  backgroundColor: 'transparent',
                  width: '100%',
                }}
                textColor={colors.primary}
              />
            </View>
            {selectedDate && Platform.OS === 'web' && (
              <TouchableOpacity
                style={{ marginTop: 4 }}
                onPress={() => {
                  setSelectedDate(null);
                  setDepartureDate('');
                }}
              >
                <Text style={{ fontSize: 12, color: colors.secondary }}>Ryd dato</Text>
              </TouchableOpacity>
            )}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 14, fontWeight: '600', color: colors.primary, marginBottom: 8 }}>
              Tidspunkt (valgfri)
            </Text>
            <View style={{
              backgroundColor: colors.white,
              borderRadius: 8,
              borderWidth: 1,
              borderColor: '#ccc',
              paddingHorizontal: 14,
              paddingVertical: 4,
              minHeight: 50,
              justifyContent: 'center',
            }}>
              <DateTimePicker
                value={selectedTime || new Date()}
                mode="time"
                display="default"
                onChange={(event, time) => {
                  if (event.type === 'set' && time) {
                    setSelectedTime(time);
                    setDepartureTime(time.toTimeString().split(' ')[0].substring(0, 5));
                  }
                }}
                style={{
                  backgroundColor: 'transparent',
                  width: '100%',
                }}
                textColor={colors.primary}
              />
            </View>
            {selectedTime && Platform.OS === 'web' && (
              <TouchableOpacity
                style={{ marginTop: 4 }}
                onPress={() => {
                  setSelectedTime(null);
                  setDepartureTime('');
                }}
              >
                <Text style={{ fontSize: 12, color: colors.secondary }}>Ryd tidspunkt</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>


        {/* Web Date Picker */}
        {Platform.OS === 'web' && (
          <Modal
            visible={showDatePicker}
            animationType="fade"
            transparent={true}
            onRequestClose={cancelDateSelection}
          >
            <View style={{
              flex: 1,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              justifyContent: 'center',
              alignItems: 'center',
            }}>
              <View style={{
                backgroundColor: '#f5f5f5',
                padding: 20,
                borderRadius: 12,
                minWidth: 300,
              }}>
                <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.primary, marginBottom: 16 }}>
                  Vælg Dato
                </Text>
                <input
                  type="date"
                  value={tempDate ? tempDate.toISOString().split('T')[0] : ''}
                  onChange={(e) => {
                    if (e.target.value) {
                      const date = new Date(e.target.value + 'T00:00:00');
                      setTempDate(date);
                    }
                  }}
                  style={{
                    width: '100%',
                    padding: 12,
                    fontSize: 16,
                    borderRadius: 8,
                    border: '1px solid #ccc',
                    marginBottom: 16,
                  }}
                />
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <TouchableOpacity
                    style={{
                      flex: 1,
                      padding: 12,
                      backgroundColor: '#e0e0e0',
                      borderRadius: 8,
                      alignItems: 'center',
                    }}
                    onPress={cancelDateSelection}
                  >
                    <Text style={{ color: colors.primary, fontWeight: 'bold' }}>Annuller</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={{
                      flex: 1,
                      padding: 12,
                      backgroundColor: colors.primary,
                      borderRadius: 8,
                      alignItems: 'center',
                    }}
                    onPress={saveDateSelection}
                  >
                    <Text style={{ color: colors.white, fontWeight: 'bold' }}>Gem</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
        )}

        {/* Web Time Picker */}
        {Platform.OS === 'web' && (
          <Modal
            visible={showTimePicker}
            animationType="fade"
            transparent={true}
            onRequestClose={cancelTimeSelection}
          >
            <View style={{
              flex: 1,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              justifyContent: 'center',
              alignItems: 'center',
            }}>
              <View style={{
                backgroundColor: '#f5f5f5',
                padding: 20,
                borderRadius: 12,
                minWidth: 300,
              }}>
                <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.primary, marginBottom: 16 }}>
                  Vælg Tidspunkt
                </Text>
                <input
                  type="time"
                  value={tempTime ? tempTime.toTimeString().split(' ')[0].substring(0, 5) : ''}
                  onChange={(e) => {
                    if (e.target.value) {
                      const time = new Date(`2000-01-01T${e.target.value}`);
                      setTempTime(time);
                    }
                  }}
                  style={{
                    width: '100%',
                    padding: 12,
                    fontSize: 16,
                    borderRadius: 8,
                    border: '1px solid #ccc',
                    marginBottom: 16,
                  }}
                />
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <TouchableOpacity
                    style={{
                      flex: 1,
                      padding: 12,
                      backgroundColor: '#e0e0e0',
                      borderRadius: 8,
                      alignItems: 'center',
                    }}
                    onPress={cancelTimeSelection}
                  >
                    <Text style={{ color: colors.primary, fontWeight: 'bold' }}>Annuller</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={{
                      flex: 1,
                      padding: 12,
                      backgroundColor: colors.primary,
                      borderRadius: 8,
                      alignItems: 'center',
                    }}
                    onPress={saveTimeSelection}
                  >
                    <Text style={{ color: colors.white, fontWeight: 'bold' }}>Gem</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
        )}

        {/* Vehicle Selection with Trailer Badge */}
        <View style={{ marginBottom: 20 }}>
          <Text style={{ fontSize: 14, fontWeight: '600', color: colors.primary, marginBottom: 8 }}>
            Køretøj *
          </Text>
          <View style={{ position: 'relative' }}>
            <Pressable
              style={{
                backgroundColor: colors.white,
                padding: 16,
                borderRadius: 8,
                borderWidth: 1,
                borderColor: selectedVehicle ? colors.primary : '#ccc',
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
              onPress={() => setShowVehicleModal(true)}
            >
              {selectedVehicle ? (
                <>
                  {/* Vehicle Icon */}
                  <View style={{
                    width: 44,
                    height: 44,
                    borderRadius: 22,
                    backgroundColor: colors.secondary,
                    justifyContent: 'center',
                    alignItems: 'center',
                    marginRight: 12,
                  }}>
                    {React.createElement(getVehicleIcon(selectedVehicle.vehicleType), {
                      size: 22,
                      color: colors.primary,
                      strokeWidth: 2
                    })}
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 16, fontWeight: 'bold', color: colors.primary }}>
                      {selectedVehicle.licensePlate}
                    </Text>
                    <Text style={{ fontSize: 14, color: '#666', marginTop: 2 }}>
                      {selectedVehicle.make} {selectedVehicle.model}
                    </Text>
                    {selectedVehicle.capacity && (
                      <Text style={{ fontSize: 12, color: '#999', marginTop: 2 }}>
                        Kapacitet: {selectedVehicle.capacity} heste
                      </Text>
                    )}
                  </View>
                </>
              ) : (
                <Text style={{ fontSize: 16, color: '#999' }}>
                  Vælg køretøj...
                </Text>
              )}
              <ChevronRight size={20} color={colors.primary} />
            </Pressable>

            {/* Trailer Badge - shown when trailer is selected */}
            {selectedTrailer && (
              <View
                style={{
                  position: 'absolute',
                  top: -10,
                  right: -10,
                  backgroundColor: colors.primary,
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 20,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.25,
                  shadowRadius: 4,
                  elevation: 5,
                }}
              >
                <Pressable onPress={() => setShowTrailerModal(true)} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Caravan size={16} color={colors.white} strokeWidth={2} />
                  <Text style={{ color: colors.white, fontSize: 12, fontWeight: '600' }}>
                    {selectedTrailer.licensePlate}
                  </Text>
                </Pressable>
                <TouchableOpacity onPress={() => setSelectedTrailer(null)} style={{ marginLeft: 4 }}>
                  <X size={16} color={colors.white} strokeWidth={2.5} />
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Add Trailer Button - shown when vehicle is selected */}
          {selectedVehicle && !selectedTrailer && (
            <TouchableOpacity
              style={{
                marginTop: 12,
                backgroundColor: colors.secondary,
                paddingHorizontal: 16,
                paddingVertical: 12,
                borderRadius: 8,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                borderWidth: 1,
                borderColor: colors.border,
              }}
              onPress={() => setShowTrailerModal(true)}
            >
              <Caravan size={20} color={colors.primary} strokeWidth={2} />
              <Plus size={20} color={colors.primary} strokeWidth={2.5} />
              <Text style={{ fontSize: 14, fontWeight: '600', color: colors.primary }}>
                Tilføj trailer
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Horse Selection */}
        <View style={{ marginBottom: 20 }}>
          <Text style={{ fontSize: 14, fontWeight: '600', color: colors.primary, marginBottom: 8 }}>
            Heste * ({selectedHorses.length} valgt)
          </Text>
          <Pressable
            style={{
              backgroundColor: colors.white,
              padding: 16,
              borderRadius: 8,
              borderWidth: 1,
              borderColor: selectedHorses.length > 0 ? colors.primary : '#ccc',
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
            onPress={() => setShowHorseModal(true)}
          >
            {selectedHorses.length > 0 ? (
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 16, fontWeight: 'bold', color: colors.primary }}>
                  {selectedHorses.length} {selectedHorses.length === 1 ? 'hest' : 'heste'} valgt
                </Text>
                <Text style={{ fontSize: 14, color: '#666', marginTop: 2 }}>
                  {selectedHorses.map(h => h.name).join(', ')}
                </Text>
              </View>
            ) : (
              <Text style={{ fontSize: 16, color: '#999' }}>
                Vælg heste...
              </Text>
            )}
            <ChevronRight size={20} color={colors.primary} />
          </Pressable>
        </View>

        {/* Compliance Checklist - shown when route info is available */}
        {complianceRequirements && (
          <View>
            {loadingCertificates && (
              <View style={{
                backgroundColor: colors.white,
                padding: 12,
                borderRadius: 8,
                marginBottom: 12,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
              }}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={{ fontSize: 14, color: '#666' }}>
                  Tjekker uploadede certifikater...
                </Text>
              </View>
            )}
            <ComplianceChecklist
              requirements={complianceRequirements}
              confirmedDocuments={confirmedDocuments}
              autoConfirmedDocuments={autoConfirmedDocuments}
              onToggleDocument={(docId) => {
                setConfirmedDocuments(prev =>
                  prev.includes(docId)
                    ? prev.filter(id => id !== docId)
                    : [...prev, docId]
                );
              }}
              editable={true}
            />
          </View>
        )}

        {/* Action Buttons */}
        <View style={{ marginBottom: 40 }}>
          <TouchableOpacity
            style={[
              {
                backgroundColor: colors.primary,
                padding: 16,
                borderRadius: 8,
                alignItems: 'center',
              },
              creating && { opacity: 0.5 }
            ]}
            onPress={handleCreateTransport}
            disabled={creating}
          >
            {creating ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={{ color: colors.white, fontSize: 16, fontWeight: 'bold' }}>
                {getButtonText()}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={{
              padding: 16,
              alignItems: 'center',
              marginTop: 8,
            }}
            onPress={() => navigation.goBack()}
            disabled={creating}
          >
            <Text style={{ color: colors.secondary, fontSize: 16 }}>Annuller</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Vehicle Selection Modal */}
      <VehicleSelectionModal
        visible={showVehicleModal}
        vehicles={vehicles}
        selectedVehicle={selectedVehicle}
        onSelect={setSelectedVehicle}
        onClose={() => setShowVehicleModal(false)}
        onManageVehicles={() => {
          setShowVehicleModal(false);
          navigateToTab(navigation, SCREEN_NAMES.VEHICLE_MANAGEMENT);
        }}
        isTrailerSelection={false}
      />

      {/* Trailer Selection Modal */}
      <VehicleSelectionModal
        visible={showTrailerModal}
        vehicles={vehicles}
        selectedVehicle={selectedTrailer}
        onSelect={setSelectedTrailer}
        onClose={() => setShowTrailerModal(false)}
        onManageVehicles={() => {
          setShowTrailerModal(false);
          navigateToTab(navigation, SCREEN_NAMES.VEHICLE_MANAGEMENT);
        }}
        isTrailerSelection={true}
      />

      {/* Horse Selection Modal */}
      <HorseSelectionModal
        visible={showHorseModal}
        horses={horses}
        selectedHorses={selectedHorses}
        onToggleHorse={toggleHorseSelection}
        onClose={() => setShowHorseModal(false)}
        onManageHorses={() => {
          setShowHorseModal(false);
          navigateToTab(navigation, SCREEN_NAMES.HORSE_MANAGEMENT);
        }}
        vehicleCapacity={selectedVehicle?.capacity}
      />

      {/* Route Map Modal */}
      <RouteMapModal
        visible={showRouteMapModal}
        onClose={() => setShowRouteMapModal(false)}
        routeInfo={routeInfo}
        fromLocation={fromLocation}
        toLocation={toLocation}
      />
    </View>
  );
};

export default StartTransportScreen;
