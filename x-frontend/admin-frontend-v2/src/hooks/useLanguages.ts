import { useState, useEffect } from 'react'
import { languageApi, type Language } from '../services/languageApi'

interface UseLanguagesReturn {
    languages: Language[]
    loading: boolean
    error: string | null
    getLanguageById: (id: string) => Language | undefined
    refresh: () => Promise<void>
}

export function useLanguages(): UseLanguagesReturn {
    const [languages, setLanguages] = useState<Language[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const loadLanguages = async () => {
        try {
            setLoading(true)
            setError(null)
            const data = await languageApi.getAvailableLanguages()
            // Ensure we always set an array
            setLanguages(Array.isArray(data) ? data : [])
        } catch (err) {
            console.error('Error in useLanguages:', err)
            setError(err instanceof Error ? err.message : 'Failed to load languages')
            setLanguages([])
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        loadLanguages()
    }, [])

    const getLanguageById = (id: string): Language | undefined => {
        return languages.find(lang => lang.language_id === id)
    }


    const refresh = async (): Promise<void> => {
        languageApi.clearCache()
        await loadLanguages()
    }

    return {
        languages,
        loading,
        error,
        getLanguageById,
        refresh
    }
}

// Hook for getting a single language by ID
export function useLanguageById(languageId: string | null): {
    language: Language | null
    loading: boolean
    error: string | null
} {
    const { languages, loading, error } = useLanguages()
    
    const language = languageId ? languages.find(lang => lang.language_id === languageId) || null : null
    
    return {
        language,
        loading,
        error
    }
} 