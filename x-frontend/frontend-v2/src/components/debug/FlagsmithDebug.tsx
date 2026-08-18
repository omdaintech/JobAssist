/**
 * Debug Component for Flagsmith
 * Shows current flag status - Remove in production
 */

import { useFeatureFlag } from '@/hooks/useFlags';
import { useFlagsmith } from 'flagsmith/react';

export function FlagsmithDebug() {
  const nopayment = useFeatureFlag('nopayment');
  
  let flagsmithStatus = 'Not Available';
  let allFlags: any = {};
  
  try {
    const { flagsmith, isLoading, error } = useFlagsmith();
    
    if (error) {
      flagsmithStatus = `Error: ${error}`;
    } else if (isLoading) {
      flagsmithStatus = 'Loading...';
    } else if (flagsmith) {
      flagsmithStatus = 'Loaded';
      allFlags = flagsmith.getAllFlags();
    }
  } catch (e) {
    flagsmithStatus = 'Context not available';
  }

  return (
    <div className="fixed bottom-4 right-4 bg-gray-900 text-white p-4 rounded-lg shadow-lg text-xs max-w-md z-50">
      <h3 className="font-bold mb-2">🚩 Flagsmith Debug</h3>
      <div className="space-y-1">
        <div><strong>Status:</strong> {flagsmithStatus}</div>
        <div><strong>nopayment flag:</strong> {nopayment ? '✅ true' : '❌ false'}</div>
        <div className="mt-2 p-2 bg-gray-800 rounded overflow-auto max-h-40">
          <strong>All Flags:</strong>
          <pre className="text-xs">{JSON.stringify(allFlags, null, 2)}</pre>
        </div>
      </div>
    </div>
  );
}
