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
import { DashboardInvite as Invite, StudySession as Session } from '@/lib/types';
import TodayClasses from '@/components/dashboard/TodayClasses';
import MarkedAttendance from '@/components/dashboard/MarkedAttendance';
import FriendsSection from '@/components/dashboard/FriendsSection';
import StudySessionsSection from '@/components/dashboard/StudySessionsSection';
import DashboardConfirmationModals from '@/components/dashboard/DashboardConfirmationModals';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { CalendarIcon, Sun, Moon, Plus, LogOut, ArrowRight, UserPlus, Users, MessageSquare, Undo2 } from 'lucide-react';

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------
const Dashboard = () => {
  const router = useRouter();
  const { darkMode, toggleDarkMode } = useDarkMode() as any;
  const { date, setDate, unmarkedSubjects, markedSubjects, handleAttendance, invites, loadExistingInvites, setInvites, friends, markHoliday, undoHoliday, attendanceLoading, holidayLoading, friendsLoading } = useAttendance() as any;
  const { socket, joinedSessions, setJoinedSessions, sessions, setSessions, sessionsLoaded, setSessionsLoaded } = useSocket() as any;

  // FIX: userId from verified auth context — never decode JWT client-side
  const { userId: currentUserId, isAuthenticated, loading, logout } = useAuth() as any;

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/');
    }
  }, [isAuthenticated, loading, router]);

  const [chatOpen, setChatOpen] = useState(false);
  const [createSessionOpen, setCreateSessionOpen] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [attendanceConfirm, setAttendanceConfirm] = useState<{ subject: any; status: string } | null>(null);
  const [sessionEndConfirm, setSessionEndConfirm] = useState<{ sessionId: string } | null>(null);
  const [holidayConfirm, setHolidayConfirm] = useState(false);
  const [undoHolidayConfirm, setUndoHolidayConfirm] = useState(false);
  const [sessionsLoading, setSessionsLoading] = useState(!sessionsLoaded);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [currentSessionDetails, setCurrentSessionDetails] = useState<Session | null>(null);
  const [friendCode, setFriendCode] = useState('');
  const [friendMessage, setFriendMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const friendMessageTimer = useRef<NodeJS.Timeout | null>(null);
  const sessionsLoadedRef = useRef(sessionsLoaded);

  useEffect(() => {
    sessionsLoadedRef.current = sessionsLoaded;
  }, [sessionsLoaded]);

  // FIX: per-invite pending state to prevent double-tap and allow retry on failure
  const [pendingInviteId, setPendingInviteId] = useState<string | null>(null);

  // FIX: notification badge counter
  const [newInviteCount, setNewInviteCount] = useState(0);

  // FIX: user details states (initialized from local cache to prevent flashes)
  const [userName, setUserName] = useState('');
  const [profileLoading, setProfileLoading] = useState(true);

  useEffect(() => {
    const cachedName = localStorage.getItem('userName');
    if (cachedName) {
      setUserName(cachedName);
      setProfileLoading(false);
    } else {
      setProfileLoading(false);
    }
  }, []);

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
    if (!sessionsLoadedRef.current) {
      setSessionsLoading(true);
    }
    try {
      const response = await API.get('/study-session/mine', { signal });
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

    if (!userName) {
      setProfileLoading(true);
    }
    API.get('/auth/userDetails', { signal: controller.signal })
      .then(res => {
        if (res.data.user?.name) {
          setUserName(res.data.user.name);
          localStorage.setItem('userName', res.data.user.name);
        }
      })
      .catch(err => {
        if (err.name !== 'CanceledError' && err.name !== 'AbortError') {
          console.error("Error fetching user details in Dashboard:", err);
        }
      })
      .finally(() => {
        setProfileLoading(false);
      });

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

  const hasClasses = unmarkedSubjects.length > 0 || markedSubjects.length > 0;
  const isAlreadyHoliday = unmarkedSubjects.length === 0 && markedSubjects.length > 0 && markedSubjects.every((s: any) => s.status === 'cancelled');

  return (
    <div className={`min-h-screen flex flex-col transition-colors duration-300 pt-[76px] ${dark ? 'bg-black text-white' : 'bg-white text-gray-900'}`}>

      {/* Main Container */}
      <div className="flex-1 max-w-[1100px] w-full mx-auto px-5 py-8">

        {/* Upper Dashboard header with Date Picker */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            {profileLoading ? (
              <div className="h-7 w-48 bg-gray-200 dark:bg-gray-850 rounded animate-pulse mb-1.5" />
            ) : (
              <h1 className="text-[22px] font-medium tracking-tight mb-1">
                {userName ? `${userName}'s Workspace` : 'Dojo Workspace'}
              </h1>
            )}
            <p className={`text-[13px] ${muted}`}>Track classes, manage friends, and host joint study sessions</p>
          </div>

          {/* Pick Date */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setCalendarOpen(!calendarOpen)}
              className={`flex items-center space-x-2 px-3.5 py-2 border rounded-lg text-[13px] font-medium transition-colors ${dark ? 'border-gray-800 hover:bg-gray-950 text-gray-200' : 'border-gray-200 hover:bg-gray-50 text-gray-700'
                }`}
            >
              <CalendarIcon className="size-4 text-gray-400" />
              <span>{date ? format(new Date(date + 'T00:00:00'), 'PPP') : 'Pick a date'}</span>
            </button>

            {calendarOpen && (
              <div className={`absolute right-0 mt-2 z-50 p-2 rounded-lg border shadow-xl ${dark ? 'bg-black border-gray-800' : 'bg-white border-gray-200'
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
            <TodayClasses
              date={date}
              unmarkedSubjects={unmarkedSubjects}
              attendanceLoading={attendanceLoading}
              holidayLoading={holidayLoading}
              hasClasses={hasClasses}
              isAlreadyHoliday={isAlreadyHoliday}
              setUndoHolidayConfirm={setUndoHolidayConfirm}
              setHolidayConfirm={setHolidayConfirm}
              setAttendanceConfirm={setAttendanceConfirm}
              cardClass={cardClass}
              border={border}
              muted={muted}
              secondaryBtn={secondaryBtn}
            />

            <MarkedAttendance
              date={date}
              markedSubjects={markedSubjects}
              attendanceLoading={attendanceLoading}
              holidayLoading={holidayLoading}
              cardClass={cardClass}
              border={border}
              muted={muted}
            />

            <FriendsSection
              friendCode={friendCode}
              setFriendCode={setFriendCode}
              handleAddFriend={handleAddFriend}
              friendMessage={friendMessage}
              friends={friends}
              friendsLoading={friendsLoading}
              cardClass={cardClass}
              border={border}
              muted={muted}
              inputClass={inputClass}
              primaryBtn={primaryBtn}
            />
          </div>

          {/* ---- RIGHT COLUMN ---- */}
          <div className="space-y-8">
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

      {/* Premium Custom Confirmation Modals */}
      <DashboardConfirmationModals
        attendanceConfirm={attendanceConfirm}
        setAttendanceConfirm={setAttendanceConfirm}
        handleAttendance={handleAttendance}
        sessionEndConfirm={sessionEndConfirm}
        setSessionEndConfirm={setSessionEndConfirm}
        socket={socket}
        holidayConfirm={holidayConfirm}
        setHolidayConfirm={setHolidayConfirm}
        markHoliday={markHoliday}
        undoHolidayConfirm={undoHolidayConfirm}
        setUndoHolidayConfirm={setUndoHolidayConfirm}
        undoHoliday={undoHoliday}
        date={date}
        dark={dark}
        muted={muted}
        secondaryBtn={secondaryBtn}
        primaryBtn={primaryBtn}
        dangerBtn={dangerBtn}
      />
    </div>
  );
};

export default Dashboard;