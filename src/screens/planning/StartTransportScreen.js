import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Pressable,
  Platform,
  Modal,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import {
  ChevronRight,
  MapPin,
  Clock,
  Navigation,
  AlertTriangle,
  Plus,
  Caravan,
  X,
  Truck,
  Car,
  CarFront,
} from 'lucide-react-native';
import Toast from 'react-native-toast-message';
import { useOrganization } from '../../context/OrganizationContext';
import { useTransport } from '../../context/TransportContext';
import { useAuth } from '../../context/AuthContext';
import { createTransport, getTransportsByStatus, updateTransport } from '../../services/transportService';
import { getCurrentLocation, reverseGeocode } from '../../services/mapsService';
import { checkCompliance } from '../../services/transportRegulationsService';
import { theme, colors } from '../../styles/theme';
import { SCREEN_NAMES, navigateToTab } from '../../constants/navigation';
import {
  VehicleSelectionModal,
  HorseSelectionModal,
  RouteMapModal,
  LocationAutocomplete,
  ComplianceChecklist,
  TRACESCreationModal,
  TransportDocumentsSection,
} from '../../components';
import { simulateTRACESRegistration } from '../../services/tracesService';
import { useTransportForm, useRouteCalculation } from './hooks';

/**
 * Get vehicle icon based on type
 */
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

const StartTransportScreen = ({ navigation, route }) => {
  const { activeMode, activeOrganization } = useOrganization();
  const { startTransport } = useTransport();
  const { user } = useAuth();

  // Edit mode - check if we're editing an existing transport
  const editTransport = route?.params?.editTransport;

  // Use custom hooks for form and route management
  const form = useTransportForm({
    activeMode,
    activeOrganization,
    editTransport,
  });

  const routeCalc = useRouteCalculation({
    fromLocation: form.fromLocation,
    toLocation: form.toLocation,
    selectedVehicle: form.selectedVehicle,
    selectedTrailer: form.selectedTrailer,
    selectedHorses: form.selectedHorses,
    activeMode,
    activeOrganization,
    editTransport,
  });

  // Modal state
  const [showVehicleModal, setShowVehicleModal] = useState(false);
  const [showTrailerModal, setShowTrailerModal] = useState(false);
  const [showHorseModal, setShowHorseModal] = useState(false);
  const [showRouteMapModal, setShowRouteMapModal] = useState(false);

  // UI state
  const [creating, setCreating] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);

  // TRACES simulation state
  const [showTRACESModal, setShowTRACESModal] = useState(false);
  const [tracesStep, setTRACESStep] = useState(0);
  const [tracesNumber, setTRACESNumber] = useState(null);

  const handleUseCurrentLocation = async () => {
    try {
      setGettingLocation(true);
      const location = await getCurrentLocation();
      const address = await reverseGeocode(location.latitude, location.longitude);
      form.setFromLocation(address.formattedAddress);
    } catch (error) {
      Alert.alert('Fejl', 'Kunne ikke hente din lokation. Sørg for at tilladelser er aktiveret.');
    } finally {
      setGettingLocation(false);
    }
  };

  const getButtonText = () => {
    if (form.isEditMode) return 'Gem Ændringer';
    if (!form.departureDate && !form.departureTime) return 'Start Transport';

    const now = new Date();
    const selectedDateTime = new Date(`${form.departureDate}T${form.departureTime}`);
    return selectedDateTime < now ? 'Log Transport' : 'Plan Transport';
  };

  const handleCreateTransport = async () => {
    // Validation
    if (!form.fromLocation.trim() || !form.toLocation.trim()) {
      Toast.show({ type: 'error', text1: 'Fejl', text2: 'Indtast venligst fra og til lokation' });
      return;
    }

    if (!form.selectedVehicle) {
      Toast.show({ type: 'error', text1: 'Fejl', text2: 'Vælg venligst et køretøj' });
      return;
    }

    if (form.selectedHorses.length === 0) {
      Toast.show({ type: 'error', text1: 'Fejl', text2: 'Vælg venligst mindst én hest' });
      return;
    }

    if (form.selectedVehicle.capacity && form.selectedHorses.length > form.selectedVehicle.capacity) {
      Toast.show({
        type: 'error',
        text1: 'Fejl',
        text2: `Køretøjet kan kun transportere ${form.selectedVehicle.capacity} heste`,
      });
      return;
    }

    // Check compliance requirements
    // Ekskluder traces_certificate fra tjek - det oprettes automatisk ved grænseoverskridelse
    if (routeCalc.complianceRequirements) {
      const complianceCheck = checkCompliance(routeCalc.complianceRequirements, routeCalc.confirmedDocuments);
      const hasBorderCrossing = routeCalc.routeInfo?.borderCrossing;
      const missingWithoutTraces = hasBorderCrossing
        ? complianceCheck.missing.filter((doc) => doc.id !== 'traces_certificate')
        : complianceCheck.missing;

      if (missingWithoutTraces.length > 0) {
        Toast.show({
          type: 'error',
          text1: 'Manglende Dokumentation',
          text2: `${missingWithoutTraces.length} påkrævet(e) dokument(er) er ikke bekræftet`,
        });
        return;
      }
    }

    // Determine status based on date/time
    const buttonText = getButtonText();
    let transportStatus = 'planned';

    if (form.isEditMode) {
      transportStatus = editTransport.status;
      proceedWithCreation(transportStatus);
      return;
    }

    if (buttonText === 'Start Transport') {
      try {
        const activeTransports = await getTransportsByStatus('active', activeMode, activeOrganization?.id);
        const ownActiveTransports = activeTransports.filter(t => t.ownerId === user?.uid);
        if (ownActiveTransports?.length > 0) {
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
      Alert.alert(
        'Log Transport',
        'Vil du markere denne transport som aktiv nu, eller logge den som tidligere transport?',
        [
          { text: 'Annuller', style: 'cancel', onPress: () => setCreating(false) },
          { text: 'Log som tidligere', onPress: () => proceedWithCreation('completed') },
          { text: 'Marker som aktiv', onPress: () => proceedWithCreation('active') },
        ]
      );
      return;
    }

    proceedWithCreation(transportStatus);
  };

  const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  const proceedWithCreation = async (status) => {
    try {
      setCreating(true);

      // TRACES simulation ved grænseoverskridelse
      const hasBorderCrossing = routeCalc.routeInfo?.borderCrossing;
      let generatedTRACESNumber = null;

      if (hasBorderCrossing && !form.isEditMode) {
        setShowTRACESModal(true);
        generatedTRACESNumber = await simulateTRACESRegistration(
          setTRACESStep,
          routeCalc.routeInfo?.countries?.[0] || 'Denmark'
        );
        setTRACESNumber(generatedTRACESNumber);
        await delay(1500); // Vis completion i 1.5 sek
        setShowTRACESModal(false);
      }

      const now = new Date();
      const defaultDate = now.toISOString().split('T')[0];
      const defaultTime = now.toTimeString().split(' ')[0].substring(0, 5);

      // Calculate estimated arrival
      let estimatedArrivalDate = null;
      let estimatedArrivalTime = null;
      if (routeCalc.routeInfo?.duration?.value) {
        const departureDateTime = new Date(
          `${form.departureDate.trim() || defaultDate}T${form.departureTime.trim() || defaultTime}`
        );
        if (!isNaN(departureDateTime.getTime())) {
          const estimatedArrival = new Date(
            departureDateTime.getTime() + routeCalc.routeInfo.duration.value * 1000
          );
          if (!isNaN(estimatedArrival.getTime())) {
            estimatedArrivalDate = estimatedArrival.toISOString().split('T')[0];
            estimatedArrivalTime = estimatedArrival.toTimeString().split(' ')[0].substring(0, 5);
          }
        }
      }

      const transportData = {
        fromLocation: form.fromLocation.trim(),
        toLocation: form.toLocation.trim(),
        vehicleId: form.selectedVehicle.id,
        vehicleName: `${form.selectedVehicle.make} ${form.selectedVehicle.model} (${form.selectedVehicle.licensePlate})`,
        trailerId: form.selectedTrailer?.id || null,
        trailerName: form.selectedTrailer
          ? `${form.selectedTrailer.make} ${form.selectedTrailer.model} (${form.selectedTrailer.licensePlate})`
          : null,
        horseIds: form.selectedHorses.map(h => h.id),
        horseNames: form.selectedHorses.map(h => h.name),
        horseCount: form.selectedHorses.length,
        departureDate: form.departureDate.trim() || defaultDate,
        departureTime: form.departureTime.trim() || defaultTime,
        estimatedArrivalDate,
        estimatedArrivalTime,
        notes: form.notes.trim() || null,
        status,
        actualStartTime: status === 'active' ? now.toISOString() : null,
        actualEndTime: status === 'completed' ? now.toISOString() : null,
        routeInfo: routeCalc.routeInfo
          ? {
              distance: routeCalc.routeInfo.distance.value,
              distanceText: routeCalc.routeInfo.distance.text,
              duration: routeCalc.routeInfo.duration.value,
              durationText: routeCalc.routeInfo.duration.text,
              borderCrossing: routeCalc.routeInfo.borderCrossing,
              countries: routeCalc.routeInfo.countries,
              polyline: routeCalc.routeInfo.polyline,
            }
          : null,
        complianceRequirements: routeCalc.complianceRequirements,
        confirmedDocuments: generatedTRACESNumber
          ? [...routeCalc.confirmedDocuments, 'traces_certificate']
          : routeCalc.confirmedDocuments,
        tracesNumber: generatedTRACESNumber,
        tracesRegisteredAt: generatedTRACESNumber ? now.toISOString() : null,
      };

      let result;
      if (form.isEditMode) {
        await updateTransport(editTransport.id, transportData);
        result = { id: editTransport.id, ...transportData };
      } else {
        result = await createTransport(transportData, activeMode, activeOrganization?.id);
      }

      if (status === 'active') {
        startTransport(result);
      }

      Toast.show({
        type: 'success',
        text1: 'Succes!',
        text2: generatedTRACESNumber
          ? `TRACES: ${generatedTRACESNumber}`
          : form.isEditMode
          ? 'Transport opdateret'
          : status === 'active'
          ? 'Transport startet'
          : status === 'completed'
          ? 'Transport logget'
          : 'Transport planlagt',
        visibilityTime: generatedTRACESNumber ? 4000 : 3000,
      });

      setTimeout(() => {
        if (form.isEditMode) {
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
      setTRACESStep(0);
      setTRACESNumber(null);
    }
  };

  if (form.loading) {
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
            {form.isEditMode ? 'Rediger Transport' : 'Start Ny Transport'}
          </Text>
          <Text style={{ fontSize: 14, color: '#666', marginTop: 4 }}>
            {activeMode === 'private' ? 'Privat transport' : `${activeOrganization?.name}`}
          </Text>
        </View>

        {/* From Location */}
        <View style={{ marginBottom: 16, zIndex: 20 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <Text style={{ fontSize: 14, fontWeight: '600', color: colors.primary }}>Fra lokation *</Text>
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
                  <Text style={{ fontSize: 12, color: colors.primary, fontWeight: '600' }}>Brug min lokation</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
          <LocationAutocomplete
            value={form.fromLocation}
            onChangeText={form.setFromLocation}
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
          <Text style={{ fontSize: 14, fontWeight: '600', color: colors.primary, marginBottom: 8 }}>Til lokation *</Text>
          <LocationAutocomplete
            value={form.toLocation}
            onChangeText={form.setToLocation}
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
        {routeCalc.loadingRoute && (
          <View style={{ backgroundColor: colors.white, padding: 16, borderRadius: 12, marginBottom: 20, alignItems: 'center' }}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={{ fontSize: 14, color: '#666', marginTop: 8 }}>Beregner rute...</Text>
          </View>
        )}

        {routeCalc.routeInfo && !routeCalc.loadingRoute && (
          <RoutePreviewCard
            routeInfo={routeCalc.routeInfo}
            expanded={routeCalc.routeExpanded}
            onToggleExpand={() => routeCalc.setRouteExpanded(!routeCalc.routeExpanded)}
            onViewMap={() => setShowRouteMapModal(true)}
            selectedVehicle={form.selectedVehicle}
            selectedTrailer={form.selectedTrailer}
          />
        )}

        {/* Departure Date & Time */}
        <DateTimeSection
          selectedDate={form.selectedDate}
          selectedTime={form.selectedTime}
          onDateChange={form.handleDateChange}
          onTimeChange={form.handleTimeChange}
          onClearDate={form.clearDate}
          onClearTime={form.clearTime}
        />

        {/* Vehicle Selection */}
        <VehicleSection
          selectedVehicle={form.selectedVehicle}
          selectedTrailer={form.selectedTrailer}
          onSelectVehicle={() => setShowVehicleModal(true)}
          onSelectTrailer={() => setShowTrailerModal(true)}
          onRemoveTrailer={() => form.setSelectedTrailer(null)}
          getVehicleIcon={getVehicleIcon}
        />

        {/* Horse Selection */}
        <View style={{ marginBottom: 20 }}>
          <Text style={{ fontSize: 14, fontWeight: '600', color: colors.primary, marginBottom: 8 }}>
            Heste * ({form.selectedHorses.length} valgt)
          </Text>
          <Pressable
            style={{
              backgroundColor: colors.white,
              padding: 16,
              borderRadius: 8,
              borderWidth: 1,
              borderColor: form.selectedHorses.length > 0 ? colors.primary : '#ccc',
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
            onPress={() => setShowHorseModal(true)}
          >
            {form.selectedHorses.length > 0 ? (
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 16, fontWeight: 'bold', color: colors.primary }}>
                  {form.selectedHorses.length} {form.selectedHorses.length === 1 ? 'hest' : 'heste'} valgt
                </Text>
                <Text style={{ fontSize: 14, color: '#666', marginTop: 2 }}>
                  {form.selectedHorses.map(h => h.name).join(', ')}
                </Text>
              </View>
            ) : (
              <Text style={{ fontSize: 16, color: '#999' }}>Vælg heste...</Text>
            )}
            <ChevronRight size={20} color={colors.primary} />
          </Pressable>
        </View>

        {/* Documents Section */}
        <TransportDocumentsSection
          organizationId={activeOrganization?.id}
          selectedVehicle={form.selectedVehicle}
          selectedHorses={form.selectedHorses}
          activeMode={activeMode}
          onDocumentsChange={() => {
            // Refresh auto-confirmed documents when new docs are uploaded
            if (routeCalc.refreshAutoConfirmed) {
              routeCalc.refreshAutoConfirmed();
            }
          }}
        />

        {/* Compliance Checklist */}
        {routeCalc.complianceRequirements && (
          <View>
            {routeCalc.loadingCertificates && (
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
                <Text style={{ fontSize: 14, color: '#666' }}>Tjekker uploadede certifikater...</Text>
              </View>
            )}
            <ComplianceChecklist
              requirements={routeCalc.complianceRequirements}
              confirmedDocuments={routeCalc.confirmedDocuments}
              autoConfirmedDocuments={routeCalc.autoConfirmedDocuments}
              onToggleDocument={routeCalc.toggleDocumentConfirmation}
              onDocumentUploaded={routeCalc.refreshAutoConfirmed}
              editable={true}
              organizationId={activeOrganization?.id}
              vehicleId={form.selectedVehicle?.id}
              horseIds={form.selectedHorses.map(h => h.id)}
            />
          </View>
        )}

        {/* Action Buttons */}
        <View style={{ marginBottom: 40 }}>
          <TouchableOpacity
            style={[
              { backgroundColor: colors.primary, padding: 16, borderRadius: 8, alignItems: 'center' },
              creating && { opacity: 0.5 },
            ]}
            onPress={handleCreateTransport}
            disabled={creating}
          >
            {creating ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={{ color: colors.white, fontSize: 16, fontWeight: 'bold' }}>{getButtonText()}</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={{ padding: 16, alignItems: 'center', marginTop: 8 }}
            onPress={() => navigation.goBack()}
            disabled={creating}
          >
            <Text style={{ color: colors.secondary, fontSize: 16 }}>Annuller</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Modals */}
      <VehicleSelectionModal
        visible={showVehicleModal}
        vehicles={form.vehicles}
        selectedVehicle={form.selectedVehicle}
        onSelect={form.setSelectedVehicle}
        onClose={() => setShowVehicleModal(false)}
        onManageVehicles={() => {
          setShowVehicleModal(false);
          navigateToTab(navigation, SCREEN_NAMES.VEHICLE_MANAGEMENT);
        }}
        isTrailerSelection={false}
      />

      <VehicleSelectionModal
        visible={showTrailerModal}
        vehicles={form.vehicles}
        selectedVehicle={form.selectedTrailer}
        onSelect={form.setSelectedTrailer}
        onClose={() => setShowTrailerModal(false)}
        onManageVehicles={() => {
          setShowTrailerModal(false);
          navigateToTab(navigation, SCREEN_NAMES.VEHICLE_MANAGEMENT);
        }}
        isTrailerSelection={true}
      />

      <HorseSelectionModal
        visible={showHorseModal}
        horses={form.horses}
        selectedHorses={form.selectedHorses}
        onToggleHorse={form.toggleHorseSelection}
        onClose={() => setShowHorseModal(false)}
        onManageHorses={() => {
          setShowHorseModal(false);
          navigateToTab(navigation, SCREEN_NAMES.HORSE_MANAGEMENT);
        }}
        vehicleCapacity={form.selectedVehicle?.capacity}
      />

      <RouteMapModal
        visible={showRouteMapModal}
        onClose={() => setShowRouteMapModal(false)}
        routeInfo={routeCalc.routeInfo}
        fromLocation={form.fromLocation}
        toLocation={form.toLocation}
      />

      <TRACESCreationModal
        visible={showTRACESModal}
        currentStep={tracesStep}
        tracesNumber={tracesNumber}
        countries={routeCalc.routeInfo?.countries || []}
      />
    </View>
  );
};

// ============================================================================
// Sub-components (extracted for clarity)
// ============================================================================

const RoutePreviewCard = ({ routeInfo, expanded, onToggleExpand, onViewMap, selectedVehicle, selectedTrailer }) => (
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
      onPress={onToggleExpand}
    >
      <Navigation size={20} color={colors.primary} />
      <Text style={{ fontSize: 16, fontWeight: 'bold', color: colors.primary, marginLeft: 8, flex: 1 }}>
        Rute Oversigt
      </Text>
      <Text style={{ fontSize: 20, color: colors.primary }}>{expanded ? '−' : '+'}</Text>
    </TouchableOpacity>

    {expanded && (
      <>
        <View style={{ flexDirection: 'row', gap: 16, marginBottom: 8 }}>
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
        </View>

        {routeInfo.duration.isAdjusted && (
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

        {routeInfo.trafficDelay?.value > 300 && (
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

        {routeInfo.borderCrossing && (
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
              <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#856404' }}>Grænseoverskridelse</Text>
            </View>
            <Text style={{ fontSize: 12, color: '#856404' }}>
              Denne rute krydser landegrænser: {routeInfo.countries.join(', ')}
            </Text>
            <Text style={{ fontSize: 11, color: '#856404', marginTop: 4, fontStyle: 'italic' }}>
              Husk sundhedscertifikater og tolddokumentation for hestetratsport.
            </Text>
          </View>
        )}

        <TouchableOpacity
          style={{
            backgroundColor: colors.primary,
            padding: 12,
            borderRadius: 8,
            marginTop: 12,
            alignItems: 'center',
          }}
          onPress={onViewMap}
        >
          <Text style={{ color: colors.white, fontSize: 14, fontWeight: '600' }}>Se Rute på Kort</Text>
        </TouchableOpacity>
      </>
    )}
  </View>
);

const DateTimeSection = ({ selectedDate, selectedTime, onDateChange, onTimeChange, onClearDate, onClearTime }) => (
  <View style={{ flexDirection: 'row', gap: 12, marginBottom: 20 }}>
    <View style={{ flex: 1 }}>
      <Text style={{ fontSize: 14, fontWeight: '600', color: colors.primary, marginBottom: 8 }}>Dato (valgfri)</Text>
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
          onChange={onDateChange}
          style={{ backgroundColor: 'transparent', width: '100%' }}
          textColor={colors.primary}
        />
      </View>
      {selectedDate && Platform.OS === 'web' && (
        <TouchableOpacity style={{ marginTop: 4 }} onPress={onClearDate}>
          <Text style={{ fontSize: 12, color: colors.secondary }}>Ryd dato</Text>
        </TouchableOpacity>
      )}
    </View>
    <View style={{ flex: 1 }}>
      <Text style={{ fontSize: 14, fontWeight: '600', color: colors.primary, marginBottom: 8 }}>Tidspunkt (valgfri)</Text>
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
          onChange={onTimeChange}
          style={{ backgroundColor: 'transparent', width: '100%' }}
          textColor={colors.primary}
        />
      </View>
      {selectedTime && Platform.OS === 'web' && (
        <TouchableOpacity style={{ marginTop: 4 }} onPress={onClearTime}>
          <Text style={{ fontSize: 12, color: colors.secondary }}>Ryd tidspunkt</Text>
        </TouchableOpacity>
      )}
    </View>
  </View>
);

const VehicleSection = ({
  selectedVehicle,
  selectedTrailer,
  onSelectVehicle,
  onSelectTrailer,
  onRemoveTrailer,
  getVehicleIcon,
}) => (
  <View style={{ marginBottom: 20 }}>
    <Text style={{ fontSize: 14, fontWeight: '600', color: colors.primary, marginBottom: 8 }}>Køretøj *</Text>
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
        onPress={onSelectVehicle}
      >
        {selectedVehicle ? (
          <>
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
                strokeWidth: 2,
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
          <Text style={{ fontSize: 16, color: '#999' }}>Vælg køretøj...</Text>
        )}
        <ChevronRight size={20} color={colors.primary} />
      </Pressable>

      {selectedTrailer && (
        <View style={{
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
        }}>
          <Pressable onPress={onSelectTrailer} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Caravan size={16} color={colors.white} strokeWidth={2} />
            <Text style={{ color: colors.white, fontSize: 12, fontWeight: '600' }}>{selectedTrailer.licensePlate}</Text>
          </Pressable>
          <TouchableOpacity onPress={onRemoveTrailer} style={{ marginLeft: 4 }}>
            <X size={16} color={colors.white} strokeWidth={2.5} />
          </TouchableOpacity>
        </View>
      )}
    </View>

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
        onPress={onSelectTrailer}
      >
        <Caravan size={20} color={colors.primary} strokeWidth={2} />
        <Plus size={20} color={colors.primary} strokeWidth={2.5} />
        <Text style={{ fontSize: 14, fontWeight: '600', color: colors.primary }}>Tilføj trailer</Text>
      </TouchableOpacity>
    )}
  </View>
);

export default StartTransportScreen;
