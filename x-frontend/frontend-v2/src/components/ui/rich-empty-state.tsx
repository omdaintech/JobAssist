import React from 'react';
import { Button } from './button';
import { Link } from 'react-router-dom';

export interface EmptyStateAction {
  label: string;
  labelShort?: string; // Optional shorter label for mobile
  onClick?: () => void;
  to?: string;
  variant?: 'default' | 'outline' | 'ghost';
  icon?: string;
}

export interface RichEmptyStateProps {
  /**
   * SVG illustration or large emoji
   */
  illustration?: React.ReactNode;
  /**
   * Fallback emoji if no illustration
   */
  emoji?: string;
  /**
   * Main title for the empty state
   */
  title: string;
  /**
   * Descriptive text explaining the empty state
   */
  description: string;
  /**
   * Array of action buttons
   */
  actions?: EmptyStateAction[];
  /**
   * Optional tips to display
   */
  tips?: string[];
  /**
   * How To section with video tutorial
   */
  howTo?: {
    label: string;
    videoUrl: string;
    description?: string;
  };
  /**
   * Size variant
   */
  size?: 'small' | 'medium' | 'large';
  /**
   * Additional CSS classes
   */
  className?: string;
}

/**
 * Rich Empty State Component with illustrations, multiple actions, and tips
 * Based on UX Audit Section 3.3 recommendations
 */
export const RichEmptyState: React.FC<RichEmptyStateProps> = ({
  illustration,
  emoji,
  title,
  description,
  actions = [],
  tips = [],
  howTo,
  size = 'medium',
  className = '',
}) => {
  const [showHowToVideo, setShowHowToVideo] = React.useState(false);
  const sizeConfig = {
    small: {
      container: 'py-8 px-4',
      illustration: 'w-24 h-24',
      emoji: 'text-5xl',
      title: 'text-lg',
      description: 'text-sm max-w-sm',
      spacing: 'space-y-4'
    },
    medium: {
      container: 'py-12 px-6',
      illustration: 'w-32 h-32',
      emoji: 'text-7xl',
      title: 'text-xl',
      description: 'text-base max-w-md',
      spacing: 'space-y-6'
    },
    large: {
      container: 'py-16 px-8',
      illustration: 'w-40 h-40',
      emoji: 'text-8xl',
      title: 'text-2xl',
      description: 'text-lg max-w-lg',
      spacing: 'space-y-8'
    }
  };

  const config = sizeConfig[size];

  return (
    <div className={`flex flex-col items-center justify-center text-center ${config.container} ${className}`}>
      {/* Illustration or Emoji */}
      {(illustration || emoji) && (
        <div className={`mb-6 ${config.spacing}`}>
          {illustration ? (
            <div className={`${config.illustration} mx-auto opacity-60`}>
              {illustration}
            </div>
          ) : (
            <div className={`${config.emoji} opacity-40 mb-4`}>
              {emoji}
            </div>
          )}
        </div>
      )}

      {/* Title */}
      <h3 className={`${config.title} font-bold text-gray-900 mb-3`}>
        {title}
      </h3>

      {/* Description */}
      <p className={`${config.description} text-gray-600 mb-6 mx-auto leading-relaxed`}>
        {description}
      </p>

      {/* Actions */}
      {actions.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-3 mb-6 w-full max-w-md">
          {actions.map((action, index) => {
            const buttonContent = (
              <>
                {action.icon && <span className="mr-2">{action.icon}</span>}
                {action.labelShort ? (
                  <>
                    <span className="sm:hidden">{action.labelShort}</span>
                    <span className="hidden sm:inline">{action.label}</span>
                  </>
                ) : (
                  action.label
                )}
              </>
            );

            if (action.to) {
              return (
                <Button
                  key={index}
                  asChild
                  variant={action.variant || (index === 0 ? 'default' : 'outline')}
                  className="flex-1"
                >
                  <Link to={action.to}>{buttonContent}</Link>
                </Button>
              );
            }

            return (
              <Button
                key={index}
                onClick={action.onClick}
                variant={action.variant || (index === 0 ? 'default' : 'outline')}
                className="flex-1"
              >
                {buttonContent}
              </Button>
            );
          })}
        </div>
      )}

      {/* Tips Section */}
      {tips.length > 0 && (
        <div className="w-full max-w-md mt-6 p-4 bg-blue-50 border border-blue-100 rounded-lg text-left">
          <p className="text-sm font-semibold text-blue-900 mb-2">
            💡 Helpful Tips
          </p>
          <ul className="space-y-2">
            {tips.map((tip, index) => (
              <li key={index} className="text-sm text-blue-800 flex items-start">
                <span className="mr-2 text-blue-600">•</span>
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* How To Section */}
      {howTo && (
        <div className="w-full max-w-md mt-6 p-4 bg-purple-50 border border-purple-200 rounded-lg text-left">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-purple-900 flex items-center gap-2">
              <span>🎥</span>
              <span>How To Guide</span>
            </p>
          </div>
          {howTo.description && (
            <p className="text-sm text-purple-800 mb-3">
              {howTo.description}
            </p>
          )}
          <Button
            onClick={() => setShowHowToVideo(true)}
            variant="outline"
            size="sm"
            className="w-full border-purple-300 text-purple-700 hover:bg-purple-100 mb-3"
          >
            ▶️ {howTo.label}
          </Button>
          <p className="text-xs text-purple-700 bg-purple-100 p-2 rounded flex items-start gap-1.5">
            <span className="flex-shrink-0 font-bold">💡</span>
            <span>
              <strong>Tip:</strong> You can access video tutorials anytime by clicking the <strong>'?'</strong> button beside page titles and headings.
            </span>
          </p>
        </div>
      )}

      {/* How To Video Modal */}
      {showHowToVideo && howTo && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowHowToVideo(false)}
        >
          <div 
            className="bg-white rounded-lg max-w-4xl w-full p-6 relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowHowToVideo(false)}
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 text-2xl font-bold w-8 h-8 flex items-center justify-center"
            >
              ×
            </button>
            <h3 className="text-xl font-bold text-gray-900 mb-4">{howTo.label}</h3>
            <div className="aspect-video w-full">
              <iframe
                src={howTo.videoUrl}
                className="w-full h-full rounded"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                title={howTo.label}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// SVG Illustrations for common empty states
export const EmptyIllustrations = {
  Practice: () => (
    <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      {/* Book with brain */}
      <rect x="50" y="80" width="100" height="80" rx="4" fill="#E0E7FF" stroke="#6366F1" strokeWidth="2"/>
      <rect x="60" y="90" width="35" height="2" fill="#6366F1" opacity="0.5"/>
      <rect x="60" y="100" width="40" height="2" fill="#6366F1" opacity="0.5"/>
      <rect x="60" y="110" width="30" height="2" fill="#6366F1" opacity="0.5"/>
      <circle cx="125" cy="115" r="20" fill="#FEF3C7" stroke="#F59E0B" strokeWidth="2"/>
      <path d="M 120 110 Q 125 105 130 110" stroke="#F59E0B" strokeWidth="2" fill="none"/>
      <circle cx="122" cy="115" r="2" fill="#F59E0B"/>
      <circle cx="128" cy="115" r="2" fill="#F59E0B"/>
    </svg>
  ),

  Exam: () => (
    <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      {/* Document with checkmarks */}
      <rect x="60" y="40" width="80" height="120" rx="4" fill="#F3F4F6" stroke="#6B7280" strokeWidth="2"/>
      <rect x="70" y="60" width="60" height="3" fill="#6B7280" opacity="0.3"/>
      <rect x="70" y="70" width="50" height="3" fill="#6B7280" opacity="0.3"/>
      <circle cx="75" cy="90" r="8" fill="#10B981" opacity="0.2"/>
      <path d="M 72 90 L 74 92 L 78 88" stroke="#10B981" strokeWidth="2" fill="none"/>
      <circle cx="75" cy="110" r="8" fill="#10B981" opacity="0.2"/>
      <path d="M 72 110 L 74 112 L 78 108" stroke="#10B981" strokeWidth="2" fill="none"/>
      <circle cx="75" cy="130" r="8" fill="#E5E7EB"/>
      <rect x="85" y="88" width="40" height="3" fill="#6B7280" opacity="0.3"/>
      <rect x="85" y="108" width="40" height="3" fill="#6B7280" opacity="0.3"/>
      <rect x="85" y="128" width="40" height="3" fill="#6B7280" opacity="0.3"/>
    </svg>
  ),

  Results: () => (
    <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      {/* Chart with trend line */}
      <rect x="50" y="150" width="15" height="40" rx="2" fill="#93C5FD"/>
      <rect x="75" y="130" width="15" height="60" rx="2" fill="#60A5FA"/>
      <rect x="100" y="110" width="15" height="80" rx="2" fill="#3B82F6"/>
      <rect x="125" y="90" width="15" height="100" rx="2" fill="#2563EB"/>
      <path d="M 57 170 L 82 150 L 107 130 L 132 110" stroke="#10B981" strokeWidth="3" strokeLinecap="round"/>
      <circle cx="57" cy="170" r="4" fill="#10B981"/>
      <circle cx="82" cy="150" r="4" fill="#10B981"/>
      <circle cx="107" cy="130" r="4" fill="#10B981"/>
      <circle cx="132" cy="110" r="4" fill="#10B981"/>
    </svg>
  ),

  Sessions: () => (
    <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      {/* Calendar/Schedule */}
      <rect x="50" y="60" width="100" height="100" rx="8" fill="#FEF3C7" stroke="#F59E0B" strokeWidth="2"/>
      <rect x="50" y="60" width="100" height="25" rx="8" fill="#F59E0B"/>
      <circle cx="70" cy="72" r="3" fill="#FFFFFF"/>
      <circle cx="130" cy="72" r="3" fill="#FFFFFF"/>
      <rect x="60" y="95" width="20" height="15" rx="2" fill="#FBBF24"/>
      <rect x="90" y="95" width="20" height="15" rx="2" fill="#FBBF24"/>
      <rect x="120" y="95" width="20" height="15" rx="2" fill="#FBBF24"/>
      <rect x="60" y="120" width="20" height="15" rx="2" fill="#FDE68A"/>
      <rect x="90" y="120" width="20" height="15" rx="2" fill="#FDE68A"/>
    </svg>
  ),
};

export default RichEmptyState;

