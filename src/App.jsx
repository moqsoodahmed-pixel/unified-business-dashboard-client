import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import { ToastProvider } from './context/ToastContext.jsx';
import { AppLayout } from './layouts/AppLayout.jsx';
import { RequireAuth, Forbidden } from './routes/Guards.jsx';
import { ROUTES } from './routes/config.jsx';
import LoginPage from './pages/LoginPage.jsx';

function Protected({ route }) {
  const { can } = useAuth();
  const El = route.element;
  return can(route.permission) ? <El /> : <Forbidden />;
}

function Home() {
  const { user, can } = useAuth();
  // Land each role on the first screen it may open.
  const first = ROUTES.find((r) => !r.hidden && can(r.permission));
  return can('dashboard:read') ? <Protected route={ROUTES[0]} /> : first ? <Navigate to={first.path} replace /> : <Forbidden user={user} />;
}

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route element={<RequireAuth><AppLayout /></RequireAuth>}>
              <Route index element={<Home />} />
              {ROUTES.filter((r) => r.path !== '/').map((r) => <Route key={r.path} path={r.path.slice(1)} element={<Protected route={r} />} />)}
              <Route path="*" element={<div className="state"><h3>Page not found</h3></div>} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ToastProvider>
  );
}
