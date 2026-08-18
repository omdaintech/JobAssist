import {
    ArrowPathIcon,
    CalendarIcon,
    ChartBarIcon,
    ChatBubbleLeftIcon,
    ClockIcon,
    EnvelopeIcon,
    FireIcon,
    UserGroupIcon,
    UserPlusIcon
} from '@heroicons/react/24/outline'
import { useEffect, useState } from 'react'
import { AdminErrorDisplay } from '../components/ui/admin-error-display'
import { AdminLoadingState } from '../components/ui/admin-loading-state'
import { StatsCard } from '../components/ui/stats-card'
import { useAdminAuth } from '../hooks/useAdminAuth'
import { adminApi, DashboardStatsData, LanguageOption } from '../services/adminApi'
import { AdminErrorHandler } from '../utils/admin-frontend-utils'

// Time filter presets (in hours)
const TIME_FILTER_OPTIONS = [
    { value: 24, label: '24 Hours' },
    { value: 48, label: '48 Hours' },
    { value: 168, label: '7 Days' },
    { value: 720, label: '30 Days' }
]

export default function DashboardPage() {
    const { token } = useAdminAuth()
    const [stats, setStats] = useState<DashboardStatsData | null>(null)
    const [languages, setLanguages] = useState<LanguageOption[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    
    // Filter states
    const [selectedHours, setSelectedHours] = useState<number>(168) // Default: 7 days
    const [selectedLanguageId, setSelectedLanguageId] = useState<string>('')
    const [useCustomRange, setUseCustomRange] = useState(false)
    const [startDate, setStartDate] = useState<string>('')
    const [endDate, setEndDate] = useState<string>('')

    // Set page title
    useEffect(() => {
        document.title = 'Analytics Dashboard | One-CEFR'
    }, [])

    // Load language options on mount
    useEffect(() => {
        if (token) {
            loadLanguageOptions()
        }
    }, [token])

    // Load stats when token or filters change
    useEffect(() => {
        if (token) {
            fetchStats()
        }
    }, [token, selectedHours, selectedLanguageId, startDate, endDate, useCustomRange])

    const loadLanguageOptions = async () => {
        if (!token) return

        const result = await AdminErrorHandler.handleAsync(
            async () => {
                const response = await adminApi.getDashboardLanguageOptions(token)
                return response.success ? response.data : []
            },
            setError,
            'Language Options'
        )

        if (result) {
            setLanguages(result)
        }
    }

    const fetchStats = async () => {
        if (!token) return

        setLoading(true)
        AdminErrorHandler.clear(setError)

        const result = await AdminErrorHandler.handleAsync(
            async () => {
                const response = await adminApi.getAnalyticsDashboardStats(
                    token,
                    useCustomRange ? undefined : selectedHours,
                    useCustomRange ? startDate : undefined,
                    useCustomRange ? endDate : undefined,
                    selectedLanguageId || undefined
                )
                return response.success ? response.data : null
            },
            setError,
            'Analytics Dashboard'
        )

        if (result) {
            setStats(result)
        }

        setLoading(false)
    }

    const handleRefresh = () => {
        fetchStats()
    }

    const handleTimeFilterChange = (hours: number) => {
        setSelectedHours(hours)
        setUseCustomRange(false)
        setStartDate('')
        setEndDate('')
    }

    const handleCustomDateRange = () => {
        if (startDate && endDate) {
            setUseCustomRange(true)
        }
    }

    const handleRetry = () => {
        fetchStats()
    }

    if (loading) {
        return <AdminLoadingState message="Loading analytics dashboard..." />
    }

    if (error) {
        return (
            <AdminErrorDisplay
                title="Failed to Load Dashboard"
                message={error}
                onRetry={handleRetry}
            />
        )
    }

    if (!stats) {
        return (
            <AdminErrorDisplay
                title="No Data Available"
                message="Unable to load dashboard statistics"
                onRetry={handleRetry}
            />
        )
    }

    return (
        <div className="space-y-6">
            {/* Header with Filters */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-3xl font-bold tracking-tight">Analytics Dashboard</h2>
                        <p className="text-muted-foreground">
                            System-wide analytics and user activity metrics
                        </p>
                    </div>
                    <button
                        onClick={handleRefresh}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border bg-card hover:bg-accent transition-colors"
                    >
                        <ArrowPathIcon className="h-4 w-4" />
                        Refresh
                    </button>
                </div>

                {/* Filters Row */}
                <div className="flex flex-wrap gap-4 items-end">
                    {/* Time Filter Dropdown */}
                    <div className="flex-1 min-w-[200px]">
                        <label className="block text-sm font-medium mb-2">Time Period</label>
                        <select
                            value={selectedHours}
                            onChange={(e) => handleTimeFilterChange(Number(e.target.value))}
                            disabled={useCustomRange}
                            className="w-full px-3 py-2 rounded-lg border bg-card focus:outline-none focus:ring-2 focus:ring-eu-blue disabled:opacity-50"
                        >
                            {TIME_FILTER_OPTIONS.map(option => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Custom Date Range */}
                    <div className="flex gap-2 items-end">
                        <div>
                            <label className="block text-sm font-medium mb-2">From Date</label>
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="px-3 py-2 rounded-lg border bg-card focus:outline-none focus:ring-2 focus:ring-eu-blue"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-2">To Date</label>
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="px-3 py-2 rounded-lg border bg-card focus:outline-none focus:ring-2 focus:ring-eu-blue"
                            />
                        </div>
                        <button
                            onClick={handleCustomDateRange}
                            disabled={!startDate || !endDate}
                            className="px-4 py-2 rounded-lg bg-eu-blue text-white hover:bg-eu-blue/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            Apply Range
                        </button>
                    </div>

                    {/* Language Filter */}
                    <div className="flex-1 min-w-[200px]">
                        <label className="block text-sm font-medium mb-2">Language</label>
                        <select
                            value={selectedLanguageId}
                            onChange={(e) => setSelectedLanguageId(e.target.value)}
                            className="w-full px-3 py-2 rounded-lg border bg-card focus:outline-none focus:ring-2 focus:ring-eu-blue"
                        >
                            <option value="">All Languages</option>
                            {languages.map(lang => (
                                <option key={lang.id} value={lang.id}>
                                    {lang.name} ({lang.code})
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Active Filter Display */}
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <ClockIcon className="h-4 w-4" />
                    <span>
                        {stats.time_period_label || `Last ${selectedHours} hours`}
                    </span>
                    {stats.language_filter && (
                        <>
                            <span className="mx-2">•</span>
                            <span>Language: {stats.language_filter}</span>
                        </>
                    )}
                    <span className="mx-2">•</span>
                    <span>Updated: {new Date(stats.generated_at).toLocaleString()}</span>
                </div>
            </div>

            {/* Stats Cards Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {/* Total Sessions */}
                <StatsCard
                    title="Total Sessions"
                    value={stats.total_sessions.toLocaleString()}
                    change="All user sessions"
                    changeType="neutral"
                    icon={<ChartBarIcon />}
                />

                {/* Done Analysis (with success rate) */}
                <StatsCard
                    title="Done Analysis"
                    value={stats.analyzed_sessions.toLocaleString()}
                    change={`${stats.analysis_success_rate.toFixed(1)}% completion rate`}
                    changeType={stats.analysis_success_rate > 80 ? 'positive' : 'neutral'}
                    icon={<ChartBarIcon />}
                />

                {/* Total Exams (with percentage) */}
                <StatsCard
                    title="Total Exams"
                    value={stats.total_exams.toLocaleString()}
                    change={`${stats.exam_percentage.toFixed(1)}% of sessions`}
                    changeType="neutral"
                    icon={<ClockIcon />}
                />

                {/* Total Practice (with percentage) */}
                <StatsCard
                    title="Total Practice"
                    value={stats.total_practice.toLocaleString()}
                    change={`${stats.practice_percentage.toFixed(1)}% of sessions`}
                    changeType="neutral"
                    icon={<FireIcon />}
                />

                {/* New Users */}
                <StatsCard
                    title="New Users"
                    value={stats.new_users.toLocaleString()}
                    change="User registrations"
                    changeType="positive"
                    icon={<UserPlusIcon />}
                />

                {/* Top Activity */}
                <StatsCard
                    title="Top Activity"
                    value={stats.top_activity.display_name}
                    change={`${stats.top_activity.count} sessions`}
                    changeType="neutral"
                    icon={<FireIcon />}
                />

                {/* New Feedback */}
                <StatsCard
                    title="New Feedback"
                    value={stats.new_feedback.toLocaleString()}
                    change="User feedback messages"
                    changeType={stats.new_feedback > 0 ? 'positive' : 'neutral'}
                    icon={<ChatBubbleLeftIcon />}
                />

                {/* New Contact */}
                <StatsCard
                    title="New Contact"
                    value={stats.new_contact.toLocaleString()}
                    change="Contact us messages"
                    changeType={stats.new_contact > 0 ? 'positive' : 'neutral'}
                    icon={<EnvelopeIcon />}
                />
            </div>

            {/* Summary Section */}
            <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
                <div className="p-6">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                        <UserGroupIcon className="h-5 w-5" />
                        Activity Summary
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">
                        Overview of user engagement and system usage
                    </p>
                </div>
                <div className="p-6 pt-0 space-y-4">
                    <SummaryItem
                        label="Session Completion Rate"
                        value={`${stats.analysis_success_rate.toFixed(1)}%`}
                        description={`${stats.analyzed_sessions} out of ${stats.total_sessions} sessions completed`}
                    />
                    <SummaryItem
                        label="Exam vs Practice Distribution"
                        value={`${stats.exam_percentage.toFixed(1)}% / ${stats.practice_percentage.toFixed(1)}%`}
                        description="Ratio of exam sessions to practice sessions"
                    />
                    <SummaryItem
                        label="Most Popular Activity"
                        value={stats.top_activity.display_name}
                        description={`${stats.top_activity.count} sessions (${stats.top_activity.activity_type})`}
                    />
                    <SummaryItem
                        label="User Engagement"
                        value={`${stats.new_users} new registrations`}
                        description="New users joined during this period"
                    />
                    {(stats.new_feedback > 0 || stats.new_contact > 0) && (
                        <SummaryItem
                            label="User Messages"
                            value={`${stats.new_feedback + stats.new_contact} total`}
                            description={`${stats.new_feedback} feedback, ${stats.new_contact} contact messages`}
                        />
                    )}
                </div>
            </div>

            {/* Date Range Info */}
            <div className="rounded-lg border bg-muted/50 p-4">
                <div className="flex items-center gap-2 text-sm">
                    <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">Data Range:</span>
                    <span className="text-muted-foreground">
                        {new Date(stats.start_date).toLocaleDateString()} - {new Date(stats.end_date).toLocaleDateString()}
                    </span>
                    <span className="mx-2 text-muted-foreground">•</span>
                    <span className="text-muted-foreground">
                        {stats.time_period_hours ? `${stats.time_period_hours} hours` : stats.time_period_label}
                    </span>
                </div>
            </div>
        </div>
    )
}

function SummaryItem({ label, value, description }: {
    label: string
    value: string
    description: string
}) {
    return (
        <div className="flex items-start justify-between py-3 border-b last:border-0">
            <div className="space-y-1">
                <p className="text-sm font-medium">{label}</p>
                <p className="text-xs text-muted-foreground">{description}</p>
            </div>
            <div className="text-right">
                <p className="text-lg font-semibold text-eu-blue">{value}</p>
            </div>
        </div>
    )
}
