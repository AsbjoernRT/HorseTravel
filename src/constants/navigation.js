// Navigation screen names - keep these in sync with App.js
// These MUST match exactly what's defined in App.js Stack.Screen name props
export const SCREEN_NAMES = {
  // Auth screens
  LOGIN: 'Login',
  SIGNUP: 'Signup',
  PHONE_LOGIN: 'PhoneLogin',
  FORGOT_PASSWORD: 'ForgotPassword',

  // Main app screens
  MAIN_TABS: 'MainTabs',
  HOME: 'Home',
  START_TRANSPORT: 'StartTransport',
  TRANSPORT_LIST: 'TransportList',
  TRANSPORT_DETAILS: 'TransportDetails',

  // Management screens (these are Tab screens)
  VEHICLE_MANAGEMENT: 'VehicleManagement',
  HORSE_MANAGEMENT: 'HorseManagement',

  // Organization screens
  ORGANIZATION_SETUP: 'OrganizationSetup',
  ORGANIZATION_DETAILS: 'OrganizationDetails',

  // Profile screens
  PROFILE_SETUP: 'ProfileSetup',
};

// Helper function to navigate with error checking
export const navigateToScreen = (navigation, screenName, params = {}) => {
  try {
    navigation.navigate(screenName, params);
  } catch (error) {
    console.error(`Navigation error: Screen "${screenName}" not found`, error);
    // Optionally show a user-friendly error message
  }
};

// Helper function to navigate to a tab screen from a stack screen
export const navigateToTab = (navigation, tabName) => {
  try {
    navigation.navigate(SCREEN_NAMES.MAIN_TABS, {
      screen: tabName
    });
  } catch (error) {
    console.error(`Navigation error: Tab "${tabName}" not found`, error);
  }
};