import React from 'react';
import { getScoreColorClasses } from '@/utils/chartUtils';

export interface FilterOption {
    value: string;
    label: string;
    icon?: string;
    color?: string; // For custom colors like level badges
    score?: number; // For score-based coloring (0-100 scale)
}

interface FilterButtonsProps {
    options: FilterOption[];
    selectedValue: string;
    onChange: (value: string) => void;
    className?: string;
    variant?: 'default' | 'standard' | 'score';
}

export const FilterButtons: React.FC<FilterButtonsProps> = ({
    options,
    selectedValue,
    onChange,
    className = "",
    variant = 'default'
}) => {
    const getButtonStyles = (isSelected: boolean, option: FilterOption) => {
        if (variant === 'score' && option.score !== undefined) {
            // Use grade color system for score variant
            const colors = getScoreColorClasses(option.score);
            return isSelected
                ? `${colors.bg} ${colors.text} !border-2 ${colors.border} ${colors.bgHover}`
                : `bg-white text-gray-700 border-2 border-gray-300 hover:bg-gray-50`;
        }
        
        if (variant === 'standard') {
            return isSelected
                ? '!bg-blue-600 !text-white !border-2 !border-blue-600 hover:!bg-blue-700'
                : 'bg-white text-gray-700 border-2 border-gray-300 hover:bg-gray-50';
        }
        
        // Default variant (original styling)
        return isSelected
            ? option.color || 'bg-eu-blue/10 text-eu-blue border-2 border-eu-blue/30'
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200';
    };

    return (
        <div className={`flex gap-1 ${className}`}>
            {options.map((option) => (
                <button
                    key={option.value}
                    onClick={() => onChange(option.value)}
                    className={`px-3 py-2 min-h-[44px] rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${getButtonStyles(selectedValue === option.value, option)}`}
                >
                    {option.icon && (
                        <span className="text-sm">{option.icon}</span>
                    )}
                    <span>{option.label}</span>
                </button>
            ))}
        </div>
    );
}; 