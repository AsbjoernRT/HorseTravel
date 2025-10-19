import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, FlatList, ActivityIndicator } from 'react-native';
import { ChevronDown, Building2, User, Settings } from 'lucide-react-native';
import { useOrganization } from '../context/OrganizationContext';
import { useNavigation } from '@react-navigation/native';
import { sharedStyles, colors } from '../styles/sharedStyles';

// Control that lets the user jump between private mode and any joined organizations...
const ModeSwitcher = () => {
  const { activeMode, activeOrganization, organizations, switchMode, loading } = useOrganization();
  const navigation = useNavigation();
  const [modalVisible, setModalVisible] = useState(false);
  const [switching, setSwitching] = useState(false);

  // Updates context state and closes the picker while feedback spinner is shown.
  const handleModeSwitch = async (mode, orgId = null) => {
    try {
      setSwitching(true);
      await switchMode(mode, orgId);
      setModalVisible(false);
    } catch (error) {
      console.error('Error switching mode:', error);
      alert('Kunne ikke skifte tilstand');
    } finally {
      setSwitching(false);
    }
  };

  const getCurrentLabel = () => {
    if (activeMode === 'private') {
      return 'Privat';
    }
    return activeOrganization?.name || 'Organisation';
  };

  const getCurrentIcon = () => {
    if (activeMode === 'private') {
      return <User size={18} color={colors.primary} strokeWidth={2.5} />;
    }
    return <Building2 size={18} color={colors.primary} strokeWidth={2.5} />;
  };

  if (loading) {
    return null;
  }

  return (
    <>
      <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
        <TouchableOpacity
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: colors.secondary,
            paddingHorizontal: 16,
            paddingVertical: 8,
            borderRadius: 20,
            gap: 8,
          }}
          onPress={() => setModalVisible(true)}
        >
          {getCurrentIcon()}
          <Text style={{ color: colors.primary, fontSize: 15, fontWeight: '600' }}>
            {getCurrentLabel()}
          </Text>
          <ChevronDown size={16} color={colors.primary} strokeWidth={2.5} />
        </TouchableOpacity>

        {activeMode === 'organization' && activeOrganization && (
          <TouchableOpacity
            style={{
              backgroundColor: colors.secondary,
              padding: 8,
              borderRadius: 20,
            }}
            onPress={() => {
              navigation.navigate('OrganizationDetails', { organizationId: activeOrganization.id });
            }}
          >
            <Settings size={18} color={colors.primary} strokeWidth={2.5} />
          </TouchableOpacity>
        )}
      </View>

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={{
          flex: 1,
          justifyContent: 'flex-end',
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
        }}>
          <View style={{
            backgroundColor: colors.white,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            paddingBottom: 40,
          }}>
            <View style={{
              padding: 20,
              borderBottomWidth: 1,
              borderBottomColor: '#eee',
            }}>
              <Text style={{ fontSize: 20, fontWeight: 'bold', color: colors.primary }}>
                Skift tilstand
              </Text>
            </View>

            {switching ? (
              <View style={{ padding: 40, alignItems: 'center' }}>
                <ActivityIndicator size="large" color={colors.primary} />
              </View>
            ) : (
              <FlatList
                data={[
                  { id: 'private', name: 'Privat', mode: 'private', orgId: null },
                  ...organizations.map(org => ({
                    id: org.id,
                    name: org.name,
                    mode: 'organization',
                    orgId: org.id,
                    role: org.memberInfo?.role,
                  })),
                ]}
                keyExtractor={item => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      padding: 16,
                      borderBottomWidth: 1,
                      borderBottomColor: '#f0f0f0',
                      gap: 12,
                      backgroundColor: activeMode === item.mode &&
                        (item.mode === 'private' || activeOrganization?.id === item.orgId)
                        ? '#f5f5f5'
                        : 'transparent',
                    }}
                    onPress={() => handleModeSwitch(item.mode, item.orgId)}
                  >
                    {item.mode === 'private' ? (
                      <User size={24} color={colors.primary} strokeWidth={2} />
                    ) : (
                      <Building2 size={24} color={colors.primary} strokeWidth={2} />
                    )}
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 16, fontWeight: '600', color: colors.primary }}>
                        {item.name}
                      </Text>
                      {item.role && (
                        <Text style={{ fontSize: 12, color: '#666', marginTop: 2 }}>
                          {item.role === 'owner' ? 'Ejer' : item.role === 'admin' ? 'Admin' : 'Medlem'}
                        </Text>
                      )}
                    </View>
                    {activeMode === item.mode &&
                      (item.mode === 'private' || activeOrganization?.id === item.orgId) && (
                        <View style={{
                          width: 8,
                          height: 8,
                          borderRadius: 4,
                          backgroundColor: colors.primary,
                        }} />
                      )}
                  </TouchableOpacity>
                )}
                ListFooterComponent={() => (
                  <TouchableOpacity
                    style={{
                      padding: 16,
                      alignItems: 'center',
                      marginTop: 8,
                    }}
                    onPress={() => {
                      setModalVisible(false);
                      navigation.navigate('OrganizationSetup');
                    }}
                  >
                    <Text style={{ color: colors.primary, fontSize: 16, fontWeight: '600' }}>
                      + Opret eller tilslut organisation
                    </Text>
                  </TouchableOpacity>
                )}
              />
            )}

            <TouchableOpacity
              style={{
                padding: 16,
                alignItems: 'center',
                marginTop: 8,
              }}
              onPress={() => setModalVisible(false)}
            >
              <Text style={{ color: '#666', fontSize: 16 }}>Annuller</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
};

export default ModeSwitcher;
