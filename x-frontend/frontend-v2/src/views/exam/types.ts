/**
 * Exam Module Types
 * 
 * Centralized type definitions for the exam module.
 * Re-exports API types and defines exam-specific types.
 */

// Re-export API types used in exam views
export type {
  ExamDetail,
  ExamTemplate,
  ExamAnswer,
  ExamListResponse,
  ExamCreateRequest,
  ExamCreateResponse,
  ExamAnswersResponse,
  ExamAnalysisResponse
} from '@/services/api';

// Re-export shared component types
export type { SessionFormData, SessionResultData, SessionAnswer } from '@/components/shared';

// Exam-specific types
export type ExamTab = 'sessions' | 'performance';

