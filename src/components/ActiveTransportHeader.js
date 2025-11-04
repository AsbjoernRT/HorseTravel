import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Truck, MapPin } from 'lucide-react-native';
import { useTransport } from '../context/TransportContext';
import { colors } from '../styles/theme';
import { useNavigation } from '@react-navigation/native';

// Banner that nudges users toward the in-progress transport details from anywhere in the app.
const ActiveTransportHeader = () => {
  const { activeTransport } = useTransport();
  const navigation = useNavigation();

  if (!activeTransport) return null;

  return (
    <TouchableOpacity
      style={{
        backgroundColor: '#22c55e',
        padding: 8,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
      }}
      onPress={() => navigation.navigate('TransportList')}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
        <Truck size={16} color="#fff" />
        <Text style={{ color: '#fff', fontSize: 12, fontWeight: 'bold', marginLeft: 8 }}>
          Aktiv Transport
        </Text>
        <MapPin size={12} color="#fff" style={{ marginLeft: 8 }} />
        <Text style={{ color: '#fff', fontSize: 11, marginLeft: 4, flex: 1 }} numberOfLines={1}>
          {activeTransport.fromLocation} → {activeTransport.toLocation}
        </Text>
      </View>
      <Text style={{ color: '#fff', fontSize: 10, fontWeight: '600' }}>
        TAP FOR DETALJER
      </Text>
    </TouchableOpacity>
  );
};

export default ActiveTransportHeader;
