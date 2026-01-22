import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Swords } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
  requireModerator?: boolean;
}

export default function ProtectedRoute({ 
  children, 
  requireAdmin = false,
  requireModerator = false 
}: ProtectedRouteProps) {
  const { user, loading, isAdmin, isModerator } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-nebula-gradient bg-stars flex items-center justify-center">
        <div className="animate-pulse-glow">
          <Swords className="w-16 h-16 text-primary" />
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  if (requireAdmin && !isAdmin) {
    return <Navigate to="/hub" replace />;
  }

  if (requireModerator && !isModerator) {
    return <Navigate to="/hub" replace />;
  }

  return <>{children}</>;
}
