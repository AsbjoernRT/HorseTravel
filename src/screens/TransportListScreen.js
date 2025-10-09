import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, FlatList, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { MapPin, Calendar, Plus, Edit2, Trash2 } from 'lucide-react-native';
import { useOrganization } from '../context/OrganizationContext';
import { getTransports, deleteTransport } from '../services/transportService';
import { sharedStyles, colors } from '../styles/sharedStyles';

// Lists historic and planned transports with filtering and management actions.
const TransportListScreen = ({ navigation }) => {
  const { activeMode, activeOrganization, hasPermission } = useOrganization();
  const [transports, setTransports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, planned, active, completed

  const canManage = activeMode === 'private' || hasPermission('canManageTours');

  useEffect(() => {
    loadTransports();
  }, [activeMode, activeOrganization, filter]);

  const loadTransports = async () => {
    try {
      setLoading(true);
      const data = await getTransports(activeMode, activeOrganization?.id);

      // Filter by status
      let filtered = data;
      if (filter !== 'all') {
        filtered = data.filter(t => t.status === filter);
      }

      setTransports(filtered);
    } catch (error) {
      console.error('Error loading transports:', error);
      Alert.alert('Fejl', 'Kunne ikke indlæse transporter');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (transport) => {
    Alert.alert(
      'Slet transport',
      `Er du sikker på at du vil slette transporten fra ${transport.fromLocation} til ${transport.toLocation}?`,
      [
        { text: 'Annuller', style: 'cancel' },
        {
          text: 'Slet',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteTransport(transport.id);
              Alert.alert('Succes', 'Transport slettet');
              loadTransports();
            } catch (error) {
              console.error('Error deleting transport:', error);
              Alert.alert('Fejl', 'Kunne ikke slette transport');
            }
          },
        },
      ]
    );
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'planned': return '#ffa500';
      case 'active': return '#4CAF50';
      case 'completed': return '#666';
      case 'cancelled': return '#d32f2f';
      default: return '#999';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'planned': return 'Planlagt';
      case 'active': return 'Aktiv';
      case 'completed': return 'Afsluttet';
      case 'cancelled': return 'Annulleret';
      default: return status;
    }
  };

  const renderTransport = ({ item }) => (
    <View style={{
      backgroundColor: colors.white,
      padding: 16,
      marginBottom: 12,
      borderRadius: 12,
    }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <View style={{
              backgroundColor: getStatusColor(item.status),
              paddingHorizontal: 8,
              paddingVertical: 4,
              borderRadius: 6,
            }}>
              <Text style={{ color: colors.white, fontSize: 12, fontWeight: '600' }}>
                {getStatusText(item.status)}
              </Text>
            </View>
            <Text style={{ fontSize: 12, color: '#999' }}>
              {item.horseCount} {item.horseCount === 1 ? 'hest' : 'heste'}
            </Text>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <MapPin size={16} color={colors.primary} />
            <Text style={{ fontSize: 16, fontWeight: 'bold', color: colors.primary }}>
              {item.fromLocation}
            </Text>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <MapPin size={16} color="#666" />
            <Text style={{ fontSize: 16, color: '#666' }}>
              {item.toLocation}
            </Text>
          </View>

          <Text style={{ fontSize: 14, color: '#999', marginBottom: 4 }}>
            {item.vehicleName}
          </Text>

          {item.departureDate && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Calendar size={14} color="#999" />
              <Text style={{ fontSize: 12, color: '#999' }}>
                {item.departureDate} {item.departureTime && `kl. ${item.departureTime}`}
              </Text>
            </View>
          )}

          {item.notes && (
            <Text style={{ fontSize: 12, color: '#999', marginTop: 4, fontStyle: 'italic' }}>
              {item.notes}
            </Text>
          )}
        </View>

        {canManage && (
          <View style={{ flexDirection: 'row', gap: 8 }}>
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
            Transporter
          </Text>
          <Text style={{ fontSize: 14, color: colors.secondary, marginTop: 4 }}>
            {activeMode === 'private' ? 'Dine private transporter' : `${activeOrganization?.name} transporter`}
          </Text>
        </View>

        {/* Filter Buttons */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20 }}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {['all', 'planned', 'active', 'completed'].map((status) => (
              <TouchableOpacity
                key={status}
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 8,
                  borderRadius: 20,
                  backgroundColor: filter === status ? colors.primary : colors.secondary,
                }}
                onPress={() => setFilter(status)}
              >
                <Text style={{
                  color: filter === status ? colors.white : colors.primary,
                  fontWeight: '600',
                  fontSize: 14,
                }}>
                  {status === 'all' ? 'Alle' : getStatusText(status)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        {/* Add Button */}
        {canManage && (
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
            onPress={() => navigation.navigate('StartTransport')}
          >
            <Plus size={20} color={colors.primary} />
            <Text style={{ fontSize: 16, fontWeight: '600', color: colors.primary }}>
              Start Ny Transport
            </Text>
          </TouchableOpacity>
        )}

        {/* Transport List */}
        {transports.length === 0 ? (
          <View style={{ alignItems: 'center', marginTop: 40 }}>
            <MapPin size={64} color={colors.secondary} strokeWidth={1.5} />
            <Text style={{ fontSize: 16, color: colors.secondary, marginTop: 16, textAlign: 'center' }}>
              {canManage
                ? filter === 'all'
                  ? 'Ingen transporter endnu.\nStart din første transport ovenfor.'
                  : `Ingen ${getStatusText(filter).toLowerCase()} transporter.`
                : 'Ingen transporter tilgængelige.'}
            </Text>
          </View>
        ) : (
          <FlatList
            data={transports}
            renderItem={renderTransport}
            keyExtractor={item => item.id}
            scrollEnabled={false}
          />
        )}
      </ScrollView>
    </View>
  );
};

export default TransportListScreen;
