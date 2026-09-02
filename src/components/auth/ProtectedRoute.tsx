import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { LoaderCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-bg-main">
        <div className="flex items-center gap-3 border-y border-border-base px-5 py-4">
          <LoaderCircle className="w-4 h-4 animate-spin text-ink-900" aria-hidden="true" />
          <p className="label-caps">Opening workspace</p>
        </div>
      </div>
    );
  }

  if (!user) {
    // Redirect to auth page but save the attempted url
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};
