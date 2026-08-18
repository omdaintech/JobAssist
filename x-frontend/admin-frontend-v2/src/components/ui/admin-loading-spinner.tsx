import * as React from "react"
import { cn } from "@/lib/utils"

export interface AdminLoadingSpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: "sm" | "md" | "lg"
}

export const AdminLoadingSpinner = React.forwardRef<HTMLDivElement, AdminLoadingSpinnerProps>(
  ({ className, size = "md", ...props }, ref) => {
    const sizeClasses = {
      sm: "h-4 w-4",
      md: "h-6 w-6",
      lg: "h-8 w-8"
    }

    return (
      <div
        ref={ref}
        className={cn("flex items-center justify-center", className)}
        {...props}
      >
        <div
          className={cn(
            "animate-spin rounded-full border-2 border-gray-300 border-t-eu-blue",
            sizeClasses[size]
          )}
        />
      </div>
    )
  }
)

AdminLoadingSpinner.displayName = "AdminLoadingSpinner"

export default AdminLoadingSpinner
