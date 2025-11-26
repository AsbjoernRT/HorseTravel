import './global.css';
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View, TouchableOpacity, Text } from 'react-native';
import { Home, Truck, Heart, Building2, Map, Menu, PlusCircle, MessageCircle } from 'lucide-react-native';
import Toast, { BaseToast, ErrorToast } from 'react-native-toast-message';

// Context Providers
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { OrganizationProvider, useOrganization } from './src/context/OrganizationContext';
import { TransportProvider } from './src/context/TransportContext';

// Auth Screens
import LoginScreen from './src/screens/LoginScreen';
import SignupScreen from './src/screens/SignupScreen';
import ForgotPasswordScreen from './src/screens/ForgotPasswordScreen';
import PhoneLoginScreen from './src/screens/PhoneLoginScreen';

// Main App Screens
import HomeScreen from './src/screens/HomeScreen';
import ProfileSetupScreen from './src/screens/ProfileSetupScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import OrganizationSetupScreen from './src/screens/OrganizationSetupScreen';
import OrganizationDetailsScreen from './src/screens/OrganizationDetailsScreen';
import VehicleManagementScreen from './src/screens/VehicleManagementScreen';
import HorseManagementScreen from './src/screens/HorseManagementScreen';
import TransportListScreen from './src/screens/TransportListScreen';
import StartTransportScreen from './src/screens/StartTransportScreen';
import TransportDetailsScreen from './src/screens/TransportDetailsScreen';
import MenuScreen from './src/screens/MenuScreen';
import ChatbotScreen from './src/screens/ChatbotScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Auth Stack Navigator
const AuthStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="Login" component={LoginScreen} />
    <Stack.Screen name="Signup" component={SignupScreen} />
    <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
    <Stack.Screen name="PhoneLogin" component={PhoneLoginScreen} />
  </Stack.Navigator>
);

// Profile Setup Stack
const ProfileSetupStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="ProfileSetup" component={ProfileSetupScreen} />
  </Stack.Navigator>
);

// Bottom Tab Navigator
const MainTabs = () => (
  <Tab.Navigator
    screenOptions={{
      headerShown: false,
      tabBarActiveTintColor: '#002300',
      tabBarInactiveTintColor: '#999',
      tabBarStyle: {
        backgroundColor: '#ffffff',
        borderTopColor: '#e0e0e0',
        borderTopWidth: 1,
        paddingTop: 5,
        paddingBottom: 25,
        height: 80,
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      tabBarLabelStyle: {
        fontSize: 11,
        fontWeight: '600',
      },
    }}
  >
    <Tab.Screen
      name="Home"
      component={HomeScreen}
      options={{
        title: 'Horse Travel',
        tabBarLabel: 'Hjem',
        tabBarIcon: ({ color, size }) => <Home size={size} color={color} />,
      }}
    />
    <Tab.Screen
      name="Chatbot"
      component={ChatbotScreen}
      options={{
        title: 'Spørgsmål',
        tabBarLabel: 'Spørgsmål',
        tabBarIcon: ({ color, size }) => <MessageCircle size={size} color={color} />,
      }}
    />
    <Tab.Screen
      name="StartTransport"
      component={StartTransportScreen}
      options={{
        title: 'Ny',
        tabBarLabel: 'Ny',
        tabBarIcon: ({ color, size }) => <PlusCircle size={size} color={color} />,
      }}
    />
    <Tab.Screen
      name="TransportList"
      component={TransportListScreen}
      options={{
        title: 'Historik',
        tabBarLabel: 'Historik',
        tabBarIcon: ({ color, size }) => <Map size={size} color={color} />,
      }}
    />
    <Tab.Screen
      name="UserMenu"
      component={MenuScreen}
      options={{
        title: 'Menu',
        tabBarLabel: 'Menu',
        tabBarIcon: ({ color, size }) => <Menu size={size} color={color} />,
      }}
    />
  </Tab.Navigator>
);

// Main Stack for modal screens
const MainStack = () => (
  <Stack.Navigator
    screenOptions={{
      headerStyle: {
        backgroundColor: '#ffffff',
        elevation: 0,
        shadowOpacity: 0,
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
      },
      headerTintColor: '#002300',
      headerTitleStyle: {
        fontWeight: 'bold',
        fontSize: 18,
      },
      headerBackTitleVisible: false,
      header: (props) => (
        <View>
          {props.options.headerShown !== false && (
            <View style={{
              backgroundColor: '#ffffff',
              borderBottomWidth: 1,
              borderBottomColor: '#e0e0e0',
              paddingTop: 55,
              paddingBottom: 8,
              paddingHorizontal: 16,
            }}>
              {props.back && (
                <TouchableOpacity onPress={props.navigation.goBack}>
                  <Text style={{ color: '#002300', fontSize: 16 }}>← Tilbage</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      ),
    }}
  >
    <Stack.Screen
      name="MainTabs"
      component={MainTabs}
      options={{ headerShown: false }}
    />
    <Stack.Screen
      name="Profile"
      component={ProfileScreen}
      options={{ title: 'Min Profil' }}
    />
    <Stack.Screen
      name="VehicleManagement"
      component={VehicleManagementScreen}
      options={{ title: 'Køretøjer' }}
    />
    <Stack.Screen
      name="HorseManagement"
      component={HorseManagementScreen}
      options={{ title: 'Heste' }}
    />
    <Stack.Screen
      name="OrganizationSetup"
      component={OrganizationSetupScreen}
      options={{ title: 'Organisation' }}
    />
    <Stack.Screen
      name="OrganizationDetails"
      component={OrganizationDetailsScreen}
      options={{ title: 'Organisation Detaljer' }}
    />
    <Stack.Screen
      name="StartTransport"
      component={StartTransportScreen}
      options={{ title: 'Start Transport' }}
    />
    <Stack.Screen
      name="TransportDetails"
      component={TransportDetailsScreen}
      options={{ title: 'Transport Detaljer' }}
    />
  </Stack.Navigator>
);

// Root Navigator - handles auth state
const RootNavigator = () => {
  const { user, loading, needsProfileSetup } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#d6d1ca' }}>
        <ActivityIndicator size="large" color="#002300" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {!user ? (
        <AuthStack />
      ) : needsProfileSetup ? (
        <ProfileSetupStack />
      ) : (
        <MainStack />
      )}
    </NavigationContainer>
  );
};

// Wrapper to provide organization context to TransportProvider
const AppProviders = ({ children }) => {
  const { user } = useAuth();
  const { activeMode, activeOrganization } = useOrganization();

  return (
    <TransportProvider
      user={user}
      activeMode={activeMode}
      activeOrganization={activeOrganization}
    >
      {children}
    </TransportProvider>
  );
};

// Toast Configuration
const toastConfig = {
  success: (props) => (
    <BaseToast
      {...props}
      style={{ borderLeftColor: '#4caf50' }}
      contentContainerStyle={{ paddingHorizontal: 15 }}
      text1Style={{
        fontSize: 15,
        fontWeight: '600',
      }}
      text2Style={{
        fontSize: 13,
      }}
    />
  ),
  error: (props) => (
    <ErrorToast
      {...props}
      style={{ borderLeftColor: '#f44336' }}
      contentContainerStyle={{ paddingHorizontal: 15 }}
      text1Style={{
        fontSize: 15,
        fontWeight: '600',
      }}
      text2Style={{
        fontSize: 13,
      }}
    />
  ),
  warning: (props) => (
    <BaseToast
      {...props}
      style={{ borderLeftColor: '#ff9800' }}
      contentContainerStyle={{ paddingHorizontal: 15 }}
      text1Style={{
        fontSize: 15,
        fontWeight: '600',
      }}
      text2Style={{
        fontSize: 13,
      }}
    />
  ),
  info: (props) => (
    <BaseToast
      {...props}
      style={{ borderLeftColor: '#2196f3' }}
      contentContainerStyle={{ paddingHorizontal: 15 }}
      text1Style={{
        fontSize: 15,
        fontWeight: '600',
      }}
      text2Style={{
        fontSize: 13,
      }}
    />
  ),
};

// Main App Component
export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <OrganizationProvider>
          <AppProviders>
            <RootNavigator />
            <StatusBar style="auto" />
            <Toast config={toastConfig} />
          </AppProviders>
        </OrganizationProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
