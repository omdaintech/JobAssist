import { Globe } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useLanguageStore } from '@/store/languageStore';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

const languages = [
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'ar', name: 'العربية', flag: '🇪🇬' },
  { code: 'sv', name: 'Svenska', flag: '🇸🇪' },
];

export function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const { language, setLanguage } = useLanguageStore();

  const handleLanguageChange = (langCode: 'en' | 'ar' | 'sv') => {
    i18n.changeLanguage(langCode);
    setLanguage(langCode);
  };

  const currentLanguage = languages.find(lang => lang.code === language);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon">
          <Globe className="h-5 w-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {languages.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => handleLanguageChange(lang.code as any)}
            className={language === lang.code ? 'bg-accent' : ''}
          >
            <span className="mr-2">{lang.flag}</span>
            {lang.name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
