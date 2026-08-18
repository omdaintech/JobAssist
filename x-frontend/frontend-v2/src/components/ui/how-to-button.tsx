/**
 * How-To Button Component
 * 
 * A small help button that sits beside page titles.
 * Shows a pulsing ring animation on first visit to catch user attention.
 * Uses localStorage (cookie-based) to track if user has seen the tutorial.
 * Opens a video tutorial modal when clicked.
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { HelpCircle } from 'lucide-react';
import { VideoModal } from './video-modal';
import { getHowToConfig, hasSeenTutorial, markTutorialAsSeen } from '@/config/howToConfig';

export interface HowToButtonProps {
  /** Page identifier from howToConfig */
  pageId: string;
  /** Optional: Custom class name */
  className?: string;
  /** Optional: Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Optional: Always show animation (for testing) */
  alwaysAnimate?: boolean;
}

export const HowToButton: React.FC<HowToButtonProps> = ({
  pageId,
  className = '',
  size = 'md',
  alwaysAnimate = false
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [shouldAnimate, setShouldAnimate] = useState(false);
  const config = getHowToConfig(pageId);

  // Check if this is the first time seeing this tutorial
  useEffect(() => {
    if (!config) return;

    const hasSeen = hasSeenTutorial(pageId);
    if (!hasSeen || alwaysAnimate) {
      // Trigger animation after a brief delay
      const timer = setTimeout(() => {
        setShouldAnimate(true);
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [pageId, config, alwaysAnimate]);

  // Don't render if config doesn't exist or is disabled
  if (!config) {
    return null;
  }

  const handleClick = () => {
    setIsModalOpen(true);
    // Mark as seen when user clicks
    markTutorialAsSeen(pageId);
    setShouldAnimate(false);
  };

  // Size variants
  const sizeClasses = {
    sm: 'w-6 h-6 text-sm',
    md: 'w-8 h-8 text-base',
    lg: 'w-10 h-10 text-lg'
  };

  const iconSizes = {
    sm: 14,
    md: 18,
    lg: 22
  };

  return (
    <>
      <div className="relative inline-flex">
        {/* Pulse ring animation for first-time visitors */}
        {shouldAnimate && (
          <span className="absolute inset-0 rounded-full bg-blue-400 animate-ping opacity-40" />
        )}
        
        <motion.button
          onClick={handleClick}
          className={`
            relative
            inline-flex items-center justify-center
            rounded-full
            ${config.bubbleColor || 'bg-blue-500'}
            text-white
            hover:scale-110 hover:brightness-110
            active:scale-95
            transition-all duration-200
            shadow-md hover:shadow-lg
            focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
            ${sizeClasses[size]}
            ${className}
          `}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.2 }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          aria-label="How to use this page"
          title={config.bubbleText}
        >
          {/* Always use HelpCircle icon for consistency */}
          <HelpCircle size={iconSizes[size]} strokeWidth={2.5} />
        </motion.button>
      </div>

      {/* Video Modal */}
      <VideoModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={config.title}
        description={config.description}
        videoUrl={config.videoUrl}
      />
    </>
  );
};

