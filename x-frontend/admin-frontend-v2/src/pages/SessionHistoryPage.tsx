import {
    ArrowLeftIcon,
    BookOpenIcon,
    ClockIcon,
    DocumentCheckIcon,
    EyeIcon,
    FunnelIcon
} from '@heroicons/react/24/outline'
import React, { useEffect, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { AdminErrorDisplay } from '../components/ui/admin-error-display'
import { AdminLoadingState } from '../components/ui/admin-loading-state'
import { Button } from '../components/ui/button'
import { useAdminAuth } from '../hooks/useAdminAuth'
import { adminApi } from '../services/adminApi'
import { AdminErrorHandler, formatAdminDate } from '../utils/admin-frontend-utils'

interface SessionHistoryData {
    session_id: string
    session_type: 'exam' | 'practice'
    activity_type: string
    level: string
    status: string
    start_time: string
    completion_time?: string
    questions_answered: number
    total_questions: number
    analysis_completed: boolean
    has_feedback: boolean
    score?: number
    language?: string
    created_at?: string
}

const SessionHistoryPage: React.FC = () => {
    const { userId } = useParams<{ userId: string }>()
    const { token } = useAdminAuth()
    const navigate = useNavigate()
    const [searchParams, setSearchParams] = useSearchParams()

    const [sessions, setSessions] = useState<SessionHistoryData[]>([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [userName, setUserName] = useState<string>('')

    // Filter states from URL params
    const [filterType, setFilterType] = useState<'all' | 'completed' | 'analyzed'>(
        (searchParams.get('filter') as any) || 'all'
    )
    const [sessionTypeFilter, setSessionTypeFilter] = useState<'all' | 'exam' | 'practice'>(
        (searchParams.get('session_type') as any) || 'all'
    )
    const [activityTypeFilter, setActivityTypeFilter] = useState<'all' | 'reading' | 'writing' | 'grammar' | 'hearing'>(
        (searchParams.get('activity_type') as any) || 'all'
    )
    const [levelFilter, setLevelFilter] = useState<'all' | 'A1' | 'A2' | 'B1'>(
        (searchParams.get('level') as any) || 'all'
    )

    useEffect(() => {
        if (userId && token) {
            loadSessionHistory()
            loadUserInfo()
        }
    }, [userId, token, filterType, sessionTypeFilter, activityTypeFilter, levelFilter])

    // Update URL params when filters change
    useEffect(() => {
        const params = new URLSearchParams()
        if (filterType !== 'all') params.set('filter', filterType)
        if (sessionTypeFilter !== 'all') params.set('session_type', sessionTypeFilter)
        if (activityTypeFilter !== 'all') params.set('activity_type', activityTypeFilter)
        if (levelFilter !== 'all') params.set('level', levelFilter)

        setSearchParams(params)
    }, [filterType, sessionTypeFilter, activityTypeFilter, levelFilter, setSearchParams])

    const loadUserInfo = async () => {
        if (!userId || !token) return

        const result = await AdminErrorHandler.handleAsync(
            async () => {
                // Use mini endpoint for better performance - only gets name, email, level
                const response = await adminApi.getMiniUserDetails(token, userId)
                if (response.success && response.data) {
                    return response.data.name || response.data.email || 'Unknown User'
                }
                return 'Unknown User'
            },
            () => {}, // Don't set error for user info failure
            'Load User Info'
        )

        if (result) {
            setUserName(result)
        }
    }

    const loadSessionHistory = async () => {
        if (!userId || !token) return

        setLoading(true)
        AdminErrorHandler.clear(setError)

        const filters: any = {}

        // Apply filters based on state
        if (sessionTypeFilter !== 'all') {
            filters.session_type = sessionTypeFilter
        }

        if (filterType === 'completed') {
            filters.status_filter = 'completed'
        } else if (filterType === 'analyzed') {
            filters.status_filter = 'analyzed'
        }

        if (activityTypeFilter !== 'all') {
            filters.activity_type = activityTypeFilter
        }

        if (levelFilter !== 'all') {
            filters.level = levelFilter
        }

        const result = await AdminErrorHandler.handleAsync(
            async () => {
                const response = await adminApi.getUserSessionHistory(token, userId, filters)

                if (response.success && response.data) {
                    return response.data.sessions || []
                } else {
                    throw new Error(response.message || 'Failed to load session history')
                }
            },
            setError,
            'Load Session History'
        )

        if (result) {
            setSessions(result)
        }

        setLoading(false)
    }

    const getSessionIcon = (sessionType: string, activityType: string) => {
        if (sessionType === 'exam') {
            return <DocumentCheckIcon className="h-5 w-5 text-purple-600" />
        }
        if (activityType === 'reading') {
            return <BookOpenIcon className="h-5 w-5 text-blue-600" />
        }
        return <ClockIcon className="h-5 w-5 text-green-600" />
    }

    const getStatusBadge = (status: string, analysisCompleted: boolean) => {
        if ((status === 'completed' || status === 'analyzed') && analysisCompleted) {
            return (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    ✅ Analyzed
                </span>
            )
        }
        if (status === 'completed' || status === 'analyzed') {
            return (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    🔄 Completed
                </span>
            )
        }
        return (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                ⏳ In Progress
            </span>
        )
    }

    const handleViewSession = (sessionId: string) => {
        navigate(`/users/${userId}/sessionhistory/${sessionId}`)
    }

    const handleBack = () => {
        navigate(`/users/${userId}`)
    }

    const clearFilters = () => {
        setFilterType('all')
        setSessionTypeFilter('all')
        setActivityTypeFilter('all')
        setLevelFilter('all')
    }

    if (loading && sessions.length === 0) {
        return <AdminLoadingState message="Loading session history..." />
    }

    if (error && sessions.length === 0) {
        return (
            <AdminErrorDisplay
                title="Failed to Load Session History"
                message={error}
                onRetry={loadSessionHistory}
                onBack={handleBack}
            />
        )
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white border-b border-gray-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between py-6">
                        <div className="flex items-center gap-4">
                            <Button
                                variant="ghost"
                                onClick={handleBack}
                                className="flex items-center gap-2"
                            >
                                <ArrowLeftIcon className="h-4 w-4" />
                                Back to User
                            </Button>
                            <div className="border-l border-gray-300 pl-4">
                                <h1 className="text-2xl font-bold text-gray-900">Session History</h1>
                                <p className="text-gray-600">{userName}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-600">
                                {sessions.length} session{sessions.length !== 1 ? 's' : ''}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Filters */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
                    <div className="flex items-center gap-2 mb-4">
                        <FunnelIcon className="h-5 w-5 text-gray-400" />
                        <h3 className="text-lg font-medium text-gray-900">Filters</h3>
                        <Button
                            variant="ghost"
                            onClick={clearFilters}
                            className="ml-auto text-sm"
                        >
                            Clear All
                        </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {/* Status Filter */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                            <select
                                value={filterType}
                                onChange={(e) => setFilterType(e.target.value as any)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                                <option value="all">All Sessions</option>
                                <option value="completed">Completed Only</option>
                                <option value="analyzed">Analyzed Only</option>
                            </select>
                        </div>

                        {/* Session Type Filter */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Session Type</label>
                            <select
                                value={sessionTypeFilter}
                                onChange={(e) => setSessionTypeFilter(e.target.value as any)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                                <option value="all">All Types</option>
                                <option value="exam">Exams</option>
                                <option value="practice">Practice</option>
                            </select>
                        </div>

                        {/* Activity Type Filter */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Activity</label>
                            <select
                                value={activityTypeFilter}
                                onChange={(e) => setActivityTypeFilter(e.target.value as any)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                                <option value="all">All Activities</option>
                                <option value="reading">Reading</option>
                                <option value="writing">Writing</option>
                                <option value="grammar">Grammar</option>
                                <option value="hearing">Hearing</option>
                            </select>
                        </div>

                        {/* Level Filter */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Level</label>
                            <select
                                value={levelFilter}
                                onChange={(e) => setLevelFilter(e.target.value as any)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                                <option value="all">All Levels</option>
                                <option value="A1">A1</option>
                                <option value="A2">A2</option>
                                <option value="B1">B1</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Session List */}
                {loading ? (
                    <div className="text-center py-8">
                        <AdminLoadingState message="Updating filters..." />
                    </div>
                ) : sessions.length === 0 ? (
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
                        <ClockIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-600">No sessions found with current filters</p>
                        <Button
                            onClick={clearFilters}
                            variant="outline"
                            className="mt-4"
                        >
                            Clear Filters
                        </Button>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {sessions.map((session) => (
                            <div key={session.session_id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        {getSessionIcon(session.session_type, session.activity_type)}
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h4 className="font-medium text-gray-900 capitalize">
                                                    {session.session_type} - {session.activity_type}
                                                </h4>
                                                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                                    {session.level}
                                                </span>
                                            </div>
                                            <p className="text-sm text-gray-600">
                                                Started: {formatAdminDate(session.start_time)}
                                            </p>
                                            {session.completion_time && (
                                                <p className="text-sm text-gray-600">
                                                    Completed: {formatAdminDate(session.completion_time)}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="text-right">
                                            <p className="text-sm text-gray-600">
                                                {session.questions_answered}/{session.total_questions} questions
                                            </p>
                                            {session.score && (
                                                <p className="text-sm font-medium text-green-600">
                                                    Score: {session.score}%
                                                </p>
                                            )}
                                        </div>
                                        {getStatusBadge(session.status, session.analysis_completed)}
                                        <Button
                                            onClick={() => handleViewSession(session.session_id)}
                                            variant="outline"
                                            className="flex items-center gap-2"
                                        >
                                            <EyeIcon className="h-4 w-4" />
                                            View Details
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}

export default SessionHistoryPage
