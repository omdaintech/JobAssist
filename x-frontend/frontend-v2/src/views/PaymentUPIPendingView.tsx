/**
 * PaymentUPIPendingView - UPI Payment Pending Verification
 * 
 * Confirmation page after UPI payment submission
 * Shows next steps and waiting for admin verification
 */

import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { PageContainer } from '@/components/layout';
import { Card, CardContent, Button } from '@/components/ui';
import { Clock, Mail, CheckCircle, AlertCircle } from 'lucide-react';

export const PaymentUPIPendingView: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const orderId = searchParams.get('order');

  // Set page title
  useEffect(() => {
    document.title = 'Payment Pending Verification | Lingali';
  }, []);

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);

  // Redirect if no order ID
  useEffect(() => {
    if (!orderId) {
      navigate('/buy-credits');
    }
  }, [orderId, navigate]);

  const handleCopyOrderId = () => {
    if (orderId) {
      navigator.clipboard.writeText(orderId);
      alert('Order ID copied to clipboard!');
    }
  };

  const handleEmailSupport = () => {
    const subject = encodeURIComponent(`Payment Screenshot for Order #${orderId}`);
    const body = encodeURIComponent(
      `Hi,\n\nI have completed the UPI payment for Order ID: ${orderId}\n\nPlease find the payment screenshot attached.\n\nThank you!`
    );
    window.location.href = `mailto:support@example.com?subject=${subject}&body=${body}`;
  };

  return (
    <PageContainer className="py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="mb-4">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
            Payment Submitted Successfully!
          </h1>
          <p className="text-base md:text-lg text-gray-600 max-w-xl mx-auto">
            Your payment is being verified. You'll receive credits within 2-24 hours.
          </p>
        </div>

        {/* Order ID Card */}
        <Card className="mb-6 border-2 border-green-400 bg-green-50">
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Your Order ID</h2>
            <div className="flex items-center justify-between bg-white px-4 py-3 rounded-lg border border-green-300">
              <code className="text-lg font-mono font-semibold text-gray-900">{orderId}</code>
              <button
                onClick={handleCopyOrderId}
                className="px-3 py-1 text-sm bg-green-100 hover:bg-green-200 text-green-800 rounded transition-colors"
              >
                Copy
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Status Card */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <Clock className="w-6 h-6 text-yellow-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-2">What happens next?</h2>
                <div className="space-y-4 text-sm text-gray-600">
                  <div className="flex items-start gap-2">
                    <span className="font-semibold text-gray-900">1.</span>
                    <p>Our team will verify your payment screenshot sent to <strong>support@example.com</strong></p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-semibold text-gray-900">2.</span>
                    <p>Credits will be automatically added to your account</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-semibold text-gray-900">3.</span>
                    <p>You'll receive an email confirmation once credits are added</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Reminder Card */}
        <Card className="mb-6 border-orange-200 bg-orange-50">
          <CardContent className="p-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-orange-900 mb-2">Did you email the screenshot?</h3>
                <p className="text-sm text-orange-800 mb-3">
                  If you haven't sent your payment screenshot yet, please email it to:
                </p>
                <div className="flex items-center gap-2 mb-3">
                  <Mail className="w-4 h-4 text-orange-600" />
                  <a 
                    href="#" 
                    onClick={(e) => {
                      e.preventDefault();
                      handleEmailSupport();
                    }}
                    className="text-orange-900 font-semibold hover:underline"
                  >
                    support@example.com
                  </a>
                </div>
                <p className="text-xs text-orange-700">
                  Include: Order ID ({orderId}), Payment screenshot, Transaction ID
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            onClick={() => navigate('/dashboard')}
            variant="outline"
            className="flex-1 px-6 py-3 text-gray-700 hover:bg-gray-50"
          >
            Go to Dashboard
          </Button>
          <Button
            onClick={() => navigate('/consumption-history')}
            className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white"
          >
            View Order History
          </Button>
        </div>
      </div>
    </PageContainer>
  );
};

