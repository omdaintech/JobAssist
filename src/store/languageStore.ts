import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type Language = 'en' | 'ar' | 'sv';
type Currency = 'USD' | 'EGP' | 'SEK';

interface LanguageState {
  language: Language;
  currency: Currency;
  isRTL: boolean;
  setLanguage: (language: Language) => void;
  setCurrency: (currency: Currency) => void;
}

const getDefaultCurrency = (language: Language): Currency => {
  switch (language) {
    case 'ar':
      return 'EGP';
    case 'sv':
      return 'SEK';
    default:
      return 'USD';
  }
};

export const useLanguageStore = create<LanguageState>()(
  persist(
    (set) => ({
      language: 'en',
      currency: 'USD',
      isRTL: false,

      setLanguage: (language) => {
        const isRTL = language === 'ar';
        const currency = getDefaultCurrency(language);

        set({ language, isRTL, currency });

        // Update document direction
        document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
        document.documentElement.lang = language;
      },

      setCurrency: (currency) => set({ currency }),
    }),
    {
      name: 'language-storage',
      onRehydrateStorage: () => (state) => {
        // Ensure direction is set after hydration
        if (state) {
          document.documentElement.dir = state.isRTL ? 'rtl' : 'ltr';
          document.documentElement.lang = state.language;
        }
      },
    }
  )
);
