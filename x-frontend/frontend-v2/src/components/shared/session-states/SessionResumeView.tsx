import * as React from "react"
import { ActionButton, Badge } from "@/components/ui"
import { ReadOnlyQuestionCard } from "./ReadOnlyQuestionCard"

export interface SessionResumeViewProps {
  sessionType: 'practice' | 'exam'
  completedQuestions: number
  totalQuestions: number
  lastQuestion?: {
    question_number: number
    activity_type: string
    question?: string
    prompt?: string
    text?: string
    instruction?: string
    grammar_topic?: string
    audio_url?: string
  }
  lastAnswer?: string
  allowResumeFromQuestion: boolean
  onContinue: () => void
  isLoading: boolean
  className?: string
}

const SessionResumeView = React.forwardRef<HTMLDivElement, SessionResumeViewProps>(
  ({ 
    sessionType, 
    completedQuestions, 
    totalQuestions, 
    lastQuestion, 
    lastAnswer,
    allowResumeFromQuestion,
    onContinue,
    isLoading,
    className 
  }, ref) => {
    return (
      <div ref={ref} className={className}>
        <div className="space-y-4 md:space-y-6 p-3 md:p-4">
          {/* Header */}
          <div className="text-center space-y-2">
            <h4 className="text-base md:text-lg font-semibold text-gray-900">
              📋 {sessionType === 'exam' ? 'Exam Resume' : 'Session Resume'}
            </h4>
            <p className="text-xs md:text-sm text-gray-600">
              Progress: {completedQuestions} of {totalQuestions} questions completed
            </p>
            <div className="inline-flex items-center gap-2 bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs md:text-sm">
              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
              Last answer submitted successfully
            </div>
          </div>

          {/* Show last question and answer if allowed */}
          {allowResumeFromQuestion && lastQuestion && lastAnswer && (
            <ReadOnlyQuestionCard
              questionData={lastQuestion}
              userAnswer={lastAnswer}
              sessionType={sessionType}
            />
          )}

          {/* Continue Button */}
          <div className="text-center pt-2">
            <ActionButton
              onClick={onContinue}
              isLoading={isLoading}
              loadingText="Loading..."
              size="lg"
              className="bg-eu-blue hover:bg-eu-blue/90 text-white px-6 md:px-8"
            >
              Next Question →
            </ActionButton>
          </div>
        </div>
      </div>
    )
  }
)
SessionResumeView.displayName = "SessionResumeView"

export { SessionResumeView }

