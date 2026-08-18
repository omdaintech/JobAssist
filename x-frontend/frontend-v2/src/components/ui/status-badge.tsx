import React from 'react';
import { Badge, type BadgeProps } from './badge';

type SessionStatus = 'created' | 'in_progress' | 'completed' | 'analyzed';

interface StatusBadgeProps extends Omit<BadgeProps, 'variant'> {
  status: SessionStatus;
}

const statusVariants: Record<SessionStatus, BadgeProps['variant']> = {
  created: 'secondary',
  in_progress: 'warning',
  completed: 'primary',
  analyzed: 'success',
};

const statusLabels: Record<SessionStatus, string> = {
  created: 'Ready',
  in_progress: 'In Progress',
  completed: 'Get Analysed',
  analyzed: 'Analyzed',
};

/**
 * StatusBadge - Standardized status badge for session states
 * 
 * @example
 * ```tsx
 * <StatusBadge status="completed" size="sm" />
 * <StatusBadge status="in_progress" size="md" />
 * ```
 * 
 * @responsive
 * - Uses Badge component which has built-in responsive sizing
 * 
 * @accessibility
 * - Inherits Badge accessibility features
 * - Semantic color coding for different statuses
 */
export const StatusBadge: React.FC<StatusBadgeProps> = ({ 
  status, 
  children,
  ...props 
}) => {
  const variant = statusVariants[status] || 'secondary';
  const label = children || statusLabels[status];
  
  return (
    <Badge variant={variant} {...props}>
      {label}
    </Badge>
  );
};

