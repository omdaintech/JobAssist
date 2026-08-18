import { auth } from '@/config/firebase';
import { useAuth } from '@/context/AuthContext';
import { FirebaseUserData, api } from '@/services/api';
import {
    GoogleAuthProvider,
    User,
    createUserWithEmailAndPassword,
    getRedirectResult,
    onAuthStateChanged,
    signInWithEmailAndPassword,
    signInWithPopup,
    signOut,
    updateProfile
} from 'firebase/auth';
import React, { createContext, useContext, useEffect, useRef, useState } from 'react';

interface FirebaseAuthContextType {
  user: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string, displayName: string) => Promise<void>;
  logout: () => Promise<void>;
  syncWithBackend: (firebaseUser: User) => Promise<{ success: boolean; message?: string }>;
}

const FirebaseAuthContext = createContext<FirebaseAuthContextType | undefined>(undefined);

export const useFirebaseAuth = () => {
  const context = useContext(FirebaseAuthContext);
  if (context === undefined) {
    throw new Error('useFirebaseAuth must be used within a FirebaseAuthProvider');
  }
  return context;
};

interface FirebaseAuthProviderProps {
  children: React.ReactNode;
}

export const FirebaseAuthProvider: React.FC<FirebaseAuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const { checkAuthStatus } = useAuth(); // checkAuthStatus now handles localStorage directly
  const syncedUserRef = useRef<string | null>(null); // Track synced user UID

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);

      if (firebaseUser && syncedUserRef.current !== firebaseUser.uid) {
        // Only sync if this user hasn't been synced yet
        try {
          const syncResult = await syncWithBackend(firebaseUser);
          if (syncResult.success) {
            syncedUserRef.current = firebaseUser.uid; // Mark as synced
            // checkAuthStatus now reads directly from localStorage, so no need for reloadFromStorage
            await checkAuthStatus();
          } else {
            console.error('❌ Firebase sync failed:', syncResult);
          }
        } catch (error) {
          console.error('Failed to sync with backend:', error);
        }
      } else if (!firebaseUser) {
        // User logged out - clear sync reference
        syncedUserRef.current = null;
      }

      setLoading(false);
    });

    // Check for redirect result on page load (keeping for future redirect support)
    const checkRedirectResult = async () => {
      try {
        const result = await getRedirectResult(auth);
        if (result?.user) {
          // Redirect sign-in handled by onAuthStateChanged
        }
      } catch (error) {
        console.error('Redirect result error:', error);
      }
    };

    checkRedirectResult();

    return unsubscribe;
  }, []);

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    provider.addScope('profile');
    provider.addScope('email');

    try {
      // Use popup method (works reliably)
      const result = await signInWithPopup(auth, provider);
      // The onAuthStateChanged will handle the sync
    } catch (error) {
      console.error('Google sign in error:', error);
      throw error;
    }
  };

  const signInWithEmail = async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      console.error('Email sign in error:', error);
      throw error;
    }
  };

  const signUpWithEmail = async (email: string, password: string, displayName: string) => {
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);

      // Update the display name
      if (result.user) {
        await updateProfile(result.user, { displayName });
      }
    } catch (error) {
      console.error('Email sign up error:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      // Clear any app state if needed
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  };

  const syncWithBackend = async (firebaseUser: User): Promise<{ success: boolean; message?: string }> => {
    try {
      const firebaseToken = await firebaseUser.getIdToken();

      const userData: FirebaseUserData = {
        firebase_uid: firebaseUser.uid,
        email: firebaseUser.email || null,
        name: firebaseUser.displayName || null,
        photo_url: firebaseUser.photoURL || null,
        email_verified: firebaseUser.emailVerified,
        phone_number: firebaseUser.phoneNumber || null,
        provider_data: firebaseUser.providerData.map(provider => ({
          provider_id: provider.providerId,
          uid: provider.uid,
          display_name: provider.displayName || null,
          email: provider.email || null,
          photo_url: provider.photoURL || null
        })),
        metadata: {
          creation_time: firebaseUser.metadata.creationTime || null,
          last_sign_in_time: firebaseUser.metadata.lastSignInTime || null
        },
        firebase_token: firebaseToken
      };

      const response = await api.auth.syncFirebaseUser(userData);

      // CRITICAL: Store the JWT token in localStorage for existing AuthContext
      if (response.data.success && response.data.access_token) {
        localStorage.setItem('authToken', response.data.access_token);
      } else {
        console.error('❌ No access token received in Firebase sync response');
      }

      return { success: true, message: 'User synced successfully' };
    } catch (error) {
      console.error('Backend sync error:', error);
      throw error;
    }
  };

  const value: FirebaseAuthContextType = {
    user,
    loading,
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
    logout,
    syncWithBackend
  };

  return (
    <FirebaseAuthContext.Provider value={value}>
      {children}
    </FirebaseAuthContext.Provider>
  );
};
