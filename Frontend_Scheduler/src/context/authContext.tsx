"use client";
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { auth } from '@/lib/firebase';
import { onIdTokenChanged, signOut } from 'firebase/auth';
import API from '@/lib/axios';

import { AuthContextType, User } from '@/lib/types';

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AuthProvider = (props: { children: React.ReactNode }) => {
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    if (savedToken) {
      setToken(savedToken);
    }
  }, []);
  const [userId, setUserId] = useState<string | null>(null);
  const [emailVerified, setEmailVerified] = useState<boolean>(true); // default true to avoid flicker before firebase resolves
  const [loading, setLoading] = useState(true);
  // ─── Stale-While-Revalidate ────────────────────────────────────────────────
  // Read cached profile from localStorage immediately so the UI paints
  // with real data before any network request finishes (same trick Instagram uses).
  const [userDetails, setUserDetails] = useState<User | null>(() => {
    try {
      const cached = localStorage.getItem('userDetails');
      return cached ? (JSON.parse(cached) as User) : null;
    } catch {
      return null;
    }
  });

  const [userName, setUserName] = useState<string>(() => {
    try {
      const cached = localStorage.getItem('userDetails');
      if (cached) {
        const parsed = JSON.parse(cached) as User;
        return parsed.name ?? '';
      }
    } catch { /* ignore */ }
    return '';
  });

  // If we already have cached data, don't show a loading spinner at all.
  // profileLoading will be set back to false immediately after the background fetch.
  const [profileLoading, setProfileLoading] = useState<boolean>(() => {
    try {
      return !localStorage.getItem('userDetails');
    } catch {
      return true;
    }
  });

  useEffect(() => {
    const unsubscribe = onIdTokenChanged(auth, async (user) => {
      if (user) {
        try {
          const newToken = await user.getIdToken();
          setToken(newToken);
          setUserId(user.uid);
          setEmailVerified(user.emailVerified);
          localStorage.setItem('token', newToken);
        } catch (error) {
          console.error("Firebase ID Token refresh error:", error);
          // If network fails, don't necessarily wipe out existing token state. 
          // They might just be offline temporarily.
        }
      } else {
        setToken(null);
        setUserId(null);
        setEmailVerified(false);
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

    // Only show loading spinner if there is no cached data yet
    const hasCachedData = !!localStorage.getItem('userDetails');
    if (!hasCachedData) setProfileLoading(true);

    API.get('/auth/userDetails')
      .then(res => {
        if (res.data.user) {
          setUserDetails(res.data.user);
          if (res.data.user.name) {
            setUserName(res.data.user.name);
          }
          // ✅ Persist fresh data so next load is instant
          try {
            localStorage.setItem('userDetails', JSON.stringify(res.data.user));
          } catch { /* storage quota exceeded — not critical */ }
        }
      })
      .catch(err => {
        console.error('Error fetching user details:', err);
        // On error, keep showing cached data — don't wipe it out
      })
      .finally(() => {
        setProfileLoading(false);
      });
  }, [loading, token]);

  const login = useCallback((newToken: string, uid?: string) => {
    setToken(newToken);
    if (uid) setUserId(uid);
    localStorage.setItem('token', newToken);
    
    // Attempt to read current firebase user verification status immediately on login call
    const current = auth.currentUser;
    if (current) {
      setEmailVerified(current.emailVerified);
    }
  }, []);

  const logout = useCallback(async () => {
    await signOut(auth);
    setToken(null);
    setUserId(null);
    setUserName('');
    setUserDetails(null);
    setEmailVerified(false);
    localStorage.removeItem('token');
    // ✅ Clear profile cache so a different user won't see stale data
    localStorage.removeItem('userDetails');
  }, []);

  const isAuthenticated = !!token;
  const value = React.useMemo(() => ({
    token,
    userId,
    login,
    logout,
    isAuthenticated,
    emailVerified,
    loading,
    userName,
    profileLoading,
    setUserName,
    userDetails,
    setUserDetails
  }), [token, userId, login, logout, isAuthenticated, emailVerified, loading, userName, profileLoading, userDetails]);

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
