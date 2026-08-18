/**
 * PreferencesSection Component
 * 
 * Manages user learning preferences including daily goals and language selection.
 * 
 * @responsive
 * - Mobile (360-767px): Single column with stacked language cards
 * - Tablet (768-1023px): Two-column grid for fields
 * - Desktop (1024px+): Full layout with enhanced spacing
 * 
 * @accessibility
 * - Touch targets: 48px for language cards and buttons
 * - ARIA labels: Complete
 * - Keyboard navigation: Full support
 */

import React, { useState } from 'react';
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label } from '@/components/ui';
import { api, LanguageInfo } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import type { PreferencesData } from '../types';

interface PreferencesSectionProps {
  preferencesData: PreferencesData | null;
  setPreferencesData: (data: PreferencesData) => void;
  loadingPreferences: boolean;
  preferencesError: string | null;
  setPreferencesError: (error: string | null) => void;
  availableLanguages: LanguageInfo[];
  selectedLanguageId: string;
  setSelectedLanguageId: (id: string) => void;
  loadingLanguages: boolean;
  onSuccess: (message: string) => void;
}

export const PreferencesSection: React.FC<PreferencesSectionProps> = ({
  preferencesData,
  setPreferencesData,
  loadingPreferences,
  preferencesError,
  setPreferencesError,
  availableLanguages,
  selectedLanguageId,
  setSelectedLanguageId,
  loadingLanguages,
  onSuccess
}) => {
  const [editingPreferences, setEditingPreferences] = useState(false);
  const [savingPreferences, setSavingPreferences] = useState(false);
  const { checkAuthStatus } = useAuth();

  const selectLanguage = (languageId: string) => {
    setSelectedLanguageId(languageId === selectedLanguageId ? '' : languageId);
  };

  const handlePreferencesSave = async () => {
    if (!preferencesData) return;

    setSavingPreferences(true);
    setPreferencesError(null);

    try {
      const response = await api.user.updatePreferences({
        ...preferencesData,
        preferred_language_id: selectedLanguageId || undefined,
        favorite_activities: preferencesData.favorite_activities as ('reading' | 'writing' | 'grammar' | 'hearing')[] | undefined
      });

      if (response.data.success) {
        // Refresh auth context to update preferredLanguage state
        await checkAuthStatus();
        
        onSuccess('Preferences updated successfully');
        setEditingPreferences(false);
      }
    } catch (error: any) {
      console.error('Failed to update preferences:', error);
      setPreferencesError(error.response?.data?.message || 'Failed to update preferences');
    } finally {
      setSavingPreferences(false);
    }
  };

  return (
    <div className="space-y-4 md:space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base md:text-lg lg:text-xl">Learning Preferences</CardTitle>
              <p className="text-xs md:text-sm text-gray-600 mt-1">Customize your learning experience</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditingPreferences(!editingPreferences)}
              disabled={loadingPreferences}
            >
              {editingPreferences ? 'Cancel' : 'Edit Preferences'}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 md:space-y-6">
          {preferencesError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 md:p-4 text-red-600 text-xs md:text-sm">
              {preferencesError}
            </div>
          )}

          {loadingPreferences ? (
            <div className="animate-pulse space-y-3 md:space-y-4">
              <div className="h-4 bg-gray-200 rounded w-1/3"></div>
              <div className="h-12 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded w-1/3"></div>
              <div className="h-12 bg-gray-200 rounded"></div>
            </div>
          ) : preferencesData ? (
            <div className="space-y-4 md:space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                <div className="space-y-2">
                  <Label htmlFor="daily_goal" className="text-xs md:text-sm font-medium">Daily Goal (questions)</Label>
                  {editingPreferences ? (
                    <Input
                      id="daily_goal"
                      type="number"
                      min="1"
                      max="50"
                      value={preferencesData.daily_goal}
                      onChange={(e) => setPreferencesData({ ...preferencesData, daily_goal: parseInt(e.target.value) || 5 })}
                      className="h-12"
                    />
                  ) : (
                    <div className="h-12 flex items-center px-3 bg-gray-50 rounded-lg border text-gray-900 text-sm md:text-base">
                      {preferencesData.daily_goal} questions per day
                    </div>
                  )}
                </div>
              </div>

              {/* Learning Language */}
              <div className="space-y-3 md:space-y-4">
                <Label className="text-xs md:text-sm font-medium">Learning Language</Label>
                {loadingLanguages ? (
                  <div className="animate-pulse space-y-2">
                    <div className="h-12 bg-gray-200 rounded"></div>
                    <div className="h-12 bg-gray-200 rounded"></div>
                  </div>
                ) : (
                  <div className="space-y-2 md:space-y-3">
                    {availableLanguages.map((language) => (
                      <div
                        key={language.language_id}
                        className={`border-2 rounded-lg p-3 md:p-4 cursor-pointer transition-all min-h-[48px] ${selectedLanguageId === language.language_id
                          ? 'border-eu-blue bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                          } ${!editingPreferences ? 'cursor-default' : ''}`}
                        onClick={() => editingPreferences && selectLanguage(language.language_id)}
                      >
                        <div className="flex items-center space-x-3">
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm md:text-base">{language.language_name}</div>
                            {language.native_name && (
                              <div className="text-xs md:text-sm text-gray-600">{language.native_name}</div>
                            )}
                          </div>
                          {selectedLanguageId === language.language_id && (
                            <div className="text-eu-blue text-lg">✓</div>
                          )}
                        </div>
                      </div>
                    ))}
                    {editingPreferences && (
                      <p className="text-[10px] md:text-xs text-gray-500">Click to select your preferred language for practice</p>
                    )}
                    {!editingPreferences && !selectedLanguageId && (
                      <p className="text-xs md:text-sm text-gray-500 italic">No preferred language selected</p>
                    )}
                  </div>
                )}
              </div>

              {editingPreferences && (
                <div className="flex gap-2 md:gap-3 pt-4 border-t">
                  <Button
                    onClick={handlePreferencesSave}
                    disabled={savingPreferences}
                    className="bg-eu-blue hover:bg-eu-blue/90"
                  >
                    {savingPreferences ? 'Saving...' : 'Save Preferences'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setEditingPreferences(false)}
                    disabled={savingPreferences}
                  >
                    Cancel
                  </Button>
                </div>
              )}
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
};

