import * as React from "react"
import { Button } from "./button"
import { cn } from "@/lib/utils"

export interface NextButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  remainingQuestions?: number
  sessionType?: 'practice' | 'exam'
  showCount?: boolean
  children?: React.ReactNode
}

const NextButton = React.forwardRef<HTMLButtonElement, NextButtonProps>(
  ({ 
    className, 
    remainingQuestions, 
    sessionType = 'practice',
    showCount = true,
    children, 
    ...props 
  }, ref) => {
    const getButtonText = () => {
      if (children) return children

      if (remainingQuestions === 0) {
        return sessionType === 'exam' ? 'Finish Exam 🎉' : 'Complete Session ✓'
      }

      if (sessionType === 'practice') {
        if (showCount && remainingQuestions !== undefined && remainingQuestions > 0) {
          return `Continue Practice → (${remainingQuestions} left)`
        }
        return 'Continue Practice →'
      }

      if (showCount && remainingQuestions !== undefined && remainingQuestions > 0) {
        return `Next Question → (${remainingQuestions} left)`
      }

      return 'Next Question →'
    }

    return (
      <Button
        ref={ref}
        size="lg"
        className={cn("min-h-[44px]", className)}
        {...props}
      >
        {getButtonText()}
      </Button>
    )
  }
)
NextButton.displayName = "NextButton"

export { NextButton }

