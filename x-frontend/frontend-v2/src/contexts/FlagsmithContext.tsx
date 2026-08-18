/**
 * Flagsmith Provider Context
 * Wrapper around Flagsmith React SDK with error handling and fallbacks
 */

import { ReactNode } from "react";
import { FlagsmithProvider as BaseFlagsmithProvider } from "flagsmith/react";
import flagsmith from "flagsmith";
import flagsmithConfig from "../config/flagsmith";

interface FlagsmithProviderProps {
  children: ReactNode;
}

/**
 * Flagsmith Provider Component
 * Initializes Flagsmith and provides feature flags to the app
 */
export function FlagsmithProvider({ children }: FlagsmithProviderProps) {
  // If no environment ID is provided, render children without Flagsmith
  if (!flagsmithConfig.environmentId) {
    console.warn("Flagsmith environment ID not configured. Using default flags.");
    return <>{children}</>;
  }

  return (
    <BaseFlagsmithProvider
      flagsmith={flagsmith}
      options={{
        environmentID: flagsmithConfig.environmentId,
      }}
    >
      {children}
    </BaseFlagsmithProvider>
  );
}
