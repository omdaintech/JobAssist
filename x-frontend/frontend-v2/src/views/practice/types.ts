/**
 * Practice View Type Definitions
 * 
 * Centralized type definitions for practice-related components
 */

import type { PracticeSession, ExamDetail, ExamTemplate } from '@/services/api';

export type PracticeState = 'selection' | 'analyzing' | 'completed';
export type PracticeTab = 'sessions' | 'performance';

export interface SessionAnswer {
  questionId: string;
  questionNumber: number;
  activityType: string;
  userAnswer: string;
  answeredAt: string;
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
    requirements?: string[];
    minimumWords?: number;
    writingFormat?: string;
    context?: string;
    questions?: string[];
    expectedLength?: string;
  };
  feedbackData?: {
    quality?: string;
    topic?: string;
    correctAnswer?: string;
    explanation?: string;
    errorPattern?: string;
    score?: number;
    focusArea?: string;
    wordCount?: number;
    strengths?: string[];
    suggestions?: string[];
    correctedVersion?: string;
    grammarNotes?: string;
    grammarLearning?: string;
    correctAnswerReason?: string;
    feedback?: string;
    sentenceCount?: number;
    correctSentences?: number;
    corrections?: any[];
    grammarAnalysis?: string;
    pronunciationTips?: string[];
    grammarSuggestions?: string[];
    vocabularySuggestions?: string[];
  };
}

export interface SectionSummary {
  [key: string]: any;
}

// Re-export API types for convenience
export type { PracticeSession, ExamDetail, ExamTemplate };

