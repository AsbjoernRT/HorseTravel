import React, { useState, useEffect, useRef } from 'react';

// Dashboard entry point that surfaces transport status and quick actions for the signed-in user.
import { View, Text, TouchableOpacity, ScrollView, Image, Alert, ActivityIndicator, Dimensions } from 'react-native';
import { Truck, LogOut, Calendar, TrendingUp, Heart, Navigation } from 'lucide-react-native';
import Toast from 'react-native-toast-message';
import { theme, colors } from '../styles/theme';
import { useTransport } from '../context/TransportContext';
import { useAuth } from '../context/AuthContext';
import { useOrganization } from '../context/OrganizationContext';
import { getTransportsByStatus, updateTransport } from '../services/transportService';
import { logOut } from '../services/authService';
import ModeSwitcher from '../components/ModeSwitcher';
import { useFocusEffect } from '@react-navigation/native';

const { width } = Dimensions.get('window');

const HomeScreen = ({ navigation }) => {
  const { activeTransport } = useTransport();
  const { user, userProfile } = useAuth();
  const { activeMode, activeOrganization } = useOrganization();
  const [cleaningUp, setCleaningUp] = useState(false);
  const [stats, setStats] = useState({
    week: { horses: 0, km: 0 },
    month: { horses: 0, km: 0 },
    year: { horses: 0, km: 0 },
    allTime: { horses: 0, km: 0 },
    upcomingCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [currentStatPage, setCurrentStatPage] = useState(0);
  const scrollViewRef = useRef(null);

  const statPeriods = [
    { key: 'week', label: 'Denne Uge' },
    { key: 'month', label: 'Denne Måned' },
    { key: 'year', label: 'Dette År' },
    { key: 'allTime', label: 'Total' },
  ];

  const handleLogout = async () => {
    Alert.alert(
      'Log ud',
      'Er du sikker på, at du vil logge ud?',
      [
        { text: 'Annuller', style: 'cancel' },
        {
          text: 'Log ud',
          style: 'destructive',
          onPress: async () => {
            try {
              await logOut();
              Toast.show({
                type: 'success',
                text1: 'Logged ud',
                text2: 'Du er nu logget ud.',
              });
            } catch (error) {
              console.error('Error logging out:', error);
              Toast.show({
                type: 'error',
                text1: 'Fejl',
                text2: 'Kunne ikke logge ud.',
              });
            }
          }
        }
      ]
    );
  };

  // Load stats on mount and when mode/org changes
  useFocusEffect(
    React.useCallback(() => {
      loadStats();
    }, [activeMode, activeOrganization])
  );

  const loadStats = async () => {
    try {
      setLoading(true);

      // For now, use simple placeholder stats to avoid index issues
      // TODO: Create Firestore indexes and implement full stats
      setStats({
        week: { horses: 0, km: 0 },
        month: { horses: 0, km: 0 },
        year: { horses: 0, km: 0 },
        allTime: { horses: 0, km: 0 },
        upcomingCount: 0,
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const cleanupDuplicateActiveTransports = async () => {
    Alert.alert(
      'Ryd Op i Aktive Transporter',
      'Dette vil markere alle dine aktive transporter som afsluttet, undtagen den nyeste. Vil du fortsætte?',
      [
        { text: 'Annuller', style: 'cancel' },
        {
          text: 'Ja, Ryd Op',
          style: 'destructive',
          onPress: async () => {
            try {
              setCleaningUp(true);

              // Get all active transports
              const activeTransports = await getTransportsByStatus('active', activeMode, activeOrganization?.id);

              if (activeTransports.length <= 1) {
                Toast.show({
                  type: 'info',
                  text1: 'Ingen Oprydning Nødvendig',
                  text2: 'Du har kun én eller ingen aktive transporter.',
                });
                setCleaningUp(false);
                return;
              }

              // Sort by creation date (newest first)
              const sortedTransports = activeTransports.sort((a, b) => {
                const dateA = a.createdAt?.toDate?.() || new Date(0);
                const dateB = b.createdAt?.toDate?.() || new Date(0);
                return dateB - dateA;
              });

              // Keep the newest one, mark the rest as completed
              const transportsToComplete = sortedTransports.slice(1);

              // Update all old active transports to completed
              await Promise.all(
                transportsToComplete.map(transport =>
                  updateTransport(transport.id, { status: 'completed' })
                )
              );

              Toast.show({
                type: 'success',
                text1: 'Oprydning Fuldført',
                text2: `${transportsToComplete.length} transporter markeret som afsluttet.`,
              });
            } catch (error) {
              console.error('Error cleaning up transports:', error);
              Toast.show({
                type: 'error',
                text1: 'Fejl',
                text2: 'Kunne ikke rydde op i transporter.',
              });
            } finally {
              setCleaningUp(false);
            }
          }
        }
      ]
    );
  };

  return (
    <ScrollView style={theme.container} contentContainerStyle={{ padding: 20, paddingTop: 60 }}>
      {/* Logo */}
      <View style={{ alignItems: 'center', marginBottom: 20 }}>
        <Image
          source={require('../assets/images/fuldt-logo.png')}
          style={{ width: 250, height: 120, resizeMode: 'contain' }}
        />
      </View>

      {/* Mode Switcher
      <View style={{ alignItems: 'center', marginBottom: 20 }}>
        <ModeSwitcher />
      </View> */}

      {/* Welcome message */}
      {userProfile && (
        <Text style={{ fontSize: 18, marginBottom: 15, textAlign: 'center', color: '#202020' }}>
          Velkommen, {userProfile.displayName}!
        </Text>
      )}

      {/* Active context info */}
      <Text style={{ fontSize: 14, marginBottom: 20, textAlign: 'center', color: '#666' }}>
        {activeMode === 'private'
          ? 'Du er i privat person tilstand'
          : `Organisation: ${activeOrganization?.name || 'Ingen'}`}
      </Text>

      {/* Swipeable Stats */}
      <View style={{ marginBottom: 20 }}>
        <ScrollView
          ref={scrollViewRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(event) => {
            const newPage = Math.round(event.nativeEvent.contentOffset.x / (width - 40));
            setCurrentStatPage(newPage);
          }}
          contentContainerStyle={{ paddingRight: 40 }}
        >
          {statPeriods.map((period, index) => (
            <View key={period.key} style={{ width: width - 40, paddingRight: index < statPeriods.length - 1 ? 12 : 0 }}>
              <View style={{ backgroundColor: colors.white, padding: 20, borderRadius: 12, marginBottom: 8 }}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: colors.textSecondary, marginBottom: 16, textAlign: 'center' }}>
                  {period.label}
                </Text>
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <View style={{ flex: 1, alignItems: 'center' }}>
                    <Heart size={28} color={colors.primary} strokeWidth={2} />
                    <Text style={{ fontSize: 28, fontWeight: 'bold', color: colors.black, marginTop: 12 }}>
                      {loading ? '-' : stats[period.key].horses}
                    </Text>
                    <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 4, textAlign: 'center' }}>
                      Heste Transporteret
                    </Text>
                  </View>
                  <View style={{ width: 1, backgroundColor: colors.secondary, marginVertical: 8 }} />
                  <View style={{ flex: 1, alignItems: 'center' }}>
                    <Navigation size={28} color={colors.primary} strokeWidth={2} />
                    <Text style={{ fontSize: 28, fontWeight: 'bold', color: colors.black, marginTop: 12 }}>
                      {loading ? '-' : stats[period.key].km}
                    </Text>
                    <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 4, textAlign: 'center' }}>
                      KM Kørt
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          ))}
        </ScrollView>
        {/* Page Indicators */}
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 8 }}>
          {statPeriods.map((_, index) => (
            <View
              key={index}
              style={{
                width: 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: currentStatPage === index ? colors.primary : colors.border,
              }}
            />
          ))}
        </View>
      </View>

      <View style={{ marginTop: 20 }}>

        {/* Start New Transport Button */}
        <TouchableOpacity
          style={{
            backgroundColor: '#002300',
            padding: 18,
            borderRadius: 12,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 12,
            marginBottom: 20,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 5,
          }}
          onPress={() => navigation.navigate('StartTransport')}
        >
          <Truck size={24} color="#d6d1ca" strokeWidth={2.5} />
          <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#d6d1ca' }}>
            Start Ny Transport
          </Text>
        </TouchableOpacity>

        <View style={{ marginTop: 10 }}>
          {/* Active transport if exists */}
          {activeTransport ? (
            <TouchableOpacity
              style={[theme.listItem, { backgroundColor: '#e8f5e8', borderColor: '#002300', borderWidth: 2 }]}
              onPress={() => navigation.navigate('TransportDetails', { transportId: activeTransport.id })}
            >
              <Text style={[theme.listItemTitle, { color: '#002300' }]}>AKTIV TRANSPORT</Text>
              <Text style={theme.listItemSubtitle}>
                {activeTransport.fromLocation} → {activeTransport.toLocation}
              </Text>
              <Text style={{ color: '#666666', marginTop: 5 }}>
                {activeTransport.horseCount} heste • {activeTransport.vehicleName || 'Ukendt køretøj'}
              </Text>
              <Text style={{ color: '#002300', marginTop: 5, fontWeight: 'bold' }}>
                Tryk for at se detaljer
              </Text>
            </TouchableOpacity>
          ) : (
            <View style={theme.listItem}>
              <Text style={theme.listItemTitle}>Næste Transport</Text>
              <Text style={theme.listItemSubtitle}>Ingen planlagte transporter</Text>
            </View>
          )}

          {/* Upcoming transports overview */}
          <TouchableOpacity
            style={theme.listItem}
            onPress={() => navigation.navigate('TransportList')}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View>
                <Text style={theme.listItemTitle}>Kommende Transporter</Text>
                <Text style={{ fontSize: 28, fontWeight: 'bold', color: colors.primary, marginTop: 10 }}>
                  {loading ? '-' : stats.upcomingCount}
                </Text>
                <Text style={{ color: colors.textSecondary, marginTop: 5 }}>Tryk for at se alle</Text>
              </View>
              <Calendar size={32} color={colors.primary} strokeWidth={2} />
            </View>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
};

export default HomeScreen;
