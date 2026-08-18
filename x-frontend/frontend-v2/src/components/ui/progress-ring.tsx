import React from 'react';
import { cn } from '@/lib/utils';

interface ProgressRingProps {
    progress: number; // 0-100
    size?: 'sm' | 'md' | 'lg';
    strokeWidth?: number;
    className?: string;
    showText?: boolean;
    color?: 'blue' | 'green' | 'purple' | 'orange' | 'red' | 'emerald' | 'gray';
}

export const ProgressRing: React.FC<ProgressRingProps> = ({
    progress,
    size = 'md',
    strokeWidth = 3,
    className,
    showText = true,
    color = 'blue'
}) => {
    const sizeConfig = {
        sm: { radius: 20, viewBox: '0 0 50 50' },
        md: { radius: 30, viewBox: '0 0 70 70' },
        lg: { radius: 40, viewBox: '0 0 90 90' }
    };

    const colorConfig = {
        blue: { stroke: '#2563eb', background: '#dbeafe' },
        green: { stroke: '#16a34a', background: '#dcfce7' },
        purple: { stroke: '#9333ea', background: '#f3e8ff' },
        orange: { stroke: '#ea580c', background: '#fed7aa' },
        red: { stroke: '#dc2626', background: '#fee2e2' },
        emerald: { stroke: '#059669', background: '#d1fae5' },
        gray: { stroke: '#4b5563', background: '#f3f4f6' }
    };

    const { radius, viewBox } = sizeConfig[size];
    const { stroke, background } = colorConfig[color as keyof typeof colorConfig] || colorConfig.blue;

    const circumference = 2 * Math.PI * radius;
    const strokeDasharray = circumference;
    const strokeDashoffset = circumference - (progress / 100) * circumference;

    return (
        <div className={cn('relative inline-flex items-center justify-center', className)}>
            <svg
                width={size === 'sm' ? 50 : size === 'md' ? 70 : 90}
                height={size === 'sm' ? 50 : size === 'md' ? 70 : 90}
                viewBox={viewBox}
                className="transform -rotate-90"
            >
                {/* Background circle */}
                <circle
                    cx={size === 'sm' ? 25 : size === 'md' ? 35 : 45}
                    cy={size === 'sm' ? 25 : size === 'md' ? 35 : 45}
                    r={radius}
                    fill="none"
                    stroke={background}
                    strokeWidth={strokeWidth}
                />

                {/* Progress circle */}
                <circle
                    cx={size === 'sm' ? 25 : size === 'md' ? 35 : 45}
                    cy={size === 'sm' ? 25 : size === 'md' ? 35 : 45}
                    r={radius}
                    fill="none"
                    stroke={stroke}
                    strokeWidth={strokeWidth}
                    strokeDasharray={strokeDasharray}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    className="transition-all duration-500 ease-out"
                />
            </svg>

            {showText && (
                <div className="absolute inset-0 flex items-center justify-center">
                    <span className={cn(
                        'font-bold text-gray-900',
                        size === 'sm' ? 'text-xs' : size === 'md' ? 'text-sm' : 'text-base'
                    )}>
                        {progress}%
                    </span>
                </div>
            )}
        </div>
    );
}; 