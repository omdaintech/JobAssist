/**
 * BuyCreditView - Buy Credits Page
 * 
 * Database-driven pricing display with PayPal checkout integration
 * Following existing architecture: useEffect + async/await + API calls
 */

import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { api, PricingPack } from '@/services/api';
import { PageContainer } from '@/components/layout';
import { LoadingSpinner, Card, CardContent, Button } from '@/components/ui';
import { useFeatureFlag } from '@/hooks/useFlags';

export const BuyCreditView: React.FC = () => {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  // Feature flags
  const noPaymentMode = useFeatureFlag('nopayment');

  // State
  const [pricingPacks, setPricingPacks] = useState<PricingPack[]>([]);
  const [promotion, setPromotion] = useState<{
    active: boolean;
    title: string;
    message: string;
    badge_text: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingPackId, setProcessingPackId] = useState<string | null>(null);
  const [cancelledMessage, setCancelledMessage] = useState<string | null>(null);
  
  // Unified order flow state
  const [currentTransactionId, setCurrentTransactionId] = useState<string | null>(null);
  const [showPaymentSelector, setShowPaymentSelector] = useState(false);
  const [selectedPack, setSelectedPack] = useState<PricingPack | null>(null);
  const [showUPIModal, setShowUPIModal] = useState(false);
  const [upiTransactionId, setUpiTransactionId] = useState('');

  // Set page title
  useEffect(() => {
    document.title = 'Buy Credits | Lingali';
  }, []);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, authLoading, navigate]);

  // Check for cancelled payment
  useEffect(() => {
    const cancelled = searchParams.get('cancelled');
    if (cancelled === 'true') {
      setCancelledMessage('Payment was cancelled. You can try again below.');
      // Clear the URL parameter
      window.history.replaceState({}, '', '/buy-credits');
    }
  }, [searchParams]);

  // Load pricing packs
  useEffect(() => {
    if (!isAuthenticated) return;
    loadPricingPacks();
  }, [isAuthenticated]);

  const loadPricingPacks = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await api.payments.getPricingPacks();

      if (response.data.success) {
        setPricingPacks(response.data.pricing_packs);
        setPromotion(response.data.promotion || null);
      } else {
        setError('Failed to load pricing packs');
      }
    } catch (err: any) {
      console.error('Failed to load pricing packs:', err);
      setError('Failed to load pricing options');
    } finally {
      setLoading(false);
    }
  };

  const handleBuyCredits = async (pack: PricingPack) => {
    try {
      setProcessingPackId(pack.id);
      setError(null);

      // Step 1: Create order (unified flow)
      const response = await api.payments.createOrder(pack.id);

      if (response.data.success) {
        // Navigate to checkout page with order details
        navigate(
          `/checkout?transaction=${response.data.transaction_id}&pack=${encodeURIComponent(pack.pack_name)}&credits=${pack.credits}&price=${pack.price_euros}`
        );
      } else {
        setError(response.data.message || 'Failed to create order');
      }
    } catch (err: any) {
      console.error('Failed to create order:', err);
      setError('Failed to create order. Please try again.');
    } finally {
      setProcessingPackId(null);
    }
  };

  const handlePayPalCheckout = async () => {
    if (!currentTransactionId) return;

    try {
      setError(null); // Clear previous errors
      setProcessingPackId(selectedPack?.id || null);
      const response = await api.payments.checkoutWithPayPal(currentTransactionId);

      if (response.data.success && response.data.approval_url) {
        // Redirect to PayPal
        window.location.href = response.data.approval_url;
      } else {
        setError(response.data.message || 'Failed to initiate PayPal checkout');
        setShowPaymentSelector(false);
      }
    } catch (err: any) {
      console.error('PayPal checkout failed:', err);
      setError('Failed to initiate PayPal checkout. Please try again.');
      setShowPaymentSelector(false);
    } finally {
      setProcessingPackId(null);
    }
  };

  const handleUPISelect = () => {
    setShowPaymentSelector(false);
    setShowUPIModal(true);
    setError(null); // Clear previous errors
  };

  const handleUPISubmit = async () => {
    if (!currentTransactionId || !upiTransactionId.trim() || upiTransactionId.length < 5) {
      setError('Please enter a valid UPI transaction ID (min 5 characters)');
      return;
    }

    try {
      setProcessingPackId(selectedPack?.id || null);
      const response = await api.payments.submitUPIPayment(currentTransactionId, upiTransactionId);

      if (response.data.success) {
        // Close modal and navigate on success
        setShowUPIModal(false);
        navigate(`/payment-upi-pending?order=${response.data.order_id}&wa=${response.data.whatsapp_number}`);
      } else {
        setError(response.data.message || 'Failed to submit UPI payment');
      }
    } catch (err: any) {
      console.error('UPI submission failed:', err);
      setError('Failed to submit UPI payment. Please try again.');
    } finally {
      setProcessingPackId(null);
      // Don't close modal here - let user see error and retry
    }
  };

  if (authLoading || loading) {
    return (
      <PageContainer className="flex items-center justify-center min-h-screen">
        <LoadingSpinner />
      </PageContainer>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <PageContainer className="py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
            Get Credits
          </h1>
          <p className="text-base md:text-lg text-gray-600 max-w-xl mx-auto">
            Purchase credits to practice exams, get AI feedback, and improve your language skills
          </p>
        </div>

        {/* Beta Testing Message - Shows when nopayment flag is enabled */}
        {noPaymentMode && (
          <div className="mb-8">
            <Card className="border-2 border-blue-500 bg-gradient-to-br from-blue-50 via-white to-blue-50 shadow-lg">
              <CardContent className="p-8 text-center">
                <div className="mb-4">
                  <span className="text-6xl">🚀</span>
                </div>
                <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">
                  We're in Beta Testing! 🎉
                </h2>
                <div className="space-y-4 text-left max-w-xl mx-auto">
                  <p className="text-base md:text-lg text-gray-700">
                    Great news! We're currently in <span className="font-semibold text-blue-600">beta testing phase</span>, which means:
                  </p>
                  
                  <div className="bg-white rounded-lg p-4 border border-blue-200">
                    <div className="space-y-3">
                      <div className="flex items-start">
                        <span className="text-green-600 font-bold text-2xl mr-3">✓</span>
                        <div>
                          <p className="text-gray-900 font-semibold">Payment gateway coming soon</p>
                          <p className="text-sm text-gray-600">We haven't launched our payment system yet - it will be available in a few weeks!</p>
                        </div>
                      </div>
                      <div className="flex items-start">
                        <span className="text-green-600 font-bold text-2xl mr-3">✓</span>
                        <div>
                          <p className="text-gray-900 font-semibold">Enjoy free credits for now</p>
                          <p className="text-sm text-gray-600">Use the platform completely free during beta testing</p>
                        </div>
                      </div>
                      <div className="flex items-start">
                        <span className="text-green-600 font-bold text-2xl mr-3">🐛</span>
                        <div>
                          <p className="text-gray-900 font-semibold">Report bugs, earn rewards!</p>
                          <p className="text-sm text-gray-600">Help us improve by reporting bugs and get <span className="font-semibold text-blue-600">lots of free credits</span> as a thank you!</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg p-4 border border-yellow-300">
                    <p className="text-sm text-gray-800">
                      <span className="font-semibold">💡 Need credits or want to report bugs?</span> You can add credits to your account or write to us at{' '}
                      <a 
                        href="mailto:hello@example.com?subject=Credit Request / Bug Report" 
                        className="text-blue-600 hover:text-blue-800 font-semibold underline"
                      >
                        hello@example.com
                      </a>
                      . We really appreciate your help in making Lingali better!
                    </p>
                  </div>
                </div>

                <div className="mt-6">
                  <Button
                    onClick={() => navigate('/dashboard')}
                    className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-lg"
                  >
                    Back to Dashboard
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Original Content - Only show when NOT in nopayment mode */}
        {!noPaymentMode && (
          <>
            {/* Promotion Banner */}
            {promotion && promotion.active && (
              <div className="mb-6 bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg p-4 text-center shadow-lg">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <span className="bg-yellow-400 text-blue-900 px-3 py-1 rounded-full text-xs font-bold uppercase">
                    {promotion.badge_text}
                  </span>
                </div>
                <h2 className="text-xl md:text-2xl font-bold text-white mb-1">
                  {promotion.title}
                </h2>
                <p className="text-blue-100 text-base md:text-lg font-medium">
                  {promotion.message}
                </p>
              </div>
            )}

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 text-center">
            {error}
          </div>
        )}

        {/* Cancelled Message */}
        {cancelledMessage && (
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-lg mb-6 text-center">
            {cancelledMessage}
          </div>
        )}

        {/* What You Can Do Section */}
        <Card className="mb-8 border border-gray-200 bg-gradient-to-br from-blue-50 to-white">
          <CardContent className="p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">What you can do with credits:</h2>
            <div className="space-y-3">
              <div className="flex items-start">
                <span className="text-blue-600 font-bold text-lg mr-3">✓</span>
                <p className="text-gray-700">Take unlimited practice exams at A1, A2, and B1 levels</p>
              </div>
              <div className="flex items-start">
                <span className="text-blue-600 font-bold text-lg mr-3">✓</span>
                <p className="text-gray-700">Get instant AI-powered feedback on your answers</p>
              </div>
              <div className="flex items-start">
                <span className="text-blue-600 font-bold text-lg mr-3">✓</span>
                <p className="text-gray-700">Track your progress with detailed analytics</p>
              </div>
              <div className="flex items-start">
                <span className="text-blue-600 font-bold text-lg mr-3">✓</span>
                <p className="text-gray-700">Credits never expire - use them at your own pace</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pricing Packs - Single Column */}
        <div className="space-y-4 mb-8">
          {pricingPacks.map((pack) => (
            <Card
              key={pack.id}
              className={`relative transition-all duration-200 hover:shadow-md ${
                pack.is_popular 
                  ? 'border-2 border-blue-500 shadow-sm' 
                  : 'border border-gray-200'
              }`}
            >
              {pack.is_popular && (
                <div className="absolute -top-3 left-6">
                  <span className="bg-blue-600 text-white px-4 py-1 rounded-full text-xs font-bold shadow-sm">
                    ⭐ MOST POPULAR
                  </span>
                </div>
              )}

              <CardContent className="p-5 md:p-6">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  {/* Left: Pack Info */}
                  <div className="flex-1">
                    <h3 className="text-xl md:text-2xl font-bold text-gray-900 mb-2">
                      {pack.pack_name}
                    </h3>
                    <div className="flex items-baseline gap-2 mb-2">
                      {/* Show original price if discount exists */}
                      {pack.original_price && pack.discount_percentage > 0 && (
                        <span className="text-lg text-gray-400 line-through">
                          €{pack.original_price.toFixed(2)}
                        </span>
                      )}
                      <span className="text-3xl md:text-4xl font-bold text-gray-900">
                        €{pack.price_euros.toFixed(2)}
                      </span>
                      {/* Discount badge */}
                      {pack.discount_percentage > 0 && (
                        <span className="bg-red-500 text-white px-2 py-1 rounded text-xs font-bold">
                          -{pack.discount_percentage}%
                        </span>
                      )}
                    </div>
                    <div className="text-base text-gray-600 mb-2">
                      {pack.credits} credits
                      {pack.original_price && pack.discount_percentage > 0 && (
                        <span className="ml-2 text-sm text-green-600 font-semibold">
                          Save €{(pack.original_price - pack.price_euros).toFixed(2)}
                        </span>
                      )}
                    </div>
                    {pack.description && (
                      <p className="text-sm text-gray-600 mt-1">
                        {pack.description}
                      </p>
                    )}
                  </div>

                  {/* Right: Buy Button */}
                  <div className="md:ml-4">
                    <Button
                      onClick={() => handleBuyCredits(pack)}
                      disabled={processingPackId === pack.id}
                      className={`w-full md:w-auto px-8 py-3 text-base font-semibold transition-colors ${
                        pack.is_popular
                          ? 'bg-blue-600 hover:bg-blue-700 text-white'
                          : 'bg-gray-900 hover:bg-gray-800 text-white'
                      }`}
                    >
                      {processingPackId === pack.id ? (
                        <span className="flex items-center justify-center">
                          <LoadingSpinner className="mr-2 h-4 w-4" />
                          Processing...
                        </span>
                      ) : (
                        'Buy Now'
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Trust Indicators */}
        <div className="bg-gray-50 rounded-lg p-6 mb-6">
          <div className="flex flex-wrap justify-center items-center gap-6 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <span className="font-medium">Secure PayPal</span>
            </div>
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span className="font-medium">Instant Delivery</span>
            </div>
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="font-medium">Never Expire</span>
            </div>
          </div>
        </div>

        {/* Back Button */}
        <div className="text-center">
          <Button
            onClick={() => navigate('/dashboard')}
            variant="outline"
            className="px-6 py-2 text-gray-700 hover:bg-gray-50"
          >
            ← Back to Dashboard
          </Button>
        </div>
          </>
        )}
      </div>

      {/* Payment Method Selector Modal */}
      {showPaymentSelector && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full shadow-xl">
            <h3 className="text-xl font-bold mb-2">Select Payment Method</h3>
            <p className="text-sm text-gray-600 mb-4">
              Order ID: <span className="font-mono font-semibold">{currentTransactionId}</span>
            </p>
            
            <div className="space-y-3">
              <button
                onClick={handlePayPalCheckout}
                disabled={processingPackId !== null}
                className="w-full px-6 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                PayPal (Global Users)
              </button>
              
              <button
                onClick={handleUPISelect}
                disabled={processingPackId !== null}
                className="w-full px-6 py-4 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                UPI (Only Indian Users)
              </button>
            </div>
            
            <button
              onClick={() => {
                setShowPaymentSelector(false);
                setCurrentTransactionId(null);
                setSelectedPack(null);
                setProcessingPackId(null);
                setError(null); // Clear any errors
              }}
              className="mt-4 w-full px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* UPI Transaction ID Modal */}
      {showUPIModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full shadow-xl">
            <h3 className="text-xl font-bold mb-4">Enter UPI Transaction ID</h3>
            <p className="text-sm text-gray-600 mb-4">
              Please complete the UPI payment first, then enter your transaction ID from your payment app (Google Pay, PhonePe, Paytm, etc.)
            </p>
            
            {/* Error display in modal */}
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}
            
            <input
              type="text"
              value={upiTransactionId}
              onChange={(e) => setUpiTransactionId(e.target.value)}
              placeholder="e.g., 123456789012"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-4 focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
            />
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowUPIModal(false);
                  setUpiTransactionId('');
                  setError(null);
                  setShowPaymentSelector(true);
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleUPISubmit}
                disabled={!upiTransactionId.trim() || upiTransactionId.length < 5 || processingPackId !== null}
                className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {processingPackId ? 'Submitting...' : 'Submit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </PageContainer>
  );
};
