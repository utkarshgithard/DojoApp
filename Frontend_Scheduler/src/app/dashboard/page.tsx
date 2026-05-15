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
import Swal from 'sweetalert2';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface Invite {
  id: string;
  from: string;
  name: string;
  subject?: string;
  startAt?: string;
  invitedAt?: string;
}

interface Session {
  id: string;
  subject: string;
  duration: number;
  startAt: string;
  status: string;
  creatorId: string;
  participants?: Array<{ userId?: string; user?: { id: string }; status: string }>;
}

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------
const Dashboard = () => {
  const { darkMode } = useDarkMode() as any;
  const { date, setDate, unmarkedSubjects, markedSubjects, handleAttendance, invites, loadExistingInvites, setInvites, friends } = useAttendance() as any;
  const { socket, joinedSessions, setJoinedSessions, sessions, setSessions } = useSocket() as any;

  // FIX: userId from verified auth context — never decode JWT client-side
  const { userId: currentUserId } = useAuth() as any;

  // UI state
  const [chatOpen, setChatOpen] = useState(false);
  const [createSessionOpen, setCreateSessionOpen] = useState(false);
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

    Swal.fire({
      icon: 'info',
      title: 'Session ended',
      text: data.endedBy ? `${data.endedBy} ended the session.` : 'The study session has ended.',
      timer: 3000,
      showConfirmButton: false,
      toast: true,
      position: 'top-end',
    });
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

  // FIX: use Swal toast instead of blocking alert()
  const onJoinError = useCallback((data: any) => {
    Swal.fire({
      icon: 'error',
      title: 'Could not join session',
      text: data.message,
      toast: true,
      position: 'top-end',
      timer: 4000,
      showConfirmButton: false,
    });
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
    Swal.fire({
      icon: 'info',
      title: 'Invite declined',
      text: `${data.name} declined your invite.`,
      toast: true,
      position: 'top-end',
      timer: 3000,
      showConfirmButton: false,
    });
  }, [setInvites]);

  // FIX: handle inviteExpired from updated server
  const onInviteExpired = useCallback((data: any) => {
    setInvites((prev: Invite[]) => prev.filter((inv) => inv.id !== data.sessionId));
    Swal.fire({
      icon: 'warning',
      title: 'Invite expired',
      text: 'This invite has expired and is no longer valid.',
      toast: true,
      position: 'top-end',
      timer: 4000,
      showConfirmButton: false,
    });
  }, [setInvites]);

  // FIX: handle inviteUndelivered from updated server
  const onInviteUndelivered = useCallback((data: any) => {
    Swal.fire({
      icon: 'info',
      title: 'Friend is offline',
      text: "Your friend is offline right now. They'll see the invite when they reconnect.",
      toast: true,
      position: 'top-end',
      timer: 5000,
      showConfirmButton: false,
    });
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
        Swal.fire({
          icon: 'error',
          title: 'Could not accept invite',
          text: res?.error || 'Something went wrong. Please try again.',
          toast: true,
          position: 'top-end',
          timer: 4000,
          showConfirmButton: false,
        });
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
  return (
    <div
      className={`py-20 px-4 md:px-10 min-h-screen mx-auto transition-colors duration-300 ${darkMode ? 'dark bg-gray-900 text-white' : 'bg-white text-black'
        }`}
    >
      <div className="text-2xl font-bold mb-6">Dashboard</div>

      <div className="mb-6">
        <label className="block text-sm font-medium mb-2">Select Date</label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="p-2 border rounded w-full md:w-64 bg-transparent border-black dark:border-white text-black dark:text-white"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* ---- LEFT COLUMN ---- */}
        <div className="space-y-8">

          {/* Friends */}
          <section className="p-4 rounded-2xl shadow-md bg-white dark:bg-gray-800">
            <h2 className="text-xl font-semibold mb-4">Friends</h2>

            <div className="mb-6">
              <h3 className="text-md font-medium mb-3">Add a Friend</h3>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Enter 6-digit friend code"
                  value={friendCode}
                  onChange={(e) => setFriendCode(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddFriend()}
                  className="border rounded-lg p-2 flex-1 dark:bg-gray-700 dark:text-white"
                  maxLength={6}
                />
                <button
                  onClick={handleAddFriend}
                  disabled={!friendCode}
                  className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Add
                </button>
              </div>

              {/* FIX: show error in red, success in green; auto-clears after 3s */}
              {friendMessage && (
                <p className={`mt-2 text-sm ${friendMessage.type === 'error' ? 'text-red-500' : 'text-green-500'}`}>
                  {friendMessage.text}
                </p>
              )}
            </div>

            <div>
              <h3 className="text-md font-medium mb-3">Your Friends</h3>
              {friends.length === 0 ? (
                <p className="text-gray-500">No friends added yet.</p>
              ) : (
                <ul className="space-y-2">
                  {friends.map((f: any) => (
                    <li
                      key={f._id || f.id}
                      className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 flex justify-between items-center"
                    >
                      <span>{f.name}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-500">{f.friendCode}</span>
                        <button
                          onClick={() => navigator.clipboard.writeText(f.friendCode)}
                          className="p-1 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 rounded focus:outline-none"
                          aria-label="Copy friend code"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
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

          {/* Today's Classes */}
          <section className="p-4 rounded-2xl shadow-md bg-white dark:bg-gray-800">
            <h2 className="text-xl font-semibold mb-4">Today&apos;s Classes</h2>
            {unmarkedSubjects.length === 0 ? (
              <p>No classes scheduled for today.</p>
            ) : (
              <div className="space-y-4">
                {unmarkedSubjects.map((subject: any) => (
                  <div
                    key={subject._id || subject.id}
                    className="border rounded-lg p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 dark:border-white border-black"
                  >
                    <div>
                      <p className="font-semibold text-lg">{subject.subjectName || subject.subject}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{subject.time}</p>
                    </div>
                    <div className="flex gap-2 flex-wrap mt-2 sm:mt-0">
                      {['attended', 'missed', 'cancelled'].map((status) => (
                        <button
                          key={status}
                          onClick={() => handleAttendance(subject, status)}
                          className="border border-black dark:border-white px-4 py-1 rounded hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition"
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
          <section className="p-4 rounded-2xl shadow-md bg-white dark:bg-gray-800">
            <h2 className="text-xl font-semibold mb-4">Marked Attendance</h2>
            {markedSubjects.length === 0 ? (
              <p>No attendance marked yet.</p>
            ) : (
              <div className="space-y-4">
                {markedSubjects.map((subject: any) => (
                  <div
                    key={subject._id || subject.id}
                    className="border rounded-lg p-4 flex justify-between items-center dark:border-white border-black"
                  >
                    <div>
                      <p className="font-semibold text-lg">{subject.subject}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{subject.time}</p>
                    </div>
                    <span
                      className={`px-4 py-1 rounded-full border text-sm uppercase ${subject.status === 'attended'
                        ? 'border-green-500 text-green-600'
                        : subject.status === 'missed'
                          ? 'border-red-500 text-red-600'
                          : 'border-gray-500 text-gray-600'
                        }`}
                    >
                      {subject.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* ---- RIGHT COLUMN ---- */}
        <div className="space-y-8">

          {/* Study Sessions */}
          <section className="p-4 rounded-2xl shadow-md bg-white dark:bg-gray-800">
            <div className="flex justify-between items-center mb-4">
              {/* FIX: notification badge on the section header */}
              <h2 className="text-xl font-semibold flex items-center gap-2">
                Study Sessions
                {newInviteCount > 0 && (
                  <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red-500 rounded-full">
                    {newInviteCount}
                  </span>
                )}
              </h2>
              <button
                onClick={() => setCreateSessionOpen(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Create Session
              </button>
            </div>

            {/* Pending Invites */}
            <div className="mb-6">
              <h3 className="text-lg font-medium mb-3">Pending Invites</h3>
              {invites.length === 0 ? (
                <p className="text-gray-500">No pending invites.</p>
              ) : (
                (invites as Invite[]).map((invite, idx) => (
                  <div
                    key={invite.id || idx}
                    className="border rounded-lg p-4 flex justify-between items-center dark:border-white border-black bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-gray-700 dark:to-gray-800 mb-3"
                  >
                    <div>
                      <p className="font-semibold text-gray-800 dark:text-white">
                        {invite.name || 'Unknown User'}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-300">
                        {invite.subject || 'No topic'}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {invite.startAt ? new Date(invite.startAt).toLocaleDateString() : 'No date'}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {/* FIX: disabled while pending to prevent double-tap */}
                      <button
                        onClick={() => handleAcceptInvite(invite)}
                        disabled={pendingInviteId === invite.id}
                        className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {pendingInviteId === invite.id ? '...' : 'Accept'}
                      </button>
                      <button
                        onClick={() => handleDeclineInvite(invite)}
                        disabled={pendingInviteId === invite.id}
                        className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
              <h3 className="text-lg font-medium mb-3">Active Sessions</h3>
              {activeSessions.length === 0 ? (
                <p className="text-gray-500">No active sessions.</p>
              ) : (
                activeSessions.map((session, idx) => {
                  const sessionId = session.id;
                  const isJoined = joinedSessions.has(sessionId);

                  // FIX: participant check uses currentUserId from auth context (not decoded JWT)
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
                      className="border rounded-lg p-4 gap-4 dark:border-white border-black bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-700 dark:to-gray-800 mb-3"
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h3 className="font-semibold text-lg text-gray-800 dark:text-white">
                            {session.subject}
                          </h3>
                          <p className="text-sm text-gray-600 dark:text-gray-300">
                            Duration: {session.duration} minutes
                          </p>
                        </div>
                        <span className="px-3 py-1 rounded-full text-xs font-medium">
                          <SessionStatus session={session} />
                        </span>
                      </div>

                      <div className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
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

                      <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                        <div className="flex gap-2 flex-wrap">
                          {canJoin && !isJoined && (
                            <button
                              onClick={() => handleJoinSession(sessionId)}
                              className="px-4 py-2 bg-green-500 text-white text-sm rounded hover:bg-green-600 transition-colors"
                            >
                              Join Session
                            </button>
                          )}
                          {isJoined && (
                            <>
                              <button
                                onClick={() => handleLeaveSession(sessionId)}
                                className="px-4 py-2 bg-red-500 text-white text-sm rounded hover:bg-red-600 transition-colors"
                              >
                                Leave Session
                              </button>
                              <button
                                onClick={() => openChat(sessionId, session)}
                                className="px-4 py-2 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 transition-colors"
                              >
                                Chat
                              </button>
                            </>
                          )}
                          {/* Creator-only end session button */}
                          {session.creatorId === currentUserId && isJoined && (
                            <button
                              onClick={() => {
                                Swal.fire({
                                  title: 'End session?',
                                  text: 'This will end the session for all participants.',
                                  icon: 'warning',
                                  showCancelButton: true,
                                  confirmButtonText: 'End session',
                                  confirmButtonColor: '#EF4444',
                                }).then((result) => {
                                  if (result.isConfirmed) {
                                    socket?.emit('endSession', { sessionId });
                                  }
                                });
                              }}
                              className="px-4 py-2 bg-gray-700 text-white text-sm rounded hover:bg-gray-900 transition-colors"
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
          <section className="p-4 rounded-2xl shadow-md bg-white dark:bg-gray-800">
            <h2 className="text-xl font-semibold mb-4">Attendance Statistics</h2>
            <SubjectStatsChart />
          </section>
        </div>
      </div>

      {/* Create Session Modal */}
      {createSessionOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold">Create Study Session</h3>
              <button onClick={closeCreateSession} aria-label="Close">&times;</button>
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
    </div>
  );
};

export default Dashboard;