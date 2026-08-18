import { Card, CardContent, StatusBadge, LevelBadge } from '@/components/ui';
import { ScoreBadge } from '@/components/ui/score-badge';
import { cn } from '@/lib/utils';
import React from 'react';

export interface ExamData {
    exam_id: string;
    exam_name: string;
    level: string;
    status: 'created' | 'in_progress' | 'completed' | 'analyzed';
    created_at: string;
    completed_at?: string;
    analyzed_at?: string;
    language?: {
        id: string;
        name: string;
    };
    template?: {
        reading?: number;
        writing?: number;
        grammar?: number;
    };
    progress?: {
        completed_questions?: number;
        total_questions?: number;
        activity_breakdown?: {
            [key: string]: number;
        };
    };
    summary?: {
        overall_score?: number;
    };
    overall_score?: number;
    score?: number; // Add the actual score field from API
    can_resume?: boolean;
    can_analyze?: boolean;
}

interface ExamListItemProps {
    exam: ExamData;
    className?: string;
    onClick?: () => void;
}

export const ExamListItem: React.FC<ExamListItemProps> = ({
    exam,
    className,
    onClick,
}) => {
    const formatDate = (dateString: string): string => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    const getProgressDisplay = () => {
        if (exam.progress) {
            return {
                completed: exam.progress.completed_questions || 0,
                total: exam.progress.total_questions || 0
            };
        }
        return { completed: 0, total: 0 };
    };



    const getStatusBorderColor = (status: string) => {
        switch (status) {
            case 'analyzed':
                return 'border-l-green-500';
            case 'completed':
                return 'border-l-blue-500';
            case 'in_progress':
                return 'border-l-orange-500';
            case 'created':
                return 'border-l-gray-400';
            default:
                return 'border-l-gray-400';
        }
    };

    const statusBorderColor = getStatusBorderColor(exam.status);
    const progress = getProgressDisplay();

    return (
        <Card
            className={cn(
                'group cursor-pointer hover:shadow-lg hover:scale-[1.01] transition-all duration-200 border-l-4',
                statusBorderColor,
                className
            )}
            onClick={onClick}
        >
            <CardContent className="p-3 md:p-4 lg:p-6">
                <div className="flex items-center justify-between gap-3">
                    {/* Left: Content Section */}
                    <div className="flex-1 min-w-0">
                        {/* Title - Full width, no truncation */}
                        <h3 className="text-sm md:text-base font-semibold text-gray-900 mb-1.5 break-words">
                            {exam.exam_name}
                        </h3>

                        {/* Metadata: Language, Level, Date, Questions */}
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs md:text-sm text-gray-600">
                            {exam.language?.name && (
                                <>
                                    <span className="font-medium text-gray-700">{exam.language.name}</span>
                                    <span className="text-gray-400">•</span>
                                </>
                            )}
                            <LevelBadge level={exam.level as 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2'} size="sm" />
                            <span className="text-gray-400">•</span>
                            <span className="whitespace-nowrap">{formatDate(exam.created_at)}</span>
                            {progress.total > 0 && (
                                <>
                                    <span className="text-gray-400">•</span>
                                    <span className="whitespace-nowrap">
                                        {progress.completed}/{progress.total} questions
                                    </span>
                                </>
                            )}
                        </div>
                    </div>
                    
                    {/* Right: Score and Arrow */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                        {/* Show score for analyzed exams */}
                        {exam.status === 'analyzed' ? (
                            <div className="flex items-center gap-2">
                                <ScoreBadge 
                                    score={exam.score ?? exam.overall_score ?? exam.summary?.overall_score ?? 0}
                                    size="md"
                                />
                                <span className="text-lg text-blue-600">{'>'}</span>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2">
                                <StatusBadge status={exam.status} size="sm" />
                                <span className="text-lg text-blue-600">{'>'}</span>
                            </div>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};
