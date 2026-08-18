/**
 * Exam Data Transformation Utilities
 *
 * Re-export shared adapters with legacy names for backwards compatibility.
 */

export {
  transformExamDetailToSessionData as transformToSessionData,
  transformExamAnswersToSessionAnswers as transformToSessionAnswers,
} from '@/utils/session-results';
