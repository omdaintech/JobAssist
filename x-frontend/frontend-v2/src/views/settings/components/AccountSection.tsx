/**
 * AccountSection Component
 * 
 * Displays and allows editing of user profile information and account statistics.
 * 
 * @responsive
 * - Mobile (360-767px): Single column layout with stacked fields
 * - Tablet (768-1023px): Two-column grid for form fields
 * - Desktop (1024px+): Full two-column layout with enhanced spacing
 * 
 * @accessibility
 * - Touch targets: 48px (h-12 inputs)
 * - ARIA labels: Complete via Label components
 * - Keyboard navigation: Full support
 */

import React, { useState } from 'react';
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { api, LanguageInfo } from '@/services/api';
import type { ProfileData } from '../types';

interface AccountSectionProps {
  profileData: ProfileData | null;
  setProfileData: (data: ProfileData) => void;
  loadingProfile: boolean;
  profileError: string | null;
  setProfileError: (error: string | null) => void;
  onSuccess: (message: string) => void;
  availableLanguages: LanguageInfo[];
  selectedLanguageId: string;
  setSelectedLanguageId: (id: string) => void;
  loadingLanguages: boolean;
}

export const AccountSection: React.FC<AccountSectionProps> = ({
  profileData,
  setProfileData,
  loadingProfile,
  profileError,
  setProfileError,
  onSuccess,
  availableLanguages,
  selectedLanguageId,
  setSelectedLanguageId,
  loadingLanguages
}) => {
  const { usageInfo, checkAuthStatus } = useAuth();
  const [editingProfile, setEditingProfile] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);

  const selectLanguage = (languageId: string) => {
    setSelectedLanguageId(languageId === selectedLanguageId ? '' : languageId);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Unknown';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Unknown';
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const handleProfileSave = async () => {
    if (!profileData) return;

    setSavingProfile(true);
    setProfileError(null);

    try {
      // Update profile
      const profileResponse = await api.user.updateProfile({
        name: profileData.name,
        current_level: profileData.current_level as 'A1' | 'A2' | 'B1'
      });

      // Update language preference with hardcoded daily_goal
      const preferencesResponse = await api.user.updatePreferences({
        preferred_language_id: selectedLanguageId || undefined,
        daily_goal: 5 // Hardcoded value as it's not very useful
      });

      if (profileResponse.data.success && preferencesResponse.data.success) {
        // Refresh auth context to update user state (especially currentLevel and preferredLanguage)
        await checkAuthStatus();
        
        onSuccess('Profile updated successfully');
        setEditingProfile(false);
      }
    } catch (error: any) {
      console.error('Failed to update profile:', error);
      setProfileError(error.response?.data?.message || 'Failed to update profile');
    } finally {
      setSavingProfile(false);
    }
  };

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Profile Information */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base md:text-lg lg:text-xl">Profile Information</CardTitle>
              <p className="text-xs md:text-sm text-gray-600 mt-1">Manage your account details and preferences</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditingProfile(!editingProfile)}
              disabled={loadingProfile}
            >
              {editingProfile ? 'Cancel' : 'Edit Profile'}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 md:space-y-6">
          {profileError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 md:p-4 text-red-600 text-xs md:text-sm">
              {profileError}
            </div>
          )}

          {loadingProfile ? (
            <div className="animate-pulse space-y-3 md:space-y-4">
              <div className="h-4 bg-gray-200 rounded w-1/4"></div>
              <div className="h-12 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded w-1/4"></div>
              <div className="h-12 bg-gray-200 rounded"></div>
            </div>
          ) : profileData ? (
            <div className="space-y-4 md:space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-xs md:text-sm font-medium">Display Name</Label>
                  {editingProfile ? (
                    <Input
                      id="name"
                      value={profileData.name}
                      onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                      placeholder="Enter your name"
                      className="h-12"
                    />
                  ) : (
                    <div className="h-12 flex items-center px-3 bg-gray-50 rounded-lg border text-gray-900 text-sm md:text-base">
                      {profileData.name}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="text-xs md:text-sm font-medium">Email Address</Label>
                  <div className="h-12 flex items-center px-3 bg-gray-50 rounded-lg border text-gray-600 text-sm md:text-base">
                    {profileData.email}
                  </div>
                  <p className="text-[10px] md:text-xs text-gray-500">Email cannot be changed for security reasons</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="current_level" className="text-xs md:text-sm font-medium">Current Level</Label>
                  {editingProfile ? (
                    <select
                      id="current_level"
                      value={profileData.current_level}
                      onChange={(e) => setProfileData({ ...profileData, current_level: e.target.value })}
                      className="h-12 w-full px-3 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-eu-blue focus:border-transparent text-sm md:text-base"
                    >
                      {/* TODO: Replace with dynamic levels from selected language's supported_levels */}
                      <option value="A0">A0 - Absolute Beginner</option>
                      <option value="A1">A1 - Beginner</option>
                      <option value="A2">A2 - Elementary</option>
                      <option value="B1">B1 - Intermediate</option>
                      <option value="B2">B2 - Upper Intermediate</option>
                      <option value="C1">C1 - Advanced</option>
                      <option value="C2">C2 - Proficient</option>
                    </select>
                  ) : (
                    <div className="h-12 flex items-center px-3 bg-gray-50 rounded-lg border text-gray-900 text-sm md:text-base">
                      {profileData.current_level || 'Not set'}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="text-xs md:text-sm font-medium">Member Since</Label>
                  <div className="h-12 flex items-center px-3 bg-gray-50 rounded-lg border text-gray-600 text-sm md:text-base">
                    {formatDate(profileData.member_since)}
                  </div>
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
                          } ${!editingProfile ? 'cursor-default' : ''}`}
                        onClick={() => editingProfile && selectLanguage(language.language_id)}
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
                    {editingProfile && (
                      <p className="text-[10px] md:text-xs text-gray-500">Click to select your preferred language for practice</p>
                    )}
                    {!editingProfile && !selectedLanguageId && (
                      <p className="text-xs md:text-sm text-gray-500 italic">No preferred language selected</p>
                    )}
                  </div>
                )}
              </div>

              {editingProfile && (
                <div className="flex gap-2 md:gap-3 pt-4 border-t">
                  <Button
                    onClick={handleProfileSave}
                    disabled={savingProfile}
                    className="bg-eu-blue hover:bg-eu-blue/90"
                  >
                    {savingProfile ? 'Saving...' : 'Save Changes'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setEditingProfile(false)}
                    disabled={savingProfile}
                  >
                    Cancel
                  </Button>
                </div>
              )}
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* Usage Summary */}
      {usageInfo && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base md:text-lg lg:text-xl">Usage Summary</CardTitle>
            <p className="text-xs md:text-sm text-gray-600">Overview of your consumption for the current period.</p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-3 md:gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs md:text-sm text-gray-500">Credits consumed</p>
                <p className="mt-2 text-xl md:text-2xl font-semibold text-gray-900">{usageInfo.used_count || 0}</p>
              </div>
              <div>
                <p className="text-xs md:text-sm text-gray-500">Plan type</p>
                <p className="mt-2 text-xl md:text-2xl font-semibold text-gray-900">{usageInfo.plan_type || 'Usage-based'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

