export type PracticeActivityType = 'reading' | 'writing' | 'grammar' | 'hearing';

export interface CreatePracticeSessionOptions {
  languageId: string;
  level: string;
  templateId: string;
  sessionName: string;
  activityType?: PracticeActivityType;
}

export interface PracticeSessionPayload {
  language_id: string;
  session_name: string;
  level: string;
  template_id: string;
  activity_type: PracticeActivityType;
  session_type: 'practice';
}

/**
 * Normalize practice session creation payloads so onboarding and practice views stay in sync.
 */
export const createDefaultPracticeSessionPayload = (
  options: CreatePracticeSessionOptions
): PracticeSessionPayload => {
  const {
    languageId,
    level,
    templateId,
    sessionName,
    activityType = 'reading'
  } = options;

  return {
    language_id: languageId,
    session_name: sessionName,
    level,
    template_id: templateId,
    activity_type: activityType,
    session_type: 'practice'
  };
};
