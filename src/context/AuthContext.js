import React, { createContext, useContext, useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { subscribeToAuthState } from '../services/authService';
import { migrateUserProfile } from '../services/migrationService';
import { db } from '../config/firebase';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [needsProfileSetup, setNeedsProfileSetup] = useState(false);

  useEffect(() => {
    let unsubscribeProfile = null;

    // Subscribe to Firebase auth state changes
    const unsubscribeAuth = subscribeToAuthState(async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);

        // Migrate user profile if needed
        await migrateUserProfile(firebaseUser.uid);

        // Subscribe to real-time user profile updates from Firestore
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        unsubscribeProfile = onSnapshot(
          userDocRef,
          (docSnapshot) => {
            if (docSnapshot.exists()) {
              const profile = { id: docSnapshot.id, ...docSnapshot.data() };
              setUserProfile(profile);

              // Check if profile setup is needed (phone auth without name)
              if (profile.provider === 'phone' && !profile.displayName && !profile.profileComplete) {
                setNeedsProfileSetup(true);
              } else {
                setNeedsProfileSetup(false);
              }
            } else {
              setUserProfile(null);
            }
            setLoading(false);
          },
          (error) => {
            console.error('Error subscribing to user profile:', error);
            setNeedsProfileSetup(false);
            setLoading(false);
          }
        );
      } else {
        setUser(null);
        setUserProfile(null);
        setNeedsProfileSetup(false);
        setLoading(false);

        // Unsubscribe from profile updates if exists
        if (unsubscribeProfile) {
          unsubscribeProfile();
          unsubscribeProfile = null;
        }
      }
    });

    // Cleanup subscriptions
    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) {
        unsubscribeProfile();
      }
    };
  }, []);

  const refreshUserProfile = async () => {
    if (user) {
      // The onSnapshot will automatically refresh when Firestore data changes
      // This function is provided for manual refresh if needed
      return Promise.resolve();
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      userProfile,
      loading,
      needsProfileSetup,
      refreshUserProfile,
    }}>
      {children}
    </AuthContext.Provider>
  );
};
