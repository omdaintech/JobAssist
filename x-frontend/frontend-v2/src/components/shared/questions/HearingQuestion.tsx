import * as React from "react"
import { AudioPlayer, SpecialCharacterPicker } from "@/components/ui"
import { cn } from "@/lib/utils"

export interface HearingQuestionProps {
  questionData: {
    audio_url?: string
    transcript?: string
    question?: string
    options?: string[]
    question_type?: string
  }
  selectedAnswer?: string
  userAnswer?: string
  onSelectAnswer?: (answer: string) => void
  onAnswerChange?: (answer: string) => void
  className?: string
  sessionType?: 'practice' | 'exam' // For audio replay limits
  languageCode?: string // For special character picker (e.g., 'de', 'fr', 'es')
}

const HearingQuestion = React.forwardRef<HTMLDivElement, HearingQuestionProps>(
  ({ questionData, selectedAnswer, userAnswer, onSelectAnswer, onAnswerChange, className, sessionType, languageCode }, ref) => {
    const hasMultipleChoice = questionData.options && questionData.options.length > 0
    const inputRef = React.useRef<HTMLInputElement>(null)
    
    // Determine replay limit based on session type
    // Exam: 2 replays, Practice: unlimited (undefined)
    const maxReplays = sessionType === 'exam' ? 2 : undefined

    const insertCharacterAtCursor = (char: string) => {
      const input = inputRef.current
      if (!input) return

      const start = input.selectionStart || 0
      const end = input.selectionEnd || 0
      const newValue = (userAnswer || '').substring(0, start) + char + (userAnswer || '').substring(end)
      
      onAnswerChange?.(newValue)
      
      // Set cursor position after inserted character
      setTimeout(() => {
        input.focus()
        input.setSelectionRange(start + char.length, start + char.length)
      }, 0)
    }

    return (
      <div ref={ref} className={cn("space-y-3 md:space-y-4", className)}>
        {/* Audio Player */}
        {questionData.audio_url && (
          <AudioPlayer
            audioUrl={questionData.audio_url}
            transcript={questionData.transcript}
            className="mb-3 md:mb-4"
            maxReplays={maxReplays}
            sessionType={sessionType}
          />
        )}

        {/* Question */}
        <div>
          <h5 className="text-sm md:text-base font-medium text-gray-900 mb-2 md:mb-3">
            {questionData.question}
          </h5>
          
          {hasMultipleChoice ? (
            /* Multiple Choice Options */
            <div className="space-y-2">
              {questionData.options!.map((option, index) => {
                // Use question_type from database to determine answer format
                // Default to MCQ behavior if question_type is missing (legacy data)
                const isTrueFalse = questionData.question_type === 'true_false';
                
                const answerValue = isTrueFalse 
                  ? option  // Send actual text for true/false (e.g., "Richtig", "Falsch")
                  : String.fromCharCode(97 + index); // Send letter for MCQ (e.g., "a", "b", "c")
                
                return (
                  <button
                    key={index}
                    type="button"
                    className={cn(
                      "w-full text-left p-2 md:p-3 border rounded-lg transition-all min-h-[44px]",
                      selectedAnswer === answerValue
                        ? "border-purple-500 bg-purple-50 ring-2 ring-purple-500/20"
                        : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                    )}
                    onClick={() => onSelectAnswer?.(answerValue)}
                  >
                    <span className="font-medium text-gray-700 mr-2 text-sm md:text-base">
                      {String.fromCharCode(65 + index)}.
                    </span>
                    <span className="text-sm md:text-base">{option}</span>
                  </button>
                );
              })}
            </div>
          ) : (
            /* Text Input - Single line for hearing */
            <>
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
                value={userAnswer || ''}
                onChange={(e) => onAnswerChange?.(e.target.value)}
                placeholder="Listen to the audio and type your answer here..."
                className="w-full p-2 md:p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm md:text-base"
              />
            </>
          )}
        </div>
      </div>
    )
  }
)
HearingQuestion.displayName = "HearingQuestion"

export { HearingQuestion }

