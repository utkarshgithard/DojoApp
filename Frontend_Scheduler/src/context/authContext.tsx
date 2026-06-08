"use client";
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { auth } from '@/lib/firebase';
import { onIdTokenChanged, signOut } from 'firebase/auth';
import API from '@/lib/axios';

import { AuthContextType, User } from '@/lib/types';

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
  const [userDetails, setUserDetails] = useState<User | null>(null);

  useEffect(() => {
    const unsubscribe = onIdTokenChanged(auth, async (user) => {
      if (user) {
        try {
          const newToken = await user.getIdToken();
          setToken(newToken);
          setUserId(user.uid);
          localStorage.setItem('token', newToken);
        } catch (error) {
          console.error("Firebase ID Token refresh error:", error);
          // If network fails, don't necessarily wipe out existing token state. 
          // They might just be offline temporarily.
        }
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
      setUserDetails(null);
      setProfileLoading(false);
      return;
    }

    setProfileLoading(true);
    API.get('/auth/userDetails')
      .then(res => {
        if (res.data.user) {
          setUserDetails(res.data.user);
          if (res.data.user.name) {
            setUserName(res.data.user.name);
          }
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
    setUserDetails(null);
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
    setUserName,
    userDetails,
    setUserDetails
  }), [token, userId, login, logout, isAuthenticated, loading, userName, profileLoading, userDetails]);

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

