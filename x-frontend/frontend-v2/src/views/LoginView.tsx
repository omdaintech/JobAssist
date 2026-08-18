import { SocialLoginButtons } from '@/components/auth/SocialLoginButtons';
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Label, LoadingSpinner, PasswordInput } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import ReCAPTCHA from 'react-google-recaptcha';
import { appConfig } from '@/config/app';

export const LoginView: React.FC = () => {
  const { login, isLoading, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    email: '',
    password: ''
  });

  const [errorMessage, setErrorMessage] = useState('');
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [recaptchaToken, setRecaptchaToken] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  // Set page title
  useEffect(() => {
    document.title = 'Login | One-CEFR';
  }, []);

  // Redirect if authenticated (handles both traditional and Firebase auth)
  useEffect(() => {
    if (isAuthenticated) {
      // Small delay to ensure state is fully updated
      setTimeout(() => {
        navigate('/dashboard', { replace: true });
      }, 50);
    }
  }, [isAuthenticated, navigate]);

  // Auto-focus email field when form is shown
  useEffect(() => {
    if (showEmailForm) {
      const emailField = document.getElementById('email-input');
      if (emailField) {
        emailField.focus();
      }
    }
  }, [showEmailForm]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.email || !form.password) {
      setErrorMessage('Please fill in both email and password fields 😊');
      return;
    }

    if (!recaptchaToken) {
      setErrorMessage('Please complete the reCAPTCHA verification');
      return;
    }

    setErrorMessage('');

    try {
      const result = await login({
        email: form.email,
        password: form.password,
        captcha_token: recaptchaToken
      });

      if (!result.success) {
        setErrorMessage(result.message || 'Login didn\'t work. Let\'s try again!');
        // Reset reCAPTCHA on failed login
        setRecaptchaToken(null);
      }
    } catch (error) {
      setErrorMessage('Something went wrong. Please give it another try!');
      console.error('Login error:', error);
      // Reset reCAPTCHA on error
      setRecaptchaToken(null);
    }
  };

  const handleSocialLoginSuccess = () => {
    // Don't redirect here - let the useEffect handle it when isAuthenticated becomes true
    // This allows the Firebase auth flow to complete properly
  };

  const handleSocialLoginError = (error: string) => {
    setErrorMessage(error);
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-white/95 backdrop-blur-sm shadow-xl border-0">
        <CardHeader className="text-center space-y-2">
          <CardTitle className="text-2xl font-bold text-gray-900 flex items-center justify-center gap-2">
            <span className="text-2xl">🔐</span>
            Sign In
          </CardTitle>
          <CardDescription className="text-gray-600">
            Enter your credentials to start your English assessment journey
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Social Login Buttons */}
          <SocialLoginButtons
            onSuccess={handleSocialLoginSuccess}
            onError={handleSocialLoginError}
          />

          {/* Email/Password Form - Hidden by default to encourage social login */}
          {!showEmailForm ? (
            <div className="text-center border-t border-gray-200 pt-4">
              <button
                type="button"
                onClick={() => setShowEmailForm(true)}
                className="text-sm text-gray-600 hover:text-gray-800 underline transition-colors"
              >
                Use email instead?
              </button>
              <p className="text-xs text-gray-400 mt-2">
                ✨ Social login is faster and more secure
              </p>
            </div>
          ) : (
            <div className="border-t border-gray-200 pt-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-gray-700">Sign in with email</h3>
                <button
                  type="button"
                  onClick={() => {
                    setShowEmailForm(false);
                    setErrorMessage('');
                  }}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                  title="Close email form"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email-input" className="text-sm font-medium text-gray-700">
                    Email
                  </Label>
                  <Input
                    id="email-input"
                    name="email"
                    type="email"
                    placeholder="Enter your email"
                    value={form.email}
                    onChange={handleInputChange}
                    disabled={isLoading}
                    autoComplete="email"
                    className="h-11 border-2 border-gray-200 focus:border-eu-blue focus:ring-eu-blue/20 focus:ring-2 transition-all"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password-input" className="text-sm font-medium text-gray-700">
                    Password
                  </Label>
                  <PasswordInput
                    id="password-input"
                    name="password"
                    value={form.password}
                    onChange={handleInputChange}
                    placeholder="Enter your password"
                    showPassword={showPassword}
                    onToggle={() => setShowPassword(!showPassword)}
                    disabled={isLoading}
                    autoComplete="current-password"
                    className="h-11 border-2 border-gray-200 focus:border-eu-blue focus:ring-eu-blue/20 focus:ring-2 transition-all"
                    required
                  />
                  <div className="text-right">
                    <Link
                      to="/forgot-password"
                      className="text-sm text-eu-blue hover:text-eu-blue/80 hover:underline transition-colors"
                    >
                      Forgot your password?
                    </Link>
                  </div>
                </div>

                {/* reCAPTCHA */}
                <div className="space-y-2">
                  <div className="flex justify-center">
                    <ReCAPTCHA
                      sitekey={appConfig.recaptcha.siteKey}
                      onChange={(token) => setRecaptchaToken(token)}
                      onExpired={() => setRecaptchaToken(null)}
                      theme="light"
                    />
                  </div>
                  {errorMessage && errorMessage.includes('reCAPTCHA') && (
                    <p className="text-sm text-red-600 text-center">
                      {errorMessage}
                    </p>
                  )}
                </div>

                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-eu-blue hover:bg-eu-blue/90 text-white h-12 font-semibold text-base transition-all hover:shadow-lg hover:-translate-y-0.5 disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none"
                >
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <LoadingSpinner size="sm" />
                      Signing you in...
                    </div>
                  ) : (
                    'Welcome Back! 👋'
                  )}
                </Button>
              </form>


            </div>
          )}

          {errorMessage && showEmailForm && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {errorMessage}
            </div>
          )}

          <div className="text-center space-y-2 text-sm text-gray-600">
            <p>
              Don't have an account?{' '}
              <Link
                to="/signup"
                className="text-eu-blue hover:text-eu-blue/80 font-medium hover:underline transition-colors"
              >
                Create one here
              </Link>
            </p>
            <Link
              to="/"
              className="text-eu-blue hover:text-eu-blue/80 font-medium hover:underline transition-colors"
            >
              ← Back to Home
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
