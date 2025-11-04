import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, Image, Alert } from 'react-native';
import { User, Building2, LogOut, ChevronRight, Truck, Heart, MessageCircle, Settings, Users, Crown, Shield, UserCheck } from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { useOrganization } from '../context/OrganizationContext';
import { logOut } from '../services/authService';
import { theme, colors } from '../styles/theme';
import ModeSwitcher from '../components/ModeSwitcher';
import Toast from 'react-native-toast-message';

const MenuScreen = ({ navigation }) => {
  const { user, userProfile } = useAuth();
  const { activeMode, activeOrganization } = useOrganization();

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
                text1: 'Logget ud',
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

  return (
    <ScrollView style={theme.container} contentContainerStyle={{ padding: 20, paddingTop: 60 }}>
      {/* User Profile Section */}
      <View style={{ alignItems: 'center', marginBottom: 30 }}>
        <View style={{
          width: 80,
          height: 80,
          borderRadius: 40,
          backgroundColor: colors.primary,
          justifyContent: 'center',
          alignItems: 'center',
          marginBottom: 12,
        }}>
          <User size={40} color={colors.white} strokeWidth={2} />
        </View>
        <Text style={{ fontSize: 20, fontWeight: 'bold', color: colors.black, marginBottom: 4 }}>
          {userProfile?.displayName || 'Bruger'}
        </Text>
        <Text style={{ fontSize: 14, color: colors.textSecondary }}>
          {user?.email}
        </Text>
      </View>

      {/* Mode Switcher */}
      <View style={{ marginBottom: 30 }}>
        <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textSecondary, marginBottom: 12, textTransform: 'uppercase' }}>
          Tilstand
        </Text>
        <View style={{ alignItems: 'flex-start' }}>
          <ModeSwitcher />
        </View>
        {activeMode === 'organization' && activeOrganization && (
          <TouchableOpacity
            style={{
              marginTop: 12,
              padding: 16,
              backgroundColor: colors.white,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: colors.border,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 4,
              elevation: 3,
            }}
            onPress={() => navigation.navigate('OrganizationDetails', { organizationId: activeOrganization?.id })}
          >
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 12, color: colors.textSecondary, marginBottom: 6, fontWeight: '600' }}>
                  AKTIV ORGANISATION
                </Text>
                <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.primary, marginBottom: 8 }}>
                  {activeOrganization.name}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Users size={14} color={colors.textSecondary} />
                    <Text style={{ fontSize: 12, color: colors.textSecondary }}>
                      {activeOrganization.memberCount || 0} medlem{activeOrganization.memberCount !== 1 ? 'mer' : ''}
                    </Text>
                  </View>
                  {activeOrganization.memberInfo?.role && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      {activeOrganization.memberInfo.role === 'owner' ? (
                        <Crown size={14} color={colors.primary} strokeWidth={2} />
                      ) : activeOrganization.memberInfo.role === 'admin' ? (
                        <Shield size={14} color={colors.primary} strokeWidth={2} />
                      ) : (
                        <UserCheck size={14} color={colors.primary} strokeWidth={2} />
                      )}
                      <Text style={{ fontSize: 12, color: colors.primary, fontWeight: '600' }}>
                        {activeOrganization.memberInfo.role === 'owner' ? 'Ejer' :
                         activeOrganization.memberInfo.role === 'admin' ? 'Admin' : 'Medlem'}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
              <Settings size={20} color={colors.textSecondary} strokeWidth={2} />
            </View>
          </TouchableOpacity>
        )}
      </View>

      {/* Menu Options */}
      <View style={{ marginBottom: 30 }}>
        <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textSecondary, marginBottom: 12, textTransform: 'uppercase' }}>
          Indstillinger
        </Text>

        {/* Vehicles */}
        <TouchableOpacity
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: colors.white,
            padding: 16,
            borderRadius: 12,
            marginBottom: 12,
          }}
          onPress={() => navigation.navigate('VehicleManagement')}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Truck size={20} color={colors.primary} strokeWidth={2} />
            <Text style={{ fontSize: 16, color: colors.black }}>
              Køretøjer
            </Text>
          </View>
          <ChevronRight size={20} color={colors.textSecondary} />
        </TouchableOpacity>

        {/* Horses */}
        <TouchableOpacity
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: colors.white,
            padding: 16,
            borderRadius: 12,
            marginBottom: 12,
          }}
          onPress={() => navigation.navigate('HorseManagement')}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Heart size={20} color={colors.primary} strokeWidth={2} />
            <Text style={{ fontSize: 16, color: colors.black }}>
              Heste
            </Text>
          </View>
          <ChevronRight size={20} color={colors.textSecondary} />
        </TouchableOpacity>

        {/* Questions/Chatbot */}
        <TouchableOpacity
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: colors.white,
            padding: 16,
            borderRadius: 12,
            marginBottom: 12,
          }}
          onPress={() => navigation.navigate('ChatbotScreen')}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <MessageCircle size={20} color={colors.primary} strokeWidth={2} />
            <Text style={{ fontSize: 16, color: colors.black }}>
              Spørgsmål
            </Text>
          </View>
          <ChevronRight size={20} color={colors.textSecondary} />
        </TouchableOpacity>

        {/* Create Organization (only in private mode) */}
        {activeMode === 'private' && (
          <TouchableOpacity
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: colors.white,
              padding: 16,
              borderRadius: 12,
              marginBottom: 12,
            }}
            onPress={() => navigation.navigate('OrganizationSetup')}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Building2 size={20} color={colors.primary} strokeWidth={2} />
              <Text style={{ fontSize: 16, color: colors.black }}>
                Opret Organisation
              </Text>
            </View>
            <ChevronRight size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Logout Button */}
      <TouchableOpacity
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#fee',
          padding: 16,
          borderRadius: 12,
          gap: 12,
        }}
        onPress={handleLogout}
      >
        <LogOut size={20} color="#d32f2f" strokeWidth={2} />
        <Text style={{ fontSize: 16, fontWeight: '600', color: '#d32f2f' }}>
          Log ud
        </Text>
      </TouchableOpacity>

      {/* App Version */}
      <View style={{ marginTop: 40, alignItems: 'center' }}>
        <Text style={{ fontSize: 12, color: colors.textSecondary }}>
          HorseTravel v1.0.0
        </Text>
      </View>
    </ScrollView>
  );
};

export default MenuScreen;
