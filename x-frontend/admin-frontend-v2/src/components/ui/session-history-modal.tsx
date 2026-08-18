import {
    BookOpenIcon,
    ClockIcon,
    DocumentCheckIcon,
    EyeIcon,
    XMarkIcon
} from '@heroicons/react/24/outline'
import React, { useEffect, useState } from 'react'
import { adminApi } from '../../services/adminApi'
import { ADMIN_BUTTON_TEXTS, AdminErrorHandler, formatAdminDate } from '../../utils/admin-frontend-utils'
import { AdminErrorDisplay } from './admin-error-display'
import { AdminLoadingState } from './admin-loading-state'
import { Button } from './button'

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
}

interface SessionHistoryModalProps {
    isOpen: boolean
    onClose: () => void
    userId: string
    userName: string
    token: string
}

const SessionHistoryModal: React.FC<SessionHistoryModalProps> = ({
    isOpen,
    onClose,
    userId,
    userName,
    token
}) => {
    const [sessions, setSessions] = useState<SessionHistoryData[]>([])
    const [filteredSessions, setFilteredSessions] = useState<SessionHistoryData[]>([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [selectedSession, setSelectedSession] = useState<SessionHistoryData | null>(null)
    const [showDetailsModal, setShowDetailsModal] = useState(false)
    const [filterType, setFilterType] = useState<'all' | 'completed' | 'analyzed'>('all')

    useEffect(() => {
        if (isOpen && userId && token) {
            loadSessionHistory()
        }
    }, [isOpen, userId, token])

    useEffect(() => {
        // Apply filters
        let filtered = sessions

        if (filterType === 'completed') {
            filtered = sessions.filter(s => s.status === 'completed')
        } else if (filterType === 'analyzed') {
            filtered = sessions.filter(s => s.analysis_completed)
        }

        setFilteredSessions(filtered)
    }, [sessions, filterType])

        const loadSessionHistory = async () => {
        setLoading(true)
        AdminErrorHandler.clear(setError)

        const result = await AdminErrorHandler.handleAsync(
            async () => {
                const response = await adminApi.getUserSessionHistory(token, userId)

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

    const openSessionDetails = (session: SessionHistoryData) => {
        setSelectedSession(session)
        setShowDetailsModal(true)
    }

    if (!isOpen) return null

    return (
        <>
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
                <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
                    {/* Header */}
                    <div className="p-6 border-b border-gray-200">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900">Session History</h3>
                                <p className="text-sm text-gray-600 mt-1">{userName} - All sessions</p>
                            </div>
                            <Button
                                onClick={onClose}
                                variant="ghost"
                                className="h-8 w-8 p-0"
                            >
                                <XMarkIcon className="h-4 w-4" />
                            </Button>
                        </div>

                        {/* Filters */}
                        <div className="mt-4 flex gap-2">
                            {[
                                { key: 'all', label: 'All Sessions' },
                                { key: 'completed', label: 'Completed Only' },
                                { key: 'analyzed', label: 'Analyzed Only' }
                            ].map(filter => (
                                <Button
                                    key={filter.key}
                                    variant={filterType === filter.key ? 'default' : 'outline'}
                                    onClick={() => setFilterType(filter.key as any)}
                                    className="text-xs px-3 py-1"
                                >
                                    {filter.label}
                                </Button>
                            ))}
                        </div>
                    </div>

                    {/* Content */}
                    <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
                        {loading ? (
                            <AdminLoadingState message="Loading session history..." />
                        ) : error ? (
                            <AdminErrorDisplay
                                title="Failed to Load Sessions"
                                message={error}
                                onRetry={loadSessionHistory}
                            />
                        ) : filteredSessions.length === 0 ? (
                            <div className="text-center py-8">
                                <ClockIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                                <p className="text-gray-600">No sessions found</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {filteredSessions.map((session) => (
                                    <div key={session.session_id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
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
                                            <div className="flex items-center gap-3">
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
                                                    onClick={() => openSessionDetails(session)}
                                                    variant="outline"
                                                    className="h-8 w-8 p-0"
                                                >
                                                    <EyeIcon className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="p-6 border-t border-gray-200 flex justify-end">
                        <Button onClick={onClose}>
                            {ADMIN_BUTTON_TEXTS.close}
                        </Button>
                    </div>
                </div>
            </div>

            {/* Session Details Modal */}
            {showDetailsModal && selectedSession && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-60">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden">
                        <div className="p-6 border-b border-gray-200">
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-semibold text-gray-900">Session Details</h3>
                                <Button
                                    onClick={() => setShowDetailsModal(false)}
                                    variant="ghost"
                                    className="h-8 w-8 p-0"
                                >
                                    <XMarkIcon className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-600 mb-1">Session ID</label>
                                        <p className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">{selectedSession.session_id}</p>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-600 mb-1">Type</label>
                                        <p className="text-sm capitalize">{selectedSession.session_type} - {selectedSession.activity_type}</p>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-600 mb-1">Level</label>
                                        <p className="text-sm">{selectedSession.level}</p>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-600 mb-1">Status</label>
                                        {getStatusBadge(selectedSession.status, selectedSession.analysis_completed)}
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-600 mb-1">Progress</label>
                                        <p className="text-sm">{selectedSession.questions_answered}/{selectedSession.total_questions} questions</p>
                                    </div>
                                    {selectedSession.score && (
                                        <div>
                                            <label className="block text-sm font-medium text-gray-600 mb-1">Score</label>
                                            <p className="text-sm font-medium text-green-600">{selectedSession.score}%</p>
                                        </div>
                                    )}
                                </div>

                                <div className="pt-4 border-t border-gray-200">
                                    <h4 className="font-medium text-gray-900 mb-2">Timeline</h4>
                                    <div className="space-y-2 text-sm">
                                        <p><span className="font-medium">Started:</span> {formatAdminDate(selectedSession.start_time)}</p>
                                        {selectedSession.completion_time && (
                                            <p><span className="font-medium">Completed:</span> {formatAdminDate(selectedSession.completion_time)}</p>
                                        )}
                                        <p><span className="font-medium">Analysis:</span> {selectedSession.analysis_completed ? 'Completed' : 'Pending'}</p>
                                        <p><span className="font-medium">Feedback:</span> {selectedSession.has_feedback ? 'Available' : 'Not available'}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="p-6 border-t border-gray-200 flex justify-end">
                            <Button onClick={() => setShowDetailsModal(false)}>
                                {ADMIN_BUTTON_TEXTS.close}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}

export default SessionHistoryModal
