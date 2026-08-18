import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * Centralized onboarding guard hook
 * Redirects users to onboarding if not completed
 * Use this in any component that requires onboarding to be completed
 */
export const useOnboardingGuard = () => {
  const { isAuthenticated, isInitialized, isOnboarded } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Only enforce after auth is initialized
    if (!isInitialized) return;

    // Only enforce for authenticated users
    if (!isAuthenticated) return;

    // Don't redirect if already on onboarding page
    if (location.pathname === '/onboarding') return;

    // Redirect to onboarding if not completed
    if (!isOnboarded) {
      navigate('/onboarding', { replace: true });
    }
  }, [isAuthenticated, isInitialized, isOnboarded, location.pathname, navigate]);

  return { isOnboarded };
};
