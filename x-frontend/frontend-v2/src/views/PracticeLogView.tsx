import { PageContainer } from '@/components/layout/PageContainer';
import { Card, CardContent, ErrorDisplay, ExamListItem, LoadingState, PracticeSessionItem } from '@/components/ui';
import { ACTIVITY_TYPES } from '@/constants/activity-types';
import { useAuth } from '@/context/AuthContext';
import { useExamNavigation } from '@/hooks/useSecureNavigation';
import { PracticeSession, api } from '@/services/api';
import { extractErrorMessage } from '@/utils/frontend-utils';
import { getSessionUrl } from '@/utils/navigation-utils';
import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

// Local type definitions
interface FilterOption {
    value: string;
    label: string;
    icon?: string;
    color?: string;
}

// Types for history data

interface ExamHistoryItem {
    exam_id: string;
    exam_name: string;
    level: string;
    status: 'created' | 'in_progress' | 'completed' | 'analyzed';
    created_at: string;
    completed_at?: string;
    progress: string;
    overall_score?: number;
    can_resume: boolean;
    can_analyze: boolean;
    language?: {
        id: string;
        name: string;
    };
}

interface FilterState {
    level: string;
    language: string; // NEW: Language filter
    activityType: string;
    dateRange: number; // days ago
    sortBy: 'date' | 'score' | 'level';
    sortOrder: 'asc' | 'desc';
    searchQuery: string;
}

interface PracticeLogStatus {
    isComingSoon: boolean;
    message?: string;
}

export const PracticeLogView: React.FC = () => {
    const { isAuthenticated } = useAuth();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    // Get initial tab from URL parameter, default to practice
    const initialTab = (searchParams.get('tab') as 'practice' | 'exam') || 'practice';

    // State management
    const [activeTab, setActiveTab] = useState<'practice' | 'exam'>(initialTab);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Practice session state (NEW)
    const [practiceSessions, setPracticeSessions] = useState<PracticeSession[]>([]);
    const [practiceLogStatus, setPracticeLogStatus] = useState<PracticeLogStatus>({ isComingSoon: false });

    // Languages state
    const [languages, setLanguages] = useState<Array<{id: string; name: string}>>([]);

    // Legacy practice history (kept for compatibility, but no longer used)
    // const [practiceHistory, setPracticeHistory] = useState<PracticeHistoryItem[]>([]);

    // Exam history
    const [examHistory, setExamHistory] = useState<ExamHistoryItem[]>([]);

    // Filters
    const [filters, setFilters] = useState<FilterState>({
        level: 'all',
        language: 'all', // NEW: Default to all languages
        activityType: 'all',
        dateRange: 30, // last 30 days
        sortBy: 'date',
        sortOrder: 'desc',
        searchQuery: ''
    });

    // Update URL when tab changes
    const handleTabChange = (tab: 'practice' | 'exam') => {
        setActiveTab(tab);
        const newSearchParams = new URLSearchParams(searchParams);
        newSearchParams.set('tab', tab);
        navigate(`/practice-log?${newSearchParams.toString()}`, { replace: true });
    };

    // Redirect if not authenticated
    useEffect(() => {
        if (!isAuthenticated) {
            navigate('/login');
        }
    }, [isAuthenticated, navigate]);

    // Load available languages on mount
    useEffect(() => {
        const loadLanguages = async () => {
            try {
                const response = await api.languages.getAvailable();
                if (response.data.success && response.data.languages) {
                    setLanguages(response.data.languages.map(lang => ({
                        id: lang.language_id,
                        name: lang.language_name
                    })));
                }
            } catch (err) {
                console.error('Failed to load languages:', err);
            }
        };

        if (isAuthenticated) {
            loadLanguages();
        }
    }, [isAuthenticated]);

    const loadHistoryData = useCallback(async () => {
        setIsLoading(true);
        setError(null);

        try {
            if (activeTab === 'practice') {
                // Load both new practice sessions and check old practice log status
                const [practiceLogResponse, practiceSessionsResponse] = await Promise.all([
                    api.practice.getLog(100),
                    api.practice.getSessions()
                ]);

                // Handle practice log response (should return "coming soon")
                if (practiceLogResponse.data.success) {
                    if (practiceLogResponse.data.status === 'coming_soon') {
                        setPracticeLogStatus({
                            isComingSoon: true,
                            message: practiceLogResponse.data.message || 'Practice log being rebuilt for new session system'
                        });
                    } else {
                        // Fallback: old practice data is available
                        setPracticeLogStatus({ isComingSoon: false });
                    }
                }

                // Load new practice sessions
                if (practiceSessionsResponse.data.success) {
                    setPracticeSessions(practiceSessionsResponse.data.sessions as unknown as PracticeSession[] || []);
                }
            } else {
                // Load exam history using the correct endpoint
                const examResponse = await api.sessions.listExams();
                if (examResponse.data.success) {
                    const transformedExams = (examResponse.data.sessions || []).map((session: any): ExamHistoryItem => ({
                        exam_id: session.session_id,
                        exam_name: session.exam_name,
                        level: session.level,
                        status: session.status,
                        created_at: session.created_at,
                        completed_at: session.completed_at,
                        language: session.language ? {
                            id: session.language.id,
                            name: session.language.name
                        } : undefined,
                        progress: typeof session.progress === 'object' && session.progress !== null
                            ? `${session.progress?.completed_questions || 0}/${session.progress?.total_questions || 0} questions`
                            : (typeof session.progress === 'string' ? session.progress : `${session.current_question || 0}/${session.total_questions || 0} questions`),
                        overall_score: session.score,
                        can_resume: session.status === 'in_progress' || session.status === 'created',
                        can_analyze: session.status === 'completed'
                    }));
                    setExamHistory(transformedExams as ExamHistoryItem[]);
                }
            }
        } catch (err: unknown) {
            setError(extractErrorMessage(err as unknown as Error));
        } finally {
            setIsLoading(false);
        }
    }, [activeTab]);

    // Load data on mount and when filters change
    useEffect(() => {
        if (isAuthenticated) {
            loadHistoryData();
        }
    }, [isAuthenticated, filters, loadHistoryData]);

    // Filter and sort practice sessions (NEW)
    const filteredPracticeSessions = practiceSessions
        .filter(session => {
            const levelMatch = filters.level === 'all' || session.level === filters.level;
            const languageMatch = filters.language === 'all' || session.language?.name === filters.language;
            const activityMatch = filters.activityType === 'all' || session.activity_type === filters.activityType;
            const dateMatch = filters.dateRange === 0 ||
                (new Date().getTime() - new Date(session.created_at).getTime()) <= (filters.dateRange * 24 * 60 * 60 * 1000);
            const searchMatch = filters.searchQuery === '' ||
                session.exam_name.toLowerCase().includes(filters.searchQuery.toLowerCase());

            return levelMatch && languageMatch && activityMatch && dateMatch && searchMatch;
        })
        .sort((a, b) => {
            let comparison = 0;

            switch (filters.sortBy) {
                case 'date':
                    comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
                    break;
                case 'level':
                    comparison = a.level.localeCompare(b.level);
                    break;
                case 'score':
                    // For sessions, we can't sort by score easily, so use date
                    comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
                    break;
            }

            return filters.sortOrder === 'asc' ? comparison : -comparison;
        });

    // Filter and sort exam history (EXISTING)
    const filteredExamHistory = examHistory
        .filter(item => {
            const levelMatch = filters.level === 'all' || item.level === filters.level;
            const languageMatch = filters.language === 'all' || item.language?.name === filters.language;
            const searchMatch = filters.searchQuery === '' ||
                item.exam_name.toLowerCase().includes(filters.searchQuery.toLowerCase());
            const dateMatch = filters.dateRange === 0 ||
                (new Date().getTime() - new Date(item.created_at).getTime()) <= (filters.dateRange * 24 * 60 * 60 * 1000);

            return levelMatch && languageMatch && searchMatch && dateMatch;
        })
        .sort((a, b) => {
            let comparison = 0;

            switch (filters.sortBy) {
                case 'date':
                    comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
                    break;
                case 'score':
                    comparison = (a.overall_score || 0) - (b.overall_score || 0);
                    break;
                case 'level':
                    comparison = a.level.localeCompare(b.level);
                    break;
            }

            return filters.sortOrder === 'asc' ? comparison : -comparison;
        });

    // Navigation utilities
    const { navigateToExam, navigateToExamResults } = useExamNavigation();

    // Handle practice session click - using centralized navigation utilities
    const handlePracticeSessionClick = (session: PracticeSession) => {
        // Use the centralized navigation utility to get the correct URL
        const url = getSessionUrl(
            session.session_id, 
            'practice', 
            session.status as 'created' | 'in_progress' | 'completed' | 'analyzed'
        );
        navigate(url);
    };

    // Filter options
    const quickFilters: FilterOption[] = [
        { value: '1', label: 'Today' },
        { value: '7', label: 'This Week' },
        { value: '30', label: 'This Month' },
        { value: '0', label: 'All Time' }
    ];

    const levelOptions: FilterOption[] = [
        { value: 'all', label: 'All Levels' },
        { value: 'A1', label: 'A1', color: 'bg-green-50 text-green-700 border border-green-200' },
        { value: 'A2', label: 'A2', color: 'bg-blue-50 text-blue-700 border border-blue-200' },
        { value: 'B1', label: 'B1', color: 'bg-purple-50 text-purple-700 border border-purple-200' }
    ];

    const activityOptions: FilterOption[] = [
        { value: 'all', label: 'All Activities', icon: '📚' },
        { value: 'reading', label: 'Reading', icon: '📖' },
        { value: 'writing', label: 'Writing', icon: '✍️' },
        { value: 'grammar', label: 'Grammar', icon: '📝' },
        { value: 'hearing', label: 'Hearing', icon: '🎧' },
        { value: 'speaking', label: 'Speaking', icon: '🎤' }
    ];

    // Count active filters
    const activeFiltersCount = [
        filters.level !== 'all',
        filters.language !== 'all',
        filters.activityType !== 'all' && activeTab === 'practice',
        filters.dateRange !== 30,
        filters.searchQuery !== '',
        filters.sortBy !== 'date' || filters.sortOrder !== 'desc'
    ].filter(Boolean).length;

    // Clear all filters
    const clearAllFilters = () => {
        setFilters({
            level: 'all',
            language: 'all', // NEW: Reset language filter
            activityType: 'all',
            dateRange: 30,
            sortBy: 'date',
            sortOrder: 'desc',
            searchQuery: ''
        });
    };

    // Get current filter summary
    const getCurrentFilterSummary = () => {
        const parts = [];
        if (filters.level !== 'all') parts.push(filters.level);
        if (filters.language !== 'all') parts.push(filters.language);
        if (filters.activityType !== 'all' && activeTab === 'practice') parts.push(ACTIVITY_TYPES[filters.activityType as keyof typeof ACTIVITY_TYPES]?.shortName || filters.activityType);
        if (filters.dateRange !== 30) {
            const quickFilter = quickFilters.find(f => parseInt(f.value) === filters.dateRange);
            parts.push(quickFilter?.label || `${filters.dateRange} days`);
        }
        if (filters.searchQuery) parts.push(`"${filters.searchQuery}"`);
        return parts.join(' • ');
    };

    if (!isAuthenticated) {
        return null;
    }

    return (
        <PageContainer>
            <div className="app-content-container app-page-stack py-3 md:py-4 lg:py-6">
                {/* Header */}
                <section className="space-y-2 md:space-y-3">
                    <h1 className="text-xl md:text-2xl lg:text-3xl font-bold text-gray-900">Practice & Exam History</h1>
                    <p className="text-sm md:text-base text-gray-600">
                        Track your learning progress and review past sessions
                    </p>
                </section>

                {/* Tab Navigation */}
                <section>
                    <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
                        <button
                            onClick={() => handleTabChange('practice')}
                            className={`flex-1 px-3 md:px-4 py-2 text-xs md:text-sm font-medium rounded-md transition-colors ${
                                activeTab === 'practice'
                                    ? 'bg-white text-blue-600 shadow-sm'
                                    : 'text-gray-600 hover:text-gray-900'
                            }`}
                        >
                            <span className="hidden xs:inline">📚 Practice Sessions</span>
                            <span className="xs:hidden">📚 Practice</span>
                        </button>
                        <button
                            onClick={() => handleTabChange('exam')}
                            className={`flex-1 px-3 md:px-4 py-2 text-xs md:text-sm font-medium rounded-md transition-colors ${
                                activeTab === 'exam'
                                    ? 'bg-white text-blue-600 shadow-sm'
                                    : 'text-gray-600 hover:text-gray-900'
                            }`}
                        >
                            <span className="hidden xs:inline">🎯 Exams</span>
                            <span className="xs:hidden">🎯 Exams</span>
                        </button>
                    </div>
                </section>

                {/* Error State */}
                {error && (
                    <section>
                        <ErrorDisplay
                            message={error}
                            onRetry={() => {
                                setError(null);
                                loadHistoryData();
                            }}
                        />
                    </section>
                )}

                {/* Filters */}
                <section>
                    <Card>
                        <CardContent>
                            {/* Quick Filters */}
                            <div className="flex flex-wrap gap-2 mb-3 md:mb-4">
                                <span className="text-xs md:text-sm text-gray-600 mr-1 md:mr-2">Quick filters:</span>
                                {quickFilters.map((filter) => (
                                    <button
                                        key={filter.value}
                                        onClick={() => setFilters({ ...filters, dateRange: parseInt(filter.value) })}
                                        className={`px-2 md:px-3 py-1 text-[10px] md:text-xs rounded-full border transition-colors ${
                                            filters.dateRange === parseInt(filter.value)
                                                ? 'bg-blue-50 text-blue-700 border-blue-200'
                                                : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                                        }`}
                                    >
                                        {filter.label}
                                    </button>
                                ))}
                            </div>

                            {/* Level and Activity Filters */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 md:gap-3">
                                {/* Level Filter */}
                                <div>
                                    <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1">Level</label>
                                    <select
                                        value={filters.level}
                                        onChange={(e) => setFilters({ ...filters, level: e.target.value })}
                                        className="w-full text-xs md:text-sm border border-gray-300 rounded-md px-2 md:px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    >
                                        {levelOptions.map((option) => (
                                            <option key={option.value} value={option.value}>
                                                {option.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Language Filter */}
                                <div>
                                    <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1">Language</label>
                                    <select
                                        value={filters.language}
                                        onChange={(e) => setFilters({ ...filters, language: e.target.value })}
                                        className="w-full text-xs md:text-sm border border-gray-300 rounded-md px-2 md:px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    >
                                        <option value="all">All Languages</option>
                                        {languages.map((lang) => (
                                            <option key={lang.id} value={lang.name}>
                                                {lang.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Activity Filter (Practice only) */}
                                {activeTab === 'practice' && (
                                    <div>
                                        <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1">Activity</label>
                                        <select
                                            value={filters.activityType}
                                            onChange={(e) => setFilters({ ...filters, activityType: e.target.value })}
                                            className="w-full text-xs md:text-sm border border-gray-300 rounded-md px-2 md:px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        >
                                            {activityOptions.map((option) => (
                                                <option key={option.value} value={option.value}>
                                                    {option.icon} {option.label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                )}

                                {/* Search */}
                                <div>
                                    <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1">Search</label>
                                <input
                                    type="text"
                                    placeholder="Search sessions..."
                                    value={filters.searchQuery}
                                    onChange={(e) => setFilters({ ...filters, searchQuery: e.target.value })}
                                    className="w-full text-xs md:text-sm border border-gray-300 rounded-md px-2 md:px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                            </div>

                            {/* Sort */}
                            <div>
                                <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1">Sort</label>
                                <div className="flex gap-1">
                                    <select
                                        value={filters.sortBy}
                                        onChange={(e) => setFilters({ ...filters, sortBy: e.target.value as FilterState['sortBy'] })}
                                        className="flex-1 text-xs md:text-sm border border-gray-300 rounded-md px-2 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    >
                                        <option value="date">Date</option>
                                        <option value="score">Score</option>
                                        <option value="level">Level</option>
                                    </select>
                                    <button
                                        onClick={() => setFilters({ ...filters, sortOrder: filters.sortOrder === 'asc' ? 'desc' : 'asc' })}
                                        className="px-2 py-2 border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        title={`Sort ${filters.sortOrder === 'asc' ? 'descending' : 'ascending'}`}
                                    >
                                        {filters.sortOrder === 'asc' ? '↑' : '↓'}
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Active Filters Summary */}
                        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                            <div className="text-xs md:text-sm text-gray-600">
                                {activeFiltersCount > 0 && (
                                    <span>
                                        {activeFiltersCount} filter{activeFiltersCount !== 1 ? 's' : ''} active
                                        {getCurrentFilterSummary() && `: ${getCurrentFilterSummary()}`}
                                    </span>
                                )}
                            </div>
                            {activeFiltersCount > 0 && (
                                <button
                                    onClick={clearAllFilters}
                                    className="text-xs md:text-sm text-blue-600 hover:text-blue-800 font-medium"
                                >
                                    Clear all
                                </button>
                            )}
                        </div>

                        {/* Results Count */}
                        <div className="text-xs md:text-sm text-gray-600">
                            {activeTab === 'practice' ? (
                                <span>
                                    Showing {filteredPracticeSessions.length} practice session{filteredPracticeSessions.length !== 1 ? 's' : ''}
                                </span>
                            ) : (
                                <span>
                                    Showing {filteredExamHistory.length} exam{filteredExamHistory.length !== 1 ? 's' : ''}
                                </span>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </section>

                    {/* Loading State */}
                    {isLoading && (
                        <section>
                            <div className="flex justify-center py-6 md:py-8">
                                <LoadingState message="Loading history..." />
                            </div>
                        </section>
                    )}

                    {/* Practice Sessions Tab */}
                    {activeTab === 'practice' && !isLoading && (
                        <section>
                            {/* Coming Soon Notice */}
                            {practiceLogStatus.isComingSoon && (
                                <Card className="border-blue-200 bg-blue-50 mb-3 md:mb-4">
                                    <CardContent>
                                        <div className="text-center">
                                            <div className="w-10 h-10 md:w-12 md:h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2 md:mb-3">
                                                <span className="text-blue-600 text-lg md:text-xl">🚧</span>
                                            </div>
                                            <h3 className="text-base md:text-lg font-semibold text-blue-900 mb-2">Practice History Rebuilding</h3>
                                            <p className="text-xs md:text-sm text-blue-800 mb-3 md:mb-4">
                                                {practiceLogStatus.message}
                                            </p>
                                            <p className="text-[10px] md:text-xs text-blue-700">
                                                Your new practice sessions (below) are being tracked in the improved system.
                                            </p>
                                        </div>
                                    </CardContent>
                                </Card>
                            )}

                            {/* Practice Sessions List - 1 col mobile, 2 cols tablet+ */}
                            {filteredPracticeSessions.length === 0 ? (
                                <Card>
                                    <CardContent className="text-center py-6 md:py-8">
                                        <div className="w-12 h-12 md:w-16 md:h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3 md:mb-4">
                                            <span className="text-gray-400 text-xl md:text-2xl">📚</span>
                                        </div>
                                        <p className="text-xs md:text-sm text-gray-500 mb-3 md:mb-4">No practice sessions found for the selected filters.</p>
                                        <button
                                            onClick={() => navigate('/practice')}
                                            className="inline-flex items-center px-3 md:px-4 py-2 bg-blue-600 text-white text-xs md:text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
                                        >
                                            Start Practicing →
                                        </button>
                                    </CardContent>
                                </Card>
                            ) : (
                                <div className="grid grid-cols-1 gap-4 md:gap-5">
                                    {filteredPracticeSessions.map((session) => (
                                        <PracticeSessionItem
                                            key={session.session_id}
                                            session={session}
                                            onClick={() => handlePracticeSessionClick(session)}
                                        />
                                    ))}
                                </div>
                            )}
                        </section>
                    )}

                    {/* Exam History Tab */}
                    {activeTab === 'exam' && !isLoading && (
                        <section>
                            {filteredExamHistory.length === 0 ? (
                                <Card>
                                    <CardContent className="text-center py-6 md:py-8">
                                        <div className="w-12 h-12 md:w-16 md:h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3 md:mb-4">
                                            <span className="text-gray-400 text-xl md:text-2xl">🎯</span>
                                        </div>
                                        <p className="text-xs md:text-sm text-gray-500 mb-3 md:mb-4">No exams found for the selected filters.</p>
                                        <button
                                            onClick={() => navigate('/exam')}
                                            className="inline-flex items-center px-3 md:px-4 py-2 bg-blue-600 text-white text-xs md:text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
                                        >
                                            Take an Exam →
                                        </button>
                                    </CardContent>
                                </Card>
                            ) : (
                                <div className="grid grid-cols-1 gap-4 md:gap-5">
                                    {filteredExamHistory.map((exam) => {
                                        const examData = {
                                            ...exam,
                                            progress: (() => {
                                                const match = exam.progress.match(/(\d+)\/(\d+)/);
                                                if (match) {
                                                    return {
                                                        completed_questions: parseInt(match[1]),
                                                        total_questions: parseInt(match[2])
                                                    };
                                                }
                                                return { completed_questions: 0, total_questions: 0 };
                                            })()
                                        };

                                        return (
                                            <ExamListItem
                                                key={exam.exam_id}
                                                exam={examData}
                                                onClick={() => {
                                                    if (exam.status === 'created' || exam.status === 'in_progress') {
                                                        navigateToExam(exam.exam_id);
                                                    } else {
                                                        navigateToExamResults(exam.exam_id);
                                                    }
                                                }}
                                            />
                                        );
                                    })}
                                </div>
                            )}
                        </section>
                    )}
                </div>
            </PageContainer>
        );
    };
    
    export default PracticeLogView;