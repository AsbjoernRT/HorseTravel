import { initializeApp } from 'firebase/app';
import { initializeAuth, getAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  FIREBASE_API_KEY,
  FIREBASE_AUTH_DOMAIN,
  FIREBASE_DATABASE_URL,
  FIREBASE_PROJECT_ID,
  FIREBASE_STORAGE_BUCKET,
  FIREBASE_MESSAGING_SENDER_ID,
  FIREBASE_APP_ID,
} from '@env';

// Validate Firebase configuration
const validateFirebaseConfig = () => {
  const requiredFields = {
    apiKey: FIREBASE_API_KEY,
    projectId: FIREBASE_PROJECT_ID,
    authDomain: FIREBASE_AUTH_DOMAIN,
    storageBucket: FIREBASE_STORAGE_BUCKET,
    messagingSenderId: FIREBASE_MESSAGING_SENDER_ID,
    appId: FIREBASE_APP_ID,
  };

  const missingFields = Object.entries(requiredFields)
    .filter(([key, value]) => !value)
    .map(([key]) => key);

  if (missingFields.length > 0) {
    console.error('❌ Missing Firebase configuration fields:', missingFields);
    throw new Error(`Missing Firebase configuration: ${missingFields.join(', ')}`);
  }
};

// Firebase configuration from .env file
const firebaseConfig = {
  apiKey: FIREBASE_API_KEY,
  authDomain: FIREBASE_AUTH_DOMAIN,
  databaseURL: FIREBASE_DATABASE_URL,
  projectId: FIREBASE_PROJECT_ID,
  storageBucket: FIREBASE_STORAGE_BUCKET,
  messagingSenderId: FIREBASE_MESSAGING_SENDER_ID,
  appId: FIREBASE_APP_ID,
};

// Validate configuration before initializing
validateFirebaseConfig();

// Initialize Firebase
let app;
try {
  app = initializeApp(firebaseConfig);
} catch (error) {
  console.error('❌ Firebase initialization failed:', error);
  throw error;
}

// Initialize Firebase services with error handling
let auth, db, storage;

try {
  // Initialize Auth with AsyncStorage persistence for React Native
  // Use getAuth if already initialized (e.g., after hot reload)
  try {
    auth = initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage)
    });
  } catch (authError) {
    if (authError.code === 'auth/already-initialized') {
      auth = getAuth(app);
    } else {
      throw authError;
    }
  }
} catch (error) {
  console.error('❌ Firebase Auth initialization failed:', error);
  throw error;
}

try {
  // Initialize Firestore
  db = getFirestore(app);
} catch (error) {
  console.error('❌ Firestore initialization failed:', error);
  throw error;
}

try {
  // Initialize Storage
  storage = getStorage(app);
} catch (error) {
  console.error('❌ Firebase Storage initialization failed:', error);
  throw error;
}

export { app, auth, db, storage };
