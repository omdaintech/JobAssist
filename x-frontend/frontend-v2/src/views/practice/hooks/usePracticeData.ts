/**
 * usePracticeData Hook
 * 
 * Handles practice session data fetching and state management.
 * Extracted from PracticeView.tsx - keeps exact same logic (lines 108-134).
 */

import { useState } from 'react';
import { api } from '@/services/api';
import { extractTemplatesFromResponse } from '@/utils/session-utils';
import type { PracticeSession, ExamTemplate } from '../types';

export const usePracticeData = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [sessions, setSessions] = useState<PracticeSession[]>([]);
  const [practiceTemplates, setPracticeTemplates] = useState<ExamTemplate[]>([]);

  const loadPracticeData = async (currentLevel?: string, schoolId?: string) => {
    setIsLoading(true);
    try {
      // Use current level and school_id from auth context
      const userLevel = currentLevel || 'A1';
      
      const [templatesResponse, sessionsResponse] = await Promise.all([
        api.sessions.templates(userLevel, schoolId),
        api.sessions.listPractice()
      ]);

      // Handle templates data
      const templatesArray = extractTemplatesFromResponse(templatesResponse.data as unknown as Record<string, unknown>, 'practice');
      setPracticeTemplates(templatesArray);

      // Handle sessions data - API returns 'sessions' (unified session system)
      const sessionsData = sessionsResponse.data?.sessions || sessionsResponse.data?.practice_sessions || [];
      setSessions(Array.isArray(sessionsData) ? sessionsData as unknown as PracticeSession[] : []);
    } catch {
      // Ensure arrays remain initialized on error
      setPracticeTemplates([]);
      setSessions([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Load only templates (for modal level changes - doesn't reload sessions)
  const loadTemplatesOnly = async (level: string, schoolId?: string) => {
    try {
      const templatesResponse = await api.sessions.templates(level, schoolId);
      const templatesArray = extractTemplatesFromResponse(templatesResponse.data as unknown as Record<string, unknown>, 'practice');
      setPracticeTemplates(templatesArray);
    } catch {
      setPracticeTemplates([]);
    }
  };

  return {
    sessions,
    practiceTemplates,
    isLoading,
    loadPracticeData,
    loadTemplatesOnly, // New method for loading only templates
    setSessions // Exposed for manual updates (e.g., after deletion)
  };
};

