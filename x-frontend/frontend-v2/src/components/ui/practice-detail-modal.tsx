import { Button, Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import { getActivityIcon, getActivityName } from '@/constants/activity-types';
import { cn } from '@/lib/utils';
import { useTeacherName } from '@/hooks/useTeacherName';
import React from 'react';

// Enhanced practice data interface with all available fields
export interface DetailedPracticeData {
    id: string;
    activity_type: 'reading' | 'writing' | 'grammar' | 'hearing';
    level: 'A1' | 'A2' | 'B1';
    timestamp: string;
    score?: number;
    correct?: boolean;
    user_answer?: string;
    feedback?: string;
    language_id?: string;
    language_name?: string;

    // Question data
    question_data?: {
        text?: string;
        question?: string;
        options?: string[];
        correct_answer?: string;
        correct_answer_reason?: string;
        topic?: string;
        instruction?: string;
        prompt?: string;
        task_type?: string;
        requirements?: string;
        minimum_words?: number;
        writing_format?: string;
        grammar_topic?: string;
        explanation?: string;
        tip?: string;
        context?: string;
        questions?: string[];
        criteria?: string[];
        expected_length?: string;
    };

    // Extended feedback data
    word_count?: number;
    strengths?: string;
    suggestions?: string;
    corrected_version?: string;
    grammar_notes?: string;
    grammar_learning?: string;
}

interface PracticeDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    practice: DetailedPracticeData | null;
    allPractices: DetailedPracticeData[];
    currentIndex: number;
    onNavigate: (direction: 'prev' | 'next') => void;
}

export const PracticeDetailModal: React.FC<PracticeDetailModalProps> = ({
    isOpen,
    onClose,
    practice,
    allPractices,
    currentIndex,
    onNavigate
}) => {
    const { teacherName } = useTeacherName();
    
    if (!isOpen || !practice) return null;

    const formatDate = (timestamp: string): string => {
        const date = new Date(timestamp);
        return date.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getResultDisplay = () => {
        if (practice.score !== undefined && practice.score !== null) {
            return `${Math.round(practice.score)}%`;
        }
        if (practice.correct !== undefined && practice.correct !== null) {
            return practice.correct ? 'Correct ✓' : 'Incorrect ✗';
        }
        return 'N/A';
    };

    const getResultColor = () => {
        if (practice.score !== undefined && practice.score !== null) {
            if (practice.score >= 80) return 'text-green-600';
            if (practice.score >= 60) return 'text-yellow-600';
            return 'text-red-600';
        }
        if (practice.correct !== undefined && practice.correct !== null) {
            return practice.correct ? 'text-green-600' : 'text-red-600';
        }
        return 'text-gray-500';
    };

    const getLevelBadgeColor = () => {
        switch (practice.level) {
            case 'A1': return 'bg-green-100 text-green-800';
            case 'A2': return 'bg-blue-100 text-blue-800';
            case 'B1': return 'bg-purple-100 text-purple-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const canGoBack = currentIndex > 0;
    const canGoForward = currentIndex < allPractices.length - 1;

    const renderQuestionContent = () => {
        const questionData = practice.question_data;
        if (!questionData) return null;

        return (
            <Card className="mb-6">
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                        📝 Question Content
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Reading Questions */}
                    {practice.activity_type === 'reading' && (
                        <>
                            {questionData.text && (
                                <div>
                                    <h4 className="font-semibold text-gray-700 mb-2">📖 Reading Text:</h4>
                                    <div className="bg-gray-50 p-4 rounded-lg border">
                                        <p className="text-gray-800 leading-relaxed">{questionData.text}</p>
                                    </div>
                                </div>
                            )}
                            {questionData.question && (
                                <div>
                                    <h4 className="font-semibold text-gray-700 mb-2">❓ Question:</h4>
                                    <p className="text-gray-800">{questionData.question}</p>
                                </div>
                            )}
                            {questionData.options && (
                                <div>
                                    <h4 className="font-semibold text-gray-700 mb-2">📋 Options:</h4>
                                    <ul className="space-y-2">
                                        {questionData.options.map((option, index) => (
                                            <li key={index} className="flex items-center gap-2">
                                                <span className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center text-sm font-medium">
                                                    {index + 1}
                                                </span>
                                                <span className={cn(
                                                    "text-gray-800",
                                                    practice.user_answer === option && "font-semibold text-blue-600",
                                                    questionData.correct_answer === option && "text-green-600"
                                                )}>
                                                    {option}
                                                    {practice.user_answer === option && " (Your answer)"}
                                                    {questionData.correct_answer === option && " (Correct)"}
                                                </span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </>
                    )}

                    {/* Writing Questions */}
                    {practice.activity_type === 'writing' && (
                        <>
                            {questionData.prompt && (
                                <div>
                                    <h4 className="font-semibold text-gray-700 mb-2">✍️ Writing Prompt:</h4>
                                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                                        <p className="text-gray-800">{questionData.prompt}</p>
                                    </div>
                                </div>
                            )}
                            {questionData.topic && (
                                <div>
                                    <h4 className="font-semibold text-gray-700 mb-2">🎯 Topic:</h4>
                                    <span className="inline-block bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">
                                        {questionData.topic}
                                    </span>
                                </div>
                            )}
                            {questionData.requirements && (
                                <div>
                                    <h4 className="font-semibold text-gray-700 mb-2">📋 Requirements:</h4>
                                    <p className="text-gray-700">{questionData.requirements}</p>
                                </div>
                            )}
                            {questionData.minimum_words && (
                                <div>
                                    <h4 className="font-semibold text-gray-700 mb-2">📏 Minimum Words:</h4>
                                    <span className="text-gray-800">{questionData.minimum_words} words</span>
                                </div>
                            )}
                        </>
                    )}

                    {/* Grammar Questions */}
                    {practice.activity_type === 'grammar' && (
                        <>
                            {questionData.instruction && (
                                <div>
                                    <h4 className="font-semibold text-gray-700 mb-2">📖 Instructions:</h4>
                                    <p className="text-gray-800">{questionData.instruction}</p>
                                </div>
                            )}
                            {questionData.grammar_topic && (
                                <div>
                                    <h4 className="font-semibold text-gray-700 mb-2">🎯 Grammar Topic:</h4>
                                    <span className="inline-block bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm">
                                        {questionData.grammar_topic}
                                    </span>
                                </div>
                            )}
                            {questionData.explanation && (
                                <div>
                                    <h4 className="font-semibold text-gray-700 mb-2">💡 Explanation:</h4>
                                    <p className="text-gray-700">{questionData.explanation}</p>
                                </div>
                            )}
                        </>
                    )}


                </CardContent>
            </Card>
        );
    };

    const renderAnswerAndFeedback = () => {
        return (
            <Card className="mb-6">
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                        💬 Your Answer & Feedback
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* User Answer */}
                    {practice.user_answer && (
                        <div>
                            <h4 className="font-semibold text-gray-700 mb-2">✍️ Your Answer:</h4>
                            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                                <p className="text-gray-800">{practice.user_answer}</p>
                            </div>
                        </div>
                    )}

                    {/* Score/Result */}
                    <div>
                        <h4 className="font-semibold text-gray-700 mb-2">📊 Result:</h4>
                        <span className={cn("text-lg font-semibold", getResultColor())}>
                            {getResultDisplay()}
                        </span>
                        {practice.word_count && (
                            <span className="ml-3 text-gray-600">
                                ({practice.word_count} words)
                            </span>
                        )}
                    </div>

                    {/* Teacher's Feedback */}
                    {practice.feedback && (
                        <div>
                            <h4 className="font-semibold text-gray-700 mb-2">👩‍🏫 {teacherName}'s Feedback:</h4>
                            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                                <p className="text-gray-800 leading-relaxed">{practice.feedback}</p>
                            </div>
                        </div>
                    )}

                    {/* Corrected Version (for writing) */}
                    {practice.corrected_version && (
                        <div>
                            <h4 className="font-semibold text-gray-700 mb-2">✏️ Corrected Version:</h4>
                            <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                                <p className="text-gray-800">{practice.corrected_version}</p>
                            </div>
                        </div>
                    )}

                    {/* Strengths */}
                    {practice.strengths && (
                        <div>
                            <h4 className="font-semibold text-gray-700 mb-2">💪 Strengths:</h4>
                            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                                <p className="text-gray-800">{practice.strengths}</p>
                            </div>
                        </div>
                    )}

                    {/* Suggestions */}
                    {practice.suggestions && (
                        <div>
                            <h4 className="font-semibold text-gray-700 mb-2">💡 Suggestions:</h4>
                            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                                <p className="text-gray-800">{practice.suggestions}</p>
                            </div>
                        </div>
                    )}

                    {/* Grammar Notes */}
                    {practice.grammar_notes && (
                        <div>
                            <h4 className="font-semibold text-gray-700 mb-2">📝 Grammar Notes:</h4>
                            <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                                <p className="text-gray-800">{practice.grammar_notes}</p>
                            </div>
                        </div>
                    )}

                    {/* Grammar Learning */}
                    {practice.grammar_learning && (
                        <div>
                            <h4 className="font-semibold text-gray-700 mb-2">🎓 Grammar Learning:</h4>
                            <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-200">
                                <p className="text-gray-800">{practice.grammar_learning}</p>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        );
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
                {/* Header */}
                <div className="sticky top-0 bg-white border-b border-gray-200 p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <span className="text-2xl">{getActivityIcon(practice.activity_type)}</span>
                            <div>
                                <h2 className="text-xl font-semibold text-gray-900">
                                    {getActivityName(practice.activity_type)} Practice
                                </h2>
                                <div className="flex items-center gap-3 mt-1">
                                    <span className={cn(
                                        "px-2 py-1 rounded-full text-xs font-medium",
                                        getLevelBadgeColor()
                                    )}>
                                        {practice.level}
                                    </span>
                                    {practice.language_name && (
                                        <span className="text-sm text-gray-600">
                                            {practice.language_name}
                                        </span>
                                    )}
                                    <span className="text-sm text-gray-500">
                                        {formatDate(practice.timestamp)}
                                    </span>
                                </div>
                            </div>
                        </div>
                        <Button
                            onClick={onClose}
                            variant="outline"
                            className="text-gray-500 hover:text-gray-700"
                        >
                            ✕
                        </Button>
                    </div>

                    {/* Navigation */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Button
                                onClick={() => onNavigate('prev')}
                                disabled={!canGoBack}
                                variant="outline"
                                size="sm"
                            >
                                ← Previous
                            </Button>
                            <Button
                                onClick={() => onNavigate('next')}
                                disabled={!canGoForward}
                                variant="outline"
                                size="sm"
                            >
                                Next →
                            </Button>
                        </div>
                        <span className="text-sm text-gray-500">
                            {currentIndex + 1} of {allPractices.length}
                        </span>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
                    {renderQuestionContent()}
                    {renderAnswerAndFeedback()}
                </div>
            </div>
        </div>
    );
};
