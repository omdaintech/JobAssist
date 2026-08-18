import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'

interface UseAuthGuardOptions {
  redirectTo?: string
  requireAuth?: boolean
  redirectIfAuthenticated?: boolean
}

/**
 * Custom hook to handle authentication guards and redirects
 * @param options Configuration options for the auth guard
 * @returns Authentication status and user info
 */
export const useAuthGuard = (options: UseAuthGuardOptions = {}) => {
  const {
    redirectTo = '/login',
    requireAuth = true,
    redirectIfAuthenticated = false
  } = options

  const { isAuthenticated, user, isInitialized } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    // Wait for auth to initialize before making decisions
    if (!isInitialized) return

    if (requireAuth && !isAuthenticated) {
      navigate(redirectTo)
    } else if (redirectIfAuthenticated && isAuthenticated) {
      navigate(redirectTo)
    }
  }, [isAuthenticated, isInitialized, navigate, redirectTo, requireAuth, redirectIfAuthenticated])

  return {
    isAuthenticated,
    user,
    isInitialized,
    isLoading: !isInitialized
  }
}

/**
 * Hook for pages that require authentication
 */
export const useRequireAuth = (redirectTo?: string) => {
  return useAuthGuard({ 
    requireAuth: true, 
    redirectTo: redirectTo || '/login' 
  })
}

/**
 * Hook for pages that should redirect authenticated users (like login page)
 */
export const useRedirectIfAuthenticated = (redirectTo?: string) => {
  return useAuthGuard({ 
    requireAuth: false, 
    redirectIfAuthenticated: true,
    redirectTo: redirectTo || '/dashboard' 
  })
} 