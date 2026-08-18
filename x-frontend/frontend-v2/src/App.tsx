import React from 'react';
import { Route, BrowserRouter as Router, Routes, useNavigate, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { MainLayout } from './components/layout';
import { LoadingSpinner } from './components/ui/loading-spinner';
import { PWAInstallPrompt } from './components/shared/PWAInstallPrompt';
import { OfflineDetector } from './components/shared/OfflineDetector';
import { DowntimeView } from './components/shared/DowntimeView';
import { useAuth } from './context/AuthContext';
import { useOnboardingGuard } from './hooks/useOnboardingGuard';
import { PWAUpdater } from './hooks/usePWA';
import { useFeatureFlag } from './hooks/useFlags';
import { pageVariants, pageTransition } from './utils/animations';
import { ConsumptionHistoryViewTabs as ConsumptionHistoryView } from './views/ConsumptionHistoryViewTabs';
import { DashboardView } from './views/DashboardView';
import { ExamResultsView } from './views/ExamResultsView';
import { ExamTakingView } from './views/ExamTakingView';
import { ExamView } from './views/ExamView';
import { LoginView } from './views/LoginView';
import { PracticeLogView } from './views/PracticeLogView';
import { PracticeView } from './views/PracticeView';
import { PracticeTakingView } from './views/PracticeTakingView';
import { SettingsView } from './views/SettingsView';
import { SignupView } from './views/SignupView';
import { EmailVerificationView } from './views/EmailVerificationView';
import { ForgotPasswordView } from './views/ForgotPasswordView';
import { ResetPasswordView } from './views/ResetPasswordView';
import { FAQStudentsView } from './views/FAQStudentsView';
import { FAQSchoolsView } from './views/FAQSchoolsView';
import { OnboardingView } from './views/OnboardingView';
import { PublicResultsView } from './views/PublicResultsView';
import { BuyCreditView } from './views/BuyCreditView';
import { CheckoutView } from './views/CheckoutView';
import { PaymentUPIView } from './views/PaymentUPIView';
import { PaymentUPIPendingView } from './views/PaymentUPIPendingView';
import { PaymentSuccessView } from './views/PaymentSuccessView';
import { FeedbackView } from './views/FeedbackView';







// Landing component that redirects based on auth status
const AppLanding: React.FC = () => {
  const { isAuthenticated, isInitialized, isLoading, isOnboarded } = useAuth();
  const navigate = useNavigate();

  React.useEffect(() => {
    if (isInitialized && !isLoading) {
      if (isAuthenticated) {
        if (!isOnboarded) {
          // New user - redirect to onboarding
          navigate('/onboarding', { replace: true });
        } else {
          // Existing user - go to dashboard
          navigate('/dashboard', { replace: true });
        }
      } else {
        navigate('/login', { replace: true });
      }
    }
  }, [isAuthenticated, isInitialized, isLoading, isOnboarded, navigate]);

  // Show loading while determining auth status
  if (!isInitialized || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh] p-4">
        <div className="text-center">
          <LoadingSpinner />
          <p className="text-gray-600 mt-2">Loading...</p>
        </div>
      </div>
    );
  }

  return null;
};

const NotFoundView = () => (
  <div className="max-w-2xl mx-auto p-4 text-center">
    <h1 className="text-6xl font-bold text-gray-300 mb-4">404</h1>
    <h2 className="text-2xl font-bold text-gray-900 mb-4">Page Not Found</h2>
    <p className="text-gray-600 mb-8">The page you're looking for doesn't exist.</p>
    <a href="/dashboard" className="bg-eu-blue hover:bg-eu-blue/90 text-white px-6 py-2 rounded-lg font-medium">
      Go to Dashboard
    </a>
  </div>
);

// Protected Route component
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isInitialized, isLoading } = useAuth();
  const navigate = useNavigate();
  
  // Centralized onboarding guard - redirects if not onboarded
  useOnboardingGuard();

  // Wait for auth to initialize before making decisions
  if (!isInitialized || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh] p-4">
        <div className="text-center">
          <LoadingSpinner />
          <p className="text-gray-600 mt-2">Initializing...</p>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated after initialization
  if (!isAuthenticated) {
    navigate('/login', { replace: true });
    return null;
  }

  // Render protected content (onboarding guard handles redirect if needed)
  return <>{children}</>;
};

// Animated Routes wrapper
const AnimatedRoutes: React.FC = () => {
  const location = useLocation();
  
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial="initial"
        animate="in"
        exit="out"
        variants={pageVariants}
        transition={pageTransition}
      >
        <Routes location={location}>
          <Route path="/" element={<AppLanding />} />
          <Route path="/login" element={<LoginView />} />
          <Route path="/signup" element={<SignupView />} />
          <Route path="/verify-email" element={<EmailVerificationView />} />
          <Route path="/forgot-password" element={<ForgotPasswordView />} />
          <Route path="/reset-password" element={<ResetPasswordView />} />
          <Route path="/onboarding" element={
            <ProtectedRoute>
              <OnboardingView />
            </ProtectedRoute>
          } />
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <DashboardView />
            </ProtectedRoute>
          } />
          <Route path="/practice" element={
            <ProtectedRoute>
              <PracticeView />
            </ProtectedRoute>
          } />
          <Route path="/practice/session/:sessionId" element={
            <ProtectedRoute>
              <PracticeTakingView />
            </ProtectedRoute>
          } />
          <Route path="/practice/session/:sessionId/analyzing" element={
            <ProtectedRoute>
              <PracticeView />
            </ProtectedRoute>
          } />
          <Route path="/practice/session/:sessionId/results" element={
            <ProtectedRoute>
              <PracticeView />
            </ProtectedRoute>
          } />
          <Route path="/exam" element={
            <ProtectedRoute>
              <ExamView />
            </ProtectedRoute>
          } />
          <Route path="/exam/:examId" element={
            <ProtectedRoute>
              <ExamTakingView />
            </ProtectedRoute>
          } />
          <Route path="/exam/:examId/results" element={
            <ProtectedRoute>
              <ExamResultsView />
            </ProtectedRoute>
          } />
          <Route path="/practice-log" element={
            <ProtectedRoute>
              <PracticeLogView />
            </ProtectedRoute>
          } />
          <Route path="/consumption-history" element={
            <ProtectedRoute>
              <ConsumptionHistoryView />
            </ProtectedRoute>
          } />
          <Route path="/buy-credits" element={
            <ProtectedRoute>
              <BuyCreditView />
            </ProtectedRoute>
          } />
          <Route path="/checkout" element={
            <ProtectedRoute>
              <CheckoutView />
            </ProtectedRoute>
          } />
          <Route path="/payment-upi" element={
            <ProtectedRoute>
              <PaymentUPIView />
            </ProtectedRoute>
          } />
          <Route path="/payment-upi-pending" element={
            <ProtectedRoute>
              <PaymentUPIPendingView />
            </ProtectedRoute>
          } />
          <Route path="/payment-success" element={
            <ProtectedRoute>
              <PaymentSuccessView />
            </ProtectedRoute>
          } />
          <Route path="/settings" element={
            <ProtectedRoute>
              <SettingsView />
            </ProtectedRoute>
          } />
          <Route path="/faq" element={
            <ProtectedRoute>
              <FAQStudentsView />
            </ProtectedRoute>
          } />
          <Route path="/faq/schools" element={
            <ProtectedRoute>
              <FAQSchoolsView />
            </ProtectedRoute>
          } />
          
          {/* Public Routes (no auth required) */}
          <Route path="/shared/:shareCode" element={<PublicResultsView />} />
          <Route path="/feedback" element={<FeedbackView />} />
          
          <Route path="*" element={<NotFoundView />} />
        </Routes>
      </motion.div>
    </AnimatePresence>
  );
};

function App() {
  const isDowntime = useFeatureFlag('downtime');

  // If downtime flag is enabled, show maintenance page
  if (isDowntime) {
    return <DowntimeView />;
  }

  return (
    <Router>
      <PWAUpdater />
      <PWAInstallPrompt />
      <OfflineDetector />
      <MainLayout>
        <AnimatedRoutes />
      </MainLayout>
    </Router>
  );
}

export default App;
