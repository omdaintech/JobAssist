import {
    ArrowLeftIcon,
    BookOpenIcon,
    ChartBarIcon,
    CheckCircleIcon,
    ClockIcon,
    DocumentCheckIcon,
    XCircleIcon
} from '@heroicons/react/24/outline'
import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { AdminErrorDisplay } from '../components/ui/admin-error-display'
import { AdminLoadingState } from '../components/ui/admin-loading-state'
import { Button } from '../components/ui/button'
import { useAdminAuth } from '../hooks/useAdminAuth'
import { adminApi } from '../services/adminApi'
import { AdminErrorHandler, formatAdminDate } from '../utils/admin-frontend-utils'

interface SessionDetailData {
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
    exam_summary?: any
    questions?: Array<{
        question_id: string
        question_text: string
        user_answer: string
        correct_answer: string
        question_number: number
        activity_type: string
        question_data: any
        feedback_data: any
        answered_at?: string
    }>
    template?: any
}

const SessionDetailPage: React.FC = () => {
    const { userId, sessionId } = useParams<{ userId: string; sessionId: string }>()
    const { token } = useAdminAuth()
    const navigate = useNavigate()

    const [sessionDetail, setSessionDetail] = useState<SessionDetailData | null>(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [userName, setUserName] = useState<string>('')

    useEffect(() => {
        if (userId && sessionId && token) {
            loadSessionDetail()
            loadUserInfo()
        }
    }, [userId, sessionId, token])

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

    const loadSessionDetail = async () => {
        if (!userId || !sessionId || !token) return

        setLoading(true)
        AdminErrorHandler.clear(setError)

        // Get specific session detail directly
        const result = await AdminErrorHandler.handleAsync(
            async () => {
                const response = await adminApi.getSessionDetail(token, userId, sessionId)

                if (response.success && response.data) {
                    return response.data
                } else {
                    throw new Error(response.message || 'Failed to load session details')
                }
            },
            setError,
            'Load Session Detail'
        )

        if (result) {
            setSessionDetail(result)
        }

        setLoading(false)
    }

    const getSessionIcon = (sessionType: string, activityType: string) => {
        if (sessionType === 'exam') {
            return <DocumentCheckIcon className="h-6 w-6 text-purple-600" />
        }
        if (activityType === 'reading') {
            return <BookOpenIcon className="h-6 w-6 text-blue-600" />
        }
        return <ClockIcon className="h-6 w-6 text-green-600" />
    }

    const getStatusBadge = (status: string, analysisCompleted: boolean) => {
        if ((status === 'completed' || status === 'analyzed') && analysisCompleted) {
            return (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800 border border-green-200">
                    <CheckCircleIcon className="h-4 w-4 mr-1" />
                    Analyzed & Complete
                </span>
            )
        }
        if (status === 'completed' || status === 'analyzed') {
            return (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 border border-blue-200">
                    <CheckCircleIcon className="h-4 w-4 mr-1" />
                    Completed
                </span>
            )
        }
        return (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800 border border-yellow-200">
                <XCircleIcon className="h-4 w-4 mr-1" />
                In Progress
            </span>
        )
    }

    const handleBack = () => {
        navigate(`/users/${userId}/sessionhistory`)
    }

    const handleBackToUser = () => {
        navigate(`/users/${userId}`)
    }

    const calculateDuration = () => {
        if (!sessionDetail?.start_time || !sessionDetail?.completion_time) return null

        const start = new Date(sessionDetail.start_time)
        const end = new Date(sessionDetail.completion_time)
        const diffMs = end.getTime() - start.getTime()
        const diffMins = Math.round(diffMs / (1000 * 60))

        if (diffMins < 60) {
            return `${diffMins} minutes`
        } else {
            const hours = Math.floor(diffMins / 60)
            const mins = diffMins % 60
            return `${hours}h ${mins}m`
        }
    }

    if (loading) {
        return <AdminLoadingState message="Loading session details..." />
    }

    if (error) {
        return (
            <AdminErrorDisplay
                title="Failed to Load Session Details"
                message={error}
                onRetry={loadSessionDetail}
                onBack={handleBack}
            />
        )
    }

    if (!sessionDetail) {
        return (
            <AdminErrorDisplay
                title="Session Not Found"
                message="The requested session could not be found."
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
                                Back to Sessions
                            </Button>
                            <div className="border-l border-gray-300 pl-4">
                                <div className="flex items-center gap-3">
                                    {getSessionIcon(sessionDetail.session_type, sessionDetail.activity_type)}
                                    <div>
                                        <h1 className="text-2xl font-bold text-gray-900 capitalize">
                                            {sessionDetail.session_type} - {sessionDetail.activity_type}
                                        </h1>
                                        <p className="text-gray-600">{userName}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            {getStatusBadge(sessionDetail.status, sessionDetail.analysis_completed)}
                            <Button
                                variant="outline"
                                onClick={handleBackToUser}
                            >
                                View User Profile
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Session Overview */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Main Session Details */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Basic Information Card */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                            <div className="p-6 border-b border-gray-200">
                                <h2 className="text-lg font-semibold text-gray-900">Session Information</h2>
                            </div>
                            <div className="p-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-600 mb-1">Session ID</label>
                                        <p className="text-sm font-mono bg-gray-100 px-3 py-2 rounded">
                                            {sessionDetail.session_id}
                                        </p>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-600 mb-1">Type & Activity</label>
                                        <p className="text-sm capitalize">
                                            {sessionDetail.session_type} - {sessionDetail.activity_type}
                                        </p>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-600 mb-1">Level</label>
                                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                                            {sessionDetail.level}
                                        </span>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-600 mb-1">Language</label>
                                        <p className="text-sm">{sessionDetail.language || 'Not specified'}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Timeline Card */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                            <div className="p-6 border-b border-gray-200">
                                <h2 className="text-lg font-semibold text-gray-900">Timeline</h2>
                            </div>
                            <div className="p-6">
                                <div className="space-y-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                        <div>
                                            <p className="text-sm font-medium text-gray-900">Session Started</p>
                                            <p className="text-sm text-gray-600">{formatAdminDate(sessionDetail.start_time)}</p>
                                        </div>
                                    </div>

                                    {sessionDetail.completion_time && (
                                        <div className="flex items-center gap-3">
                                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                            <div>
                                                <p className="text-sm font-medium text-gray-900">Session Completed</p>
                                                <p className="text-sm text-gray-600">{formatAdminDate(sessionDetail.completion_time)}</p>
                                                {calculateDuration() && (
                                                    <p className="text-xs text-gray-500">Duration: {calculateDuration()}</p>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    <div className="flex items-center gap-3">
                                        <div className={`w-2 h-2 rounded-full ${sessionDetail.analysis_completed ? 'bg-purple-500' : 'bg-gray-300'}`}></div>
                                        <div>
                                            <p className="text-sm font-medium text-gray-900">Analysis Status</p>
                                            <p className="text-sm text-gray-600">
                                                {sessionDetail.analysis_completed ? 'Completed' : 'Pending'}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Sidebar Statistics */}
                    <div className="space-y-6">
                        {/* Progress Card */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                            <div className="p-6 border-b border-gray-200">
                                <div className="flex items-center gap-3">
                                    <ChartBarIcon className="h-5 w-5 text-gray-600" />
                                    <h3 className="text-lg font-semibold text-gray-900">Progress</h3>
                                </div>
                            </div>
                            <div className="p-6">
                                <div className="space-y-4">
                                    <div>
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-sm text-gray-600">Questions</span>
                                            <span className="text-sm font-medium">
                                                {sessionDetail.questions_answered}/{sessionDetail.total_questions}
                                            </span>
                                        </div>
                                        <div className="w-full bg-gray-200 rounded-full h-2">
                                            <div
                                                className="bg-blue-600 h-2 rounded-full"
                                                style={{
                                                    width: `${(sessionDetail.questions_answered / sessionDetail.total_questions) * 100}%`
                                                }}
                                            ></div>
                                        </div>
                                    </div>

                                    {sessionDetail.score !== undefined && (
                                        <div>
                                            <div className="flex justify-between items-center mb-2">
                                                <span className="text-sm text-gray-600">Score</span>
                                                <span className="text-sm font-medium text-green-600">
                                                    {sessionDetail.score}%
                                                </span>
                                            </div>
                                            <div className="w-full bg-gray-200 rounded-full h-2">
                                                <div
                                                    className="bg-green-600 h-2 rounded-full"
                                                    style={{ width: `${sessionDetail.score}%` }}
                                                ></div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Status Card */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                            <div className="p-6 border-b border-gray-200">
                                <h3 className="text-lg font-semibold text-gray-900">Status</h3>
                            </div>
                            <div className="p-6 space-y-3">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-gray-600">Session Status</span>
                                    <span className={`text-sm font-medium capitalize ${
                                        sessionDetail.status === 'completed' ? 'text-green-600' : 'text-yellow-600'
                                    }`}>
                                        {sessionDetail.status}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-gray-600">Analysis</span>
                                    <span className={`text-sm font-medium ${
                                        sessionDetail.analysis_completed ? 'text-green-600' : 'text-gray-600'
                                    }`}>
                                        {sessionDetail.analysis_completed ? 'Complete' : 'Pending'}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-gray-600">Feedback</span>
                                    <span className={`text-sm font-medium ${
                                        sessionDetail.has_feedback ? 'text-green-600' : 'text-gray-600'
                                    }`}>
                                        {sessionDetail.has_feedback ? 'Available' : 'Not available'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Additional session details could go here - exam summary, question details, etc. */}
                {sessionDetail.analysis_completed && sessionDetail.has_feedback && (
                    <div className="mt-8">
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                            <div className="p-6 border-b border-gray-200">
                                <h2 className="text-lg font-semibold text-gray-900">Analysis Summary</h2>
                            </div>
                            <div className="p-6">
                                <p className="text-sm text-gray-600">
                                    Detailed analysis and feedback are available for this session.
                                    This section could be expanded to show the actual exam summary and feedback details.
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

export default SessionDetailPage
