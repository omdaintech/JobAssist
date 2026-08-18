import React from 'react';
import { Button } from './button';
import { cn } from '@/lib/utils';

export interface SpecialCharacterPickerProps {
  languageCode?: string;
  onCharacterSelect: (char: string) => void;
  className?: string;
}

// Language-specific special characters
const SPECIAL_CHARACTERS: Record<string, string[]> = {
  // German
  'de': ['ä', 'ö', 'ü', 'Ä', 'Ö', 'Ü', 'ß'],
  
  // French
  'fr': ['à', 'â', 'é', 'è', 'ê', 'ë', 'î', 'ï', 'ô', 'ù', 'û', 'ü', 'ÿ', 'ç', 'æ', 'œ', 'À', 'É', 'È', 'Ç'],
  
  // Spanish
  'es': ['á', 'é', 'í', 'ó', 'ú', 'ñ', 'ü', 'Á', 'É', 'Í', 'Ó', 'Ú', 'Ñ', 'Ü', '¿', '¡'],
  
  // Add more languages here as needed
  // 'it': ['à', 'è', 'é', 'ì', 'ò', 'ù'],
  // 'pt': ['á', 'â', 'ã', 'à', 'é', 'ê', 'í', 'ó', 'ô', 'õ', 'ú', 'ü', 'ç'],
};

export const SpecialCharacterPicker: React.FC<SpecialCharacterPickerProps> = ({
  languageCode,
  onCharacterSelect,
  className = ''
}) => {
  // Get characters for the current language
  const characters = languageCode ? SPECIAL_CHARACTERS[languageCode] : null;

  // Don't render if no language or no special characters for this language
  if (!characters || characters.length === 0) {
    return null;
  }

  return (
    <div className={cn("bg-gray-50 border border-gray-200 rounded-lg p-2", className)}>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs font-medium text-gray-700">Special Characters:</span>
      </div>
      <div className="flex flex-wrap gap-1">
        {characters.map((char, index) => (
          <Button
            key={index}
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onCharacterSelect(char)}
            className="min-w-[32px] h-8 px-2 text-sm font-medium hover:bg-purple-50 hover:border-purple-300 hover:text-purple-700"
          >
            {char}
          </Button>
        ))}
      </div>
    </div>
  );
};

