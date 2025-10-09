import React, { useState, useMemo } from 'react';
import { View, Text, Modal, TextInput, FlatList, TouchableOpacity, Pressable } from 'react-native';
import { X, Search, Heart, Check } from 'lucide-react-native';
import { colors } from '../styles/sharedStyles';

// Multi-select modal for choosing horses with capacity warnings and quick filtering.
const HorseSelectionModal = ({ visible, horses, selectedHorses, onToggleHorse, onClose, onManageHorses, vehicleCapacity }) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredHorses = useMemo(() => {
    if (!searchQuery.trim()) return horses;

    const query = searchQuery.toLowerCase();
    return horses.filter(horse =>
      horse.name.toLowerCase().includes(query) ||
      horse.breed.toLowerCase().includes(query) ||
      (horse.chipNumber && horse.chipNumber.toLowerCase().includes(query))
    );
  }, [horses, searchQuery]);

  const isSelected = (horse) => selectedHorses.some(h => h.id === horse.id);

  const handleDone = () => {
    setSearchQuery('');
    onClose();
  };

  const renderHorse = ({ item }) => {
    const selected = isSelected(item);

    return (
      <Pressable
        style={{
          backgroundColor: selected ? colors.secondary + '20' : colors.white,
          padding: 16,
          marginBottom: 8,
          borderRadius: 8,
          borderWidth: selected ? 2 : 1,
          borderColor: selected ? colors.primary : '#e0e0e0',
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
        onPress={() => onToggleHorse(item)}
      >
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 16, fontWeight: 'bold', color: colors.primary }}>
            {item.name}
          </Text>
          <Text style={{ fontSize: 14, color: '#666', marginTop: 4 }}>
            {item.breed}
          </Text>
          {item.age && (
            <Text style={{ fontSize: 12, color: '#999', marginTop: 2 }}>
              {item.age} år
            </Text>
          )}
        </View>
        {selected && (
          <View style={{
            width: 24,
            height: 24,
            borderRadius: 12,
            backgroundColor: colors.primary,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Check size={16} color={colors.white} />
          </View>
        )}
      </Pressable>
    );
  };

  const capacityWarning = vehicleCapacity && selectedHorses.length > vehicleCapacity;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleDone}
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
            <View>
              <Text style={{ fontSize: 20, fontWeight: 'bold', color: colors.primary }}>
                Vælg heste
              </Text>
              <Text style={{ fontSize: 14, color: '#666', marginTop: 2 }}>
                {selectedHorses.length} valgt
                {vehicleCapacity && ` (max ${vehicleCapacity})`}
              </Text>
            </View>
            <Pressable onPress={handleDone}>
              <X size={24} color={colors.primary} />
            </Pressable>
          </View>

          {/* Capacity Warning */}
          {capacityWarning && (
            <View style={{
              backgroundColor: '#fff3cd',
              paddingHorizontal: 20,
              paddingVertical: 12,
              marginHorizontal: 20,
              marginBottom: 12,
              borderRadius: 8,
              borderLeftWidth: 4,
              borderLeftColor: '#ffc107',
            }}>
              <Text style={{ fontSize: 14, color: '#856404' }}>
                ⚠️ Du har valgt {selectedHorses.length} heste, men køretøjet kan kun transportere {vehicleCapacity}
              </Text>
            </View>
          )}

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
                placeholder="Søg efter navn, race, chip..."
                placeholderTextColor="#999"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>
          </View>

          {/* Horse List */}
          <FlatList
            data={filteredHorses}
            renderItem={renderHorse}
            keyExtractor={item => item.id}
            contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 20 }}
            ListEmptyComponent={
              <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                <Heart size={48} color="#ccc" />
                <Text style={{ fontSize: 16, color: '#999', marginTop: 16, textAlign: 'center' }}>
                  {searchQuery.trim()
                    ? 'Ingen heste matcher din søgning'
                    : 'Ingen heste tilgængelige'}
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
                      handleDone();
                      onManageHorses();
                    }}
                  >
                    <Text style={{ color: colors.white, fontSize: 14, fontWeight: '600' }}>
                      Opret Hest
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            }
          />

          {/* Bottom Actions */}
          <View style={{
            paddingHorizontal: 20,
            paddingVertical: 16,
            borderTopWidth: 1,
            borderTopColor: '#e0e0e0',
            backgroundColor: colors.white,
          }}>
            {horses.length > 0 && (
              <TouchableOpacity
                style={{
                  padding: 12,
                  alignItems: 'center',
                  marginBottom: 8,
                }}
                onPress={() => {
                  handleDone();
                  onManageHorses();
                }}
              >
                <Text style={{ color: colors.primary, fontSize: 16, fontWeight: '600' }}>
                  Administrer heste
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={{
                backgroundColor: colors.primary,
                padding: 16,
                borderRadius: 12,
                alignItems: 'center',
              }}
              onPress={handleDone}
            >
              <Text style={{ color: colors.white, fontSize: 16, fontWeight: 'bold' }}>
                Færdig ({selectedHorses.length} valgt)
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default HorseSelectionModal;
