import React from 'react';
import { Badge, type BadgeProps } from './badge';
import { getActivityIcon, getActivityName } from '@/constants/activity-types';

type ActivityType = 'reading' | 'writing' | 'grammar' | 'hearing';

interface ActivityBadgeProps extends Omit<BadgeProps, 'variant'> {
  activity: ActivityType;
  showIcon?: boolean;
  showName?: boolean;
}

const activityVariants: Record<ActivityType, BadgeProps['variant']> = {
  reading: 'primary',
  writing: 'success',
  grammar: 'purple',
  hearing: 'warning',
};

/**
 * ActivityBadge - Standardized activity type badge
 * 
 * @example
 * ```tsx
 * <ActivityBadge activity="reading" showIcon />
 * <ActivityBadge activity="writing" showIcon showName />
 * ```
 * 
 * @responsive
 * - Uses Badge component which has built-in responsive sizing
 * - Icon and name can be toggled for space-constrained layouts
 * 
 * @accessibility
 * - Inherits Badge accessibility features
 * - Color-coded by activity type for quick recognition
 */
export const ActivityBadge: React.FC<ActivityBadgeProps> = ({
  activity,
  showIcon = true,
  showName = true,
  ...props
}) => {
  const variant = activityVariants[activity] || 'primary';
  const icon = showIcon ? getActivityIcon(activity) : null;
  const name = showName ? getActivityName(activity) : null;

  return (
    <Badge variant={variant} {...props}>
      {icon && <span className="mr-1">{icon}</span>}
      {name}
    </Badge>
  );
};

