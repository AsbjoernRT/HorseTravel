import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { MapPin, Calendar, Clock, Users, Truck, Heart, FileText, Phone, Mail } from 'lucide-react-native';
import { getTransport } from '../services/transportService';
import { sharedStyles, colors } from '../styles/sharedStyles';
import { useOrganization } from '../context/OrganizationContext';

// Displays comprehensive details for a specific transport
const TransportDetailsScreen = ({ navigation, route }) => {
  const { transportId } = route.params;
  const { hasPermission, activeMode } = useOrganization();
  const [transport, setTransport] = useState(null);
  const [loading, setLoading] = useState(true);

  const canManage = activeMode === 'private' || hasPermission('canManageTours');

  useEffect(() => {
    loadTransportDetails();
  }, [transportId]);

  const loadTransportDetails = async () => {
    try {
      setLoading(true);
      const data = await getTransport(transportId);
      setTransport(data);
    } catch (error) {
      console.error('Error loading transport details:', error);
      Alert.alert('Fejl', 'Kunne ikke indlæse transport detaljer');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
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

  const formatDate = (dateString) => {
    if (!dateString) return 'Ikke angivet';
    const date = new Date(dateString);
    return date.toLocaleDateString('da-DK', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (timeString) => {
    if (!timeString) return 'Ikke angivet';
    return timeString;
  };

  if (loading) {
    return (
      <View style={[sharedStyles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.secondary} />
      </View>
    );
  }

  if (!transport) {
    return (
      <View style={[sharedStyles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ fontSize: 16, color: colors.secondary }}>Transport ikke fundet</Text>
      </View>
    );
  }

  return (
    <ScrollView style={sharedStyles.container}>
      <View style={{ padding: 16 }}>
        {/* Header with Status */}
        <View style={{ marginBottom: 24 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            <View style={{
              backgroundColor: getStatusColor(transport.status),
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 8,
            }}>
              <Text style={{ color: colors.white, fontSize: 14, fontWeight: 'bold' }}>
                {getStatusText(transport.status)}
              </Text>
            </View>
            <Text style={{ fontSize: 16, color: '#666' }}>
              Transport #{transport.id.substring(0, 8)}
            </Text>
          </View>
        </View>

        {/* Route Information */}
        <View style={{
          backgroundColor: colors.white,
          padding: 16,
          borderRadius: 12,
          marginBottom: 16,
        }}>
          <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.primary, marginBottom: 12 }}>
            Rute
          </Text>
          
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            <MapPin size={20} color={colors.primary} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 12, color: '#666', marginBottom: 2 }}>Fra</Text>
              <Text style={{ fontSize: 16, fontWeight: '600', color: colors.primary }}>
                {transport.fromLocation}
              </Text>
            </View>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <MapPin size={20} color="#666" />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 12, color: '#666', marginBottom: 2 }}>Til</Text>
              <Text style={{ fontSize: 16, fontWeight: '600', color: '#333' }}>
                {transport.toLocation}
              </Text>
            </View>
          </View>

          {(transport.distance || transport.durationText || transport.routeInfo) && (
            <View style={{ 
              marginTop: 12, 
              paddingTop: 12, 
              borderTopWidth: 1, 
              borderTopColor: '#eee' 
            }}>
              {(transport.distance || transport.routeInfo?.distanceText) && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <MapPin size={16} color="#666" />
                  <Text style={{ fontSize: 14, color: '#666' }}>
                    Afstand: {transport.distance || transport.routeInfo?.distanceText || 'Ukendt'}
                  </Text>
                </View>
              )}
              {(transport.durationText || transport.routeInfo?.durationText) && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Clock size={16} color="#666" />
                  <Text style={{ fontSize: 14, color: '#666' }}>
                    Estimeret køretid: {transport.durationText || transport.routeInfo?.durationText}
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>

        {/* Date & Time Information */}
        <View style={{
          backgroundColor: colors.white,
          padding: 16,
          borderRadius: 12,
          marginBottom: 16,
        }}>
          <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.primary, marginBottom: 12 }}>
            Tidspunkt
          </Text>
          
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            <Calendar size={20} color={colors.primary} />
            <View>
              <Text style={{ fontSize: 12, color: '#666' }}>Afgang</Text>
              <Text style={{ fontSize: 16, fontWeight: '600' }}>
                {formatDate(transport.departureDate)}
              </Text>
            </View>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Clock size={20} color={colors.primary} />
            <View>
              <Text style={{ fontSize: 12, color: '#666' }}>Tidspunkt</Text>
              <Text style={{ fontSize: 16, fontWeight: '600' }}>
                {formatTime(transport.departureTime)}
              </Text>
            </View>
          </View>

          {transport.arrivalDate && (
            <View style={{ 
              marginTop: 12, 
              paddingTop: 12, 
              borderTopWidth: 1, 
              borderTopColor: '#eee' 
            }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <Calendar size={20} color="#666" />
                <View>
                  <Text style={{ fontSize: 12, color: '#666' }}>Ankomst</Text>
                  <Text style={{ fontSize: 16, fontWeight: '600' }}>
                    {formatDate(transport.arrivalDate)} {transport.arrivalTime && `kl. ${transport.arrivalTime}`}
                  </Text>
                </View>
              </View>
            </View>
          )}
        </View>

        {/* Vehicle Information */}
        <View style={{
          backgroundColor: colors.white,
          padding: 16,
          borderRadius: 12,
          marginBottom: 16,
        }}>
          <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.primary, marginBottom: 12 }}>
            Køretøj
          </Text>
          
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Truck size={20} color={colors.primary} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 16, fontWeight: '600' }}>
                {transport.vehicleName || 'Ikke angivet'}
              </Text>
              {transport.vehicleCapacity && (
                <Text style={{ fontSize: 14, color: '#666', marginTop: 2 }}>
                  Kapacitet: {transport.vehicleCapacity} heste
                </Text>
              )}
            </View>
          </View>
        </View>

        {/* Horses Information */}
        <View style={{
          backgroundColor: colors.white,
          padding: 16,
          borderRadius: 12,
          marginBottom: 16,
        }}>
          <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.primary, marginBottom: 12 }}>
            Heste
          </Text>
          
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <Users size={20} color={colors.primary} />
            <Text style={{ fontSize: 16, fontWeight: '600' }}>
              {transport.horseCount || 0} {transport.horseCount === 1 ? 'hest' : 'heste'}
            </Text>
          </View>

          {transport.horses && transport.horses.length > 0 && (
            <View style={{ marginTop: 8 }}>
              {transport.horses.map((horse, index) => (
                <View key={horse.id || index} style={{ 
                  flexDirection: 'row', 
                  alignItems: 'center', 
                  gap: 8, 
                  paddingVertical: 8,
                  borderBottomWidth: index < transport.horses.length - 1 ? 1 : 0,
                  borderBottomColor: '#eee'
                }}>
                  <Heart size={16} color={colors.secondary} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: '600' }}>
                      {horse.name}
                    </Text>
                    {horse.breed && (
                      <Text style={{ fontSize: 12, color: '#666' }}>
                        {horse.breed}
                      </Text>
                    )}
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Contact Information */}
        {(transport.contactPerson || transport.contactPhone || transport.contactEmail) && (
          <View style={{
            backgroundColor: colors.white,
            padding: 16,
            borderRadius: 12,
            marginBottom: 16,
          }}>
            <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.primary, marginBottom: 12 }}>
              Kontakt
            </Text>
            
            {transport.contactPerson && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                <Users size={20} color={colors.primary} />
                <Text style={{ fontSize: 16 }}>{transport.contactPerson}</Text>
              </View>
            )}

            {transport.contactPhone && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                <Phone size={20} color={colors.primary} />
                <Text style={{ fontSize: 16 }}>{transport.contactPhone}</Text>
              </View>
            )}

            {transport.contactEmail && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <Mail size={20} color={colors.primary} />
                <Text style={{ fontSize: 16 }}>{transport.contactEmail}</Text>
              </View>
            )}
          </View>
        )}

        {/* Notes */}
        {transport.notes && (
          <View style={{
            backgroundColor: colors.white,
            padding: 16,
            borderRadius: 12,
            marginBottom: 16,
          }}>
            <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.primary, marginBottom: 12 }}>
              Noter
            </Text>
            
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
              <FileText size={20} color={colors.primary} style={{ marginTop: 2 }} />
              <Text style={{ fontSize: 16, lineHeight: 24, flex: 1 }}>
                {transport.notes}
              </Text>
            </View>
          </View>
        )}

        {/* Action Buttons */}
        {canManage && (
          <View style={{ marginTop: 8, marginBottom: 32 }}>
            <TouchableOpacity
              style={{
                backgroundColor: colors.secondary,
                padding: 16,
                borderRadius: 12,
                alignItems: 'center',
              }}
              onPress={() => {
                // Navigate to edit screen when available
                Alert.alert('Info', 'Rediger funktion kommer snart');
              }}
            >
              <Text style={{ fontSize: 16, fontWeight: '600', color: colors.primary }}>
                Rediger Transport
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </ScrollView>
  );
};

export default TransportDetailsScreen;