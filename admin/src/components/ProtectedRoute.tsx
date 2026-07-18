import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

export function ProtectedRoute({ children }: { children: JSX.Element }) {
  const user = useAuthStore((s) => s.user);
  if (!user || user.role !== 'admin') {
    return <Navigate to="/login" replace />;
  }
  return children;
}
