import { ExclamationTriangleIcon } from "@heroicons/react/24/outline"
import * as React from "react"
import { cn } from "@/lib/utils"
import { Button } from "./button"

interface AdminErrorDisplayProps {
    title?: string
    message: string
    onRetry?: () => void
    onBack?: () => void
    retryText?: string
    backText?: string
    className?: string
    showIcon?: boolean
}

export const AdminErrorDisplay: React.FC<AdminErrorDisplayProps> = ({
    title = "Oops! Something went wrong",
    message,
    onRetry,
    onBack,
    retryText = "🔄 Let's Try Again",
    backText = "← Back",
    className,
    showIcon = true
}) => {
    return (
        <div className={cn("flex items-center justify-center min-h-[50vh] p-4", className)}>
            <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full mx-4">
                <div className="text-center">
                    {showIcon && (
                        <ExclamationTriangleIcon className="h-16 w-16 text-red-500 mx-auto mb-4" />
                    )}
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">{title}</h3>
                    <p className="text-gray-600 mb-6">{message}</p>
                    <div className="flex gap-2 justify-center flex-wrap">
                        {onBack && (
                            <Button onClick={onBack} variant="outline" size="sm">
                                {backText}
                            </Button>
                        )}
                        {onRetry && (
                            <Button onClick={onRetry} variant="outline" size="sm">
                                {retryText}
                            </Button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}

export default AdminErrorDisplay
