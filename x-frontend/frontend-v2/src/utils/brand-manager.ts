/**
 * Brand Theme Manager
 * Dynamically loads brand-specific CSS based on school_id
 */

interface BrandConfig {
  logoText: string;
  logoUrl?: string;
  logoAvatarText: string;
  primaryColor: string;
  primaryForeground: string;
  primaryHover: string;
  fontFamily: string;
  fontWeights: {
    normal: number;
    medium: number;
    bold: number;
  };
}

class BrandManager {
  private currentBrandId: string | null = null;
  private loadedStyleElement: HTMLStyleElement | null = null;

  /**
   * Load brand theme based on school_id
   */
  async loadBrandTheme(schoolId: string, forceReload: boolean = false): Promise<void> {
    // Skip reload if same brand is already loaded and no force reload
    if (!forceReload && this.currentBrandId === schoolId) {
      return;
    }

    try {
      // Always remove existing brand styles first for clean slate
      this.removeBrandStyles();

      // Try to load company-specific CSS first
      let brandCssContent = '';
      try {
        const response = await fetch(`/src/styles/brandstyles/${schoolId}.css`);
        if (response.ok) {
          brandCssContent = await response.text();
        } else {
          throw new Error('Company CSS not found');
        }
      } catch (error) {
        // Fallback to default brand
        const defaultResponse = await fetch('/src/styles/brandstyles/default.css');
        brandCssContent = await defaultResponse.text();
      }

      // Load common brand overrides
      let overridesCssContent = '';
      try {
        const overridesResponse = await fetch('/src/styles/brandstyles/brand-overrides.css');
        overridesCssContent = await overridesResponse.text();
      } catch (error) {
        console.warn('Failed to load brand overrides:', error);
      }

      // Inject brand CSS first, then overrides
      this.injectBrandStyles(brandCssContent + '\n' + overridesCssContent);
      this.currentBrandId = schoolId;
      
      // Force a repaint to ensure styles are applied immediately
      document.body.offsetHeight; // Trigger reflow

    } catch (error) {
      console.error('Failed to load brand theme:', error);
      // Load default as ultimate fallback
      this.loadDefaultTheme();
    }
  }

  /**
   * Load default brand theme
   */
  async loadDefaultTheme(): Promise<void> {
    try {
      this.removeBrandStyles();
      
      // Load default brand CSS
      const defaultResponse = await fetch('/src/styles/brandstyles/default.css');
      const defaultCssContent = await defaultResponse.text();
      
      // Load common brand overrides
      let overridesCssContent = '';
      try {
        const overridesResponse = await fetch('/src/styles/brandstyles/brand-overrides.css');
        overridesCssContent = await overridesResponse.text();
      } catch (error) {
        console.warn('Failed to load brand overrides:', error);
      }
      
      // Inject both CSS files
      this.injectBrandStyles(defaultCssContent + '\n' + overridesCssContent);
      this.currentBrandId = 'default';
      
      // Force a repaint to ensure styles are applied immediately
      document.body.offsetHeight; // Trigger reflow
    } catch (error) {
      console.error('Failed to load default brand theme:', error);
    }
  }

  /**
   * Remove current brand styles
   */
  removeBrandStyles(): void {
    // Remove the tracked style element
    if (this.loadedStyleElement) {
      this.loadedStyleElement.remove();
      this.loadedStyleElement = null;
    }
    
    // Also remove any orphaned brand style elements
    const brandStyles = document.querySelectorAll('style[data-brand-styles="true"]');
    brandStyles.forEach(style => style.remove());
    
    // Clear CSS custom properties by resetting them
    const root = document.documentElement;
    const brandProperties = [
      '--brand-primary',
      '--brand-primary-foreground', 
      '--brand-primary-hover',
      '--brand-logo-text',
      '--brand-logo-url',
      '--brand-logo-avatar-text',
      '--brand-font-family',
      '--brand-font-weight-normal',
      '--brand-font-weight-medium',
      '--brand-font-weight-bold'
    ];
    
    brandProperties.forEach(prop => {
      root.style.removeProperty(prop);
    });
    
    this.currentBrandId = null;
  }

  /**
   * Inject CSS content into document head
   */
  private injectBrandStyles(cssContent: string): void {
    const styleElement = document.createElement('style');
    styleElement.type = 'text/css';
    styleElement.textContent = cssContent;
    styleElement.setAttribute('data-brand-styles', 'true');
    
    // Insert before any existing style tags to ensure proper cascade
    const head = document.head;
    const firstStyle = head.querySelector('style');
    if (firstStyle) {
      head.insertBefore(styleElement, firstStyle);
    } else {
      head.appendChild(styleElement);
    }
    
    this.loadedStyleElement = styleElement;
  }

  /**
   * Force reload current brand theme (useful after login/logout)
   */
  async reloadCurrentBrand(): Promise<void> {
    const currentBrand = this.currentBrandId;
    if (currentBrand && currentBrand !== 'default') {
      await this.loadBrandTheme(currentBrand, true);
    } else {
      await this.loadDefaultTheme();
    }
  }

  /**
   * Get current brand ID
   */
  getCurrentBrandId(): string | null {
    return this.currentBrandId;
  }

  /**
   * Get brand configuration from CSS variables (for React components)
   */
  getBrandConfig(): BrandConfig | null {
    if (typeof window === 'undefined') return null;

    const root = document.documentElement;
    const getVariable = (name: string) => 
      getComputedStyle(root).getPropertyValue(name).trim();

    try {
      return {
        logoText: getVariable('--brand-logo-text').replace(/['"]/g, ''),
        logoUrl: getVariable('--brand-logo-url').replace(/['"]/g, '') || undefined,
        logoAvatarText: getVariable('--brand-logo-avatar-text').replace(/['"]/g, ''),
        primaryColor: getVariable('--brand-primary'),
        primaryForeground: getVariable('--brand-primary-foreground'),
        primaryHover: getVariable('--brand-primary-hover'),
        fontFamily: getVariable('--brand-font-family').replace(/['"]/g, ''),
        fontWeights: {
          normal: parseInt(getVariable('--brand-font-weight-normal')) || 400,
          medium: parseInt(getVariable('--brand-font-weight-medium')) || 500,
          bold: parseInt(getVariable('--brand-font-weight-bold')) || 700,
        }
      };
    } catch (error) {
      console.error('Failed to read brand config:', error);
      return null;
    }
  }
}

// Export singleton instance
export const brandManager = new BrandManager();

// Export hook for React components
export const useBrandConfig = (): BrandConfig | null => {
  const [config, setConfig] = React.useState<BrandConfig | null>(null);

  React.useEffect(() => {
    const updateConfig = () => {
      setConfig(brandManager.getBrandConfig());
    };

    // Initial load
    updateConfig();

    // Listen for brand changes
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList' || mutation.type === 'attributes') {
          updateConfig();
        }
      });
    });

    observer.observe(document.head, {
      childList: true,
      attributes: true,
      attributeFilter: ['data-brand-styles']
    });

    return () => observer.disconnect();
  }, []);

  return config;
};

// React import for the hook
import React from 'react';
