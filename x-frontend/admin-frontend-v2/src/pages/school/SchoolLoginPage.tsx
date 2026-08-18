/**
 * School Admin Login Page
 * Simple, clean login interface for school administrators
 */

import React, { useState, useRef } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { useSchoolAuth } from '../../context/SchoolAuthContext';
import ReCAPTCHA from 'react-google-recaptcha';
import appConfig from '@/config/appConfig';

const SchoolLoginPage: React.FC = () => {
  const { login, isAuthenticated, loading } = useSchoolAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [recaptchaToken, setRecaptchaToken] = useState<string | null>(null);
  const recaptchaRef = useRef<ReCAPTCHA | null>(null);
  const captchaSiteKey = appConfig.recaptcha.siteKey;
  const isCaptchaEnabled = Boolean(captchaSiteKey);

  // Redirect if already authenticated
  if (isAuthenticated) {
    return <Navigate to="/school/dashboard" replace />;
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
    // Clear error when user starts typing
    if (error) setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (isCaptchaEnabled && !recaptchaToken) {
      setError('Please complete the reCAPTCHA verification');
      return;
    }

    setIsLoggingIn(true);

    try {
      const result = await login(
        formData.email,
        formData.password,
        recaptchaToken ?? undefined,
        rememberMe,
      );
      if (!result.success) {
        setError(result.message);
        if (isCaptchaEnabled) {
          recaptchaRef.current?.reset();
          setRecaptchaToken(null);
        }
      }
    } catch (error) {
      setError('An unexpected error occurred. Please try again.');
      if (isCaptchaEnabled) {
        recaptchaRef.current?.reset();
        setRecaptchaToken(null);
      }
    } finally {
      setIsLoggingIn(false);
      if (isCaptchaEnabled) {
        recaptchaRef.current?.reset();
        setRecaptchaToken(null);
      }
    }
  };

  const handleRecaptchaChange = (token: string | null) => {
    setRecaptchaToken(token);
    if (token) {
      setError('');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="rounded-2xl border border-slate-200 bg-white px-8 py-10 shadow-xl sm:px-10">
          <div className="flex flex-col items-center text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
              <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <h2 className="mt-6 text-3xl font-semibold text-slate-900">School Admin Portal</h2>
            <p className="mt-2 text-sm text-slate-500">
              Sign in to manage your school's users and analytics
            </p>
          </div>

          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div className="space-y-1">
                <label htmlFor="email" className="block text-sm font-medium text-slate-600">
                  Email address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="block w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-900 shadow-sm transition focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"
                  placeholder="name@school.com"
                  value={formData.email}
                  onChange={handleInputChange}
                  disabled={isLoggingIn}
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="password" className="block text-sm font-medium text-slate-600">
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  className="block w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-900 shadow-sm transition focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={handleInputChange}
                  disabled={isLoggingIn}
                />
              </div>

              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  disabled={isLoggingIn}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-100 focus:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-slate-600">
                  Remember me for 30 days
                </label>
              </div>
            </div>

            <div className="space-y-4">{isCaptchaEnabled && (
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <div className="flex justify-center">
                    <ReCAPTCHA
                      ref={recaptchaRef}
                      sitekey={captchaSiteKey}
                      onChange={handleRecaptchaChange}
                      onErrored={() => {
                        setRecaptchaToken(null);
                        setError('reCAPTCHA verification failed. Please try again.');
                      }}
                      onExpired={() => {
                        setRecaptchaToken(null);
                        setError('reCAPTCHA expired. Please try again.');
                      }}
                    />
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoggingIn}
                className="inline-flex w-full items-center justify-center rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isLoggingIn ? (
                  <>
                    <svg className="-ml-1 mr-3 h-5 w-5 animate-spin text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Signing in...
                  </>
                ) : (
                  'Sign in'
                )}
              </button>
            </div>

            <div className="pt-6 text-center">
              <p className="text-xs text-slate-500">Need help? Contact your system administrator</p>
              <div className="mt-4 border-t border-slate-200 pt-4">
                <p className="mb-2 text-xs text-slate-500">Are you a system administrator?</p>
                <Link
                  to="/login"
                  className="inline-flex items-center text-xs font-medium text-blue-600 transition hover:text-blue-700"
                >
                  ← Click here for admin login
                </Link>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default SchoolLoginPage;
