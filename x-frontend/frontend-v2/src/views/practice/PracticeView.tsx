/**
 * PracticeView - Main Practice Page
 * 
 * Refactored to use extracted components and hooks.
 * IMPORTANT: Keeps exact same logic and behavior as original.
 * 
 * Original file: 868 lines
 * Refactored: ~350 lines (60% reduction)
 */

import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { PageContainer } from '@/components/layout/PageContainer';
import { Card, CardContent, Button, ProgressRing, PracticeSessionItem, HowToButton, RichEmptyState, Breadcrumbs, SkeletonList } from '@/components/ui';
import { SessionResults, SessionFormData, ShareModal } from '@/components/shared';
import { useAuth } from '@/context/AuthContext';
import { useOnboardingGuard } from '@/hooks/useOnboardingGuard';
import { usePracticeNavigation } from '@/hooks/useSecureNavigation';
import { useTeacherName } from '@/hooks/useTeacherName';
import { api } from '@/services/api';

import { filterAndSortSessions } from '@/utils/session-utils';
import { cn } from '@/lib/utils';

// Local imports
import { usePracticeData, usePracticeAnalysis, usePracticeResults } from './hooks';
import { CreatePracticeModal } from './components';
import { getInitialStateFromURL, getSessionIdentifier } from './utils/transform-data';
import type { PracticeState, PracticeTab, PracticeSession } from './types';
import { createDefaultPracticeSessionPayload } from '@/utils/createDefaultSession';
import type { NavigationToastState, PracticeNavigationState } from '@/types/navigation';

const TOAST_VARIANT_STYLES: Record<'info' | 'success' | 'error' | 'warning', string> = {
  info: 'bg-blue-50 border-blue-200 text-blue-900',
  success: 'bg-green-50 border-green-200 text-green-900',
  error: 'bg-red-50 border-red-200 text-red-900',
  warning: 'bg-yellow-50 border-yellow-200 text-yellow-900'
};

export const PracticeView: React.FC = () => {
  const { isAuthenticated, currentLevel, user, preferredLanguage, remainingUsage } = useAuth();
  const { sessionId } = useParams<{ sessionId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { navigateToPracticeSession, navigateToPracticeResults } = usePracticeNavigation();
  const { teacherName } = useTeacherName();
  
  // Centralized onboarding guard - redirects if not onboarded
  useOnboardingGuard();

  // Set page title
  useEffect(() => {
    document.title = 'Practice Sessions | Lingali';
  }, []);

  // Capture navigation toast messages from route state
  useEffect(() => {
    const state = location.state as PracticeNavigationState | null;
    if (state?.toast) {
      setNavigationToast(state.toast);
      const { toast, ...restState } = state;
      const hasResidualState = Object.keys(restState).length > 0;
      navigate(location.pathname, {
        replace: true,
        state: hasResidualState ? restState : undefined,
      });
    }
  }, [location.pathname, location.state, navigate]);

  // State
  const [practiceState, setPracticeState] = useState<PracticeState>(
    getInitialStateFromURL(sessionId, location.pathname)
  );
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [activeTab, setActiveTab] = useState<PracticeTab>('sessions');
  const [navigationToast, setNavigationToast] = useState<NavigationToastState | null>(null);
  const [initialActivity, setInitialActivity] = useState<string | undefined>(undefined);
  
  // Share modal state
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareData, setShareData] = useState<{
    shareCode: string;
    shareUrl: string;
    expiresAt?: string;
  } | null>(null);

  // Ref to track if analysis has been triggered to prevent duplicate calls
  const analysisTriggeredRef = React.useRef<string | null>(null);

  // Custom hooks
  const practiceData = usePracticeData();
  const analysis = usePracticeAnalysis();
  const results = usePracticeResults();

  // Handle query string modal control (e.g., ?create=true&level=A1&activity=hearing)
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const shouldCreate = searchParams.get('create') === 'true';
    const prefillLevel = searchParams.get('level');
    const prefillActivity = searchParams.get('activity');
    const isRetryTest = searchParams.get('retry') === 'true';

    if (shouldCreate || isRetryTest) {
      // Pre-fill level if valid
      if (prefillLevel && prefillLevel !== currentLevel) {
        // Load templates for the prefilled level
        void practiceData.loadTemplatesOnly(prefillLevel, user?.school_id);
      }
      
      // Store initial activity for modal
      if (prefillActivity) {
        setInitialActivity(prefillActivity);
      }
      
      setShowCreateModal(true);
      
      // Store retry flag for auto-submit
      if (isRetryTest) {
        sessionStorage.setItem('autoSubmitPractice', 'true');
      }
      
      // Clean up URL after opening modal
      searchParams.delete('create');
      searchParams.delete('level');
      searchParams.delete('activity');
      searchParams.delete('retry');
      const newSearch = searchParams.toString();
      navigate(
        {
          pathname: location.pathname,
          search: newSearch ? `?${newSearch}` : '',
        },
        { replace: true }
      );
    }
  }, [location.search, location.pathname, navigate, currentLevel, practiceData, user?.school_id]);

  // Load practice data on mount - for authenticated users only (but only for list views)
  useEffect(() => {
    if (isAuthenticated && practiceState === 'selection') {
      practiceData.loadPracticeData(currentLevel, user?.school_id);
    }
  }, [isAuthenticated, practiceState]); // eslint-disable-line react-hooks/exhaustive-deps

  // Update state when URL changes and load session data if needed
  useEffect(() => {
    const newState = getInitialStateFromURL(sessionId, location.pathname);
    setPracticeState(newState);
    
    // Load session data when in completed state (results view)
    if (sessionId && isAuthenticated && newState === 'completed') {
      results.loadSessionResults(sessionId);
    }
    
    // Trigger analysis when user explicitly navigates to analyzing page
    // (e.g., by clicking "Analyze Session" button from results page)
    if (sessionId && isAuthenticated && newState === 'analyzing') {
      // Only trigger if we haven't already triggered for this session
      if (analysisTriggeredRef.current !== sessionId) {
        analysisTriggeredRef.current = sessionId;
        analysis.triggerSessionAnalysis(sessionId, navigateToPracticeResults);
      }
    }
    
    // Reset the ref when leaving analyzing state or changing sessions
    if (newState !== 'analyzing' || !sessionId) {
      analysisTriggeredRef.current = null;
    }
  }, [sessionId, location.pathname, isAuthenticated]); // eslint-disable-line react-hooks/exhaustive-deps

  // Handle practice session creation
  const handleCreatePractice = async (formData: SessionFormData): Promise<void> => {
    const payload = createDefaultPracticeSessionPayload({
      languageId: formData.language_id,
      sessionName: formData.session_name,
      level: formData.level,
      templateId: formData.template_id,
      activityType: (formData.activity_type as 'reading' | 'writing' | 'grammar' | 'hearing') || 'reading'
    });

    const response = await api.sessions.create(payload);

    setShowCreateModal(false);
    
    // Redirect to the newly created session
    const sessionId = response.data.session_id || response.data.exam_id;
    if (sessionId) {
      navigateToPracticeSession(sessionId);
    } else {
      // Fallback: reload practice data if no session ID (shouldn't happen)
      if (practiceState === 'selection') {
        await practiceData.loadPracticeData(currentLevel, user?.school_id);
      }
    }
  };

  // Handle level change in create modal
  const handleLevelChange = async (level: string): Promise<void> => {
    // Only reload templates, not sessions - prevents unnecessary re-renders
    await practiceData.loadTemplatesOnly(level, user?.school_id);
  };

  const handlePrimaryAction = (session: PracticeSession) => {
    const identifier = getSessionIdentifier(session);

    if (!identifier) {
      return;
    }

    if (session.status === 'analyzed' || session.status === 'completed') {
      navigateToPracticeResults(identifier);
      return;
    }

    navigateToPracticeSession(identifier);
  };

  const handleShare = async () => {
    if (!sessionId) return;

    try {
      const response = await api.sessions.createShareLink(sessionId);
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
      alert(err.response?.data?.detail || 'Failed to create share link');
    }
  };

  const handleDismissNavigationToast = () => setNavigationToast(null);
  const toastVariantKey: 'info' | 'success' | 'error' | 'warning' = navigationToast?.variant || 'info';
  const navigationToastBanner = navigationToast ? (
    <div
      className={cn(
        'mb-4 flex flex-col gap-2 rounded-lg border p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between',
        TOAST_VARIANT_STYLES[toastVariantKey]
      )}
    >
      <div>
        <p className="font-semibold">{navigationToast.title}</p>
        {navigationToast.description && (
          <p className="text-sm mt-1 opacity-90">{navigationToast.description}</p>
        )}
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleDismissNavigationToast}
        className="text-current hover:bg-white/40"
      >
        Dismiss
      </Button>
    </div>
  ) : null;



  // Separate sessions by status
  const ongoingSessions = filterAndSortSessions(
    practiceData.sessions || [],
    ['created', 'in_progress'],
    5
  );

  const completedSessions = filterAndSortSessions(
    practiceData.sessions || [],
    ['completed', 'analyzed'],
    10  // Show only latest 10 completed sessions
  );

  // Removed auto-switch to completed tab - let users see the empty state for ongoing sessions

  // Loading state
  if (practiceData.isLoading || results.isLoading) {
    return (
      <PageContainer>
        <div className="app-content-container py-3 md:py-4 lg:py-6 max-w-[1400px] mx-auto px-4">
          <Breadcrumbs />
          {navigationToastBanner}
          <div className="mb-4 md:mb-6">
            <div className="h-8 md:h-10 bg-gray-200 rounded w-1/3 mb-2 animate-pulse"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2 animate-pulse"></div>
          </div>
          <SkeletonList count={3} itemType="session" />
        </div>
      </PageContainer>
    );
  }

  // Completed state - show results
  if (practiceState === 'completed' && sessionId) {
    return (
      <>
        <SessionResults
          sessionData={results.sessionDetail ? {
            sessionId: results.sessionDetail.exam_id,
            sessionName: results.sessionDetail.exam_name,
            sessionType: 'practice',
            level: results.sessionDetail.level,
            status: results.sessionDetail.status as 'completed' | 'analyzed',
            createdAt: results.sessionDetail.created_at,
            completedAt: results.sessionDetail.completed_at,
            analyzedAt: results.sessionDetail.analyzed_at,
            durationMinutes: results.sessionDetail.duration_minutes,
            language: { 
              name: results.sessionDetail.language_name || 'Language'
            },
            template: results.sessionDetail.template,
            progress: results.sessionDetail.progress ? {
              totalQuestions: results.sessionDetail.progress.total_questions,
              completedQuestions: results.sessionDetail.progress.completed_questions,
              activityBreakdown: results.sessionDetail.progress.activity_breakdown
            } : undefined,
            overallScore: (results.sessionDetail as any).overall_score, // Overall score from analysis
            consecutiveHighScores: (results.sessionDetail as any).consecutive_high_scores // Streak count for engagement
          } : {
            sessionId: sessionId,
            sessionName: 'Practice Session',
            sessionType: 'practice',
            level: 'A1',
            status: 'completed',
            createdAt: new Date().toISOString(),
            language: { name: 'Language' }
          }}
          answers={results.sessionAnswers}
          sectionSummaries={results.sectionSummaries}
          analysisConfig={{
            canAnalyze: results.sessionDetail?.status === 'completed' && 
                       !results.sessionDetail?.analyzed_at && 
                       !analysis.isAnalyzing && 
                       !results.sessionAnswers.some(a => a.isSkipped || !a.userAnswer || (typeof a.userAnswer === 'string' && a.userAnswer.trim() === '')),
            isAnalyzing: analysis.isAnalyzing,
            analysisProgress: analysis.analysisProgress,
            currentStep: analysis.currentStep,
            totalSteps: 4,
            onStartAnalysis: () => sessionId
              ? analysis.triggerSessionAnalysis(sessionId, navigateToPracticeResults)
              : Promise.resolve()
          }}
          actions={{
            onBackToList: () => navigate('/practice'),
            onShare: handleShare,
            onDelete: async () => {
              if (!sessionId) return;
              
              const sessionName = results.sessionDetail?.exam_name || 'practice session';
              const confirmMessage = `Are you sure you want to delete this practice session?\n\n"${sessionName}"\n\nThis action cannot be undone.`;
              
              if (!confirm(confirmMessage)) {
                return;
              }
              
              try {
                await api.sessions.delete(sessionId);
                navigate('/practice');
              } catch (err: any) {
                console.error('Error deleting session:', err);
                alert('Failed to delete session. Please try again.');
              }
            },
          }}
          showShareButton={results.sessionDetail?.status === 'completed' || results.sessionDetail?.status === 'analyzed'}
          analysisError={analysis.error}
          onDismissAnalysisError={() => analysis.setError(null)}
          isLoading={results.isLoading}
          error={results.error}
        />

        {/* Share Modal */}
        <ShareModal
          isOpen={showShareModal && !!shareData}
          onClose={() => {
            setShowShareModal(false);
            setShareData(null);
          }}
          shareUrl={shareData?.shareUrl || ''}
          shareCode={shareData?.shareCode || ''}
          expiresAt={shareData?.expiresAt}
        />
      </>
    );
  }

  // Analyzing state - show progress
  if (practiceState === 'analyzing' && sessionId) {
    return (
      <div className="max-w-4xl mx-auto p-3 md:p-4 space-y-4 md:space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3 md:gap-4">
          <Button onClick={() => navigate('/practice')} variant="outline" size="sm">
            ← Back to Practice
          </Button>
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-gray-900">Practice Analysis</h1>
            <p className="text-sm md:text-base text-gray-600">{teacherName} is reviewing your responses</p>
          </div>
        </div>

        {/* Analysis Progress Card */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 md:p-4 mb-4 md:mb-6">
          <div className="flex items-center gap-3 md:gap-4 mb-3 md:mb-4">
            <div className="flex-shrink-0 relative">
              <ProgressRing
                progress={analysis.analysisProgress}
                size="lg"
                color="orange"
                showText={false}
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-base md:text-lg font-bold text-orange-600">
                    {Math.round(analysis.analysisProgress)}%
                  </div>
                  <div className="text-[10px] md:text-xs text-orange-500">progress</div>
                </div>
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-yellow-800 text-base md:text-lg">Analysis in Progress</h4>
              <p className="text-xs md:text-sm text-yellow-700 mb-2">{teacherName} is analyzing your responses...</p>
              <div className="flex items-center gap-2 text-xs md:text-sm text-yellow-600">
                <div className="w-2 h-2 bg-orange-400 rounded-full animate-pulse"></div>
                <span>Expected completion: ~60 seconds</span>
              </div>
            </div>
          </div>

          <div className="space-y-2 md:space-y-3 text-xs md:text-sm">
            {[
              'Evaluating language accuracy and fluency',
              'Analyzing grammar and vocabulary usage',
              'Generating personalized improvement suggestions',
              'Preparing detailed feedback report'
            ].map((step, index) => (
              <div key={index} className={cn(
                'flex items-center gap-2 transition-all duration-500',
                analysis.currentStep >= index + 1 ? 'text-orange-600' : 'text-gray-500'
              )}>
                {analysis.currentStep >= index + 1 ? (
                  <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
                ) : (
                  <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
                )}
                <span className={analysis.currentStep === index + 1 ? 'font-medium' : ''}>
                  {step}
                </span>
                {analysis.currentStep > index + 1 && (
                  <span className="text-green-500 text-xs">✓</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Additional info card */}
        <Card>
          <CardContent className="p-4 md:p-5 lg:p-6">
            <div className="flex items-center gap-2 mb-3 md:mb-4">
              <span className="text-blue-600">ℹ️</span>
              <h4 className="font-medium text-blue-800 text-sm md:text-base">What happens next?</h4>
            </div>
            <ul className="text-xs md:text-sm text-blue-700 space-y-2">
              <li className="flex items-start gap-2">
                <span className="text-blue-500 mt-1">•</span>
                <span>You'll receive detailed feedback for each question</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-500 mt-1">•</span>
                <span>{teacherName} will highlight your strengths and areas to improve</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-500 mt-1">•</span>
                <span>Personalized study suggestions will be provided</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-500 mt-1">•</span>
                <span>You'll automatically be redirected to your results</span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Default: Selection view
  return (
    <PageContainer>
      <div className="app-content-container py-3 md:py-4 lg:py-6 max-w-[1400px] mx-auto px-4">
        <Breadcrumbs />
        {navigationToastBanner}
        {/* Header with Create Button */}
        <div className="mb-4 md:mb-6">
          <div className="flex items-start justify-between gap-4 mb-3 md:mb-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1.5 md:mb-2">
                <h1 className="text-xl md:text-2xl lg:text-3xl font-bold text-gray-900 flex items-center gap-2">
                  <span className="text-2xl md:text-3xl">🧠</span>
                  My Practice
                </h1>
                <HowToButton pageId="practice" size="md" />
              </div>
              <p className="text-xs md:text-sm text-gray-600 leading-relaxed">
                Stay consistent with focused practice sessions
              </p>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              disabled={ongoingSessions.length >= 5}
              className="flex-shrink-0 inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors shadow-sm min-h-[44px]"
              aria-label="Create new practice session"
              aria-disabled={ongoingSessions.length >= 5}
            >
              <span className="text-base">+</span>
              <span className="hidden sm:inline">Create Practice</span>
              <span className="sm:hidden">Create</span>
            </button>
          </div>

          {/* Limit Warning */}
          {ongoingSessions.length >= 5 && (
            <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg text-sm text-orange-800">
              ⚠️ You have reached the maximum of 5 ongoing practice sessions. Please complete or delete a session before creating a new one.
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="mb-4 md:mb-6 border-b border-gray-200">
          <div className="flex space-x-6 md:space-x-8">
            <button
              onClick={() => setActiveTab('sessions')}
              className={`pb-3 md:pb-4 text-sm md:text-base font-medium transition-colors relative ${
                activeTab === 'sessions'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Sessions
            </button>
            <button
              onClick={() => setActiveTab('performance')}
              className={`pb-3 md:pb-4 text-sm md:text-base font-medium transition-colors relative ${
                activeTab === 'performance'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Performance
              <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-600">
                Coming Soon
              </span>
            </button>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'sessions' ? (
          <div className="space-y-6">
            {/* Ongoing Sessions Section */}
            <section>
              <h2 className="text-lg md:text-xl font-semibold text-gray-900 mb-3 md:mb-4">
                Ongoing
                {ongoingSessions.length > 0 && (
                  <span className="ml-2 text-sm font-normal text-gray-500">
                    ({ongoingSessions.length} of 5 max)
                  </span>
                )}
              </h2>
              {ongoingSessions.length > 0 ? (
                <div className="grid grid-cols-1 gap-4 md:gap-5">
                  {ongoingSessions.map((session) => (
                    <PracticeSessionItem
                      key={session.session_id || session.exam_id}
                      session={session}
                      onClick={() => handlePrimaryAction(session)}
                    />
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="p-0">
                    <RichEmptyState
                      title={completedSessions.length > 0 ? "Ready for Another Practice?" : "Ready to Start Practicing?"}
                      description={completedSessions.length > 0 
                        ? "You don't have any ongoing practice sessions. Start a new one to continue your learning journey!"
                        : "Practice sessions are perfect for focused learning. Choose a specific skill, get instant AI feedback, and track your improvement over time."
                      }
                      actions={[
                        {
                          label: completedSessions.length > 0 ? 'Start New Practice' : 'Create Your First Practice Session',
                          labelShort: 'Create Practice',
                          onClick: () => setShowCreateModal(true),
                          variant: 'default',
                          icon: '🚀'
                        }
                      ]}
                      tips={completedSessions.length > 0 ? [
                        '🎉 Many practice types are FREE or cost very few credits'
                      ] : [
                        '🎉 Many practice types are FREE or cost very few credits • Perfect for daily practice',
                        '⚡ Get instant, detailed AI feedback on every answer',
                        '🎯 Focus on one skill: Reading, Writing, Grammar, or Hearing',
                        '📊 Takes about 15-20 minutes • Practice at your own pace',
                        '✨ Great for targeting specific weak areas'
                      ]}
                    />
                  </CardContent>
                </Card>
              )}
            </section>

            {/* Completed Sessions Section */}
            <section>
              <h2 className="text-lg md:text-xl font-semibold text-gray-900 mb-3 md:mb-4">
                Completed
              </h2>
              {completedSessions.length > 0 ? (
                <>
                  <div className="grid grid-cols-1 gap-4 md:gap-5">
                    {completedSessions.map((session) => (
                      <PracticeSessionItem
                        key={session.session_id || session.exam_id}
                        session={session}
                        onClick={() => handlePrimaryAction(session)}
                      />
                    ))}
                  </div>
                  
                  {/* Show More button if there are more completed sessions */}
                  {practiceData.sessions && practiceData.sessions.filter(s => s.status === 'completed' || s.status === 'analyzed').length > 10 && (
                    <div className="mt-4 text-center">
                      <Button
                        variant="outline"
                        size="default"
                        onClick={() => navigate('/practice-log')}
                        className="min-w-[200px]"
                      >
                        View All Sessions →
                      </Button>
                    </div>
                  )}
                </>
              ) : (
                <Card>
                  <CardContent className="p-0">
                    <RichEmptyState
                      title="Your Results Will Appear Here"
                      description="Once you complete a practice session, you'll see detailed AI feedback, performance scores, and personalized recommendations to help you improve."
                      actions={[
                        {
                          label: 'Start New Practice',
                          labelShort: 'New Practice',
                          onClick: () => setShowCreateModal(true),
                          variant: 'default',
                          icon: '🚀'
                        }
                      ]}
                      tips={[
                        '📊 Each result shows your CEFR level assessment',
                        '🎓 Get detailed AI feedback on grammar, vocabulary, and style',
                        '💡 Receive personalized recommendations for improvement',
                        '📈 Track your progress and see how you improve over time',
                        `🎯 Results are analyzed by ${teacherName}, our AI teacher`,
                        '⏱️ Analysis typically takes 60-90 seconds after completion'
                      ]}
                    />
                  </CardContent>
                </Card>
              )}
            </section>
          </div>
        ) : (
          /* Performance Tab - Coming Soon */
          <Card>
            <CardContent className="p-8 md:p-12 text-center">
              <div className="max-w-md mx-auto space-y-4">
                <div className="text-6xl mb-4">📊</div>
                <h2 className="text-2xl font-bold text-gray-900">Performance Analytics</h2>
                <p className="text-gray-600">
                  Track your practice performance, view trends, and get insights similar to your dashboard - all in one place.
                </p>
                <div className="pt-4">
                  <span className="inline-flex items-center px-4 py-2 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium">
                    🚀 Coming Soon
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Create Practice Modal */}
      <CreatePracticeModal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          setInitialActivity(undefined); // Reset when closing
        }}
        onCreate={handleCreatePractice}
        isLoading={practiceData.isLoading}
        ongoingSessionsCount={ongoingSessions.length}
        currentLevel={currentLevel}
        preferredLanguage={preferredLanguage || undefined}
        practiceTemplates={practiceData.practiceTemplates}
        onLevelChange={handleLevelChange}
        initialActivity={initialActivity}
      />

      {/* Share Modal */}
      <ShareModal
        isOpen={showShareModal && !!shareData}
        onClose={() => {
          setShowShareModal(false);
          setShareData(null);
        }}
        shareUrl={shareData?.shareUrl || ''}
        shareCode={shareData?.shareCode || ''}
        expiresAt={shareData?.expiresAt}
      />
    </PageContainer>
  );
};

