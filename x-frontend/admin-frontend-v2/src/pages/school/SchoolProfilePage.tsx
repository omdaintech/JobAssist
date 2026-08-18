import { useEffect, useState } from 'react'
import { BuildingOfficeIcon, EnvelopeIcon, PhoneIcon, MapPinIcon, DocumentTextIcon } from '@heroicons/react/24/outline'
import { schoolApi } from '../../services/schoolApi'
import { useSchoolAuth } from '../../context/SchoolAuthContext'

interface SchoolProfile {
  id: string
  name: string
  display_name?: string
  description?: string
  school_type: string
  is_active: boolean
  created_at: string
  updated_at: string
  contact_email?: string
  contact_phone?: string
  admin_email?: string
  admin_phone?: string
  billing_email?: string
  billing_contact_name?: string
  billing_phone?: string
  payment_method_info?: any
  physical_address?: any
  billing_address?: any
  tax_address?: any
  tax_id?: string
  vat_number?: string
  tax_exemption_status?: boolean
  settings?: any
}

const InfoCard = ({ title, children, icon: Icon }: { title: string; children: React.ReactNode; icon: any }) => (
  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
    <div className="flex items-center mb-4">
      <Icon className="h-5 w-5 text-gray-600 mr-2" />
      <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
    </div>
    {children}
  </div>
)

const InfoRow = ({ label, value }: { label: string; value?: string | boolean | null }) => {
  if (!value && value !== false) return null
  
  return (
    <div className="py-2 border-b border-gray-100 last:border-b-0">
      <div className="flex justify-between">
        <span className="text-sm font-medium text-gray-600">{label}:</span>
        <span className="text-sm text-gray-900">
          {typeof value === 'boolean' ? (value ? 'Yes' : 'No') : value}
        </span>
      </div>
    </div>
  )
}

const AddressDisplay = ({ address, title }: { address: any; title: string }) => {
  if (!address) return null
  
  return (
    <div className="mb-4">
      <h4 className="text-sm font-semibold text-gray-700 mb-2">{title}</h4>
      <div className="text-sm text-gray-600 space-y-1">
        {address.street && <div>{address.street}</div>}
        <div>
          {[address.city, address.state, address.postal_code].filter(Boolean).join(', ')}
        </div>
        {address.country && <div>{address.country}</div>}
      </div>
    </div>
  )
}

export default function SchoolProfilePage() {
  const { isAuthenticated, loading: authLoading } = useSchoolAuth()
  const [profile, setProfile] = useState<SchoolProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (authLoading) {
      return
    }

    if (!isAuthenticated) {
      setLoading(false)
      setError('You need to be signed in to view the school profile.')
      return
    }

    let isCancelled = false

    const fetchProfile = async () => {
      try {
        setLoading(true)
        setError(null)
        const response = await schoolApi.getProfile()

        if (!isCancelled) {
          if (response.success && response.school) {
            setProfile(response.school)
          } else {
            setError(response.message || 'Failed to load school profile')
          }
        }
      } catch (err) {
        console.error('Error fetching school profile:', err)
        if (!isCancelled) {
          setError('Failed to load school profile')
        }
      } finally {
        if (!isCancelled) {
          setLoading(false)
        }
      }
    }

    fetchProfile()

    return () => {
      isCancelled = true
    }
  }, [authLoading, isAuthenticated])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading school profile...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 mb-4">
            <svg className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 19.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">No profile data available</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">School Profile</h1>
          <p className="mt-2 text-gray-600">View your school's comprehensive information</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Basic Information */}
          <InfoCard title="Basic Information" icon={BuildingOfficeIcon}>
            <InfoRow label="School Name" value={profile.name} />
            <InfoRow label="Display Name" value={profile.display_name} />
            <InfoRow label="Description" value={profile.description} />
            <InfoRow label="School Type" value={profile.school_type?.toUpperCase()} />
            <InfoRow label="Status" value={profile.is_active ? 'Active' : 'Inactive'} />
            <InfoRow label="Created" value={new Date(profile.created_at).toLocaleDateString()} />
            <InfoRow label="Last Updated" value={new Date(profile.updated_at).toLocaleDateString()} />
          </InfoCard>

          {/* Contact Information */}
          <InfoCard title="Contact Information" icon={EnvelopeIcon}>
            <InfoRow label="Contact Email" value={profile.contact_email} />
            <InfoRow label="Contact Phone" value={profile.contact_phone} />
            <InfoRow label="Admin Email" value={profile.admin_email} />
            <InfoRow label="Admin Phone" value={profile.admin_phone} />
          </InfoCard>

          {/* Billing Information */}
          <InfoCard title="Billing Information" icon={DocumentTextIcon}>
            <InfoRow label="Billing Email" value={profile.billing_email} />
            <InfoRow label="Billing Contact" value={profile.billing_contact_name} />
            <InfoRow label="Billing Phone" value={profile.billing_phone} />
            {profile.payment_method_info && (
              <div className="mt-4">
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Payment Information</h4>
                <div className="text-sm text-gray-600 space-y-1">
                  <InfoRow label="Preferred Method" value={profile.payment_method_info.preferred_method} />
                  <InfoRow label="Payment Terms" value={profile.payment_method_info.payment_terms ? `${profile.payment_method_info.payment_terms} days` : undefined} />
                  <InfoRow label="Currency" value={profile.payment_method_info.currency} />
                  {profile.payment_method_info.notes && (
                    <div className="mt-2">
                      <span className="text-sm font-medium text-gray-600">Notes:</span>
                      <p className="text-sm text-gray-600 mt-1">{profile.payment_method_info.notes}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </InfoCard>

          {/* Address Information */}
          <InfoCard title="Address Information" icon={MapPinIcon}>
            <AddressDisplay address={profile.physical_address} title="Physical Address" />
            <AddressDisplay address={profile.billing_address} title="Billing Address" />
            <AddressDisplay address={profile.tax_address} title="Tax Address" />
          </InfoCard>

          {/* Tax Information */}
          <InfoCard title="Tax Information" icon={DocumentTextIcon}>
            <InfoRow label="Tax ID" value={profile.tax_id} />
            <InfoRow label="VAT Number" value={profile.vat_number} />
            <InfoRow label="Tax Exempt" value={profile.tax_exemption_status} />
          </InfoCard>
        </div>
      </div>
    </div>
  )
}
