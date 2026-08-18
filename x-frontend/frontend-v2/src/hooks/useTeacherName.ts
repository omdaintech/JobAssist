/**
 * useTeacherName Hook
 * Returns the appropriate teacher name based on the current language context
 */

import { useAuth } from '@/context/AuthContext';
import { getTeacherConfig, getTeacherName, LanguageConfig } from '@/config/languages';

export interface UseTeacherNameReturn {
  teacherName: string;
  teacherConfig: LanguageConfig;
  teacherEmoji: string;
}

/**
 * Hook to get the current teacher name based on user's preferred language
 * Falls back to default teacher name if no language is set
 */
export function useTeacherName(): UseTeacherNameReturn {
  const { preferredLanguage } = useAuth();
  
  const languageId = preferredLanguage?.language_id || null;
  const config = getTeacherConfig(languageId);
  
  return {
    teacherName: config.teacherFullName,
    teacherConfig: config,
    teacherEmoji: config.teacherEmoji,
  };
}

/**
 * Utility function to get teacher name for a specific language ID
 * Useful when you need teacher name for a language different from user's preferred language
 */
export function getTeacherNameForLanguage(languageId: string | null | undefined): string {
  return getTeacherName(languageId);
}

export default useTeacherName;
