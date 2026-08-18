/**
 * Chart Utilities
 * 
 * Provides consistent colors, formatters, and helper functions for Recharts
 */

// Color Palette - Consistent with Tailwind theme
export const CHART_COLORS = {
  primary: '#3B82F6',      // Blue-500
  success: '#10B981',      // Green-500
  warning: '#F59E0B',      // Amber-500
  danger: '#EF4444',       // Red-500
  secondary: '#8B5CF6',    // Purple-500
  info: '#06B6D4',         // Cyan-500
  gray: '#6B7280',         // Gray-500
  lightGray: '#E5E7EB',    // Gray-200
  darkGray: '#374151',     // Gray-700
} as const;

// Chart color schemes for different contexts
export const COLOR_SCHEMES = {
  performance: {
    excellent: CHART_COLORS.success,    // >80
    good: CHART_COLORS.primary,         // 60-80
    needsWork: CHART_COLORS.warning,    // 40-60
    poor: CHART_COLORS.danger,          // <40
  },
  sessionTypes: {
    practice: CHART_COLORS.primary,
    exam: CHART_COLORS.success,
  },
  levels: {
    A1: '#3B82F6',  // Blue
    A2: '#8B5CF6',  // Purple
    B1: '#10B981',  // Green
  },
  activities: [
    CHART_COLORS.primary,
    CHART_COLORS.success,
    CHART_COLORS.warning,
    CHART_COLORS.secondary,
    CHART_COLORS.info,
  ],
} as const;

/**
 * Normalize score to 0-100 scale
 * 
 * Handles various input formats (string, number) and ensures valid range
 * Use this function everywhere to ensure consistency!
 * 
 * @param score - Score value (can be string or number)
 * @returns Normalized score (0-100) or undefined if invalid
 */
export function normalizeScore(score?: number | string | null): number | undefined {
  if (score === null || score === undefined) {
    return undefined;
  }

  const numericScore = typeof score === 'number' ? score : Number(score);
  
  if (Number.isNaN(numericScore) || !Number.isFinite(numericScore)) {
    return undefined;
  }

  // Clamp to valid 0-100 range
  return Math.max(0, Math.min(100, numericScore));
}

/**
 * Format score for display with percentage
 * 
 * @param score - Score value (0-100 scale)
 * @param decimals - Number of decimal places (default: 0)
 * @returns Formatted score string (e.g., "85%")
 */
export function formatScorePercentage(score?: number | string | null, decimals: number = 0): string {
  const normalized = normalizeScore(score);
  if (normalized === undefined) {
    return '?%';
  }
  return `${normalized.toFixed(decimals)}%`;
}

/**
 * Get color based on score performance (0-100 scale)
 * 
 * UNIFIED GRADE COLOR SYSTEM - Use this everywhere for consistency!
 * - Excellent (80-100): Green
 * - Good (60-79): Blue
 * - Needs Work (40-59): Yellow/Amber
 * - Poor (0-39): Red
 */
export function getScoreColor(score: number): string {
  if (score >= 80) return COLOR_SCHEMES.performance.excellent;
  if (score >= 60) return COLOR_SCHEMES.performance.good;
  if (score >= 40) return COLOR_SCHEMES.performance.needsWork;
  return COLOR_SCHEMES.performance.poor;
}

/**
 * Get Tailwind color classes for score-based styling (0-100 scale)
 * Returns { text, bg, border } classes for consistent UI components
 * 
 * @example
 * ```tsx
 * const colors = getScoreColorClasses(85);
 * <div className={`${colors.bg} ${colors.text}`}>Excellent!</div>
 * ```
 */
export function getScoreColorClasses(score: number): { 
  text: string; 
  bg: string; 
  border: string;
  bgHover: string;
} {
  if (score >= 80) {
    return {
      text: 'text-green-700',
      bg: 'bg-green-50',
      border: 'border-green-200',
      bgHover: 'hover:bg-green-100'
    };
  }
  if (score >= 60) {
    return {
      text: 'text-blue-700',
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      bgHover: 'hover:bg-blue-100'
    };
  }
  if (score >= 40) {
    return {
      text: 'text-yellow-700',
      bg: 'bg-yellow-50',
      border: 'border-yellow-200',
      bgHover: 'hover:bg-yellow-100'
    };
  }
  return {
    text: 'text-red-700',
    bg: 'bg-red-50',
    border: 'border-red-200',
    bgHover: 'hover:bg-red-100'
  };
}

/**
 * Get hex color based on score (0-100 scale)
 * For use in charts, badges, and other visual elements
 */
export function getScoreColorHex(score: number): string {
  return getScoreColor(score);
}

/**
 * Get gradient colors for score (0-100 scale)
 * Returns start and end colors for smooth gradients
 */
export function getScoreGradient(score: number): { start: string; end: string } {
  if (score >= 80) {
    return { start: '#059669', end: '#10b981' }; // Green gradient
  }
  if (score >= 60) {
    return { start: '#0284c7', end: '#0ea5e9' }; // Blue gradient
  }
  if (score >= 40) {
    return { start: '#d97706', end: '#f59e0b' }; // Amber gradient
  }
  return { start: '#dc2626', end: '#f97316' }; // Red gradient
}

/**
 * Format date for chart axis
 */
export function formatChartDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric'
    }).format(date);
  } catch {
    return dateString;
  }
}

/**
 * Format month for chart axis
 */
export function formatChartMonth(monthString: string): string {
  try {
    const [year, month] = monthString.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      year: '2-digit'
    }).format(date);
  } catch {
    return monthString;
  }
}

/**
 * Format score with percentage
 */
export function formatScore(value: number): string {
  return `${value.toFixed(1)}%`;
}

/**
 * Format number with locale
 */
export function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US').format(value);
}

/**
 * Custom tooltip formatter for Recharts
 */
export function createCustomTooltip(labelFormatter?: (label: string) => string) {
  return ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) {
      return null;
    }

    return (
      <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200">
        <p className="text-sm font-medium text-gray-900 mb-2">
          {labelFormatter ? labelFormatter(label) : label}
        </p>
        {payload.map((entry: any, index: number) => (
          <div key={`item-${index}`} className="flex items-center justify-between gap-4 text-sm">
            <span className="flex items-center gap-2">
              <span
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-gray-600">{entry.name}:</span>
            </span>
            <span className="font-semibold text-gray-900">
              {typeof entry.value === 'number' ? formatNumber(entry.value) : entry.value}
            </span>
          </div>
        ))}
      </div>
    );
  };
}

/**
 * Check if data is empty or has no meaningful values
 */
export function isChartDataEmpty(data: any[]): boolean {
  if (!data || data.length === 0) return true;
  
  // Check if all numeric values are 0
  return data.every((item) => {
    const values = Object.values(item).filter(v => typeof v === 'number');
    return values.every(v => v === 0);
  });
}

/**
 * Responsive chart dimensions
 */
export const CHART_DIMENSIONS = {
  default: {
    height: 300,
    aspectRatio: 16 / 9,
  },
  compact: {
    height: 200,
    aspectRatio: 16 / 9,
  },
  tall: {
    height: 400,
    aspectRatio: 4 / 3,
  },
  mini: {
    height: 100,
    aspectRatio: 16 / 4,
  },
} as const;

/**
 * Common chart configuration
 */
export const CHART_CONFIG = {
  animation: {
    duration: 800,
    easing: 'ease-in-out',
  },
  grid: {
    strokeDasharray: '3 3',
    stroke: CHART_COLORS.lightGray,
  },
  axis: {
    tick: {
      fill: CHART_COLORS.gray,
      fontSize: 12,
    },
    axisLine: {
      stroke: CHART_COLORS.lightGray,
    },
  },
} as const;

/**
 * Format activity type for display
 */
export function formatActivityType(activityType: string): string {
  return activityType
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Truncate text for labels
 */
export function truncateLabel(text: string, maxLength: number = 20): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength)}...`;
}

