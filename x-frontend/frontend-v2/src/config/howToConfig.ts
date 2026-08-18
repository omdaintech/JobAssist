/**
 * How-To Configuration
 * 
 * Defines which pages show the "How To" floating bubble and what content to display.
 * Each page can have its own tutorial video and messaging.
 */

export interface HowToConfig {
  /** Unique identifier for the page */
  pageId: string;
  /** Title shown in the modal */
  title: string;
  /** Call-to-action text shown on tooltip (appears on hover) */
  bubbleText: string;
  /** Description text in the modal */
  description: string;
  /** YouTube video embed URL or direct video link */
  videoUrl: string;
  /** Whether this tutorial is enabled */
  enabled: boolean;
  /** Optional: Custom bubble color (defaults to blue). Uses TailwindCSS bg- classes. */
  bubbleColor?: string;
  /** @deprecated icon field is no longer used - HelpCircle icon is now displayed universally */
  icon?: string;
}

/**
 * Configuration for each page's "How To" tutorial
 * 
 * To add a new page:
 * 1. Add a new entry here with the pageId matching the route/view name
 * 2. Add the HowToGuide component to that view
 * 3. Pass the pageId prop to the component
 */
export const howToConfig: Record<string, HowToConfig> = {
  dashboard: {
    pageId: 'dashboard',
    title: 'Welcome to Your Dashboard (comming soon!)',
    bubbleText: 'First time here? Click for a quick guide',
    description: 'Learn how to navigate your learning dashboard, track your progress, and get the most out of your study sessions.',
    videoUrl: '', // Replace with actual video
    enabled: false, // ❌ DISABLED - No video available yet
    bubbleColor: 'bg-blue-500'
  },
  
  practice: {
    pageId: 'practice',
    title: 'How to Use Practice Mode (comming soon!)',
    bubbleText: 'Need help? Click for a quick guide',
    description: 'Discover how to create and complete practice sessions, track your progress, and review your results.',
    videoUrl: '', // Replace with actual video
    enabled: false, // ❌ DISABLED - No video available yet
    bubbleColor: 'bg-green-500'
  },
  
  exam: {
    pageId: 'exam',
    title: 'Taking Your First Exam (comming soon!)',
    bubbleText: 'How does it work? Click for a quick guide',
    description: 'Learn how to take exams, manage your time effectively, and understand your results.',
    videoUrl: '', // Replace with actual video
    enabled: false, // ❌ DISABLED - No video available yet
    bubbleColor: 'bg-purple-500'
  },
  
  results: {
    pageId: 'results',
    title: 'Understanding Your Results (comming soon!)',
    bubbleText: 'Learn more - Click for a quick guide',
    description: 'Understand how to read your results, analyze your performance, and identify areas for improvement.',
    videoUrl: '', // Replace with actual video
    enabled: false, // ❌ DISABLED - No video available yet
    bubbleColor: 'bg-orange-500'
  },
  
  credit: {
    pageId: 'credit',
    title: 'Managing Your Credits (comming soon!)',
    bubbleText: 'How do credits work? Click for a quick guide',
    description: 'Learn about the credit system, how to purchase credits, and track your usage.',
    videoUrl: '', // Replace with actual video
    enabled: false, // ❌ DISABLED - No video available yet
    bubbleColor: 'bg-yellow-500'
  },
  
  sessionQuestion: {
    pageId: 'sessionQuestion',
    title: 'Answering Questions Effectively (comming soon!)',
    bubbleText: 'Tips & tricks - Click for a quick guide',
    description: 'Get tips on how to answer different question types and make the most of your session.',
    videoUrl: '', // Replace with actual video
    enabled: false, // ❌ DISABLED - No video available yet
    bubbleColor: 'bg-indigo-500'
  }
};

/**
 * Get configuration for a specific page
 */
export const getHowToConfig = (pageId: string): HowToConfig | null => {
  const config = howToConfig[pageId];
  if (!config || !config.enabled) {
    return null;
  }
  return config;
};

/**
 * Check if user has seen the tutorial for a specific page
 */
export const hasSeenTutorial = (pageId: string): boolean => {
  try {
    const seen = localStorage.getItem(`howto_seen_${pageId}`);
    return seen === 'true';
  } catch {
    return false;
  }
};

/**
 * Mark tutorial as seen for a specific page
 */
export const markTutorialAsSeen = (pageId: string): void => {
  try {
    localStorage.setItem(`howto_seen_${pageId}`, 'true');
  } catch (error) {
    console.warn('Failed to mark tutorial as seen:', error);
  }
};

/**
 * Reset tutorial status (for testing or user preference)
 */
export const resetTutorialStatus = (pageId?: string): void => {
  try {
    if (pageId) {
      localStorage.removeItem(`howto_seen_${pageId}`);
    } else {
      // Reset all tutorials
      Object.keys(howToConfig).forEach(id => {
        localStorage.removeItem(`howto_seen_${id}`);
      });
    }
  } catch (error) {
    console.warn('Failed to reset tutorial status:', error);
  }
};

