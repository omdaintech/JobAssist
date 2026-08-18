/**
 * Custom Hooks for Feature Flags
 * Easy-to-use hooks for accessing Flagsmith feature flags
 */

import { useFlags as useFlagsmithFlags } from "flagsmith/react";
import flagsmithConfig from "../config/flagsmith";

/**
 * Hook to check if a feature flag is enabled
 * Falls back to default values if Flagsmith is not configured
 * 
 * @param flagName - The name of the feature flag
 * @returns boolean indicating if the feature is enabled
 * 
 * @example
 * const isEnabled = useFeatureFlag('hearingExams');
 * if (isEnabled) {
 *   // Show hearing exam feature
 * }
 */
export function useFeatureFlag(flagName: string): boolean {
  // Always try to get the default first
  const defaultValue = (flagsmithConfig.defaultFlags as any)[flagName];
  const fallbackValue = defaultValue !== undefined ? defaultValue : false;

  // Check if Flagsmith is configured
  if (!flagsmithConfig.environmentId) {
    return fallbackValue;
  }

  // Try to use Flagsmith with the correct API
  try {
    const flags = useFlagsmithFlags([flagName]);
    
    // Check if flag exists and is enabled
    if (flags && flags[flagName]) {
      return flags[flagName].enabled;
    }
    
    // Fallback
    return fallbackValue;
  } catch (error) {
    console.error(`Error accessing Flagsmith for '${flagName}':`, error);
    return fallbackValue;
  }
}

/**
 * Hook to get a feature flag value (for flags with values)
 * Falls back to default values if Flagsmith is not configured
 * 
 * @param flagName - The name of the feature flag
 * @param defaultValue - Default value if flag is not found
 * @returns The flag value
 * 
 * @example
 * const maxAttempts = useFlagValue('maxExamAttempts', 3);
 */
export function useFlagValue<T = string>(
  flagName: string,
  defaultValue: T
): T {
  // Check if Flagsmith is configured
  if (!flagsmithConfig.environmentId) {
    return defaultValue;
  }

  try {
    const flags = useFlagsmithFlags([flagName]);
    
    if (flags && flags[flagName]) {
      const value = flags[flagName].value;
      return value !== null && value !== undefined ? (value as T) : defaultValue;
    }
    
    return defaultValue;
  } catch (error) {
    console.error(`Error getting flag value '${flagName}':`, error);
    return defaultValue;
  }
}

/**
 * Hook to get all feature flags
 * Returns an object with all flags and their states
 * 
 * @example
 * const flags = useAllFlags();
 */
export function useAllFlags() {
  // If Flagsmith is not initialized, use defaults
  if (!flagsmithConfig.environmentId) {
    return flagsmithConfig.defaultFlags;
  }

  try {
    const flags = useFlagsmithFlags([]);
    return flags || flagsmithConfig.defaultFlags;
  } catch (error) {
    return flagsmithConfig.defaultFlags;
  }
}

/**
 * Typed hook for commonly used feature flags
 * Provides type-safe access to known feature flags
 */
export function useAppFeatureFlags() {
  return {
    hearingExams: useFeatureFlag("hearingExams"),
    nopayment: useFeatureFlag("nopayment"),
    downtime: useFeatureFlag("downtime"),
    // Add more typed flags here as needed
  };
}
