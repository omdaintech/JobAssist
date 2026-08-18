/**
 * Language Configuration
 * Contains language-specific settings including teacher personas
 */

export interface LanguageConfig {
  languageId: string;
  languageCode: string;
  teacherName: string;
  teacherTitle: string; // e.g., "Mrs.", "Mr.", "Prof."
  teacherFullName: string; // Combined title + name for convenience
  teacherEmoji: string;
}

/**
 * Language-specific configurations
 * Teacher names are culturally appropriate for each language
 */
export const LANGUAGE_CONFIGS: Record<string, LanguageConfig> = {
  // German - Original Mrs. Müller
  '687b9e32e94239d063f47070': {
    languageId: '687b9e32e94239d063f47070',
    languageCode: 'de',
    teacherName: 'Müller',
    teacherTitle: 'Mrs.',
    teacherFullName: 'Mrs. Müller',
    teacherEmoji: '👩‍🏫',
  },
  
  // French - Madame Dubois (common French surname)
  '687b9e32e94239d063f47071': {
    languageId: '687b9e32e94239d063f47071',
    languageCode: 'fr',
    teacherName: 'Dubois',
    teacherTitle: 'Mme.',
    teacherFullName: 'Mme. Dubois',
    teacherEmoji: '👩‍🏫',
  },
  
  // Spanish - Señora García (common Spanish surname)
  '690d0bddfc9266fb97420d16': {
    languageId: '690d0bddfc9266fb97420d16',
    languageCode: 'es',
    teacherName: 'García',
    teacherTitle: 'Sra.',
    teacherFullName: 'Sra. García',
    teacherEmoji: '👩‍🏫',
  },
};

/**
 * Default fallback teacher name for unknown languages
 */
export const DEFAULT_TEACHER_CONFIG: LanguageConfig = {
  languageId: 'default',
  languageCode: 'default',
  teacherName: 'Teacher',
  teacherTitle: '',
  teacherFullName: 'Your Teacher',
  teacherEmoji: '👩‍🏫',
};

/**
 * Get teacher configuration for a specific language
 * @param languageId - The language ID to get teacher config for
 * @returns Language-specific teacher configuration
 */
export function getTeacherConfig(languageId: string | null | undefined): LanguageConfig {
  if (!languageId) {
    return DEFAULT_TEACHER_CONFIG;
  }
  
  return LANGUAGE_CONFIGS[languageId] || DEFAULT_TEACHER_CONFIG;
}

/**
 * Get teacher name for a specific language
 * @param languageId - The language ID
 * @returns Full teacher name (e.g., "Mrs. Müller")
 */
export function getTeacherName(languageId: string | null | undefined): string {
  return getTeacherConfig(languageId).teacherFullName;
}

/**
 * Get teacher emoji for a specific language
 * @param languageId - The language ID
 * @returns Teacher emoji
 */
export function getTeacherEmoji(languageId: string | null | undefined): string {
  return getTeacherConfig(languageId).teacherEmoji;
}
