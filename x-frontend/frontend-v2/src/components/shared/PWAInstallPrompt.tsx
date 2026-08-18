import React, { useState, useEffect } from 'react';
import { X, Download, Share, Plus } from 'lucide-react';
import { usePWAInstall } from '@/hooks/usePWA';

export const PWAInstallPrompt: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, isSafari, promptInstall, canPrompt } = usePWAInstall();
  const [isDismissed, setIsDismissed] = useState(false);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    // Get dismissal history from localStorage
    const dismissalHistory = localStorage.getItem('pwa-dismissal-history');
    const dismissalCount = dismissalHistory ? JSON.parse(dismissalHistory).count : 0;
    const lastDismissedTime = dismissalHistory ? JSON.parse(dismissalHistory).lastTime : 0;
    const now = Date.now();

    // Smart timing based on dismissal count
    const getWaitTime = (count: number) => {
      if (count === 0) return 0; // First time - show after 3 seconds
      if (count === 1) return 2 * 24 * 60 * 60 * 1000;  // 2 days
      if (count === 2) return 7 * 24 * 60 * 60 * 1000;  // 7 days
      return 30 * 24 * 60 * 60 * 1000; // 30 days for persistent dismissers
    };

    const waitTime = getWaitTime(dismissalCount);

    // Show prompt if enough time has passed
    if (now - lastDismissedTime > waitTime) {
      // Wait 3 seconds before showing the banner
      const timer = setTimeout(() => {
        setShowBanner(true);
      }, 3000);

      return () => clearTimeout(timer);
    } else {
      setIsDismissed(true);
    }
  }, []);

  const handleDismiss = () => {
    setIsDismissed(true);
    setShowBanner(false);
    
    // Update dismissal history
    const dismissalHistory = localStorage.getItem('pwa-dismissal-history');
    const currentCount = dismissalHistory ? JSON.parse(dismissalHistory).count : 0;
    
    localStorage.setItem('pwa-dismissal-history', JSON.stringify({
      count: currentCount + 1,
      lastTime: Date.now()
    }));
  };

  const handleInstall = async () => {
    const installed = await promptInstall();
    if (installed) {
      // Clear dismissal history on successful install
      localStorage.removeItem('pwa-dismissal-history');
      handleDismiss();
    }
  };

  // Don't show if already installed or dismissed
  if (isInstalled || isDismissed || !showBanner) {
    return null;
  }

  // Show iOS-specific instructions
  if (isIOS && isSafari) {
    return (
      <div className="fixed bottom-20 left-4 right-4 z-50 md:bottom-4 md:left-auto md:right-4 md:max-w-sm">
        <div className="bg-white rounded-lg shadow-2xl border-2 border-eu-blue p-4 animate-slide-up">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <Download className="w-5 h-5 text-eu-blue" />
              <h3 className="font-semibold text-gray-900">Install Lingali</h3>
            </div>
            <button
              onClick={handleDismiss}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Dismiss"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <p className="text-sm text-gray-600 mb-4">
            Get the full app experience! Install Lingali on your device.
          </p>
          
          <div className="bg-blue-50 rounded-lg p-3 mb-3">
            <p className="text-sm font-medium text-gray-900 mb-2">How to install:</p>
            <ol className="text-sm text-gray-700 space-y-1">
              <li className="flex items-start gap-2">
                <span className="font-semibold">1.</span>
                <span>Tap the <Share className="inline w-4 h-4 mx-1" /> Share button below</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-semibold">2.</span>
                <span>Scroll down and tap "Add to Home Screen" <Plus className="inline w-4 h-4 mx-1" /></span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-semibold">3.</span>
                <span>Tap "Add" to confirm</span>
              </li>
            </ol>
          </div>
          
          <button
            onClick={handleDismiss}
            className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-medium transition-colors text-sm"
          >
            Got it!
          </button>
        </div>
      </div>
    );
  }

  // Show Android/Desktop prompt with install button
  if (isInstallable && canPrompt) {
    return (
      <div className="fixed bottom-20 left-4 right-4 z-50 md:bottom-4 md:left-auto md:right-4 md:max-w-sm">
        <div className="bg-white rounded-lg shadow-2xl border-2 border-eu-blue p-4 animate-slide-up">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <Download className="w-5 h-5 text-eu-blue" />
              <h3 className="font-semibold text-gray-900">Install Lingali</h3>
            </div>
            <button
              onClick={handleDismiss}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Dismiss"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <p className="text-sm text-gray-600 mb-4">
            Hey! Want faster access? Install Lingali and launch it with one tap!
          </p>
          
          <div className="flex gap-2">
            <button
              onClick={handleInstall}
              className="flex-1 bg-eu-blue hover:bg-eu-blue/90 text-white px-4 py-2 rounded-lg font-medium transition-colors text-sm flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" />
              Install App
            </button>
            <button
              onClick={handleDismiss}
              className="px-4 py-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors text-sm font-medium"
            >
              Not now
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
};
