import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Image, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Phone } from 'lucide-react-native';
import { signIn, signInWithGoogle } from '../services/authService';
import { theme } from '../styles/theme';
import { loginStyles } from '../styles/loginStyles';

// Primary email/password entry point with optional Google sign-in fallback.
const LoginScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Fejl', 'Indtast venligst email og adgangskode');
      return;
    }

    setLoading(true);
    try {
      await signIn(email, password);
    } catch (error) {
      Alert.alert('Login fejlede', error.message);
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
      style={theme.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={theme.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Logo Section */}
        <View style={theme.logoContainer}>
          <Image
            source={require('../assets/images/gron-logo.png')}
            style={theme.logo}
            resizeMode="contain"
          />
          <Text style={theme.welcomeText}>Velkommen tilbage</Text>
          <Text style={theme.subtitleText}>Log ind for at fortsætte</Text>
        </View>

        {/* Input Section */}
        <View style={theme.formContainer}>
          <View style={theme.inputWrapper}>
            <Text style={theme.inputLabel}>Email</Text>
            <TextInput
              style={theme.input}
              placeholder="din@email.dk"
              placeholderTextColor="#999"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              editable={!loading}
            />
          </View>

          <View style={theme.inputWrapper}>
            <Text style={theme.inputLabel}>Adgangskode</Text>
            <TextInput
              style={theme.input}
              placeholder="••••••••"
              placeholderTextColor="#999"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              editable={!loading}
            />
          </View>

          <TouchableOpacity
            onPress={() => navigation.navigate('ForgotPassword')}
            disabled={loading}
          >
            <Text style={loginStyles.forgotText}>Glemt adgangskode?</Text>
          </TouchableOpacity>

          {/* Login Button */}
          <TouchableOpacity
            style={[theme.primaryButton, loading && theme.buttonDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={theme.primaryButtonText}>Log ind</Text>
            )}
          </TouchableOpacity>

          {/* Social Login - Web Only */}
          {Platform.OS === 'web' && (
            <>
              {/* Google Sign-In Button */}
              <TouchableOpacity
                style={[theme.socialButton, { width: '100%', marginBottom: 12 }]}
                onPress={handleGoogleSignIn}
                disabled={loading}
              >
                <Image
                  source={require('../assets/icons/google-icon.webp')}
                  style={theme.socialButtonIcon}
                  resizeMode="contain"
                />
                <Text style={theme.socialButtonText}>Fortsæt med Google</Text>
              </TouchableOpacity>

              {/* Phone Login */}
              <TouchableOpacity
                style={[theme.socialButton, { width: '100%', marginBottom: 24 }]}
                onPress={() => navigation.navigate('PhoneLogin')}
                disabled={loading}
              >
                <Phone size={20} color="#002300" strokeWidth={2.5} />
                <Text style={theme.socialButtonText}>Fortsæt med Telefon</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* Footer */}
        <View style={[theme.footer, { flexDirection: 'column', gap: 8 }]}>
          <Text style={theme.footerText}>Ny bruger?</Text>
          <TouchableOpacity
            onPress={() => navigation.navigate('Signup')}
            disabled={loading}
          >
            <Text style={[theme.footerLink, { color: '#202020' }]}>Ny bruger? Kom i gang her</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default LoginScreen;
