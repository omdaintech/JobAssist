/**
 * Flagsmith Configuration
 * Feature flag management configuration
 */

// Environment IDs
const FLAGSMITH_ENVS = {
  production: 'YOUR_FLAGSMITH_PROD_ID',
  development: 'YOUR_FLAGSMITH_DEV_ID',
} as const;

// Determine environment based on VITE_MODE or default to development
const isProduction = (import.meta as any).env?.MODE === 'production' || 
                     (import.meta as any).env?.VITE_MODE === 'production';

// Select environment ID (allow override via env variable)
const environmentId = (import.meta as any).env?.VITE_FLAGSMITH_ENVIRONMENT_ID || 
                      (isProduction ? FLAGSMITH_ENVS.production : FLAGSMITH_ENVS.development);

export const flagsmithConfig = {
  // Environment ID - automatically selects based on build mode
  environmentId,
  
  // Optional: Flagsmith API URL (defaults to Flagsmith cloud)
  api: (import.meta as any).env?.VITE_FLAGSMITH_API_URL || "https://edge.api.flagsmith.com/api/v1/",
  
  // Enable client-side evaluation for faster flag checks
  enableClientSideEvaluation: true,
  
  // Enable analytics (optional)
  enableAnalytics: false,
  
  // Cache flags for better performance
  cacheFlags: true,
  
  // Default flag values (fallbacks if Flagsmith is not available)
  defaultFlags: {
    hearingExams: true,
    nopayment: false, // When true, hides PayPal and shows beta user email flow
    downtime: false, // When true, shows maintenance page instead of app
    // Add more default flags here
  },
} as const;

export default flagsmithConfig;
