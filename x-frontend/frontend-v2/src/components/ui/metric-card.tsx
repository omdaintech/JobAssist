import { cn } from '@/lib/utils';
import React from 'react';

interface MetricCardProps {
  icon: string;
  title: string;
  value: string | number;
  subtitle?: string;
  color?: 'blue' | 'green' | 'purple' | 'orange' | 'gray';
  onClick?: () => void;
  className?: string;
}

const colorConfig = {
  blue: {
    bg: 'bg-blue-50',
    border: 'border-blue-100',
    iconBg: 'bg-blue-100',
    text: 'text-blue-600',
    hover: 'hover:bg-blue-100',
  },
  green: {
    bg: 'bg-green-50',
    border: 'border-green-100',
    iconBg: 'bg-green-100',
    text: 'text-green-600',
    hover: 'hover:bg-green-100',
  },
  purple: {
    bg: 'bg-purple-50',
    border: 'border-purple-100',
    iconBg: 'bg-purple-100',
    text: 'text-purple-600',
    hover: 'hover:bg-purple-100',
  },
  orange: {
    bg: 'bg-orange-50',
    border: 'border-orange-100',
    iconBg: 'bg-orange-100',
    text: 'text-orange-600',
    hover: 'hover:bg-orange-100',
  },
  gray: {
    bg: 'bg-gray-50',
    border: 'border-gray-100',
    iconBg: 'bg-gray-100',
    text: 'text-gray-600',
    hover: 'hover:bg-gray-100',
  },
};

/**
 * MetricCard - Standardized metric/stat card component
 * 
 * @example
 * ```tsx
 * <MetricCard
 *   icon="📚"
 *   title="Total Sessions"
 *   value={42}
 *   subtitle="This month"
 *   color="blue"
 * />
 * ```
 * 
 * @responsive
 * - Mobile (360-767px): 12px padding, smaller text and icons
 * - Tablet (768-1023px): 16px padding, medium text
 * - Desktop (1024px+): 20px padding, larger text and icons
 * 
 * @accessibility
 * - Min touch target: 44px when clickable
 * - Semantic color coding for different metric types
 * - Hover states for interactive cards
 */
export const MetricCard: React.FC<MetricCardProps> = ({
  icon,
  title,
  value,
  subtitle,
  color = 'blue',
  onClick,
  className,
}) => {
  const config = colorConfig[color];

  return (
    <div
      className={cn(
        'p-3 md:p-4 lg:p-5 rounded-lg border transition-all',
        config.bg,
        config.border,
        onClick && cn('cursor-pointer hover:shadow-md', config.hover),
        className
      )}
      onClick={onClick}
    >
      <div className="flex items-center gap-2 md:gap-3 mb-2 md:mb-3">
        <div
          className={cn(
            'w-8 h-8 md:w-10 md:h-10 rounded-lg flex items-center justify-center flex-shrink-0',
            config.iconBg
          )}
        >
          <span className="text-lg md:text-xl">{icon}</span>
        </div>
        <h3 className="text-xs md:text-sm font-medium text-gray-600 uppercase tracking-wide">
          {title}
        </h3>
      </div>
      <p className={cn('text-xl md:text-2xl lg:text-3xl font-bold', config.text)}>
        {value}
      </p>
      {subtitle && (
        <p className="text-[10px] md:text-xs text-gray-500 mt-1">{subtitle}</p>
      )}
    </div>
  );
};

