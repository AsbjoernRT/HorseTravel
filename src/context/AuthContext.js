import React, { createContext, useContext, useState, useEffect } from 'react';
import { subscribeToAuthState, getUserProfile } from '../services/authService';
import { migrateUserProfile } from '../services/migrationService';

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
    // Subscribe to Firebase auth state changes
    const unsubscribe = subscribeToAuthState(async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);

        // Migrate user profile if needed
        await migrateUserProfile(firebaseUser.uid);

        // Fetch user profile from Firestore
        try {
          const profile = await getUserProfile(firebaseUser.uid);
          setUserProfile(profile);

          // Check if profile setup is needed (phone auth without name)
          if (profile.provider === 'phone' && !profile.displayName && !profile.profileComplete) {
            setNeedsProfileSetup(true);
          } else {
            setNeedsProfileSetup(false);
          }
        } catch (error) {
          console.error('Error fetching user profile:', error);
          setNeedsProfileSetup(false);
        }
      } else {
        setUser(null);
        setUserProfile(null);
        setNeedsProfileSetup(false);
      }
      setLoading(false);
    });

    // Cleanup subscription
    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{
      user,
      userProfile,
      loading,
      needsProfileSetup,
    }}>
      {children}
    </AuthContext.Provider>
  );
};
