"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import API from '@/lib/axios';
import { useAuth } from './authContext';
import { useSocket } from './SocketContext';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { subscribeToPush } from '@/lib/webPush';

export interface Notification {
  id: string;
  userId: string;
  senderId: string;
  type: string;
  postId: string | null;
  commentId: string | null;
  read: boolean;
  createdAt: string;
  sender: {
    id: string;
    name: string;
    avatarUrl: string | null;
  };
  post?: {
    id: string;
    content: string;
    media?: {
      url: string;
      type: string;
    }[];
  } | null;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  fetchNotifications: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, loading: authLoading, token } = useAuth();
  const socketContext = useSocket();
  const router = useRouter();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const fetchNotifications = useCallback(async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    try {
      const res = await API.get('/notifications');
      if (res.data && res.data.success) {
        const list = res.data.notifications || [];
        setNotifications(list);
        const unread = list.filter((n: Notification) => !n.read).length;
        setUnreadCount(unread);
      }
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  const markAsRead = useCallback(async (id: string) => {
    try {
      await API.put(`/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      await API.put('/notifications/read-all');
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
      toast.success('All notifications marked as read');
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  }, []);

  // Fetch notifications on authentication
  useEffect(() => {
    if (isAuthenticated && !authLoading) {
      fetchNotifications();
    } else {
      setNotifications([]);
      setUnreadCount(0);
    }
  }, [isAuthenticated, authLoading, fetchNotifications]);

  // Auto-subscribe to push notifications upon login if permission is default or granted
  useEffect(() => {
    if (isAuthenticated && !authLoading && token) {
      const autoRequestPush = async () => {
        if (typeof window !== 'undefined' && 'Notification' in window) {
          const permission = window.Notification.permission;
          if (permission === 'default' || permission === 'granted') {
            try {
              await subscribeToPush(token);
            } catch (err) {
              console.error('Error during auto push subscription:', err);
            }
          }
        }
      };
      
      // Delay slightly to let the page load completely before prompting
      const timer = setTimeout(autoRequestPush, 2000);
      return () => clearTimeout(timer);
    }
  }, [isAuthenticated, authLoading, token]);

  // Real-time socket event listener
  useEffect(() => {
    const socketInstance = socketContext?.socket;
    if (!socketInstance || !isAuthenticated) return;

    const handleNewNotification = (notification: Notification) => {
      setNotifications((prev) => {
        // Prevent duplicate logs
        if (prev.some((n) => n.id === notification.id)) return prev;
        
        // Show HTML5 Notification if permitted
        if (typeof window !== 'undefined' && window.Notification?.permission === 'granted') {
          let bodyText = "";
          if (notification.type === 'like') bodyText = `${notification.sender.name} liked your post.`;
          else if (notification.type === 'comment') bodyText = `${notification.sender.name} commented on your post.`;
          else if (notification.type === 'follow_request') bodyText = `${notification.sender.name} started following you.`;
          else if (notification.type === 'friendship_mutual') bodyText = `You and ${notification.sender.name} are now friends!`;
          else bodyText = `New update from ${notification.sender.name}`;

          new window.Notification('New Notification!', { body: bodyText });
        }

        // Show premium sonner toast
        let titleText = 'New Notification! 🔔';
        let bodyText = '';
        if (notification.type === 'like') {
          titleText = 'New Like! ❤️';
          bodyText = `${notification.sender.name} liked your post.`;
        } else if (notification.type === 'comment') {
          titleText = 'New Comment! 💬';
          bodyText = `${notification.sender.name} commented on your post.`;
        } else if (notification.type === 'follow_request') {
          titleText = 'New Follower! 👤';
          bodyText = `${notification.sender.name} started following you. Follow back to become friends!`;
        } else if (notification.type === 'friendship_mutual') {
          titleText = 'New Friend! 🤝';
          bodyText = `You and ${notification.sender.name} are now friends!`;
        }

        toast.info(titleText, {
          description: bodyText,
          action: {
            label: 'View',
            onClick: () => {
              markAsRead(notification.id);
              if (notification.type === 'follow_request' || notification.type === 'friendship_mutual') {
                router.push('/friends');
              } else if (notification.postId) {
                router.push(`/community/post/${notification.postId}`);
              } else {
                router.push('/notifications');
              }
            },
          },
        });

        setUnreadCount((c) => c + 1);
        return [notification, ...prev];
      });
    };

    socketInstance.on('newNotification', handleNewNotification);

    return () => {
      socketInstance.off('newNotification', handleNewNotification);
    };
  }, [socketContext?.socket, isAuthenticated, router, markAsRead]);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        loading,
        fetchNotifications,
        markAsRead,
        markAllAsRead,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};
