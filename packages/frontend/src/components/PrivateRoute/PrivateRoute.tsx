import React from 'react';
import { Navigate } from 'react-router-dom';

interface PrivateRouteProps {
  children: React.ReactNode;
  isAuthenticated: boolean;
  isLoading: boolean;
}

/**
 * Component to protect routes that require authentication
 */
export const PrivateRoute: React.FC<PrivateRouteProps> = ({
  children,
  isAuthenticated,
  isLoading,
}) => {
  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="private-route-loading">
        <div className="private-route-loading__spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Render protected content
  return <>{children}</>;
};
