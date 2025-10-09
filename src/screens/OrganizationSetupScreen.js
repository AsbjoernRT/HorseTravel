import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { Building2, Users } from 'lucide-react-native';
import { createOrganization, joinOrganizationByCode } from '../services/organizationService';
import { useOrganization } from '../context/OrganizationContext';
import { sharedStyles, colors } from '../styles/sharedStyles';

// Lets a new member either create an organization or join via invitation code.
const OrganizationSetupScreen = ({ navigation }) => {
  const [mode, setMode] = useState('create'); // 'create' or 'join'
  const [organizationName, setOrganizationName] = useState('');
  const [organizationCode, setOrganizationCode] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const { reloadOrganizations } = useOrganization();

  // Handles creation flow and surfaces the generated invite code to the user.
  const handleCreateOrganization = async () => {
    if (!organizationName.trim()) {
      Alert.alert('Fejl', 'Indtast organisations navn');
      return;
    }

    setLoading(true);
    try {
      console.log('Creating organization:', organizationName);
      const org = await createOrganization(organizationName, description);
      console.log('Organization created:', org);

      await reloadOrganizations();

      Alert.alert(
        'Succes!',
        `Organisation oprettet!\n\nDel denne kode med dit team:\n${org.organizationCode}`,
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error) {
      console.error('Error in handleCreateOrganization:', error);
      Alert.alert('Fejl', error.message || 'Der opstod en fejl');
    } finally {
      setLoading(false);
    }
  };

  // Allows the user to activate an existing organization using its public join code.
  const handleJoinOrganization = async () => {
    if (!organizationCode.trim()) {
      Alert.alert('Fejl', 'Indtast organisations kode');
      return;
    }

    setLoading(true);
    try {
      const result = await joinOrganizationByCode(organizationCode);
      await reloadOrganizations();

      Alert.alert(
        'Succes!',
        `Du er nu medlem af ${result.organization.name}`,
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error) {
      Alert.alert('Fejl', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={sharedStyles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={sharedStyles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={sharedStyles.logoContainer}>
          <Building2 size={64} color={colors.secondary} strokeWidth={1.5} />
          <Text style={sharedStyles.welcomeText}>Organisation</Text>
          <Text style={sharedStyles.subtitleText}>
            Opret eller tilslut en organisation
          </Text>
        </View>

        {/* Mode toggle lets the user switch between create or join flows */}
        <View style={{
          flexDirection: 'row',
          backgroundColor: colors.secondary,
          borderRadius: 12,
          padding: 4,
          marginBottom: 32,
        }}>
          <TouchableOpacity
            style={{
              flex: 1,
              paddingVertical: 12,
              borderRadius: 8,
              backgroundColor: mode === 'create' ? colors.primary : 'transparent',
            }}
            onPress={() => setMode('create')}
          >
            <Text style={{
              textAlign: 'center',
              fontWeight: '600',
              color: mode === 'create' ? colors.white : colors.primary,
            }}>
              Opret ny
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={{
              flex: 1,
              paddingVertical: 12,
              borderRadius: 8,
              backgroundColor: mode === 'join' ? colors.primary : 'transparent',
            }}
            onPress={() => setMode('join')}
          >
            <Text style={{
              textAlign: 'center',
              fontWeight: '600',
              color: mode === 'join' ? colors.white : colors.primary,
            }}>
              Tilslut eksisterende
            </Text>
          </TouchableOpacity>
        </View>

        <View style={sharedStyles.formContainer}>
          {mode === 'create' ? (
            <>
              <View style={sharedStyles.inputWrapper}>
                <Text style={sharedStyles.inputLabel}>Organisations navn *</Text>
                <TextInput
                  style={sharedStyles.input}
                  placeholder="F.eks. Horse Riders Denmark"
                  placeholderTextColor="#999"
                  value={organizationName}
                  onChangeText={setOrganizationName}
                  editable={!loading}
                />
              </View>

              <View style={sharedStyles.inputWrapper}>
                <Text style={sharedStyles.inputLabel}>Beskrivelse (valgfrit)</Text>
                <TextInput
                  style={[sharedStyles.input, { minHeight: 100, textAlignVertical: 'top' }]}
                  placeholder="Kort beskrivelse af organisationen"
                  placeholderTextColor="#999"
                  value={description}
                  onChangeText={setDescription}
                  multiline
                  numberOfLines={4}
                  editable={!loading}
                />
              </View>

              <View style={sharedStyles.infoBox}>
                <Building2 size={20} color={colors.secondary} />
                <Text style={sharedStyles.infoText}>
                  Efter oprettelse får du en unik kode, som dit team kan bruge til at tilslutte sig.
                </Text>
              </View>

              <TouchableOpacity
                style={[sharedStyles.primaryButton, loading && sharedStyles.buttonDisabled]}
                onPress={handleCreateOrganization}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={sharedStyles.primaryButtonText}>Opret organisation</Text>
                )}
              </TouchableOpacity>
            </>
          ) : (
            <>
              <View style={sharedStyles.inputWrapper}>
                <Text style={sharedStyles.inputLabel}>Organisations kode *</Text>
                <TextInput
                  style={[sharedStyles.input, {
                    fontSize: 20,
                    letterSpacing: 4,
                    textAlign: 'center',
                    fontWeight: 'bold',
                    textTransform: 'uppercase',
                  }]}
                  placeholder="ABC123"
                  placeholderTextColor="#999"
                  value={organizationCode}
                  onChangeText={(text) => setOrganizationCode(text.toUpperCase())}
                  autoCapitalize="characters"
                  maxLength={6}
                  editable={!loading}
                />
              </View>

              <View style={sharedStyles.infoBox}>
                <Users size={20} color={colors.secondary} />
                <Text style={sharedStyles.infoText}>
                  Indtast den 6-tegn kode du har modtaget fra din organisation.
                </Text>
              </View>

              <TouchableOpacity
                style={[sharedStyles.primaryButton, loading && sharedStyles.buttonDisabled]}
                onPress={handleJoinOrganization}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={sharedStyles.primaryButtonText}>Tilslut organisation</Text>
                )}
              </TouchableOpacity>
            </>
          )}

          <TouchableOpacity
            style={{ padding: 16, alignItems: 'center' }}
            onPress={() => navigation.goBack()}
            disabled={loading}
          >
            <Text style={{ color: colors.secondary, fontSize: 16 }}>Annuller</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default OrganizationSetupScreen;
