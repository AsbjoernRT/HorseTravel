import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator, StyleSheet, KeyboardAvoidingView, Platform, Image } from 'react-native';
import { doc, updateDoc } from 'firebase/firestore';
import { updateProfile, updateEmail, updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import * as ImagePicker from 'expo-image-picker';
import { User, Mail, Phone, Save, Camera, Lock, Key } from 'lucide-react-native';
import { auth, db, storage } from '../../config/firebase';
import { useAuth } from '../../context/AuthContext';
import { colors } from '../../styles/theme';
import Toast from 'react-native-toast-message';

const ProfileScreen = ({ navigation }) => {
  const { user, userProfile } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [photoURL, setPhotoURL] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    if (userProfile) {
      setDisplayName(userProfile.displayName || '');
      setEmail(userProfile.email || user?.email || '');
      setPhone(user?.phoneNumber || '');
      setPhotoURL(userProfile.photoURL || user?.photoURL || null);
    }
  }, [userProfile, user]);

  const pickImage = async () => {
    try {
      // Request permission
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Tilladelse påkrævet', 'Vi har brug for adgang til dine billeder for at opdatere dit profilbillede.');
        return;
      }

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
      });

      if (!result.canceled && result.assets[0]) {
        await uploadImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Fejl', 'Kunne ikke vælge billede');
    }
  };

  const uploadImage = async (uri) => {
    setUploading(true);
    try {
      const currentUser = auth.currentUser;

      // Convert image to blob
      const response = await fetch(uri);
      const blob = await response.blob();

      // Create storage reference
      const storageRef = ref(storage, `profile-pictures/${currentUser.uid}/${Date.now()}.jpg`);

      // Upload image
      await uploadBytes(storageRef, blob);

      // Get download URL
      const downloadURL = await getDownloadURL(storageRef);

      // Update state
      setPhotoURL(downloadURL);

      Toast.show({
        type: 'success',
        text1: 'Billede uploadet',
        text2: 'Husk at gemme dine ændringer',
      });
    } catch (error) {
      console.error('Error uploading image:', error);
      Alert.alert('Fejl', 'Kunne ikke uploade billede');
    } finally {
      setUploading(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert('Fejl', 'Udfyld venligst alle adgangskodefelter');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Fejl', 'Nye adgangskoder matcher ikke');
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert('Fejl', 'Adgangskoden skal være mindst 6 tegn');
      return;
    }

    setLoading(true);
    try {
      const currentUser = auth.currentUser;

      // Re-authenticate user with current password
      const credential = EmailAuthProvider.credential(
        currentUser.email,
        currentPassword
      );
      await reauthenticateWithCredential(currentUser, credential);

      // Update password
      await updatePassword(currentUser, newPassword);

      // Clear password fields
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setShowPasswordSection(false);

      Toast.show({
        type: 'success',
        text1: 'Adgangskode ændret',
        text2: 'Din adgangskode er blevet opdateret.',
      });
    } catch (error) {
      console.error('Error changing password:', error);
      if (error.code === 'auth/wrong-password') {
        Alert.alert('Fejl', 'Nuværende adgangskode er forkert');
      } else if (error.code === 'auth/weak-password') {
        Alert.alert('Fejl', 'Adgangskoden er for svag');
      } else {
        Alert.alert('Fejl', error.message || 'Kunne ikke ændre adgangskode');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!displayName.trim()) {
      Alert.alert('Fejl', 'Indtast venligst dit navn');
      return;
    }

    setLoading(true);
    try {
      const currentUser = auth.currentUser;

      // Update Firebase Auth profile
      await updateProfile(currentUser, {
        displayName: displayName.trim(),
        photoURL: photoURL,
      });

      // Update email if changed and valid
      if (email && email !== currentUser.email && email.includes('@')) {
        try {
          await updateEmail(currentUser, email);
        } catch (emailError) {
          if (emailError.code === 'auth/requires-recent-login') {
            Alert.alert(
              'Genautentificering påkrævet',
              'For at ændre din email skal du logge ud og logge ind igen.'
            );
          } else {
            throw emailError;
          }
        }
      }

      // Update Firestore user document
      const userDocRef = doc(db, 'users', currentUser.uid);
      await updateDoc(userDocRef, {
        displayName: displayName.trim(),
        email: email || '',
        photoURL: photoURL || '',
        updatedAt: new Date().toISOString(),
      });

      Toast.show({
        type: 'success',
        text1: 'Profil opdateret',
        text2: 'Dine ændringer er gemt.',
      });

      navigation.goBack();
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Fejl', error.message || 'Kunne ikke opdatere profil');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.avatarContainer}
            onPress={pickImage}
            disabled={uploading}
          >
            {photoURL ? (
              <Image source={{ uri: photoURL }} style={styles.avatarImage} />
            ) : (
              <User size={48} color={colors.white} strokeWidth={2} />
            )}
            <View style={styles.cameraButton}>
              {uploading ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <Camera size={16} color={colors.white} strokeWidth={2} />
              )}
            </View>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Min Profil</Text>
          <Text style={styles.headerSubtitle}>
            Rediger dine personlige oplysninger
          </Text>
        </View>

        {/* Form */}
        <View style={styles.formContainer}>
          {/* Display Name */}
          <View style={styles.inputWrapper}>
            <Text style={styles.inputLabel}>Fulde navn *</Text>
            <View style={styles.inputContainer}>
              <User size={20} color={colors.textSecondary} strokeWidth={2} />
              <TextInput
                style={styles.input}
                placeholder="Dit navn"
                placeholderTextColor="#999"
                value={displayName}
                onChangeText={setDisplayName}
                editable={!loading}
              />
            </View>
          </View>

          {/* Email */}
          <View style={styles.inputWrapper}>
            <Text style={styles.inputLabel}>Email</Text>
            <View style={styles.inputContainer}>
              <Mail size={20} color={colors.textSecondary} strokeWidth={2} />
              <TextInput
                style={styles.input}
                placeholder="din@email.dk"
                placeholderTextColor="#999"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                editable={!loading}
              />
            </View>
            <Text style={styles.helperText}>
              Brug en gyldig email til vigtige opdateringer
            </Text>
          </View>

          {/* Phone (read-only if using phone auth) */}
          {phone && (
            <View style={styles.inputWrapper}>
              <Text style={styles.inputLabel}>Telefonnummer</Text>
              <View style={[styles.inputContainer, styles.inputDisabled]}>
                <Phone size={20} color={colors.textSecondary} strokeWidth={2} />
                <TextInput
                  style={styles.input}
                  value={phone}
                  editable={false}
                />
              </View>
              <Text style={styles.helperText}>
                Telefonnummer kan ikke ændres
              </Text>
            </View>
          )}

          {/* Change Password Section - only for email/password users */}
          {(userProfile?.provider === 'password' || userProfile?.provider === 'email') && user?.email && (
            <View style={styles.inputWrapper}>
              <TouchableOpacity
                style={styles.passwordToggle}
                onPress={() => setShowPasswordSection(!showPasswordSection)}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Lock size={20} color={colors.primary} strokeWidth={2} />
                  <Text style={styles.passwordToggleText}>
                    {showPasswordSection ? 'Skjul adgangskodeændring' : 'Skift adgangskode'}
                  </Text>
                </View>
                <Key size={20} color={colors.textSecondary} strokeWidth={2} />
              </TouchableOpacity>

              {showPasswordSection && (
                <View style={styles.passwordSection}>
                  <View style={styles.inputWrapper}>
                    <Text style={styles.inputLabel}>Nuværende adgangskode *</Text>
                    <View style={styles.inputContainer}>
                      <Lock size={20} color={colors.textSecondary} strokeWidth={2} />
                      <TextInput
                        style={styles.input}
                        placeholder="Nuværende adgangskode"
                        placeholderTextColor="#999"
                        value={currentPassword}
                        onChangeText={setCurrentPassword}
                        secureTextEntry
                        editable={!loading}
                      />
                    </View>
                  </View>

                  <View style={styles.inputWrapper}>
                    <Text style={styles.inputLabel}>Ny adgangskode *</Text>
                    <View style={styles.inputContainer}>
                      <Lock size={20} color={colors.textSecondary} strokeWidth={2} />
                      <TextInput
                        style={styles.input}
                        placeholder="Ny adgangskode (min. 6 tegn)"
                        placeholderTextColor="#999"
                        value={newPassword}
                        onChangeText={setNewPassword}
                        secureTextEntry
                        editable={!loading}
                      />
                    </View>
                  </View>

                  <View style={styles.inputWrapper}>
                    <Text style={styles.inputLabel}>Bekræft ny adgangskode *</Text>
                    <View style={styles.inputContainer}>
                      <Lock size={20} color={colors.textSecondary} strokeWidth={2} />
                      <TextInput
                        style={styles.input}
                        placeholder="Bekræft ny adgangskode"
                        placeholderTextColor="#999"
                        value={confirmPassword}
                        onChangeText={setConfirmPassword}
                        secureTextEntry
                        editable={!loading}
                      />
                    </View>
                  </View>

                  <TouchableOpacity
                    style={[styles.changePasswordButton, loading && styles.buttonDisabled]}
                    onPress={handleChangePassword}
                    disabled={loading}
                  >
                    {loading ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <>
                        <Key size={20} color={colors.white} strokeWidth={2} />
                        <Text style={styles.saveButtonText}>Opdater adgangskode</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}

          {/* Save Button */}
          <TouchableOpacity
            style={[styles.saveButton, loading && styles.buttonDisabled]}
            onPress={handleSaveProfile}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Save size={20} color={colors.white} strokeWidth={2} />
                <Text style={styles.saveButtonText}>Gem ændringer</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Info Box */}
          <View style={styles.infoBox}>
            <Text style={styles.infoIcon}>ℹ️</Text>
            <Text style={styles.infoText}>
              Dine oplysninger bruges til at personalisere din oplevelse og til vigtig kommunikation
            </Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 60,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  avatarContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    position: 'relative',
    ...Platform.select({
      web: {
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 6,
      },
    }),
  },
  avatarImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  cameraButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    borderWidth: 3,
    borderColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.black,
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  formContainer: {
    paddingHorizontal: 24,
  },
  inputWrapper: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.black,
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 12,
  },
  inputDisabled: {
    backgroundColor: '#f5f5f5',
    opacity: 0.7,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: colors.black,
    paddingVertical: 12,
  },
  helperText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 6,
  },
  saveButton: {
    flexDirection: 'row',
    backgroundColor: colors.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 24,
    ...Platform.select({
      web: {
        boxShadow: '0 4px 8px rgba(0, 35, 0, 0.3)',
      },
      default: {
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
      },
    }),
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  passwordToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 12,
  },
  passwordToggleText: {
    fontSize: 16,
    color: colors.primary,
    fontWeight: '600',
  },
  passwordSection: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: 8,
  },
  changePasswordButton: {
    flexDirection: 'row',
    backgroundColor: '#d97706',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
    ...Platform.select({
      web: {
        boxShadow: '0 4px 8px rgba(217, 119, 6, 0.3)',
      },
      default: {
        shadowColor: '#d97706',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
      },
    }),
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'flex-start',
    gap: 12,
  },
  infoIcon: {
    fontSize: 20,
  },
  infoText: {
    flex: 1,
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
});

export default ProfileScreen;
