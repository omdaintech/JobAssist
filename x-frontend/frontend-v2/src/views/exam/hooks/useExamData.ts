/**
 * useExamData Hook
 * 
 * Handles exam session data fetching and state management.
 * Extracted from ExamView.tsx - keeps exact same logic (lines 22-24, 47-69).
 */

import { useState } from 'react';
import { api, ExamDetail, ExamTemplate } from '@/services/api';
import { extractTemplatesFromResponse } from '@/utils/session-utils';

export const useExamData = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [exams, setExams] = useState<ExamDetail[]>([]);
  const [examTemplates, setExamTemplates] = useState<ExamTemplate[]>([]);

  const loadExamData = async (currentLevel?: string, schoolId?: string) => {
    setIsLoading(true);
    try {
      // Use current level from auth context
      const userLevel = currentLevel || 'A1';
      
      const [templatesResponse, examsResponse] = await Promise.all([
        api.sessions.templates(userLevel, schoolId),
        api.sessions.listExams()
      ]);

      // Handle templates data
      const templatesArray = extractTemplatesFromResponse(templatesResponse.data as unknown as Record<string, unknown>, 'exam');
      setExamTemplates(templatesArray);

      // Handle exams data - API returns 'sessions' or 'exams' (unified session system)
      const examsData = examsResponse.data?.sessions || examsResponse.data?.exams || [];
      setExams(Array.isArray(examsData) ? examsData : []);
    } catch {
      // Ensure arrays remain initialized on error
      setExamTemplates([]);
      setExams([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Load only templates (for modal level changes - doesn't reload exams)
  const loadTemplatesOnly = async (level: string, schoolId?: string) => {
    try {
      const templatesResponse = await api.sessions.templates(level, schoolId);
      const templatesArray = extractTemplatesFromResponse(templatesResponse.data as unknown as Record<string, unknown>, 'exam');
      setExamTemplates(templatesArray);
    } catch {
      setExamTemplates([]);
    }
  };

  return {
    exams,
    examTemplates,
    isLoading,
    loadExamData,
    loadTemplatesOnly, // New method for loading only templates
    setExams // Exposed for manual updates (e.g., after deletion)
  };
};

