import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Pencil, Trash2 } from 'lucide-react-native';
import { colors } from '../styles/sharedStyles';

// Vehicle summary card with selection highlight and edit/delete affordances.
const VehicleCard = ({ vehicle, isSelected, onSelect, onEdit, onDelete }) => {
  return (
    <View
      style={{
        backgroundColor: colors.white,
        borderRadius: 8,
        marginBottom: 12,
        borderWidth: isSelected ? 2 : 1,
        borderColor: isSelected ? colors.primary : '#ccc',
        overflow: 'hidden',
      }}
    >
      <Pressable
        style={{ padding: 16 }}
        onPress={onSelect}
      >
        <Text style={{ fontSize: 16, fontWeight: 'bold', color: colors.primary }}>
          {vehicle.licensePlate}
        </Text>
        <Text style={{ fontSize: 14, color: '#666', marginTop: 4 }}>
          {vehicle.make} {vehicle.model}
        </Text>
        {vehicle.capacity && (
          <Text style={{ fontSize: 12, color: '#999', marginTop: 2 }}>
            Kapacitet: {vehicle.capacity} heste
          </Text>
        )}
      </Pressable>

      <View style={{
        flexDirection: 'row',
        borderTopWidth: 1,
        borderTopColor: '#eee',
      }}>
        <Pressable
          style={{
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 12,
            gap: 6,
          }}
          onPress={onEdit}
        >
          <Pencil size={16} color={colors.primary} />
          <Text style={{ color: colors.primary, fontSize: 14, fontWeight: '600' }}>Rediger</Text>
        </Pressable>

        <View style={{ width: 1, backgroundColor: '#eee' }} />

        <Pressable
          style={{
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 12,
            gap: 6,
          }}
          onPress={onDelete}
        >
          <Trash2 size={16} color="#dc2626" />
          <Text style={{ color: '#dc2626', fontSize: 14, fontWeight: '600' }}>Slet</Text>
        </Pressable>
      </View>
    </View>
  );
};

export default VehicleCard;
