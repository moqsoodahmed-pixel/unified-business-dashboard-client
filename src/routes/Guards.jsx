import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { LoadingState } from '../components/States.jsx';

export function RequireAuth({ children }) {
  const { user, ready } = useAuth();
  const loc = useLocation();
  if (!ready) return <LoadingState label="Restoring your session…" />;
  if (!user) return <Navigate to="/login" replace state={{ from: loc.pathname }} />;
  return children;
}

export function Forbidden() {
  return (
    <div className="state"><h3>You don’t have access to this page</h3><p>Ask a super admin if you need it.</p></div>
  );
}
