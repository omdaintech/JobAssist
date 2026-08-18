import { LanguageInfo, UsageInfo, UserInfo, api } from '@/services/api'
import { brandManager } from '@/utils/brand-manager'
import { ReactNode, createContext, useContext, useEffect, useReducer } from 'react'

// Types
interface AuthState {
  user: UserInfo | null
  token: string | null
  isInitialized: boolean
  isLoading: boolean
  usageInfo: UsageInfo | null
  currentLevel: string | null
  preferredLanguage: LanguageInfo | null
  isOnboarded: boolean
  // Note: onboardingGoal, targetLevel, practiceFrequencyPerWeek removed from global state
  // These are only needed locally in OnboardingView, not for routing logic
}

interface AuthContextType extends AuthState {
  login: (credentials: { email: string; password: string; captcha_token?: string }) => Promise<{ success: boolean; message?: string; error?: string }>
  logout: () => Promise<void>
  silentLogout: () => Promise<void>
  checkAuthStatus: () => Promise<boolean>
  reloadFromStorage: () => void
  initializeAuth: () => Promise<void>
  refreshUsage: () => Promise<void>
  refreshToken: () => Promise<boolean>
  loadUserDashboard: () => Promise<any>
  isAuthenticated: boolean
  userEmail: string
  userName: string
  remainingUsage: number
  totalUsage: number
  usagePercentage: number
  currentLevel: string
  preferredLanguage: LanguageInfo | null
  isOnboarded: boolean
  // Note: Removed onboardingGoal, targetLevel, practiceFrequencyPerWeek
  // Access these from user object directly when needed in OnboardingView
}

// Actions
type AuthAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_USER'; payload: UserInfo | null }
  | { type: 'SET_TOKEN'; payload: string | null }
  | { type: 'SET_USAGE_INFO'; payload: UsageInfo | null }
  | { type: 'SET_INITIALIZED'; payload: boolean }
  | { type: 'SET_CURRENT_LEVEL'; payload: string | null }
  | { type: 'SET_PREFERRED_LANGUAGE'; payload: LanguageInfo | null }
  | { type: 'SET_ONBOARDING'; payload: { isOnboarded: boolean } }
  | { type: 'LOGOUT' }

// Initial state
const initialState: AuthState = {
  user: null,
  token: localStorage.getItem('authToken'),
  isInitialized: false,
  isLoading: false,
  usageInfo: null,
  currentLevel: null,
  preferredLanguage: null,
  isOnboarded: false,
}

// Reducer
function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload }
    case 'SET_USER':
      return {
        ...state,
        user: action.payload,
        isOnboarded: action.payload?.is_onboarded ?? state.isOnboarded,
        // Note: onboardingGoal, targetLevel, practiceFrequencyPerWeek are in user object
        // Access via state.user.onboarding_goal when needed (not duplicated in root state)
      }
    case 'SET_TOKEN':
      return { ...state, token: action.payload }
    case 'SET_USAGE_INFO':
      return { ...state, usageInfo: action.payload }
    case 'SET_INITIALIZED':
      return { ...state, isInitialized: action.payload }
    case 'SET_CURRENT_LEVEL':
      return { ...state, currentLevel: action.payload }
    case 'SET_PREFERRED_LANGUAGE':
      return { ...state, preferredLanguage: action.payload }
    case 'SET_ONBOARDING':
      return {
        ...state,
        isOnboarded: action.payload.isOnboarded,
        // Note: Other onboarding fields stored in user object only
      }
    case 'LOGOUT':
      return {
        ...state,
        user: null,
        token: null,
        usageInfo: null,
        currentLevel: null,
        preferredLanguage: null,
        isOnboarded: false,
      }
    default:
      return state
  }
}

// Create context
const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Provider component
export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, initialState)

  // Computed values
  const isAuthenticated = Boolean(state.token && state.user)

  const userEmail = state.user?.email || ''
  const userName = state.user?.name || userEmail
  const remainingUsage = state.usageInfo?.remaining_count || 0
  const totalUsage = state.usageInfo?.allocated_count || 0
  const usagePercentage = totalUsage > 0 ? Math.round(((state.usageInfo?.used_count || 0) / totalUsage) * 100) : 0

  // Actions
  const login = async (credentials: { email: string; password: string }) => {
    dispatch({ type: 'SET_LOADING', payload: true })

    try {
      // First, ensure any previous brand styles are cleaned up
      brandManager.removeBrandStyles()

      const response = await api.auth.login(credentials)

      if (response.data.success) {
        const {
          access_token,
          user_id,
          email,
          name,
          current_level,
          is_onboarded,
          onboarding_goal,
          target_level,
          practice_frequency_per_week,
        } = response.data

        if (access_token) {
          dispatch({ type: 'SET_TOKEN', payload: access_token })
          localStorage.setItem('authToken', access_token)
        }

        // Build user_info from individual fields
        const user_info = {
          user_id: user_id || '',
          email: email || '',
          name: name || '',
          current_level: current_level || 'A1',
          is_onboarded: typeof is_onboarded === 'boolean' ? is_onboarded : false,
          onboarding_goal: onboarding_goal || null,
          target_level: target_level || null,
          practice_frequency_per_week: practice_frequency_per_week ?? null,
        }

        if (user_info.user_id) {
          dispatch({ type: 'SET_USER', payload: user_info })
          dispatch({ type: 'SET_CURRENT_LEVEL', payload: current_level || 'A1' })
          dispatch({
            type: 'SET_ONBOARDING',
            payload: {
              isOnboarded: user_info.is_onboarded ?? false,
            },
          })
        }

        // Always call checkAuthStatus to ensure full authentication state is initialized
        // This ensures consistency with Firebase login flow and proper state synchronization
        await checkAuthStatus()

        return { success: true }
      } else {
        // Prioritize 'error' field over 'message' field as per user request
        const errorText = response.data.error || response.data.message
        return { success: false, message: errorText, error: response.data.error }
      }
    } catch (error: any) {
      console.error('Login error:', error)
      const errorData = error.response?.data
      const message = errorData?.error || errorData?.message || 'Login failed. Please try again.'
      return { success: false, message, error: errorData?.error }
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false })
    }
  }

  const logout = async () => {
    dispatch({ type: 'SET_LOADING', payload: true })

    try {
      // Client-side logout - clear auth state and token
      // No backend logout endpoint available
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      // Clear brand styles
      brandManager.removeBrandStyles()
      
      // Clear auth state
      dispatch({ type: 'LOGOUT' })
      localStorage.removeItem('authToken')
      dispatch({ type: 'SET_LOADING', payload: false })
    }
  }

  const silentLogout = async () => {
    try {
      // Client-side silent logout - clear auth state and token
      // No backend logout endpoint available
    } catch (error) {
      console.error('Silent logout error:', error)
    } finally {
      // Clear brand styles
      brandManager.removeBrandStyles()
      
      // Clear auth state
      dispatch({ type: 'LOGOUT' })
      localStorage.removeItem('authToken')
    }
  }

  const checkAuthStatus = async (): Promise<boolean> => {
    // CRITICAL FIX: Always check localStorage for the current token
    // This prevents race conditions when the state hasn't updated yet after Firebase login
    const currentToken = localStorage.getItem('authToken')
    
    if (!currentToken) {
      return false
    }

    // Update state with current token if it's different
    if (currentToken !== state.token) {
      dispatch({ type: 'SET_TOKEN', payload: currentToken })
    }

    try {
      const response = await api.auth.status()

      if (response.data.success && response.data.user_info) {
        const userInfo = response.data.user_info
        dispatch({ type: 'SET_USER', payload: userInfo })
        dispatch({
          type: 'SET_ONBOARDING',
          payload: {
            isOnboarded: Boolean(userInfo?.is_onboarded),
          },
        })

        // Load brand theme based on school_id with force reload to ensure clean state
        if (userInfo.school_id) {
          try {
            await brandManager.loadBrandTheme(userInfo.school_id, true)
            // Small delay to ensure styles are fully applied before rendering
            await new Promise(resolve => setTimeout(resolve, 100))
          } catch (error) {
            console.error('Failed to load brand theme:', error)
            // Continue without brand theme
          }
        }

        if (response.data.usage_info) {
          dispatch({ type: 'SET_USAGE_INFO', payload: response.data.usage_info })
        } else {
          dispatch({
            type: 'SET_USAGE_INFO',
            payload: {
              allocated_count: 0,
              used_count: 0,
              remaining_count: 0,
              plan_type: 'basic'
            }
          })
        }
        if (response.data.preferred_language_info) {
          dispatch({ type: 'SET_PREFERRED_LANGUAGE', payload: response.data.preferred_language_info })
        } else {
          dispatch({ type: 'SET_PREFERRED_LANGUAGE', payload: null })
        }

        const resolvedLevel = userInfo?.current_level || response.data.current_level || 'A1'
        dispatch({ type: 'SET_CURRENT_LEVEL', payload: resolvedLevel })
        return true
      } else {
        await silentLogout()
        return false
      }
    } catch (error) {
      console.error('Auth status check failed:', error)
      await silentLogout()
      return false
    }
  }

  const initializeAuth = async () => {
    if (state.isInitialized) return

    dispatch({ type: 'SET_LOADING', payload: true })

    try {
      if (state.token) {
        // Verify token with timeout
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Auth check timeout')), 10000)
        )

        await Promise.race([
          checkAuthStatus(),
          timeoutPromise
        ])
      }
    } catch (error) {
      console.error('Auth initialization failed:', error)
      await silentLogout()
    } finally {
      dispatch({ type: 'SET_INITIALIZED', payload: true })
      dispatch({ type: 'SET_LOADING', payload: false })
    }
  }

  const refreshUsage = async () => {
    if (!isAuthenticated) return

    try {
      const response = await api.user.usage()
      if (response.data.success) {
        dispatch({ type: 'SET_USAGE_INFO', payload: response.data.usage_info })
      }
    } catch (error) {
      console.error('Error refreshing usage:', error)
    }
  }

  const loadUserDashboard = async () => {
    if (!isAuthenticated) return

    try {
      // Load user profile for user info and level
      const profileResponse = await api.user.profile()
      if (profileResponse.data.success) {
        const userInfo = {
          user_id: profileResponse.data.user_id,
          name: profileResponse.data.name,
          email: profileResponse.data.email,
          current_level: profileResponse.data.current_level,
          member_since: profileResponse.data.member_since,
          last_login: profileResponse.data.last_login
        }
        dispatch({ type: 'SET_USER', payload: userInfo })
        dispatch({ type: 'SET_CURRENT_LEVEL', payload: profileResponse.data.current_level || 'A1' })
      }

      // Load usage info separately
      const usageResponse = await api.user.usage()
      if (usageResponse.data.success && usageResponse.data.usage_info) {
        dispatch({ type: 'SET_USAGE_INFO', payload: usageResponse.data.usage_info })
      }
    } catch (error) {
      console.error('Error loading dashboard:', error)
    }
  }

  const refreshToken = async (): Promise<boolean> => {
    if (!state.token) return false

    try {
      // No backend refresh endpoint available
      // Check if current token is still valid by calling auth status
      const response = await api.auth.status()

      if (response.data.success && response.data.user_info) {
        // Token is still valid
        return true
      } else {
        // Token is invalid, logout
        await logout()
        return false
      }
    } catch (error) {
      console.error('Token validation failed:', error)
      await logout()
      return false
    }
  }

  const reloadFromStorage = () => {
    const token = localStorage.getItem('authToken');
    dispatch({ type: 'SET_TOKEN', payload: token });
  };

  // Initialize auth on mount
  useEffect(() => {
    initializeAuth()
  }, [])

  const value: AuthContextType = {
    ...state,
    login,
    logout,
    silentLogout,
    checkAuthStatus,
    reloadFromStorage,
    initializeAuth,
    refreshUsage,
    refreshToken,
    loadUserDashboard,
    isAuthenticated,
    userEmail,
    userName,
    remainingUsage,
    totalUsage,
    usagePercentage,
    currentLevel: state.currentLevel || 'A1',
    preferredLanguage: state.preferredLanguage,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// Hook to use auth context
export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
