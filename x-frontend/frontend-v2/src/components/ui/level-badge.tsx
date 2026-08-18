import React from 'react';
import { Badge, type BadgeProps } from './badge';

type CEFRLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';

interface LevelBadgeProps extends Omit<BadgeProps, 'variant'> {
  level: CEFRLevel;
}

const levelVariants: Record<CEFRLevel, BadgeProps['variant']> = {
  A1: 'success',
  A2: 'primary',
  B1: 'purple',
  B2: 'purple',
  C1: 'warning',
  C2: 'danger',
};

/**
 * LevelBadge - Standardized CEFR level badge
 * 
 * @example
 * ```tsx
 * <LevelBadge level="A1" size="sm" />
 * <LevelBadge level="B2" size="md" />
 * ```
 * 
 * @responsive
 * - Uses Badge component which has built-in responsive sizing
 * 
 * @accessibility
 * - Inherits Badge accessibility features
 * - Color-coded by CEFR level difficulty
 */
export const LevelBadge: React.FC<LevelBadgeProps> = ({ level, ...props }) => {
  const variant = levelVariants[level] || 'primary';
  
  return (
    <Badge variant={variant} {...props}>
      {level}
    </Badge>
  );
};

