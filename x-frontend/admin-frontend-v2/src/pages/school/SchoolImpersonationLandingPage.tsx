import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

export function SchoolImpersonationLandingPage() {
    const navigate = useNavigate()
    const [searchParams] = useSearchParams()

    const token = searchParams.get('token')
    const schoolId = searchParams.get('schoolId')
    const schoolName = searchParams.get('schoolName') || 'School'
    const expiresInParam = searchParams.get('expiresIn')

    useEffect(() => {
        if (!token) {
            return
        }

        try {
            localStorage.setItem('school_admin_token', token)
            // Clear cached school admin user payload to force verification in the new tab
            localStorage.removeItem('school_admin_user')

            if (expiresInParam) {
                const expiresInSeconds = Number(expiresInParam)
                if (!Number.isNaN(expiresInSeconds)) {
                    const expiresAt = Date.now() + expiresInSeconds * 1000
                    localStorage.setItem('school_admin_token_expires_at', String(expiresAt))
                }
            }

            if (schoolId) {
                localStorage.setItem('school_admin_impersonated_school_id', schoolId)
            }

            if (schoolName) {
                localStorage.setItem('school_admin_impersonated_school_name', schoolName)
            }

            navigate('/school/dashboard', { replace: true })
        } catch (error) {
            console.error('Failed to bootstrap impersonation token', error)
        }
    }, [token, expiresInParam, schoolId, schoolName, navigate])

    if (!token) {
        return (
            <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-6 py-12">
                <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl">
                    <h1 className="text-xl font-semibold text-gray-900">Impersonation token missing</h1>
                    <p className="mt-3 text-sm text-gray-600">
                        We couldn't find a valid impersonation token. Please launch the impersonation session again from the admin dashboard.
                    </p>
                    <button
                        onClick={() => navigate('/', { replace: true })}
                        className="mt-6 inline-flex w-full items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                    >
                        Return to Admin Dashboard
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-6 py-12">
            <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-xl">
                <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xl font-semibold">
                    {schoolName.slice(0, 1).toUpperCase()}
                </div>
                <h1 className="text-xl font-semibold text-gray-900">Preparing impersonation session</h1>
                <p className="mt-2 text-sm text-gray-600">
                    Authenticating into <span className="font-medium text-gray-900">{schoolName}</span>. You'll be redirected momentarily.
                </p>
                <div className="mt-6 flex items-center justify-center gap-2 text-sm text-gray-500">
                    <span className="h-2 w-2 animate-pulse rounded-full bg-indigo-500"></span>
                    <span>Setting up access…</span>
                </div>
            </div>
        </div>
    )
}

export default SchoolImpersonationLandingPage
