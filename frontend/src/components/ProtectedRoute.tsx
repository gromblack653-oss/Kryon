import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import type { UserRole } from '../types';

interface Props {
  children: JSX.Element;
  role?: UserRole;
}

export function ProtectedRoute({ children, role }: Props) {
  const user = useAuthStore((s) => s.user);
  const location = useLocation();

  if (!user) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }
  if (role && user.role !== role) {
    return <Navigate to="/" replace />;
  }
  return children;
}
