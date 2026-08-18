import React from 'react';
import { ActivityPerformance } from '@/services/api';

interface ActivityCardProps {
  activity: ActivityPerformance;
  icon: string;
  colorClasses: {
    gradient: string;
    border: string;
    text: string;
    iconBg: string; // NEW: for icon background gradient
  };
  onStartPractice: () => void;
  isWeakest?: boolean; // Indicates if this is the weakest skill
}

/**
 * ActivityCard Component
 * 
 * Displays performance stats for a single activity type (reading, writing, grammar, hearing).
 * Supports empty states for activities with no data.
 * 
 * Used in the "Practice by Skill" section of the user dashboard.
 */
export const ActivityCard: React.FC<ActivityCardProps> = ({
  activity,
  icon,
  colorClasses,
  onStartPractice,
  isWeakest = false
}) => {
  const isEmpty = !activity.has_activity;
  
  // Activity display name
  const activityName = activity.activity_type.charAt(0).toUpperCase() + activity.activity_type.slice(1);
  
  return (
    <div 
      className={`
        group rounded-xl p-5 flex flex-col transition-all relative bg-white hover:shadow-lg
        ${isEmpty 
          ? 'border-2 border-dashed border-gray-300' 
          : 'border border-gray-200 hover:border-gray-300'
        }
        ${isWeakest && !isEmpty ? 'ring-2 ring-orange-400 ring-offset-2' : ''}
      `}
    >
      {/* 'Start here' indicator for weakest skill */}
      {isWeakest && !isEmpty && (
        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 z-10">
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-orange-500 text-white text-xs font-bold shadow-lg">
            👉 Start here
          </span>
        </div>
      )}
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          {/* Simple colored icon */}
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isEmpty ? 'bg-gray-100' : colorClasses.iconBg}`}>
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {activity.activity_type === 'reading' && (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
              )}
              {activity.activity_type === 'writing' && (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/>
              )}
              {activity.activity_type === 'grammar' && (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
              )}
              {activity.activity_type === 'hearing' && (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"/>
              )}
            </svg>
          </div>
          <div>
            <h3 className="text-base font-semibold text-gray-900">
              {activityName}
            </h3>
            <p className="text-sm text-gray-500">
              {isEmpty ? 'Not started' : `${activity.sessions_done} sessions`}
            </p>
          </div>
        </div>
      </div>
      
      {/* Stats or Empty State */}
      {isEmpty ? (
        <div className="flex-1 flex items-center justify-center py-4 mb-4">
          <p className="text-sm text-center text-gray-500">
            Begin your {activity.activity_type} journey
          </p>
        </div>
      ) : (
        <div className="mb-4">
          {/* Average Score */}
          <div className="mb-3">
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold text-gray-900">
                {Math.round(parseFloat(activity.avg_score as any))}
              </span>
              <span className="text-lg font-medium text-gray-500">%</span>
              <span className="text-sm text-gray-500">Avg. Score</span>
            </div>
          </div>
          
          {/* High Score */}
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gray-50 rounded-md border border-gray-200">
              <span className="text-xs">↑</span>
              <span className="font-semibold">{activity.best_score}%</span>
              <span className="text-gray-500">best</span>
            </span>
          </div>
        </div>
      )}
      
      {/* CTA Button */}
      <button
        onClick={onStartPractice}
        className="w-full py-2.5 px-4 rounded-lg font-medium transition-all text-sm mt-auto bg-blue-600 text-white hover:bg-blue-700 hover:shadow-md"
      >
        {isEmpty ? 'Start Now →' : 'Practice Now →'}
      </button>
    </div>
  );
};

export default ActivityCard;
