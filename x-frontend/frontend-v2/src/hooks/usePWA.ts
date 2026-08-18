import { useEffect, useState } from 'react';

// PWA registration types
declare module 'virtual:pwa-register' {
  export function registerSW(options?: {
    onNeedRefresh?: () => void;
    onOfflineReady?: () => void;
  }): (reloadPage?: boolean) => Promise<void>;
}

// BeforeInstallPromptEvent interface
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

// Extend Window interface
declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
  }
}

export const PWAUpdater = () => {
  useEffect(() => {
    // Only register PWA in production builds
    if (import.meta.env.PROD) {
      import('virtual:pwa-register').then(({ registerSW }) => {
        const updateSW = registerSW({
          onNeedRefresh() {
            // Show a notification to the user that an update is available
            if (confirm('New content available, reload?')) {
              updateSW(true);
            }
          },
          onOfflineReady() {
            // Optional: Show offline ready notification
          },
        });
      }).catch(() => {
        // PWA not available in dev mode
      });
    }
  }, []);

  return null;
};

// Hook for PWA install prompt
export const usePWAInstall = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if already installed (standalone mode)
    const checkIfInstalled = () => {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
      const isIOSStandalone = (window.navigator as any).standalone === true;
      setIsInstalled(isStandalone || isIOSStandalone);
    };

    checkIfInstalled();

    // Capture the beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: BeforeInstallPromptEvent) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    // Listen for successful installation
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const promptInstall = async () => {
    if (!deferredPrompt) {
      return false;
    }

    // Show the install prompt
    deferredPrompt.prompt();

    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;

    // Clear the deferred prompt
    setDeferredPrompt(null);
    setIsInstallable(false);

    return outcome === 'accepted';
  };

  // Detect iOS
  const isIOS = () => {
    const userAgent = window.navigator.userAgent.toLowerCase();
    return /iphone|ipad|ipod/.test(userAgent);
  };

  // Detect if running in Safari
  const isSafari = () => {
    const userAgent = window.navigator.userAgent.toLowerCase();
    return /safari/.test(userAgent) && !/chrome/.test(userAgent);
  };

  return {
    isInstallable,
    isInstalled,
    isIOS: isIOS(),
    isSafari: isSafari(),
    promptInstall,
    canPrompt: !!deferredPrompt,
  };
};

// Hook for full-screen functionality
export const useFullscreen = () => {
  const enterFullscreen = async () => {
    try {
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
      }
    } catch (error) {
      console.warn('Fullscreen not supported or failed:', error);
    }
  };

  const exitFullscreen = async () => {
    try {
      if (document.fullscreenElement && document.exitFullscreen) {
        await document.exitFullscreen();
      }
    } catch (error) {
      console.warn('Exit fullscreen failed:', error);
    }
  };

  const isFullscreen = () => {
    return !!document.fullscreenElement;
  };

  return {
    enterFullscreen,
    exitFullscreen,
    isFullscreen
  };
};
