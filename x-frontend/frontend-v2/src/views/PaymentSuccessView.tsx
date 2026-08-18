/**
 * PaymentSuccessView - Payment Success Page
 * 
 * Displays after PayPal payment completion
 * Polls for credit update and redirects to dashboard
 */

import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/services/api';
import { PageContainer } from '@/components/layout';
import { LoadingSpinner, Card, CardContent, Button } from '@/components/ui';

export const PaymentSuccessView: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated, refreshUsage } = useAuth();
  const [searchParams] = useSearchParams();
  const [checking, setChecking] = useState(true);
  const [initialCredits, setInitialCredits] = useState<number | null>(null);
  const [newCredits, setNewCredits] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const maxPolls = 4; // Poll for 60 seconds (4 * 15 seconds)
  
  // Extract PayPal details from URL
  const paypalToken = searchParams.get('token');
  const payerID = searchParams.get('PayerID');

  // Set page title
  useEffect(() => {
    document.title = 'Payment Processing | Lingali';
  }, []);

  // Get initial credit balance
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    
    loadInitialCredits();
  }, [isAuthenticated]);

  const loadInitialCredits = async () => {
    try {
      const response = await api.user.getStatus();
      if (response.data.success && response.data.usage_info) {
        const remaining = response.data.usage_info.remaining_count || 0;
        setInitialCredits(remaining);
      }
    } catch (err) {
      console.error('Failed to load initial credits:', err);
    }
  };

  // Poll for credit updates
  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }
    
    if (initialCredits === null) {
      return;
    }

    let currentPollCount = 0;

    const pollInterval = setInterval(async () => {
      currentPollCount += 1;

      try {
        // Refresh user status to get updated credits
        await refreshUsage?.();
        
        const response = await api.user.getStatus();
        
        if (response.data.success && response.data.usage_info) {
          const currentCredits = response.data.usage_info.remaining_count || 0;
          
          // Check if credits increased
          if (currentCredits > initialCredits) {
            setNewCredits(currentCredits);
            setChecking(false);
            clearInterval(pollInterval);
            
            // Redirect to dashboard after 5 seconds
            setTimeout(() => {
              navigate('/dashboard');
            }, 5000);
            return;
          }
        }
      } catch (err) {
        console.error('Failed to check credits:', err);
      }

      // Stop polling after max attempts
      if (currentPollCount >= maxPolls) {
        clearInterval(pollInterval);
        setChecking(false);
        setError(
          'Payment verification is taking longer than expected. Your payment was successful, but credit processing may take a few more minutes.'
        );
      }
    }, 15000); // Poll every 15 seconds

    return () => {
      clearInterval(pollInterval);
    };
  }, [isAuthenticated, initialCredits, navigate]); // Clean dependency array

  if (!isAuthenticated) {
    return null;
  }

  return (
    <PageContainer className="flex items-center justify-center min-h-screen">
      <Card className="max-w-lg w-full">
        <CardContent className="p-8 text-center">
          {checking && (
            <>
              <div className="mb-6">
                <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-blue-100 flex items-center justify-center">
                  <svg
                    className="w-12 h-12 text-blue-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"
                    />
                  </svg>
                </div>
                <h1 className="text-2xl font-bold text-gray-900 mb-3">
                  Payment Received Successfully
                </h1>
                <div className="space-y-2 mb-4">
                  {paypalToken && (
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Transaction ID:</span> {paypalToken}
                    </p>
                  )}
                  {payerID && (
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Payer ID:</span> {payerID}
                    </p>
                  )}
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
                <div className="flex items-center justify-center mb-3">
                  <LoadingSpinner className="mr-3" />
                  <span className="font-medium text-blue-900">Processing Payment Confirmation</span>
                </div>
                
                <p className="text-blue-800 text-sm leading-relaxed mb-4">
                  We're waiting for final confirmation from PayPal to add your credits. 
                  This process typically takes 5-30 seconds, but can occasionally take up to a few minutes.
                </p>
                
                <div className="text-xs text-blue-700 space-y-1">
                  <p>• Your payment has been successfully processed</p>
                  <p>• Your money is safe and the transaction is secure</p>
                  <p>• You can safely close this page or navigate elsewhere</p>
                  <p>• We'll send you an email confirmation once credits are added</p>
                </div>
              </div>

              <div className="text-center space-y-3">
                <div className="space-y-2">
                  <Button
                    onClick={() => navigate('/dashboard')}
                    variant="outline"
                    className="w-full"
                  >
                    Continue to Dashboard
                  </Button>
                  <Button
                    onClick={() => navigate('/consumption-history')}
                    variant="outline"
                    className="w-full text-sm"
                  >
                    View Payment History
                  </Button>
                  {import.meta.env.DEV && paypalToken && (
                    <Button
                      onClick={async () => {
                        try {
                          const response = await fetch('/api/user/payments/paypal/webhook', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              event_type: "PAYMENT.CAPTURE.COMPLETED",
                              resource: {
                                id: `CAPTURE-${paypalToken}`,
                                amount: { value: "5.00", currency_code: "EUR" },
                                supplementary_data: { related_ids: { order_id: paypalToken } },
                                payer: { email_address: "test@example.com", payer_id: payerID }
                              }
                            })
                          });
                          console.log('Manual webhook simulation result:', await response.json());
                        } catch (err) {
                          console.error('Failed to simulate webhook:', err);
                        }
                      }}
                      variant="outline"
                      className="w-full text-xs bg-yellow-50 hover:bg-yellow-100"
                    >
                      🔧 Test: Simulate PayPal Confirmation (Dev Only)
                    </Button>
                  )}
                </div>
              </div>
            </>
          )}

          {!checking && newCredits && (
            <>
              <div className="mb-6">
                <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center">
                  <svg
                    className="w-12 h-12 text-green-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">
                  Credits Added!
                </h1>
                <p className="text-gray-600 mb-4">
                  Your credits have been added successfully
                </p>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                  <p className="text-sm text-gray-600">New credit balance:</p>
                  <p className="text-3xl font-bold text-green-600">
                    {newCredits} credits
                  </p>
                  {initialCredits !== null && (
                    <p className="text-sm text-gray-500 mt-2">
                      +{newCredits - initialCredits} credits added
                    </p>
                  )}
                </div>
              </div>

              <p className="text-sm text-gray-500 mb-4">
                Redirecting to dashboard...
              </p>

              <Button
                onClick={() => navigate('/dashboard')}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                Go to Dashboard Now
              </Button>
            </>
          )}

          {!checking && error && (
            <>
              <div className="mb-6">
                <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-yellow-100 flex items-center justify-center">
                  <svg
                    className="w-12 h-12 text-yellow-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                </div>
                <h1 className="text-xl font-bold text-gray-900 mb-3">
                  Payment Confirmation Pending
                </h1>
                {paypalToken && (
                  <p className="text-sm text-gray-600 mb-4">
                    <span className="font-medium">Transaction ID:</span> {paypalToken}
                  </p>
                )}
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-6">
                <p className="text-yellow-800 text-sm leading-relaxed mb-4">
                  {error}
                </p>
                
                <div className="text-xs text-yellow-700 space-y-1">
                  <p>• Your payment was successfully processed by PayPal</p>
                  <p>• Credit processing may take a few more minutes</p>
                  <p>• Check your email for payment confirmation</p>
                  <p>• Credits will appear in your dashboard once processed</p>
                  <p>• Contact support if credits don't appear within 24 hours</p>
                </div>
              </div>

              <div className="space-y-3">
                <Button
                  onClick={() => navigate('/dashboard')}
                  className="w-full"
                >
                  Go to Dashboard
                </Button>
                <Button
                  onClick={() => navigate('/consumption-history')}
                  variant="outline"
                  className="w-full"
                >
                  View Payment History
                </Button>
                <Button
                  onClick={() => navigate('/buy-credits')}
                  variant="outline"
                  className="w-full text-sm"
                >
                  Buy More Credits
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </PageContainer>
  );
};

