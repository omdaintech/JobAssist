import { BeakerIcon, CheckCircleIcon, ChevronDownIcon, ChevronRightIcon, DocumentTextIcon } from '@heroicons/react/24/outline'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AdminErrorDisplay } from '../components/ui/admin-error-display'
import { AdminLoadingState } from '../components/ui/admin-loading-state'
import { Button } from '../components/ui/button'
import { useAdminAuth } from '../hooks/useAdminAuth'
import { useLanguages } from '../hooks/useLanguages'
import { adminApi } from '../services/adminApi'
import { ADMIN_LOADING_MESSAGES, AdminErrorHandler } from '../utils/admin-frontend-utils'

interface TemplateData {
  template_content: string
  available_parameters: string[]
  template_stats: {
    file_path: string
    line_count: number
    word_count: number
    character_count: number
  }
  language_info: {
    success: boolean
    language: {
      id: string
      code: string
      name: string
      native_name: string
    }
  }
  activity_type: string
  level: string
}

interface GenerationResult {
  success: boolean
  total_generated: number
  questions_saved: number
  generation_time?: string
  error_message?: string
}

export default function QuestionGenerationPage() {
  const { token } = useAdminAuth()
  const { languages } = useLanguages()
  const navigate = useNavigate()

  // Template preview state
  const [templateData, setTemplateData] = useState<TemplateData | null>(null)
  const [templateLoading, setTemplateLoading] = useState(false)
  const [templateError, setTemplateError] = useState<string | null>(null)
  const [showTemplatePreview, setShowTemplatePreview] = useState(false)

  // Generation form state
  const [generateForm, setGenerateForm] = useState({
    language_id: '', // No default - user must select
    activity_type: '', // No default - user must select
    level: '', // No default - user must select
    difficulty_level: 'difficult',
    count: 5
  })

  // Generation state
  const [generateLoading, setGenerateLoading] = useState(false)
  const [generateError, setGenerateError] = useState<string | null>(null)
  const [generateResult, setGenerateResult] = useState<GenerationResult | null>(null)

  // Confirmation modal state
  const [showConfirmModal, setShowConfirmModal] = useState(false)

  // JSON Upload state
  const [uploading, setUploading] = useState(false)
  const [uploadStatus, setUploadStatus] = useState<{
    success: boolean;
    message: string;
    details?: string[];
  } | null>(null)

  // JSON Paste state
  const [jsonText, setJsonText] = useState('')
  const [jsonError, setJsonError] = useState<string | null>(null)
  const [parsedJsonData, setParsedJsonData] = useState<any | null>(null)
  const [showJsonConfirmModal, setShowJsonConfirmModal] = useState(false)

  // Get supported levels for selected language
  const getSupportedLevels = (): string[] => {
    const lang = languages.find(l => l.language_id === generateForm.language_id)
    if (!lang || !lang.supported_levels) return []
    // Handle both formats: string[] or object[] with .code property
    if (typeof lang.supported_levels[0] === 'string') {
      return lang.supported_levels as unknown as string[]
    }
    return lang.supported_levels.map(level => level.code)
  }

  // Load template when form values change
  useEffect(() => {
    if (token && generateForm.language_id && generateForm.activity_type && generateForm.level) {
      loadTemplatePreview()
    }
  }, [token, generateForm.language_id, generateForm.activity_type, generateForm.level])

  const loadTemplatePreview = async () => {
    if (!token) return

    setTemplateLoading(true)
    AdminErrorHandler.clear(setTemplateError)

    const result = await AdminErrorHandler.handleAsync(
      async () => {
        const response = await adminApi.getTemplatePreview(
          token,
          generateForm.language_id,
          generateForm.activity_type,
          generateForm.level,
          generateForm.difficulty_level,
          generateForm.count
        )

        if (response.success && response.data) {
          return response.data as TemplateData
        } else {
          throw new Error(response.message || 'Failed to load template preview')
        }
      },
      setTemplateError,
      'Template Preview'
    )

    if (result) {
      setTemplateData(result)
    }

    setTemplateLoading(false)
  }

  const handleGenerateQuestions = async () => {
    if (!token || generateLoading) return

    setGenerateLoading(true)
    AdminErrorHandler.clear(setGenerateError)
    setGenerateResult(null)
    setShowConfirmModal(false) // Close modal when starting generation

    const result = await AdminErrorHandler.handleAsync(
      async () => {
        const response = await adminApi.generateQuestions(token, generateForm)

        if (response.success) {
          return {
            success: true,
            total_generated: response.data?.total_generated || response.data?.questions_generated || generateForm.count,
            questions_saved: response.data?.questions_saved || response.data?.total_generated || generateForm.count,
            generation_time: response.data?.generation_time,
          } as GenerationResult
        } else {
          throw new Error(response.message || 'Failed to generate questions')
        }
      },
      setGenerateError,
      'Generate Questions'
    )

    if (result) {
      setGenerateResult(result)
    }

    setGenerateLoading(false)
  }

  const showGenerateConfirmation = () => {
    setShowConfirmModal(true)
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setUploading(true)
    setUploadStatus(null)

    try {
      // Read file content as JSON
      const fileContent = await file.text()
      const jsonData = JSON.parse(fileContent)

      // Add default language_id if not provided and user has selected one
      if (!jsonData.language_id && generateForm.language_id) {
        jsonData.language_id = generateForm.language_id
      }
      if (!jsonData.activity_type && generateForm.activity_type) {
        jsonData.activity_type = generateForm.activity_type
      }
      if (!jsonData.level && generateForm.level) {
        jsonData.level = generateForm.level
      }

      if (!token) {
        throw new Error('Authentication token not available')
      }

      const response = await adminApi.uploadQuestions(token, jsonData)

      if (response.success) {
        setUploadStatus({
          success: true,
          message: `Successfully uploaded ${response.data?.questions_saved || 0} questions!`,
          details: response.data?.validation_errors || []
        })
      } else {
        setUploadStatus({
          success: false,
          message: response.message || 'Failed to upload questions',
          details: [response.message || 'Unknown error occurred']
        })
      }
    } catch (parseError) {
      setUploadStatus({
        success: false,
        message: 'Invalid JSON file format',
        details: [parseError instanceof Error ? parseError.message : 'Could not parse JSON file']
      })
    }

    setUploading(false)

    // Clear file input
    event.target.value = ''
  }

  const validateAndParseJson = (jsonString: string) => {
    try {
      const parsed = JSON.parse(jsonString)

      // Validate structure
      if (!parsed.questions || !Array.isArray(parsed.questions)) {
        throw new Error('JSON must contain a "questions" array')
      }

      if (parsed.questions.length === 0) {
        throw new Error('Questions array cannot be empty')
      }

      // Add required fields from form if not already present in JSON
      // Only add if user has made selections in the form
      if (!parsed.language_id && generateForm.language_id) {
        parsed.language_id = generateForm.language_id
      }
      if (!parsed.activity_type && generateForm.activity_type) {
        parsed.activity_type = generateForm.activity_type
      }
      if (!parsed.level && generateForm.level) {
        parsed.level = generateForm.level
      }

      // Validate required fields are present
      if (!parsed.language_id) {
        throw new Error('language_id is required - either include it in JSON or select a language in the form above')
      }
      if (!parsed.activity_type) {
        throw new Error('activity_type is required - either include it in JSON or select an activity type in the form above')
      }
      if (!parsed.level) {
        throw new Error('level is required - either include it in JSON or select a level in the form above')
      }

      // Validate each question based on activity type and question type
      for (let i = 0; i < parsed.questions.length; i++) {
        const question = parsed.questions[i]
        const questionNum = i + 1

        // Determine activity type from form or question
  const activityType = generateForm.activity_type || parsed.activity_type

                // Activity-specific validations
        if (activityType === 'reading') {
          // Reading questions require text passage
          if (!question.text) {
            throw new Error(`Question ${questionNum} (reading) is missing required field: text`)
          }
          if (!question.question) {
            throw new Error(`Question ${questionNum} (reading) is missing required field: question`)
          }
          if (!question.correct_answer) {
            throw new Error(`Question ${questionNum} (reading) is missing required field: correct_answer`)
          }
          if (!question.correct_answer_reason) {
            throw new Error(`Question ${questionNum} (reading) is missing required field: correct_answer_reason`)
          }
          if (!question.topic) {
            throw new Error(`Question ${questionNum} (reading) is missing required field: topic`)
          }

          // Check question type specific fields
          const questionType = question.question_type
          if (questionType === 'mcq') {
            if (!question.options || !Array.isArray(question.options) || question.options.length < 2) {
              throw new Error(`Question ${questionNum} (MCQ) must have at least 2 options`)
            }
          } else if (questionType === 'true_false') {
            if (!question.options || !Array.isArray(question.options) || question.options.length !== 2) {
              throw new Error(`Question ${questionNum} (True/False) must have exactly 2 options`)
            }
          }

        } else if (activityType === 'writing') {
          // Writing questions have different structure
          if (!question.instruction) {
            throw new Error(`Question ${questionNum} (writing) is missing required field: instruction`)
          }
          if (!question.requirements) {
            throw new Error(`Question ${questionNum} (writing) is missing required field: requirements`)
          }
          if (question.minimum_words === undefined || question.minimum_words === null) {
            throw new Error(`Question ${questionNum} (writing) is missing required field: minimum_words`)
          }
          if (typeof question.minimum_words !== 'number' || question.minimum_words < 1) {
            throw new Error(`Question ${questionNum} (writing) minimum_words must be a positive number`)
          }
          if (!question.topic) {
            throw new Error(`Question ${questionNum} (writing) is missing required field: topic`)
          }

        } else if (activityType === 'grammar') {
          // Grammar questions structure
          if (!question.instruction) {
            throw new Error(`Question ${questionNum} (grammar) is missing required field: instruction`)
          }
          if (!question.grammar_topic) {
            throw new Error(`Question ${questionNum} (grammar) is missing required field: grammar_topic`)
          }
          if (!question.explanation) {
            throw new Error(`Question ${questionNum} (grammar) is missing required field: explanation`)
          }

          // Grammar can have context/text (optional) and options for MCQ
          const questionType = question.question_type
          if (questionType === 'mcq') {
            if (!question.options || !Array.isArray(question.options) || question.options.length < 2) {
              throw new Error(`Question ${questionNum} (Grammar MCQ) must have at least 2 options`)
            }
          }
        } else if (activityType === 'hearing') {
          if (!question.transcript) {
            throw new Error(`Question ${questionNum} (hearing) is missing required field: transcript`)
          }
          if (!question.question) {
            throw new Error(`Question ${questionNum} (hearing) is missing required field: question`)
          }
          if (!question.correct_answer) {
            throw new Error(`Question ${questionNum} (hearing) is missing required field: correct_answer`)
          }
          if (!question.correct_answer_reason) {
            throw new Error(`Question ${questionNum} (hearing) is missing required field: correct_answer_reason`)
          }
          if (!question.topic) {
            throw new Error(`Question ${questionNum} (hearing) is missing required field: topic`)
          }

          const questionType = question.question_type
          if (!questionType || !['mcq', 'true_false', 'fill_in_blank', 'short_answer'].includes(questionType)) {
            throw new Error(`Question ${questionNum} (hearing) must have question_type "mcq", "true_false", "fill_in_blank", or "short_answer"`)
          }

          // Options validation: required for mcq/true_false, should be null/empty for fill_in_blank/short_answer
          if (['mcq', 'true_false'].includes(questionType)) {
            if (!question.options || !Array.isArray(question.options)) {
              throw new Error(`Question ${questionNum} (hearing ${questionType}) must include options array`)
            }

            if (questionType === 'mcq' && question.options.length !== 4) {
              throw new Error(`Question ${questionNum} (hearing mcq) must include exactly 4 options`)
            }
            if (questionType === 'true_false' && question.options.length !== 2) {
              throw new Error(`Question ${questionNum} (hearing true_false) must include exactly 2 options`)
            }
          } else {
            // fill_in_blank or short_answer should NOT have options
            if (question.options && question.options.length > 0) {
              throw new Error(`Question ${questionNum} (hearing ${questionType}) should not have options - set options to null or []`)
            }
          }

          if ('audio_url' in question && question.audio_url !== null && typeof question.audio_url !== 'string') {
            throw new Error(`Question ${questionNum} (hearing) audio_url must be null or a string`)
          }
        } else if (activityType === 'speaking') {
          // Speaking questions are monologue prompts
          if (!question.transcript) {
            throw new Error(`Question ${questionNum} (speaking) is missing required field: transcript`)
          }
          if (!question.question) {
            throw new Error(`Question ${questionNum} (speaking) is missing required field: question`)
          }
          if (!question.correct_answer) {
            throw new Error(`Question ${questionNum} (speaking) is missing required field: correct_answer`)
          }
          if (!question.correct_answer_reason) {
            throw new Error(`Question ${questionNum} (speaking) is missing required field: correct_answer_reason`)
          }
          if (!question.topic) {
            throw new Error(`Question ${questionNum} (speaking) is missing required field: topic`)
          }

          const questionType = question.question_type
          if (questionType && questionType !== 'monologue') {
            throw new Error(`Question ${questionNum} (speaking) must have question_type "monologue" or null`)
          }

          // Speaking questions should NOT have options (it's a monologue response)
          if (question.options && question.options.length > 0) {
            throw new Error(`Question ${questionNum} (speaking monologue) should not have options - set options to null or []`)
          }

          // Validate question_metadata for min/max duration
          if (question.question_metadata) {
            const metadata = question.question_metadata
            if (metadata.min_answer_seconds && typeof metadata.min_answer_seconds !== 'number') {
              throw new Error(`Question ${questionNum} (speaking) question_metadata.min_answer_seconds must be a number`)
            }
            if (metadata.max_answer_seconds && typeof metadata.max_answer_seconds !== 'number') {
              throw new Error(`Question ${questionNum} (speaking) question_metadata.max_answer_seconds must be a number`)
            }
            if (metadata.min_answer_seconds && metadata.max_answer_seconds && metadata.min_answer_seconds > metadata.max_answer_seconds) {
              throw new Error(`Question ${questionNum} (speaking) min_answer_seconds cannot be greater than max_answer_seconds`)
            }
          }

          if ('audio_url' in question && question.audio_url !== null && typeof question.audio_url !== 'string') {
            throw new Error(`Question ${questionNum} (speaking) audio_url must be null or a string`)
          }
        }
      }

      return parsed
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Invalid JSON format')
    }
  }

  const handleJsonTextChange = (value: string) => {
    setJsonText(value)
    setJsonError(null)
    setParsedJsonData(null)

    if (value.trim()) {
      try {
        const jsonData = validateAndParseJson(value)
        setParsedJsonData(jsonData)
      } catch (error) {
        setJsonError(error instanceof Error ? error.message : 'Invalid JSON')
      }
    }
  }

  const beautifyJson = () => {
    if (jsonText.trim()) {
      try {
        const parsed = JSON.parse(jsonText)
        const beautified = JSON.stringify(parsed, null, 2)
        setJsonText(beautified)
      } catch (error) {
        // If parsing fails, don't change the text
      }
    }
  }

  const showJsonUploadConfirmation = () => {
    if (parsedJsonData && parsedJsonData.questions && parsedJsonData.questions.length > 0 && !jsonError) {
      setShowJsonConfirmModal(true)
    }
  }

  const handleJsonUpload = async () => {
    if (!token || !parsedJsonData) return

    setUploading(true)
    setUploadStatus(null)
    setShowJsonConfirmModal(false)

    try {
      // Use the parsed JSON data which already has the required top-level fields
      const uploadData = {
        ...parsedJsonData,
        upload_metadata: {
          source: "json_paste",
          created_by: "admin",
          timestamp: new Date().toISOString()
        }
      }

      const response = await adminApi.uploadQuestions(token, uploadData)

      if (response.success) {
        setUploadStatus({
          success: true,
          message: `Successfully uploaded ${response.data?.questions_saved || parsedJsonData.questions.length} questions!`,
          details: response.data?.validation_errors || []
        })
        // Clear the form on success
        setJsonText('')
        setParsedJsonData(null)
      } else {
        setUploadStatus({
          success: false,
          message: response.message || 'Failed to upload questions',
          details: [response.message || 'Unknown error occurred']
        })
      }
    } catch (error) {
      setUploadStatus({
        success: false,
        message: 'Upload failed',
        details: [error instanceof Error ? error.message : 'Unknown error occurred']
      })
    }

    setUploading(false)
  }

  const getLanguageName = (languageId: string) => {
    const lang = languages.find(l => l.language_id === languageId)
    return lang ? lang.language_name : 'Unknown'
  }

  const handleRetry = () => {
    loadTemplatePreview()
  }

  const goBackToQuestions = () => {
    navigate('/questions')
  }

  const getActivityEmoji = (activityType: string) => {
    const emojis = {
      reading: '📖',
      writing: '✍️',
      grammar: '📝',
      hearing: '🎧',
      speaking: '🎤'
    }
    return emojis[activityType as keyof typeof emojis] || '📋'
  }

  const getDifficultyColor = (difficulty: string) => {
    const colors = {
      standard: 'text-green-600 bg-green-50',
      difficult: 'text-red-600 bg-red-50'
    }
    return colors[difficulty as keyof typeof colors] || 'text-gray-600 bg-gray-50'
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Button
            onClick={goBackToQuestions}
            variant="outline"
            size="sm"
          >
            ← Back to Questions
          </Button>
          <h1 className="text-2xl font-bold flex items-center space-x-2">
            <BeakerIcon className="h-8 w-8 text-blue-600" />
            <span>Question Generation</span>
          </h1>
        </div>
      </div>

      {/* Main Content */}
      <div className="space-y-6">

        {/* Generation Parameters */}
        <div className="admin-card">
          <div className="admin-card-header">
            <h2 className="text-xl font-semibold">
              Configure Generation Parameters
            </h2>
          </div>
          <div className="admin-card-content">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              {/* Language Selection */}
              <div>
                <label className="block text-sm font-medium mb-2">Language</label>
                <select
                  value={generateForm.language_id}
                  onChange={(e) => setGenerateForm({ ...generateForm, language_id: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  disabled={generateLoading}
                >
                  <option value="">Select Language</option>
                  {languages.map(lang => (
                    <option key={lang.language_id} value={lang.language_id}>
                      {lang.language_name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Activity Type */}
              <div>
                <label className="block text-sm font-medium mb-2">Activity Type</label>
                <select
                  value={generateForm.activity_type}
                  onChange={(e) => setGenerateForm({ ...generateForm, activity_type: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  disabled={generateLoading}
                >
                  <option value="">Select Activity</option>
                  <option value="reading">📖 Reading</option>
                  <option value="writing">✍️ Writing</option>
                  <option value="grammar">📝 Grammar</option>
                  <option value="hearing">🎧 Listening</option>
                  <option value="speaking">🎤 Speaking</option>
                </select>
              </div>

              {/* Level */}
              <div>
                <label className="block text-sm font-medium mb-2">CEFR Level</label>
                <select
                  value={generateForm.level}
                  onChange={(e) => setGenerateForm({ ...generateForm, level: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  disabled={generateLoading || !generateForm.language_id}
                >
                  <option value="">Select Level</option>
                  {getSupportedLevels().map(level => (
                    <option key={level} value={level}>{level}</option>
                  ))}
                </select>
                {!generateForm.language_id && (
                  <p className="text-xs text-gray-500 mt-1">Select a language first</p>
                )}
              </div>

              {/* Difficulty */}
              <div>
                <label className="block text-sm font-medium mb-2">Difficulty</label>
                <select
                  value={generateForm.difficulty_level}
                  onChange={(e) => setGenerateForm({ ...generateForm, difficulty_level: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  disabled={generateLoading}
                >
                  <option value="standard">🟢 Standard</option>
                  <option value="difficult">🔴 Difficult</option>
                </select>
              </div>

              {/* Count */}
              <div>
                <label className="block text-sm font-medium mb-2">Questions</label>
                <select
                  value={generateForm.count}
                  onChange={(e) => setGenerateForm({ ...generateForm, count: parseInt(e.target.value) || 5 })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  disabled={generateLoading}
                >
                  <option value={1}>1 Question</option>
                  <option value={2}>2 Questions</option>
                  <option value={5}>5 Questions</option>
                  <option value={10}>10 Questions</option>
                  <option value={15}>15 Questions</option>
                  <option value={20}>20 Questions</option>
                  <option value={25}>25 Questions</option>
                  <option value={30}>30 Questions</option>
                  <option value={40}>40 Questions</option>
                  <option value={50}>50 Questions</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  {generateForm.count > 10 && '⚡ Parallel processing enabled'}
                </p>
              </div>
            </div>

            {/* Configuration Summary */}
            <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <span className="text-sm font-medium text-blue-700">Generation Target:</span>
                  <div className="flex items-center space-x-2">
                    {generateForm.language_id && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {getLanguageName(generateForm.language_id)}
                      </span>
                    )}
                    {generateForm.activity_type && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        {getActivityEmoji(generateForm.activity_type)} {generateForm.activity_type.charAt(0).toUpperCase() + generateForm.activity_type.slice(1)}
                      </span>
                    )}
                    {generateForm.level && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                        {generateForm.level}
                      </span>
                    )}
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(generateForm.difficulty_level)}`}>
                      {generateForm.difficulty_level.charAt(0).toUpperCase() + generateForm.difficulty_level.slice(1)}
                    </span>
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      {generateForm.count} questions
                    </span>
                  </div>
                </div>
                <Button
                  onClick={() => setShowTemplatePreview(!showTemplatePreview)}
                  variant="outline"
                  size="sm"
                  className="flex items-center space-x-1"
                  disabled={!generateForm.language_id || !generateForm.activity_type || !generateForm.level}
                >
                  {showTemplatePreview ? <ChevronDownIcon className="h-4 w-4" /> : <ChevronRightIcon className="h-4 w-4" />}
                  <span>View and Generate</span>
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Template Preview (Collapsible) */}
        {showTemplatePreview && (
          <div className="admin-card">
            <div className="admin-card-header">
              <h2 className="text-xl font-semibold flex items-center space-x-2">
                <DocumentTextIcon className="h-6 w-6 text-indigo-600" />
                <span>AI Prompt Template</span>
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                This is the exact prompt that will be sent to the AI for question generation
              </p>
            </div>
            <div className="admin-card-content">
              {templateLoading && (
                <AdminLoadingState message={ADMIN_LOADING_MESSAGES.loadingTemplate} />
              )}

              {templateError && (
                <AdminErrorDisplay
                  title="Failed to Load Template"
                  message={templateError}
                  onRetry={handleRetry}
                />
              )}

              {templateData && !templateLoading && (
                <div className="space-y-4">
                  {/* Template Stats */}
                  <div className="grid grid-cols-4 gap-4 p-3 bg-gray-50 rounded-lg">
                    <div className="text-center">
                      <div className="text-lg font-semibold text-gray-700">{templateData.template_stats.line_count}</div>
                      <div className="text-xs text-gray-500">Lines</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-semibold text-gray-700">{templateData.template_stats.word_count}</div>
                      <div className="text-xs text-gray-500">Words</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-semibold text-gray-700">{templateData.template_stats.character_count}</div>
                      <div className="text-xs text-gray-500">Characters</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-semibold text-gray-700">{templateData.available_parameters?.length || 0}</div>
                      <div className="text-xs text-gray-500">Parameters</div>
                    </div>
                  </div>

                  {/* Available Parameters */}
                  {templateData.available_parameters && templateData.available_parameters.length > 0 && (
                    <div>
                      <h4 className="font-medium text-gray-700 mb-2">Dynamic Parameters:</h4>
                      <div className="flex flex-wrap gap-2">
                        {templateData.available_parameters.map((param, index) => (
                          <span key={index} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full font-mono">
                            {param}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Template Content */}
                  <div>
                    <h4 className="font-medium text-gray-700 mb-2">Template Content:</h4>
                    <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm max-h-64 overflow-y-auto">
                      <pre className="whitespace-pre-wrap">{templateData.template_content}</pre>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      File: {templateData.template_stats.file_path}
                    </p>
                  </div>

                  {/* Generation Results */}
                  {generateResult && (
                    <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                      <h4 className="font-medium text-green-800 mb-2">Generation Results:</h4>
                      <p className="text-sm text-green-700">
                        {generateResult.success ? (
                          <>
                            <CheckCircleIcon className="h-5 w-5 inline-block mr-1 text-green-500" />
                            Successfully generated {generateResult.total_generated} questions!
                          </>
                        ) : (
                          <>
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 inline-block mr-1 text-red-500"><path d="M21 6l-13.5 13.5M21 6l-13.5-13.5"/></svg>
                            Generation failed: {generateResult.error_message || 'Unknown error'}
                          </>
                        )}
                      </p>
                      {generateResult.generation_time && (
                        <p className="text-xs text-green-600 mt-1">
                          Generation time: {generateResult.generation_time}
                        </p>
                      )}
                      {generateResult.questions_saved > 0 && (
                        <p className="text-xs text-green-600 mt-1">
                          Questions saved: {generateResult.questions_saved}
                        </p>
                      )}
                      <div className="flex justify-center space-x-3 mt-4">
                        <Button
                          onClick={goBackToQuestions}
                          className="px-4 py-2"
                          size="sm"
                        >
                          View All Questions
                        </Button>
                        <Button
                          onClick={() => setGenerateResult(null)}
                          variant="outline"
                          className="px-4 py-2"
                          size="sm"
                        >
                          Generate More
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Generation Loading */}
                  {generateLoading && (
                    <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex items-center justify-center space-x-3">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                        <span className="text-blue-800 font-medium">Generating {generateForm.count} questions...</span>
                      </div>
                      <p className="text-xs text-blue-600 text-center mt-2">This may take a few moments</p>
                    </div>
                  )}

                  {/* Generation Error */}
                  {generateError && (
                    <div className="mt-6">
                      <AdminErrorDisplay
                        title="Generation Failed"
                        message={generateError}
                        onRetry={showGenerateConfirmation}
                      />
                    </div>
                  )}

                  {/* Generate Button */}
                  <div className="text-center pt-4 border-t border-gray-200">
                    <Button
                      onClick={showGenerateConfirmation}
                      disabled={generateLoading || templateLoading}
                      className="px-8 py-3"
                      size="lg"
                    >
                      🎯 Generate {generateForm.count} Questions
                    </Button>
                    <p className="text-sm text-gray-500 mt-2">
                      Click to review your settings and confirm generation
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}



        {/* JSON Upload Section */}
        <div className="admin-card">
          <div className="admin-card-header">
                         <h2 className="text-xl font-semibold">
               📤 Upload Questions from JSON
                          </h2>
              <div className="mt-2 mx-4 py-2 px-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-xs text-blue-800">
                  💡 <strong>Note:</strong> Language, activity type, level, and difficulty will be automatically added from your form selections above. Only include the question-specific fields in your JSON.
                </p>
              </div>
          </div>

          <div className="admin-card-content">
            <div className="space-y-6">
              {/* Upload Options */}
              <div className="space-y-6">

                {/* File Upload Option */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-gray-900">
                    📁 Upload JSON File for German A2 Writing (Untested)
                  </h3>
                  <div>
                    <label htmlFor="json-file" className="block text-sm font-medium text-gray-700 mb-2">
                      Select JSON File
                    </label>
                    <input
                      type="file"
                      id="json-file"
                      accept=".json"
                      onChange={handleFileUpload}
                      className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-600 file:text-white hover:file:bg-blue-700 border border-gray-300 rounded-lg cursor-pointer"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Upload a JSON file with questions structure
                    </p>
                  </div>
                </div>

                {/* JSON Paste Option */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-gray-900">
                    📝 Paste JSON{generateForm.language_id && generateForm.activity_type && generateForm.level ? ` for ${getLanguageName(generateForm.language_id)} ${generateForm.level} ${generateForm.activity_type.charAt(0).toUpperCase() + generateForm.activity_type.slice(1)}` : ''}
                  </h3>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-medium text-gray-700">
                        JSON Questions Data
                      </label>
                      <div className="flex space-x-2">
                        <Button
                          onClick={beautifyJson}
                          variant="outline"
                          size="sm"
                          disabled={!jsonText.trim()}
                          className="text-xs"
                        >
                          🎨 Beautify
                        </Button>
                        {parsedJsonData && parsedJsonData.questions && parsedJsonData.questions.length > 0 && (
                          <Button
                            onClick={showJsonUploadConfirmation}
                            size="sm"
                            className="text-xs"
                            disabled={!!jsonError}
                          >
                            📤 Upload {parsedJsonData.questions.length} Questions
                          </Button>
                        )}
                      </div>
                    </div>
                    <textarea
                      value={jsonText}
                      onChange={(e) => handleJsonTextChange(e.target.value)}
                      placeholder={`Paste your JSON here...

For ${generateForm.activity_type} questions:
${generateForm.activity_type === 'reading' ? `{
  "questions": [
    {
      "text": "Reading passage text here...",
      "question": "What is the main topic?",
      "question_type": "mcq",
      "options": ["a) Option 1", "b) Option 2", "c) Option 3"],
      "correct_answer": "a",
      "correct_answer_reason": "Because...",
      "topic": "topic name"
    }
  ]
}` : generateForm.activity_type === 'writing' ? `{
  "questions": [
    {
      "instruction": "Write about your daily routine",
      "requirements": "Use present tense, minimum 50 words",
      "minimum_words": 50,
      "topic": "daily life",
      "writing_format": "paragraph"
    }
  ]
}` : generateForm.activity_type === 'hearing' ? `{
  "questions": [
    {
      "transcript": "Ansage: Guten Tag, der Zug nach München fährt heute...",
      "question": "Wohin fährt der Zug?",
      "question_type": "mcq",
      "options": ["a) nach Köln", "b) nach München", "c) nach Hamburg", "d) nach Berlin"],
      "correct_answer": "b",
      "correct_answer_reason": "In der Ansage steht 'nach München'",
      "topic": "travel",
      "task_type": "Train announcement",
      "audio_url": null,
      "question_metadata": {
        "needs_audio_upload": true,
        "recommended_voice": "female",
        "estimated_duration_seconds": 55,
        "speaker_context": "Bahnhofsansage"
      }
    }
  ]
}` : generateForm.activity_type === 'speaking' ? `{
  "questions": [
    {
      "transcript": "Bitte stellen Sie sich vor. Sagen Sie Ihren Namen, woher Sie kommen und was Sie gerne machen.",
      "question": "Introduce yourself. Say your name, where you are from, and what you like to do.",
      "correct_answer": "A good response includes: name, country/city of origin, and at least one hobby or interest. Should be 3-5 sentences.",
      "correct_answer_reason": "The response should be personal, clear, and use basic A1 vocabulary. Expected elements: Ich heiße..., Ich komme aus..., Ich mag/liebe...",
      "topic": "Self Introduction",
      "question_type": "monologue",
      "audio_url": null,
      "question_metadata": {
        "min_answer_seconds": 15,
        "max_answer_seconds": 45,
        "suggested_duration": 30,
        "difficulty_notes": "Basic self-introduction suitable for A1 beginners",
        "key_vocabulary": ["Name", "Land", "Stadt", "Hobby", "mögen"]
      }
    }
  ]
}` : `{
  "questions": [
    {
      "grammar_topic": "Articles",
      "explanation": "Articles must match gender and case",
      "instruction": "Choose the correct article: ___ Hund ist groß",
      "tip": "Hund is masculine, requires 'der'"
    }
  ]
}`}`}
                      className="w-full h-64 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm resize-vertical"
                    />

                    {/* JSON Validation Status */}
                    {jsonText.trim() && (
                      <div className="mt-2">
                        {jsonError ? (
                          <div className="flex items-center space-x-2 text-red-600">
                            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                            <span className="text-xs">{jsonError}</span>
                          </div>
                        ) : parsedJsonData && parsedJsonData.questions && parsedJsonData.questions.length > 0 ? (
                          <div className="flex items-center space-x-2 text-green-600">
                            <CheckCircleIcon className="h-4 w-4" />
                            <span className="text-xs">Valid JSON with {parsedJsonData.questions.length} questions</span>
                          </div>
                        ) : null}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Upload Status */}
              {uploadStatus && (
                <div className={`p-4 rounded-lg border ${
                  uploadStatus.success
                    ? 'bg-green-50 border-green-200 text-green-800'
                    : 'bg-red-50 border-red-200 text-red-800'
                }`}>
                  <p className="font-medium">{uploadStatus.message}</p>
                  {uploadStatus.details && uploadStatus.details.length > 0 && (
                    <ul className="mt-2 text-sm space-y-1">
                      {uploadStatus.details.map((detail, index) => (
                        <li key={index} className="flex items-start space-x-2">
                          <span>•</span>
                          <span>{detail}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {/* Upload Progress */}
              {uploading && (
                <AdminLoadingState message="Uploading and validating questions..." />
              )}

              {/* JSON Structure Example */}
              <details className="mt-4">
                <summary className="cursor-pointer font-medium text-gray-700 hover:text-gray-900">
                  📋 View JSON Structure Examples by Activity Type
                </summary>
                <div className="mt-2 space-y-4">

                  {/* Reading Questions */}
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <h4 className="font-medium text-blue-800 mb-2">📖 Reading Questions</h4>
                    <pre className="text-xs overflow-x-auto text-blue-900">
{`{
  "questions": [
    {
      "text": "Liebe Anna, ich gehe heute ins Kino...",
      "question": "Wohin geht die Person?",
      "question_type": "mcq",
      "options": ["a) ins Theater", "b) ins Kino", "c) ins Restaurant"],
      "correct_answer": "b",
      "correct_answer_reason": "Im Text steht 'ins Kino'",
      "topic": "free time"
    },
    {
      "text": "Der Bus fährt um 8:00 Uhr ab.",
      "question": "Der Bus fährt pünktlich ab.",
      "question_type": "true_false",
      "options": ["Richtig", "Falsch"],
      "correct_answer": "Richtig",
      "correct_answer_reason": "Eine feste Uhrzeit bedeutet pünktlich",
      "topic": "transport"
    }
  ]
}`}
                    </pre>
                  </div>

                  {/* Writing Questions */}
                  <div className="p-4 bg-green-50 rounded-lg">
                    <h4 className="font-medium text-green-800 mb-2">✍️ Writing Questions</h4>
                    <pre className="text-xs overflow-x-auto text-green-900">
{`{
  "questions": [
    {
      "instruction": "Schreibe über deine Familie",
      "requirements": "Mindestens 50 Wörter, verwende Präsens",
      "minimum_words": 50,
      "topic": "family",
      "writing_format": "paragraph"
    },
    {
      "instruction": "Beschreibe deinen Tagesablauf",
      "requirements": "Verwende Zeitangaben und Verben im Präsens",
      "minimum_words": 80,
      "topic": "daily routine",
      "writing_format": "structured text"
    }
  ]
}`}
                    </pre>
                  </div>

                  {/* Grammar Questions */}
                  <div className="p-4 bg-purple-50 rounded-lg">
                    <h4 className="font-medium text-purple-800 mb-2">📝 Grammar Questions</h4>
                    <pre className="text-xs overflow-x-auto text-purple-900">
{`{
  "questions": [
    {
      "grammar_topic": "Articles",
      "explanation": "Articles must match the gender of the noun (der/die/das)",
      "instruction": "Wähle den richtigen Artikel: ___ Haus ist groß",
      "tip": "Haus is neuter, so use 'das'"
    },
    {
      "grammar_topic": "Prepositions",
      "explanation": "Different prepositions are used for different contexts",
      "instruction": "Ergänze die Präposition: Ich gehe ___ Schule",
      "tip": "Use 'zur' when going to school"
    }
  ]
}`}
                    </pre>
                  </div>

                  {/* Hearing Questions */}
                  <div className="p-4 bg-indigo-50 rounded-lg">
                    <h4 className="font-medium text-indigo-800 mb-2">🎧 Listening Questions</h4>
                    <pre className="text-xs overflow-x-auto text-indigo-900">
{`{
  "questions": [
    {
      "transcript": "Ansage: Liebe Fahrgäste, der Bus nach Berlin fährt heute zehn Minuten später...",
      "question": "Wann fährt der Bus nach Berlin ab?",
      "question_type": "mcq",
      "options": ["a) um 9:00 Uhr", "b) um 9:10 Uhr", "c) um 9:30 Uhr", "d) um 10:00 Uhr"],
      "correct_answer": "b",
      "correct_answer_reason": "Die Ansage sagt 'zehn Minuten später', also um 9:10 Uhr",
      "topic": "travel",
      "task_type": "Bus announcement",
      "audio_url": null,
      "question_metadata": {
        "needs_audio_upload": true,
        "recommended_voice": "male",
        "estimated_duration_seconds": 50,
        "speaker_context": "Busbahnhof-Ansage"
      }
    },
    {
      "transcript": "Dialog: Frau Keller ruft in der Praxis an und fragt nach einem neuen Termin...",
      "question": "Was möchte Frau Keller?",
      "question_type": "true_false",
      "options": ["Richtig", "Falsch"],
      "correct_answer": "Richtig",
      "correct_answer_reason": "Im Dialog bittet sie um einen neuen Termin",
      "topic": "appointments",
      "task_type": "Phone call",
      "audio_url": null,
      "question_metadata": {
        "needs_audio_upload": true,
        "recommended_voice": "female",
        "estimated_duration_seconds": 65,
        "speaker_context": "Telefonat zwischen Patientin und Praxis"
      }
    }
  ]
}`}
                    </pre>
                  </div>

                  {/* Speaking Questions */}
                  <div className="p-4 bg-purple-50 rounded-lg">
                    <h4 className="font-medium text-purple-800 mb-2">🎤 Speaking Questions</h4>
                    <pre className="text-xs overflow-x-auto text-purple-900">
{`{
  "questions": [
    {
      "transcript": "Bitte stellen Sie sich vor. Sagen Sie Ihren Namen, woher Sie kommen und was Sie gerne machen.",
      "question": "Introduce yourself. Say your name, where you are from, and what you like to do.",
      "correct_answer": "A good response includes: name, country/city of origin, and at least one hobby or interest. Should be 3-5 sentences.",
      "correct_answer_reason": "The response should be personal, clear, and use basic A1 vocabulary. Expected elements: Ich heiße..., Ich komme aus..., Ich mag/liebe...",
      "topic": "Self Introduction",
      "question_type": "monologue",
      "audio_url": null,
      "question_metadata": {
        "min_answer_seconds": 15,
        "max_answer_seconds": 45,
        "suggested_duration": 30,
        "difficulty_notes": "Basic self-introduction suitable for A1 beginners",
        "key_vocabulary": ["Name", "Land", "Stadt", "Hobby", "mögen"]
      }
    },
    {
      "transcript": "Beschreiben Sie Ihren typischen Tag. Was machen Sie morgens, mittags und abends?",
      "question": "Describe your typical day. What do you do in the morning, afternoon, and evening?",
      "correct_answer": "A good response includes: morning activities (wake up, breakfast), afternoon activities (work/school), and evening activities (dinner, free time). Should use present tense.",
      "correct_answer_reason": "The response should include time expressions and daily activities using A1 vocabulary. Expected verbs: aufstehen, frühstücken, arbeiten, essen, schlafen.",
      "topic": "Daily Routine",
      "question_type": "monologue",
      "audio_url": null,
      "question_metadata": {
        "min_answer_seconds": 20,
        "max_answer_seconds": 50,
        "suggested_duration": 35,
        "difficulty_notes": "Describing daily routine with basic time expressions",
        "key_vocabulary": ["morgens", "mittags", "abends", "aufstehen", "essen", "arbeiten"]
      }
    }
  ]
}`}
                    </pre>
                  </div>

                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-xs text-yellow-800">
                      💡 <strong>Note:</strong> Language, activity type, level, and difficulty will be automatically added from your form selections above.
                      Only include the question-specific fields in your JSON.
                    </p>
                  </div>
                </div>
              </details>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Confirm Question Generation</h3>
              <p className="text-sm text-gray-600 mt-1">Please review your settings before generating</p>
            </div>
            <div className="p-6 space-y-4">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-700">Language:</span>
                  <span className="text-sm text-gray-900">{getLanguageName(generateForm.language_id)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-700">Activity Type:</span>
                  <span className="text-sm text-gray-900 flex items-center space-x-1">
                    <span>{getActivityEmoji(generateForm.activity_type)}</span>
                    <span>{generateForm.activity_type.charAt(0).toUpperCase() + generateForm.activity_type.slice(1)}</span>
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-700">CEFR Level:</span>
                  <span className="text-sm text-gray-900">{generateForm.level}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-700">Difficulty:</span>
                  <span className="text-sm text-gray-900">
                    {generateForm.difficulty_level.charAt(0).toUpperCase() + generateForm.difficulty_level.slice(1)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-700">Number of Questions:</span>
                  <span className="text-sm text-gray-900 font-semibold">{generateForm.count}</span>
                </div>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-xs text-blue-800">
                  🤖 AI will generate {generateForm.count} unique {generateForm.activity_type} questions at {generateForm.level} level
                  with {generateForm.difficulty_level} difficulty. This process may take a few moments.
                </p>
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 flex gap-3 justify-end">
              <Button
                onClick={() => setShowConfirmModal(false)}
                variant="outline"
                disabled={generateLoading}
              >
                Cancel
              </Button>
              <Button
                onClick={handleGenerateQuestions}
                disabled={generateLoading}
              >
                {generateLoading ? 'Generating...' : '✨ Start Generation'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* JSON Upload Confirmation Modal */}
      {showJsonConfirmModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Confirm JSON Upload</h3>
              <p className="text-sm text-gray-600 mt-1">Review the questions and metadata before uploading</p>
            </div>
            <div className="p-6 space-y-4">
              {/* Metadata Summary */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 mb-2">📋 Upload Metadata</h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-blue-700 font-medium">Language:</span>
                    <span className="ml-2 text-blue-900">{getLanguageName(generateForm.language_id)}</span>
                  </div>
                  <div>
                    <span className="text-blue-700 font-medium">Activity:</span>
                    <span className="ml-2 text-blue-900 flex items-center">
                      {getActivityEmoji(generateForm.activity_type)} {generateForm.activity_type.charAt(0).toUpperCase() + generateForm.activity_type.slice(1)}
                    </span>
                  </div>
                  <div>
                    <span className="text-blue-700 font-medium">Level:</span>
                    <span className="ml-2 text-blue-900">{generateForm.level}</span>
                  </div>
                  <div>
                    <span className="text-blue-700 font-medium">Difficulty:</span>
                    <span className="ml-2 text-blue-900">{generateForm.difficulty_level.charAt(0).toUpperCase() + generateForm.difficulty_level.slice(1)}</span>
                  </div>
                </div>
              </div>

              {/* Questions Summary */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-2">📊 Questions Summary</h4>
                <div className="text-sm text-gray-700">
                                  <p><strong>Total Questions:</strong> {parsedJsonData?.questions?.length || 0}</p>
                {parsedJsonData && parsedJsonData.questions && (
                    <div className="mt-2 space-y-1">
                      <p><strong>Question Types:</strong></p>
                      <div className="ml-4 text-xs">
                        {Object.entries(
                          parsedJsonData.questions.reduce((acc: Record<string, number>, q: any) => {
                            const type = q.question_type || 'unspecified'
                            acc[type] = (acc[type] || 0) + 1
                            return acc
                          }, {} as Record<string, number>)
                        ).map(([type, count]) => (
                          <div key={type} className="flex justify-between">
                            <span>• {type}:</span>
                            <span>{count as number}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Warning */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <p className="text-xs text-yellow-800">
                  ⚠️ The metadata above (language, activity type, level, difficulty) will be automatically added to all questions.
                  Make sure these settings match your JSON content.
                </p>
              </div>

              {/* Sample Question Preview */}
                              {parsedJsonData && parsedJsonData.questions && parsedJsonData.questions.length > 0 && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-2">👁️ First Question Preview</h4>
                  <div className="text-xs text-gray-700 space-y-1">
                    {/* Reading Questions Preview */}
                    {generateForm.activity_type === 'reading' && (
                      <>
                        <p><strong>Text:</strong> {parsedJsonData.questions[0].text?.substring(0, 100)}...</p>
                        <p><strong>Question:</strong> {parsedJsonData.questions[0].question}</p>
                        <p><strong>Type:</strong> {parsedJsonData.questions[0].question_type || 'unspecified'}</p>
                        {parsedJsonData.questions[0].options && (
                          <p><strong>Options:</strong> {parsedJsonData.questions[0].options.length} choices</p>
                        )}
                        <p><strong>Correct Answer:</strong> {parsedJsonData.questions[0].correct_answer}</p>
                        <p><strong>Topic:</strong> {parsedJsonData.questions[0].topic}</p>
                      </>
                    )}

                    {/* Writing Questions Preview */}
                    {generateForm.activity_type === 'writing' && (
                      <>
                        <p><strong>Instruction:</strong> {parsedJsonData.questions[0].instruction}</p>
                        <p><strong>Requirements:</strong> {parsedJsonData.questions[0].requirements}</p>
                        <p><strong>Minimum Words:</strong> {parsedJsonData.questions[0].minimum_words}</p>
                        <p><strong>Topic:</strong> {parsedJsonData.questions[0].topic}</p>
                        {parsedJsonData.questions[0].writing_format && (
                          <p><strong>Format:</strong> {parsedJsonData.questions[0].writing_format}</p>
                        )}
                      </>
                    )}

                    {/* Grammar Questions Preview */}
                    {generateForm.activity_type === 'grammar' && (
                      <>
                        <p><strong>Grammar Topic:</strong> {parsedJsonData.questions[0].grammar_topic}</p>
                        <p><strong>Instruction:</strong> {parsedJsonData.questions[0].instruction}</p>
                        <p><strong>Explanation:</strong> {parsedJsonData.questions[0].explanation?.substring(0, 80)}...</p>
                        {parsedJsonData.questions[0].tip && (
                          <p><strong>Tip:</strong> {parsedJsonData.questions[0].tip}</p>
                        )}
                      </>
                    )}

                    {/* Hearing Questions Preview */}
                    {generateForm.activity_type === 'hearing' && (
                      <>
                        <p><strong>Transcript:</strong> {parsedJsonData.questions[0].transcript?.substring(0, 120)}...</p>
                        <p><strong>Question:</strong> {parsedJsonData.questions[0].question}</p>
                        <p><strong>Type:</strong> {parsedJsonData.questions[0].question_type || 'unspecified'}</p>
                        {parsedJsonData.questions[0].options && (
                          <p><strong>Options:</strong> {parsedJsonData.questions[0].options.length} choices</p>
                        )}
                        <p><strong>Correct Answer:</strong> {parsedJsonData.questions[0].correct_answer}</p>
                        <p><strong>Topic:</strong> {parsedJsonData.questions[0].topic}</p>
                        {parsedJsonData.questions[0].task_type && (
                          <p><strong>Task Type:</strong> {parsedJsonData.questions[0].task_type}</p>
                        )}
                        <p><strong>Audio URL:</strong> {parsedJsonData.questions[0].audio_url === null ? 'null' : parsedJsonData.questions[0].audio_url || 'not provided'}</p>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
            <div className="p-6 border-t border-gray-200 flex gap-3 justify-end">
              <Button
                onClick={() => setShowJsonConfirmModal(false)}
                variant="outline"
                disabled={uploading}
              >
                Cancel
              </Button>
              <Button
                onClick={handleJsonUpload}
                disabled={uploading}
              >
                                  {uploading ? 'Uploading...' : `✨ Upload ${parsedJsonData?.questions?.length || 0} Questions`}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
