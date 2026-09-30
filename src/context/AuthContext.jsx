import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { refreshSession, setAuthLostHandler, tokenStore } from '../api/client.js';
import { authService } from '../services/index.js';

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setAuthLostHandler(() => setUser(null));
    // Silent session restore from the httpOnly refresh cookie.
    refreshSession().then((d) => setUser(d.user)).catch(() => setUser(null)).finally(() => setReady(true));
  }, []);

  const login = useCallback(async (identifier, password) => {
    const d = await authService.login(identifier, password);
    tokenStore.set(d.accessToken);
    setUser(d.user);
    return d.user;
  }, []);

  const logout = useCallback(async () => {
    try { await authService.logout(); } catch { /* already signed out */ }
    tokenStore.set(null);
    setUser(null);
  }, []);

  const value = useMemo(() => ({
    user, ready, login, logout,
    can: (permission) => Boolean(user?.permissions?.includes(permission)),
    canAny: (...perms) => perms.some((p) => user?.permissions?.includes(p)),
  }), [user, ready, login, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
