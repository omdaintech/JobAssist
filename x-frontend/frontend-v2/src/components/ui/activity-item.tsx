import React from 'react';
import { cn } from '@/lib/utils';
import { getActivityIcon, getActivityColor, formatActivityType } from '@/constants/activity-types';
import { getStatusInfo } from '@/utils/status-utils';

interface ActivityItemProps {
    activity: {
        id: string;
        type: string;
        activity_type: string;
        level: string;
        score?: number;
        correct?: boolean;
        status?: string;
        timestamp: string;
        created_at: string;
    };
    className?: string;
    onClick?: () => void;
}

export const ActivityItem: React.FC<ActivityItemProps> = ({
    activity,
    className,
    onClick
}) => {

    const formatDate = (timestamp: string) => {
        if (!timestamp) return 'N/A';
        const date = new Date(timestamp);
        const now = new Date();
        const diffTime = Math.abs(now.getTime() - date.getTime());
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 0) {
            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } else if (diffDays === 1) {
            return 'Yesterday';
        } else if (diffDays < 7) {
            return `${diffDays} days ago`;
        } else {
            return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
        }
    };

    const getScoreColor = (score: number) => {
        if (score >= 80) return 'text-green-600';
        if (score >= 60) return 'text-yellow-600';
        return 'text-red-600';
    };

    return (
        <div
            className={cn(
                'flex items-center justify-between p-4 bg-white rounded-xl border border-gray-100 hover:border-gray-200 hover:shadow-sm transition-all duration-200',
                onClick && 'cursor-pointer',
                className
            )}
            onClick={onClick}
        >
            <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center shadow-sm">
                    <span className="text-xl">{getActivityIcon(activity.activity_type || activity.type)}</span>
                </div>
                <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold text-gray-900">
                            {formatActivityType(activity.activity_type || activity.type)}
                        </h4>
                        <span className={cn(
                            'text-xs px-2 py-1 rounded-full font-medium',
                            getActivityColor(activity.activity_type || activity.type)
                        )}>
                            {activity.level}
                        </span>
                    </div>
                    <p className="text-sm text-gray-600">
                        {formatDate(activity.timestamp || activity.created_at)}
                    </p>
                </div>
            </div>

            <div className="flex items-center gap-4">
                <div className="text-right">
                    {activity.score !== null && activity.score !== undefined && (
                        <div className={cn(
                            'text-sm font-bold mb-1',
                            getScoreColor(activity.score)
                        )}>
                            {activity.score}%
                        </div>
                    )}
                    {activity.correct !== null && activity.correct !== undefined && (
                        <div className="text-lg">
                            {activity.correct ? '✅' : '❌'}
                        </div>
                    )}
                    {activity.status && (
                        <div className={cn(
                            'text-xs px-2 py-1 rounded-full font-medium',
                            getStatusInfo(activity.status).color
                        )}>
                            {getStatusInfo(activity.status).text}
                        </div>
                    )}
                </div>

                {onClick && (
                    <div className="text-gray-400 hover:text-gray-600 transition-colors">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                    </div>
                )}
            </div>
        </div>
    );
}; 