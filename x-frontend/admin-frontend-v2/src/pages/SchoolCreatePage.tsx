import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { SchoolForm, SchoolFormValues } from '../components/schools/SchoolForm'
import { Button } from '../components/ui/button'
import { useAdminAuth } from '../hooks/useAdminAuth'
import { adminApi } from '../services/adminApi'

export default function SchoolCreatePage() {
    const { token } = useAdminAuth()
    const navigate = useNavigate()
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [submitError, setSubmitError] = useState<string | null>(null)

    const handleSubmit = async (values: SchoolFormValues) => {
        if (!token) return

        setIsSubmitting(true)
        setSubmitError(null)

        try {
            const response = await adminApi.createSchool(token, values)

            if (!response.success) {
                setSubmitError(response.message || 'Failed to create institute')
                return
            }

            navigate('/institutes')
        } catch (error: any) {
            setSubmitError(error?.message || 'Failed to create institute')
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleCancel = () => {
        navigate('/institutes')
    }

    return (
        <div className="mx-auto max-w-5xl space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-semibold text-gray-900">Create Institute</h1>
                    <p className="mt-2 text-sm text-gray-600">
                        Add a new institute with full billing, tax, and contact details.
                    </p>
                </div>
                <Button variant="outline" onClick={handleCancel}>
                    Back to Institutes
                </Button>
            </div>

            <SchoolForm
                mode="create"
                onSubmit={handleSubmit}
                onCancel={handleCancel}
                isSubmitting={isSubmitting}
                submitError={submitError}
            />
        </div>
    )
}
