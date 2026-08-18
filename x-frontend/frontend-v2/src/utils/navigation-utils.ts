/**
 * Navigation Utilities
 * 
 * Centralized utilities for generating navigation URLs for sessions (practice/exam).
 * This ensures consistency across the entire application.
 */

export type SessionType = 'practice' | 'exam';
export type SessionStatus = 'created' | 'in_progress' | 'completed' | 'analyzed';

/**
 * Generate the appropriate URL for a session based on its status and type
 * 
 * @param sessionId - The unique identifier for the session
 * @param sessionType - Type of session ('practice' or 'exam')
 * @param status - Current status of the session
 * @returns The appropriate URL path for the session
 * 
 * @example
 * ```ts
 * // For viewing results of an analyzed practice session
 * getSessionUrl('abc123', 'practice', 'analyzed')
 * // Returns: '/practice/session/abc123/results'
 * 
 * // For continuing an in-progress exam
 * getSessionUrl('xyz789', 'exam', 'in_progress')
 * // Returns: '/exam/xyz789'
 * ```
 */
export const getSessionUrl = (
  sessionId: string,
  sessionType: SessionType,
  status: SessionStatus
): string => {
  if (sessionType === 'exam') {
    // Exam URL patterns
    switch (status) {
      case 'analyzed':
      case 'completed':
        return `/exam/${sessionId}/results`;
      case 'in_progress':
      case 'created':
      default:
        return `/exam/${sessionId}`;
    }
  } else {
    // Practice URL patterns
    switch (status) {
      case 'analyzed':
        return `/practice/session/${sessionId}/results`;
      case 'completed':
        return `/practice/session/${sessionId}/analyzing`;
      case 'in_progress':
      case 'created':
      default:
        return `/practice/session/${sessionId}`;
    }
  }
};

/**
 * Generate a results URL for a completed/analyzed session
 * 
 * @param sessionId - The unique identifier for the session
 * @param sessionType - Type of session ('practice' or 'exam')
 * @returns The URL path to view the session results
 * 
 * @example
 * ```ts
 * getResultsUrl('abc123', 'practice')
 * // Returns: '/practice/session/abc123/results'
 * 
 * getResultsUrl('xyz789', 'exam')
 * // Returns: '/exam/xyz789/results'
 * ```
 */
export const getResultsUrl = (
  sessionId: string,
  sessionType: SessionType
): string => {
  return sessionType === 'exam'
    ? `/exam/${sessionId}/results`
    : `/practice/session/${sessionId}/results`;
};

/**
 * Generate a taking/active session URL
 * 
 * @param sessionId - The unique identifier for the session
 * @param sessionType - Type of session ('practice' or 'exam')
 * @returns The URL path to take/continue the session
 * 
 * @example
 * ```ts
 * getSessionTakingUrl('abc123', 'practice')
 * // Returns: '/practice/session/abc123'
 * 
 * getSessionTakingUrl('xyz789', 'exam')
 * // Returns: '/exam/xyz789'
 * ```
 */
export const getSessionTakingUrl = (
  sessionId: string,
  sessionType: SessionType
): string => {
  return sessionType === 'exam'
    ? `/exam/${sessionId}`
    : `/practice/session/${sessionId}`;
};

/**
 * Generate an analyzing URL for a completed session awaiting analysis
 * 
 * @param sessionId - The unique identifier for the session
 * @param sessionType - Type of session ('practice' or 'exam')
 * @returns The URL path to the analyzing state
 * 
 * @example
 * ```ts
 * getAnalyzingUrl('abc123', 'practice')
 * // Returns: '/practice/session/abc123/analyzing'
 * 
 * getAnalyzingUrl('xyz789', 'exam')
 * // Returns: '/exam/xyz789/results' (exams go directly to results)
 * ```
 */
export const getAnalyzingUrl = (
  sessionId: string,
  sessionType: SessionType
): string => {
  // For exams, go directly to results (no analyzing state)
  // For practice, show analyzing animation
  return sessionType === 'exam'
    ? `/exam/${sessionId}/results`
    : `/practice/session/${sessionId}/analyzing`;
};

/**
 * Get the appropriate action label based on session status
 * 
 * @param status - Current status of the session
 * @returns Display label for the action button
 */
export const getSessionActionLabel = (status: SessionStatus): string => {
  switch (status) {
    case 'analyzed':
      return 'View Results';
    case 'completed':
      return 'Analyze Session';
    case 'created':
      return 'Start';
    case 'in_progress':
      return 'Continue';
    default:
      return 'View';
  }
};

/**
 * Determine the primary action for a session based on its status
 * 
 * @param status - Current status of the session
 * @returns The action type
 */
export const getSessionPrimaryAction = (
  status: SessionStatus
): 'view-results' | 'analyze' | 'continue' | 'start' => {
  switch (status) {
    case 'analyzed':
      return 'view-results';
    case 'completed':
      return 'analyze';
    case 'in_progress':
      return 'continue';
    case 'created':
    default:
      return 'start';
  }
};
