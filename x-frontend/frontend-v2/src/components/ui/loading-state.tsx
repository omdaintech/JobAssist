import * as React from "react"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { cn } from "@/lib/utils"

interface LoadingStateProps {
    message?: string
    size?: "sm" | "md" | "lg"
    className?: string
    centered?: boolean
}

const LoadingState: React.FC<LoadingStateProps> = ({
    message = "Loading...",
    size = "md",
    className,
    centered = true
}) => {
    const sizeClasses = {
        sm: "min-h-[20vh]",
        md: "min-h-[50vh]",
        lg: "min-h-[70vh]"
    }

    return (
        <div className={cn(
            "flex items-center justify-center p-4",
            centered && sizeClasses[size],
            className
        )}>
            <div className="text-center">
                <LoadingSpinner size={size} />
                {message && (
                    <p className="mt-2 text-gray-600">{message}</p>
                )}
            </div>
        </div>
    )
}

export { LoadingState } 