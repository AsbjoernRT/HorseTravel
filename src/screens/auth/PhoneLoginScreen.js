import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, Image, Alert, ActivityIndicator, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { setupRecaptcha, sendPhoneVerification, verifyPhoneCode } from '../../services/authService';

// SMS-authentication flow that handles verification code delivery and confirmation.
const PhoneLoginScreen = ({ navigation }) => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [confirmationResult, setConfirmationResult] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Setup reCAPTCHA on component mount
    setupRecaptcha('recaptcha-container');
  }, []);

  const handleSendCode = async () => {
    if (!phoneNumber) {
      Alert.alert('Fejl', 'Indtast dit telefonnummer');
      return;
    }

    // Ensure phone number has country code
    let formattedPhone = phoneNumber.trim();
    if (!formattedPhone.startsWith('+')) {
      formattedPhone = '+45' + formattedPhone; // Default to Denmark
    }

    setLoading(true);
    try {
      const result = await sendPhoneVerification(formattedPhone);
      setConfirmationResult(result);
      Alert.alert('Kode sendt', 'Tjek din SMS for verifikationskoden');
    } catch (error) {
      Alert.alert('Fejl', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!verificationCode) {
      Alert.alert('Fejl', 'Indtast verifikationskoden');
      return;
    }

    setLoading(true);
    try {
      await verifyPhoneCode(confirmationResult, verificationCode);
    } catch (error) {
      Alert.alert('Verifikation fejlede', error.message);
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
            source={require('../../assets/images/hvid-logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.welcomeText}>Fortsæt med telefon</Text>
          <Text style={styles.subtitleText}>
            {!confirmationResult
              ? 'Vi sender dig en verifikationskode via SMS'
              : 'Indtast koden sendt til dit telefon'}
          </Text>
        </View>

        {/* Input Section */}
        <View style={styles.formContainer}>
          {!confirmationResult ? (
            <>
              <View style={styles.inputWrapper}>
                <Text style={styles.inputLabel}>Telefonnummer</Text>
                <TextInput
                  style={styles.input}
                  placeholder="+45 12 34 56 78"
                  placeholderTextColor="#999"
                  value={phoneNumber}
                  onChangeText={setPhoneNumber}
                  keyboardType="phone-pad"
                  editable={!loading}
                />
                <Text style={styles.helperText}>Inkluder landekode (f.eks. +45)</Text>
              </View>

              {/* reCAPTCHA container */}
              <View id="recaptcha-container" style={styles.recaptchaContainer} />

              {/* Send Code Button */}
              <TouchableOpacity
                style={[styles.primaryButton, loading && styles.buttonDisabled]}
                onPress={handleSendCode}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.primaryButtonText}>Send kode</Text>
                )}
              </TouchableOpacity>
            </>
          ) : (
            <>
              <View style={styles.inputWrapper}>
                <Text style={styles.inputLabel}>Verifikationskode</Text>
                <TextInput
                  style={[styles.input, styles.codeInput]}
                  placeholder="123456"
                  placeholderTextColor="#999"
                  value={verificationCode}
                  onChangeText={setVerificationCode}
                  keyboardType="number-pad"
                  editable={!loading}
                  maxLength={6}
                />
              </View>

              {/* Verify Button */}
              <TouchableOpacity
                style={[styles.primaryButton, loading && styles.buttonDisabled]}
                onPress={handleVerifyCode}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.primaryButtonText}>Verificer kode</Text>
                )}
              </TouchableOpacity>

              {/* Resend Code */}
              <TouchableOpacity
                style={styles.linkButton}
                onPress={() => {
                  setConfirmationResult(null);
                  setVerificationCode('');
                }}
                disabled={loading}
              >
                <Text style={styles.linkText}>Send kode igen</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <TouchableOpacity
            onPress={() => navigation.navigate('Login')}
            disabled={loading}
          >
            <Text style={styles.footerLink}>← Tilbage til login</Text>
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
    marginBottom: 48,
  },
  logo: {
    width: 180,
    height: 90,
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
    textAlign: 'center',
    paddingHorizontal: 20,
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
  codeInput: {
    fontSize: 24,
    letterSpacing: 8,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  helperText: {
    fontSize: 12,
    color: '#d6d1ca',
    marginTop: 6,
    opacity: 0.8,
  },
  recaptchaContainer: {
    marginBottom: 20,
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: '#d6d1ca',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
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
  linkButton: {
    padding: 12,
    alignItems: 'center',
  },
  linkText: {
    color: '#d6d1ca',
    fontSize: 15,
    fontWeight: '600',
  },
  footer: {
    alignItems: 'center',
    marginTop: 32,
  },
  footerLink: {
    color: '#fff',
    fontSize: 15,
    fontWeight: 'bold',
  },
});

export default PhoneLoginScreen;
