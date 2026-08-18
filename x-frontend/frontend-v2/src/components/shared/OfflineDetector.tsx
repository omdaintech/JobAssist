import React, { useEffect, useState } from 'react';
import { WifiOff } from 'lucide-react';

export const OfflineDetector: React.FC = () => {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [showMessage, setShowMessage] = useState(false);

  useEffect(() => {
    const handleOffline = () => {
      setIsOffline(true);
      setShowMessage(true);
    };

    const handleOnline = () => {
      setIsOffline(false);
      // Keep showing message briefly when coming back online
      setTimeout(() => setShowMessage(false), 2000);
    };

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);

    // Check initial state
    if (!navigator.onLine) {
      setIsOffline(true);
      setShowMessage(true);
    }

    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  if (!showMessage) return null;

  return (
    <div className="fixed top-20 left-4 right-4 z-[60] md:left-auto md:right-4 md:max-w-md">
      <div 
        className={`rounded-lg shadow-2xl p-4 transition-all duration-300 ${
          isOffline 
            ? 'bg-orange-50 border-2 border-orange-300' 
            : 'bg-green-50 border-2 border-green-300'
        }`}
      >
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-lg ${isOffline ? 'bg-orange-100' : 'bg-green-100'}`}>
            {isOffline ? (
              <WifiOff className="w-5 h-5 text-orange-600" />
            ) : (
              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            )}
          </div>
          
          <div className="flex-1">
            <h3 className={`font-semibold text-sm mb-1 ${isOffline ? 'text-orange-900' : 'text-green-900'}`}>
              {isOffline ? 'Oops! No Internet' : 'Back Online!'}
            </h3>
            <p className={`text-sm ${isOffline ? 'text-orange-700' : 'text-green-700'}`}>
              {isOffline 
                ? 'Hey, looks like you\'re offline. Check your internet connection to keep practicing!' 
                : 'Great! You\'re back online. Ready to continue?'
              }
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

