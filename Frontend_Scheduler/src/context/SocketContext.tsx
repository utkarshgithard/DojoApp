"use client";
import React, { createContext, useContext, useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import { Notification, SocketContextType } from '@/lib/types';
import { useAuth } from './authContext';

const SocketContext = createContext<SocketContextType | null>(null);

export const useSocket = (): SocketContextType | null => {
  return useContext(SocketContext);
};

export const SocketProvider = ({ children }: { children: React.ReactNode }) => {
  const { token, loading, profileLoading, userDetails } = useAuth() as any;
  const [socket, setSocket] = useState<Socket | null>(null);
  const [userNotifications, setUserNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    // If still loading authentication details or user profile, or no token/profile exists, don't connect
    if (loading || profileLoading || !token || !userDetails) {
      setSocket(null);
      return;
    }

    const s = io(process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000', {
      auth: { token }, // Use the token from AuthContext
    });

    s.on('connect', () => {
      console.log('✅ Socket connected:', s.id);
    });

    s.on('serverReady', () => {
      (s as any).serverReady = true;
    });

    s.on('disconnect', () => {
      (s as any).serverReady = false;
    });

    setSocket(s);

    return () => {
      s.disconnect();
    };
  }, [token, loading, profileLoading, userDetails]);

  const clearNotification = (id: number) => {
    setUserNotifications(prev => prev.filter(n => n.id !== id));
  };

  const clearAllNotifications = () => {
    setUserNotifications([]);
  };

  const value = React.useMemo(() => ({
    socket,
    userNotifications,
    clearNotification,
    clearAllNotifications,
  }), [socket, userNotifications]);

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};
