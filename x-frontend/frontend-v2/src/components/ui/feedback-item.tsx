import * as React from "react"
import { cn } from "@/lib/utils"

export type FeedbackItemVariant = 
  | "correct" 
  | "explanation" 
  | "topic" 
  | "error" 
  | "suggestion" 
  | "strength" 
  | "improvement"
  | "default"

const variantStyles: Record<FeedbackItemVariant, { container: string; label: string }> = {
  correct: {
    container: "border-green-200 bg-green-50",
    label: "text-green-600",
  },
  explanation: {
    container: "border-gray-200 bg-gray-50",
    label: "text-gray-600",
  },
  topic: {
    container: "border-blue-200 bg-blue-50",
    label: "text-blue-600",
  },
  error: {
    container: "border-orange-200 bg-orange-50",
    label: "text-orange-600",
  },
  suggestion: {
    container: "border-blue-200 bg-blue-50",
    label: "text-blue-600",
  },
  strength: {
    container: "border-green-200 bg-green-50",
    label: "text-green-600",
  },
  improvement: {
    container: "border-orange-200 bg-orange-50",
    label: "text-orange-600",
  },
  default: {
    container: "border-gray-200 bg-gray-50",
    label: "text-gray-600",
  },
}

export interface FeedbackItemProps {
  label: string
  content: string | React.ReactNode
  variant?: FeedbackItemVariant
  className?: string
}

const FeedbackItem = React.forwardRef<HTMLDivElement, FeedbackItemProps>(
  ({ label, content, variant = "default", className }, ref) => {
    const styles = variantStyles[variant]

    return (
      <div ref={ref} className={cn("space-y-1 md:space-y-2", className)}>
        <p className={cn("text-sm md:text-base font-medium", styles.label)}>
          {label}
        </p>
        <div className={cn("rounded border p-2 md:p-3", styles.container)}>
          {typeof content === 'string' ? (
            <p className="text-sm md:text-base leading-relaxed text-gray-700">
              {content}
            </p>
          ) : (
            content
          )}
        </div>
      </div>
    )
  }
)
FeedbackItem.displayName = "FeedbackItem"

export { FeedbackItem }
