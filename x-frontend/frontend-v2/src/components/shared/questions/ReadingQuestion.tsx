import * as React from "react"
import { Badge } from "@/components/ui"
import { cn } from "@/lib/utils"

export interface ReadingQuestionProps {
  questionData: {
    text?: string
    question?: string
    options?: string[]
    topic?: string
    question_type?: string
  }
  selectedAnswer?: string
  onSelectAnswer: (answer: string) => void
  className?: string
}

const ReadingQuestion = React.forwardRef<HTMLDivElement, ReadingQuestionProps>(
  ({ questionData, selectedAnswer, onSelectAnswer, className }, ref) => {
    return (
      <div ref={ref} className={cn("space-y-3 md:space-y-4", className)}>
        {/* Reading Topic */}
        {questionData.topic && (
          <div className="bg-green-50 rounded-lg border border-green-200 p-2 md:p-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] md:text-xs font-semibold text-green-900">📚 Topic:</span>
              <Badge variant="success" size="sm">
                {questionData.topic}
              </Badge>
            </div>
          </div>
        )}

        {/* Reading Passage */}
        {questionData.text && (
          <div className="bg-gray-50 rounded-lg p-3 md:p-4">
            <h5 className="text-xs md:text-sm font-medium text-gray-900 mb-2">Read the passage:</h5>
            <p className="text-xs md:text-sm text-gray-700 leading-relaxed">{questionData.text}</p>
          </div>
        )}

        {/* Question and Options */}
        <div>
          <h5 className="text-sm md:text-base font-medium text-gray-900 mb-2 md:mb-3">
            {questionData.question}
          </h5>
          <div className="space-y-2">
            {questionData.options?.map((option, index) => {
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
                      ? "border-eu-blue bg-eu-blue/5 ring-2 ring-eu-blue/20"
                      : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                  )}
                  onClick={() => onSelectAnswer(answerValue)}
                >
                  <span className="font-medium text-gray-700 mr-2 text-sm md:text-base">
                    {String.fromCharCode(65 + index)}.
                  </span>
                  <span className="text-sm md:text-base">{option}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    )
  }
)
ReadingQuestion.displayName = "ReadingQuestion"

export { ReadingQuestion }

