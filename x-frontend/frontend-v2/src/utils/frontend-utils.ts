/**
 * Frontend Utilities for Consistent Patterns
 *
 * This file contains standardized utility functions to ensure consistency
 * across all frontend components.
 */

// ================================
// TYPE DEFINITIONS
// ================================

interface ApiErrorResponse {
  response?: {
    status?: number;
    data?: {
      message?: string;
      detail?: string;
      error?: string;
    };
  };
  message?: string;
}

interface ApiResponse {
  data?: {
    success?: boolean;
    items?: unknown;
    data?: unknown;
  };
}

// ================================
// ERROR HANDLING UTILITIES
// ================================

/**
 * Extracts error message from API error responses consistently
 */
export const extractErrorMessage = (error: ApiErrorResponse): string => {
  // Handle Pydantic validation errors (422)
  if (error.response?.status === 422 && error.response?.data) {
    const data = error.response.data as any;
    
    // Check if it's a Pydantic validation error array
    if (Array.isArray(data.detail)) {
      // Extract first error message from validation errors
      const firstError = data.detail[0];
      if (firstError && firstError.msg) {
        return firstError.msg;
      }
    }
    
    // Check if detail is a string
    if (typeof data.detail === 'string') {
      return data.detail;
    }
  }
  
  return (
    error.response?.data?.message ||
    error.response?.data?.detail ||
    error.message ||
    "Something went wrong. Please try again."
  );
};

/**
 * Handles specific error status codes with appropriate messages
 */
export const handleSpecificErrors = (
  error: ApiErrorResponse,
  context?: string
): string => {
  // Handle specific status codes
  if (
    error.response?.status === 503 &&
    error.response?.data?.error === "question_bank_empty"
  ) {
    return "Oops! Cannot generate questions. Please contact support.";
  }

  if (error.response?.status === 401) {
    return "Please log in to continue.";
  }

  if (error.response?.status === 403) {
    return "You do not have permission to perform this action.";
  }

  if (error.response?.status === 429) {
    return "Too many requests. Please wait a moment and try again.";
  }

  // Handle "Session not found" errors with context-specific messages
  if (error.response?.data?.detail === "Session not found") {
    if (context === "exam") {
      return "This exam is no longer available or may have been removed.";
    }
    if (context === "practice") {
      return "This practice session is no longer available.";
    }
    return "Session not found - it may have expired or been removed.";
  }

  // Default error extraction
  return extractErrorMessage(error);
};

// ================================
// API RESPONSE UTILITIES
// ================================

/**
 * Checks if API response indicates success
 */
export const isSuccessResponse = (response: ApiResponse): boolean => {
  return response?.data?.success === true;
};

/**
 * Safely extracts data from API response
 */
export const extractResponseData = <T>(
  response: ApiResponse,
  fallback: T
): T => {
  if (isSuccessResponse(response) && response.data) {
    return (response.data.items as T) || (response.data.data as T) || fallback;
  }
  return fallback;
};

// ================================
// DATA TRANSFORMATION UTILITIES
// ================================

/**
 * Safely handles arrays that might be undefined or null
 */
export const safeArray = <T>(arr: T[] | undefined | null): T[] => {
  return Array.isArray(arr) ? arr : [];
};

/**
 * Safely extracts string values with fallback
 */
export const safeString = (value: unknown, fallback: string = ""): string => {
  return typeof value === "string" ? value : fallback;
};

/**
 * Safely extracts number values with fallback
 */
export const safeNumber = (value: unknown, fallback: number = 0): number => {
  const num = Number(value);
  return isNaN(num) ? fallback : num;
};

// ================================
// DATE FORMATTING UTILITIES
// ================================

/**
 * Consistent date formatting for display
 */
export const formatDate = (dateString: string): string => {
  try {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return "Invalid date";
  }
};

/**
 * Consistent date-time formatting for display
 */
export const formatDateTime = (dateString: string): string => {
  try {
    return new Date(dateString).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "Invalid date";
  }
};

/**
 * Relative time formatting (e.g., "2 hours ago")
 */
export const formatRelativeTime = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 60) {
      return diffMins <= 1 ? "Just now" : `${diffMins} minutes ago`;
    } else if (diffHours < 24) {
      return diffHours === 1 ? "1 hour ago" : `${diffHours} hours ago`;
    } else if (diffDays < 7) {
      return diffDays === 1 ? "1 day ago" : `${diffDays} days ago`;
    } else {
      return formatDate(dateString);
    }
  } catch {
    return "Unknown time";
  }
};

// ================================
// UI/UX CONSTANTS
// ================================

/**
 * Standardized button texts with consistent icons
 */
export const BUTTON_TEXTS = {
  retry: "🔄 Let's Try Again",
  back: "← Back",
  next: "Next →",
  submit: "Submit ✓",
  save: "Save Changes",
  delete: "🗑 Delete",
  cancel: "Cancel",
  edit: "✏️ Edit",
  view: "👁 View",
  download: "⬇️ Download",
  upload: "⬆️ Upload",
  refresh: "🔄 Refresh",
  search: "🔍 Search",
  filter: "🔽 Filter",
  sort: "⇅ Sort",
  create: "➕ Create",
  continue: "Continue →",
  complete: "Complete ✓",
  start: "Start →",
  loading: "Loading...",
  submitting: "Submitting...",
  processing: "Processing...",
} as const;

/**
 * Standard loading messages
 */
export const LOADING_MESSAGES = {
  default: "Loading...",
  data: "Loading data...",
  saving: "Saving changes...",
  submitting: "Submitting...",
  deleting: "Deleting...",
  analyzing: "Analyzing results...",
  generating: "Generating questions...",
  auth: "Initializing authentication...",
} as const;

/**
 * Standard error messages
 */
export const ERROR_MESSAGES = {
  default: "Something went wrong. Please try again.",
  network: "Network error. Please check your connection.",
  auth: "Please log in to continue.",
  permission: "You do not have permission to perform this action.",
  notFound: "The requested item could not be found.",
  validation: "Please check your input and try again.",
  server: "Server error. Please try again later.",
} as const;

// ================================
// VALIDATION UTILITIES
// ================================

/**
 * Validates email format
 */
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validates password strength (minimum requirements)
 */
export const isValidPassword = (password: string): boolean => {
  return password.length >= 6;
};

/**
 * Validates required form fields
 */
export const validateRequiredFields = (
  data: Record<string, unknown>,
  required: string[]
): string | null => {
  for (const field of required) {
    if (
      !data[field] ||
      (typeof data[field] === "string" && data[field].trim() === "")
    ) {
      return `${field.charAt(0).toUpperCase() + field.slice(1)} is required`;
    }
  }
  return null;
};

// ================================
// LOCAL STORAGE UTILITIES
// ================================

/**
 * Safely gets item from localStorage
 */
export const getStorageItem = (key: string): string | null => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};

/**
 * Safely sets item in localStorage
 */
export const setStorageItem = (key: string, value: string): boolean => {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
};

/**
 * Safely removes item from localStorage
 */
export const removeStorageItem = (key: string): boolean => {
  try {
    localStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
};

// ================================
// ASYNC OPERATION UTILITIES
// ================================

/**
 * Creates a delay for demonstration or throttling purposes
 */
export const delay = (ms: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

/**
 * Higher-order function to handle async errors consistently
 */
export const handleAsyncErrors = <T extends (...args: any[]) => Promise<any>>(
  asyncFunction: T
): T => {
  return ((...args: any[]) => {
    return asyncFunction(...args).catch((error: any) => {
      console.error("Async operation failed:", error);
      // Re-throw the error so it can be handled by the calling component
      throw error;
    });
  }) as T;
};

/**
 * Debounces a function call
 */
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

// ================================
// ACTIVITY TYPE UTILITIES
// ================================

/**
 * Maps activity types to their display properties
 */
export const ACTIVITY_DISPLAY = {
  reading: { icon: "📖", name: "Reading", color: "blue" },
  writing: { icon: "✍️", name: "Writing", color: "green" },
  grammar: { icon: "📝", name: "Grammar", color: "purple" },
} as const;

/**
 * Gets display properties for an activity type
 */
export const getActivityDisplay = (activityType: string) => {
  return (
    ACTIVITY_DISPLAY[activityType as keyof typeof ACTIVITY_DISPLAY] || {
      icon: "📋",
      name: activityType,
      color: "gray",
    }
  );
};

// ================================
// LEVEL UTILITIES
// ================================

/**
 * Maps CEFR levels to their display properties
 */
export const LEVEL_DISPLAY = {
  A1: { name: "Beginner", color: "green", order: 1 },
  A2: { name: "Elementary", color: "blue", order: 2 },
  B1: { name: "Intermediate", color: "purple", order: 3 },
  B2: { name: "Upper Intermediate", color: "indigo", order: 4 },
} as const;

/**
 * Gets display properties for a CEFR level
 */
export const getLevelDisplay = (level: string) => {
  return (
    LEVEL_DISPLAY[level as keyof typeof LEVEL_DISPLAY] || {
      name: level,
      color: "gray",
      order: 999,
    }
  );
};

// ================================
// COMMON HOOK UTILITIES
// ================================

/**
 * Standard async operation state interface
 */
export interface AsyncOperationState {
  isLoading: boolean;
  error: string | null;
  success: string | null;
}

/**
 * Initial state for async operations
 */
export const initialAsyncState: AsyncOperationState = {
  isLoading: false,
  error: null,
  success: null,
};

/**
 * Creates standard async operation handlers
 */
export const createAsyncHandlers = (
  setState: React.Dispatch<React.SetStateAction<AsyncOperationState>>
) => ({
  start: () =>
    setState((prev) => ({
      ...prev,
      isLoading: true,
      error: null,
      success: null,
    })),
  success: (message?: string) =>
    setState((prev) => ({
      ...prev,
      isLoading: false,
      success: message || "Operation completed successfully",
    })),
  error: (error: any) =>
    setState((prev) => ({
      ...prev,
      isLoading: false,
      error: handleSpecificErrors(error),
    })),
  reset: () => setState(initialAsyncState),
});

// ================================
// SESSION DELETION UTILITIES
// ================================

interface SessionForDeletion {
  session_id: string;
  status: string;
  analyzed_at?: string | null;
  session_type?: string;
  exam_name?: string;
}

/**
 * Determines if a session can be deleted based on business rules
 * Business Rules:
 * - Analyzed sessions (have analyzed_at timestamp) cannot be deleted
 * - Only sessions with status: created, in_progress, completed can be deleted
 */
export const canDeleteSession = (session: SessionForDeletion): boolean => {
  // Rule 1: Analyzed sessions cannot be deleted
  if (session.analyzed_at) {
    return false;
  }
  
  // Rule 2: Only certain statuses can be deleted
  const deletableStatuses = ['created', 'in_progress', 'completed'];
  return deletableStatuses.includes(session.status);
};

/**
 * Gets the reason why a session cannot be deleted (for user feedback)
 */
export const getSessionDeleteRestrictionReason = (session: SessionForDeletion): string | null => {
  if (session.analyzed_at) {
    return 'Analyzed sessions are preserved for your records and cannot be deleted.';
  }
  
  if (!['created', 'in_progress', 'completed'].includes(session.status)) {
    return `Sessions with status '${session.status}' cannot be deleted.`;
  }
  
  return null; // Can be deleted
};

/**
 * Handles session deletion with proper confirmation and error handling
 */
export const handleSessionDeletion = async (
  session: SessionForDeletion,
  deleteApiCall: (sessionId: string) => Promise<void>,
  onSuccess?: () => void
): Promise<boolean> => {
  // Check if session can be deleted
  if (!canDeleteSession(session)) {
    const reason = getSessionDeleteRestrictionReason(session);
    alert(reason || 'This session cannot be deleted.');
    return false;
  }

  // Get session type for better messaging
  const sessionType = session.session_type === 'practice' ? 'practice session' : 'exam';
  const sessionName = session.exam_name || 'session';

  // Confirmation dialog
  const confirmMessage = `Are you sure you want to delete this ${sessionType}?\n\n"${sessionName}"\n\nThis action cannot be undone.`;
  if (!confirm(confirmMessage)) {
    return false;
  }

  try {
    await deleteApiCall(session.session_id);
    
    // Call success callback if provided
    if (onSuccess) {
      onSuccess();
    }
    
    return true;
  } catch (err: any) {
    console.error('Error deleting session:', err);
    
    // Handle specific error messages from backend
    let errorMessage = 'Failed to delete session. Please try again.';
    
    if (err.response?.data?.detail) {
      errorMessage = err.response.data.detail;
    } else if (err.message) {
      errorMessage = err.message;
    }
    
    alert(`Delete Failed: ${errorMessage}`);
    return false;
  }
};

// ================================
// EXPORT ALL UTILITIES
// ================================

export default {
  // Error handling
  extractErrorMessage,
  handleSpecificErrors,

  // API responses
  isSuccessResponse,
  extractResponseData,

  // Data transformation
  safeArray,
  safeString,
  safeNumber,

  // Date formatting
  formatDate,
  formatDateTime,
  formatRelativeTime,

  // Constants
  BUTTON_TEXTS,
  LOADING_MESSAGES,
  ERROR_MESSAGES,

  // Validation
  isValidEmail,
  isValidPassword,
  validateRequiredFields,

  // Storage
  getStorageItem,
  setStorageItem,
  removeStorageItem,

  // Async utilities
  delay,
  debounce,

  // Activity & Level utilities
  getActivityDisplay,
  getLevelDisplay,

  // Async state management
  initialAsyncState,
  createAsyncHandlers,

  // Session deletion utilities
  canDeleteSession,
  getSessionDeleteRestrictionReason,
  handleSessionDeletion,
};
