import * as React from "react"
import { Button, type ButtonProps } from "./button"
import { cn } from "@/lib/utils"
import { LoadingSpinner } from "./loading-spinner"

export interface ActionButtonProps extends ButtonProps {
  isLoading?: boolean
  loadingText?: string
  icon?: React.ReactNode
}

const ActionButton = React.forwardRef<HTMLButtonElement, ActionButtonProps>(
  ({ 
    className, 
    isLoading = false, 
    loadingText, 
    icon, 
    children, 
    disabled,
    ...props 
  }, ref) => {
    return (
      <Button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn("min-h-[44px]", className)}
        {...props}
      >
        {isLoading ? (
          <>
            <LoadingSpinner className="mr-2 h-4 w-4" />
            {loadingText || children}
          </>
        ) : (
          <>
            {icon && <span className="mr-2">{icon}</span>}
            {children}
          </>
        )}
      </Button>
    )
  }
)
ActionButton.displayName = "ActionButton"

export { ActionButton }

