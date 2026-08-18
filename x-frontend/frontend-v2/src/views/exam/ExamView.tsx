/**
 * ExamView - Main Exam Page
 * 
 * Refactored to use extracted components and hooks.
 * IMPORTANT: Keeps exact same logic and behavior as original.
 */

import React, { useEffect, useState } from 'react';
import { Card, CardContent, Button, HowToButton, RichEmptyState, Breadcrumbs, SkeletonList } from '@/components/ui';
import { ExamListItem } from '@/components/ui/exam-list-item';
import type { ExamData } from '@/components/ui/exam-list-item';
import type { SessionFormData } from '@/components/shared';
import { PageContainer } from '@/components/layout/PageContainer';
import { useAuth } from '@/context/AuthContext';
import { useOnboardingGuard } from '@/hooks/useOnboardingGuard';
import { useExamNavigation } from '@/hooks/useSecureNavigation';
import { api } from '@/services/api';

import { filterAndSortSessions } from '@/utils/session-utils';
import { useNavigate, useSearchParams } from 'react-router-dom';

// Local imports
import { useExamData } from './hooks';
import { CreateExamModal } from './components';
import type { ExamTab } from './types';

export const ExamView: React.FC = () => {
  const { isAuthenticated, currentLevel, user, preferredLanguage, remainingUsage } = useAuth();
  const { navigateToExam, navigateToExamResults } = useExamNavigation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Centralized onboarding guard - redirects if not onboarded
  useOnboardingGuard();

  const [activeTab, setActiveTab] = useState<ExamTab>('sessions');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [prefilledLevel, setPrefilledLevel] = useState<string | undefined>(undefined);

  // Set page title
  useEffect(() => {
    document.title = 'Exams | Lingali';
  }, []);

  // Custom hook for exam data
  const examData = useExamData();

  // Load exam data on mount - for authenticated users only
  useEffect(() => {
    if (isAuthenticated) {
      examData.loadExamData(currentLevel, user?.school_id);
    }
  }, [isAuthenticated]); // eslint-disable-line react-hooks/exhaustive-deps

  // Handle URL parameters for auto-opening create modal
  useEffect(() => {
    if (!isAuthenticated || !examData.examTemplates || examData.examTemplates.length === 0) return;
    
    const shouldCreate = searchParams.get('create') === 'true';
    const levelParam = searchParams.get('level');
    
    if (shouldCreate) {
      // Set prefilled level if provided
      if (levelParam) {
        setPrefilledLevel(levelParam);
        // Load templates for this level
        examData.loadTemplatesOnly(levelParam, user?.school_id);
      }
      
      // Open modal
      setShowCreateModal(true);
      
      // Clear the URL parameters
      searchParams.delete('create');
      searchParams.delete('level');
      setSearchParams(searchParams, { replace: true });
    }
  }, [isAuthenticated, searchParams, examData.examTemplates]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCreateExam = async (formData: SessionFormData, skipStart?: boolean): Promise<void> => {
    const response = await api.sessions.create({
      language_id: formData.language_id,
      session_name: formData.session_name,
      level: formData.level,
      template_id: formData.template_id,
      session_type: "exam"
    });

    setShowCreateModal(false);
    setPrefilledLevel(undefined); // Reset prefilled level
    
    // Redirect to the newly created exam
    const examId = response.data.session_id || response.data.exam_id;
    if (examId) {
      if (skipStart) {
        // Navigate to exam page without auto-starting
        navigate(`/exam/${examId}?skipStartExam=true`);
      } else {
        // Normal navigation (will auto-start)
        navigateToExam(examId);
      }
    } else {
      // Fallback: reload exam data if no exam ID (shouldn't happen)
      await examData.loadExamData(currentLevel, user?.school_id);
    }
  };

  // Handle level change in create modal
  const handleLevelChange = async (level: string): Promise<void> => {
    // Only reload templates, not exams - prevents unnecessary re-renders
    await examData.loadTemplatesOnly(level, user?.school_id);
  };

  const ongoingExams = filterAndSortSessions(
    examData.exams || [],
    ['created', 'in_progress'],
    5  // Keep at 5 for ongoing
  );

  const completedExams = filterAndSortSessions(
    examData.exams || [],
    ['completed', 'analyzed'],
    10  // Show only latest 10 completed exams
  );



  if (examData.isLoading) {
    return (
      <PageContainer>
        <div className="app-content-container py-3 md:py-4 lg:py-6 max-w-[1400px] mx-auto px-4">
          <Breadcrumbs />
          <div className="mb-4 md:mb-6">
            <div className="h-8 md:h-10 bg-gray-200 rounded w-1/3 mb-2 animate-pulse"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2 animate-pulse"></div>
          </div>
          <SkeletonList count={3} itemType="session" />
        </div>
      </PageContainer>
    );
  }

  // If not authenticated, show login prompt
  if (!isAuthenticated) {
    return (
      <PageContainer>
        <div className="app-content-container py-6 md:py-8">
          <Card>
            <CardContent className="text-center py-12">
              <div className="text-5xl mb-4">🎓</div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">AI-Powered CEFR Assessment</h2>
              <p className="text-gray-600 mb-6">Sign in to take real CEFR exams</p>
              <Button onClick={() => navigate('/login')}>Sign In</Button>
            </CardContent>
          </Card>
        </div>
      </PageContainer>
    );
  }

  return (
      <PageContainer>
        <div className="app-content-container py-3 md:py-4 lg:py-6 max-w-[1400px] mx-auto px-4">
          <Breadcrumbs />
          {/* Header with Create Button */}
        <div className="mb-4 md:mb-6">
          <div className="flex items-start justify-between gap-4 mb-3 md:mb-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1.5 md:mb-2">
                <h1 className="text-xl md:text-2xl lg:text-3xl font-bold text-gray-900 flex items-center gap-2">
                  <span className="text-2xl md:text-3xl">📚</span>
                  My Exams
                </h1>
                <HowToButton pageId="exam" size="md" />
              </div>
              <p className="text-xs md:text-sm text-gray-600 leading-relaxed">
                Track your CEFR assessment progress and results
              </p>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              disabled={ongoingExams.length >= 5}
              className="flex-shrink-0 inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors shadow-sm min-h-[44px]"
            >
              <span className="text-base">+</span>
              <span className="hidden sm:inline">Create Exam</span>
              <span className="sm:hidden">Create</span>
            </button>
          </div>

          {/* Limit Warning */}
          {ongoingExams.length >= 5 && (
            <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg text-sm text-orange-800">
              ⚠️ You have reached the maximum of 5 ongoing exams. Please complete or delete an exam before creating a new one.
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
            {/* Ongoing Exams Section */}
            <section>
              <h2 className="text-lg md:text-xl font-semibold text-gray-900 mb-3 md:mb-4">
                Ongoing
                {ongoingExams.length > 0 && (
                  <span className="ml-2 text-sm font-normal text-gray-500">
                    ({ongoingExams.length} of 5 max)
                  </span>
                )}
              </h2>
              {ongoingExams.length > 0 ? (
                <div className="grid grid-cols-1 gap-4 md:gap-5">
                  {ongoingExams.map((exam) => (
                    <ExamListItem
                      key={exam.exam_id}
                      exam={exam as unknown as ExamData}
                      onClick={() => {
                        if (exam.status === 'created' || exam.status === 'in_progress') {
                          navigateToExam(exam.exam_id);
                        } else {
                          navigateToExamResults(exam.exam_id);
                        }
                      }}
                    />
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="p-0">
                    <RichEmptyState
                      title={completedExams.length > 0 ? "Ready for Another Exam?" : "Ready for a Full Assessment?"}
                      description={completedExams.length > 0 
                        ? "You don't have any ongoing exams. Start a new one to get your latest CEFR level assessment!"
                        : "Exams test multiple skills in one comprehensive session, giving you an official CEFR level evaluation. Perfect when you want a complete picture of your German proficiency."
                      }
                      actions={[
                        {
                          label: completedExams.length > 0 ? 'Start New Exam' : 'Create Your First Exam',
                          labelShort: 'Create Exam',
                          onClick: () => setShowCreateModal(true),
                          variant: 'default',
                          icon: '📝'
                        }
                      ]}
                      tips={completedExams.length > 0 ? [
                        '� Full exam tests all skills together'
                      ] : [
                        '� Comprehensive multi-skill assessment',
                        '🎯 Tests Reading, Writing, Grammar, and Hearing together',
                        '📊 Get your official CEFR level (A1-C2)',
                        '⏱️ Takes 45-60 minutes • Set aside enough time',
                        '🎓 Results comparable to official Goethe exams',
                        '💡 New to platform? Try Practice mode first - many are FREE or very affordable'
                      ]}
                    />
                  </CardContent>
                </Card>
              )}
            </section>

            {/* Completed Exams Section */}
            <section>
              <h2 className="text-lg md:text-xl font-semibold text-gray-900 mb-3 md:mb-4">
                Completed
              </h2>
              {completedExams.length > 0 ? (
                <>
                  <div className="grid grid-cols-1 gap-4 md:gap-5">
                    {completedExams.map((exam) => (
                      <ExamListItem
                        key={exam.exam_id}
                        exam={exam as unknown as ExamData}
                        onClick={() => navigateToExamResults(exam.exam_id)}
                      />
                    ))}
                  </div>
                  
                  {/* Show More button if there are more completed exams */}
                  {examData.exams && examData.exams.filter(e => e.status === 'completed' || e.status === 'analyzed').length > 10 && (
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
                      title="Your Exam Results Will Appear Here"
                      description="Once you complete an exam, you'll see your comprehensive CEFR assessment, detailed scoring across all skills, and personalized recommendations."
                      actions={[
                        {
                          label: 'Start New Exam',
                          labelShort: 'New Exam',
                          onClick: () => setShowCreateModal(true),
                          variant: 'default',
                          icon: '🚀'
                        }
                      ]}
                      tips={[
                        '📊 See your overall CEFR level (A1, A2, B1, B2, C1, C2)',
                        '🎯 View detailed scores for each skill separately',
                        '📈 Compare your performance with Goethe standards',
                        '💡 Get comprehensive improvement recommendations',
                        '🎓 Results are official and shareable',
                        '⏱️ Analysis takes ~60 seconds for complete exams'
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
                  Track your exam performance, view trends, and get insights similar to your dashboard - all in one place.
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

      {/* Create Exam Modal */}
      <CreateExamModal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          setPrefilledLevel(undefined);
        }}
        onCreate={handleCreateExam}
        isLoading={examData.isLoading}
        ongoingExamsCount={ongoingExams.length}
        currentLevel={prefilledLevel || currentLevel}
        preferredLanguage={preferredLanguage || undefined}
        examTemplates={examData.examTemplates}
        onLevelChange={handleLevelChange}
      />
    </PageContainer>
  );
};

