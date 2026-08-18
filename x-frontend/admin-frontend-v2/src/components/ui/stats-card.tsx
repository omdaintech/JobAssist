import { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface StatsCardProps {
    title: string
    value: string | number
    change?: string
    changeType?: 'positive' | 'negative' | 'neutral'
    icon?: ReactNode
    className?: string
}

export function StatsCard({
    title,
    value,
    change,
    changeType = 'neutral',
    icon,
    className
}: StatsCardProps) {
    return (
        <div className={cn(
            "rounded-lg border bg-card text-card-foreground shadow-sm p-6",
            className
        )}>
            <div className="flex flex-row items-center justify-between space-y-0 pb-2">
                <h3 className="tracking-tight text-sm font-medium text-muted-foreground">
                    {title}
                </h3>
                {icon && (
                    <div className="h-4 w-4 text-muted-foreground">
                        {icon}
                    </div>
                )}
            </div>
            <div className="space-y-1">
                <div className="text-2xl font-bold">{value}</div>
                {change && (
                    <p className={cn(
                        "text-xs",
                        changeType === 'positive' && "text-green-600",
                        changeType === 'negative' && "text-red-600",
                        changeType === 'neutral' && "text-muted-foreground"
                    )}>
                        {change}
                    </p>
                )}
            </div>
        </div>
    )
} 