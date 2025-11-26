import { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, ActivityIndicator, Modal, Pressable } from 'react-native';
import { MapPin, Calendar, Clock, Users, Truck, Heart, FileText, Phone, Mail, Play, X, Caravan, Pause, CheckCircle } from 'lucide-react-native';
import { getTransport, updateTransport } from '../services/transportService';
import { getHorses } from '../services/horseService';
import { theme, colors } from '../styles/theme';
import { useOrganization } from '../context/OrganizationContext';
import { useTransport } from '../context/TransportContext';
import { calculateDuration, formatDateTime } from '../utils/timeUtils';
import ComplianceChecklist from '../components/ComplianceChecklist';
import { checkCompliance } from '../services/transportRegulationsService';

// Displays comprehensive details for a specific transport
const TransportDetailsScreen = ({ navigation, route }) => {
  const { transportId } = route.params;
  const { hasPermission, activeMode } = useOrganization();
  const { startTransport, stopTransport } = useTransport();
  const [transport, setTransport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showStartModal, setShowStartModal] = useState(false);
  const [showStopModal, setShowStopModal] = useState(false);
  const [startingTransport, setStartingTransport] = useState(false);
  const [stoppingTransport, setStoppingTransport] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(null);
  const [estimatedArrival, setEstimatedArrival] = useState(null);

  const canManage = activeMode === 'private' || hasPermission('canManageTours');

  useEffect(() => {
    loadTransportDetails();
  }, [transportId]);

  // Update elapsed time and estimated arrival every minute for active transports
  useEffect(() => {
    if (transport?.status === 'active' && transport?.actualStartTime) {
      // Update immediately
      const updateTimeInfo = () => {
        const duration = calculateDuration(transport.actualStartTime);
        setElapsedTime(duration.formatted);

        // Calculate estimated arrival time based on route duration
        if (transport.routeInfo?.duration) {
          const startTime = new Date(transport.actualStartTime);
          const estimatedArrivalTime = new Date(startTime.getTime() + (transport.routeInfo.duration * 1000));

          // Check if arrival time is in the past
          const now = new Date();
          if (estimatedArrivalTime < now) {
            const overdueDuration = calculateDuration(estimatedArrivalTime.toISOString());
            setEstimatedArrival(`Forsinket med ${overdueDuration.formatted}`);
          } else {
            setEstimatedArrival(formatDateTime(estimatedArrivalTime.toISOString()));
          }
        } else {
          setEstimatedArrival(null);
        }
      };
      updateTimeInfo();

      // Then update every minute
      const interval = setInterval(updateTimeInfo, 60000);
      return () => clearInterval(interval);
    } else {
      setElapsedTime(null);
      setEstimatedArrival(null);
    }
  }, [transport?.status, transport?.actualStartTime, transport?.routeInfo?.duration]);

  const loadTransportDetails = async () => {
    try {
      setLoading(true);
      const data = await getTransport(transportId);

      // Load full horse details if we have horseIds
      if (data.horseIds && data.horseIds.length > 0) {
        try {
          const allHorses = await getHorses(data.ownerType || activeMode, data.organizationId);
          // Filter to only the horses in this transport
          const transportHorses = allHorses.filter(horse => data.horseIds.includes(horse.id));
          data.horses = transportHorses;
        } catch (horseError) {
          console.error('Error loading horse details:', horseError);
          // Continue without horse details
          data.horses = [];
        }
      }

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

  const handleStartTransport = async (startFromScheduledTime = false) => {
    try {
      setStartingTransport(true);

      // Update transport status to active
      const now = new Date();
      const updatedTransport = {
        ...transport,
        status: 'active',
        actualStartTime: now.toISOString(), // Always track when transport actually started
      };

      // If starting now (not from scheduled time), update departure date/time and recalculate arrival
      if (!startFromScheduledTime) {
        updatedTransport.departureDate = now.toISOString().split('T')[0];
        updatedTransport.departureTime = now.toTimeString().split(' ')[0].substring(0, 5);

        // Recalculate estimated arrival based on route duration
        if (transport.routeInfo?.duration) {
          const estimatedArrival = new Date(now.getTime() + (transport.routeInfo.duration * 1000));
          updatedTransport.estimatedArrivalDate = estimatedArrival.toISOString().split('T')[0];
          updatedTransport.estimatedArrivalTime = estimatedArrival.toTimeString().split(' ')[0].substring(0, 5);
        }
      }

      await updateTransport(transportId, updatedTransport);

      // Update context to show active transport
      startTransport({ ...updatedTransport, id: transportId });

      Alert.alert('Succes', 'Transport startet', [
        {
          text: 'OK',
          onPress: () => {
            setShowStartModal(false);
            navigation.navigate('MainTabs', { screen: 'Home' });
          }
        }
      ]);
    } catch (error) {
      console.error('Error starting transport:', error);
      Alert.alert('Fejl', 'Kunne ikke starte transport');
    } finally {
      setStartingTransport(false);
    }
  };

  const isScheduledInPast = () => {
    if (!transport || !transport.departureDate || !transport.departureTime) return false;
    const scheduledTime = new Date(`${transport.departureDate}T${transport.departureTime}`);
    return scheduledTime < new Date();
  };

  const handleStopTransport = async (newStatus) => {
    try {
      setStoppingTransport(true);

      const updatedTransport = {
        ...transport,
        status: newStatus, // 'completed' or 'planned'
      };

      // If completing, set arrival time to now
      if (newStatus === 'completed') {
        const now = new Date();
        updatedTransport.arrivalDate = now.toISOString().split('T')[0];
        updatedTransport.arrivalTime = now.toTimeString().split(' ')[0].substring(0, 5);
        updatedTransport.actualEndTime = now.toISOString(); // Track actual end time
      }

      await updateTransport(transportId, updatedTransport);

      // Remove from active transport context
      stopTransport();

      const statusText = newStatus === 'completed' ? 'afsluttet' : 'fortrudt - sat tilbage til planlagt';
      Alert.alert('Succes', `Transport ${statusText}`, [
        {
          text: 'OK',
          onPress: () => {
            setShowStopModal(false);
            loadTransportDetails(); // Reload to show updated status
          }
        }
      ]);
    } catch (error) {
      console.error('Error stopping transport:', error);
      Alert.alert('Fejl', 'Kunne ikke stoppe transport');
    } finally {
      setStoppingTransport(false);
    }
  };

  if (loading) {
    return (
      <View style={[theme.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.secondary} />
      </View>
    );
  }

  if (!transport) {
    return (
      <View style={[theme.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ fontSize: 16, color: colors.secondary }}>Transport ikke fundet</Text>
      </View>
    );
  }

  return (
    <ScrollView style={theme.container}>
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

          {/* Elapsed Time for Active Transport */}
          {transport.status === 'active' && elapsedTime && (
            <View style={{
              backgroundColor: '#e8f5e9',
              padding: 12,
              borderRadius: 8,
              borderLeftWidth: 4,
              borderLeftColor: '#4CAF50',
              marginTop: 12,
            }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Clock size={18} color="#4CAF50" strokeWidth={2.5} />
                <Text style={{ fontSize: 14, color: '#2e7d32', fontWeight: '600' }}>
                  Transport i gang: {elapsedTime}
                </Text>
              </View>
              {transport.actualStartTime && (
                <Text style={{ fontSize: 12, color: '#666', marginTop: 4, marginLeft: 26 }}>
                  Startet: {formatDateTime(transport.actualStartTime)}
                </Text>
              )}
            </View>
          )}
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

          {/* Estimated Arrival for Active Transport */}
          {transport.status === 'active' && estimatedArrival && (
            <View style={{
              marginTop: 12,
              paddingTop: 12,
              borderTopWidth: 1,
              borderTopColor: '#eee'
            }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <Clock size={20} color={estimatedArrival.startsWith('Forsinket') ? '#d32f2f' : '#4CAF50'} />
                <View>
                  <Text style={{ fontSize: 12, color: '#666' }}>Forventet ankomst</Text>
                  <Text style={{
                    fontSize: 16,
                    fontWeight: '600',
                    color: estimatedArrival.startsWith('Forsinket') ? '#d32f2f' : '#333'
                  }}>
                    {estimatedArrival}
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* Actual/Planned Arrival */}
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

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: transport.trailerId ? 12 : 0 }}>
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

          {/* Trailer Information */}
          {transport.trailerId && (
            <View style={{
              paddingTop: 12,
              borderTopWidth: 1,
              borderTopColor: '#eee'
            }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <Caravan size={20} color={colors.primary} strokeWidth={2} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: colors.primary }}>
                    Trailer
                  </Text>
                  <Text style={{ fontSize: 14, color: '#666', marginTop: 2 }}>
                    {transport.trailerName}
                  </Text>
                </View>
              </View>
            </View>
          )}
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

          {transport.horses && transport.horses.length > 0 ? (
            <View style={{ marginTop: 8 }}>
              {transport.horses.map((horse, index) => (
                <View key={horse.id || index} style={{
                  paddingVertical: 12,
                  paddingHorizontal: 12,
                  backgroundColor: index % 2 === 0 ? '#f9f9f9' : colors.white,
                  borderRadius: 8,
                  marginBottom: 8,
                }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <Heart size={18} color={colors.secondary} fill={colors.secondary} />
                    <Text style={{ fontSize: 16, fontWeight: 'bold', color: colors.primary }}>
                      {horse.name}
                    </Text>
                  </View>

                  {horse.breed && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 26, marginTop: 4 }}>
                      <Text style={{ fontSize: 13, color: '#666', fontWeight: '600' }}>Oprindelse: </Text>
                      <Text style={{ fontSize: 13, color: '#666' }}>{horse.breed}</Text>
                    </View>
                  )}

                  {horse.age && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 26, marginTop: 2 }}>
                      <Text style={{ fontSize: 13, color: '#666', fontWeight: '600' }}>Født: </Text>
                      <Text style={{ fontSize: 13, color: '#666' }}>{horse.age}</Text>
                    </View>
                  )}

                  {horse.chipNumber && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 26, marginTop: 2 }}>
                      <Text style={{ fontSize: 13, color: '#666', fontWeight: '600' }}>Pasnummer: </Text>
                      <Text style={{ fontSize: 13, color: '#666' }}>{horse.chipNumber}</Text>
                    </View>
                  )}
                </View>
              ))}
            </View>
          ) : (
            <View style={{
              padding: 16,
              backgroundColor: '#f9f9f9',
              borderRadius: 8,
              alignItems: 'center',
              marginTop: 8
            }}>
              <Text style={{ fontSize: 14, color: '#999' }}>
                Ingen heste detaljer tilgængelige
              </Text>
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

        {/* Compliance Status */}
        {transport.complianceRequirements && (
          <View style={{ marginBottom: 16 }}>
            <ComplianceChecklist
              requirements={transport.complianceRequirements}
              confirmedDocuments={transport.confirmedDocuments || []}
              editable={false}
            />
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
          <View style={{ marginTop: 8, marginBottom: 32, gap: 12 }}>
            {/* Start Transport Button - Only for planned transports */}
            {transport.status === 'planned' && (
              <TouchableOpacity
                style={{
                  backgroundColor: colors.primary,
                  padding: 16,
                  borderRadius: 12,
                  alignItems: 'center',
                  flexDirection: 'row',
                  justifyContent: 'center',
                  gap: 8,
                }}
                onPress={() => setShowStartModal(true)}
              >
                <Play size={20} color={colors.white} strokeWidth={2.5} fill={colors.white} />
                <Text style={{ fontSize: 16, fontWeight: 'bold', color: colors.white }}>
                  Start Transport
                </Text>
              </TouchableOpacity>
            )}

            {/* Stop Transport Button - Only for active transports */}
            {transport.status === 'active' && (
              <TouchableOpacity
                style={{
                  backgroundColor: '#d32f2f',
                  padding: 16,
                  borderRadius: 12,
                  alignItems: 'center',
                  flexDirection: 'row',
                  justifyContent: 'center',
                  gap: 8,
                }}
                onPress={() => setShowStopModal(true)}
              >
                <Pause size={20} color={colors.white} strokeWidth={2.5} />
                <Text style={{ fontSize: 16, fontWeight: 'bold', color: colors.white }}>
                  Stop Transport
                </Text>
              </TouchableOpacity>
            )}

            {transport.status === 'planned' && (
              <TouchableOpacity
                style={{
                  backgroundColor: colors.secondary,
                  padding: 16,
                  borderRadius: 12,
                  alignItems: 'center',
                }}
                onPress={() => {
                  navigation.navigate('StartTransport', { editTransport: transport });
                }}
              >
                <Text style={{ fontSize: 16, fontWeight: '600', color: colors.primary }}>
                  Rediger Transport
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>

      {/* Start Transport Modal */}
      <Modal
        visible={showStartModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowStartModal(false)}
      >
        <View style={{
          flex: 1,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          justifyContent: 'center',
          alignItems: 'center',
        }}>
          <View style={{
            backgroundColor: colors.white,
            borderRadius: 16,
            padding: 24,
            width: '85%',
            maxWidth: 400,
          }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Text style={{ fontSize: 20, fontWeight: 'bold', color: colors.primary }}>
                Start Transport
              </Text>
              <Pressable onPress={() => setShowStartModal(false)}>
                <X size={24} color={colors.primary} />
              </Pressable>
            </View>

            <Text style={{ fontSize: 16, color: '#666', marginBottom: 24 }}>
              Hvornår vil du starte transporten?
            </Text>

            {/* Start Now Button */}
            <TouchableOpacity
              style={{
                backgroundColor: colors.primary,
                padding: 16,
                borderRadius: 12,
                alignItems: 'center',
                marginBottom: 12,
              }}
              onPress={() => handleStartTransport(false)}
              disabled={startingTransport}
            >
              {startingTransport ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <>
                  <Text style={{ fontSize: 16, fontWeight: 'bold', color: colors.white, marginBottom: 4 }}>
                    Start Nu
                  </Text>
                  <Text style={{ fontSize: 12, color: colors.white, opacity: 0.9 }}>
                    Afgang tidspunkt opdateres til nu
                  </Text>
                </>
              )}
            </TouchableOpacity>

            {/* Start from Scheduled Time Button - Only if scheduled time is in the past */}
            {isScheduledInPast() && (
              <TouchableOpacity
                style={{
                  backgroundColor: colors.secondary,
                  padding: 16,
                  borderRadius: 12,
                  alignItems: 'center',
                  marginBottom: 12,
                }}
                onPress={() => handleStartTransport(true)}
                disabled={startingTransport}
              >
                {startingTransport ? (
                  <ActivityIndicator color={colors.primary} />
                ) : (
                  <>
                    <Text style={{ fontSize: 16, fontWeight: 'bold', color: colors.primary, marginBottom: 4 }}>
                      Start fra Planlagt Tidspunkt
                    </Text>
                    <Text style={{ fontSize: 12, color: colors.primary, opacity: 0.8 }}>
                      Beholder afgang: {formatDate(transport.departureDate)} kl. {formatTime(transport.departureTime)}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={{
                padding: 12,
                alignItems: 'center',
              }}
              onPress={() => setShowStartModal(false)}
              disabled={startingTransport}
            >
              <Text style={{ fontSize: 14, color: '#666' }}>
                Annuller
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Stop Transport Modal */}
      <Modal
        visible={showStopModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowStopModal(false)}
      >
        <View style={{
          flex: 1,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          justifyContent: 'center',
          alignItems: 'center',
        }}>
          <View style={{
            backgroundColor: colors.white,
            borderRadius: 16,
            padding: 24,
            width: '85%',
            maxWidth: 400,
          }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Text style={{ fontSize: 20, fontWeight: 'bold', color: colors.primary }}>
                Stop Transport
              </Text>
              <Pressable onPress={() => setShowStopModal(false)}>
                <X size={24} color={colors.primary} />
              </Pressable>
            </View>

            <Text style={{ fontSize: 16, color: '#666', marginBottom: 24 }}>
              Hvordan vil du afslutte transporten?
            </Text>

            {/* Complete Transport Button */}
            <TouchableOpacity
              style={{
                backgroundColor: colors.primary,
                padding: 16,
                borderRadius: 12,
                alignItems: 'center',
                marginBottom: 12,
                flexDirection: 'row',
                justifyContent: 'center',
                gap: 8,
              }}
              onPress={() => handleStopTransport('completed')}
              disabled={stoppingTransport}
            >
              {stoppingTransport ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <>
                  <CheckCircle size={20} color={colors.white} strokeWidth={2.5} />
                  <View style={{ alignItems: 'center' }}>
                    <Text style={{ fontSize: 16, fontWeight: 'bold', color: colors.white }}>
                      Afslut Transport
                    </Text>
                    <Text style={{ fontSize: 12, color: colors.white, opacity: 0.9, marginTop: 2 }}>
                      Marker som gennemført
                    </Text>
                  </View>
                </>
              )}
            </TouchableOpacity>

            {/* Cancel/Revert Transport Button */}
            <TouchableOpacity
              style={{
                backgroundColor: '#ffa500',
                padding: 16,
                borderRadius: 12,
                alignItems: 'center',
                marginBottom: 12,
                flexDirection: 'row',
                justifyContent: 'center',
                gap: 8,
              }}
              onPress={() => handleStopTransport('planned')}
              disabled={stoppingTransport}
            >
              {stoppingTransport ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <>
                  <X size={20} color={colors.white} strokeWidth={2.5} />
                  <View style={{ alignItems: 'center' }}>
                    <Text style={{ fontSize: 16, fontWeight: 'bold', color: colors.white }}>
                      Fortryd Start
                    </Text>
                    <Text style={{ fontSize: 12, color: colors.white, opacity: 0.9, marginTop: 2 }}>
                      Tilbage til planlagt
                    </Text>
                  </View>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={{
                padding: 12,
                alignItems: 'center',
              }}
              onPress={() => setShowStopModal(false)}
              disabled={stoppingTransport}
            >
              <Text style={{ fontSize: 14, color: '#666' }}>
                Annuller
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

export default TransportDetailsScreen;