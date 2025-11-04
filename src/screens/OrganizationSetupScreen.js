import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { Building2, Users } from 'lucide-react-native';
import { createOrganization, joinOrganizationByCode } from '../services/organizationService';
import { useOrganization } from '../context/OrganizationContext';
import { theme, colors } from '../styles/theme';
import CertificateUploader from '../components/CertificateUploader';

// Lets a new member either create an organization or join via invitation code..
const OrganizationSetupScreen = ({ navigation }) => {
  const [mode, setMode] = useState('create'); // 'create' or 'join'
  const [organizationName, setOrganizationName] = useState('');
  const [organizationCode, setOrganizationCode] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [createdOrganization, setCreatedOrganization] = useState(null);
  const { reloadOrganizations } = useOrganization();

  // Handles creation flow and surfaces the generated invite code to the user
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

      // Store the created organization to show certificate upload
      setCreatedOrganization(org);
    } catch (error) {
      console.error('Error in handleCreateOrganization:', error);
      Alert.alert('Fejl', error.message || 'Der opstod en fejl');
    } finally {
      setLoading(false);
    }
  };

  const handleFinishSetup = () => {
    Alert.alert(
      'Succes!',
      `Organisation oprettet!\n\nDel denne kode med dit team:\n${createdOrganization.organizationCode}`,
      [
        {
          text: 'OK',
          onPress: () => navigation.goBack(),
        },
      ]
    );
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
      style={theme.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={theme.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={theme.logoContainer}>
          <Building2 size={64} color={colors.secondary} strokeWidth={1.5} />
          <Text style={theme.welcomeText}>Organisation</Text>
          <Text style={theme.subtitleText}>
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

        <View style={theme.formContainer}>
          {createdOrganization ? (
            // Show certificate upload after organization is created
            <>
              <View style={{
                backgroundColor: colors.secondary,
                borderRadius: 12,
                padding: 16,
                marginBottom: 16,
                alignItems: 'center',
              }}>
                <Text style={{ fontSize: 14, color: colors.primary, marginBottom: 8, fontWeight: '600' }}>
                  Organisation oprettet!
                </Text>
                <Text style={{
                  fontSize: 24,
                  fontWeight: 'bold',
                  color: colors.primary,
                  letterSpacing: 6,
                  marginBottom: 8,
                }}>
                  {createdOrganization.organizationCode}
                </Text>
                <Text style={{ fontSize: 12, color: colors.primary, textAlign: 'center', opacity: 0.8 }}>
                  Del denne kode med dit team
                </Text>
              </View>

              <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.white, marginBottom: 12 }}>
                Upload certifikater (valgfrit)
              </Text>

              <CertificateUploader
                entityType="organization"
                entityId={createdOrganization.id}
                canManage={true}
              />

              <TouchableOpacity
                style={theme.primaryButton}
                onPress={handleFinishSetup}
              >
                <Text style={theme.primaryButtonText}>Færdig</Text>
              </TouchableOpacity>
            </>
          ) : mode === 'create' ? (
            <>
              <View style={theme.inputWrapper}>
                <Text style={theme.inputLabel}>Organisations navn *</Text>
                <TextInput
                  style={theme.input}
                  placeholder="F.eks. Horse Riders Denmark"
                  placeholderTextColor="#999"
                  value={organizationName}
                  onChangeText={setOrganizationName}
                  editable={!loading}
                />
              </View>

              <View style={theme.inputWrapper}>
                <Text style={theme.inputLabel}>Beskrivelse (valgfrit)</Text>
                <TextInput
                  style={[theme.input, { minHeight: 100, textAlignVertical: 'top' }]}
                  placeholder="Kort beskrivelse af organisationen"
                  placeholderTextColor="#999"
                  value={description}
                  onChangeText={setDescription}
                  multiline
                  numberOfLines={4}
                  editable={!loading}
                />
              </View>

              <View style={theme.infoBox}>
                <Building2 size={20} color={colors.secondary} />
                <Text style={theme.infoText}>
                  Efter oprettelse får du en unik kode, som dit team kan bruge til at tilslutte sig.
                </Text>
              </View>

              <TouchableOpacity
                style={[theme.primaryButton, loading && theme.buttonDisabled]}
                onPress={handleCreateOrganization}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={theme.primaryButtonText}>Opret organisation</Text>
                )}
              </TouchableOpacity>
            </>
          ) : (
            <>
              <View style={theme.inputWrapper}>
                <Text style={theme.inputLabel}>Organisations kode *</Text>
                <TextInput
                  style={[theme.input, {
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

              <View style={theme.infoBox}>
                <Users size={20} color={colors.secondary} />
                <Text style={theme.infoText}>
                  Indtast den 6-tegn kode du har modtaget fra din organisation.
                </Text>
              </View>

              <TouchableOpacity
                style={[theme.primaryButton, loading && theme.buttonDisabled]}
                onPress={handleJoinOrganization}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={theme.primaryButtonText}>Tilslut organisation</Text>
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
