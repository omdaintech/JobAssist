import { LanguageInfo } from '@/services/api'
import React from 'react'

interface LanguageSelectorProps {
    availableLanguages: LanguageInfo[]  // Fetched from API - not hardcoded
    selectedLanguage?: LanguageInfo
    onLanguageChange?: (language: LanguageInfo) => void
    disabled?: boolean
    className?: string
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({
    availableLanguages,
    selectedLanguage,
    onLanguageChange,
    disabled = false,
    className = ""
}) => {
    // Default to first available language if none selected
    const currentLanguage = selectedLanguage || availableLanguages[0]

    const handleLanguageChange = (languageId: string) => {
        const language = availableLanguages.find(lang => lang.language_id === languageId)
        if (language && onLanguageChange) {
            onLanguageChange(language)
        }
    }

    if (!availableLanguages || availableLanguages.length === 0) {
        return (
            <div className={`space-y-2 ${className}`}>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Language
                </label>
                <div className="text-sm text-gray-500">
                    Loading languages...
                </div>
            </div>
        )
    }

    return (
        <div className={`space-y-2 ${className}`}>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Language
            </label>

            <select
                value={currentLanguage?.language_id || ''}
                onChange={(e) => handleLanguageChange(e.target.value)}
                disabled={disabled}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            >
                {availableLanguages.map((language) => (
                    <option key={language.language_id} value={language.language_id}>
                        {language.flag_emoji ? `${language.flag_emoji} ` : ''}
                        {language.language_name}
                        {language.native_name ? ` (${language.native_name})` : ''}
                    </option>
                ))}
            </select>

            {currentLanguage && (
                <div className="text-xs text-gray-500 dark:text-gray-400">
                    {currentLanguage.is_active ? (
                        <span className="text-green-600 dark:text-green-400">
                            ✓ Available - Supports {currentLanguage.supported_levels?.join(', ') || 'multiple levels'}
                        </span>
                    ) : (
                        <span className="inline-block bg-amber-100 text-amber-800 px-2 py-1 rounded text-xs">
                            Coming Soon
                        </span>
                    )}
                </div>
            )}
        </div>
    )
}

export default LanguageSelector
