import { appConfig } from '@/config';
import { api } from '@/services/api';

/**
 * Utility functions for checking feature availability
 */

/**
 * Check if hearing exams are enabled locally
 */
export const isHearingEnabled = (): boolean => {
  return appConfig.features.hearingExams;
};

/**
 * Check hearing availability from backend API
 */
export const checkHearingAvailability = async (): Promise<boolean> => {
  try {
    const response = await api.sessions.features();
    return response.data?.features?.hearing_exams?.enabled || false;
  } catch (error) {
    console.warn('Failed to check hearing availability from backend:', error);
    return isHearingEnabled(); // Fallback to local config
  }
};

/**
 * Get the hearing-enabled activity options for practice sessions
 */
export const getAvailableActivityTypes = (includeHearing: boolean = true): Array<{ value: string; label: string; description: string; icon: string }> => {
  const baseTypes = [
    { 
      value: 'reading', 
      label: 'Reading Comprehension', 
      description: 'Text analysis and comprehension questions',
      icon: '📖'
    },
    { 
      value: 'writing', 
      label: 'Writing Practice', 
      description: 'Essay and creative writing tasks',
      icon: '✍️'
    },
    { 
      value: 'grammar', 
      label: 'Grammar Exercises', 
      description: 'Grammar rules and sentence construction',
      icon: '📝'
    },
  ];

  if (includeHearing && isHearingEnabled()) {
    baseTypes.push({
      value: 'hearing',
      label: 'Hearing Comprehension',
      description: 'Audio-based listening and comprehension tasks',
      icon: '🎧'
    });
  }

  // Add speaking practice (always available when feature is enabled)
  if (appConfig.features.speakingExams) {
    baseTypes.push({
      value: 'speaking',
      label: 'Speaking Practice',
      description: 'Oral communication and pronunciation practice',
      icon: '🎤'
    });
  }

  return baseTypes;
};

/**
 * Filter templates to exclude hearing when not available
 */
export const filterTemplatesForHearing = <T extends { breakdown?: { reading?: number; writing?: number; grammar?: number; hearing?: number } }>(
  templates: T[],
  hearingEnabled: boolean = isHearingEnabled()
): T[] => {
  if (hearingEnabled) {
    return templates;
  }

  // Remove templates that are purely hearing-focused or set hearing to 0
  return templates
    .filter(template => {
      // Filter out pure hearing templates
      const breakdown = template.breakdown;
      if (!breakdown) return true;
      
      const { reading = 0, writing = 0, grammar = 0 } = breakdown;
      const nonHearingQuestions = reading + writing + grammar;
      
      // Keep templates that have non-hearing questions
      return nonHearingQuestions > 0;
    })
    .map(template => {
      // Set hearing count to 0 if disabled
      if (template.breakdown) {
        return {
          ...template,
          breakdown: {
            ...template.breakdown,
            hearing: 0
          }
        };
      }
      return template;
    });
};