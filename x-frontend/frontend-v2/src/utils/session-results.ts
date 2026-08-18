import type { SessionResultData, SessionAnswer } from '@/components/shared/SessionResults';
import type { ExamDetail, ExamAnswer } from '@/services/api';

type PublicSession = {
  session_id: string;
  session_name: string;
  session_type: 'practice' | 'exam';
  level: string;
  status: 'completed' | 'analyzed';
  language_id?: string | null;
  language_code?: string | null;
  language_name?: string | null;
  template?: {
    reading?: number;
    writing?: number;
    grammar?: number;
    hearing?: number;
  } | null;
  created_at: string;
  completed_at?: string | null;
  analyzed_at?: string | null;
  overall_score?: number | null;
};

type ApiAnswer = {
  question_id: string;
  question_number: number;
  activity_type: string;
  user_answer: string;
  answered_at: string;
  question_data?: ExamAnswer['question_data'] | null;
  feedback_data?: ExamAnswer['feedback_data'] | {
    feedback?: ExamAnswer['feedback_data'];
  } | null;
};

type LanguageInfo = {
  name: string;
  flagEmoji: string;
};

const normalizeOverallScore = (score?: number | null): number | undefined => {
  if (score === null || score === undefined) {
    return undefined;
  }

  const rawScore = typeof score === 'number' ? score : Number(score);
  if (Number.isNaN(rawScore)) {
    return undefined;
  }

  // Backend uses 0-100 scale, so return as-is
  // Clamp to valid range and round to 1 decimal place
  const clampedScore = Math.max(0, Math.min(100, rawScore));
  const roundedScore = Math.round(clampedScore * 10) / 10;

  return roundedScore;
};

/**
 * Resolve language information from session data
 * Uses language data directly from the session object (from database)
 * No hardcoded language maps - all data is dynamic
 * 
 * @param codeOrId - Language code (legacy) or language_id from database
 * @param name - Language name from database
 * @returns Language info with name and flag emoji
 */
const resolveLanguageInfo = (codeOrId?: string | null, name?: string | null): LanguageInfo => {
  // Use provided language name from session
  if (name) {
    return {
      name: name,
      flagEmoji: '🌐'  // Generic globe - flag_emoji should come from backend in future
    };
  }

  // Fallback for legacy data without language info
  return {
    name: 'Language Practice',
    flagEmoji: '🌐'
  };
};

const normalizeFeedback = (feedbackData?: ApiAnswer['feedback_data']): NonNullable<SessionAnswer['feedbackData']> | undefined => {
  if (!feedbackData) {
    return undefined;
  }

  const data = (feedbackData as { feedback?: ExamAnswer['feedback_data'] }).feedback || (feedbackData as ExamAnswer['feedback_data']);
  if (!data) {
    return undefined;
  }

  return {
    quality: data.quality,
    topic: data.topic,
    correctAnswer: data.correct_answer,
    explanation: data.explanation,
    errorPattern: data.error_pattern,
    score: data.score,
    focusArea: data.focus_area,
    wordCount: data.word_count,
    strengths: data.strengths,
    suggestions: data.suggestions,
    correctedVersion: data.corrected_version,
    grammarNotes: data.grammar_notes,
    grammarLearning: data.grammar_learning,
    correctAnswerReason: data.correct_answer_reason,
    feedback: data.feedback,
    sentenceCount: data.sentence_count,
    correctSentences: data.correct_sentences,
    corrections: data.corrections,
    grammarAnalysis: data.grammar_analysis,
    pronunciationTips: data.pronunciation_tips,
    grammarSuggestions: data.grammar_suggestions,
    vocabularySuggestions: data.vocabulary_suggestions,
  };
};

export const transformExamDetailToSessionData = (
  examDetail: ExamDetail,
): SessionResultData | null => {
  if (!examDetail) {
    return null;
  }

  const languageInfo = resolveLanguageInfo(examDetail.language_code, examDetail.language_name);
  const overallScoreValue = normalizeOverallScore(
    (examDetail as Record<string, unknown>).overall_score as number | undefined,
  );

  return {
    sessionId: examDetail.exam_id,
    sessionName: examDetail.exam_name,
    sessionType: 'exam',
    level: examDetail.level,
    status: examDetail.status as 'completed' | 'analyzed',
    createdAt: examDetail.created_at,
    completedAt: examDetail.completed_at || undefined,
    analyzedAt: examDetail.analyzed_at || undefined,
    durationMinutes: examDetail.duration_minutes,
    language: languageInfo,
    template: examDetail.template,
    progress: examDetail.progress
      ? {
          totalQuestions: examDetail.progress.total_questions,
          completedQuestions: examDetail.progress.completed_questions,
          activityBreakdown: examDetail.progress.activity_breakdown,
        }
      : undefined,
    overallScore: overallScoreValue,
    consecutiveHighScores: examDetail.consecutive_high_scores,
  };
};

export const transformPublicSessionToSessionData = (
  session: PublicSession,
): SessionResultData => {
  const languageInfo = resolveLanguageInfo(session.language_code || session.language_id, session.language_name);

  return {
    sessionId: session.session_id,
    sessionName: session.session_name,
    sessionType: session.session_type,
    level: session.level,
    status: session.status,
    createdAt: session.created_at,
    completedAt: session.completed_at || undefined,
    analyzedAt: session.analyzed_at || undefined,
    language: languageInfo,
    template: session.template || undefined,
    progress: session.template
      ? {
          totalQuestions: Number(session.template.reading || 0) +
            Number(session.template.writing || 0) +
            Number(session.template.grammar || 0) +
            Number(session.template.hearing || 0),
          completedQuestions: Number(session.template.reading || 0) +
            Number(session.template.writing || 0) +
            Number(session.template.grammar || 0) +
            Number(session.template.hearing || 0),
        }
      : undefined,
    overallScore: normalizeOverallScore(session.overall_score),
  };
};

export const transformApiAnswersToSessionAnswers = (
  answers: ApiAnswer[],
): SessionAnswer[] => {
  return answers.map(answer => {
    const questionData = answer.question_data || {};

    return {
      questionId: answer.question_id,
      questionNumber: answer.question_number,
      activityType: answer.activity_type,
      userAnswer: answer.user_answer,
      answeredAt: answer.answered_at,
      questionData: {
        text: questionData?.text ?? undefined,
        question: questionData?.question ?? undefined,
        prompt: questionData?.prompt ?? undefined,
        instruction: questionData?.instruction ?? undefined,
        grammarTopic: questionData?.grammar_topic ?? undefined,
        options: questionData?.options ?? undefined,
        tip: questionData?.tip ?? undefined,
        explanation: questionData?.explanation ?? undefined,
        example: questionData?.example ?? undefined,
        topic: questionData?.topic ?? undefined,
        taskType: questionData?.task_type ?? undefined,
        requirements: questionData?.requirements ?? undefined,
        minimumWords: questionData?.minimum_words ?? undefined,
        writingFormat: questionData?.writing_format ?? undefined,
        context: questionData?.context ?? undefined,
        questions: questionData?.questions ?? undefined,
        expectedLength: questionData?.expected_length ?? undefined,
        correctAnswer: questionData?.correct_answer ?? undefined,
        correctAnswerReason: questionData?.correct_answer_reason ?? undefined,
      },
      feedbackData: normalizeFeedback(answer.feedback_data),
    };
  });
};

export const transformExamAnswersToSessionAnswers = (
  answers: ExamAnswer[],
): SessionAnswer[] => transformApiAnswersToSessionAnswers(answers);

