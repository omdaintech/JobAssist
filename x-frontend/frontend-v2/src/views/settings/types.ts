/**
 * Settings View Type Definitions
 * 
 * Centralized type definitions for all settings-related components
 */

import type { LanguageInfo } from '@/services/api';

export interface ProfileData {
  name: string;
  email: string;
  current_level: string;
  member_since: string;
  last_login?: string;
  total_sessions: number;
  current_streak: number;
}

export interface PreferencesData {
  favorite_activities?: string[];
  daily_goal: number;
  preferred_language_id?: string;
  preferred_languages_info?: LanguageInfo[];
}

export interface PasswordData {
  current_password: string;
  new_password: string;
  confirm_password: string;
}

export type SettingsSection = 'account' | 'security' | 'school';

export interface SettingsSectionProps {
  onError?: (message: string) => void;
  onSuccess?: (message: string) => void;
}

