import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Label, LoadingSpinner, PasswordInput } from '@/components/ui';
import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { authAPI } from '@/services/api';

export const ResetPasswordView: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const token = searchParams.get('token');
  const email = searchParams.get('email');

  const [form, setForm] = useState({
    newPassword: '',
    confirmPassword: ''
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isValidating, setIsValidating] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [tokenValid, setTokenValid] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Set page title
  useEffect(() => {
    document.title = 'Reset Password | One-CEFR';
  }, []);

  // Validate token on component mount
  useEffect(() => {
    const validateToken = async () => {
      if (!token || !email) {
        setErrorMessage('Invalid reset link. Please request a new password reset.');
        setIsValidating(false);
        return;
      }

      try {
        const response = await authAPI.validateResetToken(email, token);
        const result = response.data;
        if (result.success) {
          setTokenValid(true);
        } else {
          setErrorMessage(result.message || 'Invalid or expired reset token.');
        }
      } catch (error) {
        setErrorMessage('Invalid or expired reset token. Please request a new password reset.');
        console.error('Token validation error:', error);
      } finally {
        setIsValidating(false);
      }
    };

    validateToken();
  }, [token, email]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.newPassword || !form.confirmPassword) {
      setErrorMessage('Please fill in both password fields');
      return;
    }

    if (form.newPassword.length < 6) {
      setErrorMessage('Password must be at least 6 characters long');
      return;
    }

    if (form.newPassword !== form.confirmPassword) {
      setErrorMessage('Passwords do not match');
      return;
    }

    setErrorMessage('');
    setIsLoading(true);

    try {
      const response = await authAPI.resetPassword({
        email: email!,
        reset_token: token!,
        new_password: form.newPassword,
        confirm_password: form.confirmPassword
      });
      const result = response.data;

      if (result.success) {
        setSuccessMessage(result.message);
        // Redirect to login after 3 seconds
        setTimeout(() => {
          navigate('/login');
        }, 3000);
      } else {
        setErrorMessage(result.message || 'Password reset failed');
      }
    } catch (error) {
      setErrorMessage('Password reset failed. Please try again.');
      console.error('Password reset error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isValidating) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-white/95 backdrop-blur-sm shadow-xl border-0">
          <CardContent className="flex flex-col items-center justify-center py-12 space-y-4">
            <LoadingSpinner size="lg" />
            <p className="text-gray-600">Validating reset token...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-white/95 backdrop-blur-sm shadow-xl border-0">
        <CardHeader className="text-center space-y-2">
          <CardTitle className="text-2xl font-bold text-gray-900 flex items-center justify-center gap-2">
            <span className="text-2xl">🔐</span>
            Reset Password
          </CardTitle>
          <CardDescription className="text-gray-600">
            {tokenValid ? 'Enter your new password below' : 'Reset token validation failed'}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {successMessage ? (
            <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-4 rounded-lg text-center space-y-3">
              <div className="text-2xl">✅</div>
              <p className="font-medium">{successMessage}</p>
              <p className="text-sm text-green-600">
                Redirecting to login page in 3 seconds...
              </p>
              <div className="pt-2">
                <Link
                  to="/login"
                  className="text-eu-blue hover:text-eu-blue/80 font-medium hover:underline transition-colors"
                >
                  Go to Login Now
                </Link>
              </div>
            </div>
          ) : !tokenValid ? (
            <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-4 rounded-lg text-center space-y-3">
              <div className="text-2xl">❌</div>
              <p className="font-medium">{errorMessage}</p>
              <div className="pt-2 space-y-2">
                <Link
                  to="/forgot-password"
                  className="text-eu-blue hover:text-eu-blue/80 font-medium hover:underline transition-colors block"
                >
                  Request New Reset Link
                </Link>
                <Link
                  to="/login"
                  className="text-gray-600 hover:text-gray-800 hover:underline transition-colors block"
                >
                  Back to Login
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-password-input" className="text-sm font-medium text-gray-700">
                  New Password
                </Label>
                <PasswordInput
                  id="new-password-input"
                  name="newPassword"
                  placeholder="Enter your new password"
                  value={form.newPassword}
                  onChange={handleInputChange}
                  showPassword={showPassword}
                  onToggle={() => setShowPassword(!showPassword)}
                  disabled={isLoading}
                  autoComplete="new-password"
                  className="h-11 border-2 border-gray-200 focus:border-eu-blue focus:ring-eu-blue/20 focus:ring-2 transition-all"
                  required
                />
                <p className="text-xs text-gray-500">Must be at least 6 characters long</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-password-input" className="text-sm font-medium text-gray-700">
                  Confirm New Password
                </Label>
                <PasswordInput
                  id="confirm-password-input"
                  name="confirmPassword"
                  placeholder="Confirm your new password"
                  value={form.confirmPassword}
                  onChange={handleInputChange}
                  showPassword={showConfirmPassword}
                  onToggle={() => setShowConfirmPassword(!showConfirmPassword)}
                  disabled={isLoading}
                  autoComplete="new-password"
                  className="h-11 border-2 border-gray-200 focus:border-eu-blue focus:ring-eu-blue/20 focus:ring-2 transition-all"
                  required
                />
              </div>

              {errorMessage && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {errorMessage}
                </div>
              )}

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full bg-eu-blue hover:bg-eu-blue/90 text-white h-12 font-semibold text-base transition-all hover:shadow-lg hover:-translate-y-0.5 disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none"
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <LoadingSpinner size="sm" />
                    Resetting Password...
                  </div>
                ) : (
                  'Reset Password'
                )}
              </Button>
            </form>
          )}

          {tokenValid && !successMessage && (
            <div className="text-center space-y-2 text-sm text-gray-600 border-t border-gray-200 pt-4">
              <Link
                to="/login"
                className="text-eu-blue hover:text-eu-blue/80 font-medium hover:underline transition-colors"
              >
                Back to Login
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
