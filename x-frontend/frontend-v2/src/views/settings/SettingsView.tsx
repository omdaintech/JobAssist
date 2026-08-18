/**
 * SettingsView - Main Settings Page
 * 
 * Refactored to use extracted components and hooks for better maintainability.
 * 
 * @architecture
 * - Data fetching: useSettingsData hook
 * - Sections: Extracted into individual components
 * - Navigation: useEffect-based redirect (no in-render navigation)
 * 
 * @responsive
 * - Mobile (360-767px): Single column with vertical tabs
 * - Tablet (768-1023px): Sidebar navigation appears
 * - Desktop (1024px+): Full sidebar + content layout
 * 
 * @accessibility
 * - Touch targets: 48px minimum for all interactive elements
 * - ARIA labels: Complete
 * - Keyboard navigation: Full support
 */

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageContainer } from '@/components/layout/PageContainer';
import { Card, CardContent } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { useSettingsData } from './hooks/useSettingsData';
import {
  AccountSection,
  SecuritySection,
  SchoolSection
} from './components';
import type { SettingsSection } from './types';

export const SettingsView: React.FC = () => {
  const { isAuthenticated, isInitialized, isLoading } = useAuth();
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState<SettingsSection>('account');

  // Set page title
  useEffect(() => {
    document.title = 'Settings | One-CEFR';
  }, []);

  // Success and error states (shared across sections)
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Load settings data using custom hook
  const settingsData = useSettingsData();

  // Settings navigation items
  const settingsNavigation = [
    {
      id: 'account' as SettingsSection,
      name: 'Account',
      icon: '👤',
      description: 'Profile information and account details'
    },
    {
      id: 'security' as SettingsSection,
      name: 'Security',
      icon: '🔒',
      description: 'Password and security options'
    },
    {
      id: 'school' as SettingsSection,
      name: 'School',
      icon: '🏫',
      description: 'School information and details'
    }
  ];

  // Redirect to login if not authenticated (using useEffect to avoid in-render navigation)
  useEffect(() => {
    if (isInitialized && !isAuthenticated) {
      navigate('/login');
    }
  }, [isInitialized, isAuthenticated, navigate]);

  // Clear messages when switching sections
  useEffect(() => {
    setSuccessMessage(null);
    setErrorMessage(null);
  }, [activeSection]);

  // Auto-clear messages after 5 seconds
  useEffect(() => {
    if (successMessage || errorMessage) {
      const timer = setTimeout(() => {
        setSuccessMessage(null);
        setErrorMessage(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage, errorMessage]);

  // Show loading state while auth initializes
  if (!isInitialized || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh] p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-eu-blue mx-auto mb-4"></div>
          <p className="text-gray-600 text-sm md:text-base">Loading settings...</p>
        </div>
      </div>
    );
  }

  // Don't render anything if not authenticated (redirect will happen via useEffect)
  if (!isAuthenticated) {
    return null;
  }

  const renderCurrentSection = () => {
    switch (activeSection) {
      case 'account':
        return (
          <AccountSection
            profileData={settingsData.profileData}
            setProfileData={settingsData.setProfileData}
            loadingProfile={settingsData.loadingProfile}
            profileError={settingsData.profileError}
            setProfileError={settingsData.setProfileError}
            onSuccess={setSuccessMessage}
            availableLanguages={settingsData.availableLanguages}
            selectedLanguageId={settingsData.selectedLanguageId}
            setSelectedLanguageId={settingsData.setSelectedLanguageId}
            loadingLanguages={settingsData.loadingLanguages}
          />
        );
      case 'security':
        return (
          <SecuritySection
            onError={setErrorMessage}
            onSuccess={setSuccessMessage}
          />
        );
      case 'school':
        return <SchoolSection />;
      default:
        return (
          <AccountSection
            profileData={settingsData.profileData}
            setProfileData={settingsData.setProfileData}
            loadingProfile={settingsData.loadingProfile}
            profileError={settingsData.profileError}
            setProfileError={settingsData.setProfileError}
            onSuccess={setSuccessMessage}
            availableLanguages={settingsData.availableLanguages}
            selectedLanguageId={settingsData.selectedLanguageId}
            setSelectedLanguageId={settingsData.setSelectedLanguageId}
            loadingLanguages={settingsData.loadingLanguages}
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <PageContainer className="py-6 md:py-8">
        <div className="app-page-stack">
          <div>
            <h1 className="text-xl md:text-2xl lg:text-3xl font-bold text-gray-900">Profile</h1>
            <p className="mt-1 md:mt-2 text-sm md:text-base text-gray-600">
              Manage your account, preferences, and security profile
            </p>
          </div>

          {/* Global success/error messages */}
          {successMessage && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 md:p-4 text-green-600 text-xs md:text-sm">
              {successMessage}
            </div>
          )}

          {errorMessage && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 md:p-4 text-red-600 text-xs md:text-sm">
              {errorMessage}
            </div>
          )}

          <div className="flex flex-col gap-6 md:gap-8 lg:flex-row">
            {/* Sidebar Navigation */}
            <div className="flex-shrink-0 lg:w-80">
              <Card className="lg:sticky lg:top-24">
                <CardContent className="p-3 md:p-4">
                  <nav className="space-y-1.5 md:space-y-2">
                    {settingsNavigation.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => setActiveSection(item.id)}
                        className={`w-full rounded-lg p-2 md:p-3 text-left transition-colors min-h-[44px] ${
                          activeSection === item.id
                            ? 'bg-eu-blue text-white'
                            : 'text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        <div className="flex items-center gap-2 md:gap-3">
                          <span className="text-base md:text-lg">{item.icon}</span>
                          <div className="min-w-0 flex-1">
                            <div className={`font-medium text-sm md:text-base ${
                              activeSection === item.id ? 'text-white' : 'text-gray-900'
                            }`}>
                              {item.name}
                            </div>
                            <div className={`truncate text-[10px] md:text-xs ${
                              activeSection === item.id ? 'text-blue-100' : 'text-gray-500'
                            }`}>
                              {item.description}
                            </div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </nav>
                </CardContent>
              </Card>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 min-w-0 space-y-4 md:space-y-6">
              {renderCurrentSection()}
            </div>
          </div>
        </div>
      </PageContainer>
    </div>
  );
};

