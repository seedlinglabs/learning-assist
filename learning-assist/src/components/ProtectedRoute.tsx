import React from 'react';
import { useAuth } from '../context/AuthContext';
import LoginForm from './LoginForm';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'teacher' | 'student' | 'parent';
  requiredClassAccess?: string; // Class ID that user must have access to
  fallback?: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredRole,
  requiredClassAccess,
  fallback
}) => {
  const { user, isAuthenticated, isLoading, hasRole, canAccessClass } = useAuth();

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <div className="auth-loading">
        <div className="auth-loading-spinner"></div>
      </div>
    );
  }

  // Show login form if not authenticated
  if (!isAuthenticated || !user) {
    return <>{fallback || <LoginForm />}</>;
  }

  // Check role-based access
  if (requiredRole && !hasRole(requiredRole)) {
    return (
      <div className="access-denied">
        <div className="access-denied-content">
          <h2>Access Denied</h2>
          <p>You don't have permission to access this content.</p>
          <p>Required role: <span className={`user-type-badge user-type-${requiredRole}`}>{requiredRole}</span></p>
          <p>Your role: <span className={`user-type-badge user-type-${user.user_type}`}>{user.user_type}</span></p>
        </div>
      </div>
    );
  }

  // Check class-based access (for parents)
  if (requiredClassAccess && !canAccessClass(requiredClassAccess)) {
    return (
      <div className="access-denied">
        <div className="access-denied-content">
          <h2>Access Denied</h2>
          <p>You don't have permission to access this class content.</p>
          <p>Required class access: <code>{requiredClassAccess}</code></p>
          <p>Your accessible classes: <code>{user.class_access.join(', ') || 'None'}</code></p>
        </div>
      </div>
    );
  }

  // User has proper access, render children
  return <>{children}</>;
};

export default ProtectedRoute;
