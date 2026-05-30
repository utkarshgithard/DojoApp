"use client";
import React, { createContext, useContext, useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import Swal from 'sweetalert2';
import { Notification, SocketContextType } from '@/lib/types';

const SocketContext = createContext<SocketContextType | null>(null);

export const useSocket = (): SocketContextType | null => {
  return useContext(SocketContext);
};

import { useAuth } from './authContext';

export const SocketProvider = ({ children }: { children: React.ReactNode }) => {
  const { token, loading, profileLoading, userDetails } = useAuth() as any;
  const [socket, setSocket] = useState<Socket | null>(null);
  const [joinedSessions, setJoinedSessions] = useState<Set<string>>(new Set());
  const [sessions, setSessions] = useState<any[]>([]);
  const [sessionsLoaded, setSessionsLoaded] = useState(false);
  const [userNotifications, setUserNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    // If still loading authentication details or user profile, or no token/profile exists, don't connect
    if (loading || profileLoading || !token || !userDetails) {
      setSocket(null);
      setJoinedSessions(new Set());
      setSessionsLoaded(false);
      return;
    }

    const s = io(process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000', {
      auth: { token }, // Use the token from AuthContext
    });

    s.on('connect', () => {
      console.log('✅ Socket connected for session restoration:', s.id);
      // Restore joined sessions from localStorage on reconnect
      try {
        const saved = localStorage.getItem('joinedSessions');
        if (saved) {
          const ids: string[] = JSON.parse(saved);
          if (ids.length > 0) {
            setJoinedSessions(new Set(ids));
          }
        }
      } catch (_) {}
    });

    s.on('sessionJoined', (data: { sessionId: string; sessionDetails: any }) => {
      console.log('✅ Successfully joined session:', data);
      setJoinedSessions(prev => new Set([...prev, data.sessionId]));
      setSessions(prev => prev.map(sess =>
        sess.id === data.sessionId ? data.sessionDetails : sess
      ));
    });

    s.on('sessionLeft', (data: { sessionId: string }) => {
      console.log('👋 Left session:', data);
      setJoinedSessions(prev => {
        const newSet = new Set(prev);
        newSet.delete(data.sessionId);
        return newSet;
      });
    });

    s.on('userJoinedSession', (data: { name: string; sessionId: string }) => {
      console.log('👤 User joined session:', data);
      setUserNotifications(prev => [
        ...prev,
        { id: Date.now(), type: 'join', userName: data.name, timestamp: new Date() }
      ]);
      Swal.fire({
        title: `${data.name} joined the session`,
        icon: 'info',
        timer: 3000,
        showConfirmButton: false,
        toast: true,
        position: 'top-end'
      });
    });

    s.on('userLeftSession', (data: { name: string; sessionId: string }) => {
      console.log('👤 User left session:', data);
      setUserNotifications(prev => [
        ...prev,
        { id: Date.now(), type: 'leave', userName: data.name, timestamp: new Date() }
      ]);
      Swal.fire({
        title: `${data.name} left the session`,
        icon: 'info',
        timer: 3000,
        showConfirmButton: false,
        toast: true,
        position: 'top-end'
      });
    });

    setSocket(s);

    return () => {
      s.disconnect();
    };
  }, [token, loading, profileLoading, userDetails]);

  // Clear notifications older than 1 minute
  useEffect(() => {
    const interval = setInterval(() => {
      const oneMinuteAgo = new Date(Date.now() - 60000);
      setUserNotifications(prev =>
        prev.filter(notif => new Date(notif.timestamp) > oneMinuteAgo)
      );
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const clearNotification = (id: number) => {
    setUserNotifications(prev => prev.filter(notif => notif.id !== id));
  };

  const clearAllNotifications = () => {
    setUserNotifications([]);
  };

  const value = React.useMemo(() => ({
    socket,
    joinedSessions,
    setJoinedSessions,
    sessions,
    setSessions,
    sessionsLoaded,
    setSessionsLoaded,
    userNotifications,
    clearNotification,
    clearAllNotifications,
  }), [socket, joinedSessions, sessions, sessionsLoaded, userNotifications]);

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};
