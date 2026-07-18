import { Navigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuth } from './AuthContext';

export default function RequireAdmin({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'ADMIN') {
    return (
      <main className="content" data-testid="admin-blocked">
        <div className="card state">
          <span className="emoji">🔒</span>
          <h2>Admins only</h2>
          <p>You don’t have permission to view this page.</p>
        </div>
      </main>
    );
  }
  return <>{children}</>;
}
