import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Image, Alert, ActivityIndicator, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { signUp, signInWithGoogle } from '../services/authService';

// Registration form that provisions a Firebase Auth account and profile scaffold.
const SignupScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignup = async () => {
    if (!email || !password || !confirmPassword || !displayName) {
      Alert.alert('Fejl', 'Udfyld venligst alle felter');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Fejl', 'Passwords matcher ikke');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Fejl', 'Password skal være mindst 6 tegn');
      return;
    }

    setLoading(true);
    try {
      await signUp(email, password, displayName);
      Alert.alert(
        'Succes',
        'Din konto er oprettet! Tjek din email for at verificere din konto.',
        [{ text: 'OK', onPress: () => navigation.navigate('Login') }]
      );
    } catch (error) {
      Alert.alert('Oprettelse fejlede', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      await signInWithGoogle();
    } catch (error) {
      Alert.alert('Google login fejlede', error.message);
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
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Logo Section */}
        <View style={styles.logoContainer}>
          <Image
            source={require('../assets/images/hvid-logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.welcomeText}>Opret konto</Text>
          <Text style={styles.subtitleText}>Kom i gang med Horse Travel</Text>
        </View>

        {/* Input Section */}
        <View style={styles.formContainer}>
          <View style={styles.inputWrapper}>
            <Text style={styles.inputLabel}>Fulde navn</Text>
            <TextInput
              style={styles.input}
              placeholder="Dit navn"
              placeholderTextColor="#999"
              value={displayName}
              onChangeText={setDisplayName}
              editable={!loading}
            />
          </View>

          <View style={styles.inputWrapper}>
            <Text style={styles.inputLabel}>Email</Text>
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

          <View style={styles.inputWrapper}>
            <Text style={styles.inputLabel}>Adgangskode</Text>
            <TextInput
              style={styles.input}
              placeholder="Min. 6 tegn"
              placeholderTextColor="#999"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              editable={!loading}
            />
          </View>

          <View style={styles.inputWrapper}>
            <Text style={styles.inputLabel}>Bekræft adgangskode</Text>
            <TextInput
              style={styles.input}
              placeholder="Gentag adgangskode"
              placeholderTextColor="#999"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              editable={!loading}
            />
          </View>

          {/* Signup Button */}
          <TouchableOpacity
            style={[styles.primaryButton, loading && styles.buttonDisabled]}
            onPress={handleSignup}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryButtonText}>Opret konto</Text>
            )}
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.dividerContainer}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>eller fortsæt med</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Google Sign-In Button */}
          <TouchableOpacity
            style={styles.socialButton}
            onPress={handleGoogleSignIn}
            disabled={loading}
          >
            <Image
              source={require('../assets/icons/google-icon.webp')}
              style={styles.socialButtonIcon}
              resizeMode="contain"
            />
            <Text style={styles.socialButtonText}>Fortsæt med Google</Text>
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Allerede medlem? </Text>
          <TouchableOpacity
            onPress={() => navigation.navigate('Login')}
            disabled={loading}
          >
            <Text style={styles.footerLink}>Log ind her</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#002300',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
    marginTop: 20,
  },
  logo: {
    width: 160,
    height: 80,
    marginBottom: 16,
  },
  welcomeText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  subtitleText: {
    fontSize: 16,
    color: '#d6d1ca',
  },
  formContainer: {
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
  },
  inputWrapper: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#d6d1ca',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#202020',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  primaryButton: {
    backgroundColor: '#d6d1ca',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 24,
    ...Platform.select({
      web: {
        boxShadow: '0 4px 8px rgba(0, 0, 0, 0.3)',
      },
      default: {
        shadowColor: '#000',
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
  primaryButtonText: {
    color: '#002300',
    fontSize: 16,
    fontWeight: 'bold',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#d6d1ca',
    opacity: 0.3,
  },
  dividerText: {
    color: '#d6d1ca',
    fontSize: 14,
    marginHorizontal: 16,
  },
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    gap: 8,
  },
  socialButtonIcon: {
    width: 20,
    height: 20,
  },
  socialButtonText: {
    color: '#002300',
    fontSize: 15,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 20,
  },
  footerText: {
    color: '#d6d1ca',
    fontSize: 15,
  },
  footerLink: {
    color: '#fff',
    fontSize: 15,
    fontWeight: 'bold',
  },
});

export default SignupScreen;
