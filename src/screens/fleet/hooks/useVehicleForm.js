/**
 * Custom hook for vehicle form state and handlers
 */
import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import Toast from 'react-native-toast-message';
import { createVehicle, updateVehicle, deleteVehicle, getVehicleByLicensePlate } from '../../../services/vehicleService';
import { fetchVehicleFromRegistry } from '../../../services/motorApiService';
import { confirmAlert, showAlert } from '../../../utils/platformAlerts';

/**
 * Manages vehicle form state, validation, and CRUD operations
 *
 * @param {Object} options
 * @param {string} options.activeMode - 'private' or 'organization'
 * @param {Object} options.activeOrganization - Active organization object
 * @param {Function} options.onSaveComplete - Callback after successful save
 * @param {Function} options.onDeleteComplete - Callback after successful delete
 * @returns {Object} Form state and handlers
 */
export const useVehicleForm = ({ activeMode, activeOrganization, onSaveComplete, onDeleteComplete }) => {
  // Form visibility
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState(null);
  const [newlyCreatedVehicle, setNewlyCreatedVehicle] = useState(null);

  // Form fields
  const [licensePlate, setLicensePlate] = useState('');
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [capacity, setCapacity] = useState('');
  const [vehicleType, setVehicleType] = useState('');

  // Registry data
  const [registryData, setRegistryData] = useState(null);
  const [fetchingVehicleData, setFetchingVehicleData] = useState(false);

  // Type dropdown
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);

  /**
   * Reset form to initial state
   */
  const resetForm = useCallback(() => {
    setLicensePlate('');
    setMake('');
    setModel('');
    setCapacity('');
    setVehicleType('');
    setRegistryData(null);
    setEditingVehicle(null);
    setNewlyCreatedVehicle(null);
    setShowAddForm(false);
  }, []);

  /**
   * Populate form for editing
   */
  const handleEdit = useCallback((vehicle) => {
    setEditingVehicle(vehicle);
    setLicensePlate(vehicle.licensePlate);
    setMake(vehicle.make);
    setModel(vehicle.model);
    setCapacity(vehicle.capacity ? vehicle.capacity.toString() : '');
    setVehicleType(vehicle.vehicleType || '');
    setShowAddForm(true);
  }, []);

  /**
   * Save vehicle (create or update)
   */
  const handleSave = useCallback(async () => {
    if (!licensePlate.trim() || !make.trim() || !model.trim()) {
      Alert.alert('Fejl', 'Udfyld venligst alle påkrævede felter');
      return;
    }

    try {
      const vehicleData = {
        licensePlate: licensePlate.trim(),
        make: make.trim(),
        model: model.trim(),
        capacity: capacity ? parseInt(capacity) : null,
        vehicleType: vehicleType || null,
        // Include all extended data from registry if available
        ...(registryData && {
          variant: registryData.variant,
          vin: registryData.vin,
          firstRegistration: registryData.firstRegistration,
          status: registryData.status,
          statusDate: registryData.statusDate,
          vehicleType: registryData.vehicleType,
          chassisType: registryData.chassisType,
          modelType: registryData.modelType,
          use: registryData.use,
          fuelType: registryData.fuelType,
          enginePower: registryData.enginePower,
          engineVolume: registryData.engineVolume,
          engineCylinders: registryData.engineCylinders,
          isHybrid: registryData.isHybrid,
          hybridType: registryData.hybridType,
          doors: registryData.doors,
          seats: registryData.seats,
          color: registryData.color,
          ownWeight: registryData.ownWeight,
          cerbWeight: registryData.cerbWeight,
          totalWeight: registryData.totalWeight,
          axels: registryData.axels,
          pullingAxels: registryData.pullingAxels,
          coupling: registryData.coupling,
          trailerMaxWeightNoBrakes: registryData.trailerMaxWeightNoBrakes,
          trailerMaxWeightWithBrakes: registryData.trailerMaxWeightWithBrakes,
          motInfo: registryData.motInfo,
          isLeasing: registryData.isLeasing,
          leasingFrom: registryData.leasingFrom,
          leasingTo: registryData.leasingTo,
          vehicleId: registryData.vehicleId,
          registrationZipcode: registryData.registrationZipcode,
        }),
      };

      if (editingVehicle) {
        await updateVehicle(editingVehicle.id, vehicleData);
        Alert.alert('Succes', 'Køretøj opdateret');
        resetForm();
        onSaveComplete?.();
      } else {
        const newVehicle = await createVehicle(vehicleData, activeMode, activeOrganization?.id);
        setNewlyCreatedVehicle(newVehicle);
        onSaveComplete?.();
      }
    } catch (error) {
      console.error('Error saving vehicle:', error);
      Alert.alert('Fejl', error.message || 'Kunne ikke gemme køretøj');
    }
  }, [licensePlate, make, model, capacity, vehicleType, registryData, editingVehicle, activeMode, activeOrganization?.id, resetForm, onSaveComplete]);

  /**
   * Delete vehicle
   */
  const handleDelete = useCallback(async (vehicle) => {
    const confirmed = await confirmAlert(
      'Slet køretøj',
      `Er du sikker på at du vil slette ${vehicle.licensePlate}?`
    );

    if (!confirmed) return;

    try {
      await deleteVehicle(vehicle.id);
      await showAlert('Succes', 'Køretøj slettet');
      onDeleteComplete?.();
    } catch (error) {
      await showAlert('Fejl', 'Kunne ikke slette køretøj');
    }
  }, [onDeleteComplete]);

  /**
   * Fetch vehicle data from registry or database
   */
  const handleFetchVehicleData = useCallback(async () => {
    if (!licensePlate.trim()) {
      Toast.show({
        type: 'error',
        text1: 'Fejl',
        text2: 'Indtast venligst et registreringsnummer',
      });
      return;
    }

    try {
      setFetchingVehicleData(true);

      // Check if vehicle exists in database
      const existingVehicle = await getVehicleByLicensePlate(
        licensePlate,
        activeMode,
        activeOrganization?.id
      );

      if (existingVehicle) {
        setMake(existingVehicle.make || '');
        setModel(existingVehicle.model || '');
        if (existingVehicle.capacity) {
          setCapacity(existingVehicle.capacity.toString());
        }

        if (existingVehicle.vin) {
          setRegistryData(existingVehicle);
        }

        Toast.show({
          type: 'success',
          text1: 'Køretøj fundet i database',
          text2: `${existingVehicle.make} ${existingVehicle.model}`,
        });
        return;
      }

      // Fetch from motorapi.dk
      const fetchedRegistryData = await fetchVehicleFromRegistry(licensePlate);
      setMake(fetchedRegistryData.make || '');
      setModel(fetchedRegistryData.model || '');
      setVehicleType(fetchedRegistryData.vehicleType || '');
      setRegistryData(fetchedRegistryData);

      Toast.show({
        type: 'success',
        text1: 'Bildata hentet fra register',
        text2: `${fetchedRegistryData.make} ${fetchedRegistryData.model}`,
      });
    } catch (error) {
      console.error('Error fetching vehicle data:', error);
      Toast.show({
        type: 'error',
        text1: 'Kunne ikke hente bildata',
        text2: error.message || 'Prøv at indtaste oplysningerne manuelt',
      });
    } finally {
      setFetchingVehicleData(false);
    }
  }, [licensePlate, activeMode, activeOrganization?.id]);

  return {
    // Form visibility
    showAddForm,
    setShowAddForm,
    editingVehicle,
    newlyCreatedVehicle,

    // Form fields
    licensePlate,
    setLicensePlate,
    make,
    setMake,
    model,
    setModel,
    capacity,
    setCapacity,
    vehicleType,
    setVehicleType,

    // Registry data
    registryData,
    fetchingVehicleData,

    // Type dropdown
    showTypeDropdown,
    setShowTypeDropdown,

    // Handlers
    resetForm,
    handleEdit,
    handleSave,
    handleDelete,
    handleFetchVehicleData,
  };
};

export default useVehicleForm;
