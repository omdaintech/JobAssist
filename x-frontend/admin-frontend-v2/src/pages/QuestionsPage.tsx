import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { AdminErrorDisplay } from '../components/ui/admin-error-display'
import { AdminLoadingState } from '../components/ui/admin-loading-state'
import { Pagination } from '../components/ui/pagination'
import { useAdminAuth } from '../hooks/useAdminAuth'
import { useLanguages } from '../hooks/useLanguages'
import { adminApi } from '../services/adminApi'
import { ADMIN_BUTTON_TEXTS, ADMIN_LOADING_MESSAGES, AdminErrorHandler, extractAdminArrayFromResponse } from '../utils/admin-frontend-utils'

interface Question {
    _id: string
    id?: string // Backend returns 'id', interface expects '_id'
    activity_type: string
    level: string
    difficulty_level: string
    language_id: string
    language_name: string
    is_exam: boolean
    generated_by_admin?: string
    generation_method?: string
    created_datetime?: string
    date_string?: string
    time_string?: string
    usage_count?: number
    last_used?: string | null
    difficulty_rating?: number | null
    validation_status?: string
    reported_issues?: any[]
    quality_score?: number | null
    version?: string
    schema_version?: string
    search_tags?: string[]
    content_hash?: string
    instruction: string
    grammar_topic?: string
    explanation?: string
    tip?: string
    audio_url?: string
    transcript?: string
    // Legacy fields for backward compatibility
    created_at?: string
    reviewed?: boolean
    reviewed_at?: string
    reviewed_by?: string

    // ACTUAL QUESTION CONTENT FIELDS
    question?: string
    text?: string  // For reading passages
    topic?: string
    question_type?: string
    correct_answer?: string
    correct_answer_reason?: string
    options?: string[]

    // Grammar specific fields
    sentence?: string
    blank_position?: number

    // Writing specific fields
    scenario?: string
    word_limit?: string
    time_limit?: string
    task_type?: string
    situation?: string
    requirements?: string
    minimum_words?: number
    writing_format?: string

    // Additional content fields
    context?: string
    vocabulary_hint?: string
    cultural_note?: string
    question_metadata?: any // Store additional metadata from backend
}

// Languages will be loaded from API via useLanguages hook

type QuestionFiltersState = {
    language_id: string
    activity_type: string
    level: string
    difficulty_level: string
    reviewed: string
    date_from: string
    date_to: string
    has_audio: string
}

export default function QuestionsPage() {
    const { token } = useAdminAuth()
    const { languages } = useLanguages()
    const navigate = useNavigate()
    const location = useLocation()
    const [questions, setQuestions] = useState<Question[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    
    // Set page title
    useEffect(() => {
        document.title = 'Questions Management | lingali Admin';
    }, []);

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1)
    const [itemsPerPage, setItemsPerPage] = useState(25)
    const [totalPages, setTotalPages] = useState(0)
    const [totalItems, setTotalItems] = useState(0)

    // Initialize filters with first available language (no default hardcoding)
    const [filters, setFilters] = useState<QuestionFiltersState>({
        language_id: '', // Will be set when languages load
        activity_type: '',
        level: '',
        difficulty_level: '',
        reviewed: '',
        date_from: '',
        date_to: '',
        has_audio: ''
    })

    const [selectedQuestions, setSelectedQuestions] = useState<Set<string>>(new Set())
    const [activeModal, setActiveModal] = useState<'edit' | null>(null)
    const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null)
    
    // Audio generation state
    const [generatingAudio, setGeneratingAudio] = useState<Set<string>>(new Set())
    const [audioGenerationError, setAudioGenerationError] = useState<string | null>(null)
    // Edit question state - supports all question types
    const [editForm, setEditForm] = useState({
        activity_type: '',
        level: '',
        difficulty_level: '',
        // Grammar fields
        instruction: '',
        grammar_topic: '',
        explanation: '',
        tip: '',
        // Reading fields
        text: '',
        question: '',
        question_type: '',
        correct_answer: '',
        correct_answer_reason: '',
        options: [] as string[],
        topic: '',
        // Writing fields
        requirements: '',
        minimum_words: 0,
        writing_format: '',
        task_type: '',
        // Hearing fields
        audio_url: '',
        transcript: ''
    })

    // Generate questions state - REMOVED: Now in separate QuestionGenerationPage
    // const [generateForm, setGenerateForm] = useState({...})


    const fetchQuestions = async () => {
        if (!token || !filters.language_id) {
            if (!filters.language_id) {
                setError(null)
                setQuestions([])
                setTotalPages(0)
                setTotalItems(0)
            }
            setIsLoading(false)
            return
        }

        setIsLoading(true)
        AdminErrorHandler.clear(setError)

        const result = await AdminErrorHandler.handleAsync(
            async () => {
                const response = await adminApi.searchQuestions(token, {
                    language_id: filters.language_id,
                    activityType: filters.activity_type || undefined,
                    level: filters.level || undefined,
                    difficulty_level: filters.difficulty_level || undefined,
                    reviewed: filters.reviewed || undefined,
                    date_from: filters.date_from || undefined,
                    date_to: filters.date_to || undefined,
                    has_audio: filters.has_audio ? filters.has_audio === 'true' : undefined
                }, {
                    page: currentPage,
                    per_page: itemsPerPage
                })

                if (response.success) {
                    // Extract questions and pagination info from response
                    const questionsArray = extractAdminArrayFromResponse<Question>(response, [])
                    
                    // Process questions to extract review information from question_metadata
                    const processedQuestions = questionsArray.map(question => {
                        const processedQuestion = { ...question }
                        
                        // Extract review information from question_metadata if it exists
                        if (question.question_metadata && typeof question.question_metadata === 'object') {
                            const metadata = question.question_metadata as any
                            if (metadata.reviewed !== undefined) {
                                processedQuestion.reviewed = metadata.reviewed
                            }
                            if (metadata.reviewed_at) {
                                processedQuestion.reviewed_at = metadata.reviewed_at
                            }
                            if (metadata.reviewed_by) {
                                processedQuestion.reviewed_by = metadata.reviewed_by
                            }
                        }
                        
                        return processedQuestion
                    })
                    
                    // Extract pagination info from response
                    const paginationData = response.data?.pagination
                    if (paginationData) {
                        setTotalPages(paginationData.total_pages || 0)
                        setTotalItems(paginationData.total_count || 0)
                    }
                    
                    return processedQuestions
                } else {
                    throw new Error(response.message || 'Failed to fetch questions')
                }
            },
            setError,
            'Questions List'
        )

        if (result) {
            setQuestions(result)
        }

        setIsLoading(false)
    }

    useEffect(() => {
        // Handle presetFilters from navigation state
        const state = location.state as { presetFilters?: Partial<QuestionFiltersState> } | null
        if (state?.presetFilters) {
            setFilters(prev => ({
                ...prev,
                ...state.presetFilters
            }))
            setCurrentPage(1)
            navigate(location.pathname, { replace: true, state: {} })
            return
        }

        // Handle URL search parameters
        const urlParams = new URLSearchParams(location.search)
        const hasUrlParams = urlParams.toString().length > 0
        
        if (hasUrlParams) {
            const urlFilters: Partial<QuestionFiltersState> = {}
            
            if (urlParams.get('language_id')) urlFilters.language_id = urlParams.get('language_id')!
            if (urlParams.get('activity_type')) urlFilters.activity_type = urlParams.get('activity_type')!
            if (urlParams.get('level')) urlFilters.level = urlParams.get('level')!
            if (urlParams.get('difficulty_level')) urlFilters.difficulty_level = urlParams.get('difficulty_level')!
            if (urlParams.get('reviewed')) urlFilters.reviewed = urlParams.get('reviewed')!
            if (urlParams.get('date_from')) urlFilters.date_from = urlParams.get('date_from')!
            if (urlParams.get('date_to')) urlFilters.date_to = urlParams.get('date_to')!
            
            setFilters(prev => ({
                ...prev,
                ...urlFilters
            }))
            setCurrentPage(1)
        }
    }, [location.state, location.pathname, location.search, navigate])

    useEffect(() => {
        fetchQuestions()
    }, [token, filters, currentPage, itemsPerPage])
    
    // Sync filters to URL whenever they change (but prevent infinite loop)
    useEffect(() => {
        // Only update URL if not already loading from URL
        const currentParams = new URLSearchParams(location.search)
        const shouldUpdate = Object.keys(filters).some(key => {
            const filterValue = filters[key as keyof QuestionFiltersState]
            const urlValue = currentParams.get(key) || ''
            return filterValue !== urlValue
        })
        
        if (shouldUpdate) {
            updateUrlWithFilters(filters)
        }
    }, [filters])
    
    // Reset to page 1 when filters change
    useEffect(() => {
        if (currentPage !== 1) {
            setCurrentPage(1)
        }
    }, [filters])
    
    // Pagination handlers
    const handlePageChange = (page: number) => {
        setCurrentPage(page)
    }
    
    const handleItemsPerPageChange = (newItemsPerPage: number) => {
        setItemsPerPage(newItemsPerPage)
        setCurrentPage(1) // Reset to first page when changing items per page
    }



    const handleEditQuestion = (question: Question) => {
        setSelectedQuestion(question)
        setEditForm({
            activity_type: question.activity_type || '',
            level: question.level || '',
            difficulty_level: question.difficulty_level || '',
            // Grammar fields
            instruction: question.instruction || '',
            grammar_topic: question.grammar_topic || '',
            explanation: question.explanation || '',
            tip: question.tip || '',
            // Reading fields
            text: question.text || '',
            question: question.question || '',
            question_type: question.question_type || '',
            correct_answer: question.correct_answer || '',
            correct_answer_reason: question.correct_answer_reason || '',
            options: Array.isArray(question.options) ? question.options : [],
            topic: question.topic || '',
            // Writing fields
            requirements: question.requirements || '',
            minimum_words: question.minimum_words || 0,
            writing_format: question.writing_format || '',
            task_type: question.task_type || '',
            // Hearing fields
            audio_url: question.audio_url || '',
            transcript: question.transcript || ''
        })
        setActiveModal('edit')
    }

    const handleDeleteQuestion = async (questionId: string) => {
        if (!token || !confirm('Are you sure you want to delete this question?')) return

        // Store scroll position
        const scrollPosition = window.scrollY

        await AdminErrorHandler.handleAsync(
            async () => {
                const response = await adminApi.deleteQuestion(token, questionId)
                if (response.success) {
                    // Optimistic update: Remove question from local state
                    setQuestions(prev => prev.filter(q => getQuestionId(q) !== questionId))

                    // Restore scroll position
                    setTimeout(() => {
                        window.scrollTo(0, scrollPosition)
                    }, 0)

                    return response
                } else {
                    throw new Error(response.message || 'Failed to delete question')
                }
            },
            setError,
            'Delete Question'
        )
    }



    const handleMarkReviewed = async (questionId: string) => {
        if (!token) return

        // Store scroll position
        const scrollPosition = window.scrollY

        await AdminErrorHandler.handleAsync(
            async () => {
                const response = await adminApi.markQuestionReviewed(token, questionId, 'admin')
                if (response.success) {
                    // Optimistic update: Update question's reviewed status in local state
                    setQuestions(prev => prev.map(q =>
                        getQuestionId(q) === questionId
                            ? { ...q, reviewed: true, reviewed_at: new Date().toISOString(), reviewed_by: 'admin' }
                            : q
                    ))

                    // Restore scroll position
                    setTimeout(() => {
                        window.scrollTo(0, scrollPosition)
                    }, 0)

                    return response
                } else {
                    throw new Error(response.message || 'Failed to mark question as reviewed')
                }
            },
            setError,
            'Mark Question Reviewed'
        )
    }

    const handleGenerateAudio = async (questionId: string) => {
        if (!token) return

        // Add to generating set
        setGeneratingAudio(prev => new Set(prev).add(questionId))
        setAudioGenerationError(null)

        // Store scroll position
        const scrollPosition = window.scrollY

        const result = await AdminErrorHandler.handleAsync(
            async () => {
                const response = await adminApi.generateAudio(token, questionId)
                if (response.success) {
                    // Update question with new audio URL
                    const audioUrl = response.data?.audio_url
                    if (audioUrl) {
                        setQuestions(prev => prev.map(q =>
                            getQuestionId(q) === questionId
                                ? { ...q, audio_url: audioUrl }
                                : q
                        ))
                    }

                    // Restore scroll position
                    setTimeout(() => {
                        window.scrollTo(0, scrollPosition)
                    }, 0)

                    return response
                } else {
                    throw new Error(response.message || 'Failed to generate audio')
                }
            },
            setAudioGenerationError,
            'Generate Audio'
        )

        // Remove from generating set
        setGeneratingAudio(prev => {
            const newSet = new Set(prev)
            newSet.delete(questionId)
            return newSet
        })
    }

    const handleDeleteAudio = async (questionId: string) => {
        if (!token) return
        
        const confirmDelete = window.confirm('Are you sure you want to delete this audio file? You can regenerate it later.')
        if (!confirmDelete) return

        // Store scroll position
        const scrollPosition = window.scrollY

        await AdminErrorHandler.handleAsync(
            async () => {
                const response = await adminApi.deleteAudio(token, questionId)
                if (response.success) {
                    // Update question in local state
                    setQuestions(prevQuestions =>
                        prevQuestions.map(q =>
                            getQuestionId(q) === questionId
                                ? { ...q, audio_url: '' }
                                : q
                        ))

                    // Restore scroll position
                    setTimeout(() => {
                        window.scrollTo(0, scrollPosition)
                    }, 0)

                    return response
                } else {
                    throw new Error(response.message || 'Failed to delete audio')
                }
            },
            setAudioGenerationError,
            'Delete Audio'
        )
    }

    const submitEditQuestion = async () => {
        if (!token || !selectedQuestion) return

        // Store scroll position
        const scrollPosition = window.scrollY

        await AdminErrorHandler.handleAsync(
            async () => {
                const updateData = Object.fromEntries(
                    Object.entries(editForm).filter(([_, value]) => {
                        if (Array.isArray(value)) {
                            return value.length > 0
                        }
                        return typeof value === 'string' && value.trim() !== ''
                    })
                )

                const response = await adminApi.modifyQuestion(token, getQuestionId(selectedQuestion), updateData)
                if (response.success) {
                    // Close modal first
                    setActiveModal(null)
                    setSelectedQuestion(null)

                    // Optimistic update: Update question in local state
                    const questionId = getQuestionId(selectedQuestion)
                    setQuestions(prev => prev.map(q =>
                        getQuestionId(q) === questionId
                            ? { ...q, ...updateData, reviewed: false, reviewed_at: undefined, reviewed_by: undefined }
                            : q
                    ))

                    // Restore scroll position
                    setTimeout(() => {
                        window.scrollTo(0, scrollPosition)
                    }, 0)

                    return response
                } else {
                    throw new Error(response.message || 'Failed to update question')
                }
            },
            setError,
            'Edit Question'
        )
    }

    // Generate questions state - REMOVED: Now in separate QuestionGenerationPage
    // const submitGenerateQuestions = async () => {
    //     if (!token || generateLoading) return

    //     setGenerateLoading(true)
    //     AdminErrorHandler.clear(setError)
    //     setGenerateSuccess(null)

    //     const result = await AdminErrorHandler.handleAsync(
    //         async () => {
    //             const response = await adminApi.generateQuestions(token, generateForm)

    //             if (response.success) {
    //                 // Show success message
    //                 const successMessage = `Successfully generated ${response.data?.total_generated || generateForm.count} ${generateForm.activity_type} questions!`
    //                 setGenerateSuccess(successMessage)

    //                 // Wait a moment to show success, then close modal and refresh
    //                 setTimeout(async () => {
    //                     setActiveModal(null)
    //                     setGenerateSuccess(null)
    //                     await fetchQuestions() // Refresh list
    //                 }, 2000)

    //                 return response
    //             } else {
    //                 throw new Error(response.message || 'Failed to generate questions')
    //             }
    //         },
    //         setError,
    //         'Generate Questions'
    //     )

    //     setGenerateLoading(false)
    // }



    const formatDate = (dateString: string): string => {
        if (!dateString) return 'Never'
        return new Date(dateString).toLocaleDateString()
    }

    const getActivityIcon = (activity: string): string => {
        switch (activity) {
            case 'reading': return '📖'
            case 'writing': return '✍️'
            case 'hearing': return '🎧'
            case 'grammar': return '📝'
            default: return '❓'
        }
    }

    const handleFilterChange = (key: string, value: string) => {
        const newFilters = { ...filters, [key]: value }
        setFilters(newFilters)
        
        // Update URL with new filters
        updateUrlWithFilters(newFilters)
    }

    const clearFilters = () => {
        const clearedFilters = {
            language_id: '',
            activity_type: '',
            level: '',
            difficulty_level: '',
            reviewed: '',
            date_from: '',
            date_to: '',
            has_audio: ''
        }
        setFilters(clearedFilters)
        setSelectedQuestions(new Set())
        setCurrentPage(1)
        
        // Clear URL query params
        navigate(location.pathname, { replace: true })
    }

    // Helper function to update URL with current filters
    const updateUrlWithFilters = (currentFilters: QuestionFiltersState) => {
        const params = new URLSearchParams()
        
        // Only add non-empty filter values to URL
        Object.entries(currentFilters).forEach(([key, value]) => {
            if (value && value.trim() !== '') {
                params.set(key, value)
            }
        })
        
        // Update URL without triggering navigation
        const newUrl = params.toString() 
            ? `${location.pathname}?${params.toString()}`
            : location.pathname
        
        navigate(newUrl, { replace: true })
    }

    // Helper function to get language name for display
    const getLanguageName = (languageId: string) => {
        if (!languageId) {
            return 'None selected'
        }
        const lang = languages.find(l => l.language_id === languageId)
        return lang ? lang.language_name : 'Unknown language'
    }

    // Helper function to get supported levels for selected language
    const getSupportedLevels = (): string[] => {
        const lang = languages.find(l => l.language_id === filters.language_id)
        if (!lang || !lang.supported_levels) return []
        // Handle both formats: string[] or object[] with .code property
        if (typeof lang.supported_levels[0] === 'string') {
            return lang.supported_levels as unknown as string[]
        }
        return lang.supported_levels.map(level => level.code)
    }

    // Helper function to get the correct question ID (backend returns 'id', frontend expects '_id')
    const getQuestionId = (question: Question) => question.id || question._id

    const handleQuestionSelect = (questionId: string) => {
        const newSelected = new Set(selectedQuestions)
        if (newSelected.has(questionId)) {
            newSelected.delete(questionId)
        } else {
            newSelected.add(questionId)
        }
        setSelectedQuestions(newSelected)
    }

    const handleBulkDelete = async () => {
        if (!token || selectedQuestions.size === 0) return

        if (!confirm(`Are you sure you want to delete ${selectedQuestions.size} questions?`)) return

        // Store scroll position
        const scrollPosition = window.scrollY

        await AdminErrorHandler.handleAsync(
            async () => {
                const response = await adminApi.bulkDeleteQuestions(token, Array.from(selectedQuestions))
                if (response.success) {
                    // Optimistic update: Remove selected questions from local state
                    setQuestions(prev => prev.filter(q => !selectedQuestions.has(getQuestionId(q))))
                    setSelectedQuestions(new Set())

                    // Restore scroll position
                    setTimeout(() => {
                        window.scrollTo(0, scrollPosition)
                    }, 0)

                    return response
                } else {
                    throw new Error(response.message || 'Failed to delete questions')
                }
            },
            setError,
            'Bulk Delete Questions'
        )
    }

    const closeModal = () => {
        setActiveModal(null)
        setSelectedQuestion(null)
        setError(null)
        // setGenerateLoading(false) // REMOVED: No longer needed
        // setGenerateSuccess(null) // REMOVED: No longer needed
    }

    const handleRetry = () => {
        fetchQuestions()
    }

    if (isLoading) {
        return <AdminLoadingState message={ADMIN_LOADING_MESSAGES.loadingQuestions} />
    }

    if (error) {
        return (
            <AdminErrorDisplay
                title="Failed to Load Questions"
                message={error}
                onRetry={handleRetry}
            />
        )
    }

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">Question Management</h1>
                <div className="flex space-x-2">
                    <button
                        onClick={() => navigate('/question-generation')}
                        className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                    >
                        {ADMIN_BUTTON_TEXTS.generateQuestions}
                    </button>

                </div>
            </div>

            {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-red-600">
                        <span className="font-semibold">Error:</span> {error}
                    </p>
                </div>
            )}

            {/* Filters */}
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm mb-6">
                <div className="px-4 py-3 border-b border-gray-100">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                            <h2 className="text-base font-semibold text-gray-900">Filters</h2>
                            <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-blue-50 text-blue-700 rounded-full border border-blue-200">
                                Current: {getLanguageName(filters.language_id)}
                            </span>
                        </div>
                        <button
                            onClick={clearFilters}
                            className="px-2 py-1 text-xs font-medium text-gray-600 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded transition-colors"
                        >
                            Clear All
                        </button>
                    </div>
                </div>

                <div className="p-4 space-y-4">
                    {/* All Filters in One Section */}
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-3">
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-gray-600">Language *</label>
                            <select
                                value={filters.language_id}
                                onChange={(e) => handleFilterChange('language_id', e.target.value)}
                                className="w-full px-2 py-1.5 bg-white border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 hover:border-gray-400 transition-colors"
                                required
                            >
                                <option value="">Select language</option>
                                {languages.map(lang => (
                                    <option key={lang.language_id} value={lang.language_id}>
                                        {lang.language_name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-medium text-gray-600">Activity</label>
                            <select
                                value={filters.activity_type}
                                onChange={(e) => handleFilterChange('activity_type', e.target.value)}
                                className="w-full px-2 py-1.5 bg-white border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 hover:border-gray-400 transition-colors"
                                disabled={!filters.language_id}
                            >
                                <option value="">All Activities</option>
                                <option value="reading">📖 Reading</option>
                                <option value="writing">✍️ Writing</option>
                                <option value="hearing">🎧 Hearing</option>
                                <option value="speaking">🎤 Speaking</option>
                                <option value="grammar">📝 Grammar</option>
                            </select>
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-medium text-gray-600">Level</label>
                            <select
                                value={filters.level}
                                onChange={(e) => handleFilterChange('level', e.target.value)}
                                className="w-full px-2 py-1.5 bg-white border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 hover:border-gray-400 transition-colors"
                                disabled={!filters.language_id}
                            >
                                <option value="">All Levels</option>
                                {getSupportedLevels().map(level => (
                                    <option key={level} value={level}>{level}</option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-medium text-gray-600">Difficulty</label>
                            <select
                                value={filters.difficulty_level}
                                onChange={(e) => handleFilterChange('difficulty_level', e.target.value)}
                                className="w-full px-2 py-1.5 bg-white border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 hover:border-gray-400 transition-colors"
                                disabled={!filters.language_id}
                            >
                                <option value="">All</option>
                                <option value="standard">🟢 Standard</option>
                                <option value="difficult">🔴 Difficult</option>
                            </select>
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-medium text-gray-600">Status</label>
                            <select
                                value={filters.reviewed}
                                onChange={(e) => handleFilterChange('reviewed', e.target.value)}
                                className="w-full px-2 py-1.5 bg-white border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 hover:border-gray-400 transition-colors"
                                disabled={!filters.language_id}
                            >
                                <option value="">All</option>
                                <option value="true">✅ Reviewed</option>
                                <option value="false">⏳ Pending</option>
                            </select>
                        </div>

                        {/* Has Audio filter - show for hearing and speaking activities */}
                        {(filters.activity_type === 'hearing' || filters.activity_type === 'speaking') && (
                            <div className="space-y-1">
                                <label className="text-xs font-medium text-gray-600">Has Audio</label>
                                <select
                                    value={filters.has_audio}
                                    onChange={(e) => handleFilterChange('has_audio', e.target.value)}
                                    className="w-full px-2 py-1.5 bg-white border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 hover:border-gray-400 transition-colors"
                                    disabled={!filters.language_id}
                                >
                                    <option value="">All</option>
                                    <option value="true">🎵 With Audio</option>
                                    <option value="false">🔇 No Audio</option>
                                </select>
                            </div>
                        )}

                        <div className="space-y-1">
                            <label className="text-xs font-medium text-gray-600">From Date</label>
                            <input
                                type="date"
                                value={filters.date_from}
                                onChange={(e) => handleFilterChange('date_from', e.target.value)}
                                className="w-full px-2 py-1.5 bg-white border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 hover:border-gray-400 transition-colors"
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-medium text-gray-600">To Date</label>
                            <input
                                type="date"
                                value={filters.date_to}
                                onChange={(e) => handleFilterChange('date_to', e.target.value)}
                                className="w-full px-2 py-1.5 bg-white border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 hover:border-gray-400 transition-colors"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Compact Bulk Actions */}
            {filters.language_id && selectedQuestions.size > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-red-800">
                            {selectedQuestions.size} question{selectedQuestions.size !== 1 ? 's' : ''} selected
                        </span>
                        <div className="flex items-center space-x-2">
                            <button
                                onClick={handleBulkDelete}
                                className="px-3 py-1 bg-red-600 text-white text-sm font-medium rounded hover:bg-red-700 transition-colors"
                            >
                                Delete Selected
                            </button>
                            <button
                                onClick={() => setSelectedQuestions(new Set())}
                                className="px-3 py-1 bg-gray-200 text-gray-700 text-sm font-medium rounded hover:bg-gray-300 transition-colors"
                            >
                                Clear
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Questions List */}
            {!filters.language_id ? (
                <div className="admin-card">
                    <div className="admin-card-content text-center py-8">
                        <p className="text-gray-600 font-medium">Select a language to view questions.</p>
                        <p className="text-sm text-gray-400 mt-2">
                            Languages are loaded from the API — choose one explicitly to fetch question data.
                        </p>
                    </div>
                </div>
            ) : (
                <div className="space-y-4">
                    {!questions || questions.length === 0 ? (
                        <div className="admin-card">
                            <div className="admin-card-content text-center py-8">
                                <p className="text-gray-500">No questions found</p>
                                {totalItems > 0 && (
                                    <p className="text-sm text-gray-400 mt-2">
                                        Total: {totalItems} questions available
                                    </p>
                                )}
                            </div>
                        </div>
                    ) : (
                        <>
                            {(questions || []).map((question) => (
                        <div key={getQuestionId(question)} className="admin-card">
                            <div className="admin-card-content">
                                <div className="flex items-start space-x-3">
                                    <input
                                        type="checkbox"
                                        checked={selectedQuestions.has(getQuestionId(question))}
                                        onChange={() => handleQuestionSelect(getQuestionId(question))}
                                        className="mt-1 w-4 h-4 text-red-600 bg-gray-100 border-gray-300 rounded focus:ring-red-500"
                                    />
                                    <div className="flex-1">
                                        {/* Header with activity type, level, difficulty */}
                                        <div className="flex justify-between items-start mb-3">
                                            <div className="flex items-center space-x-2">
                                                <span className="text-xl">{getActivityIcon(question.activity_type)}</span>
                                                <div>
                                                    <span className="font-semibold">
                                                        {question.language_name || 'Unknown'}
                                                    </span>
                                                    <span className="mx-2 text-gray-400">•</span>
                                                    <span className="text-eu-blue font-semibold capitalize">{question.activity_type}</span>
                                                    <span className="mx-2 text-gray-400">•</span>
                                                    <span className="text-eu-blue font-semibold">{question.level}</span>
                                                    <span className="mx-2 text-gray-400">•</span>
                                                    <span className="text-gray-600 capitalize">{question.difficulty_level}</span>
                                                    {question.topic && (
                                                        <>
                                                            <span className="mx-2 text-gray-400">•</span>
                                                            <span className="text-purple-600 font-medium">{question.topic}</span>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                {!question.reviewed ? (
                                                    <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded">
                                                        Pending Review
                                                    </span>
                                                ) : (
                                                    <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
                                                        Reviewed
                                                    </span>
                                                )}
                                                {question.generation_method && (
                                                    <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                                                        Generation Method: {question.generation_method}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Instruction */}


                                        {/* QUESTION CONTENT - Main Content Section */}
                                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                                            <h4 className="font-semibold text-gray-800 mb-3 flex items-center">
                                                📝 Question Content
                                                {question.topic && (
                                                    <span className="ml-2 px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded">
                                                        {question.topic}
                                                    </span>
                                                )}
                                            </h4>

                                            {/* READING ACTIVITY CONTENT */}
                                            {question.activity_type === 'reading' && (
                                                <>
                                                    {/* Reading Text/Passage */}
                                                    {question.text && (
                                                        <div className="mb-3">
                                                            <span className="text-sm font-medium text-gray-700 block mb-1">📖 Reading Text:</span>
                                                            <div className="p-3 bg-white border rounded text-sm leading-relaxed">
                                                                {question.text}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Question Text */}
                                                    {question.question && (
                                                        <div className="mb-3">
                                                            <span className="text-sm font-medium text-gray-700 block mb-1">❓ Question:</span>
                                                            <div className="p-3 bg-white border rounded text-sm font-medium">
                                                                {question.question}
                                                            </div>
                                                        </div>
                                                    )}
                                                </>
                                            )}

                                            {/* HEARING ACTIVITY CONTENT */}
                                            {question.activity_type === 'hearing' && (
                                                <>
                                                    {question.audio_url ? (
                                                        <div className="mb-3">
                                                            <span className="text-sm font-medium text-gray-700 block mb-1">🔊 Audio Prompt:</span>
                                                            <div className="p-3 bg-white border rounded text-sm space-y-2">
                                                                <audio controls controlsList="nodownload" className="w-full">
                                                                    <source src={question.audio_url} />
                                                                    Your browser does not support the audio element.
                                                                </audio>
                                                                <div className="flex items-center justify-between gap-2">
                                                                    <a
                                                                        href={question.audio_url}
                                                                        target="_blank"
                                                                        rel="noreferrer"
                                                                        className="text-xs text-blue-600 hover:underline"
                                                                    >
                                                                        Open audio in new tab
                                                                    </a>
                                                                    <button
                                                                        onClick={() => handleDeleteAudio(getQuestionId(question))}
                                                                        className="px-2 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700 flex items-center gap-1"
                                                                    >
                                                                        🗑️ Delete Audio
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="mb-3">
                                                            <span className="text-sm font-medium text-gray-700 block mb-1">🔊 Audio:</span>
                                                            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded text-sm space-y-2">
                                                                <p className="text-yellow-800 text-xs mb-2">No audio file generated yet</p>
                                                                <button
                                                                    onClick={() => handleGenerateAudio(getQuestionId(question))}
                                                                    disabled={generatingAudio.has(getQuestionId(question))}
                                                                    className="px-3 py-1.5 bg-purple-600 text-white text-xs rounded hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-1"
                                                                >
                                                                    {generatingAudio.has(getQuestionId(question)) ? (
                                                                        <>
                                                                            <svg className="animate-spin h-3 w-3 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                                            </svg>
                                                                            Generating...
                                                                        </>
                                                                    ) : (
                                                                        <>
                                                                            🎙️ Generate Audio
                                                                        </>
                                                                    )}
                                                                </button>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {question.question && (
                                                        <div className="mb-3">
                                                            <span className="text-sm font-medium text-gray-700 block mb-1">❓ Question Prompt:</span>
                                                            <div className="p-3 bg-white border rounded text-sm font-medium">
                                                                {question.question}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {question.transcript && (
                                                        <div className="mb-3">
                                                            <span className="text-sm font-medium text-gray-700 block mb-1">🗒️ Transcript:</span>
                                                            <div className="p-3 bg-white border rounded text-sm max-h-48 overflow-auto whitespace-pre-wrap">
                                                                {question.transcript}
                                                            </div>
                                                        </div>
                                                    )}
                                                </>
                                            )}

                                            {/* SPEAKING ACTIVITY CONTENT */}
                                            {question.activity_type === 'speaking' && (
                                                <>
                                                    {question.audio_url ? (
                                                        <div className="mb-3">
                                                            <span className="text-sm font-medium text-gray-700 block mb-1">🎤 Speaking Prompt Audio:</span>
                                                            <div className="p-3 bg-white border rounded text-sm space-y-2">
                                                                <audio controls controlsList="nodownload" className="w-full">
                                                                    <source src={question.audio_url} />
                                                                    Your browser does not support the audio element.
                                                                </audio>
                                                                <div className="flex items-center justify-between gap-2">
                                                                    <a
                                                                        href={question.audio_url}
                                                                        target="_blank"
                                                                        rel="noreferrer"
                                                                        className="text-xs text-blue-600 hover:underline"
                                                                    >
                                                                        Open audio in new tab
                                                                    </a>
                                                                    <button
                                                                        onClick={() => handleDeleteAudio(getQuestionId(question))}
                                                                        className="px-2 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700 flex items-center gap-1"
                                                                    >
                                                                        🗑️ Delete Audio
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="mb-3">
                                                            <span className="text-sm font-medium text-gray-700 block mb-1">🎤 Prompt Audio:</span>
                                                            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded text-sm space-y-2">
                                                                <p className="text-yellow-800 text-xs mb-2">No audio file generated yet</p>
                                                                <button
                                                                    onClick={() => handleGenerateAudio(getQuestionId(question))}
                                                                    disabled={generatingAudio.has(getQuestionId(question))}
                                                                    className="px-3 py-1.5 bg-purple-600 text-white text-xs rounded hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-1"
                                                                >
                                                                    {generatingAudio.has(getQuestionId(question)) ? (
                                                                        <>
                                                                            <svg className="animate-spin h-3 w-3 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                                            </svg>
                                                                            Generating...
                                                                        </>
                                                                    ) : (
                                                                        <>
                                                                            🎙️ Generate TTS Audio
                                                                        </>
                                                                    )}
                                                                </button>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {question.transcript && (
                                                        <div className="mb-3">
                                                            <span className="text-sm font-medium text-gray-700 block mb-1">🗒️ Speaking Prompt (Text):</span>
                                                            <div className="p-3 bg-white border rounded text-sm max-h-48 overflow-auto whitespace-pre-wrap">
                                                                {question.transcript}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {question.question && (
                                                        <div className="mb-3">
                                                            <span className="text-sm font-medium text-gray-700 block mb-1">🌐 English Translation:</span>
                                                            <div className="p-3 bg-blue-50 border border-blue-200 rounded text-sm font-medium">
                                                                {question.question}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {question.question_metadata && (
                                                        <div className="mb-3">
                                                            <span className="text-sm font-medium text-gray-700 block mb-1">⏱️ Duration Constraints:</span>
                                                            <div className="p-3 bg-white border rounded text-xs space-y-1">
                                                                {question.question_metadata.min_answer_seconds && (
                                                                    <div className="flex justify-between">
                                                                        <span className="text-gray-600">Minimum:</span>
                                                                        <span className="font-semibold">{question.question_metadata.min_answer_seconds}s</span>
                                                                    </div>
                                                                )}
                                                                {question.question_metadata.max_answer_seconds && (
                                                                    <div className="flex justify-between">
                                                                        <span className="text-gray-600">Maximum:</span>
                                                                        <span className="font-semibold">{question.question_metadata.max_answer_seconds}s</span>
                                                                    </div>
                                                                )}
                                                                {question.question_metadata.suggested_duration && (
                                                                    <div className="flex justify-between">
                                                                        <span className="text-gray-600">Suggested:</span>
                                                                        <span className="font-semibold text-blue-600">{question.question_metadata.suggested_duration}s</span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    )}
                                                </>
                                            )}

                                            {/* WRITING ACTIVITY CONTENT */}
                                            {question.activity_type === 'writing' && (
                                                <>
                                                    {/* Writing Instruction */}
                                                    {question.instruction && (
                                                        <div className="mb-3">
                                                            <span className="text-sm font-medium text-gray-700 block mb-1">✍️ Writing Instruction:</span>
                                                            <div className="p-3 bg-white border rounded text-sm">
                                                                {question.instruction}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Writing Scenario */}
                                                    {question.scenario && (
                                                        <div className="mb-3">
                                                            <span className="text-sm font-medium text-gray-700 block mb-1">🎭 Writing Scenario:</span>
                                                            <div className="p-3 bg-white border rounded text-sm">
                                                                {question.scenario}
                                                            </div>
                                                        </div>
                                                    )}
                                                </>
                                            )}

                                            {/* GRAMMAR ACTIVITY CONTENT */}
                                            {question.activity_type === 'grammar' && (
                                                <>
                                                    {/* Grammar Instruction */}
                                                    {question.instruction && (
                                                        <div className="mb-3">
                                                            <span className="text-sm font-medium text-gray-700 block mb-1">📚 Grammar Instruction:</span>
                                                            <div className="p-3 bg-white border rounded text-sm">
                                                                {question.instruction}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Grammar Sentence */}
                                                    {question.sentence && (
                                                        <div className="mb-3">
                                                            <span className="text-sm font-medium text-gray-700 block mb-1">📝 Sentence:</span>
                                                            <div className="p-3 bg-white border rounded text-sm">
                                                                {question.sentence}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Grammar Topic */}
                                                    {question.grammar_topic && (
                                                        <div className="mb-3">
                                                            <span className="text-sm font-medium text-gray-700 block mb-1">🎯 Grammar Topic:</span>
                                                            <div className="p-3 bg-white border rounded text-sm">
                                                                {question.grammar_topic}
                                                            </div>
                                                        </div>
                                                    )}
                                                </>
                                            )}

                                            {/* Options */}
                                            {question.options && question.options.length > 0 && (
                                                <div className="mb-3">
                                                    <span className="text-sm font-medium text-gray-700 block mb-1">📝 Options:</span>
                                                    <div className="space-y-1">
                                                        {question.options.map((option, index) => (
                                                            <div key={index} className="flex items-center space-x-2 p-2 bg-white border rounded text-sm">
                                                                <span className="font-medium text-gray-500 min-w-[20px]">{String.fromCharCode(65 + index)})</span>
                                                                <span>{option}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Correct Answer */}
                                            {question.correct_answer && (
                                                <div className="mb-3">
                                                    <span className="text-sm font-medium text-green-700 block mb-1">✅ Correct Answer:</span>
                                                    <div className="p-3 bg-green-50 border border-green-200 rounded text-sm font-medium text-green-800">
                                                        {question.correct_answer}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Answer Explanation */}
                                            {question.correct_answer_reason && (
                                                <div className="mb-3">
                                                    <span className="text-sm font-medium text-gray-700 block mb-1">💡 Explanation:</span>
                                                    <div className="p-3 bg-yellow-50 border border-yellow-200 rounded text-sm">
                                                        {question.correct_answer_reason}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Additional Question Details */}
                                            <div className="grid grid-cols-2 gap-4 text-xs text-gray-600">
                                                {question.question_type && (
                                                    <div>
                                                        <span className="font-medium">Type:</span>
                                                        <span className="ml-1 px-1 py-0.5 bg-gray-100 rounded">{question.question_type}</span>
                                                    </div>
                                                )}
                                                {question.word_limit && (
                                                    <div>
                                                        <span className="font-medium">Word Limit:</span> {question.word_limit}
                                                    </div>
                                                )}
                                                {question.time_limit && (
                                                    <div>
                                                        <span className="font-medium">Time Limit:</span> {question.time_limit}
                                                    </div>
                                                )}
                                                {question.blank_position && (
                                                    <div>
                                                        <span className="font-medium">Blank Position:</span> {question.blank_position}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Grammar Topic, Explanation, Tip */}
                                        {question.grammar_topic && (
                                            <div className="mb-2">
                                                <span className="text-sm font-medium text-gray-700">Topic: </span>
                                                <span className="text-sm text-gray-600">{question.grammar_topic}</span>
                                            </div>
                                        )}

                                        {question.explanation && (
                                            <div className="mb-2">
                                                <span className="text-sm font-medium text-gray-700">Explanation: </span>
                                                <span className="text-sm text-gray-600">{question.explanation}</span>
                                            </div>
                                        )}

                                        {question.tip && (
                                            <div className="mb-3">
                                                <span className="text-sm font-medium text-gray-700">Tip: </span>
                                                <span className="text-sm text-gray-600">{question.tip}</span>
                                            </div>
                                        )}



                                        {/* Search Tags */}
                                        {question.search_tags && question.search_tags.length > 0 && (
                                            <div className="mb-3">
                                                <span className="text-sm font-medium text-gray-700">Tags: </span>
                                                <div className="flex flex-wrap gap-1 mt-1">
                                                    {question.search_tags.map((tag, index) => (
                                                        <span key={index} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                                                            {tag}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Reported Issues */}
                                        {question.reported_issues && question.reported_issues.length > 0 && (
                                            <div className="mb-3">
                                                <span className="text-sm font-medium text-red-600">Issues Reported: </span>
                                                <span className="text-sm text-red-600">{question.reported_issues.length}</span>
                                            </div>
                                        )}

                                        {/* Date Info */}
                                        <div className="flex justify-between items-center text-sm text-gray-500 mb-3">
                                            <div>
                                                Created: {formatDate(question.date_string || question.created_at || question.created_datetime || '')}
                                            </div>
                                            {question.reviewed && question.reviewed_at && (
                                                <div>
                                                    Reviewed: {formatDate(question.reviewed_at)}
                                                    {question.reviewed_by && ` by ${question.reviewed_by}`}
                                                </div>
                                            )}
                                        </div>

                                        {/* Technical Metadata - Collapsible */}
                                        <details className="mb-3">
                                            <summary className="text-xs font-medium text-gray-600 cursor-pointer hover:text-gray-800 mb-2">
                                                🔧 Technical Details
                                            </summary>
                                            <div className="bg-gray-50 border rounded p-3 text-xs space-y-2">
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <span className="font-medium text-gray-700">Question ID:</span>
                                                        <div className="font-mono text-gray-600 break-all">{getQuestionId(question)}</div>
                                                    </div>
                                                    {question.content_hash && (
                                                        <div>
                                                            <span className="font-medium text-gray-700">Content Hash:</span>
                                                            <div className="font-mono text-gray-600 break-all">{question.content_hash}</div>
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="grid grid-cols-2 gap-4">
                                                    {question.schema_version && (
                                                        <div>
                                                            <span className="font-medium text-gray-700">Schema Version:</span>
                                                            <span className="ml-1 text-gray-600">{question.schema_version}</span>
                                                        </div>
                                                    )}
                                                    {question.validation_status && (
                                                        <div>
                                                            <span className="font-medium text-gray-700">Validation Status:</span>
                                                            <span className={`ml-1 px-1 py-0.5 rounded text-xs ${question.validation_status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                                                question.validation_status === 'approved' ? 'bg-green-100 text-green-800' :
                                                                    'bg-gray-100 text-gray-800'
                                                                }`}>
                                                                {question.validation_status}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                                {question.generated_by_admin && (
                                                    <div>
                                                        <span className="font-medium text-gray-700">Generated by Admin:</span>
                                                        <span className="ml-1 font-mono text-gray-600">{question.generated_by_admin}</span>
                                                    </div>
                                                )}
                                                {question.generation_method && (
                                                    <div>
                                                        <span className="font-medium text-gray-700">Generation Method:</span>
                                                        <span className="ml-1 text-gray-600">{question.generation_method.replace(/[_-]/g, ' ')}</span>
                                                    </div>
                                                )}
                                                {(question.created_datetime || question.time_string) && (
                                                    <div>
                                                        <span className="font-medium text-gray-700">Full Timestamp:</span>
                                                        <span className="ml-1 text-gray-600">
                                                            {question.created_datetime ||
                                                                (question.date_string && question.time_string ? `${question.date_string} ${question.time_string}` : 'N/A')}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        </details>

                                        <div className="flex space-x-2">
                                            <button
                                                onClick={() => handleEditQuestion(question)}
                                                className="px-3 py-1 bg-blue-100 text-blue-700 rounded text-sm hover:bg-blue-200 transition-colors"
                                            >
                                                Edit
                                            </button>
                                            {!question.reviewed && (
                                                <button
                                                    onClick={() => handleMarkReviewed(getQuestionId(question))}
                                                    className="px-3 py-1 bg-green-100 text-green-700 rounded text-sm hover:bg-green-200 transition-colors"
                                                >
                                                    Mark Reviewed
                                                </button>
                                            )}
                                            <button
                                                onClick={() => handleDeleteQuestion(getQuestionId(question))}
                                                className="px-3 py-1 bg-red-100 text-red-700 rounded text-sm hover:bg-red-200 transition-colors"
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                            ))}
                        
                        {/* Pagination Controls */}
                        {totalPages > 1 && (
                            <div className="mt-6">
                                <Pagination
                                    currentPage={currentPage}
                                    totalPages={totalPages}
                                    totalItems={totalItems}
                                    itemsPerPage={itemsPerPage}
                                    onPageChange={handlePageChange}
                                    showItemsPerPage={true}
                                    itemsPerPageOptions={[5, 10, 20, 50]}
                                    onItemsPerPageChange={handleItemsPerPageChange}
                                    className="border-t pt-4"
                                />
                            </div>
                        )}

                        </>
                    )}
                </div>
            )}

            {/* Edit Question Modal */}
            {activeModal === 'edit' && selectedQuestion && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="p-6">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-xl font-bold">Edit Question</h2>
                                <button onClick={closeModal} className="text-gray-500 hover:text-gray-700">✕</button>
                            </div>

                            <div className="space-y-4">
                                <div className="grid grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Activity Type</label>
                                        <select
                                            value={editForm.activity_type}
                                            onChange={(e) => setEditForm({ ...editForm, activity_type: e.target.value })}
                                            className="w-full p-2 border border-gray-300 rounded"
                                        >
                                            <option value="reading">Reading</option>
                                            <option value="writing">Writing</option>
                                            <option value="hearing">Hearing</option>
                                            <option value="speaking">Speaking</option>
                                            <option value="grammar">Grammar</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Level</label>
                                        <select
                                            value={editForm.level}
                                            onChange={(e) => setEditForm({ ...editForm, level: e.target.value })}
                                            className="w-full p-2 border border-gray-300 rounded"
                                        >
                                            {getSupportedLevels().map(level => (
                                                <option key={level} value={level}>{level}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Difficulty</label>
                                        <select
                                            value={editForm.difficulty_level}
                                            onChange={(e) => setEditForm({ ...editForm, difficulty_level: e.target.value })}
                                            className="w-full p-2 border border-gray-300 rounded"
                                        >
                                            <option value="standard">Standard</option>
                                            <option value="difficult">Difficult</option>
                                        </select>
                                    </div>
                                </div>

                                {/* Reading Question Fields */}
                                {editForm.activity_type === 'reading' && (
                                    <>
                                        <div>
                                            <label className="block text-sm font-medium mb-1">Reading Text</label>
                                            <textarea
                                                value={editForm.text}
                                                onChange={(e) => setEditForm({ ...editForm, text: e.target.value })}
                                                className="w-full p-2 border border-gray-300 rounded"
                                                rows={4}
                                            />
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium mb-1">Question</label>
                                                <textarea
                                                    value={editForm.question}
                                                    onChange={(e) => setEditForm({ ...editForm, question: e.target.value })}
                                                    className="w-full p-2 border border-gray-300 rounded"
                                                    rows={2}
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium mb-1">Topic</label>
                                                <input
                                                    type="text"
                                                    value={editForm.topic}
                                                    onChange={(e) => setEditForm({ ...editForm, topic: e.target.value })}
                                                    className="w-full p-2 border border-gray-300 rounded"
                                                />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium mb-1">Question Type</label>
                                                <input
                                                    type="text"
                                                    value={editForm.question_type}
                                                    onChange={(e) => setEditForm({ ...editForm, question_type: e.target.value })}
                                                    className="w-full p-2 border border-gray-300 rounded"
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium mb-1">Correct Answer</label>
                                                <input
                                                    type="text"
                                                    value={editForm.correct_answer}
                                                    onChange={(e) => setEditForm({ ...editForm, correct_answer: e.target.value })}
                                                    className="w-full p-2 border border-gray-300 rounded"
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium mb-1">Answer Explanation</label>
                                            <textarea
                                                value={editForm.correct_answer_reason}
                                                onChange={(e) => setEditForm({ ...editForm, correct_answer_reason: e.target.value })}
                                                className="w-full p-2 border border-gray-300 rounded"
                                                rows={2}
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium mb-1">Options (one per line)</label>
                                            <textarea
                                                value={editForm.options.join('\n')}
                                                onChange={(e) => setEditForm({ ...editForm, options: e.target.value.split('\n').filter(opt => opt.trim()) })}
                                                className="w-full p-2 border border-gray-300 rounded"
                                                rows={3}
                                                placeholder="Richtig&#10;Falsch"
                                            />
                                        </div>
                                    </>
                                )}

                                {editForm.activity_type === 'hearing' && (
                                    <>
                                        <div>
                                            <label className="block text-sm font-medium mb-1">Audio URL</label>
                                            <input
                                                type="url"
                                                value={editForm.audio_url}
                                                onChange={(e) => setEditForm({ ...editForm, audio_url: e.target.value })}
                                                className="w-full p-2 border border-gray-300 rounded"
                                                placeholder="https://..."
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium mb-1">Transcript</label>
                                            <textarea
                                                value={editForm.transcript}
                                                onChange={(e) => setEditForm({ ...editForm, transcript: e.target.value })}
                                                className="w-full p-2 border border-gray-300 rounded"
                                                rows={4}
                                                placeholder="Full transcript or summary of the audio clip"
                                            />
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium mb-1">Question Prompt</label>
                                                <textarea
                                                    value={editForm.question}
                                                    onChange={(e) => setEditForm({ ...editForm, question: e.target.value })}
                                                    className="w-full p-2 border border-gray-300 rounded"
                                                    rows={2}
                                                    placeholder="e.g., What is the main topic of the announcement?"
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium mb-1">Question Type</label>
                                                <input
                                                    type="text"
                                                    value={editForm.question_type}
                                                    onChange={(e) => setEditForm({ ...editForm, question_type: e.target.value })}
                                                    className="w-full p-2 border border-gray-300 rounded"
                                                    placeholder="multiple_choice"
                                                />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium mb-1">Correct Answer</label>
                                                <input
                                                    type="text"
                                                    value={editForm.correct_answer}
                                                    onChange={(e) => setEditForm({ ...editForm, correct_answer: e.target.value })}
                                                    className="w-full p-2 border border-gray-300 rounded"
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium mb-1">Answer Explanation</label>
                                                <textarea
                                                    value={editForm.correct_answer_reason}
                                                    onChange={(e) => setEditForm({ ...editForm, correct_answer_reason: e.target.value })}
                                                    className="w-full p-2 border border-gray-300 rounded"
                                                    rows={2}
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium mb-1">Options (one per line)</label>
                                            <textarea
                                                value={editForm.options.join('\n')}
                                                onChange={(e) => setEditForm({ ...editForm, options: e.target.value.split('\n').filter(opt => opt.trim()) })}
                                                className="w-full p-2 border border-gray-300 rounded"
                                                rows={3}
                                                placeholder="Option A&#10;Option B&#10;Option C"
                                            />
                                        </div>
                                    </>
                                )}

                                {/* Speaking Question Fields */}
                                {editForm.activity_type === 'speaking' && (
                                    <>
                                        <div>
                                            <label className="block text-sm font-medium mb-1">Speaking Prompt (German Text)</label>
                                            <textarea
                                                value={editForm.transcript}
                                                onChange={(e) => setEditForm({ ...editForm, transcript: e.target.value })}
                                                className="w-full p-2 border border-gray-300 rounded"
                                                rows={3}
                                                placeholder="e.g., Bitte stellen Sie sich vor. Sagen Sie Ihren Namen..."
                                            />
                                            <p className="text-xs text-gray-500 mt-1">The prompt that students will hear (in target language)</p>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium mb-1">English Translation</label>
                                            <textarea
                                                value={editForm.question}
                                                onChange={(e) => setEditForm({ ...editForm, question: e.target.value })}
                                                className="w-full p-2 border border-gray-300 rounded"
                                                rows={2}
                                                placeholder="e.g., Introduce yourself. Say your name..."
                                            />
                                            <p className="text-xs text-gray-500 mt-1">English translation for clarity</p>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium mb-1">Expected Response Description</label>
                                            <textarea
                                                value={editForm.correct_answer}
                                                onChange={(e) => setEditForm({ ...editForm, correct_answer: e.target.value })}
                                                className="w-full p-2 border border-gray-300 rounded"
                                                rows={2}
                                                placeholder="e.g., A good response includes: name, origin, and hobby. Should be 3-5 sentences."
                                            />
                                            <p className="text-xs text-gray-500 mt-1">What should a good answer include?</p>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium mb-1">Evaluation Criteria</label>
                                            <textarea
                                                value={editForm.correct_answer_reason}
                                                onChange={(e) => setEditForm({ ...editForm, correct_answer_reason: e.target.value })}
                                                className="w-full p-2 border border-gray-300 rounded"
                                                rows={2}
                                                placeholder="e.g., The response should be personal, clear, and use basic A1 vocabulary..."
                                            />
                                            <p className="text-xs text-gray-500 mt-1">How will the response be evaluated?</p>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium mb-1">Topic</label>
                                            <input
                                                type="text"
                                                value={editForm.topic}
                                                onChange={(e) => setEditForm({ ...editForm, topic: e.target.value })}
                                                className="w-full p-2 border border-gray-300 rounded"
                                                placeholder="e.g., Self Introduction"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium mb-1">Audio URL (TTS Generated)</label>
                                            <input
                                                type="url"
                                                value={editForm.audio_url}
                                                onChange={(e) => setEditForm({ ...editForm, audio_url: e.target.value })}
                                                className="w-full p-2 border border-gray-300 rounded"
                                                placeholder="https://... (leave empty, will be generated)"
                                                readOnly
                                            />
                                            <p className="text-xs text-gray-500 mt-1">Audio is generated automatically via TTS</p>
                                        </div>

                                        <div className="grid grid-cols-3 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium mb-1">Min Duration (seconds)</label>
                                                <input
                                                    type="number"
                                                    value={editForm.question_metadata?.min_answer_seconds || 15}
                                                    onChange={(e) => setEditForm({ 
                                                        ...editForm, 
                                                        question_metadata: { 
                                                            ...editForm.question_metadata, 
                                                            min_answer_seconds: parseInt(e.target.value) 
                                                        } 
                                                    })}
                                                    className="w-full p-2 border border-gray-300 rounded"
                                                    min="10"
                                                    max="60"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium mb-1">Max Duration (seconds)</label>
                                                <input
                                                    type="number"
                                                    value={editForm.question_metadata?.max_answer_seconds || 45}
                                                    onChange={(e) => setEditForm({ 
                                                        ...editForm, 
                                                        question_metadata: { 
                                                            ...editForm.question_metadata, 
                                                            max_answer_seconds: parseInt(e.target.value) 
                                                        } 
                                                    })}
                                                    className="w-full p-2 border border-gray-300 rounded"
                                                    min="15"
                                                    max="120"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium mb-1">Suggested Duration (seconds)</label>
                                                <input
                                                    type="number"
                                                    value={editForm.question_metadata?.suggested_duration || 30}
                                                    onChange={(e) => setEditForm({ 
                                                        ...editForm, 
                                                        question_metadata: { 
                                                            ...editForm.question_metadata, 
                                                            suggested_duration: parseInt(e.target.value) 
                                                        } 
                                                    })}
                                                    className="w-full p-2 border border-gray-300 rounded"
                                                    min="10"
                                                    max="90"
                                                />
                                            </div>
                                        </div>
                                    </>
                                )}

                                {/* Grammar Question Fields */}
                                {editForm.activity_type === 'grammar' && (
                                    <>
                                        <div>
                                            <label className="block text-sm font-medium mb-1">Instruction</label>
                                            <textarea
                                                value={editForm.instruction}
                                                onChange={(e) => setEditForm({ ...editForm, instruction: e.target.value })}
                                                className="w-full p-2 border border-gray-300 rounded"
                                                rows={4}
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium mb-1">Grammar Topic</label>
                                            <input
                                                type="text"
                                                value={editForm.grammar_topic}
                                                onChange={(e) => setEditForm({ ...editForm, grammar_topic: e.target.value })}
                                                className="w-full p-2 border border-gray-300 rounded"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium mb-1">Explanation</label>
                                            <textarea
                                                value={editForm.explanation}
                                                onChange={(e) => setEditForm({ ...editForm, explanation: e.target.value })}
                                                className="w-full p-2 border border-gray-300 rounded"
                                                rows={3}
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium mb-1">Tip</label>
                                            <input
                                                type="text"
                                                value={editForm.tip}
                                                onChange={(e) => setEditForm({ ...editForm, tip: e.target.value })}
                                                className="w-full p-2 border border-gray-300 rounded"
                                            />
                                        </div>
                                    </>
                                )}

                                {/* Writing Question Fields */}
                                {editForm.activity_type === 'writing' && (
                                    <>
                                        <div>
                                            <label className="block text-sm font-medium mb-1">Instruction</label>
                                            <textarea
                                                value={editForm.instruction || ''}
                                                onChange={(e) => setEditForm({ ...editForm, instruction: e.target.value })}
                                                className="w-full p-2 border border-gray-300 rounded"
                                                rows={4}
                                                placeholder="Enter the writing instruction..."
                                            />
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium mb-1">Topic</label>
                                                <input
                                                    type="text"
                                                    value={editForm.topic || ''}
                                                    onChange={(e) => setEditForm({ ...editForm, topic: e.target.value })}
                                                    className="w-full p-2 border border-gray-300 rounded"
                                                    placeholder="e.g., Hobbys und Freizeit"
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium mb-1">Writing Format</label>
                                                <select
                                                    value={editForm.writing_format || ''}
                                                    onChange={(e) => setEditForm({ ...editForm, writing_format: e.target.value })}
                                                    className="w-full p-2 border border-gray-300 rounded"
                                                >
                                                    <option value="">Select format...</option>
                                                    <option value="Message">Message</option>
                                                    <option value="Email">Email</option>
                                                    <option value="Letter">Letter</option>
                                                    <option value="Diary entry">Diary entry</option>
                                                    <option value="Description">Description</option>
                                                    <option value="Plan">Plan</option>
                                                    <option value="Form">Form</option>
                                                    <option value="Complaint letter">Complaint letter</option>
                                                    <option value="Note">Note</option>
                                                    <option value="List">List</option>
                                                </select>
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium mb-1">Requirements</label>
                                            <textarea
                                                value={editForm.requirements || ''}
                                                onChange={(e) => setEditForm({ ...editForm, requirements: e.target.value })}
                                                className="w-full p-2 border border-gray-300 rounded"
                                                rows={3}
                                                placeholder="Specific requirements for the writing task..."
                                            />
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium mb-1">Task Type</label>
                                                <input
                                                    type="text"
                                                    value={editForm.task_type || ''}
                                                    onChange={(e) => setEditForm({ ...editForm, task_type: e.target.value })}
                                                    className="w-full p-2 border border-gray-300 rounded"
                                                    placeholder="e.g., Kurze Nachricht"
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium mb-1">Minimum Words</label>
                                                <input
                                                    type="number"
                                                    value={editForm.minimum_words || ''}
                                                    onChange={(e) => setEditForm({ ...editForm, minimum_words: parseInt(e.target.value) || 0 })}
                                                    className="w-full p-2 border border-gray-300 rounded"
                                                    placeholder="40"
                                                    min="10"
                                                    max="1000"
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium mb-1">Tip (Optional)</label>
                                            <input
                                                type="text"
                                                value={editForm.tip || ''}
                                                onChange={(e) => setEditForm({ ...editForm, tip: e.target.value })}
                                                className="w-full p-2 border border-gray-300 rounded"
                                                placeholder="Optional tip for students..."
                                            />
                                        </div>
                                    </>
                                )}
                            </div>

                            <div className="flex space-x-2 mt-6">
                                <button
                                    onClick={submitEditQuestion}
                                    className="px-4 py-2 bg-eu-blue text-white rounded hover:bg-blue-700 transition-colors"
                                >
                                    Update Question
                                </button>
                                <button
                                    onClick={closeModal}
                                    className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 transition-colors"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )
            }

            {/* Generate Questions Modal */}
            {/* REMOVED: Generate Questions Modal */}


        </div>
    )
}
