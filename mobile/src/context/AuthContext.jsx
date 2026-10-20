import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, session } from '../lib/api';

const AuthContext = createContext(null);

/** Sesión: carga el token guardado, trae el perfil y expone permisos y plan (espejo del front web). */
export const AuthProvider = ({ children }) => {
  const [status, setStatus] = useState('loading'); // loading | anonymous | authenticated
  const [user, setUser] = useState(null);

  const refresh = useCallback(async () => {
    const data = await api.get('/me');
    setUser(data);
    setStatus('authenticated');
    return data;
  }, []);

  const logout = useCallback(async () => {
    await session.setToken(null);
    setUser(null);
    setStatus('anonymous');
  }, []);

  useEffect(() => {
    session.onUnauthorized(logout);
    (async () => {
      const { token } = await session.load();
      if (!token) return setStatus('anonymous');
      try {
        await refresh();
      } catch {
        // Sin red o token vencido: se vuelve a pedir el ingreso.
        await logout();
      }
    })();
  }, [refresh, logout]);

  const login = useCallback(async (username, password) => {
    const data = await api.post('/auth/login', { username, password });
    await session.setToken(data.token);
    setUser(data.user);
    setStatus('authenticated');
    return data.user;
  }, []);

  const can = useCallback((entity, action) => !!user?.permissions?.some((p) => p.entity === entity && p.action === action), [user]);
  const hasFeature = useCallback((feature) => !!user?.plan?.features?.includes(feature), [user]);
  const inDevelopment = useCallback((feature) => !!user?.plan?.inDevelopment?.includes(feature), [user]);
  const subscription = user?.company?.subscription ?? null;

  const value = useMemo(
    () => ({
      status,
      user,
      company: user?.company ?? null,
      isAdmin: !!user?.isAdmin,
      subscription,
      hasAccess: !subscription || ['active', 'grace'].includes(subscription.state),
      can,
      hasFeature,
      inDevelopment,
      login,
      logout,
      refresh,
      setUser,
    }),
    [status, user, subscription, can, hasFeature, inDevelopment, login, logout, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
