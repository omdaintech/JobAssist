import * as React from "react"
import { ActionButton } from "@/components/ui"

export interface SessionContinueButtonProps {
  isLoading: boolean
  onClick: () => void
  sessionType: 'practice' | 'exam'
  completedQuestions?: number
  totalQuestions?: number
  variant?: 'with-progress' | 'no-answers' | 'after-submit'
  className?: string
}

const SessionContinueButton = React.forwardRef<HTMLDivElement, SessionContinueButtonProps>(
  ({ 
    isLoading, 
    onClick, 
    sessionType, 
    completedQuestions,
    totalQuestions,
    variant = 'with-progress',
    className 
  }, ref) => {
    const getContent = () => {
      switch (variant) {
        case 'no-answers':
          return {
            title: `Continue with your ${sessionType === 'exam' ? 'Exam' : 'Practice'}`,
            description: 'Ready to start answering questions?',
            buttonText: 'Load Question →'
          }
        case 'after-submit':
          return {
            title: 'Answer Submitted',
            description: 'Ready for the next question?',
            buttonText: 'Next Question →'
          }
        case 'with-progress':
        default:
          return {
            title: `Continue Your ${sessionType === 'exam' ? 'Exam' : 'Practice'}`,
            description: completedQuestions !== undefined && totalQuestions !== undefined
              ? `You have completed ${completedQuestions} out of ${totalQuestions} questions.`
              : 'Continue where you left off.',
            buttonText: `Continue ${sessionType === 'exam' ? 'Exam' : 'Practice'} →`
          }
      }
    }

    const content = getContent()

    return (
      <div ref={ref} className={className}>
        <div className="text-center space-y-3 md:space-y-4 p-3 md:p-4">
          <div className="space-y-1 md:space-y-2">
            <h4 className="text-base md:text-lg font-semibold text-gray-900">
              {content.title}
            </h4>
            <p className="text-xs md:text-sm text-gray-600">
              {content.description}
            </p>
          </div>
          <ActionButton
            onClick={onClick}
            isLoading={isLoading}
            loadingText="Loading..."
            size="lg"
            className="bg-eu-blue hover:bg-eu-blue/90 text-white px-6 md:px-8"
          >
            {content.buttonText}
          </ActionButton>
        </div>
      </div>
    )
  }
)
SessionContinueButton.displayName = "SessionContinueButton"

export { SessionContinueButton }

