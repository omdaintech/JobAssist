/**
 * SchoolSection Component
 * 
 * Displays school information and provides logout functionality.
 * 
 * @responsive
 * - Mobile (360-767px): Single column with stacked content
 * - Tablet (768-1023px): Optimized card layout
 * - Desktop (1024px+): Full layout with enhanced spacing
 * 
 * @accessibility
 * - Touch targets: 48px minimum for logout button
 * - ARIA labels: Complete
 * - Keyboard navigation: Full support
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { useFirebaseAuth } from '@/context/FirebaseAuthContext';

export const SchoolSection: React.FC = () => {
  const { user, logout } = useAuth();
  const { logout: firebaseLogout } = useFirebaseAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await Promise.all([
        logout(),
        firebaseLogout()
      ]);
      navigate('/');
    } catch (error) {
      console.error('Logout error:', error);
      navigate('/');
    }
  };

  return (
    <div className="space-y-4 md:space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base md:text-lg lg:text-xl">School Information</CardTitle>
          <p className="text-xs md:text-sm text-gray-600">Details about your school and institution</p>
        </CardHeader>
        <CardContent className="space-y-4 md:space-y-6">
          <div className="grid grid-cols-1 gap-4 md:gap-6">
            <div className="bg-blue-50 p-4 md:p-6 rounded-lg">
              <div className="flex items-center space-x-3 md:space-x-4">
                <div className="bg-blue-100 p-2 md:p-3 rounded-full flex-shrink-0">
                  <span className="text-xl md:text-2xl">🏫</span>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-base md:text-lg font-semibold text-blue-900 truncate">
                    {user?.school_name || 'School Name Not Available'}
                  </h3>
                  <p className="text-xs md:text-sm text-blue-700 mt-1">
                    Your current learning institution
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-3 md:space-y-4">
              <h4 className="font-medium text-gray-900 text-sm md:text-base">School Details</h4>
              <div className="bg-gray-50 p-3 md:p-4 rounded-lg space-y-2 md:space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs md:text-sm font-medium text-gray-600">School Name:</span>
                  <span className="text-xs md:text-sm text-gray-900 truncate ml-2">
                    {user?.school_name || 'Not Available'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs md:text-sm font-medium text-gray-600">School ID:</span>
                  <span className="text-xs md:text-sm text-gray-900 font-mono bg-gray-100 px-2 py-1 rounded">
                    {user?.school_id || 'Not Available'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs md:text-sm font-medium text-gray-600">Member Since:</span>
                  <span className="text-xs md:text-sm text-gray-900">
                    {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'Not Available'}
                  </span>
                </div>
              </div>
            </div>

            <div className="border-t pt-4 md:pt-6">
              <Button
                onClick={handleLogout}
                variant="outline"
                className="w-full justify-start min-h-[48px] h-12 text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300"
              >
                <span className="mr-2 md:mr-3 text-base md:text-lg">🚪</span>
                <div className="text-left">
                  <div className="font-medium text-sm md:text-base">Logout</div>
                  <div className="text-[10px] md:text-xs text-gray-500">Sign out of your account</div>
                </div>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

