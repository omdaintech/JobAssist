// Language API Service for fetching available languages
interface Language {
    language_id: string
    language_name: string
    native_name?: string
    supported_levels: Array<{
        code: string
        name: string
        description: string
    }>
    content_availability: Record<string, boolean>
}

interface LanguagesResponse {
    success: boolean
    languages: Language[]
    message?: string
}

class LanguageApiService {
    private cache: Language[] | null = null
    private cacheExpiry: number = 0
    private readonly CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

    async getAvailableLanguages(): Promise<Language[]> {
        // Return cached data if still valid
        if (this.cache && Date.now() < this.cacheExpiry) {
            return this.cache
        }

        try {
            const response = await fetch('/api/languages', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            })

            if (!response.ok) {
                console.error('Language API request failed:', response.status, response.statusText)
                throw new Error(`Failed to fetch languages: ${response.status}`)
            }

            const data: LanguagesResponse = await response.json()
            
            if (data.success && Array.isArray(data.languages)) {
                this.cache = data.languages
                this.cacheExpiry = Date.now() + this.CACHE_DURATION
                return data.languages
            } else {
                console.error('Language API returned unexpected data:', data)
                throw new Error(data.message || 'Failed to fetch languages')
            }
        } catch (error) {
            console.error('Error fetching languages:', error)
            // Return empty array on error, don't throw
            return []
        }
    }

    async getLanguageById(languageId: string): Promise<Language | null> {
        const languages = await this.getAvailableLanguages()
        return languages.find(lang => lang.language_id === languageId) || null
    }


    // Clear cache manually if needed
    clearCache(): void {
        this.cache = null
        this.cacheExpiry = 0
    }
}

// Export singleton instance
export const languageApi = new LanguageApiService()
export type { Language, LanguagesResponse } 