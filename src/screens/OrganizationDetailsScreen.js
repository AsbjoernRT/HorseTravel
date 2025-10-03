import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Alert, ActivityIndicator, ScrollView, Share } from 'react-native';
import { Building2, Copy, Share2, Users, Crown, Shield, UserCheck } from 'lucide-react-native';
import { getOrganization, getOrganizationMembers } from '../services/organizationService';
import { useOrganization } from '../context/OrganizationContext';
import { sharedStyles, colors } from '../styles/sharedStyles';
import * as Clipboard from 'expo-clipboard';

const OrganizationDetailsScreen = ({ route, navigation }) => {
  const { organizationId } = route.params;
  const { activeOrganization } = useOrganization();
  const [organization, setOrganization] = useState(null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOrganizationData();
  }, [organizationId]);

  const loadOrganizationData = async () => {
    try {
      setLoading(true);
      const [orgData, membersData] = await Promise.all([
        getOrganization(organizationId),
        getOrganizationMembers(organizationId),
      ]);
      setOrganization(orgData);
      setMembers(membersData);
    } catch (error) {
      console.error('Error loading organization:', error);
      Alert.alert('Fejl', 'Kunne ikke hente organisations data');
    } finally {
      setLoading(false);
    }
  };

  const copyCode = async () => {
    await Clipboard.setStringAsync(organization.organizationCode);
    Alert.alert('Kopieret!', 'Organisations koden er kopieret til udklipsholderen');
  };

  const shareCode = async () => {
    try {
      await Share.share({
        message: `Kom med i ${organization.name}!\n\nBrug denne kode i Horse Travel appen:\n${organization.organizationCode}`,
        title: 'Tilslut organisation',
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const getRoleIcon = (role) => {
    switch (role) {
      case 'owner':
        return <Crown size={16} color={colors.primary} strokeWidth={2} />;
      case 'admin':
        return <Shield size={16} color={colors.primary} strokeWidth={2} />;
      default:
        return <UserCheck size={16} color={colors.primary} strokeWidth={2} />;
    }
  };

  const getRoleText = (role) => {
    switch (role) {
      case 'owner':
        return 'Ejer';
      case 'admin':
        return 'Administrator';
      default:
        return 'Medlem';
    }
  };

  if (loading) {
    return (
      <View style={[sharedStyles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!organization) {
    return (
      <View style={[sharedStyles.container, { justifyContent: 'center', alignItems: 'center', padding: 24 }]}>
        <Text style={{ fontSize: 16, color: '#666', textAlign: 'center' }}>
          Organisation ikke fundet
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={sharedStyles.container}>
      <View style={{ padding: 24 }}>
        {/* Organization Header */}
        <View style={{ alignItems: 'center', marginBottom: 32 }}>
          <Building2 size={64} color={colors.secondary} strokeWidth={1.5} />
          <Text style={{ fontSize: 24, fontWeight: 'bold', color: colors.white, marginTop: 16 }}>
            {organization.name}
          </Text>
          {organization.description && (
            <Text style={{ fontSize: 14, color: colors.secondary, marginTop: 8, textAlign: 'center' }}>
              {organization.description}
            </Text>
          )}
        </View>

        {/* Organization Code Card */}
        <View style={{
          backgroundColor: colors.secondary,
          borderRadius: 16,
          padding: 24,
          marginBottom: 24,
          alignItems: 'center',
        }}>
          <Text style={{ fontSize: 14, color: colors.primary, marginBottom: 8, fontWeight: '600' }}>
            Organisations Kode
          </Text>
          <Text style={{
            fontSize: 32,
            fontWeight: 'bold',
            color: colors.primary,
            letterSpacing: 8,
            marginBottom: 16,
          }}>
            {organization.organizationCode}
          </Text>
          <Text style={{ fontSize: 12, color: colors.primary, marginBottom: 16, textAlign: 'center', opacity: 0.8 }}>
            Del denne kode med dit team, så de kan tilslutte sig
          </Text>

          <View style={{ flexDirection: 'row', gap: 12 }}>
            <TouchableOpacity
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: colors.primary,
                paddingHorizontal: 20,
                paddingVertical: 12,
                borderRadius: 12,
                gap: 8,
              }}
              onPress={copyCode}
            >
              <Copy size={18} color={colors.white} strokeWidth={2} />
              <Text style={{ color: colors.white, fontWeight: '600' }}>Kopier</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: colors.primary,
                paddingHorizontal: 20,
                paddingVertical: 12,
                borderRadius: 12,
                gap: 8,
              }}
              onPress={shareCode}
            >
              <Share2 size={18} color={colors.white} strokeWidth={2} />
              <Text style={{ color: colors.white, fontWeight: '600' }}>Del</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Members Section */}
        <View style={{
          backgroundColor: 'rgba(214, 209, 202, 0.1)',
          borderRadius: 16,
          padding: 20,
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 8 }}>
            <Users size={20} color={colors.secondary} strokeWidth={2} />
            <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.white }}>
              Medlemmer ({members.length})
            </Text>
          </View>

          {members.map((member, index) => (
            <View
              key={member.id}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: 12,
                borderBottomWidth: index < members.length - 1 ? 1 : 0,
                borderBottomColor: 'rgba(214, 209, 202, 0.2)',
                gap: 12,
              }}
            >
              <View style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: colors.secondary,
                justifyContent: 'center',
                alignItems: 'center',
              }}>
                <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.primary }}>
                  {member.displayName?.charAt(0).toUpperCase() || '?'}
                </Text>
              </View>

              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 16, fontWeight: '600', color: colors.white }}>
                  {member.displayName || 'Ukendt'}
                </Text>
                <Text style={{ fontSize: 12, color: colors.secondary, marginTop: 2 }}>
                  {member.email}
                </Text>
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                {getRoleIcon(member.role)}
                <Text style={{ fontSize: 12, color: colors.secondary, fontWeight: '600' }}>
                  {getRoleText(member.role)}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* Settings Section - Only for owner/admin */}
        {activeOrganization?.memberInfo?.role === 'owner' || activeOrganization?.memberInfo?.role === 'admin' ? (
          <View style={{ marginTop: 24 }}>
            <TouchableOpacity
              style={{
                backgroundColor: 'rgba(214, 209, 202, 0.1)',
                borderRadius: 12,
                padding: 16,
                alignItems: 'center',
              }}
              onPress={() => {
                // TODO: Navigate to organization settings
                Alert.alert('Kommer snart', 'Organisations indstillinger er under udvikling');
              }}
            >
              <Text style={{ color: colors.secondary, fontSize: 16, fontWeight: '600' }}>
                Organisations Indstillinger
              </Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </View>
    </ScrollView>
  );
};

export default OrganizationDetailsScreen;
