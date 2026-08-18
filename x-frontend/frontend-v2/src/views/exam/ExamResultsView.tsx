/**
 * ExamResultsView - Exam Results Display Page
 * 
 * Refactored to use extracted hooks and utilities.
 * IMPORTANT: Keeps exact same logic and behavior as original.
 */

import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { LoadingSpinner, Card, CardContent, Button } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/services/api';
import type { ExamDetail, ExamAnswer } from '@/services/api';
import { SessionResults } from '@/components/shared';
import { ShareModal } from '@/components/shared/ShareModal';

// Local imports
import { useExamAnalysis } from './hooks';
import { transformToSessionData, transformToSessionAnswers } from './utils';

export const ExamResultsView: React.FC = () => {
  const { examId } = useParams<{ examId: string }>();
  const navigate = useNavigate();
  useAuth(); // Ensure user is authenticated via route protection

  // State
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [examDetail, setExamDetail] = useState<ExamDetail | null>(null);
  const [examAnswers, setExamAnswers] = useState<ExamAnswer[]>([]);
  const [sectionSummaries, setSectionSummaries] = useState<Record<string, any>>({});
  
  // Share modal state
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareData, setShareData] = useState<{
    shareCode: string;
    shareUrl: string;
    expiresAt?: string;
  } | null>(null);

  // Analysis hook
  const analysis = useExamAnalysis();

  // Effects
  useEffect(() => {
    if (examId) {
      loadExamResults();
    }
  }, [examId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Methods
  const loadExamResults = async () => {
    if (!examId) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Load exam status and answers in parallel
      const [statusResponse, answersResponse] = await Promise.all([
        api.sessions.status(examId),
        api.sessions.answers(examId)
      ]);

      setExamDetail(statusResponse.data.session);

      if (answersResponse.data.success) {
        setExamAnswers(answersResponse.data.answers);
        // Store section summaries if available
        if (answersResponse.data.section_summaries) {
          setSectionSummaries(answersResponse.data.section_summaries);
        }
      }

      // Check if exam is actually completed
      if (statusResponse.data.session.status !== 'completed' && statusResponse.data.session.status !== 'analyzed') {
        setError('This exam is not completed yet. Only completed exams can be viewed in detail.');
        return;
      }

    } catch (err: any) {
      console.error('Error loading exam results:', err);
      setError(err.response?.data?.detail || 'Failed to load exam results');
    } finally {
      setIsLoading(false);
    }
  };

  const handleShare = async () => {
    if (!examId) return;

    try {
      const response = await api.sessions.createShareLink(examId);
      const payload = response.data as typeof response.data & {
        share_code?: string;
        share_url?: string;
        message?: string;
      };

      if (payload.share_code && payload.share_url) {
        setShareData({
          shareCode: payload.share_code,
          shareUrl: payload.share_url,
          expiresAt: payload.expires_at,
        });
        setShowShareModal(true);
        return;
      }

      const detail = payload.message || 'Failed to create share link';
      alert(detail);
    } catch (err: any) {
      console.error('Failed to create share link:', err);
      alert(err.response?.data?.detail || 'Failed to create share link');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh] p-4">
        <div className="text-center">
          <LoadingSpinner />
          <p className="text-gray-600 mt-3 text-sm md:text-base">Loading your exam results...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto p-4">
        <Card className="border-red-200">
          <CardContent className="p-6 text-center">
            <div className="text-4xl mb-4">😅</div>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">Oops! Something went wrong</h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <div className="flex gap-2 justify-center">
              <Link to="/exam">
                <Button variant="outline">← Back to Exams</Button>
              </Link>
              <Button onClick={loadExamResults} variant="outline">
                🔄 Let's Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!examDetail) {
    return (
      <div className="max-w-4xl mx-auto p-4">
        <Card>
          <CardContent className="p-6 text-center">
            <div className="text-4xl mb-4">📊</div>
            <p className="text-gray-600">Exam not found</p>
            <Link to="/exam" className="mt-4 inline-block">
              <Button variant="outline">← Back to Exams</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const sessionData = transformToSessionData(examDetail);
  const sessionAnswers = transformToSessionAnswers(examAnswers);

  if (!sessionData) {
    return (
      <div className="max-w-4xl mx-auto p-4">
        <Card>
          <CardContent className="p-6 text-center">
            <div className="text-4xl mb-4">📊</div>
            <p className="text-gray-600">Unable to load exam data</p>
            <Link to="/exam" className="mt-4 inline-block">
              <Button variant="outline">← Back to Exams</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Check for skipped questions
  const hasSkippedQuestions = sessionAnswers.some(a => 
    a.isSkipped || !a.userAnswer || (typeof a.userAnswer === 'string' && a.userAnswer.trim() === '')
  );

  return (
    <>
      <SessionResults
        sessionData={sessionData}
        answers={sessionAnswers}
        sectionSummaries={sectionSummaries}
        analysisConfig={{
          canAnalyze: examDetail?.status === 'completed' && !examDetail?.analyzed_at && !analysis.isAnalyzing && !hasSkippedQuestions,
          isAnalyzing: analysis.isAnalyzing,
          analysisProgress: analysis.countdown > 0 ? analysis.getCountdownProgress() : undefined,
          currentStep: analysis.countdown > 0 ? analysis.getCurrentAnalysisStep() : undefined,
          totalSteps: 4,
          onStartAnalysis: () => analysis.handleStartAnalysis(examId!, loadExamResults)
        }}
        actions={{
          onBackToList: () => navigate('/exam'),
          onShare: handleShare,
        }}
        showShareButton={examDetail?.status === 'completed' || examDetail?.status === 'analyzed'}
        isLoading={isLoading}
        analysisError={analysis.analysisError}
        onDismissAnalysisError={() => analysis.setAnalysisError(null)}
      />

      {/* Share Modal */}
      {shareData && (
        <ShareModal
          isOpen={showShareModal}
          onClose={() => setShowShareModal(false)}
          shareUrl={shareData.shareUrl}
          shareCode={shareData.shareCode}
          expiresAt={shareData.expiresAt}
        />
      )}
    </>
  );
};

