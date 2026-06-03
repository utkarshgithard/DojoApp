"use client";

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useDarkMode } from '@/context/DarkModeContext';
import { useAttendance } from '@/context/AttendanceContext';
import { useSocket } from '@/context/SocketContext';
import { useAuth } from '@/context/authContext';
import API from '@/lib/axios';
import StudySessionsSection from '@/components/dashboard/StudySessionsSection';
import CreateStudySession from '@/components/CreateStudySession';
import { useRouter } from 'next/navigation';
import { Users, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { DashboardInvite as Invite, StudySession as Session } from '@/lib/types';

export default function SessionsPage() {
  const router = useRouter();
  const { darkMode } = useDarkMode() as any;
  const { invites, loadExistingInvites, setInvites } = useAttendance() as any;
  const { socket, joinedSessions, setJoinedSessions, sessions, setSessions, sessionsLoaded, setSessionsLoaded } = useSocket() as any;
  const { userId: currentUserId, isAuthenticated, loading } = useAuth() as any;

  const [createSessionOpen, setCreateSessionOpen] = useState(false);
  const [pendingInviteId, setPendingInviteId] = useState<string | null>(null);
  const [newInviteCount, setNewInviteCount] = useState(0);
  const [sessionsLoading, setSessionsLoading] = useState(!sessionsLoaded);
  const [sessionEndConfirm, setSessionEndConfirm] = useState<{ sessionId: string } | null>(null);
  
  const sessionsLoadedRef = useRef(sessionsLoaded);
  const joinedSessionsRef = useRef<Set<string>>(joinedSessions);

  useEffect(() => {
    sessionsLoadedRef.current = sessionsLoaded;
  }, [sessionsLoaded]);

  useEffect(() => {
    joinedSessionsRef.current = joinedSessions;
  }, [joinedSessions]);

  const openChat = useCallback((sessionId: string, _sessionDetails: Session) => {
    router.push(`/session/${sessionId}/chat`);
  }, [router]);

  const closeCreateSession = useCallback(() => setCreateSessionOpen(false), []);

  const handleJoinSession = useCallback((sessionId: string) => {
    if (!socket || !sessionId) return;
    socket.emit('joinSession', { sessionId });
    setJoinedSessions((prev: Set<string>) => {
      const next = new Set([...prev, sessionId]);
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
  }, [socket, setJoinedSessions]);

  const loadExistingSessions = useCallback(async (signal?: AbortSignal) => {
    if (!sessionsLoadedRef.current) {
      setSessionsLoading(true);
    }
    try {
      const response = await API.get('/study-session/mine?status=active', { signal });
      if (!signal?.aborted) {
        setSessions(response.data);
        setSessionsLoaded(true);
      }
    } catch (error: any) {
      if (error.name !== 'CanceledError' && error.name !== 'AbortError') {
        console.error('Error loading existing sessions:', error);
      }
    } finally {
      if (!signal?.aborted) setSessionsLoading(false);
    }
  }, [setSessions, setSessionsLoaded]);

  const activeSessions: Session[] = (sessions as Session[]).filter(
    (s) => s.status === 'scheduled' || s.status === 'in_progress'
  );

  // ---------------------------------------------------------------------------
  // Socket listeners
  // ---------------------------------------------------------------------------
  const onConnect = useCallback(async () => {
    if (!socket) return;
    try {
      const response = await API.get('/study-session/mine?status=active');
      setSessions(response.data);

      const saved = localStorage.getItem('joinedSessions');
      if (saved) {
        const ids: string[] = JSON.parse(saved);
        const activeIds = new Set(ids);
        setJoinedSessions(activeIds);
        ids.forEach((sessionId) => {
          socket.emit('joinSession', { sessionId });
        });
      }
    } catch (err) {
      console.error('Reconnect session restore failed:', err);
    }
  }, [socket, setSessions, setJoinedSessions]);

  const onReceiveInvite = useCallback((inviteData: Invite) => {
    setInvites((prev: Invite[]) => {
      const exists = prev.some((i) => i.id === inviteData.id);
      if (exists) return prev;
      return [inviteData, ...prev];
    });
    setNewInviteCount((c) => c + 1);

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
    toast.info(data.endedBy ? `${data.endedBy} ended the session.` : 'The study session has ended.');
  }, [setSessions, setJoinedSessions]);

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
    handleJoinSession(data.sessionId);
    openChat(data.sessionId, data.sessionDetails);
  }, [setSessions, handleJoinSession, openChat]);

  const onInviteDeclined = useCallback((data: any) => {
    setInvites((prev: Invite[]) => prev.filter((inv) => inv.from !== data.by));
    toast.info(`${data.name} declined your invite.`);
  }, [setInvites]);

  const onInviteExpired = useCallback((data: any) => {
    setInvites((prev: Invite[]) => prev.filter((inv) => inv.id !== data.sessionId));
    toast.warning("Invite expired: This invite has expired and is no longer valid.");
  }, [setInvites]);

  const onInviteUndelivered = useCallback((data: any) => {
    toast.info("Friend is offline. They'll see the invite when they reconnect.");
  }, []);

  const onSessionExpired = useCallback((data: any) => {
    setSessions((prev: Session[]) =>
      prev.map((s) => (s.id === data.sessionId ? data.sessionDetails : s))
    );
  }, [setSessions]);

  useEffect(() => {
    if (loading || !isAuthenticated) return;
    const controller = new AbortController();
    loadExistingInvites(controller.signal);
    loadExistingSessions(controller.signal);

    const saved = localStorage.getItem('joinedSessions');
    if (saved) {
      try {
        const ids: string[] = JSON.parse(saved);
        setJoinedSessions(new Set(ids));
      } catch {
        localStorage.removeItem('joinedSessions');
      }
    }
    return () => {
      controller.abort();
    };
  }, [isAuthenticated, loading, loadExistingInvites, loadExistingSessions, setJoinedSessions]);

  useEffect(() => {
    if (loading || !isAuthenticated || !socket) return;

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

    return () => {
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
    isAuthenticated,
    loading,
    onConnect,
    onReceiveInvite,
    onSessionScheduled,
    onSessionCreated,
    onSessionStarted,
    onSessionJoined,
    onSessionLeft,
    onSessionEnded,
    onUserJoinedSession,
    onUserLeftSession,
    onJoinError,
    onInviteAccepted,
    onInviteDeclined,
    onInviteExpired,
    onInviteUndelivered,
    onSessionExpired
  ]);

  const handleAcceptInvite = (invite: Invite) => {
    if (!socket || pendingInviteId) return;
    setPendingInviteId(invite.id);
    socket.emit('acceptInvite', { sessionDetails: invite }, (res: any) => {
      setPendingInviteId(null);
      if (res?.ok) {
        setInvites((prev: Invite[]) => prev.filter((inv) => inv.id !== invite.id));
        setNewInviteCount((c) => Math.max(0, c - 1));
        handleJoinSession(invite.id);
        openChat(invite.id, res.session || invite);
      } else {
        toast.error(`Could not accept invite: ${res?.error || 'Something went wrong.'}`);
      }
    });
  };

  const handleDeclineInvite = (invite: Invite) => {
    if (!socket || pendingInviteId === invite.id) return;
    socket.emit('declineInvite', { fromUserId: invite.from, sessionId: invite.id });
    setInvites((prev: Invite[]) => prev.filter((inv) => inv.id !== invite.id));
    setNewInviteCount((c) => Math.max(0, c - 1));
  };

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/');
    }
  }, [isAuthenticated, loading, router]);

  const dark = darkMode;
  const border = dark ? 'border-gray-800' : 'border-gray-200';
  const muted = dark ? 'text-gray-400' : 'text-gray-500';
  const cardClass = `border rounded-xl p-5 ${border} ${dark ? 'bg-black' : 'bg-white'}`;

  const primaryBtn = `px-3.5 py-1.5 rounded-lg text-[13px] font-medium transition-opacity hover:opacity-80 active:scale-95
    ${dark ? 'bg-white text-black' : 'bg-black text-white'}
    disabled:opacity-40`;

  const secondaryBtn = `px-3.5 py-1.5 rounded-lg text-[13px] font-medium border transition-colors
    ${dark
      ? 'border-gray-800 text-gray-200 hover:bg-gray-900'
      : 'border-gray-200 text-gray-700 hover:bg-gray-50'
    } disabled:opacity-40`;

  const dangerBtn = `px-3.5 py-1.5 rounded-lg text-[13px] font-medium border border-red-500/50 text-red-500 hover:bg-red-500/10 transition-colors`;

  if (loading) {
    return (
      <div className={`min-h-screen flex justify-center items-center transition-colors duration-300 ${dark ? 'bg-black text-white' : 'bg-white text-gray-900'}`}>
        <span className="inline-block w-6 h-6 rounded-full border-[2px] border-current border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className={`min-h-screen transition-colors duration-300 pt-[96px] md:pt-[24px] pb-16 ${dark ? 'bg-black text-white' : 'bg-white text-gray-900'}`}>
      <div className="max-w-[750px] w-full mx-auto px-5">
        
        {/* Page Header */}
        <div className="mb-8 border-b pb-5 border-gray-100 dark:border-gray-900">
          <p className={`text-[11px] uppercase tracking-widest ${muted} mb-1 flex items-center gap-1.5`}>
            <Users size={12} />
            <span>Study Rooms</span>
          </p>
          <h1 className="text-[22px] font-medium tracking-tight">Joint Study Sessions</h1>
          <p className={`text-[13px] ${muted} mt-0.5`}>Create live study sessions, accept pending invites, or rejoin in-progress rooms with peers.</p>
        </div>

        {/* Sessions List */}
        <StudySessionsSection
          newInviteCount={newInviteCount}
          setCreateSessionOpen={setCreateSessionOpen}
          sessionsLoading={sessionsLoading}
          invites={invites}
          handleAcceptInvite={handleAcceptInvite}
          handleDeclineInvite={handleDeclineInvite}
          pendingInviteId={pendingInviteId}
          activeSessions={activeSessions}
          joinedSessions={joinedSessions}
          currentUserId={currentUserId}
          handleJoinSession={handleJoinSession}
          handleLeaveSession={handleLeaveSession}
          openChat={openChat}
          setSessionEndConfirm={setSessionEndConfirm}
          cardClass={cardClass}
          border={border}
          muted={muted}
          primaryBtn={primaryBtn}
          secondaryBtn={secondaryBtn}
          dangerBtn={dangerBtn}
          dark={dark}
        />
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

      {/* Custom Confirmation Dialog for Ending Sessions */}
      {sessionEndConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm transition-all duration-300">
          <div className={`rounded-xl border p-6 max-w-md w-full mx-4 shadow-2xl animate-in fade-in zoom-in-95 duration-200 ${
            dark ? 'bg-black border-gray-800 text-white' : 'bg-white border-gray-200 text-gray-900'
          }`}>
            <div className="mb-4">
              <h3 className="text-[16px] font-medium tracking-tight text-red-500 flex items-center gap-2">
                <AlertCircle className="size-5" />
                End Study Session?
              </h3>
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
}
