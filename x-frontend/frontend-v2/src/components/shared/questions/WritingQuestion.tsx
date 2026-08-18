import * as React from "react"
import { Badge, SpecialCharacterPicker } from "@/components/ui"
import { cn } from "@/lib/utils"

export interface WritingQuestionProps {
  questionData: {
    topic?: string
    task_type?: string
    instruction?: string
    prompt?: string
    question?: string
    requirements?: string
    minimum_words?: number
    writing_format?: string
  }
  userAnswer: string
  onAnswerChange: (answer: string) => void
  wordCount?: number
  wordValidation?: {
    isValid: boolean
    message?: string
  }
  minWords?: number
  maxWords?: number
  className?: string
  languageCode?: string // For special character picker (e.g., 'de', 'fr', 'es')
}

const WritingQuestion = React.forwardRef<HTMLDivElement, WritingQuestionProps>(
  ({ 
    questionData, 
    userAnswer, 
    onAnswerChange, 
    wordCount,
    wordValidation,
    minWords,
    maxWords,
    className,
    languageCode
  }, ref) => {
    const textareaRef = React.useRef<HTMLTextAreaElement>(null)
    const [isFullscreen, setIsFullscreen] = React.useState(false)

    const getTaskText = () => {
      return questionData.instruction || questionData.prompt || questionData.question || ''
    }

    const insertCharacterAtCursor = (char: string) => {
      const textarea = textareaRef.current
      if (!textarea) return

      const start = textarea.selectionStart
      const end = textarea.selectionEnd
      const newValue = userAnswer.substring(0, start) + char + userAnswer.substring(end)
      
      onAnswerChange(newValue)
      
      // Set cursor position after inserted character
      setTimeout(() => {
        textarea.focus()
        textarea.setSelectionRange(start + char.length, start + char.length)
      }, 0)
    }

    const toggleFullscreen = () => {
      setIsFullscreen(!isFullscreen)
      if (!isFullscreen) {
        // Scroll to top when entering fullscreen
        setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 100)
      }
    }

    return (
      <div 
        ref={ref} 
        className={cn(
          "space-y-3 md:space-y-4",
          isFullscreen && "fixed inset-0 z-[9999] bg-white overflow-y-auto",
          className
        )}
      >
        {/* Fullscreen Header (mobile only) - Respects safe area like AppHeader */}
        {isFullscreen && (
          <div className="sticky top-0 bg-white border-b border-gray-200 z-50 pt-safe shadow-sm">
            <div className="flex items-center justify-between p-3 md:p-4 min-h-[64px]">
              <h5 className="text-sm font-semibold text-gray-900">✏️ Writing Task</h5>
              <button
                onClick={toggleFullscreen}
                className="px-4 py-2 text-sm font-medium text-white bg-eu-blue rounded-lg hover:bg-eu-blue/90 transition-colors shadow-md min-h-[44px]"
              >
                ✓ Done Writing
              </button>
            </div>
          </div>
        )}

        {/* Content wrapper for fullscreen mode */}
        <div className={cn(isFullscreen && "p-3 md:p-4")}>

        {/* Topic and Task Type */}
        {(questionData.topic || questionData.task_type) && (
          <div className="bg-blue-50 rounded-lg border border-blue-200 p-2 md:p-3">
            <div className="flex flex-col sm:flex-row gap-2">
              {questionData.topic && (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs md:text-sm font-semibold text-blue-900">📝 Topic:</span>
                  <Badge variant="primary" size="sm">
                    {questionData.topic}
                  </Badge>
                </div>
              )}
              {questionData.task_type && (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs md:text-sm font-semibold text-blue-900">✉️ Type:</span>
                  <Badge variant="primary" size="sm">
                    {questionData.task_type}
                  </Badge>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Task Prompt */}
        <div className="bg-gray-50 rounded-lg p-3 md:p-4">
          <h5 className="text-xs md:text-sm font-semibold text-gray-900 mb-2">✏️ Your Task:</h5>
          <p className="text-xs md:text-sm text-gray-700 leading-relaxed mb-3">{getTaskText()}</p>

          {/* Requirements */}
          {questionData.requirements && (
            <div className="mb-3">
              <h6 className="text-xs md:text-sm font-medium text-gray-700 mb-1">Requirements:</h6>
              <p className="text-xs md:text-sm text-gray-600">{questionData.requirements}</p>
            </div>
          )}

          {/* Metadata row */}
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs md:text-sm text-gray-600">
            {questionData.minimum_words && (
              <p>
                <strong>Minimum Words:</strong> {questionData.minimum_words}
              </p>
            )}
            {questionData.writing_format && (
              <p>
                <strong>Format:</strong> {questionData.writing_format}
              </p>
            )}
          </div>
        </div>

        {/* Textarea for writing - Enhanced mobile experience */}
        <div>
          {/* Mobile Focus Mode Button - Only show when NOT in fullscreen */}
          {!isFullscreen && (
            <button
              onClick={toggleFullscreen}
              className="mb-2 w-full lg:hidden px-4 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg font-medium text-sm transition-colors border border-blue-200 flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
              </svg>
              Focus Mode (Better for Mobile)
            </button>
          )}

          {languageCode && (
            <SpecialCharacterPicker
              languageCode={languageCode}
              onCharacterSelect={insertCharacterAtCursor}
              className="mb-2"
            />
          )}
          
          <textarea
            ref={textareaRef}
            value={userAnswer}
            onChange={(e) => onAnswerChange(e.target.value)}
            placeholder="Write your answer here..."
            className={cn(
              "w-full p-3 md:p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-eu-blue focus:border-transparent text-base",
              isFullscreen 
                ? "min-h-[75vh] resize-none" 
                : "resize-y min-h-[350px] md:min-h-[400px]"
            )}
            rows={isFullscreen ? undefined : 12}
            style={{ fontSize: '16px' }} // Prevent iOS zoom on focus
          />
          
          {/* Word Count and Validation */}
          {wordCount !== undefined && (
            <div className={cn(
              "mt-2 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 text-xs md:text-sm",
              isFullscreen && "sticky bottom-0 bg-white border-t border-gray-200 pt-3 pb-2"
            )}>
              <div className="flex items-center gap-3 md:gap-4 flex-wrap">
                <span className="text-gray-600">
                  📝 Words:{' '}
                  <span className={cn(
                    "font-medium",
                    wordValidation?.isValid ? "text-green-600" : "text-red-600"
                  )}>
                    {wordCount}
                  </span>
                </span>
                
                {minWords && maxWords && (
                  <span className="text-gray-500 text-[10px] md:text-xs">
                    (Range: {minWords}-{maxWords})
                  </span>
                )}
              </div>
              
              {wordValidation && !wordValidation.isValid && wordValidation.message && (
                <span className="text-red-600 text-[10px] md:text-xs font-medium">
                  ⚠️ {wordValidation.message}
                </span>
              )}
            </div>
          )}

          {/* Exit message in fullscreen mode */}
          {isFullscreen && (
            <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg text-center">
              <p className="text-xs text-blue-800">
                💡 Click <strong>"Done Writing"</strong> at the top to exit and submit your answer
              </p>
            </div>
          )}
        </div>
        </div>
      </div>
    )
  }
)
WritingQuestion.displayName = "WritingQuestion"

export { WritingQuestion }

