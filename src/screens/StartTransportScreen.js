import React, { useState, useEffect } from 'react';

// Guided workflow for planning or logging a transport, including vehicle, horse, and route selection.
import { View, Text, ScrollView, TextInput, TouchableOpacity, Alert, ActivityIndicator, Pressable, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { ChevronRight, MapPin, Clock, Navigation, AlertTriangle, Calendar } from 'lucide-react-native';
import Toast from 'react-native-toast-message';
import { useOrganization } from '../context/OrganizationContext';
import { useTransport } from '../context/TransportContext';
import { getVehicles } from '../services/vehicleService';
import { getHorses } from '../services/horseService';
import { createTransport, getTransportsByStatus } from '../services/transportService';
import { sharedStyles, colors } from '../styles/sharedStyles';
import { useFocusEffect } from '@react-navigation/native';
import VehicleSelectionModal from '../components/VehicleSelectionModal';
import HorseSelectionModal from '../components/HorseSelectionModal';
import RouteMapModal from '../components/RouteMapModal';
import LocationAutocomplete from '../components/LocationAutocomplete';
import { getDirections, getCurrentLocation, reverseGeocode } from '../services/mapsService';

const StartTransportScreen = ({ navigation }) => {
  const { activeMode, activeOrganization, hasPermission } = useOrganization();
  const { activeTransport, startTransport } = useTransport();

  // Form state
  const [fromLocation, setFromLocation] = useState('');
  const [toLocation, setToLocation] = useState('');
  const [selectedVehicle, setSelectedVehicle] = useState(null);
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
  const [showHorseModal, setShowHorseModal] = useState(false);
  const [showRouteMapModal, setShowRouteMapModal] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  // Route state
  const [routeInfo, setRouteInfo] = useState(null);
  const [loadingRoute, setLoadingRoute] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [routeExpanded, setRouteExpanded] = useState(true);

  const canCreate = activeMode === 'private' || hasPermission('canManageTours');

  useEffect(() => {
    loadData();
  }, [activeMode, activeOrganization]);

  // Refresh data when screen comes into focus (after creating new vehicle/horse)
  useFocusEffect(
    React.useCallback(() => {
      loadData();
    }, [activeMode, activeOrganization])
  );

  const loadData = async () => {
    try {
      setLoading(true);
      const [vehiclesData, horsesData] = await Promise.all([
        getVehicles(activeMode, activeOrganization?.id),
        getHorses(activeMode, activeOrganization?.id)
      ]);
      setVehicles(vehiclesData);
      setHorses(horsesData);
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

  // Calculate route when both locations are filled
  useEffect(() => {
    const calculateRoute = async () => {
      // Only calculate if both locations are filled and have reasonable length
      if (fromLocation.trim().length > 5 && toLocation.trim().length > 5) {
        setLoadingRoute(true);
        try {
          const route = await getDirections(fromLocation, toLocation);
          setRouteInfo(route);
        } catch (error) {
          console.error('Error calculating route:', error);
          setRouteInfo(null);
        } finally {
          setLoadingRoute(false);
        }
      } else {
        setRouteInfo(null);
      }
    };

    // Debounce route calculation
    const timeoutId = setTimeout(calculateRoute, 1000);
    return () => clearTimeout(timeoutId);
  }, [fromLocation, toLocation]);

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

    // Determine status based on date/time
    const buttonText = getButtonText();
    let transportStatus = 'planned';

    if (buttonText === 'Start Transport') {
      // Check if there's already an active transport in database
      try {
        const activeTransports = await getTransportsByStatus('active', activeMode, activeOrganization?.id);
        if (activeTransports && activeTransports.length > 0) {
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

      const transportData = {
        fromLocation: fromLocation.trim(),
        toLocation: toLocation.trim(),
        vehicleId: selectedVehicle.id,
        vehicleName: `${selectedVehicle.make} ${selectedVehicle.model} (${selectedVehicle.licensePlate})`,
        horseIds: selectedHorses.map(h => h.id),
        horseNames: selectedHorses.map(h => h.name),
        horseCount: selectedHorses.length,
        departureDate: departureDate.trim() || defaultDate,
        departureTime: departureTime.trim() || defaultTime,
        notes: notes.trim() || null,
        status: status, // planned, active, completed, cancelled
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
      };

      const createdTransport = await createTransport(transportData, activeMode, activeOrganization?.id);

      // If status is active, update TransportContext
      if (status === 'active') {
        startTransport(createdTransport);
      }

      // Show success toast
      Toast.show({
        type: 'success',
        text1: 'Succes!',
        text2: status === 'active' ? 'Transport startet' : status === 'completed' ? 'Transport logget' : 'Transport planlagt',
      });

      // Navigate to home
      setTimeout(() => {
        navigation.navigate('MainTabs', { screen: 'Home' });
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
      <View style={[sharedStyles.container, { justifyContent: 'center', alignItems: 'center', padding: 20 }]}>
        <Text style={{ fontSize: 16, color: colors.secondary, textAlign: 'center' }}>
          Du har ikke tilladelse til at oprette transporter i denne organisation.
        </Text>
        <TouchableOpacity
          style={[sharedStyles.primaryButton, { marginTop: 20 }]}
          onPress={() => navigation.goBack()}
        >
          <Text style={sharedStyles.primaryButtonText}>Tilbage</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={[sharedStyles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.secondary} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.secondary }}>
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 400, flexGrow: 1 }}
        showsVerticalScrollIndicator={true}
        keyboardShouldPersistTaps="handled"
        scrollEnabled={true}
      >
        {/* Header */}
        <View style={{ marginBottom: 20, marginTop: 10 }}>
          <Text style={{ fontSize: 24, fontWeight: 'bold', color: colors.primary }}>
            Start Ny Transport
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
            <TouchableOpacity
              style={{
                backgroundColor: colors.white,
                padding: 14,
                borderRadius: 8,
                fontSize: 16,
                borderWidth: 1,
                borderColor: '#ccc',
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
              }}
              onPress={() => setShowDatePicker(true)}
            >
              <Calendar size={18} color={colors.primary} />
              <Text style={{ fontSize: 16, color: selectedDate ? colors.primary : '#999' }}>
                {selectedDate ? selectedDate.toLocaleDateString('da-DK') : 'Vælg dato'}
              </Text>
            </TouchableOpacity>
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
            <TouchableOpacity
              style={{
                backgroundColor: colors.white,
                padding: 14,
                borderRadius: 8,
                fontSize: 16,
                borderWidth: 1,
                borderColor: '#ccc',
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
              }}
              onPress={() => setShowTimePicker(true)}
            >
              <Clock size={18} color={colors.primary} />
              <Text style={{ fontSize: 16, color: selectedTime ? colors.primary : '#999' }}>
                {selectedTime ? selectedTime.toLocaleTimeString('da-DK', { hour: '2-digit', minute: '2-digit' }) : 'Vælg tidspunkt'}
              </Text>
            </TouchableOpacity>
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

        {/* Date Picker Modal - Native only */}
        {Platform.OS !== 'web' && showDatePicker && (
          <DateTimePicker
            value={selectedDate || new Date()}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={(event, date) => {
              setShowDatePicker(Platform.OS === 'ios');
              if (date) {
                setSelectedDate(date);
                setDepartureDate(date.toISOString().split('T')[0]);
              }
            }}
          />
        )}

        {/* Time Picker Modal - Native only */}
        {Platform.OS !== 'web' && showTimePicker && (
          <DateTimePicker
            value={selectedTime || new Date()}
            mode="time"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={(event, time) => {
              setShowTimePicker(Platform.OS === 'ios');
              if (time) {
                setSelectedTime(time);
                setDepartureTime(time.toTimeString().split(' ')[0].substring(0, 5));
              }
            }}
          />
        )}

        {/* Web Date Picker */}
        {Platform.OS === 'web' && showDatePicker && (
          <View style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 10000,
          }}>
            <View style={{
              backgroundColor: 'white',
              padding: 20,
              borderRadius: 12,
              minWidth: 300,
            }}>
              <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.primary, marginBottom: 16 }}>
                Vælg Dato
              </Text>
              <input
                type="date"
                value={departureDate || ''}
                onChange={(e) => {
                  const date = new Date(e.target.value + 'T00:00:00');
                  setSelectedDate(date);
                  setDepartureDate(e.target.value);
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
                    backgroundColor: colors.secondary,
                    borderRadius: 8,
                    alignItems: 'center',
                  }}
                  onPress={() => setShowDatePicker(false)}
                >
                  <Text style={{ color: colors.primary, fontWeight: 'bold' }}>Luk</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* Web Time Picker */}
        {Platform.OS === 'web' && showTimePicker && (
          <View style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 10000,
          }}>
            <View style={{
              backgroundColor: 'white',
              padding: 20,
              borderRadius: 12,
              minWidth: 300,
            }}>
              <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.primary, marginBottom: 16 }}>
                Vælg Tidspunkt
              </Text>
              <input
                type="time"
                value={departureTime || ''}
                onChange={(e) => {
                  const time = new Date(`2000-01-01T${e.target.value}`);
                  setSelectedTime(time);
                  setDepartureTime(e.target.value);
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
                    backgroundColor: colors.secondary,
                    borderRadius: 8,
                    alignItems: 'center',
                  }}
                  onPress={() => setShowTimePicker(false)}
                >
                  <Text style={{ color: colors.primary, fontWeight: 'bold' }}>Luk</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* Vehicle Selection */}
        <View style={{ marginBottom: 20 }}>
          <Text style={{ fontSize: 14, fontWeight: '600', color: colors.primary, marginBottom: 8 }}>
            Køretøj *
          </Text>
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
            ) : (
              <Text style={{ fontSize: 16, color: '#999' }}>
                Vælg køretøj...
              </Text>
            )}
            <ChevronRight size={20} color={colors.primary} />
          </Pressable>
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
        onManageVehicles={() => navigation.navigate('VehicleManagement')}
      />

      {/* Horse Selection Modal */}
      <HorseSelectionModal
        visible={showHorseModal}
        horses={horses}
        selectedHorses={selectedHorses}
        onToggleHorse={toggleHorseSelection}
        onClose={() => setShowHorseModal(false)}
        onManageHorses={() => navigation.navigate('HorseManagement')}
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
