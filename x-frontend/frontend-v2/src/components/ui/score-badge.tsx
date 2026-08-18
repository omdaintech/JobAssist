/**
 * ScoreBadge - Color-coded score display for percentage scores (0-100 scale)
 * 
 * Displays a score with appropriate color coding:
 * - Red (0-39): Needs significant improvement
 * - Yellow (40-59): Fair, needs work
 * - Blue (60-79): Good progress
 * - Green (80-100): Excellent performance
 * 
 * Uses unified grade color system from chartUtils for consistency
 * 
 * @example
 * ```tsx
 * <ScoreBadge score={85} size="md" />
 * <ScoreBadge score={45} size="lg" showLabel={false} />
 * ```
 */

import React from 'react';
import { cn } from '@/lib/utils';
import { getScoreColorClasses, normalizeScore } from '@/utils/chartUtils';

interface ScoreBadgeProps {
  /** Score value (0-100 scale) */
  score: number | string;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Show percentage symbol */
  showPercentage?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Get size classes
 */
const getSizeClasses = (size: 'sm' | 'md' | 'lg'): string => {
  switch (size) {
    case 'sm':
      return 'text-sm px-2 py-1';
    case 'lg':
      return 'text-xl md:text-2xl px-4 py-2';
    case 'md':
    default:
      return 'text-lg md:text-xl px-3 py-1.5';
  }
};

export const ScoreBadge: React.FC<ScoreBadgeProps> = ({
  score,
  size = 'md',
  showPercentage = true,
  className = '',
}) => {
  const normalizedScore = normalizeScore(score) ?? 0;
  const roundedScore = Math.round(normalizedScore);
  const colors = getScoreColorClasses(normalizedScore);
  const sizeClasses = getSizeClasses(size);

  return (
    <span
      className={cn(
        'inline-flex items-center justify-center font-bold rounded-lg',
        'transition-colors duration-200',
        colors.bg,
        colors.text,
        sizeClasses,
        className
      )}
    >
      {roundedScore}
      {showPercentage && '%'}
    </span>
  );
};
