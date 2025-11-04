import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
  onAuthStateChanged,
  sendEmailVerification,
  GoogleAuthProvider,
  signInWithPopup,
  RecaptchaVerifier,
  signInWithPhoneNumber
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';

/**
 * Authentication Service
 * Following Firebase best practices for Expo Go projects
 */

/**
 * Sign up a new user with email and password
 * @param {string} email - User email
 * @param {string} password - User password
 * @param {string} displayName - User display name
 * @returns {Promise<Object>} User object
 */
export const signUp = async (email, password, displayName) => {
  try {
    // Create user account
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Update user profile with display name
    if (displayName) {
      await updateProfile(user, { displayName });
    }

    // Send email verification
    await sendEmailVerification(user);

    // Create user document in Firestore
    await setDoc(doc(db, 'users', user.uid), {
      email: user.email,
      displayName: displayName || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      emailVerified: user.emailVerified,
      role: 'driver', // Default role
      provider: 'email',
      activeMode: 'private', // Default to private mode
      activeOrganizationId: null,
      organizationIds: [], // Array of organization IDs user is member of
      profileComplete: true,
    });

    return user;
  } catch (error) {
    throw handleAuthError(error);
  }
};

/**
 * Sign in existing user with email and password
 * @param {string} email - User email
 * @param {string} password - User password
 * @returns {Promise<Object>} User object
 */
export const signIn = async (email, password) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  } catch (error) {
    throw handleAuthError(error);
  }
};

/**
 * Sign out current user
 * @returns {Promise<void>}
 */
export const logOut = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    throw handleAuthError(error);
  }
};

/**
 * Send password reset email
 * @param {string} email - User email
 * @returns {Promise<void>}
 */
export const resetPassword = async (email) => {
  try {
    await sendPasswordResetEmail(auth, email);
  } catch (error) {
    throw handleAuthError(error);
  }
};

/**
 * Get current user's profile from Firestore
 * @param {string} uid - User ID
 * @returns {Promise<Object>} User profile data
 */
export const getUserProfile = async (uid) => {
  try {
    const docRef = doc(db, 'users', uid);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return docSnap.data();
    } else {
      throw new Error('User profile not found');
    }
  } catch (error) {
    throw error;
  }
};

/**
 * Sign in with Google OAuth (web only)
 * @returns {Promise<Object>} User object
 */
export const signInWithGoogle = async () => {
  try {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({
      prompt: 'select_account'
    });

    const result = await signInWithPopup(auth, provider);
    const user = result.user;

    // Check if user profile exists, if not create it
    const userDocRef = doc(db, 'users', user.uid);
    const userDoc = await getDoc(userDocRef);

    if (!userDoc.exists()) {
      await setDoc(userDocRef, {
        email: user.email,
        displayName: user.displayName || '',
        photoURL: user.photoURL || '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        emailVerified: user.emailVerified,
        role: 'driver',
        provider: 'google',
        activeMode: 'private',
        activeOrganizationId: null,
        organizationIds: [],
        profileComplete: true,
      });
    }

    return user;
  } catch (error) {
    throw handleAuthError(error);
  }
};

/**
 * Setup reCAPTCHA verifier for phone authentication
 * @param {string} containerId - ID of the container element for reCAPTCHA
 * @returns {RecaptchaVerifier} reCAPTCHA verifier instance
 */
export const setupRecaptcha = (containerId = 'recaptcha-container') => {
  // Clear existing verifier if it exists
  if (window.recaptchaVerifier) {
    window.recaptchaVerifier.clear();
  }

  window.recaptchaVerifier = new RecaptchaVerifier(auth, containerId, {
    size: 'normal',
    callback: (response) => {
      // reCAPTCHA solved - allow signInWithPhoneNumber
      console.log('reCAPTCHA verified');
    },
    'expired-callback': () => {
      // Response expired - ask user to solve reCAPTCHA again
      console.log('reCAPTCHA expired');
    }
  });

  // Render the reCAPTCHA
  window.recaptchaVerifier.render().then((widgetId) => {
    window.recaptchaWidgetId = widgetId;
  });

  return window.recaptchaVerifier;
};

/**
 * Send verification code to phone number
 * @param {string} phoneNumber - Phone number with country code (e.g., +4512345678)
 * @returns {Promise<Object>} Confirmation result object
 */
export const sendPhoneVerification = async (phoneNumber) => {
  try {
    const appVerifier = window.recaptchaVerifier;

    if (!appVerifier) {
      throw new Error('reCAPTCHA ikke initialiseret. Genindlæs siden.');
    }

    const confirmationResult = await signInWithPhoneNumber(auth, phoneNumber, appVerifier);
    return confirmationResult;
  } catch (error) {
    throw handleAuthError(error);
  }
};

/**
 * Verify phone number with code
 * @param {Object} confirmationResult - Result from sendPhoneVerification
 * @param {string} code - Verification code from SMS
 * @returns {Promise<Object>} User object
 */
export const verifyPhoneCode = async (confirmationResult, code) => {
  try {
    const result = await confirmationResult.confirm(code);
    const user = result.user;

    // Check if user profile exists, if not create it
    const userDocRef = doc(db, 'users', user.uid);
    const userDoc = await getDoc(userDocRef);

    if (!userDoc.exists()) {
      // Create user document in Firestore for new phone sign-in users
      await setDoc(userDocRef, {
        phoneNumber: user.phoneNumber,
        displayName: '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        emailVerified: false,
        role: 'driver',
        provider: 'phone',
        activeMode: 'private',
        activeOrganizationId: null,
        organizationIds: [], // Array of organization IDs user is member of
        profileComplete: false, // Phone users need to complete profile
      });
    }

    return user;
  } catch (error) {
    throw handleAuthError(error);
  }
};

/**
 * Subscribe to authentication state changes
 * @param {Function} callback - Callback function to handle auth state
 * @returns {Function} Unsubscribe function
 */
export const subscribeToAuthState = (callback) => {
  return onAuthStateChanged(auth, callback);
};

/**
 * Handle authentication errors with user-friendly messages
 * @param {Error} error - Firebase auth error
 * @returns {Error} Error with user-friendly message
 */
const handleAuthError = (error) => {
  const errorMessages = {
    'auth/email-already-in-use': 'Denne email er allerede i brug',
    'auth/invalid-email': 'Ugyldig email adresse',
    'auth/operation-not-allowed': 'Operation ikke tilladt',
    'auth/weak-password': 'Password skal være mindst 6 tegn',
    'auth/user-disabled': 'Denne bruger er deaktiveret',
    'auth/user-not-found': 'Ingen bruger fundet med denne email',
    'auth/wrong-password': 'Forkert password',
    'auth/invalid-credential': 'Ugyldige loginoplysninger',
    'auth/too-many-requests': 'For mange forsøg. Prøv igen senere',
    'auth/network-request-failed': 'Netværksfejl. Tjek din internetforbindelse',
    'auth/invalid-phone-number': 'Ugyldigt telefonnummer. Brug format: +4512345678',
    'auth/missing-phone-number': 'Telefonnummer mangler',
    'auth/invalid-verification-code': 'Ugyldig verifikationskode',
    'auth/code-expired': 'Verifikationskoden er udløbet',
  };

  const message = errorMessages[error.code] || error.message;
  return new Error(message);
};
