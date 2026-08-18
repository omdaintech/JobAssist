/**
 * School Protected Route Component
 * Ensures only authenticated school admins can access school routes
 */

import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useSchoolAuth } from '../context/SchoolAuthContext';

interface SchoolProtectedRouteProps {
  children: React.ReactNode;
}

const SchoolProtectedRoute: React.FC<SchoolProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, loading } = useSchoolAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    // Redirect to school login with the current location
    return <Navigate to="/school/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

export default SchoolProtectedRoute;
