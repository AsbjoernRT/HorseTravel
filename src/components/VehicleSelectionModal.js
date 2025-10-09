import React, { useState, useMemo } from 'react';
import { View, Text, Modal, TextInput, FlatList, TouchableOpacity, Pressable } from 'react-native';
import { X, Search, Truck } from 'lucide-react-native';
import { colors } from '../styles/sharedStyles';

// Modal picker that surfaces the vehicle list with search, filtering, and management shortcuts.
const VehicleSelectionModal = ({ visible, vehicles, selectedVehicle, onSelect, onClose, onManageVehicles }) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredVehicles = useMemo(() => {
    if (!searchQuery.trim()) return vehicles;

    const query = searchQuery.toLowerCase();
    return vehicles.filter(vehicle =>
      vehicle.licensePlate.toLowerCase().includes(query) ||
      vehicle.make.toLowerCase().includes(query) ||
      vehicle.model.toLowerCase().includes(query)
    );
  }, [vehicles, searchQuery]);

  const handleSelect = (vehicle) => {
    onSelect(vehicle);
    setSearchQuery('');
    onClose();
  };

  const renderVehicle = ({ item }) => {
    const isSelected = selectedVehicle?.id === item.id;

    return (
      <Pressable
        style={{
          backgroundColor: isSelected ? colors.secondary + '20' : colors.white,
          padding: 16,
          marginBottom: 8,
          borderRadius: 8,
          borderWidth: isSelected ? 2 : 1,
          borderColor: isSelected ? colors.primary : '#e0e0e0',
        }}
        onPress={() => handleSelect(item)}
      >
        <Text style={{ fontSize: 16, fontWeight: 'bold', color: colors.primary }}>
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
              Vælg køretøj
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
