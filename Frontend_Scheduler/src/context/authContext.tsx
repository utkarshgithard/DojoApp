"use client";
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { auth } from '@/lib/firebase';
import { onIdTokenChanged, signOut } from 'firebase/auth';
import API from '@/lib/axios';

import { AuthContextType } from '@/lib/types';

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AuthProvider = (props: { children: React.ReactNode }) => {
  const [token, setToken] = useState<string | null>(() => {
    if (typeof window !== 'undefined') return localStorage.getItem('token');
    return null;
  });
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState('');
  const [profileLoading, setProfileLoading] = useState(true);

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

  // Fetch user details once when authentication resolves
  useEffect(() => {
    if (loading) return;
    if (!token) {
      setUserName('');
      setProfileLoading(false);
      return;
    }

    setProfileLoading(true);
    API.get('/auth/userDetails')
      .then(res => {
        if (res.data.user?.name) {
          setUserName(res.data.user.name);
        }
      })
      .catch(err => {
        console.error('Error fetching user details:', err);
      })
      .finally(() => {
        setProfileLoading(false);
      });
  }, [loading, token]);

  const login = useCallback((newToken: string, uid?: string) => {
    setToken(newToken);
    if (uid) setUserId(uid);
    localStorage.setItem('token', newToken);
  }, []);

  const logout = useCallback(async () => {
    await signOut(auth);
    setToken(null);
    setUserId(null);
    setUserName('');
    localStorage.removeItem('token');
  }, []);

  const isAuthenticated = !!token;
  const value = React.useMemo(() => ({
    token,
    userId,
    login,
    logout,
    isAuthenticated,
    loading,
    userName,
    profileLoading,
    setUserName
  }), [token, userId, login, logout, isAuthenticated, loading, userName, profileLoading]);

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
