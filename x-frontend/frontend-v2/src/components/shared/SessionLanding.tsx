import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label, LoadingSpinner, PreviewBlock } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { ExamTemplate, LanguageInfo, api } from '@/services/api';
import { getAvailableActivityTypes } from '@/utils/features';
import React, { useCallback, useEffect, useState } from 'react';

// Helper function to generate default session name with timestamp
const generateDefaultSessionName = (sessionType: 'practice' | 'exam'): string => {
  const now = new Date();
  const day = now.getDate().toString().padStart(2, '0');
  const month = now.toLocaleDateString('en-US', { month: 'short' });
  const year = now.getFullYear().toString().slice(-2);
  const hours = now.getHours().toString().padStart(2, '0');
  const minutes = now.getMinutes().toString().padStart(2, '0');
  
  const prefix = sessionType === 'practice' ? 'Practice Mode' : 'Exam Mode';
  return `${prefix} ${day}-${month}-${year} ${hours}:${minutes}`;
};

// Shared types for both practice and exam sessions
export interface SessionConfig {
  sessionType: 'practice' | 'exam';
  title: string;
  subtitle: string;
  mainIcon: string;
  features: Array<{
    icon: string;
    title: string;
    description: string;
  }>;
  ctaText: string;
  allowSingleActivity?: boolean; // true for practice, false for exam
}

export interface SessionFormData {
  language_id: string;
  session_name: string;
  level: string;
  template_id: string;
  activity_type?: string; // Only for practice sessions
}

interface SessionLandingProps {
  config: SessionConfig;
  onCreateSession: (formData: SessionFormData) => Promise<void>;
  onNavigateToAuth: () => void;
  templates: ExamTemplate[];
  isLoading: boolean;
  canCreateSession: boolean;
  limitMessage?: string;
  className?: string;
}



export const SessionLanding: React.FC<SessionLandingProps> = ({
  config,
  onCreateSession,
  onNavigateToAuth,
  templates,
  canCreateSession,
  limitMessage,
  className = ''
}) => {
  const { isAuthenticated, preferredLanguage, currentLevel } = useAuth();

  // State management
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [availableLanguages, setAvailableLanguages] = useState<LanguageInfo[]>([]);
  const [loadingLanguages, setLoadingLanguages] = useState(false);

  const [formData, setFormData] = useState<SessionFormData>({
    language_id: '',
    session_name: generateDefaultSessionName(config.sessionType),
    level: '',
    template_id: '', // Will be set based on templates prop
    activity_type: config.allowSingleActivity ? 'reading' : undefined
  });

  const loadAvailableLanguages = useCallback(async () => {
    if (loadingLanguages) return;

    setLoadingLanguages(true);
    try {
      const response = await api.languages.getAvailable();
      if (response.data.success && response.data.languages) {
        setAvailableLanguages(response.data.languages);
      }
    } catch (error) {
      console.error('Failed to load available languages:', error);
    } finally {
      setLoadingLanguages(false);
    }
  }, []); // Remove loadingLanguages dependency to prevent infinite loop

  // Load available languages
  useEffect(() => {
    if (isAuthenticated) {
      loadAvailableLanguages();
    }
  }, [isAuthenticated, loadAvailableLanguages]);

  // Auto-populate form data from AuthContext
  useEffect(() => {
    if (isAuthenticated && (preferredLanguage || currentLevel)) {
      setFormData(prev => ({
        ...prev,
        language_id: preferredLanguage?.language_id || prev.language_id,
        level: currentLevel || prev.level
      }));
    }
  }, [preferredLanguage, currentLevel, isAuthenticated]);

  // Auto-set template_id when templates or level changes
  useEffect(() => {
    if (templates.length > 0 && formData.level && !formData.template_id) {
      // For exam mode, select the first available template
      if (!config.allowSingleActivity) {
        const firstTemplate = templates[0];
        if (firstTemplate) {
          setFormData(prev => ({
            ...prev,
            template_id: firstTemplate.template_id
          }));
        }
      } else {
        // For practice mode, set template based on activity type
        if (formData.activity_type) {
          setFormData(prev => ({
            ...prev,
            template_id: `${formData.activity_type}_only`
          }));
        }
      }
    }
  }, [templates, formData.level, formData.activity_type, config.allowSingleActivity]);

  // If user doesn't have a preferred language, we should encourage them to set one
  const hasPreferredLanguage = Boolean(preferredLanguage?.language_id);
  const shouldShowLanguageSetupPrompt = isAuthenticated && !hasPreferredLanguage && !formData.language_id;

  // Show preview for unauthenticated users
  if (!isAuthenticated) {
    return (
      <div className={className}>
        <PreviewBlock
          title={config.title}
          subtitle={config.subtitle}
          mainIcon={config.mainIcon}
          features={config.features}
          ctaText={config.ctaText}
          onCTAClick={onNavigateToAuth}
        />
      </div>
    );
  }

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.language_id || !formData.session_name || !formData.level || !formData.template_id) {
      return;
    }

    setIsCreating(true);
    try {
      await onCreateSession(formData);
      
      // Reset form and close modal
      setFormData({
        language_id: preferredLanguage?.language_id || '',
        session_name: generateDefaultSessionName(config.sessionType),
        level: currentLevel || '',
        template_id: '', // Will be reset to default template based on props
        activity_type: config.allowSingleActivity ? 'reading' : undefined
      });
      setShowCreateForm(false);
    } catch (error) {
      console.error(`Error creating ${config.sessionType}:`, error);
    } finally {
      setIsCreating(false);
    }
  };

  const selectedTemplate = templates.find(t => t.template_id === formData.template_id);

  const activityOptions = config.allowSingleActivity 
    ? getAvailableActivityTypes().map(type => ({
        value: type.value,
        label: `${type.icon} ${type.label}`,
        description: type.description
      }))
    : [];

  return (
    <div className={className}>
      <Card>
        <CardContent className="p-4 sm:p-6">
          {canCreateSession ? (
            <div>
              {/* AI-Powered Assessment Block */}
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-4 sm:p-6 mb-4 sm:mb-6">
                <div className="flex items-start sm:items-center gap-3 mb-4">
                  <div className="w-10 h-10 sm:w-10 sm:h-10 flex-shrink-0 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-blue-600 text-lg sm:text-xl">{config.mainIcon}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-base sm:text-lg font-semibold text-blue-900 leading-tight">{config.title}</h4>
                    <p className="text-xs sm:text-sm text-blue-700 mt-0.5">{config.subtitle}</p>
                  </div>
                </div>

                {/* Feature Highlights */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-4 sm:mb-6">
                  {config.features.map((feature, index) => (
                    <div key={index} className="bg-white p-3 sm:p-4 rounded-lg border border-blue-200">
                      <div className="flex items-center gap-2 mb-1.5 sm:mb-2">
                        <span className="text-blue-600 text-base sm:text-lg flex-shrink-0">{feature.icon}</span>
                        <span className="font-semibold text-xs sm:text-sm text-gray-900 leading-tight">{feature.title}</span>
                      </div>
                      <p className="text-xs text-gray-600 leading-relaxed">{feature.description}</p>
                    </div>
                  ))}
                </div>

                <div className="bg-white p-3 sm:p-4 rounded-lg border border-blue-200">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900 text-sm sm:text-base">Ready to start your {config.sessionType}?</p>
                      <p className="text-xs text-gray-600 mt-0.5">Professional evaluation with comprehensive feedback</p>
                    </div>
                    <div className="flex gap-3 sm:gap-2 text-xs text-gray-500 flex-shrink-0">
                      <div className="flex items-center gap-1">📝 <span>5-16 questions</span></div>
                      <div className="flex items-center gap-1">⏱️ <span>10-30 minutes</span></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Create Session Button */}
              <div className="text-center">
                <Button
                  onClick={() => {
                    // Update session name with current timestamp when opening form
                    setFormData(prev => ({
                      ...prev,
                      session_name: generateDefaultSessionName(config.sessionType)
                    }));
                    setShowCreateForm(true);
                  }}
                  className="bg-eu-blue hover:bg-eu-blue/90 text-white px-6 sm:px-8 py-2.5 sm:py-3 text-base sm:text-lg font-medium w-full sm:w-auto"
                >
                  🚀 Start My {config.sessionType === 'practice' ? 'Practice' : 'Assessment'}
                </Button>
                <p className="text-xs sm:text-sm text-gray-500 mt-2">
                  Ready to improve your language skills?
                </p>
              </div>
            </div>
          ) : (
            <div className="text-center">
              <div className="text-4xl mb-4">⚠️</div>
              <p className="text-gray-600 mb-2">{limitMessage}</p>
              <p className="text-sm text-gray-500">
                Please complete or delete a session before creating a new one.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Session Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Create New {config.sessionType === 'practice' ? 'Practice Session' : 'Exam'}</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowCreateForm(false)}
                >
                  ✕
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateSession} className="space-y-4">
                {/* Language Selection */}
                <div>
                  <Label htmlFor="language">Language</Label>
                  {shouldShowLanguageSetupPrompt ? (
                    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-yellow-600 text-lg">⚠️</span>
                        <span className="font-medium text-yellow-800">No Preferred Language Set</span>
                      </div>
                      <p className="text-sm text-yellow-700 mb-3">
                        To create practice sessions, please set your preferred language in Settings first.
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => window.location.href = '/settings'}
                        className="bg-yellow-600 text-white hover:bg-yellow-700 border-yellow-600"
                      >
                        Go to Settings
                      </Button>
                    </div>
                  ) : formData.language_id && (preferredLanguage || availableLanguages.length > 0) ? (
                    <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">
                          {preferredLanguage?.language_name ||
                           availableLanguages.find(lang => lang.language_id === formData.language_id)?.language_name ||
                           'Selected Language'}
                        </div>
                        <div className="text-sm text-gray-600">
                          {preferredLanguage ? 'From your preferences (locked)' : 'Language locked for this session'}
                        </div>
                      </div>
                      <div className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                        🔒 Locked
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {loadingLanguages ? (
                        <div className="p-3 border border-gray-200 rounded-lg">
                          <div className="flex items-center gap-2">
                            <div className="animate-spin w-4 h-4 border-2 border-eu-blue border-t-transparent rounded-full"></div>
                            <span className="text-sm text-gray-600">Loading languages...</span>
                          </div>
                        </div>
                      ) : availableLanguages.length > 0 ? (
                        <select
                          id="language"
                          value={formData.language_id}
                          onChange={(e) => setFormData({ ...formData, language_id: e.target.value })}
                          required
                          disabled
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 cursor-not-allowed opacity-60"
                        >
                          <option value="">Please set a preferred language in Settings first</option>
                          {availableLanguages.map((language) => (
                            <option key={language.language_id} value={language.language_id}>
                              {language.language_name} ({language.native_name})
                            </option>
                          ))}
                        </select>
                      ) : (
                        <div className="p-3 border border-gray-200 rounded-lg">
                          <div className="text-sm text-gray-600">
                            No languages available. Please contact support.
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Session Name */}
                <div>
                  <Label htmlFor="session_name">{config.sessionType === 'practice' ? 'Session' : 'Exam'} Name</Label>
                  <Input
                    id="session_name"
                    type="text"
                    value={formData.session_name}
                    onChange={(e) => setFormData({ ...formData, session_name: e.target.value })}
                    placeholder={`Enter ${config.sessionType} name...`}
                    required
                  />
                </div>

                {/* Level Selection */}
                <div>
                  <Label htmlFor="level">Level</Label>
                  <select
                    id="level"
                    value={formData.level}
                    onChange={(e) => setFormData({ ...formData, level: e.target.value })}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-eu-blue focus:border-transparent"
                  >
                    <option value="">Select level...</option>
                    <option value="A1">A1 - Beginner</option>
                    <option value="A2">A2 - Elementary</option>
                    <option value="B1">B1 - Intermediate</option>
                    <option value="B2">B2 - Upper Intermediate</option>
                  </select>
                </div>

                {/* Activity Type Selection (Practice only) */}
                {config.allowSingleActivity && (
                  <div>
                    <Label htmlFor="activity_type">Activity Type</Label>
                    <select
                      id="activity_type"
                      value={formData.activity_type || ''}
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        activity_type: e.target.value,
                        template_id: e.target.value ? `practice_${e.target.value}` : ''
                      })}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-eu-blue focus:border-transparent"
                    >
                      <option value="">Select activity...</option>
                      {activityOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    {formData.activity_type && (
                      <p className="text-sm text-gray-600 mt-1">
                        {activityOptions.find(opt => opt.value === formData.activity_type)?.description}
                      </p>
                    )}
                  </div>
                )}

                {/* Template Selection (Exam only) */}
                {!config.allowSingleActivity && (
                  <div>
                    <Label htmlFor="template_id">Template</Label>
                    <select
                      id="template_id"
                      value={formData.template_id}
                      onChange={(e) => setFormData({ ...formData, template_id: e.target.value })}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-eu-blue focus:border-transparent"
                    >
                      {templates.map((template) => (
                        <option key={template.template_id} value={template.template_id}>
                          {template.template_name} ({template.total_questions} questions)
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Template Breakdown Display */}
                {selectedTemplate && (
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <h4 className="font-medium text-gray-900 mb-2">Session Structure</h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      {selectedTemplate.breakdown.reading > 0 && (
                        <div className="flex items-center gap-2">
                          <span>📖</span>
                          <span>Reading: {selectedTemplate.breakdown.reading}</span>
                        </div>
                      )}
                      {selectedTemplate.breakdown.writing > 0 && (
                        <div className="flex items-center gap-2">
                          <span>✍️</span>
                          <span>Writing: {selectedTemplate.breakdown.writing}</span>
                        </div>
                      )}
                      {selectedTemplate.breakdown.grammar > 0 && (
                        <div className="flex items-center gap-2">
                          <span>📝</span>
                          <span>Grammar: {selectedTemplate.breakdown.grammar}</span>
                        </div>
                      )}
                      {selectedTemplate.breakdown.hearing > 0 && (
                        <div className="flex items-center gap-2">
                          <span>🎧</span>
                          <span>Hearing: {selectedTemplate.breakdown.hearing}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Form Actions */}
                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowCreateForm(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isCreating || shouldShowLanguageSetupPrompt || !formData.language_id || !formData.session_name || !formData.level || !formData.template_id}
                    className="bg-eu-blue hover:bg-eu-blue/90 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isCreating ? (
                      <>
                        <LoadingSpinner className="mr-2" />
                        Creating...
                      </>
                    ) : (
                      `Create ${config.sessionType === 'practice' ? 'Session' : 'Exam'}`
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};
