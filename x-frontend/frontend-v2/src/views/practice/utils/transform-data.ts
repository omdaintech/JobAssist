/**
 * Data Transformation Utilities
 * 
 * Pure functions for transforming API responses.
 * Extracted from PracticeView.tsx - keeps exact same logic.
 */

import type { SessionAnswer } from '../types';

/**
 * Transform API response data to match SessionResults component interface
 * 
 * IMPORTANT: This is the exact same logic from PracticeView.tsx lines 137-188
 * No changes made - just extracted for reusability.
 */
export const transformAnswerData = (apiAnswers: any[]): SessionAnswer[] => {
  return apiAnswers.map(answer => ({
    questionId: answer.question_id,
    questionNumber: answer.question_number,
    activityType: answer.activity_type,
    userAnswer: answer.user_answer,
    answeredAt: answer.answered_at,
    userAudioUrl: answer.user_audio_url,
    userAudioTranscript: answer.user_audio_transcript,
    userAudioMeta: answer.user_audio_meta ? {
      duration_seconds: answer.user_audio_meta.duration_seconds || answer.user_audio_meta.validated_duration_seconds,
      word_count: answer.user_audio_meta.word_count,
      speaking_rate_wpm: answer.user_audio_meta.speaking_rate_wpm
    } : undefined,
    questionData: {
      text: answer.question_data?.text,
      question: answer.question_data?.question,
      prompt: answer.question_data?.prompt,
      instruction: answer.question_data?.instruction,
      grammarTopic: answer.question_data?.grammar_topic,
      options: answer.question_data?.options,
      tip: answer.question_data?.tip,
      explanation: answer.question_data?.explanation,
      example: answer.question_data?.example,
      topic: answer.question_data?.topic,
      taskType: answer.question_data?.task_type,
      requirements: answer.question_data?.requirements,
      minimumWords: answer.question_data?.minimum_words,
      writingFormat: answer.question_data?.writing_format,
      context: answer.question_data?.context,
      questions: answer.question_data?.questions,
      expectedLength: answer.question_data?.expected_length,
      correctAnswer: answer.question_data?.correct_answer,
      correctAnswerReason: answer.question_data?.correct_answer_reason,
      audioUrl: answer.question_data?.audio_url,
      transcript: answer.question_data?.transcript
    },
    feedbackData: answer.feedback_data ? {
      quality: answer.feedback_data.quality,
      topic: answer.feedback_data.topic,
      correctAnswer: answer.feedback_data.correct_answer,
      explanation: answer.feedback_data.explanation,
      errorPattern: answer.feedback_data.error_pattern,
      score: answer.feedback_data.score,
      focusArea: answer.feedback_data.focus_area,
      wordCount: answer.feedback_data.word_count,
      strengths: answer.feedback_data.strengths,
      suggestions: answer.feedback_data.suggestions,
      correctedVersion: answer.feedback_data.corrected_version,
      grammarNotes: answer.feedback_data.grammar_notes,
      grammarLearning: answer.feedback_data.grammar_learning,
      correctAnswerReason: answer.feedback_data.correct_answer_reason,
      feedback: answer.feedback_data.feedback,
      sentenceCount: answer.feedback_data.sentence_count,
      correctSentences: answer.feedback_data.correct_sentences,
      corrections: answer.feedback_data.corrections,
      grammarAnalysis: answer.feedback_data.grammar_analysis,
      pronunciationTips: answer.feedback_data.pronunciation_tips,
      grammarSuggestions: answer.feedback_data.grammar_suggestions,
      vocabularySuggestions: answer.feedback_data.vocabulary_suggestions
    } : undefined
  }));
};

/**
 * Get session identifier from PracticeSession
 * Handles both session_id and exam_id fields
 */
export const getSessionIdentifier = (session: { session_id?: string; exam_id?: string }): string | null => {
  return session.session_id || session.exam_id || null;
};

/**
 * Determine initial state based on URL
 * Extracted from PracticeView.tsx lines 18-23
 */
export const getInitialStateFromURL = (sessionId: string | undefined, pathname: string): 'selection' | 'analyzing' | 'completed' => {
  if (!sessionId) return 'selection';
  if (pathname.includes('/analyzing')) return 'analyzing';
  if (pathname.includes('/results')) return 'completed';
  return 'selection'; // Default to selection since active is handled by PracticeTakingView
};

