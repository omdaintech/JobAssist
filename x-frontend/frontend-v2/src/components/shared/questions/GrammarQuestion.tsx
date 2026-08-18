import * as React from "react"
import { SpecialCharacterPicker } from "@/components/ui"
import { cn } from "@/lib/utils"

export interface GrammarQuestionProps {
  questionData: {
    grammar_topic?: string
    explanation?: string
    instruction?: string
    prompt?: string
    question?: string
    tip?: string
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

const GrammarQuestion = React.forwardRef<HTMLDivElement, GrammarQuestionProps>(
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
    const inputRef = React.useRef<HTMLInputElement>(null)

    const getTaskText = () => {
      return questionData.instruction || questionData.prompt || questionData.question || ''
    }

    const insertCharacterAtCursor = (char: string) => {
      const input = inputRef.current
      if (!input) return

      const start = input.selectionStart || 0
      const end = input.selectionEnd || 0
      const newValue = userAnswer.substring(0, start) + char + userAnswer.substring(end)
      
      onAnswerChange(newValue)
      
      // Set cursor position after inserted character
      setTimeout(() => {
        input.focus()
        input.setSelectionRange(start + char.length, start + char.length)
      }, 0)
    }

    return (
      <div ref={ref} className={cn("space-y-3 md:space-y-4", className)}>
        <div className="bg-gray-50 rounded-lg p-3 md:p-4 space-y-3">
          {/* Grammar Topic */}
          {questionData.grammar_topic && (
            <div className="bg-blue-50 rounded-lg border-l-4 border-eu-blue p-2 md:p-3">
              <h6 className="text-[10px] md:text-xs font-semibold text-gray-900 mb-1">Topic:</h6>
              <p className="text-xs md:text-sm text-gray-700">{questionData.grammar_topic}</p>
            </div>
          )}

          {/* Explanation */}
          {questionData.explanation && (
            <div>
              <h6 className="text-[10px] md:text-xs font-semibold text-gray-900 mb-1">Explanation:</h6>
              <p className="text-xs md:text-sm text-gray-700 leading-relaxed">{questionData.explanation}</p>
            </div>
          )}

          {/* Task */}
          <div className="bg-white rounded border p-2 md:p-3">
            <h6 className="text-[10px] md:text-xs font-semibold text-gray-900 mb-1">Task:</h6>
            <p className="text-xs md:text-sm text-gray-700">{getTaskText()}</p>
          </div>
        </div>

        {/* Text Input - Single line for grammar */}
        <div>
          {languageCode && (
            <SpecialCharacterPicker
              languageCode={languageCode}
              onCharacterSelect={insertCharacterAtCursor}
              className="mb-2"
            />
          )}
          <input
            ref={inputRef}
            type="text"
            value={userAnswer}
            onChange={(e) => onAnswerChange(e.target.value)}
            placeholder="Type your answer here..."
            className="w-full p-2 md:p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-eu-blue focus:border-transparent text-sm md:text-base"
          />
          
          {/* Word Count and Validation */}
          {wordCount !== undefined && (
            <div className="mt-2 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 text-xs md:text-sm">
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
                <span className="text-red-600 text-[10px] md:text-xs">
                  ⚠️ {wordValidation.message}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    )
  }
)
GrammarQuestion.displayName = "GrammarQuestion"

export { GrammarQuestion }

