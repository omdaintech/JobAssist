/**
 * ScoreBar - Color-coded progress bar for scores (0-10 scale)
 * 
 * Displays a gradient from red (poor) → yellow (fair) → green (excellent)
 * to provide visual feedback on performance.
 * 
 * @example
 * ```tsx
 * <ScoreBar score={6.5} showLabel />
 * <ScoreBar score={8.2} showLabel={false} />
 * ```
 * 
 * @responsive
 * - Text scales from sm to base on md+ screens
 * - Bar height and spacing adjust responsively
 * 
 * @accessibility
 * - Color-blind friendly with multiple visual cues
 * - Screen reader accessible with ARIA labels
 */

import React from 'react';

interface ScoreBarProps {
  /** Score value (0-10 scale) */
  score?: number | null;
  /** Show score label (e.g., "6.5/10") */
  showLabel?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Get color based on score with gradient scale
 * Red → Orange → Yellow → Light Green → Green
 */
const getScoreColor = (score: number): string => {
  if (score >= 8) return '#10b981'; // green-500 (Excellent: 8-10)
  if (score >= 6) return '#22c55e'; // green-400 (Good: 6-7.9)
  if (score >= 5) return '#84cc16'; // lime-500 (Fair+: 5-5.9)
  if (score >= 4) return '#eab308'; // yellow-500 (Fair: 4-4.9)
  if (score >= 3) return '#f97316'; // orange-500 (Needs work: 3-3.9)
  return '#ef4444'; // red-500 (Needs support: 0-2.9)
};

/**
 * Format score for display
 */
const formatScore = (score: number): string => {
  const formatted = Number.isInteger(score) ? score.toString() : score.toFixed(1);
  return `${formatted}/10`;
};

export const ScoreBar: React.FC<ScoreBarProps> = ({
  score,
  showLabel = true,
  className = '',
}) => {
  // Handle invalid scores
  if (score === null || score === undefined || Number.isNaN(score)) {
    return (
      <div className={`flex items-center gap-2 md:gap-3 ${className}`}>
        <div className="flex-1 bg-gray-200 rounded-full h-2">
          <div className="bg-gray-400 h-2 rounded-full w-0"></div>
        </div>
        {showLabel && (
          <span className="text-sm md:text-base font-bold text-gray-400">
            ?/10
          </span>
        )}
      </div>
    );
  }

  // Clamp score to 0-10 range
  const clampedScore = Math.min(Math.max(score, 0), 10);
  const percentage = (clampedScore / 10) * 100;
  const color = getScoreColor(clampedScore);

  return (
    <div 
      className={`flex items-center gap-2 md:gap-3 ${className}`}
      role="progressbar"
      aria-valuenow={clampedScore}
      aria-valuemin={0}
      aria-valuemax={10}
      aria-label={`Score: ${formatScore(clampedScore)}`}
    >
      {/* Progress Bar Track */}
      <div className="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden">
        {/* Progress Bar Fill */}
        <div
          className="h-2 rounded-full transition-all duration-300 ease-out"
          style={{ 
            width: `${percentage}%`,
            backgroundColor: color
          }}
        />
      </div>
      
      {/* Score Label */}
      {showLabel && (
        <span className="text-sm md:text-base font-bold text-gray-900 min-w-[3rem] text-right">
          {formatScore(clampedScore)}
        </span>
      )}
    </div>
  );
};
