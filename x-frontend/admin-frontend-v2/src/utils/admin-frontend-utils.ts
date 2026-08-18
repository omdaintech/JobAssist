/**
 * Utility to concatenate class names conditionally (like clsx)
 */
export function cn(...classes: Array<string | undefined | null | false>): string {
  return classes.filter(Boolean).join(" ");
}
/**
 * Admin Frontend Utilities
 *
 * Extends main frontend utilities with admin-specific patterns
 * and provides consistent utilities for admin dashboard
 */

// ================================
// TYPE DEFINITIONS
// ================================

interface AdminApiErrorResponse {
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

interface AdminApiResponse {
  success?: boolean;
  data?: unknown;
  message?: string;
  users?: unknown[];
  questions?: unknown[];
}

// ================================
// UNIFIED ERROR HANDLING
// ================================

/**
 * Centralized admin error handler
 * Provides consistent error handling across all admin components
 */
export class AdminErrorHandler {
  /**
   * Handles errors with consistent logging and user messaging
   */
  static handle(
    error: any,
    setError: (msg: string) => void,
    context?: string
  ): void {
    const message = handleAdminErrors(error);
    setError(message);

    // Centralized logging with context
    console.error(`Admin Error${context ? ` (${context})` : ""}:`, {
      message,
      originalError: error,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Handles async operations with unified error handling
   */
  static async handleAsync<T>(
    operation: () => Promise<T>,
    setError: (msg: string) => void,
    context?: string
  ): Promise<T | null> {
    try {
      return await operation();
    } catch (error) {
      this.handle(error, setError, context);
      return null;
    }
  }

  /**
   * Clears error state
   */
  static clear(setError: (msg: string | null) => void): void {
    setError(null);
  }
}

// ================================
// RESPONSE STANDARDIZATION
// ================================

/**
 * Standardized admin API response type
 */
export interface StandardizedAdminResponse<T = any> {
  success: boolean;
  data: T;
  message: string;
  error?: string;
}

/**
 * Standardizes admin API responses to handle multiple backend response formats
 * Handles inconsistent nesting and field structures from different endpoints
 */
export const standardizeAdminResponse = <T>(
  response: any
): StandardizedAdminResponse<T> => {
  // Log for debugging (remove in production)
  console.debug("Admin Response Raw:", response);

  // Handle question stats special case - fields at root level
  if (
    response.total_questions !== undefined ||
    response.by_activity_type !== undefined
  ) {
    return {
      success: response.success ?? true,
      data: response as T, // Use entire response as data for question stats
      message: response.message || "Question statistics retrieved successfully",
    };
  }

  // Handle user list special case - users at root level
  if (response.users !== undefined && Array.isArray(response.users)) {
    return {
      success: response.success ?? true,
      data: response as T, // Use entire response as data for user lists
      message: response.message || "Users retrieved successfully",
    };
  }

  // Handle admin stats special case - data nested under 'data' field
  if (response.data && response.data.totalUsers !== undefined) {
    return {
      success: response.success ?? true,
      data: response.data as T, // Extract the nested data for admin stats
      message: response.message || "Admin statistics retrieved successfully",
    };
  }

  // Handle bulk generate questions - fields at root level
  if (
    response.questions_generated !== undefined ||
    response.questions_saved !== undefined
  ) {
    return {
      success: response.success ?? true,
      data: response as T, // Use entire response for question generation
      message: response.message || "Questions generated successfully",
    };
  }

  // Handle pricing packs special case - pricing_packs at root level
  if (response.pricing_packs !== undefined) {
    return {
      success: response.success ?? true,
      data: response as T, // Use entire response as data for pricing packs
      message: response.message || "Pricing packs retrieved successfully",
    };
  }

  // Standard nested data structure (questions list, user details)
  if (response.data !== undefined) {
    return {
      success: response.success ?? true,
      data: response.data as T,
      message: response.message ?? "Operation completed successfully",
    };
  }

  // Fallback for simple responses
  return {
    success: response?.success ?? true,
    data: response as T,
    message: response?.message ?? "Operation completed successfully",
  };
};

/**
 * Extracts arrays from admin API responses handling multiple nesting structures
 * Supports: questions lists, user lists, and other array responses
 */
export const extractAdminArrayFromResponse = <T>(
  response: StandardizedAdminResponse | any,
  fallback: T[] = []
): T[] => {
  console.debug("Extracting array from:", response);

  if (!response) return fallback;

  // Handle standardized response structure
  const data = response.data || response;
  if (!data) return fallback;

  // Handle nested question structure (questions list API)
  if (data.data?.questions && Array.isArray(data.data.questions)) {
    console.debug("Found nested questions array:", data.data.questions.length);
    return data.data.questions;
  }

  // Handle direct questions array in data field
  if (data.questions && Array.isArray(data.questions)) {
    console.debug("Found direct questions array:", data.questions.length);
    return data.questions;
  }

  // Handle direct users array (user list API)
  if (data.users && Array.isArray(data.users)) {
    console.debug("Found users array:", data.users.length);
    return data.users;
  }

  // Handle direct array response
  if (Array.isArray(data)) {
    console.debug("Found direct array:", data.length);
    return data;
  }

  // Handle success field checking
  if (response.success === false) {
    console.warn("Response indicates failure, returning fallback");
    return fallback;
  }

  console.debug("No array found, returning fallback:", fallback);
  return fallback;
};

// ================================
// ERROR HANDLING UTILITIES
// ================================

/**
 * Extracts error message from admin API responses
 */
export const extractAdminErrorMessage = (
  error: AdminApiErrorResponse
): string => {
  return (
    error.response?.data?.message ||
    error.response?.data?.detail ||
    error.message ||
    "Something went wrong. Please try again."
  );
};

/**
 * Handles admin-specific error status codes
 */
export const handleAdminErrors = (error: AdminApiErrorResponse): string => {
  // Handle admin-specific status codes
  if (error.response?.status === 401) {
    return "Admin session expired. Please log in again.";
  }

  if (error.response?.status === 403) {
    return "Access denied. Admin privileges required.";
  }

  if (error.response?.status === 404) {
    return "Resource not found.";
  }

  if (error.response?.status === 422) {
    return "Invalid data provided. Please check your input.";
  }

  if (error.response?.status === 429) {
    return "Too many requests. Please wait a moment.";
  }

  if (error.response?.status === 500) {
    return "Server error. Please contact support if this persists.";
  }

  // Default error extraction
  return extractAdminErrorMessage(error);
};

// ================================
// API RESPONSE UTILITIES
// ================================

/**
 * Checks if admin API response indicates success
 */
export const isAdminSuccessResponse = (response: AdminApiResponse): boolean => {
  return response?.success === true;
};

/**
 * Safely extracts data from admin API response
 */
export const extractAdminResponseData = <T>(
  response: AdminApiResponse,
  fallback: T
): T => {
  if (isAdminSuccessResponse(response)) {
    return (response.data as T) || fallback;
  }
  return fallback;
};

/**
 * Safely extracts array data from admin API response
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const extractAdminArrayData = <T>(
  response: AdminApiResponse,
  arrayKey: string
): T[] => {
  if (isAdminSuccessResponse(response)) {
    // Check multiple possible locations for array data
    const arrayData =
      (response as any)[arrayKey] ||
      (response.data as any)?.[arrayKey] ||
      response.data;
    return Array.isArray(arrayData) ? arrayData : [];
  }
  return [];
};

// ================================
// ADMIN-SPECIFIC CONSTANTS
// ================================

/**
 * Admin-specific button texts
 */
export const ADMIN_BUTTON_TEXTS = {
  // Basic actions
  save: "💾 Save Changes",
  cancel: "✖️ Cancel",
  delete: "🗑️ Delete",
  edit: "✏️ Edit",
  view: "👁️ View Details",
  back: "← Back",

  // User management
  addUser: "➕ Add User",
  createUser: "✅ Create User",
  editUser: "✏️ Edit User",
  deactivateUser: "⏸️ Deactivate",
  activateUser: "▶️ Activate",
  resetUsage: "🔄 Reset Usage",

  // Question management
  generateQuestions: "🎯 Generate Questions",
  editQuestion: "✏️ Edit Question",
  deleteQuestion: "🗑️ Delete Question",
  markReviewed: "✅ Mark Reviewed",
  bulkDelete: "🗑️ Bulk Delete",

  // School management
  CREATE_SCHOOL: "🏫 Create School",
  editSchool: "✏️ Edit School",
  deleteSchool: "🗑️ Delete School",

  // General actions
  refresh: "🔄 Refresh",
  export: "📤 Export",
  import: "📥 Import",
  search: "🔍 Search",
  filter: "🔽 Filter",
  clear: "🧹 Clear",

  // Modal actions
  close: "✖️ Close",
  confirm: "✅ Confirm",
  proceed: "➡️ Proceed",

  // Quick actions
  sessionHistory: "📊 Session History",
  chargeHistory: "💳 Charge History",
  viewDetails: "👁️ View Details",
} as const;

/**
 * Admin-specific loading messages
 */
export const ADMIN_LOADING_MESSAGES = {
  default: "Loading...",
  authenticating: "Authenticating admin...",
  loadingUsers: "Loading users...",
  loadingQuestions: "Loading questions...",
  loadingTemplate: "Loading template preview...",
  loadingStats: "Loading dashboard statistics...",
  savingUser: "Saving user information...",
  generatingQuestions: "Generating questions...",
  deletingUser: "Deactivating user...",
  exportingData: "Exporting data...",
  updatingQuestion: "Updating question...",
} as const;

/**
 * Admin-specific success messages
 */
export const ADMIN_SUCCESS_MESSAGES = {
  userSaved: "User information updated successfully",
  userCreated: "New user created successfully",
  userDeactivated: "User deactivated successfully",
  userActivated: "User activated successfully",
  questionGenerated: "Questions generated successfully",
  questionUpdated: "Question updated successfully",
  questionDeleted: "Question deleted successfully",
  questionsDeleted: "Questions deleted successfully",
  dataExported: "Data exported successfully",
} as const;

// ================================
// ADMIN VALIDATION UTILITIES
// ================================

/**
 * Validates admin form data
 */
export const validateAdminForm = (
  data: Record<string, any>,
  required: string[]
): string | null => {
  for (const field of required) {
    const value = data[field];
    if (!value || (typeof value === "string" && value.trim() === "")) {
      const fieldName = field
        .replace("_", " ")
        .replace(/\b\w/g, (l) => l.toUpperCase());
      return `${fieldName} is required`;
    }
  }
  return null;
};

/**
 * Validates email format for admin operations
 */
export const isValidAdminEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 254;
};

/**
 * Validates user level
 */
export const isValidLevel = (level: string): boolean => {
  return ["A1", "A2", "B1", "B2"].includes(level);
};

/**
 * Validates plan type
 */
export const isValidPlanType = (plan: string): boolean => {
  return ["basic", "premium", "enterprise"].includes(plan);
};

// ================================
// ADMIN DATE UTILITIES
// ================================

/**
 * Formats date for admin display
 */
export const formatAdminDate = (dateString: string | null): string => {
  if (!dateString) return "Never";

  try {
    return new Date(dateString).toLocaleDateString("en-US", {
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
 * Formats date for admin tables (shorter format)
 */
export const formatAdminTableDate = (dateString: string | null): string => {
  if (!dateString) return "Never";

  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;

    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  } catch {
    return "Invalid";
  }
};

// ================================
// ADMIN STATUS UTILITIES
// ================================

/**
 * Gets status badge properties for users
 */
export const getUserStatusDisplay = (isActive: boolean) => {
  return isActive
    ? { text: "Active", color: "bg-green-100 text-green-800 border-green-200" }
    : { text: "Inactive", color: "bg-red-100 text-red-800 border-red-200" };
};

/**
 * Gets plan badge properties
 */
export const getPlanDisplay = (plan: string) => {
  switch (plan.toLowerCase()) {
    case "premium":
      return {
        text: "Premium",
        color: "bg-yellow-100 text-yellow-800 border-yellow-200",
      };
    case "enterprise":
      return {
        text: "Enterprise",
        color: "bg-purple-100 text-purple-800 border-purple-200",
      };
    default:
      return {
        text: "Basic",
        color: "bg-gray-100 text-gray-800 border-gray-200",
      };
  }
};

/**
 * Gets usage percentage color
 */
export const getUsagePercentageColor = (
  used: number,
  total: number
): string => {
  if (total === 0) return "from-blue-500 to-blue-600";

  const percentage = (used / total) * 100;
  if (percentage < 50) return "from-green-500 to-green-600";
  if (percentage < 80) return "from-yellow-500 to-yellow-600";
  return "from-red-500 to-red-600";
};

// ================================
// ADMIN ASYNC OPERATION UTILITIES
// ================================

/**
 * Standard admin async operation state
 */
export interface AdminAsyncOperationState {
  isLoading: boolean;
  error: string | null;
  success: string | null;
}

/**
 * Initial state for admin async operations
 */
export const initialAdminAsyncState: AdminAsyncOperationState = {
  isLoading: false,
  error: null,
  success: null,
};

/**
 * Creates admin async operation handlers
 */
export const createAdminAsyncHandlers = (
  setState: React.Dispatch<React.SetStateAction<AdminAsyncOperationState>>
) => ({
  start: (loadingMessage?: string) =>
    setState((prev) => ({
      ...prev,
      isLoading: true,
      error: null,
      success: null,
    })),
  success: (message: string) =>
    setState((prev) => ({
      ...prev,
      isLoading: false,
      success: message,
    })),
  error: (error: any) =>
    setState((prev) => ({
      ...prev,
      isLoading: false,
      error: handleAdminErrors(error),
    })),
  reset: () => setState(initialAdminAsyncState),
});

// ================================
// ADMIN TABLE UTILITIES
// ================================

/**
 * Creates sortable column configuration
 */
export const createSortableColumn = (
  key: string,
  label: string,
  sortable: boolean = true
) => ({
  key,
  label,
  sortable,
  render: (value: any) => value || "N/A",
});

/**
 * Sorts admin table data
 */
export const sortAdminTableData = <T extends Record<string, any>>(
  data: T[],
  sortKey: string,
  sortDirection: "asc" | "desc" = "asc"
): T[] => {
  return [...data].sort((a, b) => {
    const aVal = a[sortKey];
    const bVal = b[sortKey];

    // Handle null/undefined values
    if (aVal == null && bVal == null) return 0;
    if (aVal == null) return sortDirection === "asc" ? 1 : -1;
    if (bVal == null) return sortDirection === "asc" ? -1 : 1;

    // Handle different data types
    if (typeof aVal === "string" && typeof bVal === "string") {
      const result = aVal.localeCompare(bVal);
      return sortDirection === "asc" ? result : -result;
    }

    if (typeof aVal === "number" && typeof bVal === "number") {
      const result = aVal - bVal;
      return sortDirection === "asc" ? result : -result;
    }

    // Handle dates
    if (aVal instanceof Date && bVal instanceof Date) {
      const result = aVal.getTime() - bVal.getTime();
      return sortDirection === "asc" ? result : -result;
    }

    // Default string comparison
    const result = String(aVal).localeCompare(String(bVal));
    return sortDirection === "asc" ? result : -result;
  });
};

// ================================
// EXPORT ALL UTILITIES
// ================================

export default {
  // Error handling
  extractAdminErrorMessage,
  handleAdminErrors,
  AdminErrorHandler,
  standardizeAdminResponse,
  extractAdminArrayFromResponse,

  // API responses
  isAdminSuccessResponse,
  extractAdminResponseData,
  extractAdminArrayData,

  // Constants
  ADMIN_BUTTON_TEXTS,
  ADMIN_LOADING_MESSAGES,
  ADMIN_SUCCESS_MESSAGES,

  // Validation
  validateAdminForm,
  isValidAdminEmail,
  isValidLevel,
  isValidPlanType,

  // Date formatting
  formatAdminDate,
  formatAdminTableDate,

  // Status utilities
  getUserStatusDisplay,
  getPlanDisplay,
  getUsagePercentageColor,

  // Async operations
  initialAdminAsyncState,
  createAdminAsyncHandlers,

  // Table utilities
  createSortableColumn,
  sortAdminTableData,
};
