/**
 * useSettingsData Hook
 * 
 * Centralized data fetching and state management for settings page.
 * Encapsulates all API calls and loading states.
 */

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/services/api';
import type { ProfileData, PreferencesData, LanguageInfo } from '../types';

export const useSettingsData = () => {
  const { user, preferredLanguage, currentLevel } = useAuth();

  // Profile state
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  // Preferences state
  const [preferencesData, setPreferencesData] = useState<PreferencesData | null>(null);
  const [loadingPreferences, setLoadingPreferences] = useState(false);
  const [preferencesError, setPreferencesError] = useState<string | null>(null);

  // Language state
  const [availableLanguages, setAvailableLanguages] = useState<LanguageInfo[]>([]);
  const [selectedLanguageId, setSelectedLanguageId] = useState<string>('');
  const [loadingLanguages, setLoadingLanguages] = useState(false);

  // Load profile data
  const loadProfile = async () => {
    setLoadingProfile(true);
    setProfileError(null);
    try {
      const response = await api.user.profile();
      if (response.data.success) {
        const userData = (response.data as any).user_info || response.data;
        const fullResponse = response.data as any;
        
        setProfileData({
          ...userData,
          current_level: fullResponse.current_level || userData.current_level || 'A1',
          member_since: userData.created_at || userData.member_since,
          total_sessions: userData.total_sessions || 0,
          current_streak: userData.current_streak || 0
        });
      }
    } catch (error: any) {
      console.error('Failed to load profile:', error);
      setProfileError('Failed to load profile data');
    } finally {
      setLoadingProfile(false);
    }
  };

  // Load available languages
  const loadAvailableLanguages = async () => {
    setLoadingLanguages(true);
    try {
      const response = await api.languages.getAvailable();
      if (response.data.success && response.data.languages) {
        const languages = response.data.languages.map((lang: any) => ({
          language_id: lang.language_id,
          language_name: lang.language_name,
          native_name: lang.native_name
        }));
        setAvailableLanguages(languages);
      }
    } catch (error: any) {
      console.error('Failed to load languages:', error);
    } finally {
      setLoadingLanguages(false);
    }
  };

  // Load preferences
  const loadPreferences = async () => {
    setLoadingPreferences(true);
    setPreferencesError(null);
    try {
      const response = await api.user.preferences();
      if (response.data.success) {
        const prefs = response.data.preferences;
        setPreferencesData({
          preferred_language_id: prefs.preferred_language_id || '',
          daily_goal: prefs.daily_goal || 10,
          favorite_activities: prefs.favorite_activities || []
        });
        setSelectedLanguageId(prefs.preferred_language_id || '');
      }
    } catch (error: any) {
      console.error('Failed to load preferences:', error);
      setPreferencesError('Failed to load preferences data');
    } finally {
      setLoadingPreferences(false);
    }
  };

  // Initialize preferences from AuthContext with fallback to API
  useEffect(() => {
    if (preferredLanguage && currentLevel) {
      setPreferencesData({
        preferred_language_id: preferredLanguage.language_id,
        daily_goal: 10,
        favorite_activities: []
      });
      setSelectedLanguageId(preferredLanguage.language_id);
    } else if (user) {
      loadPreferences();
    }
  }, [preferredLanguage, currentLevel, user]);

  // Load data on mount
  useEffect(() => {
    if (user) {
      loadProfile();
      loadAvailableLanguages();
    }
  }, [user]);

  return {
    // Profile
    profileData,
    setProfileData,
    loadingProfile,
    profileError,
    setProfileError,
    loadProfile,

    // Preferences
    preferencesData,
    setPreferencesData,
    loadingPreferences,
    preferencesError,
    setPreferencesError,
    loadPreferences,

    // Languages
    availableLanguages,
    selectedLanguageId,
    setSelectedLanguageId,
    loadingLanguages
  };
};

