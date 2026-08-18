/**
 * CreatePracticeModal Component
 * 
 * Modal for creating new practice sessions.
 * FIXED: Now loads templates on level change and sends correct template UUID
 * FIXED: Dynamic levels from preferredLanguage.supported_levels (100% database-driven)
 */

import React from 'react';
import { useAuth } from '@/context/AuthContext';
import type { SessionFormData } from '@/components/shared';
import type { LanguageInfo } from '@/services/api';
import { generateSessionName } from '@/utils/session-utils';

interface PracticeTemplate {
  template_id: string;
  template_name: string;
  total_questions: number;
  breakdown: {
    reading: number;
    writing: number;
    grammar: number;
    hearing?: number;
    speaking?: number;
  };
}

interface CreatePracticeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (formData: SessionFormData) => Promise<void>;
  isLoading: boolean;
  ongoingSessionsCount: number;
  currentLevel?: string;
  preferredLanguage?: LanguageInfo;  // Full LanguageInfo with supported_levels
  practiceTemplates: PracticeTemplate[];
  onLevelChange: (level: string) => Promise<void>;
  initialActivity?: string;  // Pre-fill activity type
}

export const CreatePracticeModal: React.FC<CreatePracticeModalProps> = ({
  isOpen,
  onClose,
  onCreate,
  isLoading,
  ongoingSessionsCount,
  currentLevel,
  preferredLanguage,
  practiceTemplates,
  onLevelChange,
  initialActivity
}) => {
  const { remainingUsage } = useAuth();
  const [selectedLevel, setSelectedLevel] = React.useState(currentLevel || '');
  const [selectedActivity, setSelectedActivity] = React.useState(initialActivity || '');
  const formRef = React.useRef<HTMLFormElement>(null);
  const hasAutoSubmitted = React.useRef(false);
  const [isLoadingTemplates, setIsLoadingTemplates] = React.useState(false);

  // Dynamic credit cost based on activity type (matches database credit_rules)
  const getCreditCost = (activity: string): number => {
    switch (activity.toLowerCase()) {
      case 'reading':
        return 0; // FREE - deterministic evaluation
      case 'hearing':
        return 1; // Low cost - deterministic + transcript
      case 'speaking':
        return 2; // Standard cost - requires LLM evaluation + audio processing
      case 'writing':
      case 'grammar':
        return 2; // Standard cost - requires LLM evaluation
      default:
        return 2; // Default fallback for safety
    }
  };

  const PRACTICE_CREDIT_COST = selectedActivity ? getCreditCost(selectedActivity) : 2;
  const remainingCredits = remainingUsage ?? 0;
  const hasEnoughCredits = remainingCredits >= PRACTICE_CREDIT_COST;

  const availableLevels = React.useMemo(() => {
    // Use supported_levels from preferredLanguage (always available since user must have language preference)
    if (preferredLanguage?.supported_levels && preferredLanguage.supported_levels.length > 0) {
      // Level labels mapping
      const levelLabels: Record<string, string> = {
        'A0': 'A0 - Absolute Beginner',
        'A1': 'A1 - Beginner',
        'A2': 'A2 - Elementary',
        'B1': 'B1 - Intermediate',
        'B2': 'B2 - Upper Intermediate',
        'C1': 'C1 - Advanced',
        'C2': 'C2 - Proficient'
      };

      // Map supported levels from language's supported_levels array
      return preferredLanguage.supported_levels.map(level => ({
        value: level,
        label: levelLabels[level] || level
      }));
    }

    // Fallback if no supported_levels (should never happen in production)
    console.warn('No supported_levels found in preferredLanguage, using default levels');
    return [
      { value: 'A1', label: 'A1 - Beginner' },
      { value: 'A2', label: 'A2 - Elementary' },
      { value: 'B1', label: 'B1 - Intermediate' },
      { value: 'B2', label: 'B2 - Upper Intermediate' }
    ];
  }, [preferredLanguage]);

  // Update selected level when currentLevel prop changes
  React.useEffect(() => {
    if (currentLevel) {
      setSelectedLevel(currentLevel);
    }
  }, [currentLevel]);

  // Update selected activity when initialActivity prop changes
  React.useEffect(() => {
    if (initialActivity) {
      setSelectedActivity(initialActivity);
    }
  }, [initialActivity]);

  // Auto-submit for testing (retry mode)
  React.useEffect(() => {
    const shouldAutoSubmit = sessionStorage.getItem('autoSubmitPractice') === 'true';
    
    if (isOpen && shouldAutoSubmit && !hasAutoSubmitted.current && !isLoading && formRef.current) {
      // Wait for modal to render and templates to load
      const timer = setTimeout(() => {
        if (practiceTemplates.length > 0 && preferredLanguage) {
          hasAutoSubmitted.current = true;
          sessionStorage.removeItem('autoSubmitPractice');
          
          // Trigger form submit
          formRef.current?.requestSubmit();
        }
      }, 500); // Small delay to ensure everything is loaded
      
      return () => clearTimeout(timer);
    }
  }, [isOpen, isLoading, practiceTemplates, preferredLanguage]);

  // Ensure selected level is valid for the chosen language
  React.useEffect(() => {
    if (!availableLevels.some(level => level.value === selectedLevel)) {
      const fallbackLevel = availableLevels[0]?.value || '';
      if (fallbackLevel) {
        setSelectedLevel(fallbackLevel);
        void onLevelChange(fallbackLevel);
      }
    }
  }, [availableLevels, selectedLevel, onLevelChange]);

  // Generate robust session name using shared utility
  const generatePracticeSessionName = (): string => {
    return generateSessionName({
      languageName: preferredLanguage?.language_name,
      level: selectedLevel,
      activityType: selectedActivity,
      sessionType: 'practice',
      availableLevels: availableLevels.map(level => level.value)
    });
  };

  // Helper function to find the correct template for an activity type
  const findTemplateForActivity = (activityType: string): string | null => {
    // Find template where the selected activity has questions
    const template = practiceTemplates.find(t => {
      const count = t.breakdown[activityType as keyof typeof t.breakdown];
      return typeof count === 'number' && count > 0;
    });
    return template?.template_id || null;
  };

  // Dynamically generate available activity types from templates
  const getAvailableActivityTypes = (): Array<{ value: string; label: string; icon: string; count: number }> => {
    const activityMap = new Map<string, { count: number; icon: string; label: string }>();
    
    // Activity type metadata
    const activityInfo: Record<string, { icon: string; label: string }> = {
      reading: { icon: '📖', label: 'Reading Practice' },
      writing: { icon: '✍️', label: 'Writing Practice' },
      grammar: { icon: '📝', label: 'Grammar Practice' },
      hearing: { icon: '🎧', label: 'Listening Practice' },
      speaking: { icon: '🎤', label: 'Speaking Practice' },
    };

    // Scan all templates to find available activity types
    practiceTemplates.forEach(template => {
      Object.entries(template.breakdown).forEach(([activity, count]) => {
        if (count > 0 && activityInfo[activity]) {
          const existing = activityMap.get(activity);
          activityMap.set(activity, {
            count: (existing?.count || 0) + count,
            icon: activityInfo[activity].icon,
            label: activityInfo[activity].label,
          });
        }
      });
    });

    return Array.from(activityMap.entries()).map(([value, info]) => ({
      value,
      label: info.label,
      icon: info.icon,
      count: info.count,
    }));
  };

  const handleLevelChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newLevel = e.target.value;
    setSelectedLevel(newLevel);
    setSelectedActivity(''); // Reset activity when level changes
    
    if (newLevel) {
      setIsLoadingTemplates(true);
      try {
        await onLevelChange(newLevel);
      } finally {
        setIsLoadingTemplates(false);
      }
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const activityType = formData.get('activity_type') as string;
    
    if (!activityType) {
      alert('Please select an activity type');
      return;
    }

    // Find the correct template ID for this activity
    const templateId = findTemplateForActivity(activityType);
    
    if (!templateId) {
      alert(`No template found for ${activityType} practice at level ${selectedLevel}. Please try a different level or activity.`);
      return;
    }

    await onCreate({
      language_id: preferredLanguage?.language_id || 'de',
      session_name: formData.get('practice_name') as string,
      level: selectedLevel,
      template_id: templateId,
      activity_type: activityType,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-xl max-w-md w-full shadow-2xl">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-purple-600 to-purple-700 px-4 md:px-6 py-3 md:py-4 rounded-t-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 md:gap-3">
              <div className="w-8 h-8 md:w-10 md:h-10 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
                <span className="text-xl md:text-2xl">🧠</span>
              </div>
              <div>
                <h2 className="text-base md:text-lg font-bold text-white">Create Practice Session</h2>
                <p className="text-[10px] md:text-xs text-purple-100">Focused Skill Practice</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:bg-white hover:bg-opacity-20 rounded-lg p-1 transition-colors"
              aria-label="Close modal"
            >
              <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Modal Content */}
        <div className="p-4 md:p-6">
          <form ref={formRef} onSubmit={handleSubmit} className="space-y-3 md:space-y-4">
            {/* Language Display (if set) */}
            {preferredLanguage && (
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-2 md:p-3">
                <div className="flex items-center gap-2">
                  <div>
                    <div className="text-xs md:text-sm font-medium text-purple-900">
                      Language: {preferredLanguage.language_name}
                    </div>
                    <div className="text-[10px] md:text-xs text-purple-600">
                      From your profile preferences
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Practice Name */}
            <div>
              <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1 md:mb-1.5">
                Session Name
              </label>
              <input
                type="text"
                name="practice_name"
                required
                key={`${selectedLevel}-${selectedActivity}`}
                defaultValue={generatePracticeSessionName()}
                className="w-full px-3 md:px-4 py-2 md:py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-xs md:text-sm"
                placeholder="e.g., A1 Reading 16 Oct 25 20:10"
              />
            </div>

            {/* Level Selection */}
            <div>
              <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1 md:mb-1.5">
                Level
              </label>
              <select
                name="level"
                required
                value={selectedLevel}
                onChange={handleLevelChange}
                className="w-full px-3 md:px-4 py-2 md:py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-xs md:text-sm"
              >
                <option value="">Select your level...</option>
                {availableLevels.map(level => (
                  <option key={level.value} value={level.value}>
                    {level.label}
                  </option>
                ))}
              </select>
              {isLoadingTemplates && (
                <p className="text-[10px] md:text-xs text-purple-600 mt-1">
                  Loading templates for {selectedLevel}...
                </p>
              )}
            </div>

            {/* Activity Type Selection - Dynamically generated from templates */}
            <div>
              <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1 md:mb-1.5">
                Activity Type
              </label>
              <select
                name="activity_type"
                required
                value={selectedActivity}
                onChange={(e) => setSelectedActivity(e.target.value)}
                disabled={!selectedLevel || isLoadingTemplates}
                className="w-full px-3 md:px-4 py-2 md:py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-xs md:text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                <option value="">
                  {!selectedLevel ? 'Select level first...' : isLoadingTemplates ? 'Loading options...' : 'Select activity...'}
                </option>
                {getAvailableActivityTypes().map(activity => (
                  <option key={activity.value} value={activity.value}>
                    {activity.icon} {activity.label}
                  </option>
                ))}
              </select>
              <p className="text-[10px] md:text-xs text-gray-500 mt-1 md:mt-1.5">
                {getAvailableActivityTypes().length === 0 && selectedLevel ? (
                  <span className="text-orange-600">No practice templates available for {selectedLevel}. Try a different level.</span>
                ) : (
                  <>Choose a specific skill to focus on during this practice session</>
                )}
              </p>
            </div>

            {/* Info Box */}
            <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-3 md:p-4">
              <div className="flex items-start gap-2 md:gap-3">
                <div className="text-xl md:text-2xl flex-shrink-0">💡</div>
                <div className="text-[10px] md:text-xs text-gray-700 leading-relaxed">
                  <strong className="text-purple-900">Personalized Practice:</strong> Get instant feedback and detailed explanations for each question. Perfect for targeted skill improvement!
                </div>
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex gap-2 md:gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-3 md:px-4 py-2 md:py-2.5 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors min-h-[44px] text-xs md:text-sm"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading || ongoingSessionsCount >= 5 || !hasEnoughCredits}
                className="flex-1 px-3 md:px-4 py-2 md:py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors shadow-sm min-h-[44px] text-xs md:text-sm"
                title={!hasEnoughCredits ? 'Insufficient credits' : ''}
              >
                {isLoading ? 'Creating...' : !hasEnoughCredits ? 'Insufficient Credits' : 'Create Practice'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

