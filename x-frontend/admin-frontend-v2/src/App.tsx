import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import AdminLayout from './components/AdminLayout'
import SchoolLayout from './components/SchoolLayout'
import SchoolProtectedRoute from './components/SchoolProtectedRoute'
import { AdminAuthProvider } from './context/AdminAuthContext'
import { SchoolAuthProvider } from './context/SchoolAuthContext'
import { useAdminAuth } from './hooks/useAdminAuth'
import DashboardPage from './pages/DashboardPage'
import LoginPage from './pages/LoginPage'
import MessagesManagementPage from './pages/MessagesManagementPage'
import { PricingPolicyPage } from './pages/PricingPolicyPage'
import PromptManagementPage from './pages/PromptManagementPage'
import QuestionGenerationPage from './pages/QuestionGenerationPage'
import QuestionsPage from './pages/QuestionsPage'
import QuestionsDashboardPage from './pages/QuestionsDashboardPage'
import SchoolsPage from './pages/SchoolsPage'
import SchoolCreatePage from './pages/SchoolCreatePage'
import SchoolEditPage from './pages/SchoolEditPage'
import PaymentManagementPage from './pages/PaymentManagementPage'
// School Admin Pages
import SchoolLoginPage from './pages/school/SchoolLoginPage'
import SchoolDashboardPage from './pages/school/SchoolDashboardPage'
import SchoolUsersPage from './pages/school/SchoolUsersPage'
import SchoolUserDetailsPage from './pages/school/SchoolUserDetailsPage'
import SchoolUserActivitiesPage from './pages/school/SchoolUserActivitiesPage'
import SchoolUserResultDetailPage from './pages/school/SchoolUserResultDetailPage'
import SchoolProfilePage from './pages/school/SchoolProfilePage'
import SchoolTemplatesPage from './pages/school/SchoolTemplatesPage'
import SchoolImpersonationLandingPage from './pages/school/SchoolImpersonationLandingPage'
import SchoolSessionDetailPage from './pages/school/SchoolSessionDetailPage'
import SchoolTemplateUsagePage from './pages/school/SchoolTemplateUsagePage'
import SchoolBillingPage from './pages/school/SchoolBillingPage'

// Protected Route component
function ProtectedRoute({ children }: { children: React.ReactNode }) {
    const { isAuthenticated, isLoading } = useAdminAuth()

    if (isLoading) {
        return <div className="flex items-center justify-center min-h-screen">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-eu-blue"></div>
        </div>
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />
    }

    return <>{children}</>
}

// Public Route component (redirect if authenticated)
function PublicRoute({ children }: { children: React.ReactNode }) {
    const { isAuthenticated, isLoading } = useAdminAuth()

    if (isLoading) {
        return <div className="flex items-center justify-center min-h-screen">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-eu-blue"></div>
        </div>
    }

    if (isAuthenticated) {
        return <Navigate to="/dashboard" replace />
    }

    return <>{children}</>
}

// Route Isolation Guard - prevents admin from accessing school routes directly
function AdminRouteGuard({ children }: { children: React.ReactNode }) {
    const location = useLocation();
    
    // If admin tries to access school routes, redirect to admin dashboard
    if (location.pathname.startsWith('/school')) {
        return <Navigate to="/dashboard" replace />;
    }
    
    return <>{children}</>;
}

function App() {
    return (
        <AdminAuthProvider>
            <SchoolAuthProvider>
                <Routes>
                    {/* System Admin Routes */}
                    <Route path="/login" element={
                        <PublicRoute>
                            <LoginPage />
                        </PublicRoute>
                    } />

                    <Route path="/" element={
                        <ProtectedRoute>
                            <AdminRouteGuard>
                                <AdminLayout />
                            </AdminRouteGuard>
                        </ProtectedRoute>
                    }>
                        <Route index element={<Navigate to="/dashboard" replace />} />
                        <Route path="dashboard" element={<DashboardPage />} />
                        <Route path="institutes" element={<SchoolsPage />} />
                        <Route path="institutes/create" element={<SchoolCreatePage />} />
                        <Route path="institutes/:schoolId/edit" element={<SchoolEditPage />} />
                        <Route path="questions" element={<QuestionsDashboardPage />} />
                        <Route path="questions/list" element={<QuestionsPage />} />
                        <Route path="prompt-management" element={<PromptManagementPage />} />
                        <Route path="pricing-policy" element={<PricingPolicyPage />} />
                        <Route path="question-generation" element={<QuestionGenerationPage />} />
                        <Route path="payments" element={<PaymentManagementPage />} />
                        <Route path="messages" element={<MessagesManagementPage />} />
                    </Route>

                    {/* School Admin Routes */}
                    <Route path="/school/login" element={<SchoolLoginPage />} />
                    <Route path="/school/impersonation" element={<SchoolImpersonationLandingPage />} />
                    
                    <Route path="/school" element={
                        <SchoolProtectedRoute>
                            <SchoolLayout />
                        </SchoolProtectedRoute>
                    }>
                        <Route index element={<Navigate to="/school/dashboard" replace />} />
                        <Route path="dashboard" element={<SchoolDashboardPage />} />
                        <Route path="users" element={<SchoolUsersPage />} />
                        <Route path="users/:userId" element={<SchoolUserDetailsPage />} />
                        <Route path="users/:userId/activities" element={<SchoolUserActivitiesPage />} />
                        <Route path="users/:userId/:sessionId/result" element={<SchoolUserResultDetailPage />} />
                        <Route path="profile" element={<SchoolProfilePage />} />
                        <Route path="templates" element={<SchoolTemplatesPage />} />
                        <Route path="templates/:templateId/usage" element={<SchoolTemplateUsagePage />} />
                        <Route path="sessions/:sessionId" element={<SchoolSessionDetailPage />} />
                        <Route path="billing" element={<SchoolBillingPage />} />
                    </Route>

                    {/* Catch all route */}
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </SchoolAuthProvider>
        </AdminAuthProvider>
    )
}

export default App
