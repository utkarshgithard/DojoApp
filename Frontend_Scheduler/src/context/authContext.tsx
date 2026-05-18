"use client";
import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth } from '@/lib/firebase';
import { onIdTokenChanged, signOut } from 'firebase/auth';

import { AuthContextType } from '@/lib/types';

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AuthProvider = (props: { children: React.ReactNode }) => {
  const [token, setToken] = useState<string | null>(() => {
    if (typeof window !== 'undefined') return localStorage.getItem('token');
    return null;
  });
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onIdTokenChanged(auth, async (user) => {
      if (user) {
        const newToken = await user.getIdToken();
        setToken(newToken);
        setUserId(user.uid);
        localStorage.setItem('token', newToken);
      } else {
        setToken(null);
        setUserId(null);
        localStorage.removeItem('token');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = React.useCallback((newToken: string, uid?: string) => {
    setToken(newToken);
    if (uid) setUserId(uid);
    localStorage.setItem('token', newToken);
  }, []);

  const logout = React.useCallback(async () => {
    await signOut(auth);
    setToken(null);
    setUserId(null);
    localStorage.removeItem('token');
  }, []);

  const isAuthenticated = !!token;
  const value = React.useMemo(() => ({
    token,
    userId,
    login,
    logout,
    isAuthenticated,
    loading
  }), [token, userId, login, logout, isAuthenticated, loading]);

  return (
    <AuthContext.Provider value={value}>
      {props.children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthProvider;
