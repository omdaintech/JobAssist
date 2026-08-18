import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { SchoolForm, SchoolFormValues } from '../components/schools/SchoolForm'
import { Button } from '../components/ui/button'
import { AdminErrorDisplay } from '../components/ui/admin-error-display'
import { AdminLoadingState } from '../components/ui/admin-loading-state'
import { useAdminAuth } from '../hooks/useAdminAuth'
import { adminApi } from '../services/adminApi'

export default function SchoolEditPage() {
    const { token } = useAdminAuth()
    const { schoolId } = useParams<{ schoolId: string }>()
    const navigate = useNavigate()

    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [initialValues, setInitialValues] = useState<SchoolFormValues | null>(null)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [submitError, setSubmitError] = useState<string | null>(null)

    const loadSchool = useCallback(async () => {
        if (!token || !schoolId) return

        setLoading(true)
        setError(null)

        try {
            const response = await adminApi.getSchoolDetails(token, schoolId)

            if (!response.success || !response.data?.school) {
                setError(response.message || 'Failed to load institute')
                return
            }

            const school = response.data.school
            const formValues: SchoolFormValues = {
                name: school.name,
                display_name: school.display_name ?? undefined,
                description: school.description ?? undefined,
                school_type: (school.school_type ?? 'b2b') as SchoolFormValues['school_type'],
                contact_email: school.contact_email ?? undefined,
                contact_phone: school.contact_phone ?? undefined,
                admin_email: school.admin_email ?? undefined,
                admin_phone: school.admin_phone ?? undefined,
                billing_email: school.billing_email ?? undefined,
                billing_contact_name: school.billing_contact_name ?? undefined,
                billing_phone: school.billing_phone ?? undefined,
                payment_method_info: school.payment_method_info ?? undefined,
                physical_address: school.physical_address ?? undefined,
                billing_address: school.billing_address ?? undefined,
                tax_address: school.tax_address ?? undefined,
                tax_id: school.tax_id ?? undefined,
                vat_number: school.vat_number ?? undefined,
                tax_exemption_status: school.tax_exemption_status ?? false,
                priority_support: school.priority_support ?? false,
                account_manager_notes: school.account_manager_notes ?? undefined,
                internal_tags: Array.isArray(school.internal_tags) ? school.internal_tags : undefined,
                billing_pack_id: school.billing_pack_id ?? undefined,
                student_pack_id: school.student_pack_id ?? undefined,
                billing_cycle: (school.billing_cycle as SchoolFormValues['billing_cycle']) ?? undefined,
                cycle_start: school.cycle_start ?? undefined,
                cycle_end: school.cycle_end ?? undefined,
                is_active: school.is_active ?? true
            }

            setInitialValues(formValues)
        } catch (err: any) {
            setError(err?.message || 'Failed to load institute')
        } finally {
            setLoading(false)
        }
    }, [token, schoolId])

    useEffect(() => {
        if (token && schoolId) {
            loadSchool()
        }
    }, [token, schoolId, loadSchool])

    const handleSubmit = async (values: SchoolFormValues) => {
        if (!token || !schoolId) return

        setIsSubmitting(true)
        setSubmitError(null)

        try {
            const response = await adminApi.updateSchool(token, schoolId, values)

            if (!response.success) {
                setSubmitError(response.message || 'Failed to update institute')
                return
            }

            navigate('/institutes')
        } catch (error: any) {
            setSubmitError(error?.message || 'Failed to update institute')
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleCancel = () => {
        navigate('/institutes')
    }

    if (loading) {
        return <AdminLoadingState message="Loading institute details..." />
    }

    if (error) {
        return (
            <AdminErrorDisplay
                title="Failed to Load Institute"
                message={error}
                onRetry={() => {
                    loadSchool()
                }}
            />
        )
    }

    if (!initialValues) {
        return (
            <AdminErrorDisplay
                title="Institute Not Found"
                message="We couldn't find the requested institute."
                onRetry={handleCancel}
                retryText="Back to list"
            />
        )
    }

    return (
        <div className="mx-auto max-w-5xl space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-semibold text-gray-900">Edit Institute</h1>
                    <p className="mt-2 text-sm text-gray-600">
                        Update institute billing, tax, and operational settings.
                    </p>
                </div>
                <Button variant="outline" onClick={handleCancel}>
                    Back to Institutes
                </Button>
            </div>

            <SchoolForm
                mode="edit"
                initialValues={initialValues}
                onSubmit={handleSubmit}
                onCancel={handleCancel}
                isSubmitting={isSubmitting}
                submitError={submitError}
            />
        </div>
    )
}
