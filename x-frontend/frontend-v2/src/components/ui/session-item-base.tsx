import { Button, Card, CardContent, StatusBadge, LevelBadge, ScoreBar } from '@/components/ui';
import { cn } from '@/lib/utils';
import React from 'react';

/**
 * SessionItemBase - Unified base component for session items
 * 
 * Provides consistent layout, spacing, and styling patterns for both
 * exam and practice session items. This prevents UI inconsistencies
 * and ensures mobile-first responsive design.
 */

export interface BaseSessionData {
  id: string;
  name: string;
  level: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
  status: 'created' | 'in_progress' | 'completed' | 'analyzed';
  created_at: string;
  language?: {
    id: string;
    name: string;
  };
  score?: number;
}

export interface SessionItemBaseProps {
  /** Session data */
  session: BaseSessionData;
  
  /** Optional metadata to display below the title */
  metadata?: React.ReactNode;
  
  /** Optional activity breakdown or additional content */
  activities?: React.ReactNode;
  
  /** Action button configuration */
  actionConfig?: {
    label: string;
    onClick: () => void;
    variant?: 'default' | 'outline';
  };
  
  /** Delete handler */
  onDelete?: () => void;
  
  /** Click handler for the entire card */
  onClick?: () => void;
  
  /** Additional CSS classes */
  className?: string;
  
  /** Whether the card should be clickable */
  isClickable?: boolean;
}

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

export const SessionItemBase: React.FC<SessionItemBaseProps> = ({
  session,
  metadata,
  activities,
  actionConfig,
  onDelete,
  onClick,
  className,
  isClickable = true
}) => {
  const statusBorderColor = getStatusBorderColor(session.status);

  const handleClick = () => {
    if (isClickable && onClick) {
      onClick();
    }
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDelete) {
      onDelete();
    }
  };

  const handleActionClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (actionConfig) {
      actionConfig.onClick();
    }
  };

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
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
          {/* Left: Content Section */}
          <div className="flex-1 space-y-2 md:space-y-3">
            {/* Title and Status/Score */}
            <div className="flex items-start gap-2">
              {onDelete && (
                <button
                  type="button"
                  aria-label="Delete session"
                  onClick={handleDelete}
                  className="inline-flex h-7 w-7 md:min-h-[44px] md:min-w-[44px] flex-shrink-0 items-center justify-center rounded-md border border-gray-200 bg-white text-gray-500 hover:text-red-600 hover:border-red-200 hover:bg-red-50 transition-colors"
                >
                  <span className="text-lg">×</span>
                </button>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-start gap-2 flex-wrap">
                  <h3 className="text-sm md:text-base font-semibold text-gray-900 line-clamp-2 break-words flex-1">
                    {session.name}
                  </h3>
                  {/* Show score for analyzed sessions, status badge for others */}
                  {session.status === 'analyzed' && session.score !== undefined ? (
                    <div className="min-w-[140px]">
                      <ScoreBar score={session.score} showLabel />
                    </div>
                  ) : (
                    <StatusBadge status={session.status} size="sm" />
                  )}
                </div>
              </div>
            </div>

            {/* Metadata: Language, Level, Date, etc. */}
            {metadata && (
              <div className="flex flex-wrap items-center gap-x-2 md:gap-x-3 gap-y-1 text-xs md:text-sm text-gray-600">
                {session.language?.name && (
                  <>
                    <span className="font-medium text-gray-700">{session.language.name}</span>
                    <span className="text-gray-400">•</span>
                  </>
                )}
                <LevelBadge level={session.level} size="sm" />
                <span className="hidden sm:inline text-gray-400">•</span>
                {metadata}
              </div>
            )}

            {/* Activity Breakdown or Additional Content */}
            {activities && (
              <div className="mt-2">
                {activities}
              </div>
            )}
          </div>
          
          {/* Right: Action Button */}
          {actionConfig && (
            <div className="flex items-stretch sm:items-center sm:justify-end">
              <Button
                size="sm"
                variant={actionConfig.variant}
                onClick={handleActionClick}
                className="text-xs md:text-sm px-3 md:px-4 w-full sm:w-auto min-h-[44px] bg-eu-blue hover:bg-eu-blue/90 text-white"
              >
                {actionConfig.label}
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};