// context/SocketContext.js
import React, { createContext, useContext, useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import Swal from 'sweetalert2'

const SocketContext = createContext();

export const useSocket = () => {
  return useContext(SocketContext);
};

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [joinedSessions, setJoinedSessions] = useState(new Set());
  const [sessions, setSessions] = useState([]);
  const [userNotifications, setUserNotifications] = useState([]);

  useEffect(() => {
    const s = io(import.meta.env.VITE_BACKEND_URL, {
      auth: { token: localStorage.getItem('token') },
    });

    s.on('sessionJoined', (data) => {
      console.log('✅ Successfully joined session:', data);
      setJoinedSessions(prev => new Set([...prev, data.sessionId]));
      setSessions(prev => prev.map(s =>
        s._id === data.sessionId ? data.sessionDetails : s
      ));
    });

    // Listen for session left confirmation
    s.on('sessionLeft', (data) => {
      console.log('👋 Left session:', data);
      setJoinedSessions(prev => {
        const newSet = new Set(prev);
        newSet.delete(data.sessionId);
        return newSet;
      });
    });
    // Listen for other users joining
    s  // Listen for user join/leave notifications
    s.on('userJoinedSession', (data) => {
      console.log('👤 User joined session:', data);

      // Add to notifications
      setUserNotifications(prev => [
        ...prev,
        {
          id: Date.now(),
          type: 'join',
          userName: data.userName,
          sessionSubject: data.sessionSubject,
          timestamp: new Date()
        }
      ]);

      // Show toast notification
      Swal.fire({
        title: `${data.userName} joined the session`,
        text: `${data.userName} joined ${data.sessionDetails.subject}`,
        icon: 'info',
        timer: 3000,
        showConfirmButton: false,
        toast: true,
        position: 'top-end'
      });
    });

    s.on('userLeftSession', (data) => {
      console.log('👤 User left session:', data);

      // Add to notifications
      setUserNotifications(prev => [
        ...prev,
        {
          id: Date.now(),
          type: 'leave',
          userName: data.userName,
          sessionSubject: data.sessionSubject,
          timestamp: new Date()
        }
      ]);

      // Show toast notification
      Swal.fire({
        title: `${data.userName} left the session`,
        text: `${data.userName} left ${data.sessionDetails.subject}`,
        icon: 'info',
        timer: 3000,
        showConfirmButton: false,
        toast: true,
        position: 'top-end'
      });
    });

    setSocket(s);
    // Clear old notifications (older than 1 minute)


    return () => {
      s.disconnect();
    };
  }, []);
  useEffect(() => {
    const interval = setInterval(() => {
      const oneMinuteAgo = new Date(Date.now() - 60000);
      setUserNotifications(prev =>
        prev.filter(notif => new Date(notif.timestamp) > oneMinuteAgo)
      );
    }, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, []);

  const clearNotification = (id) => {
    setUserNotifications(prev => prev.filter(notif => notif.id !== id));
  };

  const clearAllNotifications = () => {
    setUserNotifications([]);
  };

  return (
    <SocketContext.Provider value={{ socket, joinedSessions, setJoinedSessions, sessions, setSessions, userNotifications, clearNotification, clearAllNotifications }}>
      {children}
    </SocketContext.Provider>
  );
};