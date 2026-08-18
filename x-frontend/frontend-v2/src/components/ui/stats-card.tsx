import React from 'react';
import { cn } from '@/lib/utils';
import { ProgressRing } from './progress-ring';

interface StatsCardProps {
    title: string;
    value: number | string;
    subtitle?: string;
    icon: string;
    progress?: number;
    color?: 'blue' | 'green' | 'purple' | 'orange' | 'red' | 'emerald' | 'gray';
    trend?: {
        value: number;
        isPositive: boolean;
        label: string;
    };
    className?: string;
    onClick?: () => void;
}

export const StatsCard: React.FC<StatsCardProps> = ({
    title,
    value,
    subtitle,
    icon,
    progress,
    color = 'blue',
    trend,
    className,
    onClick
}) => {
    const colorConfig = {
        blue: {
            background: 'bg-blue-50',
            border: 'border-blue-100',
            iconBg: 'bg-blue-100',
            textColor: 'text-blue-600',
            hoverBg: 'hover:bg-blue-100'
        },
        green: {
            background: 'bg-green-50',
            border: 'border-green-100',
            iconBg: 'bg-green-100',
            textColor: 'text-green-600',
            hoverBg: 'hover:bg-green-100'
        },
        purple: {
            background: 'bg-purple-50',
            border: 'border-purple-100',
            iconBg: 'bg-purple-100',
            textColor: 'text-purple-600',
            hoverBg: 'hover:bg-purple-100'
        },
        orange: {
            background: 'bg-orange-50',
            border: 'border-orange-100',
            iconBg: 'bg-orange-100',
            textColor: 'text-orange-600',
            hoverBg: 'hover:bg-orange-100'
        },
        red: {
            background: 'bg-red-50',
            border: 'border-red-100',
            iconBg: 'bg-red-100',
            textColor: 'text-red-600',
            hoverBg: 'hover:bg-red-100'
        },
        emerald: {
            background: 'bg-emerald-50',
            border: 'border-emerald-100',
            iconBg: 'bg-emerald-100',
            textColor: 'text-emerald-600',
            hoverBg: 'hover:bg-emerald-100'
        },
        gray: {
            background: 'bg-gray-50',
            border: 'border-gray-100',
            iconBg: 'bg-gray-100',
            textColor: 'text-gray-600',
            hoverBg: 'hover:bg-gray-100'
        }
    };

    const config = colorConfig[color as keyof typeof colorConfig] || colorConfig.blue;

    return (
        <div
            className={cn(
                'p-3 md:p-4 lg:p-5 rounded-xl border transition-all duration-200',
                config.background,
                config.border,
                onClick && cn('cursor-pointer hover:shadow-md', config.hoverBg),
                className
            )}
            onClick={onClick}
        >
            <div className="flex items-start justify-between">
                <div className="flex-1">
                    <div className="flex items-center gap-2 md:gap-3 mb-3 md:mb-4">
                        <div className={cn(
                            'w-8 h-8 md:w-10 md:h-10 rounded-lg flex items-center justify-center flex-shrink-0',
                            config.iconBg
                        )}>
                            <span className="text-lg md:text-xl">{icon}</span>
                        </div>
                        <div className="min-w-0">
                            <h4 className="text-sm md:text-base font-semibold text-gray-900 truncate">{title}</h4>
                            {subtitle && (
                                <p className="text-xs md:text-sm text-gray-600 truncate">{subtitle}</p>
                            )}
                        </div>
                    </div>

                    <div className="flex items-end justify-between gap-2 md:gap-3">
                        <div className="min-w-0 flex-1">
                            <p className={cn('text-xl md:text-2xl lg:text-3xl font-bold', config.textColor)}>
                                {value}
                            </p>
                            {trend && (
                                <div className="flex items-center gap-1 mt-1">
                                    <span className={cn(
                                        'text-[10px] md:text-xs font-medium',
                                        trend.isPositive ? 'text-green-600' : 'text-red-600'
                                    )}>
                                        {trend.isPositive ? '↗' : '↘'} {trend.value}%
                                    </span>
                                    <span className="text-[10px] md:text-xs text-gray-500">{trend.label}</span>
                                </div>
                            )}
                        </div>

                        {progress !== undefined && (
                            <div className="ml-2 md:ml-4 flex-shrink-0">
                                <ProgressRing
                                    progress={progress}
                                    size="sm"
                                    color={color}
                                    showText={false}
                                />
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}; 