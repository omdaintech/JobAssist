import { Card, CardContent } from '@/components/ui';
import { getActivityIcon } from '@/constants/activity-types';
import { cn } from '@/lib/utils';
import { canDeleteSession, formatDate } from '@/utils/frontend-utils';
import { getStatusInfo } from '@/utils/status-utils';
import React, { useState } from 'react';

// Unified session data interface
export interface UnifiedSession {
  id: string;
  name: string;
  level: string;
  status: 'created' | 'in_progress' | 'completed' | 'analyzed';
  sessionType: 'practice' | 'exam';
  createdAt: string;
  completedAt?: string;
  analyzedAt?: string;
  activityType?: string; // For practice sessions
  durationMinutes?: number; // Duration for completed/analyzed sessions
  language?: {
    name: string;
    flagEmoji: string;
  };
  template?: {
    reading?: number;
    writing?: number;
    grammar?: number;
  };
  progress?: {
    completedQuestions?: number;
    totalQuestions?: number;
    activityBreakdown?: {
      [key: string]: number;
    };
  };
  summary?: {
    overallScore?: number;
  };
  canResume?: boolean;
  canAnalyze?: boolean;
}

// Filter configuration
export interface FilterConfig {
  level: {
    enabled: boolean;
    options: Array<{ value: string; label: string; color?: string }>;
  };
  activityType: {
    enabled: boolean;
    options: Array<{ value: string; label: string; icon?: string }>;
  };
  dateRange: {
    enabled: boolean;
    options: Array<{ value: number; label: string }>;
  };
  status: {
    enabled: boolean;
    options: Array<{ value: string; label: string }>;
  };
}

// Action handlers
export interface SessionActions {
  onContinue?: (session: UnifiedSession) => void;
  onViewResults?: (session: UnifiedSession) => void;
  onAnalyze?: (session: UnifiedSession) => void;
  onDelete?: (session: UnifiedSession) => void;
  onClick?: (session: UnifiedSession) => void;
}

// Filter state
interface FilterState {
  level: string;
  activityType: string;
  dateRange: number; // days ago, 0 = all
  status: string;
  sortBy: 'date' | 'score' | 'level' | 'name';
  sortOrder: 'asc' | 'desc';
  searchQuery: string;
}

interface SessionListProps {
  sessions: UnifiedSession[];
  filterConfig: FilterConfig;
  actions: SessionActions;
  isLoading?: boolean;
  emptyStateConfig?: {
    icon: string;
    title: string;
    description: string;
    actionText?: string;
    onAction?: () => void;
  };
  variant?: 'default' | 'compact';
  showFilters?: boolean;
  className?: string;
}

export const SessionList: React.FC<SessionListProps> = ({
  sessions,
  filterConfig,
  actions,
  isLoading = false,
  emptyStateConfig,
  showFilters = true,
  className = ''
}) => {
  const [filters, setFilters] = useState<FilterState>({
    level: 'all',
    activityType: 'all',
    dateRange: 30,
    status: 'all',
    sortBy: 'date',
    sortOrder: 'desc',
    searchQuery: ''
  });

  // Filter and sort sessions
  const filteredSessions = sessions
    .filter(session => {
      // Level filter
      if (filters.level !== 'all' && session.level !== filters.level) return false;
      
      // Activity type filter (for practice sessions)
      if (filters.activityType !== 'all' && session.activityType && session.sessionType === 'practice') {
        if (session.activityType !== filters.activityType) return false;
      }
      
      // Status filter
      if (filters.status !== 'all' && session.status !== filters.status) return false;
      
      // Date range filter
      if (filters.dateRange > 0) {
        const daysDiff = (new Date().getTime() - new Date(session.createdAt).getTime()) / (24 * 60 * 60 * 1000);
        if (daysDiff > filters.dateRange) return false;
      }
      
      // Search filter
      if (filters.searchQuery) {
        const query = filters.searchQuery.toLowerCase();
        if (!session.name.toLowerCase().includes(query)) return false;
      }
      
      return true;
    })
    .sort((a, b) => {
      let comparison = 0;
      
      switch (filters.sortBy) {
        case 'date':
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'level':
          comparison = a.level.localeCompare(b.level);
          break;
        case 'score': {
          const aScore = a.summary?.overallScore || 0;
          const bScore = b.summary?.overallScore || 0;
          comparison = aScore - bScore;
          break;
        }
        default:
          comparison = 0;
      }
      
      return filters.sortOrder === 'asc' ? comparison : -comparison;
    });

  // Helper functions
  const getProgressDisplay = (session: UnifiedSession) => {
    if (session.progress) {
      return {
        completed: session.progress.completedQuestions || 0,
        total: session.progress.totalQuestions || 0
      };
    }
    return { completed: 0, total: 0 };
  };

  const getTemplateBreakdown = (session: UnifiedSession) => {
    if (!session.template) return [];

    const activities = ['reading', 'writing', 'grammar'];
    return activities
      .map(activity => ({
        type: activity,
        planned: session.template?.[activity as keyof typeof session.template] || 0,
        completed: session.progress?.activityBreakdown?.[activity] || 0
      }))
      .filter(item => item.planned > 0);
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'A1':
        return 'bg-green-50 text-green-700 border border-green-200';
      case 'A2':
        return 'bg-blue-50 text-blue-700 border border-blue-200';
      case 'B1':
        return 'bg-purple-50 text-purple-700 border border-purple-200';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getActionLabel = (session: UnifiedSession) => {
    switch (session.status) {
      case 'analyzed':
        return 'View Results';
      case 'completed':
        return 'Analyze';
      case 'created':
        return 'Start';
      case 'in_progress':
        return 'Continue';
      default:
        return 'View';
    }
  };

  const handleAction = (session: UnifiedSession, actionType: 'primary' | 'secondary' | 'delete') => {
    if (actionType === 'primary') {
      if (session.status === 'analyzed' && actions.onViewResults) {
        actions.onViewResults(session);
      } else if (session.status === 'completed' && actions.onAnalyze) {
        actions.onAnalyze(session);
      } else if ((session.status === 'created' || session.status === 'in_progress') && actions.onContinue) {
        actions.onContinue(session);
      }
    } else if (actionType === 'secondary') {
      if (actions.onViewResults && (session.status === 'completed' || session.status === 'analyzed')) {
        actions.onViewResults(session);
      }
    } else if (actionType === 'delete') {
      if (actions.onDelete) {
        actions.onDelete(session);
      }
    }
  };

  // Count active filters
  const activeFiltersCount = [
    filters.level !== 'all',
    filters.activityType !== 'all',
    filters.status !== 'all',
    filters.dateRange !== 30,
    filters.searchQuery !== '',
    filters.sortBy !== 'date' || filters.sortOrder !== 'desc'
  ].filter(Boolean).length;

  // Clear all filters
  const clearAllFilters = () => {
    setFilters({
      level: 'all',
      activityType: 'all',
      dateRange: 30,
      status: 'all',
      sortBy: 'date',
      sortOrder: 'desc',
      searchQuery: ''
    });
  };

  if (isLoading) {
    return (
      <div className={cn('flex items-center justify-center py-8', className)}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-eu-blue mx-auto mb-4"></div>
          <p className="text-gray-600">Loading sessions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Filters */}
      {showFilters && (
        <Card>
          <CardContent className="p-3 sm:p-4 space-y-3 sm:space-y-4">
            {/* Quick Date Filters */}
            {filterConfig.dateRange.enabled && (
              <div className="flex flex-wrap gap-1.5 sm:gap-2">
                <span className="text-xs sm:text-sm text-gray-600 mr-1 sm:mr-2 leading-loose">Quick filters:</span>
                {filterConfig.dateRange.options.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setFilters({ ...filters, dateRange: option.value })}
                    className={cn(
                      'px-2 sm:px-3 py-1 text-[10px] sm:text-xs rounded-full border transition-colors',
                      filters.dateRange === option.value
                        ? 'bg-blue-50 text-blue-700 border-blue-200'
                        : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            )}

            {/* Detailed Filters */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              {/* Level Filter */}
              {filterConfig.level.enabled && (
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Level</label>
                  <select
                    value={filters.level}
                    onChange={(e) => setFilters({ ...filters, level: e.target.value })}
                    className="w-full text-xs sm:text-sm border border-gray-300 rounded-md px-2 sm:px-3 py-1.5 sm:py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {filterConfig.level.options.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Activity Filter */}
              {filterConfig.activityType.enabled && (
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Activity</label>
                  <select
                    value={filters.activityType}
                    onChange={(e) => setFilters({ ...filters, activityType: e.target.value })}
                    className="w-full text-xs sm:text-sm border border-gray-300 rounded-md px-2 sm:px-3 py-1.5 sm:py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {filterConfig.activityType.options.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.icon} {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Search */}
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Search</label>
                <input
                  type="text"
                  placeholder="Search sessions..."
                  value={filters.searchQuery}
                  onChange={(e) => setFilters({ ...filters, searchQuery: e.target.value })}
                  className="w-full text-xs sm:text-sm border border-gray-300 rounded-md px-2 sm:px-3 py-1.5 sm:py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Sort */}
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Sort</label>
                <div className="flex gap-1">
                  <select
                    value={filters.sortBy}
                    onChange={(e) => setFilters({ ...filters, sortBy: e.target.value as FilterState['sortBy'] })}
                    className="flex-1 text-xs sm:text-sm border border-gray-300 rounded-md px-2 py-1.5 sm:py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="date">Date</option>
                    <option value="name">Name</option>
                    <option value="level">Level</option>
                    <option value="score">Score</option>
                  </select>
                  <button
                    onClick={() => setFilters({ ...filters, sortOrder: filters.sortOrder === 'asc' ? 'desc' : 'asc' })}
                    className="px-2 py-1.5 sm:py-2 border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    title={`Sort ${filters.sortOrder === 'asc' ? 'descending' : 'ascending'}`}
                  >
                    {filters.sortOrder === 'asc' ? '↑' : '↓'}
                  </button>
                </div>
              </div>
            </div>

            {/* Filter Summary */}
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Showing {filteredSessions.length} of {sessions.length} sessions
                {activeFiltersCount > 0 && ` (${activeFiltersCount} filter${activeFiltersCount !== 1 ? 's' : ''} active)`}
              </div>
              {activeFiltersCount > 0 && (
                <button
                  onClick={clearAllFilters}
                  className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                >
                  Clear all
                </button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Session List */}
      {filteredSessions.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            {emptyStateConfig ? (
              <>
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-gray-400 text-2xl">{emptyStateConfig.icon}</span>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">{emptyStateConfig.title}</h3>
                <p className="text-gray-500 mb-4">{emptyStateConfig.description}</p>
                {emptyStateConfig.actionText && emptyStateConfig.onAction && (
                  <button
                    onClick={emptyStateConfig.onAction}
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
                  >
                    {emptyStateConfig.actionText}
                  </button>
                )}
              </>
            ) : (
              <>
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-gray-400 text-2xl">📭</span>
                </div>
                <p className="text-gray-500">No sessions found matching your filters.</p>
                {activeFiltersCount > 0 && (
                  <button
                    onClick={clearAllFilters}
                    className="mt-2 text-blue-600 hover:text-blue-800 text-sm"
                  >
                    Clear all filters
                  </button>
                )}
              </>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredSessions.map((session) => {
            const statusInfo = getStatusInfo(session.status);
            const progress = getProgressDisplay(session);
            const templateBreakdown = getTemplateBreakdown(session);
            const isCompleted = session.status === 'completed' || session.status === 'analyzed';

            return (
              <Card
                key={session.id}
                className={cn(
                  'border-l-4 transition-all duration-200 hover:shadow-md',
                  isCompleted ? 'border-l-green-500' : 'border-l-eu-blue',
                  actions.onClick && 'cursor-pointer'
                )}
                onClick={() => actions.onClick && actions.onClick(session)}
              >
                <CardContent className="p-3 sm:p-4">
                  <div className="space-y-3">
                    {/* Header Row with Icon, Name, Status, and Actions */}
                    <div className="flex items-start gap-2 sm:gap-3">
                      {/* Activity Icon */}
                      <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-base sm:text-lg">
                          {session.sessionType === 'practice' 
                            ? getActivityIcon(session.activityType || 'reading')
                            : '🎯'
                          }
                        </span>
                      </div>
                      
                      {/* Session Name and Details */}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-sm sm:text-base text-gray-900 truncate leading-tight">{session.name}</h3>
                        <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-gray-600 flex-wrap mt-1">
                          <span className={cn('px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-[10px] sm:text-xs font-medium whitespace-nowrap', getLevelColor(session.level))}>
                            {session.level}
                          </span>
                          <span className="hidden sm:inline">•</span>
                          <span className="text-[10px] sm:text-xs truncate">{formatDate(session.createdAt)}</span>
                          {session.language && (
                            <>
                              <span className="hidden sm:inline">•</span>
                              <span className="text-[10px] sm:text-xs whitespace-nowrap">{session.language.flagEmoji && `${session.language.flagEmoji} `}{session.language.name}</span>
                            </>
                          )}
                          {/* Show duration for completed/analyzed sessions */}
                          {isCompleted && session.durationMinutes && (
                            <>
                              <span className="hidden sm:inline">•</span>
                              <span className="text-[10px] sm:text-xs whitespace-nowrap">⏱️ {session.durationMinutes}m</span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Status Badge - Mobile: Top Right */}
                      <span className={cn('px-1.5 sm:px-2 py-0.5 sm:py-1 text-[10px] sm:text-xs rounded-full font-medium whitespace-nowrap flex-shrink-0', statusInfo.color)}>
                        {statusInfo.text}
                      </span>
                    </div>

                    {/* Template Breakdown */}
                    {templateBreakdown.length > 0 && (
                      <div className="flex flex-wrap gap-1 sm:gap-1.5">
                        {templateBreakdown.map(({ type, planned, completed }) => (
                          <div
                            key={type}
                            className={cn(
                              'flex items-center gap-1 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-md text-[10px] sm:text-xs',
                              completed >= planned
                                ? 'bg-green-100 text-green-700 border border-green-200'
                                : completed > 0
                                ? 'bg-blue-100 text-blue-700 border border-blue-200'
                                : 'bg-gray-100 text-gray-600 border border-gray-200'
                            )}
                          >
                            <span className="text-xs sm:text-sm">{getActivityIcon(type)}</span>
                            <span className="font-medium whitespace-nowrap">{completed}/{planned}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Progress Info - only show for non-completed sessions */}
                    {!isCompleted && (
                      <div className="flex items-center gap-2 sm:gap-4 text-xs sm:text-sm text-gray-600">
                        <span>
                          <span className="font-medium">Progress:</span> {progress.completed}/{progress.total} questions
                        </span>
                      </div>
                    )}
                    
                    {/* Score for completed sessions */}
                    {isCompleted && session.summary?.overallScore && (
                      <div className="flex items-center gap-2 sm:gap-4 text-xs sm:text-sm text-gray-600">
                        <span>
                          <span className="font-medium">Score:</span> {Math.round(session.summary.overallScore)}%
                        </span>
                      </div>
                    )}

                    {/* Action Buttons - Full Width on Mobile */}
                    <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between pt-2 border-t border-gray-100">
                      {/* Primary Action */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAction(session, 'primary');
                        }}
                        className={cn(
                          'w-full sm:w-auto px-4 py-2 sm:py-1.5 text-xs sm:text-sm font-medium rounded transition-colors',
                          session.status === 'analyzed'
                            ? 'bg-green-100 text-green-700 hover:bg-green-200'
                            : session.status === 'completed'
                            ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                            : 'bg-eu-blue text-white hover:bg-eu-blue/90'
                        )}
                      >
                        {getActionLabel(session)}
                      </button>

                      {/* Delete Action */}
                      {actions.onDelete && canDeleteSession({
                        session_id: session.id,
                        status: session.status,
                        analyzed_at: session.analyzedAt,
                        session_type: session.sessionType,
                        exam_name: session.name
                      }) && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAction(session, 'delete');
                          }}
                          className="w-full sm:w-auto px-4 py-2 sm:py-1.5 text-xs sm:text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition-colors border border-red-200 sm:border-0"
                          title="Delete session"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
