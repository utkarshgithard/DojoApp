"use client";

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useDarkMode } from '@/context/DarkModeContext';
import { useAttendance } from '@/context/AttendanceContext';
import SubjectStatsChart from '@/components/SubjectStatsChart';
import CreateStudySession from '@/components/CreateStudySession';
import SessionChat from '@/components/SessionChat';
import { useSocket } from '@/context/SocketContext';
import { useAuth } from '@/context/authContext'; // FIX: corrected casing to match disk
import API from '@/lib/axios';
import SessionStatus from '@/components/SessionStatus';
import { DashboardInvite as Invite, StudySession as Session, StudySession } from '@/lib/types';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { CalendarIcon, Sun, Moon, Plus, LogOut, ArrowRight, UserPlus, Users, MessageSquare } from 'lucide-react';

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------
const Dashboard = () => {
  const router = useRouter();
  const { darkMode, toggleDarkMode } = useDarkMode() as any;
  const { date, setDate, unmarkedSubjects, markedSubjects, handleAttendance, invites, loadExistingInvites, setInvites, friends } = useAttendance() as any;
  const { socket, joinedSessions, setJoinedSessions, sessions, setSessions } = useSocket() as any;

  // FIX: userId from verified auth context — never decode JWT client-side
  const { userId: currentUserId, isAuthenticated, loading, logout } = useAuth() as any;

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, loading, router]);

  const [chatOpen, setChatOpen] = useState(false);
  const [createSessionOpen, setCreateSessionOpen] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [attendanceConfirm, setAttendanceConfirm] = useState<{ subject: any; status: string } | null>(null);
  const [sessionEndConfirm, setSessionEndConfirm] = useState<{ sessionId: string } | null>(null);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [currentSessionDetails, setCurrentSessionDetails] = useState<Session | null>(null);
  const [friendCode, setFriendCode] = useState('');
  const [friendMessage, setFriendMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const friendMessageTimer = useRef<NodeJS.Timeout | null>(null);

  // FIX: per-invite pending state to prevent double-tap and allow retry on failure
  const [pendingInviteId, setPendingInviteId] = useState<string | null>(null);

  // FIX: notification badge counter
  const [newInviteCount, setNewInviteCount] = useState(0);

  // FIX: keep a ref to joinedSessions so the 'connect' handler always sees the latest value
  const joinedSessionsRef = useRef<Set<string>>(joinedSessions);
  useEffect(() => {
    joinedSessionsRef.current = joinedSessions;
  }, [joinedSessions]);

  // ---------------------------------------------------------------------------
  // Stable callbacks (useCallback prevents stale closures in socket handlers)
  // ---------------------------------------------------------------------------
  const openChat = useCallback((sessionId: string, sessionDetails: Session) => {
    setCurrentSessionId(sessionId);
    setCurrentSessionDetails(sessionDetails);
    setChatOpen(true);
  }, []);

  const closeCreateSession = useCallback(() => setCreateSessionOpen(false), []);

  const handleJoinSession = useCallback((sessionId: string) => {
    if (!socket || !sessionId) return;
    socket.emit('joinSession', { sessionId });
    setJoinedSessions((prev: Set<string>) => {
      const next = new Set([...prev, sessionId]);
      // FIX: localStorage only stores UI open/close state, NOT used to drive socket emissions
      localStorage.setItem('joinedSessions', JSON.stringify([...next]));
      return next;
    });
  }, [socket, setJoinedSessions]);

  const handleLeaveSession = useCallback((sessionId: string) => {
    if (!socket || !sessionId) return;
    socket.emit('leaveSession', { sessionId });
    setJoinedSessions((prev: Set<string>) => {
      const next = new Set(prev);
      next.delete(sessionId);
      localStorage.setItem('joinedSessions', JSON.stringify([...next]));
      return next;
    });
    if (currentSessionId === sessionId) setChatOpen(false);
  }, [socket, setJoinedSessions, currentSessionId]);

  // ---------------------------------------------------------------------------
  // Friend message auto-clear
  // ---------------------------------------------------------------------------
  const showFriendMessage = (text: string, type: 'success' | 'error') => {
    setFriendMessage({ text, type });
    if (friendMessageTimer.current) clearTimeout(friendMessageTimer.current);
    // FIX: auto-clear after 3 seconds instead of staying forever
    friendMessageTimer.current = setTimeout(() => setFriendMessage(null), 3000);
  };

  // ---------------------------------------------------------------------------
  // Add friend
  // ---------------------------------------------------------------------------
  const handleAddFriend = async () => {
    if (!friendCode) return;
    try {
      const res = await API.post('/auth/add', { friendCode });
      showFriendMessage(res.data.message, 'success');
      setFriendCode('');
    } catch (error: any) {
      showFriendMessage(error.response?.data?.error || 'Failed to add friend', 'error');
    }
  };

  // ---------------------------------------------------------------------------
  // Data loaders (with unmount guard to prevent state update on unmounted component)
  // ---------------------------------------------------------------------------
  const loadExistingSessions = useCallback(async (signal?: AbortSignal) => {
    try {
      const response = await API.get('/study-session/mine', { signal });
      if (!signal?.aborted) setSessions(response.data);
    } catch (error: any) {
      if (error.name !== 'CanceledError' && error.name !== 'AbortError') {
        console.error('Error loading existing sessions:', error);
      }
    }
  }, [setSessions]);

  // ---------------------------------------------------------------------------
  // Active sessions derived value
  // ---------------------------------------------------------------------------
  const activeSessions: Session[] = (sessions as Session[]).filter(
    (s) => s.status === 'scheduled' || s.status === 'in_progress'
  );

  // ---------------------------------------------------------------------------
  // Socket event handlers — defined with useCallback so they can be cleanly
  // added/removed and don't close over stale state
  // ---------------------------------------------------------------------------
  const onConnect = useCallback(async () => {
    if (!socket) return;
    try {
      // Ask the server which sessions this user is actually in
      const response = await API.get('/study-session/mine');
      const liveSessions = (response.data as Session[]).filter(
        (s) =>
          s.status === 'in_progress' &&
          s.participants?.some(
            (p) => String(p.userId || p.user?.id) === String(currentUserId) &&
              p.status === 'accepted'
          )
      );
      setSessions(response.data);

      // Only rejoin sessions that are confirmed live and user is accepted
      const liveIds = new Set(liveSessions.map((s) => s.id));
      setJoinedSessions(liveIds);
      localStorage.setItem('joinedSessions', JSON.stringify([...liveIds]));

      liveIds.forEach((sessionId) => {
        socket.emit('joinSession', { sessionId });
      });
    } catch (err) {
      console.error('Reconnect session restore failed:', err);
    }
  }, [socket, currentUserId, setSessions, setJoinedSessions]);

  const onReceiveInvite = useCallback((inviteData: Invite) => {
    // FIX: push invite directly from socket payload — no API round-trip needed for initial display
    setInvites((prev: Invite[]) => {
      const exists = prev.some((i) => i.id === inviteData.id);
      if (exists) return prev;
      return [inviteData, ...prev];
    });
    setNewInviteCount((c) => c + 1);

    // Browser notification for background tabs
    if (typeof window !== 'undefined' && Notification?.permission === 'granted') {
      new Notification(`Study invite from ${inviteData.name}`, {
        body: inviteData.subject || 'Join a study session',
      });
    }
  }, [setInvites]);

  const onSessionScheduled = useCallback((data: any) => {
    setSessions((prev: Session[]) => {
      const exists = prev.find((s) => s.id === data.sessionId);
      return exists
        ? prev.map((s) => (s.id === data.sessionId ? data.sessionDetails : s))
        : [...prev, data.sessionDetails];
    });
  }, [setSessions]);

  const onSessionCreated = useCallback((data: any) => {
    setSessions((prev: Session[]) => {
      const exists = prev.find((s) => s.id === data.sessionId);
      return exists ? prev : [...prev, data.sessionDetails];
    });
    closeCreateSession();
  }, [setSessions, closeCreateSession]);

  const onSessionStarted = useCallback((data: any) => {
    setSessions((prev: Session[]) =>
      prev.map((s) => (s.id === data.sessionId ? { ...s, status: 'in_progress' } : s))
    );
  }, [setSessions]);

  const onSessionJoined = useCallback((data: any) => {
    setJoinedSessions((prev: Set<string>) => {
      const next = new Set([...prev, data.sessionId]);
      localStorage.setItem('joinedSessions', JSON.stringify([...next]));
      return next;
    });
    setSessions((prev: Session[]) =>
      prev.map((s) => (s.id === data.sessionId ? data.sessionDetails : s))
    );
  }, [setJoinedSessions, setSessions]);

  const onSessionLeft = useCallback((data: any) => {
    setJoinedSessions((prev: Set<string>) => {
      const next = new Set(prev);
      next.delete(data.sessionId);
      localStorage.setItem('joinedSessions', JSON.stringify([...next]));
      return next;
    });
  }, [setJoinedSessions]);

  // FIX: handle sessionEnded — remove from active view instead of leaving stale "Join" button
  const onSessionEnded = useCallback((data: any) => {
    setSessions((prev: Session[]) =>
      prev.map((s) => (s.id === data.sessionId ? { ...s, status: 'completed' } : s))
    );
    setJoinedSessions((prev: Set<string>) => {
      const next = new Set(prev);
      next.delete(data.sessionId);
      localStorage.setItem('joinedSessions', JSON.stringify([...next]));
      return next;
    });
    if (currentSessionId === data.sessionId) setChatOpen(false);

    toast.info(data.endedBy ? `${data.endedBy} ended the session.` : 'The study session has ended.');
  }, [setSessions, setJoinedSessions, currentSessionId]);

  const onUserJoinedSession = useCallback((data: any) => {
    setSessions((prev: Session[]) =>
      prev.map((session) =>
        session.id === data.sessionId
          ? {
            ...session,
            participants: session.participants?.map((p) =>
              (p.userId || p.user?.id) === data.userId ? { ...p, status: 'joined' } : p
            ),
          }
          : session
      )
    );
  }, [setSessions]);

  const onUserLeftSession = useCallback((data: any) => {
    setSessions((prev: Session[]) =>
      prev.map((session) =>
        session.id === data.sessionId
          ? {
            ...session,
            participants: session.participants?.map((p) =>
              (p.userId || p.user?.id) === data.userId ? { ...p, status: 'accepted' } : p
            ),
          }
          : session
      )
    );
  }, [setSessions]);

  // FIX: use Sonner toast instead of blocking alert()
  const onJoinError = useCallback((data: any) => {
    toast.error(`Could not join session: ${data.message}`);
  }, []);

  const onInviteAccepted = useCallback((data: any) => {
    setSessions((prev: Session[]) => {
      const exists = prev.find((s) => s.id === data.sessionId);
      return exists
        ? prev.map((s) => (s.id === data.sessionId ? data.sessionDetails : s))
        : [...prev, data.sessionDetails];
    });
    // FIX: pass sessionDetails directly — don't rely on sessions state which may not have updated yet
    handleJoinSession(data.sessionId);
    openChat(data.sessionId, data.sessionDetails);
  }, [setSessions, handleJoinSession, openChat]);

  const onInviteDeclined = useCallback((data: any) => {
    setInvites((prev: Invite[]) => prev.filter((inv) => inv.from !== data.by));
    toast.info(`${data.name} declined your invite.`);
  }, [setInvites]);

  // FIX: handle inviteExpired from updated server
  const onInviteExpired = useCallback((data: any) => {
    setInvites((prev: Invite[]) => prev.filter((inv) => inv.id !== data.sessionId));
    toast.warning("Invite expired: This invite has expired and is no longer valid.");
  }, [setInvites]);

  // FIX: handle inviteUndelivered from updated server
  const onInviteUndelivered = useCallback((data: any) => {
    toast.info("Friend is offline. They'll see the invite when they reconnect.");
  }, []);

  const onSessionExpired = useCallback((data: any) => {
    setSessions((prev: Session[]) =>
      prev.map((s) => (s.id === data.sessionId ? data.sessionDetails : s))
    );
  }, [setSessions]);

  // ---------------------------------------------------------------------------
  // Main effect — register / clean up all socket listeners
  // FIX: each listener is a stable reference so socket.off works correctly
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (loading || !isAuthenticated) return;

    // FIX: AbortController cancels in-flight API calls if component unmounts mid-request
    const controller = new AbortController();

    loadExistingInvites();
    loadExistingSessions(controller.signal);

    // FIX: restore UI state only — do NOT auto-emit joinSession from localStorage
    const saved = localStorage.getItem('joinedSessions');
    if (saved) {
      try {
        const ids: string[] = JSON.parse(saved);
        setJoinedSessions(new Set(ids));
      } catch {
        localStorage.removeItem('joinedSessions');
      }
    }

    if (!socket) return () => controller.abort();

    // Register all listeners
    socket.on('connect', onConnect);
    socket.on('receiveInvite', onReceiveInvite);
    socket.on('sessionScheduled', onSessionScheduled);
    socket.on('sessionCreated', onSessionCreated);
    socket.on('sessionStarted', onSessionStarted);
    socket.on('sessionJoined', onSessionJoined);
    socket.on('sessionLeft', onSessionLeft);
    socket.on('sessionEnded', onSessionEnded);
    socket.on('userJoinedSession', onUserJoinedSession);
    socket.on('userLeftSession', onUserLeftSession);
    socket.on('joinError', onJoinError);
    socket.on('inviteAccepted', onInviteAccepted);
    socket.on('inviteDeclined', onInviteDeclined);
    socket.on('inviteExpired', onInviteExpired);
    socket.on('inviteUndelivered', onInviteUndelivered);
    socket.on('sessionExpired', onSessionExpired);

    // FIX: cleanup mirrors every socket.on — prevents listener accumulation on reconnect
    return () => {
      controller.abort();
      socket.off('connect', onConnect);
      socket.off('receiveInvite', onReceiveInvite);
      socket.off('sessionScheduled', onSessionScheduled);
      socket.off('sessionCreated', onSessionCreated);
      socket.off('sessionStarted', onSessionStarted);
      socket.off('sessionJoined', onSessionJoined);
      socket.off('sessionLeft', onSessionLeft);
      socket.off('sessionEnded', onSessionEnded);
      socket.off('userJoinedSession', onUserJoinedSession);
      socket.off('userLeftSession', onUserLeftSession);
      socket.off('joinError', onJoinError);
      socket.off('inviteAccepted', onInviteAccepted);
      socket.off('inviteDeclined', onInviteDeclined);
      socket.off('inviteExpired', onInviteExpired);
      socket.off('inviteUndelivered', onInviteUndelivered);
      socket.off('sessionExpired', onSessionExpired);
    };
  }, [
    socket,
    // All handlers are stable useCallback refs — safe to list as deps
    onConnect, onReceiveInvite, onSessionScheduled, onSessionCreated,
    onSessionStarted, onSessionJoined, onSessionLeft, onSessionEnded,
    onUserJoinedSession, onUserLeftSession, onJoinError, onInviteAccepted,
    onInviteDeclined, onInviteExpired, onInviteUndelivered, onSessionExpired,
    loadExistingInvites, loadExistingSessions, setJoinedSessions,
    isAuthenticated,
    loading
  ]);

  // ---------------------------------------------------------------------------
  // Invite actions
  // ---------------------------------------------------------------------------
  const handleAcceptInvite = (invite: Invite) => {
    if (!socket || pendingInviteId) return;

    // FIX: set pending state to disable buttons and prevent double-tap
    setPendingInviteId(invite.id);

    socket.emit('acceptInvite', { sessionDetails: invite }, (res: any) => {
      setPendingInviteId(null);

      if (res?.ok) {
        // FIX: only remove from state AFTER server confirms success
        setInvites((prev: Invite[]) => prev.filter((inv) => inv.id !== invite.id));
        setNewInviteCount((c) => Math.max(0, c - 1));
        handleJoinSession(invite.id);
        openChat(invite.id, res.session || invite);
      } else {
        toast.error(`Could not accept invite: ${res?.error || 'Something went wrong. Please try again.'}`);
        // Invite stays visible so user can retry
      }
    });
  };

  const handleDeclineInvite = (invite: Invite) => {
    if (!socket || pendingInviteId === invite.id) return;
    socket.emit('declineInvite', { fromUserId: invite.from, sessionId: invite.id });
    setInvites((prev: Invite[]) => prev.filter((inv) => inv.id !== invite.id));
    setNewInviteCount((c) => Math.max(0, c - 1));
  };

  // ---------------------------------------------------------------------------
  // Cleanup timers on unmount
  // ---------------------------------------------------------------------------
  useEffect(() => {
    return () => {
      if (friendMessageTimer.current) clearTimeout(friendMessageTimer.current);
    };
  }, []);

  // ---------------------------------------------------------------------------
  // JSX
  // ---------------------------------------------------------------------------
  const dark = darkMode;
  const border = dark ? 'border-gray-800' : 'border-gray-200';
  const muted = dark ? 'text-gray-400' : 'text-gray-500';
  const cardClass = `border rounded-xl p-5 ${border} ${dark ? 'bg-black' : 'bg-white'}`;

  const inputClass = `w-full px-3.5 py-2 text-sm rounded-lg border outline-none transition-colors
    ${dark
      ? 'bg-black border-gray-800 text-white placeholder-gray-700 focus:border-gray-600'
      : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400 focus:border-gray-400'
    }`;

  const primaryBtn = `px-3.5 py-1.5 rounded-lg text-[13px] font-medium transition-opacity hover:opacity-80 active:scale-95
    ${dark ? 'bg-white text-black' : 'bg-black text-white'}
    disabled:opacity-40`;

  const secondaryBtn = `px-3.5 py-1.5 rounded-lg text-[13px] font-medium border transition-colors
    ${dark
      ? 'border-gray-800 text-gray-200 hover:bg-gray-900'
      : 'border-gray-200 text-gray-700 hover:bg-gray-50'
    } disabled:opacity-40`;

  const dangerBtn = `px-3.5 py-1.5 rounded-lg text-[13px] font-medium border border-red-500/50 text-red-500 hover:bg-red-500/10 transition-colors`;

  return (
    <div className={`min-h-screen flex flex-col transition-colors duration-300 pt-[76px] ${dark ? 'bg-black text-white' : 'bg-white text-gray-900'}`}>
      
      {/* Main Container */}
      <div className="flex-1 max-w-[1100px] w-full mx-auto px-5 py-8">
        
        {/* Upper Dashboard header with Date Picker */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-[22px] font-medium tracking-tight mb-1">Dojo Workspace</h1>
            <p className={`text-[13px] ${muted}`}>Track classes, manage friends, and host joint study sessions</p>
          </div>
          
          {/* Pick Date */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setCalendarOpen(!calendarOpen)}
              className={`flex items-center space-x-2 px-3.5 py-2 border rounded-lg text-[13px] font-medium transition-colors ${
                dark ? 'border-gray-800 hover:bg-gray-950 text-gray-200' : 'border-gray-200 hover:bg-gray-50 text-gray-700'
              }`}
            >
              <CalendarIcon className="size-4 text-gray-400" />
              <span>{date ? format(new Date(date + 'T00:00:00'), 'PPP') : 'Pick a date'}</span>
            </button>

            {calendarOpen && (
              <div className={`absolute right-0 mt-2 z-50 p-2 rounded-lg border shadow-xl ${
                dark ? 'bg-black border-gray-800' : 'bg-white border-gray-200'
              }`}>
                <Calendar
                  mode="single"
                  selected={date ? new Date(date + 'T00:00:00') : undefined}
                  onSelect={(selectedDate) => {
                    if (selectedDate) {
                      const yyyy = selectedDate.getFullYear();
                      const mm = String(selectedDate.getMonth() + 1).padStart(2, '0');
                      const dd = String(selectedDate.getDate()).padStart(2, '0');
                      setDate(`${yyyy}-${mm}-${dd}`);
                    }
                    setCalendarOpen(false);
                  }}
                  className={`${dark ? 'bg-black text-white border-none' : 'bg-white text-gray-900 border-none'}`}
                />
              </div>
            )}
          </div>
        </div>

        {/* Two column grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* ---- LEFT COLUMN ---- */}
          <div className="space-y-8">
            
            {/* Today's Classes */}
            <section className={cardClass}>
              <p className={`text-[11px] uppercase tracking-widest ${muted} mb-2`}>Schedule</p>
              <h2 className="text-[16px] font-medium tracking-tight mb-4 flex justify-between items-center">
                <span>Today&apos;s Classes</span>
                <span className={`text-[11px] px-2 py-0.5 rounded border ${border} ${muted}`}>
                  {unmarkedSubjects.length} classes
                </span>
              </h2>
              {unmarkedSubjects.length === 0 ? (
                <p className={`text-[13px] ${muted} py-4`}>No classes scheduled for today.</p>
              ) : (
                <div className="space-y-3">
                  {unmarkedSubjects.map((subject: any) => (
                    <div
                      key={subject._id || subject.id}
                      className={`border rounded-lg p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 ${border}`}
                    >
                      <div>
                        <p className="font-medium text-[15px]">{subject.subjectName || subject.subject}</p>
                        <p className={`text-[12px] mt-0.5 ${muted}`}>{subject.time}</p>
                      </div>
                      <div className="flex gap-2 flex-wrap mt-2 sm:mt-0">
                        {['attended', 'missed', 'cancelled'].map((status) => (
                          <button
                            key={status}
                            onClick={() => setAttendanceConfirm({ subject, status })}
                            className={secondaryBtn}
                          >
                            {status.charAt(0).toUpperCase() + status.slice(1)}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Marked Attendance */}
            <section className={cardClass}>
              <p className={`text-[11px] uppercase tracking-widest ${muted} mb-2`}>Attendance Logs</p>
              <h2 className="text-[16px] font-medium tracking-tight mb-4">Marked Attendance</h2>
              {markedSubjects.length === 0 ? (
                <p className={`text-[13px] ${muted} py-4`}>No attendance marked yet.</p>
              ) : (
                <div className="space-y-2.5">
                  {markedSubjects.map((subject: any) => (
                    <div
                      key={subject._id || subject.id}
                      className={`border rounded-lg p-3.5 flex justify-between items-center ${border}`}
                    >
                      <div>
                        <p className="font-medium text-[14px]">{subject.subject}</p>
                        <p className={`text-[12px] mt-0.5 ${muted}`}>{subject.time}</p>
                      </div>
                      <span
                        className={`px-3 py-1 rounded-full border text-[10px] uppercase font-medium tracking-wider ${
                          subject.status === 'attended'
                            ? 'border-green-500/30 text-green-500 bg-green-500/5'
                            : subject.status === 'missed'
                              ? 'border-red-500/30 text-red-500 bg-red-500/5'
                              : 'border-gray-500/30 text-gray-500 bg-gray-500/5'
                        }`}
                      >
                        {subject.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Friends Section */}
            <section className={cardClass}>
              <p className={`text-[11px] uppercase tracking-widest ${muted} mb-2`}>Social Network</p>
              <h2 className="text-[16px] font-medium tracking-tight mb-4">Friends & Connections</h2>

              {/* Add friend */}
              <div className="mb-6">
                <p className={`text-[12px] font-medium mb-2.5 ${muted}`}>Add a Friend</p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Enter 6-digit friend code"
                    value={friendCode}
                    onChange={(e) => setFriendCode(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddFriend()}
                    className={`${inputClass} flex-1`}
                    maxLength={6}
                  />
                  <button
                    onClick={handleAddFriend}
                    disabled={!friendCode}
                    className={primaryBtn}
                  >
                    Add
                  </button>
                </div>
                {friendMessage && (
                  <p className={`mt-2 text-xs font-medium ${friendMessage.type === 'error' ? 'text-red-500' : 'text-green-500'}`}>
                    {friendMessage.text}
                  </p>
                )}
              </div>

              {/* Friends list */}
              <div>
                <p className={`text-[12px] font-medium mb-3 ${muted}`}>Your Friends</p>
                {friends.length === 0 ? (
                  <p className={`text-[13px] ${muted} py-2`}>No friends added yet.</p>
                ) : (
                  <ul className="space-y-2">
                    {friends.map((f: any) => (
                      <li
                        key={f._id || f.id}
                        className={`p-3 rounded-lg border flex justify-between items-center ${border}`}
                      >
                        <span className="text-[14px] font-medium">{f.name}</span>
                        <div className="flex items-center gap-2">
                          <span className={`text-[12px] ${muted}`}>{f.friendCode}</span>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(f.friendCode);
                              toast.success("Friend code copied!");
                            }}
                            className={`p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-900 border ${border} transition-colors text-gray-500 hover:text-current`}
                            aria-label="Copy friend code"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3.5 h-3.5">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0 0 13.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 0 1-.75.75H9a.75.75 0 0 1-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 0 1-2.25 2.25H6.75A2.25 2.25 0 0 1 4.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 0 1 1.927-.184" />
                            </svg>
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </section>
          </div>

          {/* ---- RIGHT COLUMN ---- */}
          <div className="space-y-8">
            
            {/* Study Sessions */}
            <section className={cardClass}>
              <p className={`text-[11px] uppercase tracking-widest ${muted} mb-2`}>Co-learning</p>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-[16px] font-medium tracking-tight flex items-center gap-2">
                  <span>Study Sessions</span>
                  {newInviteCount > 0 && (
                    <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-black dark:bg-white dark:text-black border border-current rounded-full">
                      {newInviteCount}
                    </span>
                  )}
                </h2>
                <button
                  onClick={() => setCreateSessionOpen(true)}
                  className={primaryBtn}
                >
                  Create Session
                </button>
              </div>

              {/* Pending Invites */}
              <div className="mb-6">
                <p className={`text-[12px] font-medium mb-3 ${muted}`}>Pending Invites</p>
                {invites.length === 0 ? (
                  <p className={`text-[13px] ${muted} py-2`}>No pending invites.</p>
                ) : (
                  (invites as Invite[]).map((invite, idx) => (
                    <div
                      key={invite.id || idx}
                      className={`border rounded-lg p-4 flex justify-between items-center mb-3 ${border}`}
                    >
                      <div>
                        <p className="font-medium text-[14px]">
                          {invite.name || 'Unknown User'}
                        </p>
                        <p className={`text-[12px] mt-0.5 ${muted}`}>
                          {invite.subject || 'No topic'}
                        </p>
                        <p className={`text-[11px] mt-1 ${muted}`}>
                          {invite.startAt ? new Date(invite.startAt).toLocaleDateString() : 'No date'}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleAcceptInvite(invite)}
                          disabled={pendingInviteId === invite.id}
                          className={primaryBtn}
                        >
                          {pendingInviteId === invite.id ? '...' : 'Accept'}
                        </button>
                        <button
                          onClick={() => handleDeclineInvite(invite)}
                          disabled={pendingInviteId === invite.id}
                          className={secondaryBtn}
                        >
                          Decline
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Active Sessions */}
              <div>
                <p className={`text-[12px] font-medium mb-3 ${muted}`}>Active Sessions</p>
                {activeSessions.length === 0 ? (
                  <p className={`text-[13px] ${muted} py-2`}>No active sessions.</p>
                ) : (
                  activeSessions.map((session, idx) => {
                    const sessionId = session.id;
                    const isJoined = joinedSessions.has(sessionId);

                    const isAcceptedParticipant = session.participants?.some(
                      (p) =>
                        String(p.userId || p.user?.id) === String(currentUserId) &&
                        p.status === 'accepted'
                    );
                    const canJoin =
                      (session.status === 'scheduled' || session.status === 'in_progress') &&
                      isAcceptedParticipant;

                    return (
                      <div
                        key={sessionId || idx}
                        className={`border rounded-lg p-4 mb-3 ${border}`}
                      >
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h3 className="font-medium text-[15px]">{session.subject}</h3>
                            <p className={`text-[12px] mt-0.5 ${muted}`}>
                              Duration: {session.duration} mins
                            </p>
                          </div>
                          <span className={`px-2 py-0.5 rounded text-[10px] uppercase border font-medium ${
                            session.status === 'in_progress' ? 'border-green-500/30 text-green-500 bg-green-500/5' : 'border-gray-500/30 text-gray-500'
                          }`}>
                            <SessionStatus session={session} />
                          </span>
                        </div>

                        <div className={`space-y-1 text-[12px] ${muted} mb-4`}>
                          <div>
                            {new Date(session.startAt).toLocaleDateString('en-US', {
                              weekday: 'short',
                              month: 'short',
                              day: 'numeric',
                            })}
                          </div>
                          <div>
                            {new Date(session.startAt).toLocaleTimeString('en-US', {
                              hour: '2-digit',
                              minute: '2-digit',
                              hour12: true,
                            })}
                          </div>
                        </div>

                        <div className={`pt-3 border-t ${border}`}>
                          <div className="flex gap-2 flex-wrap">
                            {canJoin && !isJoined && (
                              <button
                                onClick={() => handleJoinSession(sessionId)}
                                className={primaryBtn}
                              >
                                Join Session
                              </button>
                            )}
                            {isJoined && (
                              <>
                                <button
                                  onClick={() => handleLeaveSession(sessionId)}
                                  className={dangerBtn}
                                >
                                  Leave
                                </button>
                                <button
                                  onClick={() => openChat(sessionId, session)}
                                  className={primaryBtn}
                                >
                                  Chat
                                </button>
                              </>
                            )}
                            {session.creatorId === currentUserId && isJoined && (
                              <button
                                onClick={() => setSessionEndConfirm({ sessionId })}
                                className={secondaryBtn}
                              >
                                End Session
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </section>

            {/* Stats */}
            <section className={cardClass}>
              <p className={`text-[11px] uppercase tracking-widest ${muted} mb-2`}>Visual Insights</p>
              <h2 className="text-[16px] font-medium tracking-tight mb-4">Attendance Statistics</h2>
              <SubjectStatsChart />
            </section>
          </div>
        </div>
      </div>

      {/* Create Session Modal */}
      {createSessionOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className={`rounded-xl border p-6 w-full max-w-md ${dark ? 'bg-black border-gray-800 text-white' : 'bg-white border-gray-200 text-gray-900'}`}>
            <div className="flex justify-between items-center mb-4 border-b pb-3 border-gray-150 dark:border-gray-900">
              <h3 className="text-[16px] font-medium tracking-tight">Create Study Session</h3>
              <button
                onClick={closeCreateSession}
                className={`text-[18px] leading-none transition-colors ${muted} hover:text-current`}
                aria-label="Close"
              >
                &times;
              </button>
            </div>
            <CreateStudySession socket={socket} onClose={closeCreateSession} />
          </div>
        </div>
      )}

      {/* Chat Panel */}
      {chatOpen && currentSessionDetails && (
        <SessionChat
          socket={socket}
          session={currentSessionDetails}
          isOpen={chatOpen}
          onClose={() => setChatOpen(false)}
        />
      )}

      {/* Premium Custom Confirmation Dialog for Marking Attendance */}
      {attendanceConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm transition-all duration-300">
          <div className={`rounded-xl border p-6 max-w-md w-full mx-4 shadow-2xl animate-in fade-in zoom-in-95 duration-200 ${
            dark ? 'bg-black border-gray-800 text-white' : 'bg-white border-gray-200 text-gray-900'
          }`}>
            <div className="mb-4">
              <h3 className="text-[16px] font-medium tracking-tight">Confirm Attendance Change</h3>
              <p className={`mt-2 text-sm leading-relaxed ${muted}`}>
                Are you sure you want to mark <span className="font-semibold text-current">{attendanceConfirm.subject.subjectName || attendanceConfirm.subject.subject}</span> as <span className="font-semibold text-current capitalize">{attendanceConfirm.status}</span>?
              </p>
            </div>
            <div className="flex justify-end gap-2.5 mt-6 pt-3 border-t border-gray-100 dark:border-gray-900">
              <button
                type="button"
                onClick={() => setAttendanceConfirm(null)}
                className={secondaryBtn}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  const { subject, status } = attendanceConfirm;
                  setAttendanceConfirm(null);
                  await handleAttendance(subject, status);
                }}
                className={primaryBtn}
              >
                Yes, Mark
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Premium Custom Confirmation Dialog for Ending Sessions */}
      {sessionEndConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm transition-all duration-300">
          <div className={`rounded-xl border p-6 max-w-md w-full mx-4 shadow-2xl animate-in fade-in zoom-in-95 duration-200 ${
            dark ? 'bg-black border-gray-800 text-white' : 'bg-white border-gray-200 text-gray-900'
          }`}>
            <div className="mb-4">
              <h3 className="text-[16px] font-medium tracking-tight text-red-500">End Study Session?</h3>
              <p className={`mt-2 text-sm leading-relaxed ${muted}`}>
                This will end the session for all participants. Are you sure you want to proceed?
              </p>
            </div>
            <div className="flex justify-end gap-2.5 mt-6 pt-3 border-t border-gray-100 dark:border-gray-900">
              <button
                type="button"
                onClick={() => setSessionEndConfirm(null)}
                className={secondaryBtn}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const { sessionId } = sessionEndConfirm;
                  setSessionEndConfirm(null);
                  socket?.emit('endSession', { sessionId });
                  toast.success("Study session ended successfully.");
                }}
                className={dangerBtn}
              >
                End Session
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;