import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

export function ProtectedRoute({ children }: { children: JSX.Element }) {
  const user = useAuthStore((s) => s.user);
  if (!user || (user.role !== 'admin' && user.role !== 'agent')) {
    return <Navigate to="/login" replace />;
  }
  return children;
}
