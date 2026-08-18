/**
 * CheckoutView - Unified Checkout Page
 * 
 * Shows order details and payment method selection
 * Clean, simple flow: Order Details → Choose Payment → Complete
 */

import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useFeatureFlag } from '@/hooks/useFlags';
import { PageContainer } from '@/components/layout';
import { Card, CardContent, Button } from '@/components/ui';
import { CreditCard, ArrowRight, Check, Mail } from 'lucide-react';
import { api } from '@/services/api';

interface OrderDetails {
  transaction_id: string;
  pricing_pack: {
    id: string;
    name: string;
    credits: number;
    price_euros: number;
  };
}

export const CheckoutView: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  // Feature flags
  const noPaymentMode = useFeatureFlag('nopayment');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orderDetails, setOrderDetails] = useState<OrderDetails | null>(null);

  const transactionId = searchParams.get('transaction');

  // Set page title
  useEffect(() => {
    document.title = 'Checkout | One-CEFR';
  }, []);

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);

  // Load order details from URL params
  useEffect(() => {
    const packName = searchParams.get('pack');
    const credits = searchParams.get('credits');
    const price = searchParams.get('price');

    if (transactionId && packName && credits && price) {
      setOrderDetails({
        transaction_id: transactionId,
        pricing_pack: {
          id: '',
          name: packName,
          credits: parseInt(credits),
          price_euros: parseFloat(price)
        }
      });
    } else {
      // Invalid URL, redirect back
      navigate('/buy-credits');
    }
  }, [searchParams, transactionId, navigate]);

  const handlePayPalCheckout = async () => {
    if (!transactionId) return;

    try {
      setLoading(true);
      setError(null);

      const response = await api.payments.checkoutWithPayPal(transactionId);

      if (response.data.success && response.data.approval_url) {
        // Redirect to PayPal
        window.location.href = response.data.approval_url;
      } else {
        setError(response.data.message || 'Failed to initiate PayPal checkout');
      }
    } catch (err: any) {
      console.error('PayPal checkout failed:', err);
      setError('Failed to initiate PayPal checkout. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!orderDetails) {
    return (
      <PageContainer className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-gray-600">Loading order details...</p>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer className="py-8 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
            Checkout
          </h1>
          <p className="text-sm text-gray-500">
            Order ID: <span className="font-mono font-semibold">{transactionId}</span>
          </p>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Order Summary */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Order Summary</h2>
            
            <div className="space-y-3 mb-6">
              <div className="flex justify-between items-center py-3 border-b border-gray-200">
                <span className="text-gray-600">Package</span>
                <span className="font-semibold text-gray-900">{orderDetails.pricing_pack.name}</span>
              </div>
              
              <div className="flex justify-between items-center py-3 border-b border-gray-200">
                <span className="text-gray-600">Credits</span>
                <span className="font-semibold text-gray-900">{orderDetails.pricing_pack.credits} credits</span>
              </div>
              
              <div className="flex justify-between items-center py-3">
                <span className="text-lg font-semibold text-gray-900">Total</span>
                <span className="text-2xl font-bold text-eu-blue">€{orderDetails.pricing_pack.price_euros.toFixed(2)}</span>
              </div>
            </div>

            {/* What You Get */}
            <div className="bg-blue-50 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                <Check className="w-5 h-5 text-green-600" />
                What you'll get:
              </h3>
              <ul className="space-y-1 text-sm text-gray-700">
                <li>• {orderDetails.pricing_pack.credits} exam practice credits</li>
                <li>• AI-powered feedback on your answers</li>
                <li>• Instant score reports</li>
                <li>• No expiration date</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Payment Methods */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Payment Method</h2>
            
            {/* Beta User / No Payment Mode */}
            {noPaymentMode ? (
              <div className="space-y-4">
                <div className="p-6 border-2 border-purple-500 rounded-lg bg-purple-50">
                  <div className="flex items-start gap-4 mb-4">
                    <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Mail className="w-6 h-6 text-purple-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                        <span className="bg-purple-600 text-white text-xs px-2 py-1 rounded">BETA</span>
                        Payment Instructions
                      </h3>
                      <p className="text-sm text-gray-700 mb-3">
                        We're currently in beta. To complete your purchase, please email us with your order details:
                      </p>
                      
                      <div className="bg-white rounded-lg p-4 mb-4 border border-purple-200">
                        <div className="space-y-2 text-sm">
                          <div>
                            <span className="font-semibold text-gray-700">Email to:</span>{' '}
                            <a 
                              href={`mailto:hello@example.com?subject=Order Payment - ${transactionId}&body=Hi,%0D%0A%0D%0AI would like to complete payment for:%0D%0A%0D%0AOrder ID: ${transactionId}%0D%0APackage: ${orderDetails.pricing_pack.name}%0D%0ACredits: ${orderDetails.pricing_pack.credits}%0D%0AAmount: €${orderDetails.pricing_pack.price_euros.toFixed(2)}%0D%0A%0D%0APlease let me know how to proceed with the payment.%0D%0A%0D%0AThank you!`}
                              className="text-purple-600 hover:text-purple-700 font-mono font-semibold underline"
                            >
                              hello@example.com
                            </a>
                          </div>
                          <div>
                            <span className="font-semibold text-gray-700">Order ID:</span>{' '}
                            <span className="font-mono text-gray-900">{transactionId}</span>
                          </div>
                          <div>
                            <span className="font-semibold text-gray-700">Package:</span>{' '}
                            <span className="text-gray-900">{orderDetails.pricing_pack.name}</span>
                          </div>
                          <div>
                            <span className="font-semibold text-gray-700">Amount:</span>{' '}
                            <span className="text-gray-900 font-semibold">€{orderDetails.pricing_pack.price_euros.toFixed(2)}</span>
                          </div>
                        </div>
                      </div>

                      <a
                        href={`mailto:hello@example.com?subject=Order Payment - ${transactionId}&body=Hi,%0D%0A%0D%0AI would like to complete payment for:%0D%0A%0D%0AOrder ID: ${transactionId}%0D%0APackage: ${orderDetails.pricing_pack.name}%0D%0ACredits: ${orderDetails.pricing_pack.credits}%0D%0AAmount: €${orderDetails.pricing_pack.price_euros.toFixed(2)}%0D%0A%0D%0APlease let me know how to proceed with the payment.%0D%0A%0D%0AThank you!`}
                        className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold transition-colors"
                      >
                        <Mail className="w-5 h-5" />
                        Send Email to hello@example.com
                      </a>

                      <p className="text-xs text-gray-600 mt-3">
                        💡 We'll reply within 24 hours with payment instructions for beta users. Your credits will be added once payment is confirmed.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* Standard PayPal Payment */
              <div className="space-y-4">
                {/* PayPal Option */}
                <button
                  onClick={handlePayPalCheckout}
                  disabled={loading}
                  className="w-full p-6 border-2 border-blue-500 rounded-lg bg-blue-50 transition-all text-left group disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                        <CreditCard className="w-6 h-6 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 mb-1">PayPal</h3>
                        <p className="text-sm text-gray-600">Fast, secure payment with PayPal</p>
                        <p className="text-xs text-gray-500 mt-1">Accepts credit cards, debit cards, and PayPal balance</p>
                      </div>
                    </div>
                    <ArrowRight className="w-5 h-5 text-blue-600" />
                  </div>
                </button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Security Notice */}
        <div className="text-center text-sm text-gray-500">
          <p>🔒 Your payment is secure and encrypted</p>
        </div>

        {/* Back Button */}
        <div className="mt-6 text-center">
          <button
            onClick={() => navigate('/buy-credits')}
            className="text-gray-600 hover:text-gray-900 text-sm"
          >
            ← Back to pricing
          </button>
        </div>
      </div>
    </PageContainer>
  );
};
