import { Card, CardContent, StatusBadge, LevelBadge } from '@/components/ui';
import { ScoreBadge } from '@/components/ui/score-badge';
import { PracticeSession } from '@/services/api';
import { formatDate } from '@/utils/frontend-utils';
import { cn } from '@/lib/utils';
import React from 'react';

interface PracticeSessionItemProps {
  session: PracticeSession;
  onClick?: (session: PracticeSession) => void;
  className?: string;
  showQuestionCount?: boolean;
  isClickable?: boolean;
}

export const PracticeSessionItem: React.FC<PracticeSessionItemProps> = ({
  session,
  onClick,
  className = '',
  showQuestionCount = true,
  isClickable = true
}) => {

  // Calculate question count and progress
  // Use total_questions from progress if available, otherwise fall back to template
  const progressData = (session as unknown as { progress?: { completed_questions?: number; total_questions?: number }}).progress;
  const totalQuestions = (session as unknown as { total_questions?: number }).total_questions;
  
  const questionCount = progressData?.total_questions 
    || totalQuestions
    || (session.template
      ? (
          (typeof session.template.reading === 'number' ? session.template.reading : 0) +
          (typeof session.template.writing === 'number' ? session.template.writing : 0) +
          (typeof session.template.grammar === 'number' ? session.template.grammar : 0)
        ) || 5
      : 5);

  // Extract answered questions from session progress if available
  const answeredQuestions = progressData?.completed_questions 
    || (session as unknown as { completed_questions?: number }).completed_questions 
    || 0;
  const pendingQuestions = Math.max(0, questionCount - answeredQuestions);

  // Create question count display with pending info
  const getQuestionDisplay = () => {
    if (answeredQuestions === 0) {
      return `${questionCount} questions`;
    } else if (pendingQuestions === 0) {
      return `${questionCount} questions`;
    } else {
      return `${questionCount} questions (${pendingQuestions} pending)`;
    }
  };

  const handleClick = () => {
    // Handle session navigation based on action type

    if (isClickable && onClick) {
      onClick(session);
    }
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

  const statusBorderColor = getStatusBorderColor(session.status);

  return (
    <Card
      className={cn(
        'group cursor-pointer hover:shadow-lg hover:scale-[1.01] transition-all duration-200 border-l-4',
        statusBorderColor,
        isClickable && 'hover:bg-gray-50 hover:border-blue-300',
        className
      )}
      onClick={handleClick}
    >
      <CardContent className="p-3 md:p-4 lg:p-6">
        <div className="flex items-center justify-between gap-3">
          {/* Left: Content Section */}
          <div className="flex-1 min-w-0">
            {/* Title - Full width, no truncation */}
            <h3 className="text-sm md:text-base font-semibold text-gray-900 mb-1.5 break-words">
              {session.exam_name}
            </h3>

            {/* Metadata: Language, Level, Date */}
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs md:text-sm text-gray-600">
              {session.language?.name && (
                <>
                  <span className="font-medium text-gray-700">{session.language.name}</span>
                  <span className="text-gray-400">•</span>
                </>
              )}
              <LevelBadge level={session.level as 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2'} size="sm" />
              <span className="text-gray-400">•</span>
              <span className="whitespace-nowrap">{formatDate(session.created_at)}</span>
              {showQuestionCount && (
                <>
                  <span className="text-gray-400">•</span>
                  <span className="whitespace-nowrap">{getQuestionDisplay()}</span>
                </>
              )}
            </div>
          </div>
          
          {/* Right: Score and Arrow */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Show compact score for analyzed sessions, status badge for others */}
            {session.status === 'analyzed' && session.score !== undefined ? (
              <div className="flex items-center gap-2">
                <ScoreBadge 
                    score={session.score}
                    size="md"
                />
                <span className="text-lg text-blue-600">{'>'}</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <StatusBadge status={session.status as 'created' | 'in_progress' | 'completed' | 'analyzed'} size="sm" />
                <span className="text-lg text-blue-600">{'>'}</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
