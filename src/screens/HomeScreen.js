import React, { useState } from 'react';

// Dashboard entry point that surfaces transport status and quick actions for the signed-in user.
import { View, Text, TouchableOpacity, ScrollView, Image, Alert, ActivityIndicator } from 'react-native';
import { Truck } from 'lucide-react-native';
import Toast from 'react-native-toast-message';
import { globalStyles } from '../styles/globalStyles';
import { useTransport } from '../context/TransportContext';
import { useAuth } from '../context/AuthContext';
import { useOrganization } from '../context/OrganizationContext';
import { getTransportsByStatus, updateTransport } from '../services/transportService';
import ModeSwitcher from '../components/ModeSwitcher';

const HomeScreen = ({ navigation }) => {
  const { activeTransport } = useTransport();
  const { user, userProfile } = useAuth();
  const { activeMode, activeOrganization } = useOrganization();
  const [cleaningUp, setCleaningUp] = useState(false);

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
    <ScrollView style={globalStyles.container}>
      {/* Logo */}
      <View style={{ alignItems: 'center', marginBottom: 20 }}>
        <Image
          source={require('../assets/images/fuldt-logo.png')}
          style={{ width: 250, height: 120, resizeMode: 'contain' }}
        />
      </View>

      {/* Mode Switcher */}
      <View style={{ alignItems: 'center', marginBottom: 20 }}>
        <ModeSwitcher />
      </View>

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

      <View style={{ marginTop: 20 }}>
        <Text style={{ fontSize: 18, marginBottom: 15, textAlign: 'center', color: '#202020' }}>
          Din komplette løsning for hestetransport
        </Text>

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
              style={[globalStyles.listItem, { backgroundColor: '#e8f5e8', borderColor: '#002300', borderWidth: 2 }]}
              onPress={() => navigation.navigate('ActiveTransport')}
            >
              <Text style={[globalStyles.listItemTitle, { color: '#002300' }]}>🚛 AKTIV TRANSPORT</Text>
              <Text style={globalStyles.listItemSubtitle}>
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
            <View style={globalStyles.listItem}>
              <Text style={globalStyles.listItemTitle}>Næste Transport</Text>
              <Text style={globalStyles.listItemSubtitle}>Ingen planlagte transporter</Text>
            </View>
          )}

          {/* Planned transports overview */}
          <View style={globalStyles.listItem}>
            <Text style={globalStyles.listItemTitle}>Planlagte Kørsler</Text>
            <Text style={{ fontSize: 28, fontWeight: 'bold', color: '#002300', marginTop: 10 }}>0</Text>
            <Text style={{ color: '#666666', marginTop: 5 }}>Se alle kørsler</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
};

export default HomeScreen;
