import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCircleIcon, ClockIcon, QueueListIcon, ArrowPathIcon, BookOpenIcon, PencilSquareIcon, AcademicCapIcon, SpeakerWaveIcon } from '@heroicons/react/24/outline'

import { AdminErrorDisplay } from '../components/ui/admin-error-display'
import { AdminLoadingState } from '../components/ui/admin-loading-state'
import { Button } from '../components/ui/button'
import { useAdminAuth } from '../hooks/useAdminAuth'
import { adminApi, type QuestionDashboardLanguageSummary, type QuestionDashboardSummary } from '../services/adminApi'
import { AdminErrorHandler } from '../utils/admin-frontend-utils'

type AvailableLanguage = {
    id: string;
    name: string;
    native_name: string | null;
    is_active: boolean;
    supported_levels?: string[];
}

type DashboardStatusKey = 'total' | 'ready' | 'pending_review'

type StatusConfig = {
    label: string
    description: string
    reviewValue?: 'true' | 'false'
    accentClasses: string
    icon: typeof QueueListIcon
}

const STATUS_CONFIG: Record<DashboardStatusKey, StatusConfig> = {
    total: {
        label: 'Total questions',
        description: 'All questions saved in the bank',
        accentClasses: 'border-sky-500/50 bg-sky-50 text-sky-600 hover:bg-sky-100',
        icon: QueueListIcon
    },
    ready: {
        label: 'Ready (reviewed)',
        description: 'Reviewed and approved for use',
        reviewValue: 'true',
        accentClasses: 'border-emerald-500/50 bg-emerald-50 text-emerald-600 hover:bg-emerald-100',
        icon: CheckCircleIcon
    },
    pending_review: {
        label: 'Pending review',
        description: 'Awaiting quality review',
        reviewValue: 'false',
        accentClasses: 'border-amber-500/50 bg-amber-50 text-amber-600 hover:bg-amber-100',
        icon: ClockIcon
    }
}

const STATUS_ORDER: DashboardStatusKey[] = ['total', 'ready', 'pending_review']

type ActivityTypeKey = 'reading' | 'writing' | 'grammar' | 'hearing' | 'speaking'

type ActivityConfig = {
    label: string
    description: string
    icon: typeof BookOpenIcon
    accentClasses: string
}

const ACTIVITY_CONFIG: Record<ActivityTypeKey, ActivityConfig> = {
    reading: {
        label: 'Reading',
        description: 'Reading comprehension questions',
        icon: BookOpenIcon,
        accentClasses: 'border-blue-500/50 bg-blue-50 text-blue-600 hover:bg-blue-100'
    },
    writing: {
        label: 'Writing',
        description: 'Writing exercises and prompts',
        icon: PencilSquareIcon,
        accentClasses: 'border-purple-500/50 bg-purple-50 text-purple-600 hover:bg-purple-100'
    },
    grammar: {
        label: 'Grammar',
        description: 'Grammar rules and exercises',
        icon: AcademicCapIcon,
        accentClasses: 'border-green-500/50 bg-green-50 text-green-600 hover:bg-green-100'
    },
    hearing: {
        label: 'Hearing',
        description: 'Listening comprehension questions',
        icon: SpeakerWaveIcon,
        accentClasses: 'border-red-500/50 bg-red-50 text-red-600 hover:bg-red-100'
    },
    speaking: {
        label: 'Speaking',
        description: 'Speaking practice and oral exams',
        icon: SpeakerWaveIcon,
        accentClasses: 'border-orange-500/50 bg-orange-50 text-orange-600 hover:bg-orange-100'
    }
}

const ACTIVITY_ORDER: ActivityTypeKey[] = ['reading', 'writing', 'grammar', 'hearing', 'speaking']

function formatNumber(value: number): string {
    return value.toLocaleString(undefined, { maximumFractionDigits: 0 })
}

export default function QuestionsDashboardPage() {
    const navigate = useNavigate()
    const { token } = useAdminAuth()

    const [summary, setSummary] = useState<QuestionDashboardSummary | null>(null)
    const [availableLanguages, setAvailableLanguages] = useState<AvailableLanguage[]>([])
    const [languagesLoading, setLanguagesLoading] = useState<boolean>(true)
    const [selectedLanguageId, setSelectedLanguageId] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState<boolean>(true)
    const [error, setError] = useState<string | null>(null)

    // Fetch active languages from API
    const fetchLanguages = useCallback(async () => {
        if (!token) {
            setLanguagesLoading(false)
            return
        }

        setLanguagesLoading(true)
        const result = await AdminErrorHandler.handleAsync(
            async () => {
                const response = await adminApi.getActiveLanguages(token)
                if (response.success && response.data) {
                    return response.data.languages
                }
                throw new Error(response.message || 'Failed to load active languages')
            },
            setError,
            'Active Languages'
        )

        if (result) {
            setAvailableLanguages(result)
        }
        setLanguagesLoading(false)
    }, [token])

    const fetchSummary = useCallback(async (languageId: string) => {
        if (!token || !languageId) {
            if (!languageId) {
                setSummary(null)
            }
            if (!token) {
                setSelectedLanguageId(null)
            }
            setIsLoading(false)
            return
        }

        AdminErrorHandler.clear(setError)
        setIsLoading(true)

        const data = await AdminErrorHandler.handleAsync<QuestionDashboardSummary>(
            async () => {
                const response = await adminApi.getQuestionDashboardSummary(token, languageId)
                if (response.success && response.data) {
                    return response.data
                }
                throw new Error(response.message || 'Failed to load question dashboard summary')
            },
            setError,
            'Question Dashboard Summary'
        )

        if (data) {
            setSummary(data)
        }

        setIsLoading(false)
    }, [token])

    useEffect(() => {
        if (!token) {
            setSummary(null)
            setSelectedLanguageId(null)
            setIsLoading(false)
            setLanguagesLoading(false)
            return
        }

        void fetchLanguages()
    }, [token, fetchLanguages])

    // Refetch summary when language changes
    useEffect(() => {
        if (!token) {
            return
        }

        if (!selectedLanguageId) {
            setSummary(null)
            if (!languagesLoading) {
                setIsLoading(false)
            }
            return
        }

        void fetchSummary(selectedLanguageId)
    }, [selectedLanguageId, token, fetchSummary, languagesLoading])

    useEffect(() => {
        if (!selectedLanguageId) {
            return
        }

        const exists = availableLanguages.some(language => language.id === selectedLanguageId)
        if (!exists) {
            setSelectedLanguageId(null)
        }
    }, [availableLanguages, selectedLanguageId])



    const activeLanguage: QuestionDashboardLanguageSummary | undefined = useMemo(() => {
        return summary?.language_summary ?? undefined
    }, [summary])
    const noDataForSelection = Boolean(selectedLanguageId && summary && !summary?.language_summary)

    const handleSelectLanguage = useCallback((languageId: string) => {
        setSelectedLanguageId(languageId)
    }, [])

    const handleNavigateToList = (
        languageId?: string,
        level?: string,
        reviewState?: 'true' | 'false',
        activityType?: string
    ) => {
        const targetLanguage =
            languageId ??
            selectedLanguageId ??
            activeLanguage?.language_id
        
        if (!targetLanguage) {
            console.error('No language selected or available')
            return
        }
        
        const queryParams = new URLSearchParams()
        
        queryParams.set('language_id', targetLanguage)
        
        if (level) {
            queryParams.set('level', level)
        }
        
        if (reviewState !== undefined) {
            queryParams.set('reviewed', reviewState)
        }
        
        if (activityType) {
            queryParams.set('activity_type', activityType)
        }

        navigate(`/questions/list?${queryParams.toString()}`, {
            state: {
                presetFilters: Object.fromEntries(queryParams.entries())
            }
        })
    }

    if (isLoading) {
        return <AdminLoadingState message="Loading question inventory" />
    }

    if (error) {
        return <AdminErrorDisplay message={error} onRetry={() => {
            setIsLoading(true)
            void fetchLanguages().then(() => {
                if (selectedLanguageId) {
                    void fetchSummary(selectedLanguageId)
                } else {
                    setSummary(null)
                    setIsLoading(false)
                }
            })
        }} />
    }

    if (availableLanguages.length === 0) {
        return (
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold tracking-tight">Questions Dashboard</h1>
                        <p className="text-muted-foreground">No active languages returned from the API. Add a language or refresh once languages are available.</p>
                    </div>
                    <Button onClick={() => {
                        setIsLoading(true)
                        void fetchLanguages().then(() => {
                            if (selectedLanguageId) {
                                void fetchSummary(selectedLanguageId)
                            } else {
                                setSummary(null)
                                setIsLoading(false)
                            }
                        })
                    }} variant="outline" className="gap-2">
                        <ArrowPathIcon className="h-4 w-4" /> Refresh
                    </Button>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="space-y-1">
                    <h1 className="text-2xl font-semibold tracking-tight">Questions Dashboard</h1>
                    <p className="text-sm text-muted-foreground">
                        Monitor inventory health by language, CEFR level, and review status. Click any metric to jump straight into the detailed list.
                    </p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Button variant="outline" className="gap-2" onClick={() => {
                        setIsLoading(true)
                        void fetchLanguages().then(() => {
                            if (selectedLanguageId) {
                                void fetchSummary(selectedLanguageId)
                            } else {
                                setSummary(null)
                                setIsLoading(false)
                            }
                        })
                    }}>
                        <ArrowPathIcon className="h-4 w-4" />
                        Refresh
                    </Button>
                    <Button onClick={() => handleNavigateToList(activeLanguage?.language_id)} disabled={!selectedLanguageId}>
                        Go to question list
                    </Button>
                </div>
            </div>



            <div className="border rounded-lg bg-white shadow-sm">
                <div className="border-b px-4 py-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <h2 className="text-lg font-semibold">Languages</h2>
                            <p className="text-sm text-muted-foreground">Switch between available languages to inspect question readiness.</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {availableLanguages.map(language => (
                                <button
                                    key={language.id}
                                    type="button"
                                    onClick={() => handleSelectLanguage(language.id)}
                                    className={`rounded-full border px-4 py-1.5 text-sm transition ${
                                        selectedLanguageId === language.id
                                            ? 'border-eu-blue bg-eu-blue/10 text-eu-blue font-semibold'
                                            : 'border-transparent bg-muted text-muted-foreground hover:border-eu-blue/40 hover:text-eu-blue'
                                    }`}
                                >
                                    {language.name || 'Unknown language'}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {activeLanguage ? (
                    <div className="space-y-4 p-4">


                        <div className="space-y-4">
                            {activeLanguage.levels.length === 0 ? (
                                <div className="rounded-lg border bg-muted/30 p-6 text-center text-sm text-muted-foreground">
                                    No questions have been generated for this language yet.
                                </div>
                            ) : (
                                activeLanguage.levels.map(level => (
                                    <div key={level.level} className="rounded-lg border bg-card shadow-sm">
                                        <div className="flex flex-col gap-2 border-b px-4 py-3 md:flex-row md:items-center md:justify-between">
                                            <div>
                                                <h3 className="text-lg font-semibold">Level {level.level}</h3>
                                                <p className="text-sm text-muted-foreground">
                                                    {formatNumber(level.totals.total)} total questions — {formatNumber(level.totals.ready)} ready, {formatNumber(level.totals.pending_review)} pending review
                                                </p>
                                            </div>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleNavigateToList(activeLanguage.language_id, level.level)}
                                            >
                                                View level questions
                                            </Button>
                                        </div>
                                        
                                        {/* Status Overview */}
                                        <div className="px-4 pt-4">
                                            <h4 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide">Overall Status</h4>
                                            <div className="grid gap-4 sm:grid-cols-3">
                                                {STATUS_ORDER.map(status => {
                                                    const config = STATUS_CONFIG[status]
                                                    const count = level.totals[status]
                                                    const Icon = config.icon

                                                    return (
                                                        <button
                                                            key={status}
                                                            type="button"
                                                            onClick={() => handleNavigateToList(activeLanguage.language_id, level.level, config.reviewValue)}
                                                            className={`group flex h-full flex-col rounded-lg border p-4 text-left shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-eu-blue ${config.accentClasses}`}
                                                        >
                                                            <div className="flex items-center gap-2">
                                                                <Icon className="h-5 w-5" />
                                                                <span className="text-sm font-semibold uppercase tracking-wide">
                                                                    {config.label}
                                                                </span>
                                                            </div>
                                                            <span className="mt-2 text-3xl font-bold">{formatNumber(count)}</span>
                                                            <span className="mt-1 text-sm opacity-80">{config.description}</span>
                                                        </button>
                                                    )
                                                })}
                                            </div>
                                        </div>

                                        {/* Activity Type Breakdown */}
                                        {level.by_activity_type && Object.keys(level.by_activity_type).length > 0 && (
                                            <div className="px-4 pb-4 pt-6">
                                                <h4 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide">By Activity Type</h4>
                                                <div className="space-y-4">
                                                    {ACTIVITY_ORDER.filter(activityType => 
                                                        level.by_activity_type?.[activityType] && 
                                                        level.by_activity_type[activityType].total > 0
                                                    ).map(activityType => {
                                                        const config = ACTIVITY_CONFIG[activityType]
                                                        const activityData = level.by_activity_type![activityType]
                                                        const Icon = config.icon

                                                        return (
                                                            <div key={activityType} className="rounded-lg border bg-muted/30 p-3">
                                                                <div className="flex items-center gap-2 mb-3">
                                                                    <Icon className="h-5 w-5 text-muted-foreground" />
                                                                    <h5 className="font-medium">{config.label}</h5>
                                                                    <span className="text-sm text-muted-foreground">
                                                                        ({formatNumber(activityData.total)} total)
                                                                    </span>
                                                                </div>
                                                                <div className="grid gap-2 sm:grid-cols-3">
                                                                    {STATUS_ORDER.map(status => {
                                                                        const statusConfig = STATUS_CONFIG[status]
                                                                        const count = activityData[status]

                                                                        return (
                                                                            <button
                                                                                key={`${activityType}-${status}`}
                                                                                type="button"
                                                                                onClick={() => handleNavigateToList(
                                                                                    activeLanguage.language_id, 
                                                                                    level.level, 
                                                                                    statusConfig.reviewValue, 
                                                                                    activityType
                                                                                )}
                                                                                className="group flex items-center gap-3 rounded-md border p-3 text-left shadow-sm transition hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-eu-blue"
                                                                            >
                                                                                <statusConfig.icon className="h-4 w-4 text-muted-foreground" />
                                                                                <div>
                                                                                    <div className="text-sm font-medium">{statusConfig.label}</div>
                                                                                    <div className="text-2xl font-bold">{formatNumber(count)}</div>
                                                                                </div>
                                                                            </button>
                                                                        )
                                                                    })}
                                                                </div>
                                                            </div>
                                                        )
                                                    })}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="p-6 text-center text-sm text-muted-foreground">
                        {noDataForSelection
                            ? 'No question data found for the selected language yet. Generate or import questions to populate the dashboard.'
                            : 'Select a language to view level breakdowns.'}
                    </div>
                )}
            </div>
        </div>
    )
}
