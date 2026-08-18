import * as React from "react"
import { cn } from "@/lib/utils"
import { AdminLoadingSpinner } from "./admin-loading-spinner"

interface AdminLoadingStateProps {
    message?: string
    size?: "sm" | "md" | "lg"
    className?: string
    centered?: boolean
}

export const AdminLoadingState: React.FC<AdminLoadingStateProps> = ({
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
            "flex items-center justify-center bg-gray-50 p-4",
            centered && sizeClasses[size],
            className
        )}>
            <div className="text-center">
                <AdminLoadingSpinner size={size} />
                {message && (
                    <p className="mt-2 text-gray-600">{message}</p>
                )}
            </div>
        </div>
    )
}

export default AdminLoadingState
