import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PasswordInput } from '@/components/ui/password-input';
import { CheckCircle, AlertCircle } from 'lucide-react';
import ReCAPTCHA from 'react-google-recaptcha';
import { api } from '@/services/api';
import { appConfig } from '@/config/app';
import { SocialLoginButtons } from '@/components/auth/SocialLoginButtons';

export const SignupView: React.FC = () => {
  // Set page title
  useEffect(() => {
    document.title = 'Sign Up | Lingali';
  }, []);

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: ''
  });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isLoading, setIsLoading] = useState(false);
  const [recaptchaToken, setRecaptchaToken] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    if (!formData.firstName) {
      newErrors.firstName = 'First name is required';
    }

    if (!formData.lastName) {
      newErrors.lastName = 'Last name is required';
    }

    if (!recaptchaToken) {
      newErrors.recaptcha = 'Please complete the reCAPTCHA verification';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setErrors({});

    try {
      await api.auth.signup({
        email: formData.email,
        password: formData.password,
        confirm_password: formData.confirmPassword,
        captcha_token: recaptchaToken!
      });

      // Show success message instead of redirecting
      setSuccessMessage(
        '🎉 Account created! Check your email to verify and unlock:\n\n' +
        '✅ 10 FREE trial credits (worth 5 practice sessions)\n' +
        '✅ Full AI feedback on your German skills\n' +
        '✅ No credit card required\n\n' +
        'Can\'t find the email? Check your spam folder or contact support.'
      );
      setShowSuccess(true);
      
      // Reset form
      setFormData({
        email: '',
        password: '',
        confirmPassword: '',
        firstName: '',
        lastName: ''
      });
      setRecaptchaToken(null);
      
    } catch (error: any) {
      console.error('Signup error:', error);
      setErrors({ 
        submit: error.response?.data?.detail || 'Signup failed. Please try again.' 
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRecaptchaChange = (token: string | null) => {
    setRecaptchaToken(token);
    if (token && errors.recaptcha) {
      setErrors(prev => ({ ...prev, recaptcha: '' }));
    }
  };

  // Show success state
  if (showSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <CardTitle className="text-2xl text-green-700">Account Created!</CardTitle>
            <CardDescription className="text-green-600">
              Welcome to Lingali
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <div className="border border-green-200 bg-green-50 rounded-lg p-6 space-y-4">
              <div className="flex items-start justify-center space-x-3">
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                <p className="text-green-800 font-semibold text-left">
                  🎉 Account created! Check your email to verify and unlock:
                </p>
              </div>
              
              <div className="bg-white border border-green-200 rounded-lg p-4 text-left space-y-2">
                <p className="text-green-800 text-sm flex items-start gap-2">
                  <span className="flex-shrink-0">✅</span>
                  <span><strong>10 FREE trial credits</strong> (worth 5 practice sessions)</span>
                </p>
                <p className="text-green-800 text-sm flex items-start gap-2">
                  <span className="flex-shrink-0">✅</span>
                  <span><strong>Full AI feedback</strong> on your German skills</span>
                </p>
                <p className="text-green-800 text-sm flex items-start gap-2">
                  <span className="flex-shrink-0">✅</span>
                  <span><strong>No credit card required</strong></span>
                </p>
              </div>

              <p className="text-sm text-green-700 bg-green-100 p-3 rounded">
                💡 Can't find the email? Check your spam folder or contact support.
              </p>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-3">
            <Link to="/login" className="w-full">
              <Button className="w-full bg-blue-600 hover:bg-blue-700">
                Go to Login
              </Button>
            </Link>
            <Link to="/" className="w-full">
              <Button variant="outline" className="w-full">
                Back to Home
              </Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl text-center">Create Account</CardTitle>
          <CardDescription className="text-center">
            Start your CEFR assessment journey
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {errors.submit && (
            <div className="border border-red-200 bg-red-50 rounded-lg p-4 flex items-start space-x-3">
              <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
              <p className="text-red-700 text-sm">{errors.submit}</p>
            </div>
          )}

          <form onSubmit={handleSignup} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  name="firstName"
                  type="text"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  className={errors.firstName ? 'border-red-500' : ''}
                  disabled={isLoading}
                />
                {errors.firstName && (
                  <p className="text-sm text-red-500">{errors.firstName}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  name="lastName"
                  type="text"
                  value={formData.lastName}
                  onChange={handleInputChange}
                  className={errors.lastName ? 'border-red-500' : ''}
                  disabled={isLoading}
                />
                {errors.lastName && (
                  <p className="text-sm text-red-500">{errors.lastName}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleInputChange}
                className={errors.email ? 'border-red-500' : ''}
                disabled={isLoading}
              />
              {errors.email && (
                <p className="text-sm text-red-500">{errors.email}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <PasswordInput
                id="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                placeholder="Enter your password"
                showPassword={showPassword}
                onToggle={() => setShowPassword(!showPassword)}
                error={errors.password}
                disabled={isLoading}
                autoComplete="new-password"
                required
              />
              {errors.password && (
                <p className="text-sm text-red-500">{errors.password}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <PasswordInput
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                placeholder="Confirm your password"
                showPassword={showConfirmPassword}
                onToggle={() => setShowConfirmPassword(!showConfirmPassword)}
                error={errors.confirmPassword}
                disabled={isLoading}
                autoComplete="new-password"
                required
              />
              {errors.confirmPassword && (
                <p className="text-sm text-red-500">{errors.confirmPassword}</p>
              )}
            </div>

            <div className="space-y-2">
              <ReCAPTCHA
                sitekey={appConfig.recaptcha.siteKey}
                onChange={handleRecaptchaChange}
                onErrored={() => setRecaptchaToken(null)}
                onExpired={() => setRecaptchaToken(null)}
              />
              {errors.recaptcha && (
                <p className="text-sm text-red-500">{errors.recaptcha}</p>
              )}
            </div>

            <Button 
              type="submit" 
              className="w-full bg-blue-600 hover:bg-blue-700"
              disabled={isLoading}
            >
              {isLoading ? 'Creating Account...' : 'Create Account'}
            </Button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-muted-foreground">Or continue with</span>
            </div>
          </div>

          <SocialLoginButtons />
        </CardContent>
        <CardFooter>
          <p className="text-sm text-center w-full text-muted-foreground">
            Already have an account?{' '}
            <Link to="/login" className="text-blue-600 hover:underline">
              Sign in here
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
};
