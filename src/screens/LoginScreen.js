import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Image, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Phone } from 'lucide-react-native';
import { signIn, signInWithGoogle } from '../services/authService';
import { sharedStyles } from '../styles/sharedStyles';
import { loginStyles } from '../styles/loginStyles';

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
      style={sharedStyles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={sharedStyles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Logo Section */}
        <View style={sharedStyles.logoContainer}>
          <Image
            source={require('../assets/images/hvid-logo.png')}
            style={sharedStyles.logo}
            resizeMode="contain"
          />
          <Text style={sharedStyles.welcomeText}>Velkommen tilbage</Text>
          <Text style={sharedStyles.subtitleText}>Log ind for at fortsætte</Text>
        </View>

        {/* Input Section */}
        <View style={sharedStyles.formContainer}>
          <View style={sharedStyles.inputWrapper}>
            <Text style={sharedStyles.inputLabel}>Email</Text>
            <TextInput
              style={sharedStyles.input}
              placeholder="din@email.dk"
              placeholderTextColor="#999"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              editable={!loading}
            />
          </View>

          <View style={sharedStyles.inputWrapper}>
            <Text style={sharedStyles.inputLabel}>Adgangskode</Text>
            <TextInput
              style={sharedStyles.input}
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
            style={[sharedStyles.primaryButton, loading && sharedStyles.buttonDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={sharedStyles.primaryButtonText}>Log ind</Text>
            )}
          </TouchableOpacity>

          {/* Divider */}
          <View style={sharedStyles.dividerContainer}>
            <View style={sharedStyles.dividerLine} />
            <Text style={sharedStyles.dividerText}>eller fortsæt med</Text>
            <View style={sharedStyles.dividerLine} />
          </View>

          {/* Social Login Buttons */}
          <View style={sharedStyles.socialButtonsContainer}>
            <TouchableOpacity
              style={sharedStyles.socialButton}
              onPress={handleGoogleSignIn}
              disabled={loading}
            >
              <Image
                source={require('../assets/icons/google-icon.webp')}
                style={sharedStyles.socialButtonIcon}
                resizeMode="contain"
              />
              <Text style={sharedStyles.socialButtonText}>Google</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={sharedStyles.socialButton}
              onPress={() => navigation.navigate('PhoneLogin')}
              disabled={loading}
            >
              <Phone size={20} color="#002300" strokeWidth={2.5} />
              <Text style={sharedStyles.socialButtonText}>Telefon</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Footer */}
        <View style={sharedStyles.footer}>
          <Text style={sharedStyles.footerText}>Ny bruger? </Text>
          <TouchableOpacity
            onPress={() => navigation.navigate('Signup')}
            disabled={loading}
          >
            <Text style={sharedStyles.footerLink}>Kom i gang her</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default LoginScreen;
