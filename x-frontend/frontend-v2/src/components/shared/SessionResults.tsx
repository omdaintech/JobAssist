import { PageContainer } from '@/components/layout/PageContainer';
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, FeedbackCard, FilterButtons, LoadingSpinner, ProgressRing, HowToButton, ScoreBar, AudioPlayer } from '@/components/ui';
import { SessionResultsHero } from './SessionResultsHero';
import { PracticeResultsHero } from './PracticeResultsHero';
import { CefrLevelIndicator } from './CefrLevelIndicator';
import { getActivityName } from '@/constants/activity-types';
import { cn } from '@/lib/utils';
import { renderTextOrBullets } from '@/utils/render-helpers';
import { normalizeScore, formatScorePercentage } from '@/utils/chartUtils';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';
import React, { useState, useEffect } from 'react';
import { useTeacherName } from '@/hooks/useTeacherName';

// Unified session data
export interface SessionResultData {
  sessionId: string;
  sessionName: string;
  sessionType: 'practice' | 'exam';
  level: string;
  status: 'completed' | 'analyzed';
  createdAt: string;
  completedAt?: string;
  analyzedAt?: string;
  durationMinutes?: number; // Duration for completed/analyzed sessions
  language?: {
    name: string;
    flagEmoji?: string;
  };
  template?: {
    reading: number;
    writing: number;
    grammar: number;
  };
  progress?: {
    totalQuestions: number;
    completedQuestions: number;
    activityBreakdown?: {
      [key: string]: number;
    };
  };
  overallScore?: number; // Overall score from analysis (0-10 scale)
  consecutiveHighScores?: number; // Added for streak calculation
}

// Unified answer data
export interface SessionAnswer {
  questionId: string;
  questionNumber: number;
  activityType: string;
  userAnswer: string;
  answeredAt: string;
  userAudioUrl?: string; // Speaking: user's recorded audio
  userAudioTranscript?: string; // Speaking: transcription of user's audio
  userAudioMeta?: {
    duration_seconds?: number;
    word_count?: number;
    speaking_rate_wpm?: number;
  };
  questionData: {
    text?: string;
    question?: string;
    prompt?: string;
    instruction?: string;
    grammarTopic?: string;
    options?: string[];
    tip?: string;
    explanation?: string;
    example?: string;
    topic?: string;
    taskType?: string;
    requirements?: string;
    minimumWords?: number;
    writingFormat?: string;
    context?: string;
    questions?: string[];
    expectedLength?: string;
    correctAnswer?: string;
    correctAnswerReason?: string;
    audioUrl?: string; // For hearing/speaking question audio
    transcript?: string; // For hearing/speaking question transcript
  };
  feedbackData?: {
    quality?: string;
    topic?: string;
    correctAnswer?: string;
    explanation?: string;
    errorPattern?: string;
    score?: number;
    focusArea?: string;
    // Activity-specific fields
    wordCount?: number;
    strengths?: string;
    suggestions?: string;
    correctedVersion?: string;
    grammarNotes?: string;
    grammarLearning?: string;
    correctAnswerReason?: string;
    feedback?: string;
    sentenceCount?: number;
    correctSentences?: string;
    corrections?: string;
    grammarAnalysis?: string;
    pronunciationTips?: string;
    grammarSuggestions?: string;
    vocabularySuggestions?: string;
  };
}

// Section summary data
export interface SectionSummary {
  [activityType: string]: {
    quality?: string;
    score?: number;  // LLM-provided score (0-10 scale)
    strengths?: string | string[];  // Can be string or array
    improvements?: string | string[];  // Can be string or array
    topic?: string;
    grammarTopic?: string;
    correctAnswer?: string;
    explanation?: string | string[];  // Can be string or array
    errorPattern?: string | string[];
    error_pattern?: string[]; // API returns array in snake_case
    focusArea?: string | string[];  // Can be string or array
    focus?: string[];        // API returns array (legacy)
    focus_areas?: string[];  // API returns array (standardized)
    error_patterns?: string[]; // API returns array (standardized)  
    parsing_success?: boolean;
  };
}

// Analysis configuration
export interface AnalysisConfig {
  canAnalyze: boolean;
  isAnalyzing: boolean;
  analysisProgress?: number;
  currentStep?: number;
  totalSteps?: number;
  onStartAnalysis?: () => Promise<void>;
}

// Session actions
export interface SessionResultActions {
  onStartAnalysis?: () => Promise<void>;
  onBackToList?: () => void;  // Optional for public view
  onShare?: () => void;  // Share button callback
  onDelete?: () => Promise<void>;  // Delete session (shown in header)
}

const ACTIVITY_KEYS = ['reading', 'writing', 'grammar', 'hearing', 'speaking'] as const;
type ActivityKey = typeof ACTIVITY_KEYS[number];

const clampScoreToScale = (score?: number | null): number | undefined => {
  if (score === null || score === undefined) {
    return undefined;
  }

  const numeric = typeof score === 'number' ? score : Number(score);
  if (!Number.isFinite(numeric)) {
    return undefined;
  }

  const clamped = Math.min(Math.max(numeric, 0), 10);
  return Math.round(clamped * 10) / 10;
};

type ReadinessBand = {
  label: string;
  pill: string;
  tagline: string;
};

type SkillSummary = {
  key: ActivityKey;
  label: string;
  score?: number;
  answerCount: number;
};

const getReadinessBand = (percent: number | null): ReadinessBand => {
  if (percent === null) {
    return {
      label: 'Analysis Pending',
      pill: 'Analysis Pending',
      tagline: 'Start the AI review to unlock your personalized report.',
    };
  }

  if (percent >= 81) {
    return {
      label: 'Confident',
      pill: 'Confident · keep sharpening the final details',
      tagline: 'You’re exam ready—maintain this momentum with light review.',
    };
  }

  if (percent >= 61) {
    return {
      label: 'On Track',
      pill: 'On Track · one more focused sprint to level up',
      tagline: 'You’re close—push the lowest skill to tap into the next band.',
    };
  }

  if (percent >= 51) {
    return {
      label: 'Stabilising',
      pill: 'Stabilising · consistency will lift the overall score',
      tagline: 'Steady improvement underway—lock in habits to cross 60%.',
    };
  }

  return {
    label: 'Needs Support',
    pill: 'Needs Support · steady reps now rocket the score up',
    tagline: 'Target the lowest skill next to move above the recovery line.',
  };
};

interface SessionResultsProps {
  sessionData: SessionResultData;
  answers: SessionAnswer[];
  sectionSummaries?: SectionSummary;
  analysisConfig?: AnalysisConfig;
  actions: SessionResultActions;
  isLoading?: boolean;
  error?: string | null;
  className?: string;
  isPublicView?: boolean;  // Flag for public shared view
  showShareButton?: boolean;  // Show share button
  analysisError?: string | null;
  onDismissAnalysisError?: () => void;
}

export const SessionResults: React.FC<SessionResultsProps> = ({
  sessionData,
  answers,
  sectionSummaries = {},
  analysisConfig,
  actions,
  isLoading = false,
  error = null,
  className = '',
  isPublicView = false,
  showShareButton = false,
  analysisError = null,
  onDismissAnalysisError,
}) => {
  // Hooks for navigation and credit info
  const { remainingUsage } = useAuth();
  const navigate = useNavigate();
  const { teacherName } = useTeacherName();

  // Get the first available activity type from answers
  const getFirstAvailableActivity = (): ActivityKey => {
    for (const type of ACTIVITY_KEYS) {
      if (answers.some(answer => answer.activityType === type)) {
        return type;
      }
    }
    return 'reading';
  };

  const [selectedActivity, setSelectedActivity] = useState<ActivityKey>(getFirstAvailableActivity());
  const [expandedAnswers, setExpandedAnswers] = useState<{ [key: string]: boolean }>({});

  // Check if a summary has meaningful content beyond just the score
  const hasMeaningfulSummary = (summary: any): boolean => {
    if (!summary) return false;
    return !!(summary.quality || summary.strengths || summary.improvements || 
              summary.error_patterns || summary.focus_areas || summary.focus);
  };

  // Initialize answers expanded state - expand all if less than 3 questions, otherwise collapse
  useEffect(() => {
    const totalQuestions = getTotalQuestions();
    const shouldExpandAll = totalQuestions < 3;
    
    const initialExpandedState: { [key: string]: boolean } = {};
    answers.forEach(answer => {
      initialExpandedState[answer.questionId] = shouldExpandAll;
    });
    setExpandedAnswers(initialExpandedState);
  }, [answers]);

  // Helper functions
  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTotalQuestions = (): number => {
    if (sessionData.progress?.totalQuestions) {
      return sessionData.progress.totalQuestions;
    }
    if (sessionData.template) {
      return sessionData.template.reading + sessionData.template.writing + sessionData.template.grammar;
    }
    return answers.length;
  };

  const getScoreDisplay = (score?: number | null, options: { decimals?: boolean } = {}) => {
    if (score === null || score === undefined || Number.isNaN(score)) {
      return '?/10';
    }

    const value = options.decimals ? Number(score.toFixed(1)) : score;
    const formatted = Number.isInteger(value) ? value.toString() : value.toFixed(1);
    return `${formatted}/10`;
  };

  const getScorePercentage = (score?: number | null): number => {
    if (score === null || score === undefined || Number.isNaN(score)) {
      return 0;
    }

    const clamped = Math.min(Math.max(score, 0), 10);
    return clamped * 10;
  };

  const getScoreColor = (score?: number | null): string => {
    if (score === null || score === undefined || Number.isNaN(score)) {
      return '#9ca3af'; // gray-400
    }

    const clamped = Math.min(Math.max(score, 0), 10);
    
    // Red → Orange → Yellow → Light Green → Green
    if (clamped >= 8) return '#10b981'; // green-500 (Excellent)
    if (clamped >= 6) return '#22c55e'; // green-400 (Good)
    if (clamped >= 5) return '#84cc16'; // lime-500 (Fair+)
    if (clamped >= 4) return '#eab308'; // yellow-500 (Fair)
    if (clamped >= 3) return '#f97316'; // orange-500 (Needs work)
    return '#ef4444'; // red-500 (Needs support)
  };

  const formatDurationMinutes = (minutes: number): string => {
    if (minutes <= 0) {
      return '< 1 min';
    }

    const totalMinutes = Math.round(minutes);

    if (totalMinutes < 1) {
      return '< 1 min';
    }

    if (totalMinutes < 60) {
      return `≈ ${totalMinutes} min`;
    }

    const hours = Math.floor(totalMinutes / 60);
    const remainingMinutes = totalMinutes % 60;
    const hourLabel = `${hours} hr${hours > 1 ? 's' : ''}`;

    if (remainingMinutes === 0) {
      return `≈ ${hourLabel}`;
    }

    return `≈ ${hourLabel} ${remainingMinutes} min`;
  };

  const getSessionDuration = (): string => {
    const deriveDurationMinutes = (): number | null => {
      if (typeof sessionData.durationMinutes === 'number') {
        return sessionData.durationMinutes;
      }

      if (!sessionData.completedAt || !sessionData.createdAt) return null;

      const start = new Date(sessionData.createdAt).getTime();
      const end = new Date(sessionData.completedAt).getTime();

      if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
        return null;
      }

      return (end - start) / (1000 * 60);
    };

    const minutes = deriveDurationMinutes();
    if (minutes === null) {
      return 'N/A';
    }

    return formatDurationMinutes(minutes);
  };

  const getFilteredAnswers = (): SessionAnswer[] => {
    return answers.filter(answer => answer.activityType === selectedActivity);
  };

  const toggleAnswerExpansion = (answerId: string) => {
    setExpandedAnswers(prev => ({
      ...prev,
      [answerId]: !prev[answerId]
    }));
  };

  const isAnalyzed = (): boolean => {
    return !!sessionData.analyzedAt || sessionData.status === 'analyzed';
  };

  const totalQuestions = getTotalQuestions();

  // Analysis progress component
  const renderAnalysisProgress = () => {
    if (!analysisConfig?.isAnalyzing) return null;

    const progress = analysisConfig.analysisProgress || 0;
    const currentStep = analysisConfig.currentStep || 1;

    return (
      <Card className="border-yellow-200 bg-yellow-50">
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative flex h-16 w-16 items-center justify-center">
              <ProgressRing progress={progress} size="lg" color="orange" showText={false} />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-lg font-bold text-orange-600">{Math.round(progress)}%</div>
                  <div className="text-sm text-orange-500">progress</div>
                </div>
              </div>
            </div>
            <div className="min-w-[12rem] flex-1">
              <h4 className="text-lg font-semibold text-yellow-900">Analysis in progress</h4>
              <p className="mt-1 text-sm text-yellow-800">{teacherName} is analyzing your responses...</p>
              <div className="mt-3 flex items-center gap-2 text-sm font-medium text-yellow-700">
                <div className="h-2 w-2 animate-pulse rounded-full bg-orange-400" />
                <span>Expected completion: ~60 seconds</span>
              </div>
            </div>
          </div>

          <div className="space-y-3 text-sm">
            {[
              'Evaluating language accuracy and fluency',
              'Analyzing grammar and vocabulary usage',
              'Generating personalized improvement suggestions',
              'Preparing detailed feedback report'
            ].map((step, index) => (
              <div
                key={index}
                className={cn(
                  'flex items-center gap-2 rounded-md border border-yellow-200 bg-white/60 px-3 py-2 transition-all duration-500',
                  currentStep >= index + 1 ? 'text-orange-600' : 'text-gray-500'
                )}
              >
                {currentStep >= index + 1 ? (
                  <div className="h-2 w-2 animate-pulse rounded-full bg-orange-500" />
                ) : (
                  <div className="h-2 w-2 rounded-full bg-gray-300" />
                )}
                <span className={currentStep === index + 1 ? 'font-medium' : ''}>{step}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  };

  if (isLoading) {
    return (
      <PageContainer className="py-12">
        <div className={cn('flex min-h-[50vh] items-center justify-center', className)}>
          <div className="text-center">
            <LoadingSpinner />
            <p className="mt-3 text-sm text-gray-600 md:text-base">Loading session results...</p>
          </div>
        </div>
      </PageContainer>
    );
  }

  if (error) {
    return (
      <PageContainer className="py-12">
        <div className={cn('mx-auto max-w-3xl', className)}>
          <Card className="border-red-200">
            <CardContent className="p-6 text-center">
              <h3 className="text-xl font-semibold text-gray-700 mb-2">Oops! Something went wrong</h3>
              <p className="mb-4 text-gray-600">{error}</p>
              <div className="flex justify-center gap-2">
                <Button onClick={actions.onBackToList} variant="outline">
                  ← Back to Sessions
                </Button>
                <Button onClick={() => window.location.reload()} variant="outline">
                  Refresh Page
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer className="py-8">
      <div className={cn('app-page-stack', className)}>
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            {!isPublicView && actions.onBackToList && (
              <Button 
                onClick={actions.onBackToList} 
                variant="outline" 
                size="sm"
                aria-label={`Back to ${sessionData.sessionType === 'practice' ? 'practice sessions' : 'exams'} list`}
              >
                ← Back to {sessionData.sessionType === 'practice' ? 'Practice' : 'Exams'}
              </Button>
            )}
            <div className="hidden md:block">
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-semibold text-[#1F1F1F]">
                  {sessionData.sessionType === 'practice' ? 'Practice' : 'Exam'} Results
                </h1>
                <HowToButton pageId="results" size="sm" />
              </div>
              <p className="text-sm text-[#1F1F1F] leading-relaxed">
                Review your answers and personalized feedback.
              </p>
            </div>
          </div>
          {/* Action buttons */}
          <div className="flex items-center gap-2 flex-shrink-0 ml-auto">
            {!isPublicView && analysisConfig?.canAnalyze && !isAnalyzed() && (
              <Button
                onClick={analysisConfig.onStartAnalysis}
                disabled={analysisConfig.isAnalyzing}
                variant="outline"
                size="sm"
                className="border-blue-600 text-blue-600 hover:bg-blue-50"
                aria-label="Start AI analysis of session"
                aria-busy={analysisConfig.isAnalyzing}
              >
                {analysisConfig.isAnalyzing ? (
                  <>
                    <LoadingSpinner className="mr-2" />
                    Analyzing...
                  </>
                ) : (
                  'Analyze'
                )}
              </Button>
            )}
            {!isPublicView && !isAnalyzed() && actions.onDelete && (
              <Button
                onClick={actions.onDelete}
                variant="outline"
                size="sm"
                className="border-red-300 text-red-600 hover:bg-red-50"
                aria-label="Delete this session"
              >
                🗑️ Delete
              </Button>
            )}
          </div>
        </div>

        {analysisError && (
          <div className="mt-3 w-full">
            <div className="flex flex-col gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 md:flex-row md:items-center md:justify-between">
              <div className="flex items-start gap-2">
                <span className="text-lg">⚠️</span>
                <div>
                  <p className="font-semibold text-red-800">We couldn't start the analysis</p>
                  <p className="text-sm text-red-600 md:text-base">{analysisError}</p>
                </div>
              </div>
              <div className="flex gap-2">
                {analysisConfig?.onStartAnalysis && (
                  <Button
                    onClick={analysisConfig.onStartAnalysis}
                    size="sm"
                    variant="outline"
                    className="border-red-300 text-red-700 hover:bg-red-100"
                  >
                    Try again
                  </Button>
                )}
                {onDismissAnalysisError && (
                  <Button
                    onClick={onDismissAnalysisError}
                    size="sm"
                    variant="ghost"
                    className="text-red-600 hover:bg-red-100"
                  >
                    Dismiss
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Hero Section - Conditional based on session type */}
        {sessionData.sessionType === 'practice' ? (
          <PracticeResultsHero
            sessionName={sessionData.sessionName}
            activityType={selectedActivity}
            level={sessionData.level}
            language={sessionData.language}
            status={sessionData.status}
            skillScore={sessionData.overallScore}
            totalQuestions={totalQuestions}
            durationDisplay={getSessionDuration()}
            completedDate={formatDate(sessionData.completedAt || sessionData.createdAt)}
            onAnalyzeNow={analysisConfig?.canAnalyze && !isAnalyzed() ? analysisConfig.onStartAnalysis : undefined}
            isAnalyzing={analysisConfig?.isAnalyzing}
            onShare={showShareButton && !isPublicView ? actions.onShare : undefined}
            showShareButton={showShareButton}
            isPublicView={isPublicView}
            consecutiveHighScores={sessionData.consecutiveHighScores}
          />
        ) : (
          <SessionResultsHero
            sessionType={sessionData.sessionType}
            sessionName={sessionData.sessionName}
            level={sessionData.level}
            language={sessionData.language}
            status={sessionData.status}
            readinessScore={sessionData.overallScore}
            totalQuestions={totalQuestions}
            durationDisplay={getSessionDuration()}
            completedDate={formatDate(sessionData.completedAt || sessionData.createdAt)}
            onAnalyzeNow={analysisConfig?.canAnalyze && !isAnalyzed() ? analysisConfig.onStartAnalysis : undefined}
            isAnalyzing={analysisConfig?.isAnalyzing}
            onShare={showShareButton && !isPublicView ? actions.onShare : undefined}
            showShareButton={showShareButton}
            isPublicView={isPublicView}
            consecutiveHighScores={sessionData.consecutiveHighScores}
          />
        )}

        {/* CEFR Level Progression - only once a real result exists */}
        {isAnalyzed() && sessionData.level && (
          <CefrLevelIndicator level={sessionData.level} className="mb-6" />
        )}

        {/* Analysis Progress */}
        {renderAnalysisProgress()}

        {/* Skipped Questions Section - Only show if session is completed but not analyzed */}
        {sessionData.status === 'completed' && !isAnalyzed() && (() => {
          const skippedQuestions = answers.filter(a => 
            a.isSkipped || !a.userAnswer || (typeof a.userAnswer === 'string' && a.userAnswer.trim() === '')
          );
          
          if (skippedQuestions.length === 0) return null;
          
          return (
            <Card className="mb-6 border-orange-200 bg-orange-50/50">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2 text-orange-900">
                      <span>⚠️</span>
                      Complete Skipped Questions to Unlock Analysis
                    </CardTitle>
                    <p className="text-sm text-orange-700 mt-1">
                      {skippedQuestions.length} question{skippedQuestions.length > 1 ? 's' : ''} still need{skippedQuestions.length === 1 ? 's' : ''} answers
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {skippedQuestions.map((q) => (
                    <div 
                      key={q.questionId} 
                      className="flex items-center justify-between p-3 bg-white rounded-lg border border-orange-200 hover:border-orange-300 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-orange-100 text-orange-700 font-semibold text-sm">
                          {q.questionNumber}
                        </div>
                        <div>
                          <span className="font-medium text-gray-900">Question {q.questionNumber}</span>
                          <span className="text-gray-600 mx-2">•</span>
                          <span className="text-gray-600">{getActivityName(q.activityType)}</span>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="warning" className="text-xs">Skipped</Badge>
                          </div>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => {
                          // Navigate to session taking view with questionId to load specific question
                          const basePath = sessionData.sessionType === 'practice' 
                            ? `/practice/session/${sessionData.sessionId}`
                            : `/exam/${sessionData.sessionId}`;
                          navigate(`${basePath}?questionId=${q.questionId}`);
                        }}
                        className="bg-orange-600 hover:bg-orange-700 text-white"
                      >
                        Answer Now
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })()}

        {/* Activity Filter Tabs - Always visible for exams */}
        {sessionData.sessionType === 'exam' && answers.length > 0 && (
          <div className="mb-4">
            <FilterButtons
              options={[
                ...(answers.filter(answer => answer.activityType === 'reading').length > 0
                  ? [{
                      value: 'reading',
                      label: isAnalyzed() && sectionSummaries.reading?.score !== undefined
                        ? `Reading ${formatScorePercentage(sectionSummaries.reading.score)}`
                        : `Reading (${answers.filter(answer => answer.activityType === 'reading').length})`,
                      score: normalizeScore(sectionSummaries.reading?.score)
                    }]
                  : []),
                ...(answers.filter(answer => answer.activityType === 'writing').length > 0
                  ? [{
                      value: 'writing',
                      label: isAnalyzed() && sectionSummaries.writing?.score !== undefined
                        ? `Writing ${formatScorePercentage(sectionSummaries.writing.score)}`
                        : `Writing (${answers.filter(answer => answer.activityType === 'writing').length})`,
                      score: normalizeScore(sectionSummaries.writing?.score)
                    }]
                  : []),
                ...(answers.filter(answer => answer.activityType === 'grammar').length > 0
                  ? [{
                      value: 'grammar',
                      label: isAnalyzed() && sectionSummaries.grammar?.score !== undefined
                        ? `Grammar ${formatScorePercentage(sectionSummaries.grammar.score)}`
                        : `Grammar (${answers.filter(answer => answer.activityType === 'grammar').length})`,
                      score: normalizeScore(sectionSummaries.grammar?.score)
                    }]
                  : []),
                ...(answers.filter(answer => answer.activityType === 'hearing').length > 0
                  ? [{
                      value: 'hearing',
                      label: isAnalyzed() && sectionSummaries.hearing?.score !== undefined
                        ? `Listening ${formatScorePercentage(sectionSummaries.hearing.score)}`
                        : `Listening (${answers.filter(answer => answer.activityType === 'hearing').length})`,
                      score: normalizeScore(sectionSummaries.hearing?.score)
                    }]
                  : []),
                ...(answers.filter(answer => answer.activityType === 'speaking').length > 0
                  ? [{
                      value: 'speaking',
                      label: isAnalyzed() && sectionSummaries.speaking?.score !== undefined
                        ? `Speaking ${formatScorePercentage(sectionSummaries.speaking.score)}`
                        : `Speaking (${answers.filter(answer => answer.activityType === 'speaking').length})`,
                      score: normalizeScore(sectionSummaries.speaking?.score)
                    }]
                  : [])
              ]}
              selectedValue={selectedActivity}
              onChange={(value) => setSelectedActivity(value as ActivityKey)}
              className="flex-nowrap"
              variant="score"
            />
          </div>
        )}

        {/* Section Summaries - Mobile-First Responsive */}
        {/* Only show Performance Analysis card if summary has meaningful content beyond just score */}
        {Object.keys(sectionSummaries).length > 0 && 
         sectionSummaries[selectedActivity] && 
         hasMeaningfulSummary(sectionSummaries[selectedActivity]) && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base md:text-lg font-semibold text-[#1F1F1F]">Performance Analysis</CardTitle>
            </CardHeader>
            <CardContent className="p-3 md:p-4">
            <div className="space-y-2 md:space-y-3">
              {(() => {
                const summary = sectionSummaries[selectedActivity];
                const activityName = getActivityName(selectedActivity, true); // Use short name
                return (
                  <>
                    {/* Overall Section Performance - Moved to top */}
                    {summary.score !== undefined && (
                      <div className="bg-white rounded-lg p-3 border border-gray-200 shadow-sm">
                        <p className="text-sm md:text-base font-bold text-gray-900 mb-1.5">Overall {activityName} Analysis</p>
                        <ScoreBar score={summary.score} showLabel />
                        {/* Helper message when only score is available */}
                        {!summary.strengths && !summary.improvements && !summary.focus_areas && !summary.error_patterns && (
                          <p className="text-xs md:text-sm text-gray-600 mt-2 italic">
                            📝 See individual question feedback below for detailed analysis
                          </p>
                        )}
                      </div>
                    )}

                    {/* Strengths */}
                    {summary.strengths && (
                      <div className="bg-white rounded-lg p-3 border border-gray-200 shadow-sm">
                        <p className="text-sm md:text-base font-bold text-gray-900 mb-1">Strengths</p>
                        {renderTextOrBullets(summary.strengths, 'text-gray-800')}
                      </div>
                    )}

                    {/* Improvements */}
                    {summary.improvements && (
                      <div className="bg-white rounded-lg p-3 border border-gray-200 shadow-sm">
                        <p className="text-sm md:text-base font-bold text-gray-900 mb-1">Areas for Improvement</p>
                        {renderTextOrBullets(summary.improvements, 'text-gray-800')}
                      </div>
                    )}

                    {/* Focus Areas */}
                    {(() => {
                      const focusAreas = summary.focus || summary.focus_areas;
                      return focusAreas && Array.isArray(focusAreas) && focusAreas.length > 0 && (
                      <div className="bg-white rounded-lg p-3 border border-gray-200 shadow-sm">
                        <p className="text-sm md:text-base font-bold text-gray-900 mb-1">Key Focus Areas</p>
                        <ul className="space-y-1">
                          {focusAreas.map((focusItem: string, index: number) => (
                            <li
                              key={index}
                              className="flex items-start gap-1.5 text-sm md:text-base text-gray-800"
                            >
                              <span className="text-gray-500 mt-0.5">•</span>
                              <span className="leading-relaxed">{focusItem}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                      );
                    })()}

                    {/* Error Patterns */}
                    {(() => {
                      const errorPatterns = summary.error_pattern || summary.error_patterns;
                      return errorPatterns && Array.isArray(errorPatterns) && errorPatterns.length > 0 && (
                      <div className="bg-white rounded-lg p-3 border border-gray-200 shadow-sm">
                        <p className="text-sm md:text-base font-bold text-gray-900 mb-1.5">Common Error Patterns</p>
                        <ul className="space-y-1">
                          {errorPatterns.map((errorItem: string, index: number) => (
                            <li
                              key={index}
                              className="flex items-start gap-1.5 text-sm md:text-base text-gray-800"
                            >
                              <span className="text-gray-500 mt-0.5">•</span>
                              <span className="leading-relaxed">{errorItem}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                      );
                    })()}
                  </>
                );
              })()}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Questions and Answers */}
      <Card>
        <CardHeader>
          <CardTitle className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 font-semibold text-[#1F1F1F]">
            <span className="text-base md:text-lg lg:text-xl">
              {sessionData.sessionType === 'practice' ? 'Practice' : 'Exam'} Responses ({getFilteredAnswers().length})
            </span>
            {isAnalyzed() && (
              <Badge variant="purple" size="sm" className="self-start sm:self-auto">
                ✓ Analyzed
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Answers List - Accordion Style */}
          {getFilteredAnswers().length === 0 ? (
            <div className="text-center py-6 md:py-8">
              <p className="text-sm md:text-base text-gray-600">
                {answers.length === 0 ? 'No responses found.' : 'No responses found for this activity type.'}
              </p>
            </div>
          ) : (
            <div className="space-y-3 md:space-y-4">
              {getFilteredAnswers().map((answer, index) => (
                <div
                  key={`${answer.questionId}-${answer.questionNumber}-${index}`}
                  className="border border-gray-200 rounded-lg overflow-hidden"
                >
                  {/* Header - Clickable */}
                  <button
                    onClick={() => toggleAnswerExpansion(answer.questionId)}
                    className="w-full p-3 md:p-4 bg-gray-50 hover:bg-gray-100 transition-colors flex items-center justify-between text-left min-h-[44px]"
                  >
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm md:text-base font-medium text-gray-900">
                        Q{answer.questionNumber}: {getActivityName(answer.activityType)}
                      </h4>
                      <p className="text-sm md:text-base text-gray-500 mt-0.5">
                        {formatDate(answer.answeredAt)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {answer.feedbackData?.score !== undefined && (
                        <Badge variant="primary" size="sm">
                          {getScoreDisplay(answer.feedbackData.score)}
                        </Badge>
                      )}
                      <span className="text-gray-400 text-lg">
                        {expandedAnswers[answer.questionId] ? '▲' : '▼'}
                      </span>
                    </div>
                  </button>

                  {/* Expanded Content */}
                  {expandedAnswers[answer.questionId] && (
                    <div className="p-3 md:p-4 bg-white border-t border-gray-200">
                      {/* Single column layout: Question on top, Answer+Feedback below */}
                      <div className="space-y-4">
                        {/* Question section */}
                        <div className="min-w-0">
                          <h5 className="text-sm md:text-base font-medium text-gray-700 mb-2">Question</h5>
                          <div className="bg-gray-50 rounded p-2 md:p-3 text-sm md:text-base break-words">
                              {/* Activity-specific question display */}
                              {answer.activityType === 'reading' && (
                                <div className="space-y-3">
                                  {answer.questionData.text && (
                                    <div>
                                      <p className="mb-2 text-sm font-medium text-gray-600">Reading passage:</p>
                                      <p className="rounded border bg-gray-50 p-2 text-sm text-gray-600">
                                        {answer.questionData.text}
                                      </p>
                                    </div>
                                  )}
                                  <p className="font-medium">{answer.questionData.question}</p>
                                  {answer.questionData.options && (
                                    <div className="mt-3 space-y-1">
                                      <p className="text-sm font-medium text-gray-600">Answer choices:</p>
                                      {answer.questionData.options.map((option, optionIndex) => (
                                        <div
                                          key={optionIndex}
                                          className={cn(
                                            'rounded p-2 text-sm',
                                            answer.userAnswer === option
                                              ? 'bg-blue-100 border border-blue-300 font-medium'
                                              : 'bg-gray-50'
                                          )}
                                        >
                                          <span className="font-medium text-gray-700">
                                            {String.fromCharCode(65 + optionIndex)}.
                                          </span>{' '}
                                          {option}
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )}

                              {answer.activityType === 'writing' && (
                                <div className="space-y-2 md:space-y-3">
                                  {(answer.questionData.topic || answer.questionData.taskType) && (
                                    <div className="flex flex-wrap gap-1.5 md:gap-2">
                                      {answer.questionData.topic && (
                                        <>
                                          <span className="text-sm md:text-base font-semibold text-blue-900">Topic:</span>
                                          <Badge variant="primary" size="sm">
                                            {answer.questionData.topic}
                                          </Badge>
                                        </>
                                      )}
                                      {answer.questionData.taskType && (
                                        <>
                                          <span className="text-sm md:text-base font-semibold text-blue-900">Type:</span>
                                          <Badge variant="primary" size="sm">
                                            {answer.questionData.taskType}
                                          </Badge>
                                        </>
                                      )}
                                    </div>
                                  )}
                                  <div>
                                    <p className="mb-1 text-sm md:text-base font-medium text-gray-600">Task:</p>
                                    <p className="text-sm md:text-base text-gray-700">
                                      {answer.questionData.instruction || answer.questionData.prompt || answer.questionData.question}
                                    </p>
                                  </div>
                                  {answer.questionData.requirements && (
                                    <div>
                                      <p className="mb-1 text-sm md:text-base font-medium text-gray-600">Requirements:</p>
                                      <p className="text-sm md:text-base text-gray-600">{answer.questionData.requirements}</p>
                                    </div>
                                  )}
                                </div>
                              )}

                              {answer.activityType === 'grammar' && (
                                <div className="space-y-2 md:space-y-3">
                                  {answer.questionData.grammarTopic && (
                                    <div>
                                      <p className="mb-1 text-sm md:text-base font-medium text-gray-600">Grammar Topic:</p>
                                      <Badge variant="purple" size="sm">{answer.questionData.grammarTopic}</Badge>
                                    </div>
                                  )}
                                  {answer.questionData.instruction && (
                                    <div>
                                      <p className="mb-1 text-sm md:text-base font-medium text-gray-600">Task:</p>
                                      <p className="text-sm md:text-base text-gray-700">
                                        {answer.questionData.instruction}
                                      </p>
                                    </div>
                                  )}
                                </div>
                              )}

                              {answer.activityType === 'hearing' && (
                                <div className="space-y-3">
                                  {answer.questionData.question && (
                                    <div>
                                      <p className="mb-1 text-sm font-medium text-gray-600">Listening Task:</p>
                                      <p className="rounded border border-purple-200 bg-purple-50 p-3 text-sm font-medium text-gray-900">
                                        {answer.questionData.question}
                                      </p>
                                    </div>
                                  )}
                                  {answer.questionData.options && (
                                    <div className="mt-3 space-y-1">
                                      <p className="text-sm font-medium text-gray-600">Answer choices:</p>
                                      {answer.questionData.options.map((option, optionIndex) => (
                                        <div
                                          key={optionIndex}
                                          className={cn(
                                            'rounded p-2 text-sm',
                                            answer.userAnswer === option
                                              ? 'bg-purple-100 border border-purple-300 font-medium'
                                              : 'bg-gray-50'
                                          )}
                                        >
                                          <span className="font-medium text-gray-700">
                                            {String.fromCharCode(65 + optionIndex)}.
                                          </span>{' '}
                                          {option}
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )}

                              {answer.activityType === 'speaking' && (
                                <div className="space-y-4">
                                  {/* Topic and Type - Match Writing Style */}
                                  {(answer.questionData.topic || answer.questionData.task_type) && (
                                    <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
                                      {answer.questionData.topic && (
                                        <div>
                                          <span className="font-medium text-gray-700">Topic:</span>{' '}
                                          <span className="text-gray-900">{answer.questionData.topic}</span>
                                        </div>
                                      )}
                                      {answer.questionData.task_type && (
                                        <div>
                                          <span className="font-medium text-gray-700">Type:</span>{' '}
                                          <span className="text-gray-900">{answer.questionData.task_type}</span>
                                        </div>
                                      )}
                                    </div>
                                  )}

                                  {/* Task/Question - Clean Display */}
                                  {/* Task/Question text - HIDDEN for speaking (English translation not needed) */}
                                  
                                  {/* Requirements/Questions List */}
                                  {answer.questionData.questions && Array.isArray(answer.questionData.questions) && (
                                    <div>
                                      <p className="text-sm font-medium text-gray-700 mb-2">Requirements:</p>
                                      <p className="text-base text-gray-900 leading-relaxed">
                                        {answer.questionData.questions.join(', ')}
                                      </p>
                                    </div>
                                  )}

                                  {/* Original Audio - Simplified */}
                                  {answer.questionData.audioUrl && (
                                    <div>
                                      <p className="text-sm font-medium text-gray-700 mb-2">🔊 Original Question Audio:</p>
                                      <AudioPlayer
                                        audioUrl={answer.questionData.audioUrl}
                                        transcript={answer.questionData.transcript}
                                        showTranscript={false}
                                      />
                                      {answer.questionData.transcript && (
                                        <details className="mt-2">
                                          <summary className="cursor-pointer text-xs text-gray-500 hover:text-gray-700">
                                            📝 View transcript
                                          </summary>
                                          <div className="mt-2 p-3 bg-gray-50 rounded-lg text-sm text-gray-700 border border-gray-200">
                                            {answer.questionData.transcript}
                                          </div>
                                        </details>
                                      )}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        

                        {/* Answer & feedback section */}
                        <div className="space-y-4 min-w-0">
                          {answer.activityType === 'speaking' && answer.userAudioUrl ? (
                            <div>
                              <h5 className="text-sm md:text-base font-medium text-gray-700 mb-2">Your Response</h5>
                              
                              {/* Audio Player */}
                              <div className="space-y-2 mb-3">
                                <AudioPlayer
                                  audioUrl={answer.userAudioUrl}
                                  showTranscript={false}
                                />
                                
                                {/* Audio metadata - compact */}
                                {answer.userAudioMeta && (
                                  <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                                    {answer.userAudioMeta.duration_seconds && (
                                      <span>⏱️ {answer.userAudioMeta.duration_seconds}s</span>
                                    )}
                                    {answer.userAudioMeta.word_count && (
                                      <span>📝 {answer.userAudioMeta.word_count} words</span>
                                    )}
                                    {answer.userAudioMeta.speaking_rate_wpm && (
                                      <span>🗣️ {Math.round(answer.userAudioMeta.speaking_rate_wpm)} wpm</span>
                                    )}
                                  </div>
                                )}
                              </div>

                              {/* Transcript - Collapsed by default */}
                              {answer.userAudioTranscript && (
                                <details className="group">
                                  <summary className="cursor-pointer text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1.5 py-2">
                                    <svg className="w-4 h-4 transition-transform group-open:rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"/>
                                    </svg>
                                    <span className="font-medium">What you said</span>
                                    <span className="text-gray-400 text-xs">({answer.userAudioMeta?.word_count || 0} words)</span>
                                  </summary>
                                  <div className="mt-2 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                                    <p className="text-sm text-gray-900 leading-relaxed">
                                      {answer.userAudioTranscript}
                                    </p>
                                  </div>
                                </details>
                              )}
                            </div>
                          ) : answer.activityType !== 'reading' && answer.activityType !== 'hearing' && answer.activityType !== 'speaking' && (
                            <div>
                              <h5 className="text-sm md:text-base font-medium text-gray-700 mb-2">Your Answer</h5>
                              <div className="bg-blue-50 rounded p-2 md:p-3 text-sm md:text-base text-gray-700">
                                {answer.userAnswer}
                              </div>
                            </div>
                          )}

                          {(answer.activityType === 'hearing' || answer.activityType === 'reading') && (
                            <div>
                              <h5 className="text-sm md:text-base font-medium text-gray-700 mb-2">Your Selected Answer</h5>
                              <div
                                className={cn(
                                  'rounded p-2 md:p-3 text-sm md:text-base font-medium',
                                  answer.activityType === 'hearing'
                                    ? 'bg-purple-50 text-gray-700'
                                    : 'bg-blue-50 text-blue-800'
                                )}
                              >
                                {answer.userAnswer}
                              </div>
                            </div>
                          )}

                          {/* Show feedback only if session is ANALYZED */}
                          {answer.feedbackData && Object.values(answer.feedbackData).some(value => value !== null && value !== undefined && value !== '') ? (
                            // Has actual feedback data - show it
                            <FeedbackCard
                              feedback={answer.feedbackData}
                              emptyMessage="Feedback data not available for this question."
                            />
                          ) : isAnalyzed() ? (
                            // ANALYZED but no feedback data - show empty state
                            <FeedbackCard
                              feedback={{}}
                              emptyMessage="Feedback data not available for this question."
                            />
                          ) : (
                            // NOT-ANALYZED - Hide answers and explanations to motivate analysis
                            <div className="space-y-2 md:space-y-3">
                              <h5 className="text-sm md:text-base font-medium text-gray-900">
                                {teacherName}'s Assessment
                              </h5>
                              <div className="rounded-lg border-2 border-blue-500 bg-blue-50 p-3 md:p-4">
                                <div className="flex items-start gap-2 md:gap-3">
                                  <span className="text-2xl">🔒</span>
                                  <div className="flex-1">
                                    <p className="text-sm md:text-base font-medium text-blue-900 mb-1.5">
                                      Analysis Required
                                    </p>
                                    <p className="text-sm md:text-base text-blue-700 mb-2">
                                      Click "Analyze Session" above to unlock:
                                    </p>
                                    <ul className="space-y-1 text-sm md:text-base text-blue-700">
                                      <li className="flex items-start gap-1.5">
                                        <span className="text-blue-500 mt-0.5">✓</span>
                                        <span>Correct answers and explanations</span>
                                      </li>
                                      <li className="flex items-start gap-1.5">
                                        <span className="text-blue-500 mt-0.5">✓</span>
                                        <span>Personalized feedback from {teacherName}</span>
                                      </li>
                                      <li className="flex items-start gap-1.5">
                                        <span className="text-blue-500 mt-0.5">✓</span>
                                        <span>Grammar corrections and improvement tips</span>
                                      </li>
                                    </ul>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Feedback Section - Always show after analysis */}
      {isAnalyzed() && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-4 md:p-6">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3 text-center md:text-left">
                <span className="text-3xl md:text-4xl">💬</span>
                <div>
                  <h4 className="font-semibold text-gray-900 text-base md:text-lg">
                    How was your experience?
                  </h4>
                  <p className="text-sm text-gray-600">
                    Your feedback helps us improve {teacherName}'s teaching
                  </p>
                  <p className="text-xs text-blue-700 mt-1 font-medium">
                    🎁 Genuine feedback = free credits (almost immediately!)
                  </p>
                </div>
              </div>
              <Button
                onClick={() => navigate('/feedback')}
                variant="outline"
                className="border-blue-500 text-blue-600 hover:bg-blue-100 w-full md:w-auto"
              >
                📣 Send Feedback
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Continue Practicing Section - Only show if analyzed and has credits */}
      {isAnalyzed() && remainingUsage > 0 && (
        <Card className="border-green-200 bg-gradient-to-br from-green-50 to-blue-50">
          <CardContent className="p-4 md:p-6">
            <div className="flex flex-col md:flex-row items-center gap-4 md:gap-6">
              <div className="text-5xl md:text-6xl">🚀</div>
              <div className="flex-1 text-center md:text-left">
                <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-2">
                  Keep Your Momentum Going!
                </h3>
                <p className="text-sm md:text-base text-gray-700 mb-3">
                  You have <span className="font-bold text-green-600">{remainingUsage} credits</span> remaining. 
                  Practice makes perfect - continue improving your English skills today!
                </p>
                <div className="flex flex-col sm:flex-row gap-2 md:gap-3">
                  <Button
                    onClick={() => navigate(`/exam?create=true&level=${sessionData.level}`)}
                    className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all"
                  >
                    🚀 Start Exam Again
                  </Button>
                  <Button
                    onClick={() => {
                      // Find the most common activity type from this session
                      const activityCounts: Record<string, number> = {};
                      answers.forEach(answer => {
                        activityCounts[answer.activityType] = (activityCounts[answer.activityType] || 0) + 1;
                      });
                      const mostCommonActivity = Object.entries(activityCounts)
                        .sort(([, a], [, b]) => b - a)[0]?.[0] || 'reading';
                      
                      // Navigate with pre-filled modal (same level and activity)
                      navigate(`/practice?create=true&level=${sessionData.level}&activity=${mostCommonActivity}`);
                    }}
                    variant="outline"
                    className="border-blue-200 text-blue-700 hover:bg-blue-50 font-semibold"
                  >
                    🧠 Try Practice Mode
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  </PageContainer>
  );
};
