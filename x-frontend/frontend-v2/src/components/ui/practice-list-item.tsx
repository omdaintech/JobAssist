import { getActivityIcon, getActivityName } from '@/constants/activity-types';
import { cn } from '@/lib/utils';
import { LevelBadge } from './level-badge';
import React from 'react';

export interface PracticeData {
    id: string;
    activity_type: 'reading' | 'writing' | 'grammar' | 'hearing';
    level: 'A1' | 'A2' | 'B1';
    timestamp: string;
    created_at?: string;
    score?: number;
    correct?: boolean;
}

interface PracticeListItemProps {
    practice: PracticeData;
    className?: string;
    onClick?: () => void;
}

export const PracticeListItem: React.FC<PracticeListItemProps> = ({
    practice,
    className,
    onClick
}) => {
    const formatDate = (timestamp: string): string => {
        const date = new Date(timestamp);
        const now = new Date();
        const diffTime = Math.abs(now.getTime() - date.getTime());
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 0) {
            return date.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric'
            });
        } else if (diffDays === 1) {
            return 'Yesterday';
        } else if (diffDays < 7) {
            return `${diffDays} days ago`;
        } else {
            return date.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric'
            });
        }
    };

    const getResultDisplay = () => {
        if (practice.score !== undefined && practice.score !== null) {
            return `${Math.round(practice.score)}%`;
        }

        if (practice.correct !== undefined && practice.correct !== null) {
            return practice.correct ? '✓' : '✗';
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

    const getActivityColor = () => {
        switch (practice.activity_type) {
            case 'reading': return 'bg-blue-50 border-blue-100';
            case 'writing': return 'bg-green-50 border-green-100';
            case 'grammar': return 'bg-purple-50 border-purple-100';

            default: return 'bg-gray-50 border-gray-100';
        }
    };

    return (
        <div
            className={cn(
                'bg-white border rounded-lg p-3 md:p-4 shadow-sm transition-all duration-200',
                getActivityColor(),
                onClick && 'cursor-pointer hover:shadow-md hover:scale-[1.01]',
                className
            )}
            onClick={onClick}
        >
            <div className="flex items-center justify-between gap-2 md:gap-3">
                <div className="flex items-center gap-2 md:gap-4 flex-1 min-w-0">
                    <div className="w-8 h-8 md:w-10 md:h-10 bg-white rounded-lg flex items-center justify-center shadow-sm flex-shrink-0">
                        <span className="text-lg md:text-xl">
                            {getActivityIcon(practice.activity_type)}
                        </span>
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="text-sm md:text-base font-semibold text-gray-900 mb-1 truncate">
                            {getActivityName(practice.activity_type)}
                        </div>
                        <div className="flex items-center gap-1.5 md:gap-2 flex-wrap">
                            <LevelBadge level={practice.level} size="sm" />
                            <span className="text-[10px] md:text-xs text-gray-500">
                                {formatDate(practice.timestamp || practice.created_at || '')}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="flex-shrink-0 ml-2 md:ml-4">
                    <div className={cn(
                        'px-2 md:px-3 py-1 md:py-1.5 rounded-full text-xs md:text-sm font-medium bg-white shadow-sm',
                        getResultColor()
                    )}>
                        {getResultDisplay()}
                    </div>
                </div>
            </div>
        </div>
    );
};
