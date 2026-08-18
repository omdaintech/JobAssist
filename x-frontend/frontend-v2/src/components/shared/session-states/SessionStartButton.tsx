import * as React from "react"
import { ActionButton } from "@/components/ui"

export interface SessionStartButtonProps {
  isLoading: boolean
  onClick: () => void
  totalQuestions: number
  sessionType: 'practice' | 'exam'
  className?: string
}

const SessionStartButton = React.forwardRef<HTMLDivElement, SessionStartButtonProps>(
  ({ isLoading, onClick, totalQuestions, sessionType, className }, ref) => {
    return (
      <div ref={ref} className={className}>
        <div className="text-center space-y-3 md:space-y-4 p-3 md:p-4 lg:p-6">
          <div className="space-y-1 md:space-y-2">
            <h4 className="text-base md:text-lg lg:text-xl font-semibold text-gray-900">
              Ready to Begin?
            </h4>
            <p className="text-xs md:text-sm text-gray-600">
              Your {sessionType} consists of {totalQuestions} questions across different activities.
            </p>
          </div>
          <ActionButton
            onClick={onClick}
            isLoading={isLoading}
            loadingText="Getting ready..."
            size="lg"
            className="bg-eu-blue hover:bg-eu-blue/90 text-white px-6 md:px-8"
          >
            Let's Begin! 🚀
          </ActionButton>
        </div>
      </div>
    )
  }
)
SessionStartButton.displayName = "SessionStartButton"

export { SessionStartButton }

