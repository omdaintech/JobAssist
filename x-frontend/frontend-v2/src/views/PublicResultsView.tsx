import React, { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { SessionResults } from '@/components/shared/SessionResults';
import type { SessionResultData, SessionAnswer, SectionSummary } from '@/components/shared/SessionResults';
import { api } from '@/services/api';
import { LoadingSpinner, Button, Card, CardContent } from '@/components/ui';
import { transformPublicSessionToSessionData, transformApiAnswersToSessionAnswers } from '@/utils/session-results';

export const PublicResultsView: React.FC = () => {
  const { shareCode } = useParams<{ shareCode: string }>();
  const navigate = useNavigate();

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sessionData, setSessionData] = useState<SessionResultData | null>(null);
  const [answers, setAnswers] = useState<SessionAnswer[]>([]);
  const [sectionSummaries, setSectionSummaries] = useState<SectionSummary>({});

  const loadPublicResults = useCallback(async () => {
    if (!shareCode) return;

    setIsLoading(true);
    setError(null);

    try {
      // Load session and answers in parallel
      const [sessionResponse, answersResponse] = await Promise.all([
        api.public.getSharedSession(shareCode),
        api.public.getSharedAnswers(shareCode),
      ]);

      if (sessionResponse.data.success && sessionResponse.data.session) {
        setSessionData(transformPublicSessionToSessionData(sessionResponse.data.session));
      }

      if (answersResponse.data.success) {
        setAnswers(transformApiAnswersToSessionAnswers(answersResponse.data.answers));
        setSectionSummaries(answersResponse.data.section_summaries || {});
      }
    } catch (error) {
      console.error('Failed to load public results:', error);
      const apiError = error as { response?: { status?: number; data?: { detail?: string } } };

      if (apiError.response?.status === 404) {
        setError('This share link is invalid, expired, or has been disabled.');
      } else {
        setError(apiError.response?.data?.detail || 'Failed to load shared results. Please try again later.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [shareCode]);

  useEffect(() => {
    document.title = 'Shared Results | Lingali';
    if (shareCode) {
      loadPublicResults();
    }
  }, [shareCode, loadPublicResults]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <LoadingSpinner />
          <p className="text-gray-600 mt-4">Loading shared results...</p>
        </div>
      </div>
    );
  }

  if (error || !sessionData) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <Card className="max-w-md w-full">
          <CardContent className="text-center py-12">
            <div className="text-6xl mb-4">🔗</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Link Not Found</h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <Button onClick={() => navigate('/')}>Go to Homepage</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      {/* Signup Promotion Banner */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-4">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold">Want to track your own progress?</h3>
              <p className="text-sm text-blue-100">
                Create your free account and start improving your German today!
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => navigate('/signup')}
                className="bg-white !text-blue-600 hover:bg-gray-100 hover:!text-blue-600"
              >
                Sign Up Free
              </Button>
              <Button
                onClick={() => window.open('https://lingali.com/', '_blank', 'noopener,noreferrer')}
                className="bg-white !text-blue-600 hover:bg-gray-100 hover:!text-blue-600"
              >
                Know More
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Public Badge */}
      <div className="bg-amber-50 border-b border-amber-200 py-2">
        <div className="max-w-6xl mx-auto px-4">
          <p className="text-sm text-amber-800 text-center">
            👁️ <strong>Public View</strong> - You're viewing shared results (personal info hidden)
          </p>
        </div>
      </div>

      {/* Reuse SessionResults Component */}
      <SessionResults
        sessionData={sessionData}
        answers={answers}
        sectionSummaries={sectionSummaries}
        isPublicView={true}
        showShareButton={false}
        actions={{}}  // No actions for public view
      />

      {/* Bottom CTA */}
      <div className="bg-gray-50 border-t py-12">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h3 className="text-2xl font-bold text-gray-900 mb-3">
            Ready to Master German?
          </h3>
          <p className="text-gray-600 mb-6">
            Get AI-powered feedback, track your progress, and ace your CEFR exams.
          </p>
          <Button
            onClick={() => navigate('/signup')}
            size="lg"
            className="px-8"
          >
            Start Free Today
          </Button>
        </div>
      </div>
    </>
  );
};
