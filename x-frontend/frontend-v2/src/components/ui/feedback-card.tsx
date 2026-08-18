import * as React from "react"
import { Badge } from "./badge"
import { FeedbackItem } from "./feedback-item"
import { cn } from "@/lib/utils"
import { renderTextOrBullets } from "@/utils/render-helpers"
import { useTeacherName } from "@/hooks/useTeacherName"

export interface FeedbackData {
  quality?: string
  topic?: string
  correctAnswer?: string | Record<string, any>
  explanation?: string | string[]  // Can be string or array
  errorPattern?: string | string[]  // Can be string or array
  score?: number
  focusArea?: string | string[]  // Can be string or array
  // Activity-specific fields
  wordCount?: number
  strengths?: string | string[]  // Can be string or array
  suggestions?: string | string[]  // Can be string or array
  correctedVersion?: string
  grammarNotes?: string
  grammarLearning?: string
  correctAnswerReason?: string
  feedback?: string
  sentenceCount?: number
  correctSentences?: string
  corrections?: string
  grammarAnalysis?: string
  pronunciationTips?: string
  grammarSuggestions?: string
  vocabularySuggestions?: string
  audioFeedback?: string
  isComplete?: boolean
  needsTranscript?: boolean
}

export interface FeedbackCardProps {
  feedback: FeedbackData
  className?: string
  title?: string
  emptyMessage?: string
}

const FeedbackCard = React.forwardRef<HTMLDivElement, FeedbackCardProps>(
  ({ feedback, className, title, emptyMessage }, ref) => {
    const { teacherName } = useTeacherName();
    const displayTitle = title || `${teacherName}'s Assessment`;
    
    // Check if feedback has any non-null, non-undefined values
    const hasContent = feedback && Object.values(feedback).some(value => 
      value !== null && value !== undefined && value !== ''
    )

    const getQualityVariant = (quality?: string): "success" | "primary" | "warning" | "danger" => {
      if (!quality) return "primary"
      switch (quality.toLowerCase()) {
        case 'perfect':
          return 'success'
        case 'good':
          return 'primary'
        case 'ok':
          return 'warning'
        default:
          return 'danger'
      }
    }

    if (!hasContent) {
      return (
        <div ref={ref} className={cn("space-y-2 md:space-y-3", className)}>
          {displayTitle && <h5 className="text-base md:text-lg font-medium text-gray-900">{displayTitle}</h5>}
          <div className="rounded border-2 border-dashed border-gray-300 bg-gray-100 p-3 md:p-4">
            <div className="flex items-center gap-2 text-sm md:text-base text-gray-500">
              <div className="h-3 w-3 md:h-4 md:w-4 animate-pulse rounded-full bg-gray-400" />
              <span>
                {emptyMessage || 'Detailed feedback will appear here after analysis...'}
              </span>
            </div>
          </div>
        </div>
      )
    }

    return (
      <div ref={ref} className={cn("space-y-2 md:space-y-3", className)}>
        {displayTitle && <h5 className="text-base md:text-lg font-medium text-gray-900">{displayTitle}</h5>}
        
        {/* Score and Quality Badges */}
        {(feedback.score !== undefined || feedback.score !== null || feedback.quality) && (
          <div className="flex flex-wrap items-center gap-2">
            {(feedback.score !== undefined && feedback.score !== null) && (
              <Badge variant="primary" size="sm">
                Score: {feedback.score}/10
              </Badge>
            )}
            {feedback.quality && (
              <Badge variant={getQualityVariant(feedback.quality)} size="sm">
                Quality: {feedback.quality}
              </Badge>
            )}
          </div>
        )}

        {/* Feedback Details */}
        <div className="space-y-3">
          {feedback.correctAnswer && (
            <FeedbackItem
              variant="correct"
              label="Expected Answer:"
              content={
                typeof feedback.correctAnswer === 'object' ? (
                  <div className="space-y-1 md:space-y-2">
                    {Object.entries(feedback.correctAnswer).map(([key, value]) => (
                      <p key={key} className="text-sm md:text-base text-gray-700">
                        <span className="font-bold text-green-700">{key}:</span> {String(value)}
                      </p>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm md:text-base font-medium text-gray-700">{feedback.correctAnswer}</p>
                )
              }
            />
          )}

          {feedback.explanation && (
            <FeedbackItem
              variant="explanation"
              label="Detailed Explanation:"
              content={renderTextOrBullets(feedback.explanation, 'text-gray-700')}
            />
          )}

          {feedback.feedback && feedback.feedback !== feedback.explanation && (
            <FeedbackItem
              variant="explanation"
              label="Additional Feedback:"
              content={feedback.feedback}
            />
          )}

          {feedback.topic && (
            <FeedbackItem
              variant="topic"
              label="Learning Topic:"
              content={feedback.topic}
            />
          )}

          {feedback.errorPattern && feedback.errorPattern !== 'N/A' && (
            <FeedbackItem
              variant="error"
              label="Error Pattern Analysis:"
              content={renderTextOrBullets(feedback.errorPattern, 'text-red-700')}
            />
          )}

          {feedback.focusArea && (
            <FeedbackItem
              variant="improvement"
              label="Focus Area:"
              content={renderTextOrBullets(feedback.focusArea, 'text-orange-700')}
            />
          )}

          {feedback.suggestions && (
            <FeedbackItem
              variant="suggestion"
              label="Improvement Suggestions:"
              content={renderTextOrBullets(feedback.suggestions, 'text-blue-700')}
            />
          )}

          {feedback.strengths && (
            <FeedbackItem
              variant="strength"
              label="Strengths:"
              content={renderTextOrBullets(feedback.strengths, 'text-green-700')}
            />
          )}

          {feedback.correctedVersion && (
            <FeedbackItem
              variant="correct"
              label="Corrected Version:"
              content={feedback.correctedVersion}
            />
          )}

          {feedback.grammarNotes && (
            <FeedbackItem
              variant="topic"
              label="Grammar Notes:"
              content={feedback.grammarNotes}
            />
          )}

          {feedback.grammarAnalysis && (
            <FeedbackItem
              variant="topic"
              label="Grammar Analysis:"
              content={feedback.grammarAnalysis}
            />
          )}

          {feedback.correctAnswerReason && (
            <FeedbackItem
              variant="explanation"
              label="Why this answer:"
              content={feedback.correctAnswerReason}
            />
          )}

          {feedback.corrections && (
            <FeedbackItem
              variant="improvement"
              label="Corrections:"
              content={feedback.corrections}
            />
          )}

          {feedback.pronunciationTips && (
            <FeedbackItem
              variant="suggestion"
              label="Pronunciation Tips:"
              content={feedback.pronunciationTips}
            />
          )}

          {feedback.grammarSuggestions && (
            <FeedbackItem
              variant="suggestion"
              label="Grammar Suggestions:"
              content={feedback.grammarSuggestions}
            />
          )}

          {feedback.vocabularySuggestions && (
            <FeedbackItem
              variant="suggestion"
              label="Vocabulary Suggestions:"
              content={feedback.vocabularySuggestions}
            />
          )}

          {feedback.audioFeedback && (
            <FeedbackItem
              variant="topic"
              label="Audio Feedback:"
              content={feedback.audioFeedback}
            />
          )}
        </div>
      </div>
    )
  }
)
FeedbackCard.displayName = "FeedbackCard"

export { FeedbackCard }
