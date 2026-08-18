/**
 * usePracticeResults Hook
 * 
 * Handles loading practice session results.
 * Extracted from PracticeView.tsx lines 285-326 - keeps exact same logic.
 */

import { useState } from 'react';
import { api } from '@/services/api';
import { transformAnswerData } from '../utils/transform-data';
import type { ExamDetail, SessionAnswer, SectionSummary } from '../types';

export const usePracticeResults = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [sessionDetail, setSessionDetail] = useState<ExamDetail | null>(null);
  const [sessionAnswers, setSessionAnswers] = useState<SessionAnswer[]>([]);
  const [sectionSummaries, setSectionSummaries] = useState<SectionSummary>({});
  const [error, setError] = useState<string | null>(null);

  const loadSessionResults = async (sessionId: string) => {
    setIsLoading(true);
    setError(null);
    
    // IMPORTANT: Clear old state to prevent stale data from showing
    // This ensures the UI updates properly after analysis completion
    setSessionDetail(null);
    setSessionAnswers([]);
    setSectionSummaries({});

    try {
      // Load session status and answers in parallel (same pattern as ExamResultsView)
      const [statusResponse, answersResponse] = await Promise.all([
        api.sessions.status(sessionId),
        api.sessions.answers(sessionId)
      ]);

      setSessionDetail(statusResponse.data.session);

      if (answersResponse.data.success) {
        // Transform API data to match SessionResults component interface
        const transformedAnswers = transformAnswerData(answersResponse.data.answers);
        setSessionAnswers(transformedAnswers);
        
        // Store section summaries if available
        if (answersResponse.data.section_summaries) {
          setSectionSummaries(answersResponse.data.section_summaries);
        }
      }

      // Check if session is actually completed
      if (statusResponse.data.session.status !== 'completed' && statusResponse.data.session.status !== 'analyzed') {
        setError('This practice session is not completed yet. Only completed sessions can be viewed in detail.');
        return;
      }

    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load practice session results');
    } finally {
      setIsLoading(false);
    }
  };

  return {
    sessionDetail,
    sessionAnswers,
    sectionSummaries,
    isLoading,
    error,
    loadSessionResults,
    setError
  };
};

