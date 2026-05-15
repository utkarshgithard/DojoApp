"use client";
import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth } from '@/lib/firebase';
import { onIdTokenChanged, signOut } from 'firebase/auth';

export const AuthContext = createContext<any>(undefined);

const AuthProvider = (props: { children: React.ReactNode }) => {
  const [token, setToken] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

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
      setMounted(true);
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
    isAuthenticated
  }), [token, userId, login, logout, isAuthenticated]);

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
