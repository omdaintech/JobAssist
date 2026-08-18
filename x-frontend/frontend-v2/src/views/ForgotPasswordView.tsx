import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Label, LoadingSpinner } from '@/components/ui';
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authAPI } from '@/services/api';
import ReCAPTCHA from 'react-google-recaptcha';
import { appConfig } from '@/config/app';

export const ForgotPasswordView: React.FC = () => {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    email: ''
  });

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [recaptchaToken, setRecaptchaToken] = useState<string | null>(null);

  // Set page title
  useEffect(() => {
    document.title = 'Forgot Password | Lingali';
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.email) {
      setErrorMessage('Please enter your email address');
      return;
    }

    if (!recaptchaToken) {
      setErrorMessage('Please complete the reCAPTCHA verification');
      return;
    }

    setErrorMessage('');
    setSuccessMessage('');
    setIsLoading(true);

    try {
      const response = await authAPI.forgotPassword(form.email, recaptchaToken);
      const result = response.data;

      if (result.success) {
        setSuccessMessage(result.message);
        // Clear form
        setForm({ email: '' });
        setRecaptchaToken(null);
      } else {
        setErrorMessage(result.message || 'Password reset request failed');
        // Reset reCAPTCHA on failed request
        setRecaptchaToken(null);
      }
    } catch (error) {
      setErrorMessage('Something went wrong. Please try again.');
      console.error('Forgot password error:', error);
      // Reset reCAPTCHA on error
      setRecaptchaToken(null);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-white/95 backdrop-blur-sm shadow-xl border-0">
        <CardHeader className="text-center space-y-2">
          <CardTitle className="text-2xl font-bold text-gray-900 flex items-center justify-center gap-2">
            <span className="text-2xl">🔑</span>
            Forgot Password
          </CardTitle>
          <CardDescription className="text-gray-600">
            Enter your email address and we'll send you instructions to reset your password
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {successMessage ? (
            <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-4 rounded-lg text-center space-y-3">
              <div className="text-2xl">📧</div>
              <p className="font-medium">{successMessage}</p>
              <p className="text-sm text-green-600">
                Please check your email inbox (and spam folder) for reset instructions.
              </p>
              <div className="pt-2">
                <Link
                  to="/login"
                  className="text-eu-blue hover:text-eu-blue/80 font-medium hover:underline transition-colors"
                >
                  Back to Login
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email-input" className="text-sm font-medium text-gray-700">
                  Email Address
                </Label>
                <Input
                  id="email-input"
                  name="email"
                  type="email"
                  placeholder="Enter your email address"
                  value={form.email}
                  onChange={handleInputChange}
                  disabled={isLoading}
                  autoComplete="email"
                  autoFocus
                  className="h-11 border-2 border-gray-200 focus:border-eu-blue focus:ring-eu-blue/20 focus:ring-2 transition-all"
                  required
                />
              </div>

              {errorMessage && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {errorMessage}
                </div>
              )}

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
                    Sending Reset Instructions...
                  </div>
                ) : (
                  'Send Reset Instructions'
                )}
              </Button>
            </form>
          )}

          <div className="text-center space-y-2 text-sm text-gray-600 border-t border-gray-200 pt-4">
            <p>
              Remember your password?{' '}
              <Link
                to="/login"
                className="text-eu-blue hover:text-eu-blue/80 font-medium hover:underline transition-colors"
              >
                Sign in here
              </Link>
            </p>
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
              className="text-eu-blue hover:text-eu-blue/80 font-medium hover:underline transition-colors block"
            >
              ← Back to Home
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
