import * as React from "react"
import { Button } from "./button"
import { cn } from "@/lib/utils"
import { LoadingSpinner } from "./loading-spinner"

export interface SubmitButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  isSubmitting?: boolean
  submittingText?: string
  children?: React.ReactNode
}

const SubmitButton = React.forwardRef<HTMLButtonElement, SubmitButtonProps>(
  ({ className, isSubmitting = false, submittingText = "Submitting...", children = "Submit Answer", disabled, ...props }, ref) => {
    return (
      <Button
        ref={ref}
        type="submit"
        size="lg"
        disabled={disabled || isSubmitting}
        className={cn("min-h-[44px] relative", className)}
        {...props}
      >
        {isSubmitting && (
          <LoadingSpinner className="mr-2 h-4 w-4" />
        )}
        {isSubmitting ? submittingText : children}
      </Button>
    )
  }
)
SubmitButton.displayName = "SubmitButton"

export { SubmitButton }

