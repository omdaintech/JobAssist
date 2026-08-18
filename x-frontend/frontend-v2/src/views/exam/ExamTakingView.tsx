/**
 * ExamTakingView - Exam Taking Page
 * 
 * Simple wrapper for SessionTaking component with exam-specific config.
 * This file is already perfectly structured - no refactoring needed.
 */

import { SessionTaking } from '@/components/shared';
import { useAuth } from '@/context/AuthContext';
import { getResultsUrl } from '@/utils/navigation-utils';
import React, { useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';

export const ExamTakingView: React.FC = () => {
  const { examId } = useParams<{ examId: string }>();
  const navigate = useNavigate();
  const { isAuthenticated, isInitialized, isLoading: authLoading } = useAuth();
  const [searchParams] = useSearchParams();

  // Set page title
  useEffect(() => {
    document.title = 'Taking Exam | One-CEFR';
  }, []);

  // Auth check
  if (!isInitialized || authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-eu-blue"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    navigate('/login');
    return null;
  }

  if (!examId) {
    navigate('/exam');
    return null;
  }

  // Check if we should skip auto-start
  const skipStartExam = searchParams.get('skipStartExam') === 'true';

  return (
    <SessionTaking 
      config={{
        sessionType: 'exam',
        showFeedback: false,
        allowResumeFromQuestion: true,
        enableProgressDetails: true,
        autoAdvanceOnSubmit: true,
        skipAutoStart: skipStartExam
      }}
      sessionId={examId}
      actions={{
        onSessionComplete: () => {
          // Navigate to exam results using navigation utility
          const url = getResultsUrl(examId, 'exam');
          navigate(url);
        },
        onExitSession: () => {
          // Return to exam list
          navigate('/exam');
        }
      }}
    />
  );
};

