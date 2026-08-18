import { PageContainer } from '@/components/layout/PageContainer';
import { Badge, Button, Card, CardContent, FeedbackCard, SubmitButton, NextButton, HowToButton } from '@/components/ui';
import { SessionStartButton, SessionContinueButton } from '@/components/shared/session-states';
import { ReadingQuestion, WritingQuestion, GrammarQuestion, HearingQuestion, SpeakingQuestion } from '@/components/shared/questions';
import { getActivityIcon, getActivityName } from '@/constants/activity-types';
import { cn } from '@/lib/utils';
import { api } from '@/services/api';
import { handleSpecificErrors } from '@/utils/frontend-utils';
import { useFullscreen } from '@/hooks/usePWA';
import React, { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';

// Enhanced unified question data structure
export interface QuestionData {
  question_data: {
    activity_type: string;
    question_number: number;
    total_questions: number;
    question_type?: string; // 'mcq', 'true_false', 'fill_in_blank', 'short_answer'
    // Core question fields
    text?: string;
    question?: string;
    options?: string[];
    criteria?: string[];
    expected_length?: string;
    prompt?: string;
    instruction?: string;

    // Writing-specific fields from API
    topic?: string;
    task_type?: string;
    requirements?: string;
    minimum_words?: number;
    writing_format?: string;

    // Grammar-specific fields
    grammar_topic?: string;
    explanation?: string;
    tip?: string;

    // Hearing-specific fields
    audio_url?: string;
    transcript?: string;

    // Speaking-specific fields
    question_metadata?: {
      min_answer_seconds?: number;
      max_answer_seconds?: number;
      suggested_duration?: number;
    };

    // API metadata fields (can be ignored in display)
    difficulty_level?: string;
    language?: string;
    schema_version?: string;
    content_hash?: string;
    date_string?: string;
  };
}

// Enhanced session configuration
export interface SessionConfig {
  sessionType: 'practice' | 'exam';
  showFeedback: boolean; // true for practice, false for exam
  allowResumeFromQuestion: boolean; // true for exam, false for practice
  enableProgressDetails: boolean;
  autoAdvanceOnSubmit: boolean; // true for exam, false for practice
  skipAutoStart?: boolean; // Optional: if true, show start button even for practice
}

// Enhanced progress information
export interface SessionProgress {
  total_questions: number;
  completed_questions: number;
  remaining_questions: number;
  activity_breakdown?: {
    [key: string]: number;
  };
}

// Enhanced feedback data structure
export interface FeedbackData {
  correct?: boolean;
  score?: number;
  quality?: string;
  topic?: string;
  correctAnswer?: string;
  explanation?: string;
  errorPattern?: string;
  focusArea?: string;
  
  // Activity-specific feedback
  wordCount?: number;
  strengths?: string;
  suggestions?: string;
  correctedVersion?: string;
  grammarNotes?: string;
  correctAnswerReason?: string;
  feedback?: string;
  progress?: SessionProgress;
}

// Enhanced session data interface
export interface SessionData {
  sessionId: string;
  sessionName: string;
  sessionType: 'practice' | 'exam';
  level: string;
  status: string;
  createdAt: string;
  completedAt?: string;
  analyzedAt?: string;
  language: {
    name: string;
    code?: string; // Language code for special characters (e.g., 'de', 'fr', 'es')
    flagEmoji?: string;
  };
  template?: {
    reading: number;
    writing: number;
    grammar: number;
    hearing: number;
    speaking?: number;
  };
  progress?: SessionProgress;
  last_answered_question?: {
    question_data: any;
    activity_type: string;
    question_number: number;
    user_answer: string;
  };
}

// Enhanced session actions
export interface SessionActions {
  onSessionComplete: () => void;
  onExitSession: () => void;
}

interface SessionTakingProps {
  config: SessionConfig;
  sessionData?: SessionData; // Optional when sessionId is provided
  sessionId?: string; // Alternative to sessionData - component will load session data
  actions: SessionActions;
  className?: string;
}

export const SessionTaking: React.FC<SessionTakingProps> = ({
  config,
  sessionData: initialSessionData,
  sessionId,
  actions,
  className = ''
}) => {
  // Get query parameters for loading specific questions
  const [searchParams, setSearchParams] = useSearchParams();
  const questionIdParam = searchParams.get('questionId');

  // State
  const [error, setError] = useState<string | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<QuestionData | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState('');
  const [userAnswer, setUserAnswer] = useState('');
  
  // Speaking-specific state - simplified to just store the payload
  const [speakingPayload, setSpeakingPayload] = useState<any>(null);
  const [feedback, setFeedback] = useState<FeedbackData | null>(null);
  const [isLoadingQuestion, setIsLoadingQuestion] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showProgressDetails, setShowProgressDetails] = useState(false);
  const [showStartButton, setShowStartButton] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Enhanced state for self-loading mode
  const [sessionData, setSessionData] = useState<SessionData | null>(initialSessionData || null);
  const [isLoadingSession, setIsLoadingSession] = useState(false);
  const [hasLoadedSession, setHasLoadedSession] = useState(false);
  const [sessionProgress, setSessionProgress] = useState<SessionProgress | null>(initialSessionData?.progress || null);
  
  // Answer validation state
  const [minAnswerWords, setMinAnswerWords] = useState<number | null>(null);
  const [maxAnswerWords, setMaxAnswerWords] = useState<number | null>(null);
  const [requiresLengthValidation, setRequiresLengthValidation] = useState(false);

  // Helper function to convert language code to ISO code for special characters
  const getISOLanguageCode = (languageCode?: string): string | undefined => {
    if (!languageCode) return undefined;
    
    const languageMap: Record<string, string> = {
      // Full language names (what API sends)
      'german': 'de',
      'french': 'fr',
      'spanish': 'es',
      'italian': 'it',
      'portuguese': 'pt',
      'dutch': 'nl',
      'polish': 'pl',
      'russian': 'ru',
      // ISO codes (in case API format changes)
      'de': 'de',
      'fr': 'fr',
      'es': 'es',
      'it': 'it',
      'pt': 'pt',
      'nl': 'nl',
      'pl': 'pl',
      'ru': 'ru',
      // Language IDs (backup - if API sends MongoDB ObjectIds)
      '687b9e32e94239d063f47070': 'de',  // German ID from API
    };
    
    const result = languageMap[languageCode.toLowerCase()];
    
    if (!result) {
      console.warn('⚠️ Unknown language code:', languageCode, '- Special characters will not be available');
    }
    
    return result;
  };

  // PWA and fullscreen functionality
  const { enterFullscreen, exitFullscreen } = useFullscreen();
  const [isInFocusMode, setIsInFocusMode] = useState(false);
  
  // Detect iOS for fullscreen feature
  const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent);
  
  // Elapsed timer for exam mode
  const [elapsedTime, setElapsedTime] = useState<string>('0:00');

  const toggleFocusMode = async () => {
    if (isInFocusMode) {
      await exitFullscreen();
      setIsInFocusMode(false);
    } else {
      await enterFullscreen();
      setIsInFocusMode(true);
    }
  };

  // Elapsed timer effect
  useEffect(() => {
    if (!sessionData?.started_at || sessionData.status === 'completed' || sessionData.status === 'analyzed') {
      return;
    }

    const updateTimer = () => {
      const startTime = new Date(sessionData.started_at!).getTime();
      const now = Date.now();
      const elapsed = Math.floor((now - startTime) / 1000);
      
      const hours = Math.floor(elapsed / 3600);
      const minutes = Math.floor((elapsed % 3600) / 60);
      const seconds = elapsed % 60;
      
      if (hours > 0) {
        setElapsedTime(`${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
      } else {
        setElapsedTime(`${minutes}:${seconds.toString().padStart(2, '0')}`);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [sessionData?.started_at, sessionData?.status]);

  // Utility functions
  const countWords = (text: string): number => {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  };

  const getTotalQuestions = (): number => {
    if (sessionProgress?.total_questions) {
      return sessionProgress.total_questions;
    }
    if (!sessionData?.template) return 0;
    const template = sessionData.template;
    return template.reading + template.writing + template.grammar + (template.hearing || 0) + (template.speaking || 0);
  };

  const getWordValidationStatus = () => {
    const wordCount = countWords(userAnswer);
    
    // If no validation required, just return the word count
    if (!requiresLengthValidation) {
      return { isValid: true, message: '', wordCount };
    }

    // If validation is required, check min/max limits
    if (minAnswerWords && wordCount < minAnswerWords) {
      return {
        isValid: false,
        message: `Too short! Need at least ${minAnswerWords} words (currently ${wordCount})`,
        wordCount
      };
    }
    
    if (maxAnswerWords && wordCount > maxAnswerWords) {
      return {
        isValid: false,
        message: `Too long! Maximum ${maxAnswerWords} words allowed (currently ${wordCount})`,
        wordCount
      };
    }

    return { isValid: true, message: '', wordCount };
  };

  // Computed values
  const currentActivityType = currentQuestion?.question_data?.activity_type || null;
  const wordValidation = getWordValidationStatus();
  
  // For questions with multiple choice options (reading, hearing with options), check selectedAnswer
  // For text-based questions (writing, grammar, hearing without options), check userAnswer
  const hasMultipleChoiceOptions = currentQuestion?.question_data?.options && currentQuestion.question_data.options.length > 0;
  const canSubmitAnswer = currentQuestion?.question_data.activity_type === 'speaking'
    ? speakingPayload !== null
    : hasMultipleChoiceOptions
    ? selectedAnswer !== ''
    : userAnswer.trim().length > 0 && wordValidation.isValid;

  const isNewSession = sessionData?.status === 'created' && sessionProgress?.completed_questions === 0;
  const isSessionInProgress = sessionData?.status === 'in_progress';

  const totalQuestions = getTotalQuestions();
  const completedQuestions = sessionProgress?.completed_questions ?? 0;
  const remainingQuestions = sessionProgress?.remaining_questions ?? Math.max(totalQuestions - completedQuestions, 0);
  const progressPercent = totalQuestions > 0 ? Math.round((completedQuestions / totalQuestions) * 100) : 0;

  const getPromptTitle = (type: string): string => {
    switch (type) {
      case 'writing': return 'Writing Task';
      case 'grammar': return 'Grammar Exercise';
      case 'hearing': return 'Hearing Comprehension';
      default: return 'Question';
    }
  };

  const getPromptText = (): string => {
    // For grammar questions, use instruction field
    if (currentActivityType === 'grammar') {
      return currentQuestion?.question_data?.instruction || '';
    }

    // For other activities, check instruction field first (from API), then fallbacks
    return currentQuestion?.question_data?.instruction ||
      currentQuestion?.question_data?.prompt ||
      currentQuestion?.question_data?.question ||
      currentQuestion?.question_data?.text || '';
  };

  const getPlaceholder = (type: string): string => {
    switch (type) {
      case 'writing': return 'Write your response here...';
      case 'grammar': return 'Enter your answer...';
      case 'hearing': return 'Listen to the audio and type your answer here...';
      default: return 'Enter your answer...';
    }
  };

  // Methods
  const loadSession = useCallback(async () => {
    if (!sessionId || isLoadingSession) return;

    setIsLoadingSession(true);
    setError(null);

    try {
      const statusResponse = await api.sessions.status(sessionId);
      const session = statusResponse.data.session;

      // Transform the API response to match SessionData interface
      const transformedSessionData: SessionData = {
        sessionId: session.exam_id,
        sessionName: session.exam_name,
        sessionType: config.sessionType,
        level: session.level,
        status: session.status,
        createdAt: session.created_at,
        completedAt: session.completed_at,
        analyzedAt: session.analyzed_at,
        language: {
          name: session.language_name || session.language?.name || 'Language',
          code: session.language_code || session.language?.code
        },
        template: session.template,
        progress: session.progress ? {
          total_questions: session.progress.total_questions,
          completed_questions: session.progress.completed_questions,
          remaining_questions: session.progress.remaining_questions,
          activity_breakdown: session.progress.activity_breakdown
        } : undefined,
        last_answered_question: session.last_answered_question
      };

      setSessionData(transformedSessionData);
      setSessionProgress(transformedSessionData.progress || null);

      // Handle completed sessions
      if (session.status === 'completed') {
        actions.onSessionComplete();
        return;
      }

      // For new sessions, show start button
      if (session.status === 'created' && session.progress?.completed_questions === 0) {
        setShowStartButton(true);
        return;
      }

      // Handle sessions with progress - just show continue button
      const hasProgress = (session.progress?.completed_questions || 0) > 0;
      if (hasProgress) {
        setShowStartButton(true);
        return;
      }

      // For in_progress sessions with 0 completed questions (edge case), show start button
      if (session.status === 'in_progress' && session.progress?.completed_questions === 0) {
        setShowStartButton(true);
        return;
      }

      // Default: show start button
      setShowStartButton(true);

    } catch (err: any) {
      console.error('Error loading session:', err);
      setError(handleSpecificErrors(err, config.sessionType));
    } finally {
      setIsLoadingSession(false);
    }
  }, [sessionId, isLoadingSession, config.sessionType, actions]);

  const loadSpecificQuestion = useCallback(async (questionId: string) => {
    if (isLoadingQuestion) return;

    const currentSessionId = sessionId || sessionData?.sessionId;
    if (!currentSessionId) {
      setError('No session ID available');
      return;
    }

    setIsLoadingQuestion(true);
    setError(null);
    
    try {
      const response = await api.sessions.getQuestion(currentSessionId, questionId);

      if (!response.data.success) {
        setError('Failed to load question');
        return;
      }

      // Transform backend response to match frontend interface
      const transformedQuestion = {
        question_data: {
          ...response.data.question_data,
          activity_type: response.data.activity_type,
          question_number: response.data.question_number,
        }
      };

      setCurrentQuestion(transformedQuestion);

      // Update validation settings if available (same as loadNextQuestion)
      if (response.data.validation) {
        setMinAnswerWords(response.data.validation.min_answer_words);
        setMaxAnswerWords(response.data.validation.max_answer_words);
        setRequiresLengthValidation(response.data.validation.requires_length_validation || false);
      } else {
        // Reset validation for non-validated activities
        setMinAnswerWords(null);
        setMaxAnswerWords(null);
        setRequiresLengthValidation(false);
      }

      // Clear previous state
      setSelectedAnswer('');
      setUserAnswer('');
      setFeedback(null);
      setShowStartButton(false);
      setSpeakingPayload(null);

      // Clear the questionId query param after loading
      setSearchParams({});
    } catch (err: any) {
      console.error('Error loading specific question:', err);
      setError(handleSpecificErrors(err, config.sessionType));
    } finally {
      setIsLoadingQuestion(false);
    }
  }, [isLoadingQuestion, sessionId, sessionData?.sessionId, config.sessionType, setSearchParams]);

  const loadNextQuestion = useCallback(async () => {
    if (isLoadingQuestion) return;

    const currentSessionId = sessionId || sessionData?.sessionId;
    if (!currentSessionId) {
      setError('No session ID available');
      return;
    }

    setIsLoadingQuestion(true);
    setError(null);
    
    try {
      const response = await api.sessions.nextQuestion(currentSessionId);

      // Check if session is completed
      if (response.data.completed) {
        actions.onSessionComplete();
        return;
      }

      // Transform backend response to match frontend interface
      const transformedQuestion = {
        question_data: {
          ...response.data.question_data,
          activity_type: response.data.metadata?.activity_type || response.data.question_data.activity_type,
          question_number: response.data.metadata?.question_number || response.data.question_data.question_number,
          total_questions: response.data.metadata?.total_questions || response.data.progress?.total_questions || 10
        }
      };

      setCurrentQuestion(transformedQuestion);

      // Update progress if available - MUST update before rendering
      if (response.data.progress) {
        setSessionProgress(response.data.progress);
      } else {
        console.warn('⚠️ No progress data in next-question response');
      }

      // Update validation settings if available
      if (response.data.validation) {
        setMinAnswerWords(response.data.validation.min_answer_words);
        setMaxAnswerWords(response.data.validation.max_answer_words);
        setRequiresLengthValidation(response.data.validation.requires_length_validation || false);
      } else {
        // Reset validation for non-validated activities
        setMinAnswerWords(null);
        setMaxAnswerWords(null);
        setRequiresLengthValidation(false);
      }

      // Clear previous state
      setSelectedAnswer('');
      setUserAnswer('');
      setFeedback(null);
      setSpeakingPayload(null);
    } catch (err: any) {
      console.error('Error loading next question:', err);

      if (err.response?.status === 400 && err.response?.data?.detail === "No more questions available") {
        actions.onSessionComplete();
        return;
      } else if (err.response?.status === 503 && err.response?.data?.error === 'question_bank_empty') {
        setError('Oops! Cannot generate questions. Please contact support.');
      } else {
        setError(handleSpecificErrors(err, config.sessionType));
      }
    } finally {
      setIsLoadingQuestion(false);
    }
  }, [isLoadingQuestion, sessionId, sessionData?.sessionId, config.sessionType, actions]);

  const selectAnswer = (answer: string) => {
    setSelectedAnswer(answer);
  };

  const handleSpeakingRecording = (payload: any) => {
    setSpeakingPayload(payload);
  };

  const submitAnswer = async () => {
    if (!canSubmitAnswer || !currentQuestion) return;

    const currentSessionId = sessionId || sessionData?.sessionId;
    if (!currentSessionId) {
      setError('No session ID available');
      return;
    }

    setIsSubmitting(true);
    try {
      // For questions with multiple choice options, use selectedAnswer
      // For text-based questions, use userAnswer
      const hasMultipleChoiceOptions = currentQuestion.question_data.options && currentQuestion.question_data.options.length > 0;
      const answer = hasMultipleChoiceOptions ? selectedAnswer : userAnswer;

      // Prepare submission payload
      const submissionPayload: any = {
        activity_type: currentQuestion.question_data.activity_type,
        question_number: currentQuestion.question_data.question_number,
        question_data: currentQuestion.question_data,
        user_answer: answer
      };

      // Handle speaking audio submission - upload to S3
      if (currentQuestion.question_data.activity_type === 'speaking' && speakingPayload) {
        if (speakingPayload.upload_method === 'pending' && speakingPayload.audioBlob) {
          // Upload to S3 on submit
          const AudioUploadService = (await import('@/services/audioUploadService')).default;
          const uploadResult = await AudioUploadService.uploadAudio(
            currentSessionId,
            currentQuestion.question_data.question_id || `q${currentQuestion.question_data.question_number}`,
            speakingPayload.audioBlob,
            speakingPayload.speaking_audio_duration_seconds,
            speakingPayload.speaking_audio_format
          );
          
          // Use S3 upload
          submissionPayload.speaking_audio_s3_key = uploadResult.s3_key;
          submissionPayload.speaking_audio_format = speakingPayload.speaking_audio_format;
          submissionPayload.speaking_audio_duration_seconds = speakingPayload.speaking_audio_duration_seconds;
        } else {
          // Already uploaded
          Object.assign(submissionPayload, speakingPayload);
        }
      }

      const response = await api.sessions.submitAnswer(currentSessionId, submissionPayload);

      // Update progress from the response data
      if (response.data.progress) {
        setSessionProgress(response.data.progress);
      } else {
        console.warn('⚠️ No progress data in submit-answer response');
      }

      // Handle feedback for practice sessions
      if (config.showFeedback && response.data.feedback) {
        setFeedback(response.data.feedback);
      }

      // Check if session is completed based on remaining questions
      if (response.data.progress?.remaining_questions === 0) {
        actions.onSessionComplete();
        return;
      } else if (config.autoAdvanceOnSubmit) {
        // For exams, directly load the next question
        await loadNextQuestion();
      }
    } catch (err: any) {
      console.error('Error submitting answer:', err);
      setError(handleSpecificErrors(err, config.sessionType));
    } finally {
      setIsSubmitting(false);
    }
  };

  const skipQuestion = async () => {
    if (!currentQuestion || isSubmitting) return;

    const currentSessionId = sessionId || sessionData?.sessionId;
    if (!currentSessionId) {
      setError('No session ID available');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await api.sessions.submitAnswer(currentSessionId, {
        activity_type: currentQuestion.question_data.activity_type,
        question_number: currentQuestion.question_data.question_number,
        question_data: currentQuestion.question_data,
        user_answer: "",
        time_spent: 0,
        is_skip: true  // ✅ Explicit skip flag
      });

      // Update progress
      if (response.data.progress) {
        setSessionProgress(response.data.progress);
      }

      // Clear state and load next
      setSelectedAnswer('');
      setUserAnswer('');
      setFeedback(null);
      setSpeakingPayload(null);

      // Check if session is completed
      if (response.data.progress?.remaining_questions === 0) {
        actions.onSessionComplete();
        return;
      } else if (config.autoAdvanceOnSubmit) {
        await loadNextQuestion();
      }
    } catch (err: any) {
      console.error('Error skipping question:', err);
      setError(handleSpecificErrors(err, config.sessionType));
    } finally {
      setIsSubmitting(false);
    }
  };

  const nextQuestion = async () => {
    if (isLoadingQuestion) return;

    // Clear previous state when moving to next question
    setShowStartButton(false);
    setFeedback(null);
    setSpeakingPayload(null);

    await loadNextQuestion();
  };

  const startSession = async () => {
    if (isLoadingQuestion) return;

    setShowStartButton(false);
    await loadNextQuestion();
  };

  const toggleProgressView = () => {
    setShowProgressDetails(!showProgressDetails);
  };

  const handleDeleteSession = async () => {
    const currentSessionId = sessionId || sessionData?.sessionId;
    if (!currentSessionId) {
      setError('No session ID available');
      return;
    }

    // Check if session can be deleted (not analyzed)
    if (sessionData?.analyzedAt) {
      alert('Analyzed sessions are preserved for your records and cannot be deleted.');
      return;
    }

    // Confirmation dialog
    const sessionType = config.sessionType === 'practice' ? 'practice session' : 'exam';
    const sessionName = sessionData?.sessionName || 'session';
    const confirmMessage = `Are you sure you want to delete this ${sessionType}?\n\n"${sessionName}"\n\nThis action cannot be undone.`;
    
    if (!confirm(confirmMessage)) {
      return;
    }

    setIsDeleting(true);
    setError(null);

    try {
      await api.sessions.delete(currentSessionId);
      
      // Success - redirect to practice or exam page
      actions.onExitSession(); // This will navigate back to the list page
    } catch (err: any) {
      console.error('Error deleting session:', err);
      setError(handleSpecificErrors(err, config.sessionType));
    } finally {
      setIsDeleting(false);
    }
  };

  // Effects
  useEffect(() => {
    // Only show start/continue button when no question is loaded
    if (currentQuestion) {
      return;
    }
    
    // For practice sessions: auto-start immediately, skip "Let's Begin" screen (unless skipAutoStart is true)
    if (config.sessionType === 'practice' && !config.skipAutoStart && (isNewSession || isSessionInProgress) && !isLoadingQuestion) {
      const timer = setTimeout(() => {
        startSession();
      }, 100); // Minimal delay to ensure state is ready
      return () => clearTimeout(timer);
    }
    
    // For exam sessions or if skipAutoStart is true: show start button (requires explicit user action)
    if ((config.sessionType === 'exam' || config.skipAutoStart) && (isNewSession || isSessionInProgress)) {
      setShowStartButton(true);
    }
  }, [sessionData, isNewSession, isSessionInProgress, currentQuestion, config.sessionType, config.skipAutoStart, isLoadingQuestion]);

  // Effect for loading session data when sessionId is provided
  useEffect(() => {
    if (sessionId && !hasLoadedSession && !isLoadingSession) {
      setHasLoadedSession(true);
      loadSession();
    }
  }, [sessionId, hasLoadedSession, isLoadingSession, loadSession]);

  // Effect for loading specific question when questionId query param is present
  useEffect(() => {
    if (questionIdParam && !isLoadingQuestion) {
      loadSpecificQuestion(questionIdParam);
    }
  }, [questionIdParam, isLoadingQuestion, loadSpecificQuestion]);

  // Loading state for session data
  if (isLoadingSession || (sessionId && !sessionData)) {
    return (
      <PageContainer className="py-10">
        <div className="flex min-h-[50vh] items-center justify-center">
          <Card className="w-full max-w-lg">
            <CardContent className="p-6 text-center">
              <h3 className="mb-2 text-xl font-semibold text-gray-700">Loading Session</h3>
              <p className="mb-4 text-gray-600">Getting your {config.sessionType} ready...</p>
              <div className="mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-eu-blue"></div>
            </CardContent>
          </Card>
        </div>
      </PageContainer>
    );
  }

  // Error state
  if (error) {
    return (
      <PageContainer className="py-10">
        <div className="flex min-h-[50vh] items-center justify-center">
          <Card className="w-full max-w-lg">
            <CardContent className="p-6 text-center">
              <h3 className="mb-2 text-xl font-semibold text-gray-700">😅 Something's not quite right</h3>
              <p className="mb-4 text-gray-600">{error}</p>
              <div className="flex justify-center gap-2">
                <Button onClick={actions.onExitSession} variant="outline">
                  ← Back
                </Button>
                <Button
                  onClick={() => {
                    setError(null);
                    if (currentQuestion) {
                      setShowStartButton(false);
                    } else {
                      setShowStartButton(true);
                    }
                  }}
                  variant="outline"
                >
                  🔄 Try Again
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </PageContainer>
    );
  }

  // Ensure we have session data before rendering
  if (!sessionData) {
    return (
      <PageContainer className="py-10">
        <div className="flex min-h-[50vh] items-center justify-center">
          <Card className="w-full max-w-lg">
            <CardContent className="p-6 text-center">
              <h3 className="mb-2 text-xl font-semibold text-gray-700">No Session Data</h3>
              <p className="mb-4 text-gray-600">Session data is required to continue.</p>
              <Button onClick={actions.onExitSession} variant="outline">
                ← Back
              </Button>
            </CardContent>
          </Card>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer className={cn('py-4 md:py-6 lg:py-8', className)}>
      <div className="flex flex-col gap-4 2xl:grid 2xl:grid-cols-[1fr_20rem] 2xl:gap-6">
        {/* Main content - always gets priority */}
        <div className="space-y-3 md:space-y-4">
          {/* Session Header - Simplified */}
          <div className="bg-white border border-gray-200 rounded-lg p-3 md:p-4 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 md:gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm md:text-base lg:text-lg font-semibold truncate text-gray-900">
                    {sessionData?.sessionName || 'Loading...'}
                  </h3>
                  <HowToButton pageId="sessionQuestion" size="sm" />
                  <div className="flex gap-1.5">
                    <Badge variant="primary" size="sm">
                        {sessionData?.level || 'Loading...'}
                    </Badge>
                    <Badge variant="secondary" size="sm">
                        {config.sessionType === 'practice' ? '🧠 Practice' : '📝 Exam'}
                    </Badge>
                    </div>
                  </div>
                </div>
              <div className="flex gap-2 flex-shrink-0">
                  {config.sessionType === 'exam' && !isIOS && (
                    <Button 
                      onClick={toggleFocusMode} 
                      variant="outline" 
                      size="sm"
                    className="text-xs md:text-sm"
                    >
                    {isInFocusMode ? 'Exit Focus' : 'Focus Mode'}
                    </Button>
                  )}
                <Button 
                  onClick={handleDeleteSession} 
                  variant="outline" 
                  size="sm" 
                  className="text-xs md:text-sm text-red-600 hover:text-red-700 hover:border-red-600"
                  disabled={isDeleting || isSubmitting}
                >
                  {isDeleting ? '...' : '🗑️ Delete'}
                </Button>
                <Button onClick={actions.onExitSession} variant="outline" size="sm" className="text-xs md:text-sm">
                    ← Exit
                  </Button>
                </div>
              </div>
          </div>

          {/* Progress Bar - Sticky Top */}
          {sessionProgress && currentQuestion && (
            <div className="bg-white border border-gray-200 rounded-lg p-3 md:p-4 shadow-sm">
              <div className="space-y-2 md:space-y-3">
                <div className="flex items-center justify-between text-xs md:text-sm">
                  <span className="font-medium text-gray-700">Session Progress</span>
                  <span className="text-gray-600">
                    {completedQuestions} of {totalQuestions} questions
                  </span>
                </div>
                
                {/* Visual Progress Bar */}
                <div className="relative">
                  <div className="w-full bg-gray-200 rounded-full h-2 md:h-3 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-300 ease-out"
                      style={{ width: `${Math.min(progressPercent, 100)}%` }}
                    >
                      <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
                    </div>
                  </div>
                </div>
                
                {/* Time Info */}
                <div className="space-y-1.5">
                  {config.sessionType === 'exam' && sessionData?.started_at && (
                    <div className="flex items-center gap-2 text-xs md:text-sm font-medium text-blue-600">
                      <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>Time Elapsed: {elapsedTime}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between text-xs md:text-sm text-gray-500">
                    <span>~2-3 min per question</span>
                    <span>~{Math.ceil(Math.max(0, remainingQuestions) * 2.5)} mins remaining</span>
                  </div>
                </div>

                {/* Quick Stats */}
                <div className="flex gap-2 md:gap-3 pt-2 border-t border-gray-100">
                  <div className="flex-1 bg-green-50 rounded p-2 text-center">
                    <p className="text-lg md:text-xl font-bold text-green-600">{completedQuestions}</p>
                    <p className="text-xs md:text-sm text-green-700">Completed</p>
                  </div>
                  <div className="flex-1 bg-blue-50 rounded p-2 text-center">
                    <p className="text-lg md:text-xl font-bold text-blue-600">{remainingQuestions}</p>
                    <p className="text-xs md:text-sm text-blue-700">Remaining</p>
                  </div>
                  <div className="flex-1 bg-purple-50 rounded p-2 text-center">
                    <p className="text-lg md:text-xl font-bold text-purple-600">{totalQuestions}</p>
                    <p className="text-xs md:text-sm text-purple-700">Total</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-3 md:space-y-4">
            {/* Start/Continue Section */}
            {showStartButton && !isLoadingQuestion && (
              <Card>
                <CardContent className="p-0">
            {isNewSession ? (
              <SessionStartButton
                isLoading={isLoadingQuestion}
                  onClick={startSession}
                totalQuestions={getTotalQuestions()}
                sessionType={config.sessionType}
              />
            ) : (
              <SessionContinueButton
                isLoading={isLoadingQuestion}
                  onClick={nextQuestion}
                sessionType={config.sessionType}
                completedQuestions={sessionProgress?.completed_questions || 0}
                totalQuestions={getTotalQuestions()}
                variant="with-progress"
              />
            )}
          </CardContent>
        </Card>
      )}

      {/* Question Section */}
      {currentQuestion && !isLoadingQuestion && (
        <Card>
          <CardContent className="p-3 md:p-4 lg:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4 md:mb-6">
              <h4 className="text-sm md:text-base lg:text-lg font-semibold text-gray-900">
                {getActivityName(currentActivityType || '')}
              </h4>
              <div className="text-xs md:text-sm text-gray-600">
                Question {currentQuestion.question_data.question_number || 1} of {currentQuestion.question_data.total_questions || 1}
              </div>
            </div>

            {/* Question Content - Using New Question Components */}
            <div className="space-y-3 md:space-y-4">
              {currentActivityType === 'reading' ? (
                <ReadingQuestion
                  questionData={{
                    text: currentQuestion.question_data.text,
                    question: currentQuestion.question_data.question,
                    options: currentQuestion.question_data.options,
                    topic: currentQuestion.question_data.topic,
                    question_type: currentQuestion.question_data.question_type,
                  }}
                  selectedAnswer={selectedAnswer}
                  onSelectAnswer={selectAnswer}
                />
              ) : currentActivityType === 'hearing' ? (
                <HearingQuestion
                  questionData={{
                    audio_url: currentQuestion.question_data.audio_url,
                    transcript: currentQuestion.question_data.transcript,
                    question: currentQuestion.question_data.question,
                    options: currentQuestion.question_data.options,
                    question_type: currentQuestion.question_data.question_type,
                  }}
                  selectedAnswer={selectedAnswer}
                  userAnswer={userAnswer}
                  onSelectAnswer={selectAnswer}
                  onAnswerChange={setUserAnswer}
                  sessionType={config.sessionType}
                  languageCode={getISOLanguageCode(sessionData?.language?.code)}
                />
              ) : currentActivityType === 'grammar' ? (
                <GrammarQuestion
                  questionData={{
                    grammar_topic: currentQuestion.question_data.grammar_topic,
                    explanation: currentQuestion.question_data.explanation,
                    instruction: currentQuestion.question_data.instruction,
                    prompt: currentQuestion.question_data.prompt,
                    question: currentQuestion.question_data.question,
                    tip: currentQuestion.question_data.tip,
                  }}
                  userAnswer={userAnswer}
                  onAnswerChange={setUserAnswer}
                  wordCount={wordValidation.wordCount}
                  wordValidation={requiresLengthValidation ? wordValidation : undefined}
                  minWords={minAnswerWords ?? undefined}
                  maxWords={maxAnswerWords ?? undefined}
                  languageCode={getISOLanguageCode(sessionData?.language?.code)}
                />
              ) : currentActivityType === 'writing' ? (
                <WritingQuestion
                  questionData={{
                    topic: currentQuestion.question_data.topic,
                    task_type: currentQuestion.question_data.task_type,
                    instruction: currentQuestion.question_data.instruction,
                    prompt: currentQuestion.question_data.prompt,
                    question: currentQuestion.question_data.question,
                    requirements: currentQuestion.question_data.requirements,
                    minimum_words: currentQuestion.question_data.minimum_words,
                    writing_format: currentQuestion.question_data.writing_format,
                  }}
                  userAnswer={userAnswer}
                  onAnswerChange={setUserAnswer}
                  wordCount={wordValidation.wordCount}
                  wordValidation={requiresLengthValidation ? wordValidation : undefined}
                  minWords={minAnswerWords ?? undefined}
                  maxWords={maxAnswerWords ?? undefined}
                  languageCode={getISOLanguageCode(sessionData?.language?.code)}
                />
              ) : currentActivityType === 'speaking' ? (
                <SpeakingQuestion
                  questionData={{
                    audio_url: currentQuestion.question_data.audio_url,
                    transcript: currentQuestion.question_data.transcript,
                    question: currentQuestion.question_data.question,
                    question_metadata: currentQuestion.question_data.question_metadata,
                  }}
                  sessionId={sessionId || sessionData?.sessionId}
                  questionId={currentQuestion.question_data.question_id || `q${currentQuestion.question_data.question_number}`}
                  onRecordingComplete={handleSpeakingRecording}
                  sessionType={config.sessionType}
                  disabled={isSubmitting}
                />
              ) : null}

              {/* Feedback Section (for practice sessions) */}
              {config.showFeedback && feedback && (
                <FeedbackCard feedback={feedback} />
              )}

              {/* Submit/Next Button with Skip Option */}
              <div className="flex flex-col sm:flex-row gap-3 justify-center items-center pt-2">
              {!feedback || !config.showFeedback ? (
                  <>
                    <Button
                      variant="outline"
                      onClick={skipQuestion}
                      disabled={isSubmitting || isLoadingQuestion}
                      className="border-gray-300 text-gray-700 hover:bg-gray-50 px-4 md:px-6 order-2 sm:order-1"
                    >
                      <span className="mr-1">⏭</span>
                      Skip for Now
                    </Button>
                    <SubmitButton
                      onClick={submitAnswer}
                      disabled={!canSubmitAnswer || isSubmitting}
                      isSubmitting={isSubmitting}
                      className="bg-eu-blue hover:bg-eu-blue/90 text-white px-6 md:px-8 order-1 sm:order-2"
                    >
                      Submit My Answer ✓
                    </SubmitButton>
                  </>
                ) : (
                  <NextButton
                    onClick={nextQuestion}
                    remainingQuestions={sessionProgress?.remaining_questions}
                    sessionType={config.sessionType}
                    className="bg-eu-blue hover:bg-eu-blue/90 text-white px-6 md:px-8"
                  />
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Loading Next Question */}
      {isLoadingQuestion && (
        <div className="flex items-center justify-center p-8">
          <div className="text-center">
            <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-b-2 border-eu-blue"></div>
            <p className="text-gray-600">Loading next question...</p>
          </div>
        </div>
      )}
    </div>
          </div>
        
        {/* Sidebar - hidden until 2xl, then sticky */}
        <aside className="hidden 2xl:block space-y-3 sticky top-24 self-start">
          {sessionProgress && (
            <Card className="shadow-sm">
              <CardContent className="space-y-3 md:space-y-4 p-3 md:p-4">
                <div>
                  <h4 className="text-xs md:text-sm font-semibold uppercase tracking-wide text-gray-700">Progress Overview</h4>
                  <p className="text-xs md:text-sm text-gray-500">Stay on track as you move through each activity.</p>
                </div>
                <div className="space-y-2 text-xs md:text-sm text-gray-600">
                  <div className="flex items-center justify-between">
                    <span>Completed</span>
                    <span className="font-semibold text-gray-900">{completedQuestions} / {totalQuestions}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Remaining</span>
                    <span className="font-semibold text-gray-900">{remainingQuestions}</span>
                  </div>
                </div>
                <div className="bg-gray-200 h-2 rounded-full">
                  <div
                    className="h-2 rounded-full bg-eu-blue transition-all duration-300"
                    style={{ width: `${Math.min(progressPercent, 100)}%` }}
                  ></div>
                </div>
                {config.enableProgressDetails && (
                  <Button
                    onClick={toggleProgressView}
                    variant="outline"
                    size="sm"
                    className="w-full text-xs"
                  >
                    {showProgressDetails ? 'Hide breakdown' : 'Show breakdown'}
                  </Button>
                )}
              </CardContent>
            </Card>
          )}

          {sessionProgress && showProgressDetails && (
            <Card>
              <CardContent className="p-3 md:p-4">
                <h4 className="mb-3 md:mb-4 text-xs md:text-sm font-semibold text-gray-900">Activity Breakdown</h4>
                {sessionProgress.activity_breakdown ? (
                  <div className="grid grid-cols-1 gap-3">
                    {Object.entries(sessionProgress.activity_breakdown).map(([type, completed]) => (
                      <div
                        key={type}
                        className={cn(
                          "rounded-lg border p-2 md:p-3",
                          currentActivityType === type ? 'border-eu-blue bg-eu-blue/5' : 'border-gray-200'
                        )}
                      >
                        <div className="mb-2 flex items-center gap-2">
                          <span className="text-base md:text-lg">{getActivityIcon(type)}</span>
                          <span className="text-xs md:text-sm font-medium text-gray-900">
                            {getActivityName(type)}
                          </span>
                        </div>
                        <p className="mb-2 text-xs md:text-sm text-gray-600">{completed} completed</p>
                        <div className="h-1.5 w-full rounded-full bg-gray-200">
                          <div
                            className="h-1.5 rounded-full bg-eu-blue transition-all duration-300"
                            style={{ width: `${completed > 0 ? 100 : 0}%` }}
                          ></div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-3 md:py-4 text-center text-gray-500">
                    <p className="text-xs md:text-sm">Progress data loading...</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </aside>
        
        {/* Mobile progress - show at bottom on mobile, hide at 2xl */}
        {sessionProgress && (
          <div className="2xl:hidden">
            <Card className="shadow-sm">
              <CardContent className="p-3">
                <div className="flex items-center justify-between text-xs md:text-sm">
                  <span className="text-gray-600">Progress</span>
                  <span className="font-semibold text-gray-900">{completedQuestions} / {totalQuestions}</span>
        </div>
                <div className="mt-2 bg-gray-200 h-2 rounded-full">
                  <div
                    className="h-2 rounded-full bg-eu-blue transition-all duration-300"
                    style={{ width: `${Math.min(progressPercent, 100)}%` }}
                  ></div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </PageContainer>
  );
};
