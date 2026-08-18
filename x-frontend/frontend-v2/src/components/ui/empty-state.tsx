import React from 'react';
import { Button } from './button';
import { Link } from 'react-router-dom';

interface EmptyStateProps {
  /**
   * Icon or emoji to display
   */
  icon: string;
  /**
   * Main title for the empty state
   */
  title: string;
  /**
   * Descriptive text explaining the empty state
   */
  description: string;
  /**
   * Optional action button label
   */
  actionLabel?: string;
  /**
   * Optional route for the action button
   */
  actionTo?: string;
  /**
   * Optional custom action handler (overrides actionTo)
   */
  onAction?: () => void;
  /**
   * Size variant for the empty state
   */
  size?: 'small' | 'medium' | 'large';
  /**
   * Additional CSS classes
   */
  className?: string;
}

/**
 * A reusable empty state component with consistent styling and UX patterns
 */
export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionLabel,
  actionTo,
  onAction,
  size = 'medium',
  className = '',
}) => {
  const sizeConfig = {
    small: {
      container: 'py-8',
      icon: 'text-4xl mb-3',
      title: 'text-base font-semibold',
      description: 'text-sm max-w-xs',
      spacing: 'mb-4'
    },
    medium: {
      container: 'py-12',
      icon: 'text-6xl mb-4',
      title: 'text-lg font-semibold',
      description: 'text-sm max-w-sm',
      spacing: 'mb-6'
    },
    large: {
      container: 'py-16',
      icon: 'text-8xl mb-6',
      title: 'text-xl font-semibold',
      description: 'text-base max-w-md',
      spacing: 'mb-8'
    }
  };

  const config = sizeConfig[size];

  return (
    <div className={`text-center ${config.container} ${className}`}>
      <div className={`${config.icon} opacity-30`}>{icon}</div>
      <h3 className={`${config.title} text-gray-900 mb-2`}>{title}</h3>
      <p className={`${config.description} text-gray-600 ${config.spacing} mx-auto`}>
        {description}
      </p>
      {actionLabel && (actionTo || onAction) && (
        <div>
          {onAction ? (
            <Button onClick={onAction} variant="outline">
              {actionLabel}
            </Button>
          ) : actionTo ? (
            <Button asChild variant="outline">
              <Link to={actionTo}>{actionLabel}</Link>
            </Button>
          ) : null}
        </div>
      )}
    </div>
  );
};

export default EmptyState;