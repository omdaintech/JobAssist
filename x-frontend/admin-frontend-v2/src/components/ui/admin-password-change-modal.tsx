import {
    EyeIcon,
    EyeSlashIcon,
    KeyIcon,
    XMarkIcon
} from '@heroicons/react/24/outline'
import React, { useState } from 'react'
import { adminApi } from '../../services/adminApi'
import { ADMIN_BUTTON_TEXTS, AdminErrorHandler } from '../../utils/admin-frontend-utils'
import { AdminErrorDisplay } from './admin-error-display'
import { AdminLoadingState } from './admin-loading-state'
import { Button } from './button'
import { Input } from './input'

interface AdminPasswordChangeModalProps {
    isOpen: boolean
    onClose: () => void
    token: string
}

const AdminPasswordChangeModal: React.FC<AdminPasswordChangeModalProps> = ({
    isOpen,
    onClose,
    token
}) => {
    const [formData, setFormData] = useState({
        current_password: '',
        new_password: '',
        confirm_password: ''
    })
    const [showPasswords, setShowPasswords] = useState({
        current: false,
        new: false,
        confirm: false
    })
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState(false)

    const handleInputChange = (field: keyof typeof formData) => (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData(prev => ({
            ...prev,
            [field]: e.target.value
        }))
        // Clear error when user starts typing
        if (error) setError(null)
    }

    const togglePasswordVisibility = (field: keyof typeof showPasswords) => {
        setShowPasswords(prev => ({
            ...prev,
            [field]: !prev[field]
        }))
    }

    const validateForm = (): string | null => {
        if (!formData.current_password) {
            return 'Current password is required'
        }
        if (!formData.new_password) {
            return 'New password is required'
        }
        if (formData.new_password.length < 8) {
            return 'New password must be at least 8 characters long'
        }
        if (!/[A-Z]/.test(formData.new_password)) {
            return 'New password must contain at least one uppercase letter'
        }
        if (!/[a-z]/.test(formData.new_password)) {
            return 'New password must contain at least one lowercase letter'
        }
        if (!/\d/.test(formData.new_password)) {
            return 'New password must contain at least one number'
        }
        if (formData.new_password !== formData.confirm_password) {
            return 'Password confirmation does not match'
        }
        if (formData.current_password === formData.new_password) {
            return 'New password must be different from current password'
        }
        return null
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        
        const validationError = validateForm()
        if (validationError) {
            setError(validationError)
            return
        }

        setLoading(true)
        AdminErrorHandler.clear(setError)

        const result = await AdminErrorHandler.handleAsync(
            async () => {
                const response = await adminApi.changeAdminPassword(token, formData)

                if (response.success) {
                    setSuccess(true)
                    return true
                } else {
                    throw new Error(response.message || 'Failed to change password')
                }
            },
            setError,
            'Change Admin Password'
        )

        setLoading(false)

        if (result) {
            // Reset form
            setFormData({
                current_password: '',
                new_password: '',
                confirm_password: ''
            })
            
            // Auto-close after 2 seconds
            setTimeout(() => {
                setSuccess(false)
                onClose()
            }, 2000)
        }
    }

    const handleClose = () => {
        if (!loading) {
            setFormData({
                current_password: '',
                new_password: '',
                confirm_password: ''
            })
            setError(null)
            setSuccess(false)
            onClose()
        }
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
                {/* Header */}
                <div className="p-6 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <KeyIcon className="h-6 w-6 text-eu-blue" />
                            <h3 className="text-lg font-semibold text-gray-900">Change Password</h3>
                        </div>
                        <Button
                            onClick={handleClose}
                            variant="ghost"
                            className="h-8 w-8 p-0"
                            disabled={loading}
                        >
                            <XMarkIcon className="h-4 w-4" />
                        </Button>
                    </div>
                    <p className="text-sm text-gray-600 mt-2">
                        Update your admin account password
                    </p>
                </div>

                {/* Content */}
                <div className="p-6">
                    {loading ? (
                        <AdminLoadingState message="Changing password..." />
                    ) : success ? (
                        <div className="text-center py-8">
                            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <span className="text-2xl">✅</span>
                            </div>
                            <h4 className="text-lg font-semibold text-gray-900 mb-2">Password Changed Successfully!</h4>
                            <p className="text-sm text-gray-600">Your admin password has been updated.</p>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-4">
                            {error && (
                                <AdminErrorDisplay
                                    title="Password Change Failed"
                                    message={error}
                                />
                            )}

                            {/* Current Password */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Current Password
                                </label>
                                <div className="relative">
                                    <Input
                                        type={showPasswords.current ? "text" : "password"}
                                        value={formData.current_password}
                                        onChange={handleInputChange('current_password')}
                                        placeholder="Enter your current password"
                                        className="pr-10"
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => togglePasswordVisibility('current')}
                                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                    >
                                        {showPasswords.current ? (
                                            <EyeSlashIcon className="h-4 w-4" />
                                        ) : (
                                            <EyeIcon className="h-4 w-4" />
                                        )}
                                    </button>
                                </div>
                            </div>

                            {/* New Password */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    New Password
                                </label>
                                <div className="relative">
                                    <Input
                                        type={showPasswords.new ? "text" : "password"}
                                        value={formData.new_password}
                                        onChange={handleInputChange('new_password')}
                                        placeholder="Enter your new password"
                                        className="pr-10"
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => togglePasswordVisibility('new')}
                                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                    >
                                        {showPasswords.new ? (
                                            <EyeSlashIcon className="h-4 w-4" />
                                        ) : (
                                            <EyeIcon className="h-4 w-4" />
                                        )}
                                    </button>
                                </div>
                                <div className="mt-2">
                                    <p className="text-xs text-gray-500">Password requirements:</p>
                                    <ul className="text-xs text-gray-500 mt-1 space-y-1">
                                        <li className={`flex items-center gap-1 ${formData.new_password.length >= 8 ? 'text-green-600' : ''}`}>
                                            <span>{formData.new_password.length >= 8 ? '✓' : '•'}</span>
                                            At least 8 characters
                                        </li>
                                        <li className={`flex items-center gap-1 ${/[A-Z]/.test(formData.new_password) ? 'text-green-600' : ''}`}>
                                            <span>{/[A-Z]/.test(formData.new_password) ? '✓' : '•'}</span>
                                            One uppercase letter
                                        </li>
                                        <li className={`flex items-center gap-1 ${/[a-z]/.test(formData.new_password) ? 'text-green-600' : ''}`}>
                                            <span>{/[a-z]/.test(formData.new_password) ? '✓' : '•'}</span>
                                            One lowercase letter
                                        </li>
                                        <li className={`flex items-center gap-1 ${/\d/.test(formData.new_password) ? 'text-green-600' : ''}`}>
                                            <span>{/\d/.test(formData.new_password) ? '✓' : '•'}</span>
                                            One number
                                        </li>
                                    </ul>
                                </div>
                            </div>

                            {/* Confirm Password */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Confirm New Password
                                </label>
                                <div className="relative">
                                    <Input
                                        type={showPasswords.confirm ? "text" : "password"}
                                        value={formData.confirm_password}
                                        onChange={handleInputChange('confirm_password')}
                                        placeholder="Confirm your new password"
                                        className="pr-10"
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => togglePasswordVisibility('confirm')}
                                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                    >
                                        {showPasswords.confirm ? (
                                            <EyeSlashIcon className="h-4 w-4" />
                                        ) : (
                                            <EyeIcon className="h-4 w-4" />
                                        )}
                                    </button>
                                </div>
                                {formData.confirm_password && formData.new_password !== formData.confirm_password && (
                                    <p className="text-xs text-red-500 mt-1">Passwords do not match</p>
                                )}
                            </div>

                            {/* Submit Buttons */}
                            <div className="flex gap-3 pt-4">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={handleClose}
                                    className="flex-1"
                                    disabled={loading}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    className="flex-1"
                                    disabled={loading || !formData.current_password || !formData.new_password || !formData.confirm_password}
                                >
                                    Change Password
                                </Button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    )
}

export default AdminPasswordChangeModal
