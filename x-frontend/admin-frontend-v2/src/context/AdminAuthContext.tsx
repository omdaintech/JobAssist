import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

interface AdminAuthContextType {
    isAuthenticated: boolean
    isLoading: boolean
    token: string | null
    login: (email: string, password: string, captchaToken?: string, rememberMe?: boolean) => Promise<void>
    logout: () => void
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined)

export function AdminAuthProvider({ children }: { children: ReactNode }) {
    const [isAuthenticated, setIsAuthenticated] = useState(false)
    const [isLoading, setIsLoading] = useState(true)
    const [token, setToken] = useState<string | null>(null)

    useEffect(() => {
        const checkAuth = async () => {
            const savedToken = localStorage.getItem('adminToken')
            if (savedToken) {
                try {
                    const response = await fetch('/api/admin/auth/verify', {
                        headers: { Authorization: `Bearer ${savedToken}` }
                    })
                    if (response.ok) {
                        setToken(savedToken)
                        setIsAuthenticated(true)
                    } else {
                        localStorage.removeItem('adminToken')
                    }
                } catch (error) {
                    localStorage.removeItem('adminToken')
                }
            }
            setIsLoading(false)
        }

        checkAuth()
    }, [])

    const login = async (email: string, password: string, captchaToken?: string, rememberMe?: boolean) => {
        const response = await fetch('/api/admin/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email,
                password,
                ...(captchaToken ? { captcha_token: captchaToken } : {}),
                ...(rememberMe !== undefined ? { remember_me: rememberMe } : {}),
            })
        })

        if (!response.ok) {
            const error = await response.json()
            throw new Error(error.detail || 'Login failed')
        }

        const data = await response.json()
        const newToken = data.token

        localStorage.setItem('adminToken', newToken)
        setToken(newToken)
        setIsAuthenticated(true)
    }

    const logout = () => {
        localStorage.removeItem('adminToken')
        setToken(null)
        setIsAuthenticated(false)
    }

    return (
        <AdminAuthContext.Provider value={{
            isAuthenticated,
            isLoading,
            token,
            login,
            logout
        }}>
            {children}
        </AdminAuthContext.Provider>
    )
}

export function useAdminAuth() {
    const context = useContext(AdminAuthContext)
    if (context === undefined) {
        throw new Error('useAdminAuth must be used within an AdminAuthProvider')
    }
    return context
} 
