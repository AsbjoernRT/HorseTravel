import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { Heart, Plus, Edit2, Trash2 } from 'lucide-react-native';
import { createHorse, getHorses, updateHorse, deleteHorse } from '../services/horseService';
import { getTransportsByStatus } from '../services/transportService';
import { useOrganization } from '../context/OrganizationContext';
import { theme, colors } from '../styles/theme';
import { confirmAlert, showAlert } from '../utils/platformAlerts';

// Manage the horse roster with create, edit, and delete workflows across private/org contexts.
const HorseManagementScreen = ({ navigation, route }) => {
  const { activeMode, activeOrganization, hasPermission } = useOrganization();
  const [horses, setHorses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingHorse, setEditingHorse] = useState(null);

  // Form state
  const [name, setName] = useState('');
  const [breed, setBreed] = useState('');
  const [age, setAge] = useState('');
  const [chipNumber, setChipNumber] = useState('');

  const canManage = activeMode === 'private' || hasPermission('canManageHorses');

  useEffect(() => {
    loadHorses();
  }, [activeMode, activeOrganization]);

  // Handle route params for editing
  useEffect(() => {
    if (route.params?.editHorse) {
      handleEdit(route.params.editHorse);
      // Clear the param so it doesn't trigger again
      navigation.setParams({ editHorse: undefined });
    }
  }, [route.params?.editHorse]);

  const loadHorses = async () => {
    try {
      setLoading(true);
      const [horsesData, activeTransports] = await Promise.all([
        getHorses(activeMode, activeOrganization?.id),
        getTransportsByStatus('active', activeMode, activeOrganization?.id),
      ]);

      // Mark horses that are in active transports
      const usedHorseIds = new Set();
      activeTransports.forEach(transport => {
        if (transport.horseIds) {
          transport.horseIds.forEach(id => usedHorseIds.add(id));
        }
      });

      // Add inTransport flag to horses
      const horsesWithStatus = horsesData.map(h => ({
        ...h,
        inTransport: usedHorseIds.has(h.id),
      }));

      setHorses(horsesWithStatus);
    } catch (error) {
      console.error('Error loading horses:', error);
      Alert.alert('Fejl', 'Kunne ikke indlæse heste');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim() || !breed.trim()) {
      Alert.alert('Fejl', 'Udfyld venligst navn og oprindelse');
      return;
    }

    try {
      const horseData = {
        name: name.trim(),
        breed: breed.trim(),
        age: age ? parseInt(age) : null,
        chipNumber: chipNumber.trim() || null,
      };

      if (editingHorse) {
        await updateHorse(editingHorse.id, horseData);
        Alert.alert('Succes', 'Hest opdateret');
      } else {
        await createHorse(horseData, activeMode, activeOrganization?.id);
        Alert.alert('Succes', 'Hest oprettet');
      }

      resetForm();
      loadHorses();
    } catch (error) {
      console.error('Error saving horse:', error);
      Alert.alert('Fejl', error.message || 'Kunne ikke gemme hest');
    }
  };

  const handleEdit = (horse) => {
    setEditingHorse(horse);
    setName(horse.name);
    setBreed(horse.breed);
    setAge(horse.age ? horse.age.toString() : '');
    setChipNumber(horse.chipNumber || '');
    setShowAddForm(true);
  };

  const handleDelete = async (horse) => {
    const confirmed = await confirmAlert(
      'Slet hest',
      `Er du sikker på at du vil slette ${horse.name}?`
    );

    if (!confirmed) {
      return;
    }

    try {
      await deleteHorse(horse.id);
      await showAlert('Succes', 'Hest slettet');
      loadHorses();
    } catch (error) {
      await showAlert('Fejl', 'Kunne ikke slette hest');
    }
  };

  const resetForm = () => {
    setName('');
    setBreed('');
    setAge('');
    setChipNumber('');
    setEditingHorse(null);
    setShowAddForm(false);
  };

  const renderHorse = ({ item }) => (
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
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.primary }}>
            {item.name}
          </Text>
          {item.inTransport && (
            <View style={{
              backgroundColor: '#ff9800',
              paddingHorizontal: 6,
              paddingVertical: 2,
              borderRadius: 4
            }}>
              <Text style={{ fontSize: 10, color: 'white', fontWeight: '600' }}>
                I TRANSPORT
              </Text>
            </View>
          )}
        </View>
        <Text style={{ fontSize: 14, color: '#666', marginTop: 4 }}>
          {item.breed}
        </Text>
        {item.age && (
          <Text style={{ fontSize: 12, color: '#999', marginTop: 2 }}>
            Født: {item.age}
          </Text>
        )}
        {item.chipNumber && (
          <Text style={{ fontSize: 12, color: '#999', marginTop: 2 }}>
            Pasnummer: {item.chipNumber}
          </Text>
        )}
      </View>

      {canManage && (
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity
            style={{
              backgroundColor: colors.secondary,
              padding: 8,
              borderRadius: 8,
            }}
            onPress={() => handleEdit(item)}
          >
            <Edit2 size={18} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={{
              backgroundColor: '#ffebee',
              padding: 8,
              borderRadius: 8,
            }}
            onPress={() => handleDelete(item)}
          >
            <Trash2 size={18} color="#d32f2f" />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  if (loading) {
    return (
      <View style={[theme.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.secondary} />
      </View>
    );
  }

  return (
    <View style={theme.container}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingTop: 8 }}>
        {/* Header */}
        <View style={{ marginBottom: 12 }}>
          <Text style={{ fontSize: 24, fontWeight: 'bold', color: colors.secondary }}>
            Heste
          </Text>
          <Text style={{ fontSize: 14, color: colors.secondary, marginTop: 4 }}>
            {activeMode === 'private' ? 'Dine private heste' : `${activeOrganization?.name} heste`}
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
              {editingHorse ? 'Rediger hest' : 'Tilføj hest'}
            </Text>

            <View style={{ marginBottom: 12 }}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: colors.primary, marginBottom: 4 }}>
                Navn *
              </Text>
              <TextInput
                style={{
                  backgroundColor: colors.white,
                  padding: 12,
                  borderRadius: 8,
                  fontSize: 16,
                  color: colors.primary,
                }}
                placeholder="F.eks. Bella"
                value={name}
                onChangeText={setName}
              />
            </View>

            <View style={{ marginBottom: 12 }}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: colors.primary, marginBottom: 4 }}>
                Oprindelse *
              </Text>
              <TextInput
                style={{
                  backgroundColor: colors.white,
                  padding: 12,
                  borderRadius: 8,
                  fontSize: 16,
                  color: colors.primary,
                }}
                placeholder="F.eks. Dansk Varmblod"
                value={breed}
                onChangeText={setBreed}
              />
            </View>

            <View style={{ marginBottom: 12 }}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: colors.primary, marginBottom: 4 }}>
                Født
              </Text>
              <TextInput
                style={{
                  backgroundColor: colors.white,
                  padding: 12,
                  borderRadius: 8,
                  fontSize: 16,
                  color: colors.primary,
                }}
                placeholder="F.eks. 2016"
                value={age}
                onChangeText={setAge}
                keyboardType="number-pad"
              />
            </View>

            <View style={{ marginBottom: 16 }}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: colors.primary, marginBottom: 4 }}>
                Pasnummer
              </Text>
              <TextInput
                style={{
                  backgroundColor: colors.white,
                  padding: 12,
                  borderRadius: 8,
                  fontSize: 16,
                  color: colors.primary,
                }}
                placeholder="F.eks. 123456789012345"
                value={chipNumber}
                onChangeText={setChipNumber}
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
                  {editingHorse ? 'Opdater' : 'Opret'}
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
              Tilføj hest
            </Text>
          </TouchableOpacity>
        ) : null}

        {/* Horse List */}
        {horses.length === 0 ? (
          <View style={{ alignItems: 'center', marginTop: 40 }}>
            <Heart size={64} color={colors.secondary} strokeWidth={1.5} />
            <Text style={{ fontSize: 16, color: colors.secondary, marginTop: 16, textAlign: 'center' }}>
              {canManage
                ? 'Ingen heste endnu.\nTilføj din første hest ovenfor.'
                : 'Ingen heste tilgængelige.'}
            </Text>
          </View>
        ) : (
          <FlatList
            data={horses}
            renderItem={renderHorse}
            keyExtractor={item => item.id}
            scrollEnabled={false}
          />
        )}
      </ScrollView>
    </View>
  );
};

export default HorseManagementScreen;
