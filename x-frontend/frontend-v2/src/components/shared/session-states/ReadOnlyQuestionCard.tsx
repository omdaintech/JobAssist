import * as React from "react"
import { Badge } from "@/components/ui"
import { getActivityName } from "@/constants/activity-types"
import { cn } from "@/lib/utils"

export interface ReadOnlyQuestionCardProps {
  questionData: {
    question_number: number
    activity_type: string
    question?: string
    prompt?: string
    text?: string
    instruction?: string
    grammar_topic?: string
    audio_url?: string
  }
  userAnswer: string
  sessionType: 'practice' | 'exam'
  className?: string
}

const ReadOnlyQuestionCard = React.forwardRef<HTMLDivElement, ReadOnlyQuestionCardProps>(
  ({ questionData, userAnswer, sessionType, className }, ref) => {
    const getQuestionText = () => {
      if (questionData.activity_type === 'grammar') {
        return questionData.instruction || questionData.prompt || questionData.question || questionData.text
      }
      if (questionData.activity_type === 'hearing') {
        return questionData.question || 'Listening comprehension question'
      }
      return questionData.question || questionData.prompt || questionData.text || 'Question content'
    }

    return (
      <div ref={ref} className={cn("space-y-3 md:space-y-4", className)}>
        {/* Last Question - READ ONLY */}
        <div className="bg-gray-50 border-l-4 border-gray-400 rounded-lg p-3 md:p-4 relative">
          <div className="absolute top-2 right-2">
            <Badge variant="secondary" size="sm">
              READ ONLY
            </Badge>
          </div>
          <h5 className="text-sm md:text-base font-medium text-gray-900 mb-2 flex items-center gap-2">
            <span className="text-gray-500">Q{questionData.question_number}:</span>
            {getActivityName(questionData.activity_type)} Question
          </h5>
          <div className="text-xs md:text-sm text-gray-700 mb-3 opacity-80">
            {questionData.activity_type === 'grammar' && questionData.grammar_topic && (
              <p className="text-gray-600 mb-2">
                <span className="font-medium">Topic:</span> {questionData.grammar_topic}
              </p>
            )}
            {questionData.activity_type === 'hearing' && questionData.audio_url && (
              <div className="flex items-center gap-2 text-gray-600 mb-2">
                <span>🎧</span>
                <span>Audio question (playback disabled in review)</span>
              </div>
            )}
            <p>{getQuestionText()}</p>
          </div>
          <div className="text-[10px] md:text-xs text-gray-500">
            ⚠️ This question has been answered and cannot be modified
          </div>
        </div>

        {/* Submitted Answer - READ ONLY */}
        <div className="bg-blue-50 border-l-4 border-blue-400 rounded-lg p-3 md:p-4 relative">
          <div className="absolute top-2 right-2">
            <Badge variant="primary" size="sm">
              SUBMITTED
            </Badge>
          </div>
          <h5 className="text-sm md:text-base font-medium text-gray-900 mb-2 flex items-center gap-2">
            <span className="text-blue-600">✓</span>
            Your Answer:
          </h5>
          <p className="text-xs md:text-sm text-gray-700 font-medium">{userAnswer}</p>
          <div className="text-[10px] md:text-xs text-blue-600 mt-2">
            Answer recorded in {sessionType} database
          </div>
        </div>
      </div>
    )
  }
)
ReadOnlyQuestionCard.displayName = "ReadOnlyQuestionCard"

export { ReadOnlyQuestionCard }

