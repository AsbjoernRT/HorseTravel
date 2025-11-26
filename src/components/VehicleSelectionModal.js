import React, { useState, useMemo } from 'react';
import { View, Text, Modal, TextInput, FlatList, TouchableOpacity, Pressable } from 'react-native';
import { X, Search, Truck, Car, CarFront, Caravan } from 'lucide-react-native';
import { colors } from '../styles/theme';

// Modal picker that surfaces the vehicle list with search, filtering, and management shortcuts.
const VehicleSelectionModal = ({ visible, vehicles, selectedVehicle, onSelect, onClose, onManageVehicles, isTrailerSelection = false }) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredVehicles = useMemo(() => {
    let filtered = vehicles;

    // Filter by trailer selection mode
    if (isTrailerSelection) {
      // Only show trailers
      filtered = filtered.filter(vehicle => vehicle.vehicleType === 'Påhængsvogn');
    } else {
      // Exclude trailers for primary vehicle selection
      filtered = filtered.filter(vehicle => vehicle.vehicleType !== 'Påhængsvogn');
    }

    // Apply search filter
    if (!searchQuery.trim()) return filtered;

    const query = searchQuery.toLowerCase();
    return filtered.filter(vehicle =>
      vehicle.licensePlate.toLowerCase().includes(query) ||
      vehicle.make.toLowerCase().includes(query) ||
      vehicle.model.toLowerCase().includes(query)
    );
  }, [vehicles, searchQuery, isTrailerSelection]);

  const handleSelect = (vehicle) => {
    onSelect(vehicle);
    setSearchQuery('');
    onClose();
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

  const renderVehicle = ({ item }) => {
    const isSelected = selectedVehicle?.id === item.id;
    const isInUse = item.inUse && !isSelected; // Allow deselecting current selection
    const VehicleIcon = getVehicleIcon(item.vehicleType);

    return (
      <Pressable
        style={{
          backgroundColor: isInUse ? '#f5f5f5' : (isSelected ? colors.secondary + '20' : colors.white),
          padding: 16,
          marginBottom: 8,
          borderRadius: 8,
          borderWidth: isSelected ? 2 : 1,
          borderColor: isInUse ? '#ccc' : (isSelected ? colors.primary : '#e0e0e0'),
          flexDirection: 'row',
          alignItems: 'center',
          opacity: isInUse ? 0.5 : 1,
        }}
        onPress={() => !isInUse && handleSelect(item)}
        disabled={isInUse}
      >
        {/* Icon */}
        <View style={{
          width: 44,
          height: 44,
          borderRadius: 22,
          backgroundColor: colors.secondary,
          justifyContent: 'center',
          alignItems: 'center',
          marginRight: 12,
        }}>
          <VehicleIcon size={22} color={colors.primary} strokeWidth={2} />
        </View>

        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={{ fontSize: 16, fontWeight: 'bold', color: colors.primary }}>
              {item.licensePlate}
            </Text>
            {isInUse && (
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
            {item.make} {item.model}
          </Text>
          {item.capacity && (
            <Text style={{ fontSize: 12, color: '#999', marginTop: 2 }}>
              Kapacitet: {item.capacity} heste
            </Text>
          )}
          {item.motInfo?.date && (
            <Text style={{ fontSize: 12, color: '#999', marginTop: 2 }}>
              Seneste Syn: {item.motInfo.date}
            </Text>
          )}
        </View>
      </Pressable>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={{
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
      }}>
        <View style={{
          backgroundColor: '#f5f5f5',
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          maxHeight: '80%',
          paddingTop: 20,
        }}>
          {/* Header */}
          <View style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingHorizontal: 20,
            paddingBottom: 16,
          }}>
            <Text style={{ fontSize: 20, fontWeight: 'bold', color: colors.primary }}>
              {isTrailerSelection ? 'Vælg trailer' : 'Vælg køretøj'}
            </Text>
            <Pressable onPress={onClose}>
              <X size={24} color={colors.primary} />
            </Pressable>
          </View>

          {/* Search */}
          <View style={{ paddingHorizontal: 20, marginBottom: 16 }}>
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: colors.white,
              borderRadius: 8,
              paddingHorizontal: 12,
              borderWidth: 1,
              borderColor: '#e0e0e0',
            }}>
              <Search size={20} color="#999" />
              <TextInput
                style={{
                  flex: 1,
                  padding: 12,
                  fontSize: 16,
                  color: colors.primary,
                }}
                placeholder="Søg efter nummerplade, mærke, model..."
                placeholderTextColor="#999"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>
          </View>

          {/* Vehicle List */}
          <FlatList
            data={filteredVehicles}
            renderItem={renderVehicle}
            keyExtractor={item => item.id}
            contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 20 }}
            ListEmptyComponent={
              <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                <Truck size={48} color="#ccc" />
                <Text style={{ fontSize: 16, color: '#999', marginTop: 16, textAlign: 'center' }}>
                  {searchQuery.trim()
                    ? 'Ingen køretøjer matcher din søgning'
                    : 'Ingen køretøjer tilgængelige'}
                </Text>
                {!searchQuery.trim() && (
                  <TouchableOpacity
                    style={{
                      backgroundColor: colors.primary,
                      paddingHorizontal: 20,
                      paddingVertical: 12,
                      borderRadius: 8,
                      marginTop: 16,
                    }}
                    onPress={() => {
                      onClose();
                      onManageVehicles();
                    }}
                  >
                    <Text style={{ color: colors.white, fontSize: 14, fontWeight: '600' }}>
                      Opret Køretøj
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            }
          />

          {/* Manage Vehicles Button */}
          {vehicles.length > 0 && (
            <View style={{
              paddingHorizontal: 20,
              paddingVertical: 16,
              borderTopWidth: 1,
              borderTopColor: '#e0e0e0',
              backgroundColor: colors.white,
            }}>
              <TouchableOpacity
                style={{
                  padding: 12,
                  alignItems: 'center',
                }}
                onPress={() => {
                  onClose();
                  onManageVehicles();
                }}
              >
                <Text style={{ color: colors.primary, fontSize: 16, fontWeight: '600' }}>
                  Administrer køretøjer
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

export default VehicleSelectionModal;
