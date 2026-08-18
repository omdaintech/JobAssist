/**
 * School Admin Authentication Context
 * Manages school admin authentication state
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { schoolApi } from '../services/schoolApi';

interface SchoolAdmin {
  id: string;
  email: string;
  name: string;
  school_id: string;
  permissions: string[];
}

interface SchoolAuthContextType {
  isAuthenticated: boolean;
  schoolAdmin: SchoolAdmin | null;
  login: (email: string, password: string, captchaToken?: string, rememberMe?: boolean) => Promise<{ success: boolean; message: string }>;
  logout: () => void;
  loading: boolean;
}

// Create default context value to prevent undefined errors
const defaultContextValue: SchoolAuthContextType = {
  isAuthenticated: false,
  schoolAdmin: null,
  login: async (_email: string, _password: string, _captchaToken?: string, _rememberMe?: boolean) => ({ success: false, message: 'Context not initialized' }),
  logout: () => {},
  loading: true,
};

const SchoolAuthContext = createContext<SchoolAuthContextType>(defaultContextValue);

interface SchoolAuthProviderProps {
  children: ReactNode;
}

export const SchoolAuthProvider: React.FC<SchoolAuthProviderProps> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [schoolAdmin, setSchoolAdmin] = useState<SchoolAdmin | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is already authenticated on app start
    const checkAuth = async () => {
      try {
        if (schoolApi.isAuthenticated()) {
          const result = await schoolApi.verifyToken();
          if (result.success && result.valid) {
            // Try to get user from localStorage first, fallback to verification data
            let user = schoolApi.getCurrentUser();
            if (!user && result.data) {
              // Construct user object from verification data if localStorage is empty
              user = {
                id: result.data.school_admin_id,
                email: result.data.email,
                name: result.data.email, // Fallback to email if name not available
                school_id: result.data.school_id,
                permissions: result.data.permissions || []
              };
            }
            
            if (user) {
              setSchoolAdmin(user);
              setIsAuthenticated(true);
            } else {
              schoolApi.logout();
            }
          } else {
            schoolApi.logout();
          }
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        schoolApi.logout();
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (email: string, password: string, captchaToken?: string, rememberMe?: boolean): Promise<{ success: boolean; message: string }> => {
    try {
      setLoading(true);
      const result = await schoolApi.login({
        email,
        password,
        ...(captchaToken ? { captcha_token: captchaToken } : {}),
        ...(rememberMe !== undefined ? { remember_me: rememberMe } : {}),
      });
      
      if (result.success && result.data) {
        setSchoolAdmin(result.data.school_admin);
        setIsAuthenticated(true);
        return { success: true, message: 'Login successful' };
      } else {
        return { success: false, message: result.message || 'Login failed' };
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Login failed';
      return { success: false, message };
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    schoolApi.logout();
    setSchoolAdmin(null);
    setIsAuthenticated(false);
  };

  const value: SchoolAuthContextType = {
    isAuthenticated,
    schoolAdmin,
    login,
    logout,
    loading,
  };

  return (
    <SchoolAuthContext.Provider value={value}>
      {children}
    </SchoolAuthContext.Provider>
  );
};

export const useSchoolAuth = (): SchoolAuthContextType => {
  const context = useContext(SchoolAuthContext);
  
  // With default context value, this should never be undefined
  // But add a warning if we're getting the default values
  if (context === defaultContextValue) {
    console.warn('useSchoolAuth is using default context values. Make sure SchoolAuthProvider is properly set up.');
  }
  
  return context;
};
