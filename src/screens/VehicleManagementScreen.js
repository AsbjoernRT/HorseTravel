import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, Pressable, FlatList, Alert, ActivityIndicator, ScrollView, Modal } from 'react-native';
import { Truck, Plus, Edit2, Trash2, Search, ArrowUpDown, ChevronDown, Car, CarFront, Caravan, FileText } from 'lucide-react-native';
import { createVehicle, getVehicles, updateVehicle, deleteVehicle, getVehicleByLicensePlate } from '../services/vehicleService';
import { fetchVehicleFromRegistry } from '../services/motorApiService';
import { useOrganization } from '../context/OrganizationContext';
import { theme, colors } from '../styles/theme';
import { confirmAlert, showAlert } from '../utils/platformAlerts';
import Toast from 'react-native-toast-message';
import CertificateUploader from '../components/CertificateUploader';

// CRUD hub for the vehicle fleet, respecting mode-based permissions.
const VehicleManagementScreen = ({ navigation, route }) => {
  const { activeMode, activeOrganization, hasPermission } = useOrganization();
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState(null);
  const [sortBy, setSortBy] = useState('recent'); // recent, name, type, weight
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);
  const [showCertificates, setShowCertificates] = useState(null);
  const [newlyCreatedVehicle, setNewlyCreatedVehicle] = useState(null);

  // Form state
  const [licensePlate, setLicensePlate] = useState('');
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [capacity, setCapacity] = useState('');
  const [vehicleType, setVehicleType] = useState('');
  const [fetchingVehicleData, setFetchingVehicleData] = useState(false);

  // Extended vehicle data from registry
  const [registryData, setRegistryData] = useState(null);

  const canManage = activeMode === 'private' || hasPermission('canManageVehicles');

  // Vehicle types with display names
  const vehicleTypes = [
    { value: 'Personbil', label: 'Personbil' },
    { value: 'Lastbil', label: 'Lastbil' },
    { value: 'Varebil', label: '2 hestes' },
    { value: 'Påhængsvogn', label: 'Påhængsvogn' },
  ];

  const getVehicleTypeLabel = (type) => {
    const found = vehicleTypes.find(t => t.value === type);
    return found ? found.label : type || 'Vælg type';
  };

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

  useEffect(() => {
    loadVehicles();
  }, [activeMode, activeOrganization]);

  // Handle route params for editing
  useEffect(() => {
    if (route.params?.editVehicle) {
      handleEdit(route.params.editVehicle);
      // Clear the param so it doesn't trigger again
      navigation.setParams({ editVehicle: undefined });
    }
  }, [route.params?.editVehicle]);

  const loadVehicles = async () => {
    try {
      setLoading(true);
      const data = await getVehicles(activeMode, activeOrganization?.id);
      setVehicles(data);
    } catch (error) {
      console.error('Error loading vehicles:', error);
      Alert.alert('Fejl', 'Kunne ikke indlæse køretøjer');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
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
        loadVehicles();
      } else {
        const newVehicle = await createVehicle(vehicleData, activeMode, activeOrganization?.id);
        // Store the newly created vehicle to show certificate upload
        setNewlyCreatedVehicle(newVehicle);
        await loadVehicles();
      }
    } catch (error) {
      console.error('Error saving vehicle:', error);
      Alert.alert('Fejl', error.message || 'Kunne ikke gemme køretøj');
    }
  };

  const handleEdit = (vehicle) => {
    setEditingVehicle(vehicle);
    setLicensePlate(vehicle.licensePlate);
    setMake(vehicle.make);
    setModel(vehicle.model);
    setCapacity(vehicle.capacity ? vehicle.capacity.toString() : '');
    setVehicleType(vehicle.vehicleType || '');
    setShowAddForm(true);
  };

  const handleDelete = async (vehicle) => {
    const confirmed = await confirmAlert(
      'Slet køretøj',
      `Er du sikker på at du vil slette ${vehicle.licensePlate}?`
    );

    if (!confirmed) {
      return;
    }

    try {
      await deleteVehicle(vehicle.id);
      await showAlert('Succes', 'Køretøj slettet');
      loadVehicles();
    } catch (error) {
      await showAlert('Fejl', 'Kunne ikke slette køretøj');
    }
  };

  const handleFetchVehicleData = async () => {
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

      // Step 1: Check if vehicle exists in database
      const existingVehicle = await getVehicleByLicensePlate(
        licensePlate,
        activeMode,
        activeOrganization?.id
      );

      if (existingVehicle) {
        // Vehicle found in database
        setMake(existingVehicle.make || '');
        setModel(existingVehicle.model || '');
        if (existingVehicle.capacity) {
          setCapacity(existingVehicle.capacity.toString());
        }

        // Also set registry data if it exists
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

      // Step 2: Vehicle not in database, fetch from motorapi.dk
      const fetchedRegistryData = await fetchVehicleFromRegistry(licensePlate);

      // Auto-fill the form with fetched data
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
  };

  const resetForm = () => {
    setLicensePlate('');
    setMake('');
    setModel('');
    setCapacity('');
    setVehicleType('');
    setRegistryData(null);
    setEditingVehicle(null);
    setNewlyCreatedVehicle(null);
    setShowAddForm(false);
  };

  const getSortedVehicles = () => {
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
          return weightB - weightA; // Descending (heaviest first)
        });

      case 'plate':
        return sorted.sort((a, b) => {
          const plateA = a.licensePlate || '';
          const plateB = b.licensePlate || '';
          return plateA.localeCompare(plateB);
        });

      case 'recent':
      default:
        return sorted; // Already sorted by createdAt from Firestore
    }
  };

  const renderVehicle = ({ item }) => {
    const VehicleIcon = getVehicleIcon(item.vehicleType);

    return (
      <View style={{
        backgroundColor: colors.white,
        padding: 16,
        marginBottom: 12,
        borderRadius: 12,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        {/* Icon */}
        <View style={{
          width: 48,
          height: 48,
          borderRadius: 24,
          backgroundColor: colors.secondary,
          justifyContent: 'center',
          alignItems: 'center',
          marginRight: 12,
        }}>
          <VehicleIcon size={24} color={colors.primary} strokeWidth={2} />
        </View>

        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.primary }}>
            {item.licensePlate}
          </Text>
          <Text style={{ fontSize: 14, color: '#666', marginTop: 4 }}>
            {item.make} {item.model}
            {item.variant ? ` ${item.variant}` : ''}
          </Text>
          {item.vehicleType && (
            <Text style={{ fontSize: 12, color: '#999', marginTop: 2 }}>
              {getVehicleTypeLabel(item.vehicleType)}
              {item.firstRegistration ? ` • ${item.firstRegistration.substring(0, 4)}` : ''}
            </Text>
          )}
          {item.totalWeight && (
            <Text style={{ fontSize: 12, color: '#999', marginTop: 2 }}>
              Totalvægt: {item.totalWeight} kg
            </Text>
          )}
          {item.capacity && (
            <Text style={{ fontSize: 12, color: '#999', marginTop: 2 }}>
              Kapacitet: {item.capacity} heste
            </Text>
          )}
        </View>

        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Pressable
            style={{
              backgroundColor: colors.secondary,
              padding: 8,
              borderRadius: 8,
            }}
            onPress={() => setShowCertificates(item)}
          >
            <FileText size={18} color={colors.primary} />
          </Pressable>
          {canManage && (
            <>
              <Pressable
                style={{
                  backgroundColor: colors.secondary,
                  padding: 8,
                  borderRadius: 8,
                }}
                onPress={() => {
                  console.log('Edit button pressed for:', item.licensePlate);
                  handleEdit(item);
                }}
              >
                <Edit2 size={18} color={colors.primary} />
              </Pressable>
              <Pressable
                style={{
                  backgroundColor: '#ffebee',
                  padding: 8,
                  borderRadius: 8,
                }}
                onPress={() => handleDelete(item)}
              >
                <Trash2 size={18} color="#d32f2f" />
              </Pressable>
            </>
          )}
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={[theme.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.secondary} />
      </View>
    );
  }

  return (
    <View style={theme.container}>
      {/* Certificates Modal */}
      <Modal
        visible={showCertificates !== null}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowCertificates(null)}
      >
        <View style={{
          flex: 1,
          backgroundColor: colors.primary,
        }}>
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: 16,
            paddingTop: 60,
            borderBottomWidth: 1,
            borderBottomColor: 'rgba(214, 209, 202, 0.2)',
          }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 20, fontWeight: 'bold', color: colors.white }}>
                {showCertificates?.licensePlate}
              </Text>
              <Text style={{ fontSize: 14, color: colors.secondary, marginTop: 2 }}>
                {showCertificates?.make} {showCertificates?.model}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => setShowCertificates(null)}
              style={{
                backgroundColor: colors.secondary,
                padding: 8,
                borderRadius: 8,
              }}
            >
              <Text style={{ fontSize: 16, fontWeight: '600', color: colors.primary }}>
                Luk
              </Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={{ flex: 1, padding: 16 }}>
            {showCertificates && (
              <CertificateUploader
                entityType="vehicle"
                entityId={showCertificates.id}
                canManage={canManage}
              />
            )}
          </ScrollView>
        </View>
      </Modal>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingTop: 8 }}>
        {/* Header */}
        <View style={{ marginBottom: 12 }}>
          <Text style={{ fontSize: 24, fontWeight: 'bold', color: colors.secondary }}>
            Køretøjer
          </Text>
          <Text style={{ fontSize: 14, color: colors.secondary, marginTop: 4 }}>
            {activeMode === 'private' ? 'Dine private køretøjer' : `${activeOrganization?.name} køretøjer`}
          </Text>
        </View>

        {/* Add/Edit Form */}
        {showAddForm && canManage ? (
          <View style={{
            backgroundColor: colors.secondary,
            padding: 16,
            borderRadius: 12,
            marginBottom: 16,
          }}>
            <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.primary, marginBottom: 12 }}>
              {newlyCreatedVehicle ? 'Upload certifikater (valgfrit)' : editingVehicle ? 'Rediger køretøj' : 'Tilføj køretøj'}
            </Text>

            {/* Show success message and certificate upload after creation */}
            {newlyCreatedVehicle ? (
              <>
                <View style={{
                  backgroundColor: colors.primary,
                  padding: 12,
                  borderRadius: 8,
                  marginBottom: 16,
                }}>
                  <Text style={{ fontSize: 16, fontWeight: '600', color: colors.white, textAlign: 'center' }}>
                    ✓ Køretøj oprettet: {newlyCreatedVehicle.licensePlate}
                  </Text>
                  <Text style={{ fontSize: 14, color: colors.white, textAlign: 'center', marginTop: 4 }}>
                    {newlyCreatedVehicle.make} {newlyCreatedVehicle.model}
                  </Text>
                </View>

                <CertificateUploader
                  entityType="vehicle"
                  entityId={newlyCreatedVehicle.id}
                  canManage={canManage}
                />

                <TouchableOpacity
                  style={{
                    padding: 16,
                    borderRadius: 12,
                    backgroundColor: colors.primary,
                    alignItems: 'center',
                    marginTop: 16,
                  }}
                  onPress={resetForm}
                >
                  <Text style={{ color: colors.white, fontSize: 16, fontWeight: 'bold' }}>
                    Færdig
                  </Text>
                </TouchableOpacity>
              </>
            ) : (
              <>

            <View style={{ marginBottom: 12 }}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: colors.primary, marginBottom: 4 }}>
                Registreringsnummer *
              </Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TextInput
                  style={{
                    flex: 1,
                    backgroundColor: colors.white,
                    padding: 12,
                    borderRadius: 8,
                    fontSize: 16,
                    color: colors.primary,
                  }}
                  placeholder="XX 12345"
                  value={licensePlate}
                  onChangeText={setLicensePlate}
                  autoCapitalize="characters"
                />
                <TouchableOpacity
                  style={{
                    backgroundColor: colors.primary,
                    paddingHorizontal: 16,
                    borderRadius: 8,
                    justifyContent: 'center',
                    alignItems: 'center',
                    minWidth: 100,
                  }}
                  onPress={handleFetchVehicleData}
                  disabled={fetchingVehicleData || !licensePlate.trim()}
                >
                  {fetchingVehicleData ? (
                    <ActivityIndicator size="small" color={colors.white} />
                  ) : (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Search size={16} color={colors.white} />
                      <Text style={{ color: colors.white, fontSize: 14, fontWeight: '600' }}>
                        Hent data
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            </View>

            <View style={{ marginBottom: 12 }}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: colors.primary, marginBottom: 4 }}>
                Mærke *
              </Text>
              <TextInput
                style={{
                  backgroundColor: colors.white,
                  padding: 12,
                  borderRadius: 8,
                  fontSize: 16,
                  color: colors.primary,
                }}
                placeholder="F.eks. Mercedes"
                value={make}
                onChangeText={setMake}
              />
            </View>

            <View style={{ marginBottom: 12 }}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: colors.primary, marginBottom: 4 }}>
                Model *
              </Text>
              <TextInput
                style={{
                  backgroundColor: colors.white,
                  padding: 12,
                  borderRadius: 8,
                  fontSize: 16,
                  color: colors.primary,
                }}
                placeholder="F.eks. Sprinter"
                value={model}
                onChangeText={setModel}
              />
            </View>

            <View style={{ marginBottom: 12 }}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: colors.primary, marginBottom: 4 }}>
                Køretøjstype
              </Text>
              <TouchableOpacity
                style={{
                  backgroundColor: colors.white,
                  padding: 12,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: colors.border,
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
                onPress={() => setShowTypeDropdown(true)}
              >
                <Text style={{
                  fontSize: 16,
                  color: vehicleType ? colors.primary : colors.placeholder,
                }}>
                  {getVehicleTypeLabel(vehicleType)}
                </Text>
                <ChevronDown size={20} color={colors.textSecondary} />
              </TouchableOpacity>

              {/* Dropdown Modal */}
              <Modal
                visible={showTypeDropdown}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setShowTypeDropdown(false)}
              >
                <TouchableOpacity
                  style={{
                    flex: 1,
                    backgroundColor: 'rgba(0,0,0,0.5)',
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                  activeOpacity={1}
                  onPress={() => setShowTypeDropdown(false)}
                >
                  <View style={{
                    backgroundColor: colors.white,
                    borderRadius: 12,
                    padding: 8,
                    width: '80%',
                    maxWidth: 400,
                  }}>
                    {vehicleTypes.map((type) => (
                      <TouchableOpacity
                        key={type.value}
                        style={{
                          padding: 16,
                          borderRadius: 8,
                          backgroundColor: vehicleType === type.value ? colors.secondary : 'transparent',
                        }}
                        onPress={() => {
                          setVehicleType(type.value);
                          setShowTypeDropdown(false);
                        }}
                      >
                        <Text style={{
                          fontSize: 16,
                          fontWeight: vehicleType === type.value ? '600' : '400',
                          color: colors.primary,
                        }}>
                          {type.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </TouchableOpacity>
              </Modal>
            </View>

            <View style={{ marginBottom: 16 }}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: colors.primary, marginBottom: 4 }}>
                Kapacitet (antal heste)
              </Text>
              <TextInput
                style={{
                  backgroundColor: colors.white,
                  padding: 12,
                  borderRadius: 8,
                  fontSize: 16,
                  color: colors.primary,
                }}
                placeholder="F.eks. 2"
                value={capacity}
                onChangeText={setCapacity}
                keyboardType="number-pad"
              />
            </View>

            {/* Certificate Upload - Only show when editing */}
            {editingVehicle && (
              <View style={{ marginBottom: 16 }}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: colors.primary, marginBottom: 8 }}>
                  Certifikater
                </Text>
                <CertificateUploader
                  entityType="vehicle"
                  entityId={editingVehicle.id}
                  canManage={canManage}
                />
              </View>
            )}

            <View style={{ flexDirection: 'row', gap: 12 }}>
              <TouchableOpacity
                style={{
                  flex: 1,
                  padding: 16,
                  borderRadius: 12,
                  backgroundColor: '#666',
                  alignItems: 'center',
                }}
                onPress={resetForm}
              >
                <Text style={{ color: colors.white, fontSize: 16, fontWeight: '600' }}>
                  Annuller
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={{
                  flex: 1,
                  padding: 16,
                  borderRadius: 12,
                  backgroundColor: colors.primary,
                  alignItems: 'center',
                }}
                onPress={handleSave}
              >
                <Text style={{ color: colors.white, fontSize: 16, fontWeight: 'bold' }}>
                  {editingVehicle ? 'Opdater' : 'Opret'}
                </Text>
              </TouchableOpacity>
            </View>
            </>
            )}
          </View>
        ) : canManage ? (
          <TouchableOpacity
            style={{
              backgroundColor: colors.secondary,
              padding: 16,
              borderRadius: 12,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              marginBottom: 20,
            }}
            onPress={() => setShowAddForm(true)}
          >
            <Plus size={20} color={colors.primary} />
            <Text style={{ fontSize: 16, fontWeight: '600', color: colors.primary }}>
              Tilføj køretøj
            </Text>
          </TouchableOpacity>
        ) : null}

        {/* Sort Options */}
        {vehicles.length > 0 && (
          <View style={{ marginBottom: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <ArrowUpDown size={16} color={colors.textSecondary} />
              <Text style={{ fontSize: 14, fontWeight: '600', color: colors.textSecondary }}>
                Sortér efter:
              </Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {[
                  { key: 'recent', label: 'Nyeste' },
                  { key: 'name', label: 'Navn' },
                  { key: 'plate', label: 'Nummerplade' },
                  { key: 'type', label: 'Type' },
                  { key: 'weight', label: 'Vægt' },
                ].map((option) => (
                  <TouchableOpacity
                    key={option.key}
                    style={{
                      paddingHorizontal: 16,
                      paddingVertical: 8,
                      borderRadius: 20,
                      backgroundColor: sortBy === option.key ? colors.primary : colors.secondary,
                      borderWidth: 1,
                      borderColor: sortBy === option.key ? colors.primary : colors.border,
                    }}
                    onPress={() => setSortBy(option.key)}
                  >
                    <Text style={{
                      fontSize: 14,
                      fontWeight: '600',
                      color: sortBy === option.key ? colors.white : colors.textSecondary,
                    }}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>
        )}

        {/* Vehicle List */}
        {vehicles.length === 0 ? (
          <View style={{ alignItems: 'center', marginTop: 40 }}>
            <Truck size={64} color={colors.secondary} strokeWidth={1.5} />
            <Text style={{ fontSize: 16, color: colors.secondary, marginTop: 16, textAlign: 'center' }}>
              {canManage
                ? 'Ingen køretøjer endnu.\nTilføj dit første køretøj ovenfor.'
                : 'Ingen køretøjer tilgængelige.'}
            </Text>
          </View>
        ) : (
          <FlatList
            data={getSortedVehicles()}
            renderItem={renderVehicle}
            keyExtractor={item => item.id}
            scrollEnabled={false}
          />
        )}
      </ScrollView>
    </View>
  );
};

export default VehicleManagementScreen;
