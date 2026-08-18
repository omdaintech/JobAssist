import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { 
  Button, 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle, 
  Input, 
  Label,
  LoadingSpinner,
  ErrorDisplay 
} from '@/components/ui';
import { api } from '@/services/api';
import { CheckCircle } from 'lucide-react';

export const EmailVerificationView: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const [verificationCode, setVerificationCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [emailHash, setEmailHash] = useState<string | null>(null);

  // Set page title
  useEffect(() => {
    document.title = 'Verify Email | One-CEFR';
  }, []);

  // Extract email hash from URL
  useEffect(() => {
    const hash = searchParams.get('hash');
    if (hash) {
      setEmailHash(hash);
    } else {
      setErrorMessage('Invalid verification link. Please use the link from your email.');
    }
  }, [searchParams]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, ''); // Only digits
    if (value.length <= 6) {
      setVerificationCode(value);
      if (errorMessage) setErrorMessage('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!emailHash) {
      setErrorMessage('Invalid verification link');
      return;
    }
    
    if (verificationCode.length !== 6) {
      setErrorMessage('Please enter the 6-digit verification code');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');

    try {
      const response = await api.auth.verifyEmail({
        email_hash: emailHash,
        verification_code: verificationCode
      });

      if (response.data.success && response.data.user_activated) {
        setSuccessMessage(response.data.message);
        
        // Redirect to login after 3 seconds
        setTimeout(() => {
          navigate('/login', { 
            state: { 
              message: 'Account activated! You can now sign in.' 
            } 
          });
        }, 3000);
      } else {
        setErrorMessage(response.data.message || 'Email verification failed');
      }
    } catch (error: any) {
      const message = error.response?.data?.detail || error.message || 'Verification failed. Please try again.';
      setErrorMessage(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendVerification = async () => {
    // This would need user's email - for now, redirect to signup
    navigate('/signup', { 
      state: { 
        message: 'Please sign up again to receive a new verification email' 
      } 
    });
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-[#003399]">
            Verify Your Email
          </CardTitle>
          <CardDescription>
            Enter the 6-digit code sent to your email address
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          {/* Success Message */}
          {successMessage && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md">
              <div className="flex items-center">
                <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                <p className="text-green-800 text-sm">{successMessage}</p>
              </div>
              <p className="text-green-600 text-xs mt-1 ml-7">
                Redirecting to login page...
              </p>
            </div>
          )}
          
          {/* Error Message */}
          {errorMessage && (
            <ErrorDisplay 
              message={errorMessage} 
              className="mb-4"
            />
          )}
          
          {emailHash && !successMessage && (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Verification Code Field */}
              <div>
                <Label htmlFor="verification_code">Verification Code</Label>
                <Input
                  id="verification_code"
                  name="verification_code"
                  type="text"
                  value={verificationCode}
                  onChange={handleInputChange}
                  placeholder="000000"
                  disabled={isLoading}
                  className="mt-1 text-center text-lg tracking-widest"
                  maxLength={6}
                  autoComplete="one-time-code"
                  autoFocus
                />
                <p className="text-xs text-gray-500 mt-1">
                  Enter the 6-digit code from your email
                </p>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={isLoading || verificationCode.length !== 6}
                className="w-full bg-[#003399] hover:bg-[#002266] text-white py-3"
                size="lg"
              >
                {isLoading ? (
                  <>
                    <LoadingSpinner className="mr-2 h-4 w-4" />
                    Verifying...
                  </>
                ) : (
                  'Verify Email'
                )}
              </Button>
            </form>
          )}

          {/* Help Links */}
          <div className="mt-6 text-center space-y-2">
            <p className="text-sm text-gray-600">
              Didn't receive the email?{' '}
              <button 
                onClick={handleResendVerification}
                className="text-[#003399] hover:underline font-medium"
              >
                Request new code
              </button>
            </p>
            
            <p className="text-sm text-gray-600">
              <Link 
                to="/login" 
                className="text-[#003399] hover:underline font-medium"
              >
                Back to login
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
