/**
 * CreateExamModal Component
 * 
 * Modal for creating new exams.
 * FIXED: Now shows activity breakdown for the SELECTED template, not hardcoded first template
 * FIXED: Now loads templates on level change
 * FIXED: Dynamic levels from preferredLanguage.supported_levels (100% database-driven)
 */

import React, { useState, useEffect } from 'react';
import type { SessionFormData } from '@/components/shared';
import type { LanguageInfo } from '@/services/api';
import { generateSessionName } from '@/utils/session-utils';

interface ExamTemplate {
  template_id: string;
  template_name: string;
  total_questions: number;
  breakdown: {
    reading: number;
    writing: number;
    grammar: number;
    hearing?: number;  // Optional to match API
    speaking?: number;  // Optional to match API
  };
}

interface CreateExamModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (formData: SessionFormData, skipStart?: boolean) => Promise<void>;
  isLoading: boolean;
  ongoingExamsCount: number;
  currentLevel?: string;
  preferredLanguage?: LanguageInfo;  // Full LanguageInfo instead of subset
  examTemplates: ExamTemplate[];
  onLevelChange: (level: string) => Promise<void>;
}

export const CreateExamModal: React.FC<CreateExamModalProps> = ({
  isOpen,
  onClose,
  onCreate,
  isLoading,
  ongoingExamsCount,
  currentLevel,
  preferredLanguage,
  examTemplates,
  onLevelChange
}) => {
  // Track selected template to show its breakdown
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [selectedLevel, setSelectedLevel] = useState(currentLevel || '');
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);
  const [pendingSkipStart, setPendingSkipStart] = useState<boolean | undefined>(undefined);

  // Generate robust exam name using shared utility
  const generateExamName = (): string => {
    return generateSessionName({
      languageName: preferredLanguage?.language_name,
      level: selectedLevel,
      sessionType: 'exam',
      availableLevels: preferredLanguage?.supported_levels || ['A1']
    });
  };

  // Update selected level when currentLevel prop changes
  useEffect(() => {
    if (currentLevel) {
      setSelectedLevel(currentLevel);
    }
  }, [currentLevel]);

  // Update selected template when templates load or modal opens
  useEffect(() => {
    if (isOpen && examTemplates.length > 0 && !selectedTemplateId) {
      setSelectedTemplateId(examTemplates[0].template_id);
    }
  }, [isOpen, examTemplates, selectedTemplateId]);

  const handleLevelChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newLevel = e.target.value;
    setSelectedLevel(newLevel);
    
    if (newLevel) {
      setIsLoadingTemplates(true);
      setSelectedTemplateId(''); // Reset template selection
      try {
        await onLevelChange(newLevel);
      } finally {
        setIsLoadingTemplates(false);
      }
    }
  };

  // Generate available levels from preferredLanguage.supported_levels
  const availableLevels = React.useMemo(() => {
    // Use preferredLanguage supported_levels (always available since user must have language preference)
    if (preferredLanguage?.supported_levels && preferredLanguage.supported_levels.length > 0) {
      return preferredLanguage.supported_levels;
    }
    
    // Fallback if no supported_levels (should never happen in production)
    console.warn('No supported_levels found in preferredLanguage, using default levels');
    return ['A1', 'A2', 'B1', 'B2'];
  }, [preferredLanguage]);

  // Level labels mapping
  const getLevelLabel = (level: string): string => {
    const labels: Record<string, string> = {
      'A0': 'A0 - Absolute Beginner',
      'A1': 'A1 - Beginner',
      'A2': 'A2 - Elementary',
      'B1': 'B1 - Intermediate',
      'B2': 'B2 - Upper Intermediate',
      'C1': 'C1 - Advanced',
      'C2': 'C2 - Proficient'
    };
    return labels[level] || level;
  };

  if (!isOpen) return null;

  // Find the currently selected template
  const selectedTemplate = examTemplates.find(t => t.template_id === selectedTemplateId);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    await onCreate({
      language_id: preferredLanguage?.language_id || 'de',
      session_name: formData.get('exam_name') as string,
      level: selectedLevel,
      template_id: formData.get('template_id') as string,
    }, pendingSkipStart);
    setPendingSkipStart(undefined);
  };

  const handleButtonClick = (skipStart: boolean) => {
    setPendingSkipStart(skipStart);
    // Trigger form submission
    const form = document.querySelector('form');
    if (form) {
      form.requestSubmit();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-xl max-w-md w-full shadow-2xl">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 rounded-t-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
                <span className="text-2xl">🎓</span>
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Create New Exam</h2>
                <p className="text-xs text-blue-100">CEFR Assessment</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:bg-white hover:bg-opacity-20 rounded-lg p-1 transition-colors"
              aria-label="Close modal"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Modal Content */}
        <div className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Language Display (if set) */}
            {preferredLanguage && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <div>
                    <div className="text-sm font-medium text-blue-900">
                      Language: {preferredLanguage.language_name}
                    </div>
                    <div className="text-xs text-blue-600">
                      From your profile preferences
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Exam Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Exam Name
              </label>
              <input
                type="text"
                name="exam_name"
                required
                defaultValue={generateExamName()}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                placeholder="e.g., German A1 Exam"
              />
            </div>

            {/* Level Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Level
              </label>
              <select
                name="level"
                required
                value={selectedLevel}
                onChange={handleLevelChange}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              >
                <option value="">Select your level...</option>
                {availableLevels.map((level) => (
                  <option key={level} value={level}>
                    {getLevelLabel(level)}
                  </option>
                ))}
              </select>
              {isLoadingTemplates && (
                <p className="text-xs text-blue-600 mt-1.5">
                  Loading templates for {selectedLevel}...
                </p>
              )}
            </div>

            {/* Template Selection */}
            {examTemplates.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Exam Template
                </label>
                <select
                  name="template_id"
                  required
                  value={selectedTemplateId}
                  onChange={(e) => setSelectedTemplateId(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                >
                  {examTemplates.map((template) => (
                    <option key={template.template_id} value={template.template_id}>
                      {template.template_name} ({template.total_questions} questions)
                    </option>
                  ))}
                </select>
                
                {/* Template Info - FIXED: Now shows selected template breakdown */}
                {selectedTemplate && (
                  <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                    <div className="text-xs font-medium text-blue-900 mb-2">Exam Structure:</div>
                    <div className="grid grid-cols-2 gap-2 text-xs text-blue-800">
                      {selectedTemplate.breakdown.reading > 0 && (
                        <div className="flex items-center gap-1.5">
                          <span>📖</span>
                          <span>Reading: {selectedTemplate.breakdown.reading}</span>
                        </div>
                      )}
                      {selectedTemplate.breakdown.writing > 0 && (
                        <div className="flex items-center gap-1.5">
                          <span>✍️</span>
                          <span>Writing: {selectedTemplate.breakdown.writing}</span>
                        </div>
                      )}
                      {selectedTemplate.breakdown.grammar > 0 && (
                        <div className="flex items-center gap-1.5">
                          <span>📝</span>
                          <span>Grammar: {selectedTemplate.breakdown.grammar}</span>
                        </div>
                      )}
                      {selectedTemplate.breakdown.hearing && selectedTemplate.breakdown.hearing > 0 && (
                        <div className="flex items-center gap-1.5">
                          <span>🎧</span>
                          <span>Listening: {selectedTemplate.breakdown.hearing}</span>
                        </div>
                      )}
                      {selectedTemplate.breakdown.speaking && selectedTemplate.breakdown.speaking > 0 && (
                        <div className="flex items-center gap-1.5">
                          <span>🗣️</span>
                          <span>Speaking: {selectedTemplate.breakdown.speaking}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Info Box */}
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="text-2xl flex-shrink-0">💡</div>
                <div className="text-xs text-gray-700 leading-relaxed">
                  <strong className="text-blue-900">AI-Powered Assessment:</strong> Get comprehensive feedback on your reading, writing, and grammar skills with CEFR-aligned questions.
                </div>
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex flex-col gap-2 pt-2">
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors min-h-[44px]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleButtonClick(true)}
                  disabled={isLoading || ongoingExamsCount >= 5}
                  className="flex-1 px-4 py-2.5 border-2 border-blue-600 text-blue-600 font-medium rounded-lg hover:bg-blue-50 transition-colors min-h-[44px] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? 'Creating...' : 'Create & Review'}
                </button>
              </div>
              <button
                type="button"
                onClick={() => handleButtonClick(false)}
                disabled={isLoading || ongoingExamsCount >= 5}
                className="w-full px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors shadow-sm min-h-[44px]"
              >
                {isLoading ? 'Creating...' : 'Create & Start Exam'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

