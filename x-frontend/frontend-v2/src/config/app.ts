/**
 * App Configuration
 * Contains all app-wide configuration constants
 */

export const appConfig = {
  // reCaptcha Configuration
  recaptcha: {
    siteKey: (import.meta as any).env?.VITE_RECAPTCHA_SITE_KEY || "",
  },
  
  // API Configuration
  api: {
    baseUrl: (import.meta as any).env?.VITE_API_URL || "/api",
  },
  
  // App Information
  app: {
    name: "One-CEFR",
    version: "2.0.0",
  },

  // Feature Flags - DEPRECATED: Use Flagsmith hooks instead
  // These are kept for backward compatibility during migration
  // @deprecated Use useFeatureFlag('hearingExams') from hooks/useFlags.ts
  features: {
    hearingExams: (import.meta as any).env?.VITE_ENABLE_HEARING_EXAMS !== "false", // Default enabled
    speakingExams: (import.meta as any).env?.VITE_ENABLE_SPEAKING_EXAMS !== "false", // Default enabled
  },
} as const;

export default appConfig;
