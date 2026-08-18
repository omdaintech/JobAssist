import { SessionTaking } from '@/components/shared';
import { useAuth } from '@/context/AuthContext';
import { getResultsUrl } from '@/utils/navigation-utils';
import React, { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

export const PracticeTakingView: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { isAuthenticated, isInitialized, isLoading: authLoading } = useAuth();

  // Set page title
  useEffect(() => {
    document.title = 'Practice Session | One-CEFR';
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

  if (!sessionId) {
    navigate('/practice');
    return null;
  }

  return (
    <SessionTaking 
      config={{
        sessionType: 'practice',
        showFeedback: true,
        allowResumeFromQuestion: false,
        enableProgressDetails: true,
        autoAdvanceOnSubmit: true
      }}
      sessionId={sessionId}
      actions={{
        onSessionComplete: () => {
          // Navigate to practice results (matching exam behavior)
          // User can review answers and click "Analyze Session" when ready
          const url = getResultsUrl(sessionId, 'practice');
          navigate(url);
        },
        onExitSession: () => {
          // Return to practice list
          navigate('/practice');
        }
      }}
    />
  );
};
