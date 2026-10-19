import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, setUnauthorizedHandler, tokenStore } from '../lib/api';

const AuthContext = createContext(null);

/** Lee el vencimiento del JWT sin librerías (solo para no mostrar una sesión ya vencida). */
const isTokenValid = (token) => {
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return !payload.exp || Date.now() < payload.exp * 1000;
  } catch {
    return false;
  }
};

/**
 * Sesión única para toda la app: perfil, permisos, empresa y estado de la suscripción
 * se piden una vez al entrar.
 */
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState('loading'); // loading | authenticated | anonymous

  const logout = useCallback(() => {
    tokenStore.clear();
    setUser(null);
    setStatus('anonymous');
  }, []);

  const refresh = useCallback(async () => {
    const { data } = await api.get('/me');
    setUser(data);
    setStatus('authenticated');
    return data;
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(logout);
    const token = tokenStore.get();
    if (!token || !isTokenValid(token)) {
      logout();
      return;
    }
    refresh().catch(logout);
  }, [logout, refresh]);

  const login = useCallback(async (username, password) => {
    const { data } = await api.post('/auth/login', { username, password });
    tokenStore.set(data.token);
    setUser(data.user);
    setStatus('authenticated');
    return data.user;
  }, []);

  const can = useCallback(
    (entity, action) => !!user?.permissions?.some((p) => p.entity === entity && p.action === action),
    [user],
  );

  const subscription = user?.company?.subscription ?? null;
  const value = useMemo(
    () => ({
      user,
      status,
      login,
      logout,
      refresh,
      setUser,
      can,
      isAdmin: !!user?.isAdmin,
      isSuperAdmin: !!user?.isSuperAdmin,
      company: user?.company ?? null,
      subscription,
      /** La empresa puede usar la app (al día o en período de gracia). */
      hasAccess: !!user?.company && ['active', 'grace'].includes(subscription?.state),
    }),
    [user, status, login, logout, refresh, can, subscription],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return ctx;
};
