/**
 * PaymentUPIView - UPI Payment Instructions Page
 * 
 * Clear step-by-step instructions for UPI payment
 * Shows amount, UPI ID, order ID, and screenshot submission process
 */

import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { PageContainer } from '@/components/layout';
import { Card, CardContent, Button } from '@/components/ui';
import { Copy, Check, Mail, AlertCircle } from 'lucide-react';

export const PaymentUPIView: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const [copied, setCopied] = useState<string | null>(null);
  const [upiTransactionId, setUpiTransactionId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const transactionId = searchParams.get('transaction');
  const amount = searchParams.get('amount');
  const credits = searchParams.get('credits');
  const packName = searchParams.get('pack');

  // UPI details - from config
  const UPI_ID = 'yourname@upi'; // This will come from backend/config
  const SUPPORT_EMAIL = 'support@example.com';

  // Set page title
  useEffect(() => {
    document.title = 'UPI Payment | App Name';
  }, []);

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);

  // Validate params
  useEffect(() => {
    if (!transactionId || !amount || !credits) {
      navigate('/buy-credits');
    }
  }, [transactionId, amount, credits, navigate]);

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleSubmit = async () => {
    if (!upiTransactionId.trim() || upiTransactionId.length < 5) {
      setError('Please enter a valid UPI transaction ID (minimum 5 characters)');
      return;
    }

    // TODO: Call API to submit UPI transaction
    setSubmitting(true);
    setError(null);

    try {
      // API call here
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
      
      // Navigate to success page
      navigate(`/payment-upi-pending?order=${transactionId}`);
    } catch (err) {
      setError('Failed to submit. Please try again.');
      setSubmitting(false);
    }
  };

  return (
    <PageContainer className="py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
            UPI Payment
          </h1>
          <p className="text-gray-600">Follow these simple steps to complete your payment</p>
        </div>

        {/* Order Details */}
        <Card className="mb-6 border-2 border-green-400 bg-green-50">
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Order Details</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Order ID:</span>
                <span className="font-mono font-semibold">{transactionId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Package:</span>
                <span className="font-semibold">{packName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Credits:</span>
                <span className="font-semibold">{credits} credits</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-green-300">
                <span className="text-lg font-semibold text-gray-900">Amount to Pay:</span>
                <span className="text-2xl font-bold text-green-700">₹{(parseFloat(amount || '0') * 90).toFixed(2)}</span>
              </div>
              <p className="text-xs text-gray-600 text-right">≈ €{amount} EUR</p>
            </div>
          </CardContent>
        </Card>

        {/* Payment Instructions */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Payment Instructions</h2>
            
            <div className="space-y-6">
              {/* Step 1 */}
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                  <span className="text-green-700 font-bold text-sm">1</span>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 mb-2">Open your UPI app</h3>
                  <p className="text-sm text-gray-600 mb-3">
                    Open any UPI app (Google Pay, PhonePe, Paytm, BHIM, etc.)
                  </p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                  <span className="text-green-700 font-bold text-sm">2</span>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 mb-2">Send money to this UPI ID</h3>
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-gray-600 uppercase">UPI ID</span>
                      <button
                        onClick={() => handleCopy(UPI_ID, 'upi')}
                        className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
                      >
                        {copied === 'upi' ? (
                          <>
                            <Check className="w-3 h-3" />
                            Copied!
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            Copy
                          </>
                        )}
                      </button>
                    </div>
                    <p className="font-mono text-lg font-semibold text-gray-900">{UPI_ID}</p>
                  </div>
                  
                  <div className="mt-3 bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-gray-600 uppercase">Amount</span>
                      <button
                        onClick={() => handleCopy((parseFloat(amount || '0') * 90).toFixed(2), 'amount')}
                        className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
                      >
                        {copied === 'amount' ? (
                          <>
                            <Check className="w-3 h-3" />
                            Copied!
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            Copy
                          </>
                        )}
                      </button>
                    </div>
                    <p className="text-2xl font-bold text-green-700">₹{(parseFloat(amount || '0') * 90).toFixed(2)}</p>
                  </div>
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                  <span className="text-green-700 font-bold text-sm">3</span>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 mb-2">Add Order ID in remarks/note</h3>
                  <p className="text-sm text-gray-600 mb-3">
                    <strong>Important:</strong> Include your Order ID in the payment note/remarks
                  </p>
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-gray-600 uppercase">Order ID (Add in remarks)</span>
                      <button
                        onClick={() => handleCopy(transactionId || '', 'order')}
                        className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
                      >
                        {copied === 'order' ? (
                          <>
                            <Check className="w-3 h-3" />
                            Copied!
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            Copy
                          </>
                        )}
                      </button>
                    </div>
                    <p className="font-mono text-base font-semibold text-gray-900">{transactionId}</p>
                  </div>
                </div>
              </div>

              {/* Step 4 */}
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                  <span className="text-green-700 font-bold text-sm">4</span>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 mb-2">Take a screenshot and email us</h3>
                  <p className="text-sm text-gray-600 mb-3">
                    After payment, take a screenshot showing:
                  </p>
                  <ul className="text-sm text-gray-600 space-y-1 mb-3">
                    <li>✓ Transaction amount</li>
                    <li>✓ Transaction ID/UPI Reference number</li>
                    <li>✓ Success status</li>
                    <li>✓ Date and time</li>
                  </ul>
                  <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                    <div className="flex items-center gap-2 mb-2">
                      <Mail className="w-4 h-4 text-blue-600" />
                      <span className="text-sm font-semibold text-gray-900">Email screenshot to:</span>
                    </div>
                    <p className="text-base font-semibold text-blue-700">{SUPPORT_EMAIL}</p>
                    <p className="text-xs text-gray-600 mt-2">
                      Subject: Payment for Order #{transactionId}
                    </p>
                  </div>
                </div>
              </div>

              {/* Step 5 */}
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                  <span className="text-green-700 font-bold text-sm">5</span>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 mb-2">Enter your UPI Transaction ID</h3>
                  <p className="text-sm text-gray-600 mb-3">
                    Enter the UPI transaction ID/reference number from your payment app
                  </p>
                  
                  {error && (
                    <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-red-600">{error}</p>
                    </div>
                  )}
                  
                  <input
                    type="text"
                    value={upiTransactionId}
                    onChange={(e) => setUpiTransactionId(e.target.value)}
                    placeholder="e.g., 123456789012"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg mb-3 focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                  />
                  
                  <Button
                    onClick={handleSubmit}
                    disabled={submitting || !upiTransactionId.trim() || upiTransactionId.length < 5}
                    className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting ? 'Submitting...' : 'Submit & Continue'}
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Important Notes */}
        <Card className="mb-6 border-orange-200 bg-orange-50">
          <CardContent className="p-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-orange-900 mb-2">Important Notes</h3>
                <ul className="text-sm text-orange-800 space-y-1">
                  <li>• Credits will be added within 2-24 hours after verification</li>
                  <li>• Make sure to include Order ID in payment remarks</li>
                  <li>• Email payment screenshot to {SUPPORT_EMAIL}</li>
                  <li>• Keep your UPI transaction ID safe for reference</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Back Button */}
        <div className="text-center">
          <button
            onClick={() => navigate(`/checkout?transaction=${transactionId}&pack=${packName}&credits=${credits}&price=${amount}`)}
            className="text-gray-600 hover:text-gray-900 text-sm"
          >
            ← Back to checkout
          </button>
        </div>
      </div>
    </PageContainer>
  );
};
