import React from 'react';
import { Card, CardContent } from './card';
import { cn } from '@/lib/utils';

interface ProgressCardProps {
  completed: number;
  total: number;
  label?: string;
  showPercentage?: boolean;
  size?: 'sm' | 'md' | 'lg';
  color?: 'blue' | 'green' | 'purple' | 'orange';
  className?: string;
}

const colorClasses = {
  blue: 'bg-blue-500',
  green: 'bg-green-500',
  purple: 'bg-purple-500',
  orange: 'bg-orange-500',
};

/**
 * ProgressCard - Standardized progress display card
 * 
 * @example
 * ```tsx
 * <ProgressCard
 *   completed={3}
 *   total={5}
 *   label="Questions Answered"
 *   showPercentage
 * />
 * ```
 * 
 * @responsive
 * - Size prop controls responsive padding
 * - Text scales appropriately across breakpoints
 * 
 * @accessibility
 * - Clear visual progress indicator
 * - Numeric progress display for screen readers
 * - Color + text for accessibility (not color alone)
 */
export const ProgressCard: React.FC<ProgressCardProps> = ({
  completed,
  total,
  label = 'Progress',
  showPercentage = true,
  size = 'md',
  color = 'blue',
  className,
}) => {
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

  const sizeClasses = {
    sm: 'p-2 md:p-3',
    md: 'p-3 md:p-4',
    lg: 'p-4 md:p-5',
  };

  return (
    <Card className={cn(className)}>
      <CardContent className={sizeClasses[size]}>
        <div className="flex items-center justify-between text-xs md:text-sm mb-2">
          <span className="text-gray-600">{label}</span>
          <span className="font-semibold text-gray-900">
            {completed} / {total}
          </span>
        </div>
        <div className="bg-gray-200 h-2 rounded-full overflow-hidden">
          <div
            className={cn(
              'h-full rounded-full transition-all duration-300',
              colorClasses[color]
            )}
            style={{ width: `${Math.min(percent, 100)}%` }}
          />
        </div>
        {showPercentage && (
          <p className="text-[10px] md:text-xs text-gray-500 mt-1 text-right">
            {percent}%
          </p>
        )}
      </CardContent>
    </Card>
  );
};

