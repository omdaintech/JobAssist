/**
 * SecuritySection Component
 * 
 * Handles password management and security settings.
 * Supports both regular users and social media users.
 * 
 * @responsive
 * - Mobile (360-767px): Single column with stacked fields
 * - Tablet (768-1023px): Optimized form layout
 * - Desktop (1024px+): Full layout with enhanced spacing
 * 
 * @accessibility
 * - Touch targets: 48px (h-12 inputs)
 * - ARIA labels: Complete via Label components
 * - Keyboard navigation: Full support
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/services/api';
import type { PasswordData } from '../types';

interface SecuritySectionProps {
  onError: (message: string) => void;
  onSuccess: (message: string) => void;
}

export const SecuritySection: React.FC<SecuritySectionProps> = ({
  onError,
  onSuccess
}) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [changingPassword, setChangingPassword] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordData, setPasswordData] = useState<PasswordData>({
    current_password: '',
    new_password: '',
    confirm_password: ''
  });

  const isSocialMediaUser = user?.auth_provider === 'firebase' || user?.auth_provider === 'google';
  const hasPassword = user?.has_password === true;

  const handlePasswordChange = async () => {
    if (!passwordData.current_password || !passwordData.new_password) {
      onError('Please fill in all password fields');
      return;
    }

    if (passwordData.new_password !== passwordData.confirm_password) {
      onError('New passwords do not match');
      return;
    }

    if (passwordData.new_password.length < 6) {
      onError('New password must be at least 6 characters long');
      return;
    }

    setSavingPassword(true);

    try {
      const response = await api.user.changePassword({
        current_password: passwordData.current_password,
        new_password: passwordData.new_password,
        confirm_password: passwordData.confirm_password
      });

      if (response.data.success) {
        onSuccess('Password changed successfully');
        setPasswordData({ current_password: '', new_password: '', confirm_password: '' });
        setChangingPassword(false);
      } else {
        if (response.data.message?.includes('Social media users must use')) {
          onError('Social media users need to create a password first. Please use the "Create Password via Forgot Password" button above.');
        } else {
          onError(response.data.message || 'Failed to change password');
        }
      }
    } catch (error: any) {
      console.error('Failed to change password:', error);
      if (error.response?.data?.detail?.includes('Social media users must use')) {
        onError('Social media users need to create a password first. Please use the "Create Password via Forgot Password" button above.');
      } else {
        onError(error.response?.data?.message || error.response?.data?.detail || 'Failed to change password');
      }
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="space-y-4 md:space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base md:text-lg lg:text-xl">Password & Security</CardTitle>
              <p className="text-xs md:text-sm text-gray-600 mt-1">Manage your account security options</p>
            </div>
            {hasPassword && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setChangingPassword(!changingPassword)}
              >
                {changingPassword ? 'Cancel' : 'Change Password'}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4 md:space-y-6">
          {!hasPassword ? (
            // Social media user - show create password message
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 md:p-6">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                  <svg className="w-5 h-5 md:w-6 md:h-6 text-blue-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-blue-900 mb-2 text-sm md:text-base">Create a Password for Email Login</h4>
                  <p className="text-xs md:text-sm text-blue-700 mb-3 md:mb-4">
                    You signed up using {user?.auth_provider === 'firebase' ? 'Google' : 'social media'}. 
                    To enable email and password login as an additional option, you can create a password using our secure forgot password process.
                  </p>
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="bg-white hover:bg-blue-50 text-blue-700 border-blue-300"
                    onClick={() => navigate('/forgot-password')}
                  >
                    Create Password via Forgot Password →
                  </Button>
                  <p className="text-[10px] md:text-xs text-blue-600 mt-2">
                    Don't worry - this won't affect your current {user?.auth_provider === 'firebase' ? 'Google' : 'social'} login method.
                  </p>
                </div>
              </div>
            </div>
          ) : changingPassword ? (
            // Regular user - show password change form
            <div className="space-y-3 md:space-y-4">
              <div className="space-y-2">
                <Label htmlFor="current_password" className="text-xs md:text-sm font-medium">Current Password</Label>
                <Input
                  id="current_password"
                  type="password"
                  value={passwordData.current_password}
                  onChange={(e) => setPasswordData({ ...passwordData, current_password: e.target.value })}
                  placeholder="Enter current password"
                  className="h-12"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="new_password" className="text-xs md:text-sm font-medium">New Password</Label>
                <Input
                  id="new_password"
                  type="password"
                  value={passwordData.new_password}
                  onChange={(e) => setPasswordData({ ...passwordData, new_password: e.target.value })}
                  placeholder="Enter new password"
                  className="h-12"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm_password" className="text-xs md:text-sm font-medium">Confirm New Password</Label>
                <Input
                  id="confirm_password"
                  type="password"
                  value={passwordData.confirm_password}
                  onChange={(e) => setPasswordData({ ...passwordData, confirm_password: e.target.value })}
                  placeholder="Confirm new password"
                  className="h-12"
                />
              </div>

              <div className="flex gap-2 md:gap-3 pt-4">
                <Button
                  onClick={handlePasswordChange}
                  disabled={savingPassword}
                  className="flex-1"
                >
                  {savingPassword ? 'Updating...' : 'Update Password'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setChangingPassword(false);
                    setPasswordData({ current_password: '', new_password: '', confirm_password: '' });
                  }}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            // Regular user - show password status
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 md:p-4">
              <div className="flex items-center space-x-2">
                <svg className="w-4 h-4 md:w-5 md:h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-xs md:text-sm font-medium text-green-800">Password is set</span>
              </div>
              <p className="text-xs md:text-sm text-green-700 mt-1">
                Your account is secured with a password. You can change it anytime using the button above.
              </p>
            </div>
          )}

          {/* Account Security Info */}
          <div className="border-t pt-4 md:pt-6">
            <h5 className="font-medium text-gray-900 mb-3 text-sm md:text-base">Account Security</h5>
            <div className="space-y-2 md:space-y-3 text-xs md:text-sm text-gray-600">
              <div className="flex items-center justify-between">
                <span>Email Verified</span>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  user?.email_verified 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {user?.email_verified ? 'Verified' : 'Not Verified'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Login Method</span>
                <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  {user?.auth_provider === 'firebase' ? 'Google + Email' : 
                   user?.auth_provider === 'google' ? 'Google' : 
                   hasPassword ? 'Email & Password' : 'Email Only'}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

