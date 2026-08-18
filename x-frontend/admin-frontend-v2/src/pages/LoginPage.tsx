import { useRef, useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAdminAuth } from '../hooks/useAdminAuth'
import ReCAPTCHA from 'react-google-recaptcha'
import appConfig from '@/config/appConfig'

export default function LoginPage() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [rememberMe, setRememberMe] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [recaptchaToken, setRecaptchaToken] = useState<string | null>(null)
    const { login } = useAdminAuth()
    const recaptchaRef = useRef<ReCAPTCHA | null>(null)
    const captchaSiteKey = appConfig.recaptcha.siteKey
    const isCaptchaEnabled = Boolean(captchaSiteKey)

    // Set page title
    useEffect(() => {
        document.title = 'Admin Login | One-CEFR';
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError('')

        if (isCaptchaEnabled && !recaptchaToken) {
            setError('Please complete the reCAPTCHA verification')
            setLoading(false)
            return
        }

        try {
            await login(email, password, recaptchaToken ?? undefined, rememberMe)
            if (isCaptchaEnabled) {
                recaptchaRef.current?.reset()
                setRecaptchaToken(null)
            }
        } catch (err: any) {
            setError(err.message)
            if (isCaptchaEnabled) {
                recaptchaRef.current?.reset()
                setRecaptchaToken(null)
            }
        } finally {
            setLoading(false)
        }
    }

    const handleRecaptchaChange = (token: string | null) => {
        setRecaptchaToken(token)
        if (token) {
            setError('')
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
                <h1 className="text-2xl font-bold text-center text-eu-blue mb-6">
                    Admin Login
                </h1>

                <form onSubmit={handleSubmit}>
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Email Address
                        </label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-eu-blue"
                            required
                            autoComplete="email"
                        />
                    </div>

                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Password
                        </label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-eu-blue"
                            required
                            autoComplete="current-password"
                        />
                    </div>

                    <div className="mb-4">
                        <label className="flex items-center">
                            <input
                                type="checkbox"
                                checked={rememberMe}
                                onChange={(e) => setRememberMe(e.target.checked)}
                                className="mr-2 h-4 w-4 text-eu-blue focus:ring-eu-blue border-gray-300 rounded"
                            />
                            <span className="text-sm text-gray-700">
                                Remember me for 30 days
                            </span>
                        </label>
                    </div>

                    {error && (
                        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
                            {error}
                        </div>
                    )}

                    {isCaptchaEnabled && (
                        <div className="mb-4 flex justify-center">
                            <ReCAPTCHA
                                ref={recaptchaRef}
                                sitekey={captchaSiteKey}
                                onChange={handleRecaptchaChange}
                                onErrored={() => {
                                    setRecaptchaToken(null)
                                    setError('reCAPTCHA verification failed. Please try again.')
                                }}
                                onExpired={() => {
                                    setRecaptchaToken(null)
                                    setError('reCAPTCHA expired. Please try again.')
                                }}
                            />
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-eu-blue text-white py-2 px-4 rounded-md hover:bg-eu-blue-700 disabled:opacity-50"
                    >
                        {loading ? 'Logging in...' : 'Login'}
                    </button>
                </form>

                <div className="mt-6 text-center">
                    <div className="text-sm text-gray-600 mb-3">
                        {/* Removed default credentials for initial setup */}
                    </div>
                    <div className="border-t pt-4">
                        <p className="text-sm text-gray-600 mb-2">
                            Are you a school administrator?
                        </p>
                        <Link 
                            to="/school/login" 
                            className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors duration-200"
                        >
                            Click here for school login →
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    )
}
