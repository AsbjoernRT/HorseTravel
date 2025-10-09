import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, Pressable, FlatList, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { Truck, Plus, Edit2, Trash2 } from 'lucide-react-native';
import { createVehicle, getVehicles, updateVehicle, deleteVehicle } from '../services/vehicleService';
import { useOrganization } from '../context/OrganizationContext';
import { sharedStyles, colors } from '../styles/sharedStyles';
import { confirmAlert, showAlert } from '../utils/platformAlerts';

// CRUD hub for the vehicle fleet, respecting mode-based permissions.
const VehicleManagementScreen = ({ navigation, route }) => {
  const { activeMode, activeOrganization, hasPermission } = useOrganization();
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState(null);

  // Form state
  const [licensePlate, setLicensePlate] = useState('');
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [capacity, setCapacity] = useState('');

  const canManage = activeMode === 'private' || hasPermission('canManageVehicles');

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
      };

      if (editingVehicle) {
        await updateVehicle(editingVehicle.id, vehicleData);
        Alert.alert('Succes', 'Køretøj opdateret');
      } else {
        await createVehicle(vehicleData, activeMode, activeOrganization?.id);
        Alert.alert('Succes', 'Køretøj oprettet');
      }

      resetForm();
      loadVehicles();
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

  const resetForm = () => {
    setLicensePlate('');
    setMake('');
    setModel('');
    setCapacity('');
    setEditingVehicle(null);
    setShowAddForm(false);
  };

  const renderVehicle = ({ item }) => (
    <View style={{
      backgroundColor: colors.white,
      padding: 16,
      marginBottom: 12,
      borderRadius: 12,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    }}>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.primary }}>
          {item.licensePlate}
        </Text>
        <Text style={{ fontSize: 14, color: '#666', marginTop: 4 }}>
          {item.make} {item.model}
        </Text>
        {item.capacity && (
          <Text style={{ fontSize: 12, color: '#999', marginTop: 2 }}>
            Kapacitet: {item.capacity} heste
          </Text>
        )}
      </View>

      {canManage && (
        <View style={{ flexDirection: 'row', gap: 8 }}>
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
        </View>
      )}
    </View>
  );

  if (loading) {
    return (
      <View style={[sharedStyles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.secondary} />
      </View>
    );
  }

  return (
    <View style={sharedStyles.container}>
      <ScrollView style={{ flex: 1, padding: 16 }}>
        {/* Header */}
        <View style={{ marginBottom: 20 }}>
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
            marginBottom: 20,
          }}>
            <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.primary, marginBottom: 16 }}>
              {editingVehicle ? 'Rediger køretøj' : 'Tilføj køretøj'}
            </Text>

            <View style={{ marginBottom: 12 }}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: colors.primary, marginBottom: 4 }}>
                Registreringsnummer *
              </Text>
              <TextInput
                style={{
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
            data={vehicles}
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
