import { useEffect, useMemo, useState } from 'react'
import { Button } from '../ui/button'
import { Input } from '../ui/input'

interface AddressState {
    street: string
    city: string
    state: string
    country: string
    postal_code: string
}

interface PaymentMethodState {
    preferred_method: string
    payment_terms: string
    currency: string
    notes: string
}

export interface AddressPayload {
    street?: string
    city?: string
    state?: string
    country?: string
    postal_code?: string
}

export interface PaymentMethodPayload {
    preferred_method?: string
    payment_terms?: string
    currency?: string
    notes?: string
}

export interface SchoolFormValues {
    name: string
    display_name?: string
    description?: string
    school_type: 'b2c' | 'b2b' | 'enterprise'
    contact_email?: string
    contact_phone?: string
    admin_email?: string
    admin_phone?: string
    billing_email?: string
    billing_contact_name?: string
    billing_phone?: string
    payment_method_info?: PaymentMethodPayload
    physical_address?: AddressPayload
    billing_address?: AddressPayload
    tax_address?: AddressPayload
    tax_id?: string
    vat_number?: string
    tax_exemption_status?: boolean
    priority_support?: boolean
    account_manager_notes?: string
    internal_tags?: string[]
    billing_pack_id?: string
    student_pack_id?: string
    billing_cycle?: 'monthly' | 'quarterly' | 'annual'
    cycle_start?: string
    cycle_end?: string
    is_active?: boolean
}

interface SchoolFormState {
    name: string
    display_name: string
    description: string
    school_type: 'b2c' | 'b2b' | 'enterprise'
    contact_email: string
    contact_phone: string
    admin_email: string
    admin_phone: string
    billing_email: string
    billing_contact_name: string
    billing_phone: string
    payment_method_info: PaymentMethodState
    physical_address: AddressState
    billing_address: AddressState
    tax_address: AddressState
    tax_id: string
    vat_number: string
    tax_exemption_status: boolean
    priority_support: boolean
    account_manager_notes: string
    internal_tags: string
    billing_pack_id: string
    student_pack_id: string
    billing_cycle: '' | 'monthly' | 'quarterly' | 'annual'
    cycle_start: string
    cycle_end: string
    is_active: boolean
}

export interface SchoolFormProps {
    mode: 'create' | 'edit'
    initialValues?: SchoolFormValues
    isSubmitting?: boolean
    submitError?: string | null
    onSubmit: (values: SchoolFormValues) => void | Promise<void>
    onCancel: () => void
}

const emptyAddressState: AddressState = {
    street: '',
    city: '',
    state: '',
    country: '',
    postal_code: ''
}

const buildInitialState = (initialValues?: SchoolFormValues): SchoolFormState => {
    return {
        name: initialValues?.name ?? '',
        display_name: initialValues?.display_name ?? '',
        description: initialValues?.description ?? '',
        school_type: initialValues?.school_type ?? 'b2b',
        contact_email: initialValues?.contact_email ?? '',
        contact_phone: initialValues?.contact_phone ?? '',
        admin_email: initialValues?.admin_email ?? '',
        admin_phone: initialValues?.admin_phone ?? '',
        billing_email: initialValues?.billing_email ?? '',
        billing_contact_name: initialValues?.billing_contact_name ?? '',
        billing_phone: initialValues?.billing_phone ?? '',
        payment_method_info: {
            preferred_method: initialValues?.payment_method_info?.preferred_method ?? '',
            payment_terms: initialValues?.payment_method_info?.payment_terms ?? '',
            currency: initialValues?.payment_method_info?.currency ?? '',
            notes: initialValues?.payment_method_info?.notes ?? ''
        },
        physical_address: {
            ...emptyAddressState,
            ...initialValues?.physical_address
        },
        billing_address: {
            ...emptyAddressState,
            ...initialValues?.billing_address
        },
        tax_address: {
            ...emptyAddressState,
            ...initialValues?.tax_address
        },
        tax_id: initialValues?.tax_id ?? '',
        vat_number: initialValues?.vat_number ?? '',
        tax_exemption_status: initialValues?.tax_exemption_status ?? false,
        priority_support: initialValues?.priority_support ?? false,
        account_manager_notes: initialValues?.account_manager_notes ?? '',
        internal_tags: initialValues?.internal_tags?.join(', ') ?? '',
        billing_pack_id: initialValues?.billing_pack_id ?? '',
        student_pack_id: initialValues?.student_pack_id ?? '',
        billing_cycle: (initialValues?.billing_cycle as SchoolFormState['billing_cycle']) ?? '',
        cycle_start: initialValues?.cycle_start ? initialValues.cycle_start.slice(0, 10) : '',
        cycle_end: initialValues?.cycle_end ? initialValues.cycle_end.slice(0, 10) : '',
        is_active: initialValues?.is_active ?? true
    }
}

const sanitizeString = (value: string): string | undefined => {
    const trimmed = value.trim()
    return trimmed === '' ? undefined : trimmed
}

const sanitizeAddress = (address: AddressState): AddressPayload | undefined => {
    const payload: AddressPayload = {}
    ;(['street', 'city', 'state', 'country', 'postal_code'] as const).forEach((key) => {
        const sanitized = sanitizeString(address[key])
        if (sanitized) {
            payload[key] = sanitized
        }
    })

    return Object.keys(payload).length ? payload : undefined
}

const sanitizePayment = (payment: PaymentMethodState): PaymentMethodPayload | undefined => {
    const payload: PaymentMethodPayload = {}
    ;(['preferred_method', 'payment_terms', 'currency', 'notes'] as const).forEach((key) => {
        const sanitized = sanitizeString(payment[key])
        if (sanitized) {
            payload[key] = sanitized
        }
    })

    return Object.keys(payload).length ? payload : undefined
}

export function SchoolForm({
    mode,
    initialValues,
    isSubmitting = false,
    submitError,
    onSubmit,
    onCancel
}: SchoolFormProps) {
    const [formState, setFormState] = useState<SchoolFormState>(buildInitialState(initialValues))

    useEffect(() => {
        setFormState(buildInitialState(initialValues))
    }, [initialValues])

    const sectionTitleClasses = useMemo(() => 'text-lg font-semibold text-gray-900', [])
    const sectionCardClasses = useMemo(() => 'bg-white shadow-sm rounded-lg p-6 space-y-4', [])
    const labelClasses = useMemo(() => 'block text-sm font-medium text-gray-700', [])
    const textareaClasses = useMemo(
        () => 'mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500',
        []
    )
    const selectClasses = useMemo(
        () => 'mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500',
        []
    )

    const updateField = <K extends keyof SchoolFormState>(field: K, value: SchoolFormState[K]) => {
        setFormState((prev) => ({ ...prev, [field]: value }))
    }

    const updateAddress = (field: 'physical_address' | 'billing_address' | 'tax_address', key: keyof AddressState, value: string) => {
        setFormState((prev) => {
            const address = prev[field] as AddressState
            return {
                ...prev,
                [field]: {
                    ...address,
                    [key]: value
                }
            }
        })
    }

    const updatePayment = (key: keyof PaymentMethodState, value: string) => {
        setFormState((prev) => ({
            ...prev,
            payment_method_info: {
                ...prev.payment_method_info,
                [key]: value
            }
        }))
    }

    const handleSubmit = (event: React.FormEvent) => {
        event.preventDefault()
        const payload: SchoolFormValues = {
            name: formState.name.trim(),
            school_type: formState.school_type,
            is_active: formState.is_active,
            tax_exemption_status: formState.tax_exemption_status,
            priority_support: formState.priority_support
        }

        const optionalFields: Array<[keyof SchoolFormValues, string | undefined]> = [
            ['display_name', sanitizeString(formState.display_name)],
            ['description', sanitizeString(formState.description)],
            ['contact_email', sanitizeString(formState.contact_email)],
            ['contact_phone', sanitizeString(formState.contact_phone)],
            ['admin_email', sanitizeString(formState.admin_email)],
            ['admin_phone', sanitizeString(formState.admin_phone)],
            ['billing_email', sanitizeString(formState.billing_email)],
            ['billing_contact_name', sanitizeString(formState.billing_contact_name)],
            ['billing_phone', sanitizeString(formState.billing_phone)],
            ['billing_pack_id', sanitizeString(formState.billing_pack_id)],
            ['student_pack_id', sanitizeString(formState.student_pack_id)],
            ['tax_id', sanitizeString(formState.tax_id)],
            ['vat_number', sanitizeString(formState.vat_number)],
            ['account_manager_notes', sanitizeString(formState.account_manager_notes)]
        ]

        optionalFields.forEach(([key, value]) => {
            if (value !== undefined) {
                (payload as Record<string, unknown>)[key as string] = value
            }
        })

        if (formState.billing_cycle) {
            payload.billing_cycle = formState.billing_cycle as Required<Pick<SchoolFormValues, 'billing_cycle'>>['billing_cycle'];
        }

        const normalizedCycleStart = sanitizeString(formState.cycle_start);
        if (normalizedCycleStart) {
            payload.cycle_start = normalizedCycleStart;
        }

        const normalizedCycleEnd = sanitizeString(formState.cycle_end);
        if (normalizedCycleEnd) {
            payload.cycle_end = normalizedCycleEnd;
        }

        const paymentPayload = sanitizePayment(formState.payment_method_info)
        if (paymentPayload) {
            payload.payment_method_info = paymentPayload
        }

        const physicalAddress = sanitizeAddress(formState.physical_address)
        if (physicalAddress) {
            payload.physical_address = physicalAddress
        }

        const billingAddress = sanitizeAddress(formState.billing_address)
        if (billingAddress) {
            payload.billing_address = billingAddress
        }

        const taxAddress = sanitizeAddress(formState.tax_address)
        if (taxAddress) {
            payload.tax_address = taxAddress
        }

        const tags = formState.internal_tags
            .split(',')
            .map((tag) => tag.trim())
            .filter((tag) => tag.length > 0)

        if (tags.length) {
            payload.internal_tags = tags
        }

        onSubmit(payload)
    }

    const renderAddressSection = (title: string, field: 'physical_address' | 'billing_address' | 'tax_address') => {
        const address = formState[field]
        return (
            <div className={sectionCardClasses}>
                <div>
                    <h3 className={sectionTitleClasses}>{title}</h3>
                    <p className="mt-1 text-sm text-gray-600">Street, city, state, country, and postal code.</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className={labelClasses}>Street</label>
                        <Input
                            value={address.street}
                            onChange={(e) => updateAddress(field, 'street', e.target.value)}
                            placeholder="123 Main St"
                        />
                    </div>
                    <div>
                        <label className={labelClasses}>City</label>
                        <Input
                            value={address.city}
                            onChange={(e) => updateAddress(field, 'city', e.target.value)}
                            placeholder="Berlin"
                        />
                    </div>
                    <div>
                        <label className={labelClasses}>State / Province</label>
                        <Input
                            value={address.state}
                            onChange={(e) => updateAddress(field, 'state', e.target.value)}
                            placeholder="Berlin"
                        />
                    </div>
                    <div>
                        <label className={labelClasses}>Country</label>
                        <Input
                            value={address.country}
                            onChange={(e) => updateAddress(field, 'country', e.target.value)}
                            placeholder="Germany"
                        />
                    </div>
                    <div>
                        <label className={labelClasses}>Postal Code</label>
                        <Input
                            value={address.postal_code}
                            onChange={(e) => updateAddress(field, 'postal_code', e.target.value)}
                            placeholder="10117"
                        />
                    </div>
                </div>
            </div>
        )
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-8">
            {submitError && (
                <div className="rounded-md border border-red-300 bg-red-50 px-4 py-3 text-red-700">
                    {submitError}
                </div>
            )}

            <div className={sectionCardClasses}>
                <div>
                    <h3 className={sectionTitleClasses}>Basic Information</h3>
                    <p className="mt-1 text-sm text-gray-600">Core details about the institute.</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className={labelClasses}>Institute Name *</label>
                        <Input
                            required
                            value={formState.name}
                            onChange={(e) => updateField('name', e.target.value)}
                            placeholder="Max Müller Institute"
                        />
                    </div>
                    <div>
                        <label className={labelClasses}>Display Name</label>
                        <Input
                            value={formState.display_name}
                            onChange={(e) => updateField('display_name', e.target.value)}
                            placeholder="Max Müller Language Center"
                        />
                    </div>
                    <div>
                        <label className={labelClasses}>Institute Type</label>
                        <select
                            value={formState.school_type}
                            onChange={(e) => updateField('school_type', e.target.value as SchoolFormState['school_type'])}
                            className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
                        >
                            <option value="b2c">B2C • Direct Students</option>
                            <option value="b2b">B2B • Business</option>
                            <option value="enterprise">Enterprise</option>
                        </select>
                    </div>
                    <div>
                        <label className={labelClasses}>Active Status</label>
                        <div className="mt-2 flex items-center space-x-3">
                            <input
                                id="is_active"
                                type="checkbox"
                                checked={formState.is_active}
                                onChange={(e) => updateField('is_active', e.target.checked)}
                                className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                            />
                            <label htmlFor="is_active" className="text-sm text-gray-700">Active</label>
                        </div>
                    </div>
                </div>
                <div>
                    <label className={labelClasses}>Description</label>
                    <textarea
                        rows={4}
                        value={formState.description}
                        onChange={(e) => updateField('description', e.target.value)}
                        placeholder="Short summary for internal reference."
                        className={textareaClasses}
                    />
                </div>
            </div>

            <div className={sectionCardClasses}>
                <div>
                    <h3 className={sectionTitleClasses}>Contact Details</h3>
                    <p className="mt-1 text-sm text-gray-600">Primary institute and admin contacts.</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className={labelClasses}>Contact Email</label>
                        <Input
                            type="email"
                            value={formState.contact_email}
                            onChange={(e) => updateField('contact_email', e.target.value)}
                            placeholder="contact@example.com"
                        />
                    </div>
                    <div>
                        <label className={labelClasses}>Contact Phone</label>
                        <Input
                            value={formState.contact_phone}
                            onChange={(e) => updateField('contact_phone', e.target.value)}
                            placeholder="+49 30 1234 5678"
                        />
                    </div>
                    <div>
                        <label className={labelClasses}>Admin Email</label>
                        <Input
                            type="email"
                            value={formState.admin_email}
                            onChange={(e) => updateField('admin_email', e.target.value)}
                            placeholder="admin@example.com"
                        />
                    </div>
                    <div>
                        <label className={labelClasses}>Admin Phone</label>
                        <Input
                            value={formState.admin_phone}
                            onChange={(e) => updateField('admin_phone', e.target.value)}
                            placeholder="+49 30 9876 5432"
                        />
                    </div>
                </div>
            </div>

            <div className={sectionCardClasses}>
                <div>
                    <h3 className={sectionTitleClasses}>Billing Configuration</h3>
                    <p className="mt-1 text-sm text-gray-600">Define billing packs and cycle information used for invoicing and usage aggregation.</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className={labelClasses}>Billing Pack ID</label>
                        <Input
                            value={formState.billing_pack_id}
                            onChange={(e) => updateField('billing_pack_id', e.target.value)}
                            placeholder="pricing_pack_billing"
                        />
                    </div>
                    <div>
                        <label className={labelClasses}>Student Pack ID</label>
                        <Input
                            value={formState.student_pack_id}
                            onChange={(e) => updateField('student_pack_id', e.target.value)}
                            placeholder="pricing_pack_students"
                        />
                    </div>
                    <div>
                        <label className={labelClasses}>Billing Cycle</label>
                        <select
                            value={formState.billing_cycle}
                            onChange={(e) => updateField('billing_cycle', e.target.value as SchoolFormState['billing_cycle'])}
                            className={selectClasses}
                        >
                            <option value="">Not configured</option>
                            <option value="monthly">Monthly</option>
                            <option value="quarterly">Quarterly</option>
                            <option value="annual">Annual</option>
                        </select>
                    </div>
                    <div>
                        <label className={labelClasses}>Cycle Start</label>
                        <Input
                            type="date"
                            value={formState.cycle_start}
                            onChange={(e) => updateField('cycle_start', e.target.value)}
                        />
                    </div>
                    <div>
                        <label className={labelClasses}>Cycle End</label>
                        <Input
                            type="date"
                            value={formState.cycle_end}
                            onChange={(e) => updateField('cycle_end', e.target.value)}
                        />
                    </div>
                </div>
            </div>

            <div className={sectionCardClasses}>
                <div>
                    <h3 className={sectionTitleClasses}>Billing & Finance</h3>
                    <p className="mt-1 text-sm text-gray-600">Contacts and payment preferences used for invoicing.</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className={labelClasses}>Billing Email</label>
                        <Input
                            type="email"
                            value={formState.billing_email}
                            onChange={(e) => updateField('billing_email', e.target.value)}
                            placeholder="billing@example.com"
                        />
                    </div>
                    <div>
                        <label className={labelClasses}>Billing Contact Name</label>
                        <Input
                            value={formState.billing_contact_name}
                            onChange={(e) => updateField('billing_contact_name', e.target.value)}
                            placeholder="Finance Department"
                        />
                    </div>
                    <div>
                        <label className={labelClasses}>Billing Phone</label>
                        <Input
                            value={formState.billing_phone}
                            onChange={(e) => updateField('billing_phone', e.target.value)}
                            placeholder="+49 30 5555 6677"
                        />
                    </div>
                    <div>
                        <label className={labelClasses}>Preferred Payment Method</label>
                        <Input
                            value={formState.payment_method_info.preferred_method}
                            onChange={(e) => updatePayment('preferred_method', e.target.value)}
                            placeholder="Invoice, bank transfer, etc."
                        />
                    </div>
                    <div>
                        <label className={labelClasses}>Payment Terms (days)</label>
                        <Input
                            value={formState.payment_method_info.payment_terms}
                            onChange={(e) => updatePayment('payment_terms', e.target.value)}
                            placeholder="30"
                        />
                    </div>
                    <div>
                        <label className={labelClasses}>Preferred Currency</label>
                        <Input
                            value={formState.payment_method_info.currency}
                            onChange={(e) => updatePayment('currency', e.target.value)}
                            placeholder="EUR"
                        />
                    </div>
                </div>
                <div>
                    <label className={labelClasses}>Finance Notes</label>
                    <textarea
                        rows={3}
                        value={formState.payment_method_info.notes}
                        onChange={(e) => updatePayment('notes', e.target.value)}
                        placeholder="Internal reminders about invoicing or pricing agreements."
                        className={textareaClasses}
                    />
                </div>
            </div>

            {renderAddressSection('Physical Address', 'physical_address')}
            {renderAddressSection('Billing Address', 'billing_address')}
            {renderAddressSection('Tax Address', 'tax_address')}

            <div className={sectionCardClasses}>
                <div>
                    <h3 className={sectionTitleClasses}>Tax & Compliance</h3>
                    <p className="mt-1 text-sm text-gray-600">Identifiers used on invoices and compliance documents.</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className={labelClasses}>Tax ID</label>
                        <Input
                            value={formState.tax_id}
                            onChange={(e) => updateField('tax_id', e.target.value)}
                            placeholder="DE123456789"
                        />
                    </div>
                    <div>
                        <label className={labelClasses}>VAT Number</label>
                        <Input
                            value={formState.vat_number}
                            onChange={(e) => updateField('vat_number', e.target.value)}
                            placeholder="DE987654321"
                        />
                    </div>
                </div>
                <div className="mt-4 flex items-center space-x-3">
                    <input
                        id="tax_exempt"
                        type="checkbox"
                        checked={formState.tax_exemption_status}
                        onChange={(e) => updateField('tax_exemption_status', e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <label htmlFor="tax_exempt" className="text-sm text-gray-700">
                        Tax exemption on file
                    </label>
                </div>
            </div>

            <div className={sectionCardClasses}>
                <div>
                    <h3 className={sectionTitleClasses}>Internal Coordination</h3>
                    <p className="mt-1 text-sm text-gray-600">Notes visible only to platform admins.</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className={labelClasses}>Internal Tags (comma separated)</label>
                        <Input
                            value={formState.internal_tags}
                            onChange={(e) => updateField('internal_tags', e.target.value)}
                            placeholder="premium, germany, education"
                        />
                    </div>
                    <div className="mt-2 flex items-center space-x-3">
                        <input
                            id="priority_support"
                            type="checkbox"
                            checked={formState.priority_support}
                            onChange={(e) => updateField('priority_support', e.target.checked)}
                            className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <label htmlFor="priority_support" className="text-sm text-gray-700">
                            Priority support enabled
                        </label>
                    </div>
                </div>
                <div>
                    <label className={labelClasses}>Account Manager Notes</label>
                    <textarea
                        rows={4}
                        value={formState.account_manager_notes}
                        onChange={(e) => updateField('account_manager_notes', e.target.value)}
                        placeholder="Key people, expectations, renewal dates, etc."
                        className={textareaClasses}
                    />
                </div>
            </div>

            <div className="flex items-center justify-end space-x-3">
                <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
                    Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? 'Saving…' : mode === 'create' ? 'Create Institute' : 'Save Changes'}
                </Button>
            </div>
        </form>
    )
}
