import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { getCurrentUser, loginUser, registerUser, setAuthToken } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const bootstrapAuth = async () => {
      const savedSession = localStorage.getItem('sims_auth');
      if (!savedSession) {
        setLoading(false);
        return;
      }
      try {
        const parsed = JSON.parse(savedSession);
        setAuthToken(parsed.access_token);
        const currentUser = await getCurrentUser();
        setUser({
          ...parsed,
          username: currentUser.username,
          role: currentUser.role,
        });
      } catch {
        localStorage.removeItem('sims_auth');
        setAuthToken(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    bootstrapAuth();
  }, []);

  const login = useCallback(async (username, password) => {
    const data = await loginUser(username, password);
    localStorage.setItem('sims_auth', JSON.stringify(data));
    setAuthToken(data.access_token);
    setUser(data);
    return data;
  }, []);

  const register = useCallback(async (username, password) => {
    return registerUser(username, password);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('sims_auth');
    setAuthToken(null);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      role: user?.role || null,
      isAuthenticated: Boolean(user),
      loading,
      login,
      register,
      logout,
    }),
    [user, loading, login, register, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
