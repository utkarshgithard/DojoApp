"use client";

import { useEffect, useRef, useState, useCallback, useContext } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSocket } from "@/context/SocketContext";
import { useAuth } from "@/context/authContext";
import { useDarkMode } from "@/context/DarkModeContext";
import { Message, StudySession, Participant, TypingUsers } from "@/lib/types";
import API from "@/lib/axios";
import {
  ArrowLeft,
  Send,
  Focus,
  Users,
  Wifi,
  WifiOff,
  Loader2,
  PhoneOff,
  RefreshCw,
  Lock,
} from "lucide-react";
import { useE2EE } from "@/context/E2EEContext";

// ---------------------------------------------------------------------------
// Helper: Avatar initial bubble
// ---------------------------------------------------------------------------
function Avatar({
  name,
  size = "md",
  dark,
}: {
  name: string;
  size?: "sm" | "md";
  dark: boolean;
}) {
  const initial = name ? name.charAt(0).toUpperCase() : "?";
  const sizeClass = size === "sm" ? "w-7 h-7 text-[11px]" : "w-9 h-9 text-[13px]";
  return (
    <div
      className={`${sizeClass} rounded-full flex items-center justify-center font-semibold shrink-0 select-none
        ${dark ? "bg-gray-800 text-gray-200 border border-gray-700" : "bg-gray-100 text-gray-700 border border-gray-200"}`}
    >
      {initial}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helper: Typing dots animation
// ---------------------------------------------------------------------------
function TypingDots() {
  return (
    <span className="inline-flex items-center gap-[3px] ml-1">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-1 h-1 rounded-full bg-current opacity-60 animate-bounce"
          style={{ animationDelay: `${i * 0.15}s`, animationDuration: "0.9s" }}
        />
      ))}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------
export default function SessionChatPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params?.id as string;

  const { socket, sessions, setJoinedSessions } = useSocket() as any;
  const { userId: currentUserId, userName: currentUserName } = useAuth() as any;
  const { darkMode } = useDarkMode() as any;
  const e2ee = useE2EE();

  // Stable refs to E2EE functions and context handlers — prevents stale closures and infinite render loops
  const decryptRef = useRef(e2ee?.decrypt);
  const encryptRef = useRef(e2ee?.encrypt);
  const e2eeRef = useRef(e2ee);
  const setJoinedSessionsRef = useRef(setJoinedSessions);
  const currentUserIdRef = useRef(currentUserId);

  useEffect(() => { decryptRef.current = e2ee?.decrypt; }, [e2ee?.decrypt]);
  useEffect(() => { encryptRef.current = e2ee?.encrypt; }, [e2ee?.encrypt]);
  useEffect(() => { e2eeRef.current = e2ee; }, [e2ee]);
  useEffect(() => { setJoinedSessionsRef.current = setJoinedSessions; }, [setJoinedSessions]);
  useEffect(() => { currentUserIdRef.current = currentUserId; }, [currentUserId]);

  // Session data
  const [session, setSession] = useState<StudySession | null>(null);
  const [loadingSession, setLoadingSession] = useState(true);

  // Chat state
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [typingUsers, setTypingUsers] = useState<TypingUsers>({});
  const typingTimeouts = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // UI state
  const [focusMode, setFocusMode] = useState(false);
  const [showParticipants, setShowParticipants] = useState(false); // mobile drawer
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Session-ended overlay
  const [sessionEndedBy, setSessionEndedBy] = useState<string | null>(null);
  const [endCountdown, setEndCountdown] = useState(5);

  // Presence: track which participants are in the room
  const [joinedUsers, setJoinedUsers] = useState<Set<string>>(new Set());

  // Seed currentUser as joined once auth is ready (they are here = they are in the room)
  useEffect(() => {
    if (currentUserId) {
      setJoinedUsers((prev) => new Set([...prev, String(currentUserId)]));
    }
  }, [currentUserId]);

  // ---------------------------------------------------------------------------
  // Leave session handler — emits to socket, cleans up, navigates away
  // ---------------------------------------------------------------------------
  const handleLeave = () => {
    if (socket && sessionId) {
      socket.emit("leaveSession", { sessionId });
      // Remove from the global joined-sessions set in context
      if (setJoinedSessions) {
        setJoinedSessions((prev: Set<string>) => {
          const next = new Set(prev);
          next.delete(sessionId);
          localStorage.setItem("joinedSessions", JSON.stringify([...next]));
          return next;
        });
      }
    }
    router.push("/dashboard");
  };

  const handleEndSession = () => {
    if (socket && sessionId) {
      socket.emit("endSession", { sessionId });
      // Don't navigate immediately — wait for sessionEnded event so the
      // admin also sees the same overlay as every other participant.
    }
  };

  const dark = darkMode;
  const border = dark ? "border-gray-800" : "border-gray-200";
  const muted = dark ? "text-gray-400" : "text-gray-500";
  const bg = dark ? "bg-black" : "bg-white";
  const surfaceBg = dark ? "bg-zinc-950" : "bg-zinc-50";

  // ---------------------------------------------------------------------------
  // Load session — ALWAYS fetch from API to get participant names
  // (socket context data doesn't include participant.user.name)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!sessionId) return;
    const controller = new AbortController();

    (async () => {
      try {
        const res = await API.get("/study-session/mine", {
          signal: controller.signal,
        });
        const all: StudySession[] = res.data;
        const match = all.find((s) => s.id === sessionId);
        setSession(match || null);
      } catch (e: any) {
        if (e.name !== "CanceledError" && e.name !== "AbortError") {
          console.error("Failed to load session:", e);
        }
      } finally {
        if (!controller.signal.aborted) setLoadingSession(false);
      }
    })();

    return () => controller.abort();
  }, [sessionId]);

  // ---------------------------------------------------------------------------
  // Keep session STATUS in sync from socket context (for live/scheduled badge)
  // but preserve participant user data from the API fetch
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!sessions || !sessionId || !session) return;
    const found = (sessions as StudySession[]).find((s) => s.id === sessionId);
    if (found && found.status !== session.status) {
      // Only update status — keep our API-fetched participant data
      setSession((prev) => prev ? { ...prev, status: found.status } : prev);
    }
  }, [sessions, sessionId, session]);

  // ---------------------------------------------------------------------------
  // Scroll to bottom helper
  // ---------------------------------------------------------------------------
  const scrollToBottom = useCallback((smooth = false) => {
    if (listRef.current) {
      listRef.current.scrollTo({
        top: listRef.current.scrollHeight,
        behavior: smooth ? "smooth" : "auto",
      });
    }
  }, []);

  // ---------------------------------------------------------------------------
  // Re-join/Initialize room — can be called on mount, reconnect, or manually via Refresh
  // ---------------------------------------------------------------------------
  const doJoin = useCallback(() => {
    if (!socket || !sessionId) return;

    socket.emit("joinSession", { sessionId });

    // Mirror dashboard handleJoinSession — keep context + localStorage in sync
    const setJoined = setJoinedSessionsRef.current;
    if (setJoined) {
      setJoined((prev: Set<string>) => {
        const next = new Set([...prev, sessionId]);
        localStorage.setItem("joinedSessions", JSON.stringify([...next]));
        return next;
      });
    }

    // Give the server a moment to process joinSession and add us to activeSessions
    // before we ask for the active participant list
    setTimeout(() => {
      socket.emit("getActiveParticipants", { sessionId });
    }, 300);

    // Announce our ECDH public key to the session room so peers can send us
    // the current room key (Sender Key distribution)
    const currentE2ee = e2eeRef.current;
    if (currentE2ee?.isReady && currentE2ee.announcePublicKey) {
      setTimeout(() => currentE2ee.announcePublicKey(sessionId), 400);
    }
  }, [socket, sessionId]);

  // Manual refresh handler with spin visual feedback
  const handleRefresh = () => {
    setIsRefreshing(true);
    doJoin();
    setTimeout(() => {
      setIsRefreshing(false);
    }, 600);
  };

  // ---------------------------------------------------------------------------
  // Socket: join room on mount / reconnect, then attach chat listeners
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!socket || !sessionId) return;

    // ── Register ALL listeners FIRST so no server response is missed ──
    const onHistory = async (data: { sessionId: string; messages: Message[] }) => {
      if (data.sessionId !== sessionId) return;
      const decryptFn = decryptRef.current;
      const msgs = decryptFn
        ? await Promise.all(
            (data.messages || []).map(async (m) => {
              if (m.ciphertext) {
                try {
                  return { ...m, text: await decryptFn(m) };
                } catch { return m; }
              }
              return m;
            }),
          )
        : (data.messages || []);
      setMessages(msgs);
      setTimeout(() => scrollToBottom(false), 0);
    };

    const onNew = async (msg: Message) => {
      if (msg.sessionId !== sessionId) return;
      let displayMsg = msg;
      if (msg.ciphertext && decryptRef.current) {
        try {
          const plaintext = await decryptRef.current(msg);
          displayMsg = { ...msg, text: plaintext };
        } catch {}
      }
      setMessages((prev) => [...prev, displayMsg]);
      setTimeout(() => scrollToBottom(true), 0);
    };

    const onTyping = (data: {
      userId: string;
      name: string;
      isTyping: boolean;
    }) => {
      if (data.userId === currentUserIdRef.current) return;
      setTypingUsers((prev) => ({
        ...prev,
        [data.userId]: data.isTyping ? data.name : undefined,
      }));
      clearTimeout(typingTimeouts.current[data.userId]);
      if (data.isTyping) {
        typingTimeouts.current[data.userId] = setTimeout(() => {
          setTypingUsers((prev) => ({ ...prev, [data.userId]: undefined }));
        }, 3000);
      }
    };

    const onError = (e: { msg?: string }) =>
      console.warn("chatError:", e?.msg);

    // Presence snapshot: seed joinedUsers from server's in-memory activeSessions
    const onActiveParticipants = (data: { sessionId: string; userIds: string[] }) => {
      if (data.sessionId !== sessionId) return;
      setJoinedUsers((prev) => new Set([...prev, ...data.userIds]));
    };

    // Presence: someone left the session room
    const onUserLeft = (data: { sessionId: string; userId: string }) => {
      if (data.sessionId !== sessionId) return;
      setJoinedUsers((prev) => {
        const next = new Set(prev);
        next.delete(data.userId);
        return next;
      });
    };

    // Presence: someone joined (or rejoined) the session room
    const onUserJoined = (data: { sessionId: string; userId: string }) => {
      if (data.sessionId !== sessionId) return;
      setJoinedUsers((prev) => new Set([...prev, data.userId]));
    };

    // Real-time Invite Acceptance updates
    const onParticipantAccepted = (data: { sessionId: string; userId: string; status: string }) => {
      if (data.sessionId !== sessionId) return;
      setSession((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          participants: prev.participants.map((p) =>
            String(p.userId || p.user?.id || "") === String(data.userId)
              ? { ...p, status: data.status as any }
              : p
          ),
        };
      });
    };

    // Real-time Invite Decline updates
    const onParticipantDeclined = (data: { sessionId: string; userId: string; status: string }) => {
      if (data.sessionId !== sessionId) return;
      setSession((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          participants: prev.participants.map((p) =>
            String(p.userId || p.user?.id || "") === String(data.userId)
              ? { ...p, status: data.status as any }
              : p
          ),
        };
      });
    };

    const onSessionEnded = (data: { sessionId: string; endedBy?: string }) => {
      if (data.sessionId !== sessionId) return;
      // Clean up joined-sessions context so dashboard shows correct state
      const setJoined = setJoinedSessionsRef.current;
      if (setJoined) {
        setJoined((prev: Set<string>) => {
          const next = new Set(prev);
          next.delete(sessionId);
          localStorage.setItem("joinedSessions", JSON.stringify([...next]));
          return next;
        });
      }
      setSessionEndedBy(data.endedBy || "The host");
      setEndCountdown(5);
    };

    // Register all listeners before emitting anything
    socket.on("sessionMessages", onHistory);
    socket.on("newChatMessage", onNew);
    socket.on("userTyping", onTyping);
    socket.on("chatError", onError);
    socket.on("activeParticipants", onActiveParticipants);
    socket.on("userLeftSession", onUserLeft);
    socket.on("userJoinedSession", onUserJoined);
    socket.on("participantAccepted", onParticipantAccepted);
    socket.on("participantDeclined", onParticipantDeclined);
    socket.on("sessionEnded", onSessionEnded);

    // Re-join automatically on socket reconnect (network drop, backend restart)
    socket.on("connect", doJoin);

    // ── Now it's safe to join — all listeners are ready ──
    doJoin();

    const timeouts = typingTimeouts.current;
    return () => {
      socket.off("connect", doJoin);
      socket.off("sessionMessages", onHistory);
      socket.off("newChatMessage", onNew);
      socket.off("userTyping", onTyping);
      socket.off("chatError", onError);
      socket.off("activeParticipants", onActiveParticipants);
      socket.off("userLeftSession", onUserLeft);
      socket.off("userJoinedSession", onUserJoined);
      socket.off("participantAccepted", onParticipantAccepted);
      socket.off("participantDeclined", onParticipantDeclined);
      socket.off("sessionEnded", onSessionEnded);
      Object.values(timeouts).forEach(clearTimeout);
    };
  }, [socket, sessionId, router, scrollToBottom, doJoin]);

  // ---------------------------------------------------------------------------
  // Send message
  // ---------------------------------------------------------------------------
  const disabled = !socket || session?.status !== "in_progress";

  const send = async () => {
    if (!text.trim() || disabled || !socket) return;
    const trimmed = text.trim();
    setText("");
    socket.emit("typing", { sessionId, isTyping: false });
    inputRef.current?.focus();

    // Try E2EE encryption first
    if (encryptRef.current && e2ee?.isReady) {
      const memberIds = (session?.participants || [])
        .map((p) => String(p.userId || p.user?.id || ""))
        .filter(Boolean);
      try {
        const payload = await encryptRef.current(trimmed, memberIds);
        if (payload) {
          socket.emit("sendChatMessage", { sessionId, ...payload, text: "" });
          return;
        }
      } catch (err) {
        console.warn("[E2EE] Encrypt failed, falling back to plaintext:", err);
      }
    }

    // Fallback: plaintext (E2EE not yet ready or context unavailable)
    socket.emit("sendChatMessage", { sessionId, text: trimmed });
  };

  const handleTyping = (val: string) => {
    setText(val);
    if (socket) socket.emit("typing", { sessionId, isTyping: !!val });
  };

  // ---------------------------------------------------------------------------
  // Derived values
  // ---------------------------------------------------------------------------
  const typingNames = Object.values(typingUsers).filter(Boolean) as string[];

  const participants: Participant[] = session?.participants || [];

  // Sort: current user first, then joined/accepted, then others
  const sortedParticipants = [...participants].sort((a, b) => {
    const aId = a.userId || a.user?.id || "";
    const bId = b.userId || b.user?.id || "";
    if (String(aId) === String(currentUserId)) return -1;
    if (String(bId) === String(currentUserId)) return 1;
    const order = { joined: 0, accepted: 1, invited: 2, declined: 3, removed: 4 };
    return (order[a.status] ?? 5) - (order[b.status] ?? 5);
  });

  const formatTime = (ts: string | Date) =>
    new Date(ts).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });

  const isLive = session?.status === "in_progress";
  const isScheduled = session?.status === "scheduled";

  // ---------------------------------------------------------------------------
  // Countdown auto-redirect when session has ended
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (sessionEndedBy === null) return;
    if (endCountdown <= 0) {
      router.push("/dashboard");
      return;
    }
    const t = setTimeout(() => setEndCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [sessionEndedBy, endCountdown, router]);

  // ---------------------------------------------------------------------------
  // Session-Ended full-screen overlay
  // ---------------------------------------------------------------------------
  if (sessionEndedBy !== null) {
    return (
      <div
        className={`min-h-screen flex flex-col items-center justify-center gap-8 px-6
          ${dark ? "bg-black text-white" : "bg-white text-gray-900"}
          animate-in fade-in duration-700`}
      >
        {/* Minimal SVG illustration — nighttime study scene */}
        <div className={dark ? "text-gray-400" : "text-gray-400"}>
          <svg
            width="180"
            height="150"
            viewBox="0 0 180 150"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            {/* Crescent moon */}
            <path
              d="M90 16 C73 16 62 29 62 44 C62 59 73 72 90 72 C79 72 70 62 70 48 C70 34 79 22 90 16Z"
              stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
            />
            {/* Stars */}
            <circle cx="116" cy="20" r="1.8" fill="currentColor" />
            <circle cx="130" cy="36" r="1.1" fill="currentColor" />
            <circle cx="107" cy="10" r="1.1" fill="currentColor" />
            <circle cx="50" cy="28" r="1.8" fill="currentColor" />
            <circle cx="40" cy="14" r="1.1" fill="currentColor" />
            <circle cx="145" cy="18" r="1.1" fill="currentColor" />
            <circle cx="160" cy="42" r="0.9" fill="currentColor" />
            <circle cx="20" cy="50" r="0.9" fill="currentColor" />
            {/* Desk surface */}
            <line x1="18" y1="118" x2="162" y2="118" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            {/* Closed laptop */}
            <rect x="56" y="96" width="68" height="22" rx="3" stroke="currentColor" strokeWidth="1.6" />
            {/* Keyboard rows hint */}
            <line x1="62" y1="107" x2="118" y2="107" stroke="currentColor" strokeWidth="0.8" opacity="0.4" />
            <line x1="62" y1="112" x2="100" y2="112" stroke="currentColor" strokeWidth="0.8" opacity="0.4" />
            {/* Mug */}
            <path
              d="M130 100 L130 114 Q130 116 132 116 L141 116 Q143 116 143 114 L143 100Z"
              stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"
            />
            <path d="M143 103 Q150 103 150 109 Q150 115 143 115" stroke="currentColor" strokeWidth="1.3" />
            <line x1="128" y1="100" x2="145" y2="100" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
            {/* Steam wisps */}
            <path d="M134 95 Q136 90 134 85" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.45" />
            <path d="M138 95 Q140 89 138 84" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.35" />
            {/* Pencil on desk */}
            <line x1="26" y1="116" x2="46" y2="116" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
            <path d="M46 114 L50 116 L46 118Z" fill="currentColor" />
            {/* Small open book (closed pages) */}
            <path d="M22 105 L22 116 Q30 113 34 116 L34 105 Q30 102 22 105Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
          </svg>
        </div>

        {/* Text */}
        <div className="flex flex-col items-center gap-2 text-center">
          <h1 className={`text-[22px] font-semibold tracking-tight ${dark ? "text-white" : "text-gray-900"}`}>
            Session Ended
          </h1>
          <p className={`text-[13.5px] ${dark ? "text-gray-400" : "text-gray-500"}`}>
            Ended by <span className="font-medium">{sessionEndedBy}</span>
          </p>
          <p className={`text-[12px] mt-1 ${dark ? "text-gray-600" : "text-gray-400"}`}>
            Redirecting to dashboard in {endCountdown}s…
          </p>
        </div>

        {/* Progress bar */}
        <div className={`w-48 h-0.5 rounded-full overflow-hidden ${dark ? "bg-gray-800" : "bg-gray-100"}`}>
          <div
            className={`h-full rounded-full transition-all duration-1000 ease-linear ${
              dark ? "bg-gray-500" : "bg-gray-400"
            }`}
            style={{ width: `${(endCountdown / 5) * 100}%` }}
          />
        </div>

        {/* Manual button */}
        <button
          onClick={() => router.push("/dashboard")}
          className={`px-5 py-2 rounded-xl text-[13px] font-medium border transition-all active:scale-95
            ${ dark
              ? "border-gray-700 text-gray-200 hover:bg-gray-900"
              : "border-gray-200 text-gray-700 hover:bg-gray-50"
            }`}
        >
          Go to Dashboard
        </button>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Loading / Not found state
  // ---------------------------------------------------------------------------
  if (loadingSession) {
    return (
      <div
        className={`min-h-screen flex items-center justify-center ${bg} ${dark ? "text-white" : "text-gray-900"}`}
      >
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={22} className={`animate-spin ${muted}`} />
          <p className={`text-[13px] ${muted}`}>Loading session…</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div
        className={`min-h-screen flex flex-col items-center justify-center gap-4 ${bg} ${dark ? "text-white" : "text-gray-900"}`}
      >
        <p className="text-[15px] font-medium">Session not found</p>
        <button
          onClick={() => router.push("/dashboard")}
          className={`px-4 py-2 rounded-lg text-[13px] border transition-colors ${dark ? "border-gray-800 text-gray-200 hover:bg-gray-900" : "border-gray-200 text-gray-700 hover:bg-gray-50"}`}
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // JSX
  // ---------------------------------------------------------------------------
  return (
    <div
      className={`h-screen flex flex-col overflow-hidden transition-colors duration-300 ${bg} ${dark ? "text-white" : "text-gray-900"}`}
    >
      {/* ------------------------------------------------------------------ */}
      {/* TOP BAR                                                             */}
      {/* ------------------------------------------------------------------ */}
      <header
        className={`flex items-center justify-between px-4 py-3 border-b ${border} shrink-0 transition-all duration-300 ${focusMode ? "opacity-0 pointer-events-none h-0 py-0 border-0 overflow-hidden" : "opacity-100"}`}
      >
        {/* Left: Back + Session Name */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => router.push("/dashboard")}
            className={`flex items-center gap-1.5 text-[13px] font-medium shrink-0 transition-colors ${muted} hover:text-current`}
            aria-label="Back to dashboard"
          >
            <ArrowLeft size={15} />
            <span className="hidden sm:inline">Dashboard</span>
          </button>

          <span className={`${dark ? "text-gray-700" : "text-gray-300"} shrink-0`}>
            /
          </span>

          <div className="flex items-center gap-2 min-w-0">
            <h1 className="text-[15px] font-semibold tracking-tight truncate">
              {session.subject}
            </h1>

            {isLive && (
              <span className="shrink-0 inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border border-green-500/30 text-green-500 bg-green-500/8">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                Live
              </span>
            )}
            {isScheduled && (
              <span className={`shrink-0 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded border ${border} ${muted}`}>
                Scheduled
              </span>
            )}
          </div>
        </div>

        {/* Right: Controls */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Mobile: toggle participants panel */}
          <button
            onClick={() => setShowParticipants((p) => !p)}
            className={`flex md:hidden items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[12px] font-medium border transition-colors ${dark ? "border-gray-800 text-gray-300 hover:bg-gray-900" : "border-gray-200 text-gray-600 hover:bg-gray-50"}`}
            aria-label="Toggle participants"
          >
            <Users size={13} />
            <span>{participants.length}</span>
          </button>

          {/* Refresh Button */}
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className={`flex md:hidden items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium border transition-all active:scale-95
              ${dark ? "border-gray-800 text-gray-300 hover:bg-gray-900" : "border-gray-200 text-gray-600 hover:bg-gray-50"}
              disabled:opacity-60 disabled:cursor-not-allowed`}
            aria-label="Refresh chat connection"
          >
            <RefreshCw size={13} className={isRefreshing ? "animate-spin" : ""} />
            <span>Refresh</span>
          </button>

          {/* E2EE Lock Badge */}
          {e2ee?.isReady && (
            <span
              title="End-to-End Encrypted — server cannot read your messages"
              className={`hidden sm:inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border select-none
                ${dark
                  ? "border-emerald-500/30 text-emerald-400 bg-emerald-500/10"
                  : "border-emerald-500/30 text-emerald-600 bg-emerald-50"}`}
            >
              <Lock size={9} />
              E2EE
            </span>
          )}

          {/* Focus mode toggle */}

          <button
            onClick={() => setFocusMode((f) => !f)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium border transition-colors
              ${focusMode
                ? dark ? "border-indigo-500/50 text-indigo-400 bg-indigo-500/10" : "border-indigo-400/50 text-indigo-600 bg-indigo-50"
                : dark ? "border-gray-800 text-gray-300 hover:bg-gray-900" : "border-gray-200 text-gray-600 hover:bg-gray-50"
              }`}
            aria-label="Toggle focus mode"
          >
            <Focus size={13} />
            <span className="hidden sm:inline">Focus Mode</span>
          </button>

          {/* Leave Session — prominent red, like Zoom */}
          <button
            onClick={handleLeave}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold border border-red-500/40 text-red-500 bg-red-500/8 hover:bg-red-500/15 active:scale-95 transition-all"
            aria-label="Leave session"
          >
            <PhoneOff size={13} />
            <span className="hidden sm:inline">Leave</span>
          </button>
        </div>
      </header>

      {/* Focus mode exit bar */}
      {focusMode && (
        <div className="flex items-center justify-between px-4 py-1.5 shrink-0 border-b border-dashed border-indigo-500/30 bg-indigo-500/5">
          <span className="text-[11px] text-indigo-400 font-medium tracking-wide">
            🎯 Focus Mode — {session.subject}
          </span>
          <div className="flex items-center gap-3">
            <button
              onClick={handleLeave}
              className="text-[11px] text-red-400 hover:text-red-300 font-medium transition-colors flex items-center gap-1"
            >
              <PhoneOff size={11} /> Leave
            </button>
            <button
              onClick={() => setFocusMode(false)}
              className="text-[11px] text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
            >
              Exit Focus
            </button>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* BODY: sidebar + chat                                                */}
      {/* ------------------------------------------------------------------ */}
      <div className="flex flex-1 overflow-hidden">
        {/* ---------------------------------------------------------------- */}
        {/* LEFT SIDEBAR — Participants                                       */}
        {/* ---------------------------------------------------------------- */}
        <aside
          className={`
            shrink-0 border-r ${border} flex flex-col overflow-hidden transition-all duration-300
            ${focusMode ? "w-0 border-0 opacity-0" : "w-[220px] lg:w-[260px] opacity-100"}
            hidden md:flex
          `}
        >
          <div className={`px-4 py-3 border-b ${border} shrink-0`}>
            <p className={`text-[10px] uppercase tracking-widest font-semibold ${muted}`}>
              Participants
            </p>
            <p className="text-[13px] font-medium mt-0.5">
              {participants.length} {participants.length === 1 ? "person" : "people"}
            </p>
            {/* E2EE status */}
            <div className={`flex items-center gap-1 mt-1.5 ${e2ee?.isReady ? (dark ? "text-emerald-400" : "text-emerald-600") : (dark ? "text-gray-600" : "text-gray-400")}`}>
              <Lock size={9} />
              <span className="text-[9px] font-semibold uppercase tracking-wider">
                {e2ee?.isReady ? "End-to-End Encrypted" : "Establishing keys…"}
              </span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto py-2">
            {sortedParticipants.map((p) => {
              const pId = String(p.userId || p.user?.id || "");
              const isMe = pId === String(currentUserId);
              const pName = p.user?.name || (isMe ? (currentUserName || "You") : "Unknown");
              const isTypingNow = !!typingUsers[pId];

              // Real-time presence overrides DB status
              const isInRoom = joinedUsers.has(pId);

              // Dot color priority: in-room → green, accepted → yellow, else gray
              const dotColor = isInRoom
                ? "bg-green-500"
                : p.status === "accepted" || p.status === "joined"
                ? "bg-yellow-400"
                : "bg-gray-400";

              // Status label
              const statusLabel = isInRoom
                ? "Active"
                : p.status === "accepted" || p.status === "joined"
                ? "Joined"
                : p.status;

              return (
                <div
                  key={p.id}
                  className={`flex items-center gap-2.5 px-4 py-2.5 transition-colors ${dark ? "hover:bg-gray-950/60" : "hover:bg-gray-50"}`}
                >
                  <div className="relative shrink-0">
                    <Avatar name={pName} size="sm" dark={dark} />
                    {/* Presence dot */}
                    <span
                      className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 transition-colors duration-500 ${dark ? "border-black" : "border-white"} ${dotColor}`}
                    />
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className={`text-[12.5px] font-medium truncate ${
                        isMe
                          ? (dark ? "text-white" : "text-gray-900")
                          : (dark ? "text-gray-300" : "text-gray-700")
                      }`}>
                        {isMe ? "You" : pName}
                      </p>
                      {isMe && (
                        <span className={`text-[9px] px-1 py-0.5 rounded font-semibold uppercase tracking-wide border ${dark ? "border-gray-700 text-gray-500" : "border-gray-200 text-gray-400"}`}>
                          me
                        </span>
                      )}
                    </div>

                    {isTypingNow ? (
                      <p className={`text-[11px] ${dark ? "text-indigo-400" : "text-indigo-500"} flex items-center`}>
                        typing <TypingDots />
                      </p>
                    ) : (
                      <p className={`text-[11px] capitalize ${muted}`}>
                        {statusLabel}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Leave Session Button */}
          <div className={`px-4 pt-3 pb-2 border-t ${border} shrink-0`}>
            {/* Refresh Connection Button */}
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className={`w-full flex items-center justify-center gap-2 py-2 mb-2 rounded-lg text-[12.5px] font-semibold border transition-all active:scale-95
                ${dark 
                  ? "border-gray-800 text-gray-250 hover:bg-gray-900 bg-zinc-950/40 hover:text-white" 
                  : "border-gray-200 text-gray-700 hover:bg-gray-50 bg-zinc-50/40 hover:text-black"}
                disabled:opacity-60 disabled:cursor-not-allowed`}
              aria-label="Refresh connection"
            >
              <RefreshCw size={13} className={isRefreshing ? "animate-spin" : ""} />
              <span>Refresh Connection</span>
            </button>

            {session?.creatorId === currentUserId && (
              <button
                onClick={handleEndSession}
                className="w-full flex items-center justify-center gap-2 py-2 mb-2 rounded-lg text-[12.5px] font-semibold border border-red-500/40 text-red-500 bg-red-500/8 hover:bg-red-500/15 active:scale-95 transition-all"
              >
                <PhoneOff size={13} />
                End Session
              </button>
            )}
            <button
              onClick={handleLeave}
              className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-[12.5px] font-semibold border border-red-500/40 text-red-500 bg-red-500/8 hover:bg-red-500/15 active:scale-95 transition-all"
            >
              <PhoneOff size={13} />
              Leave Session
            </button>
          </div>

          {/* Connection indicator */}
          <div className={`px-4 py-2.5 border-t ${border} shrink-0 flex items-center gap-1.5`}>
            {socket?.connected ? (
              <>
                <Wifi size={11} className="text-green-500" />
                <span className={`text-[11px] ${muted}`}>Connected</span>
              </>
            ) : (
              <>
                <WifiOff size={11} className="text-red-400" />
                <span className="text-[11px] text-red-400">Reconnecting…</span>
              </>
            )}
          </div>
        </aside>

        {/* Mobile Participants Drawer Overlay */}
        {showParticipants && (
          <div
            className="fixed inset-0 z-40 md:hidden"
            onClick={() => setShowParticipants(false)}
          >
            <div className={`absolute left-0 top-0 h-full w-64 border-r ${border} ${bg} overflow-y-auto shadow-2xl`} onClick={(e) => e.stopPropagation()}>
              <div className={`flex items-center justify-between px-4 py-4 border-b ${border}`}>
                <p className="text-[13px] font-semibold">Participants ({participants.length})</p>
                <button onClick={() => setShowParticipants(false)} className={`text-[12px] ${muted} hover:text-current`}>Close</button>
              </div>
              {sortedParticipants.map((p) => {
                const pId = String(p.userId || p.user?.id || "");
                const isMe = pId === String(currentUserId);
                const pName = p.user?.name || (isMe ? (currentUserName || "You") : "Unknown");
                const isTypingNow = !!typingUsers[pId];

                const isInRoom = joinedUsers.has(pId);
                const dotColor = isInRoom
                  ? "bg-green-500"
                  : p.status === "accepted" || p.status === "joined"
                  ? "bg-yellow-400"
                  : "bg-gray-400";
                const statusLabel = isInRoom
                  ? "Active"
                  : p.status === "accepted" || p.status === "joined"
                  ? "Joined"
                  : p.status;

                return (
                  <div key={p.id} className={`flex items-center gap-2.5 px-4 py-3`}>
                    <div className="relative shrink-0">
                      <Avatar name={pName} size="sm" dark={dark} />
                      <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 transition-colors duration-500 ${dark ? "border-black" : "border-white"} ${dotColor}`} />
                    </div>
                    <div className="min-w-0">
                      <p className={`text-[12.5px] font-medium truncate`}>{isMe ? "You" : pName}</p>
                      {isTypingNow ? (
                        <p className={`text-[11px] ${dark ? "text-indigo-400" : "text-indigo-500"} flex items-center`}>typing <TypingDots /></p>
                      ) : (
                        <p className={`text-[11px] capitalize ${muted}`}>{statusLabel}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ---------------------------------------------------------------- */}
        {/* RIGHT: Chat Area                                                  */}
        {/* ---------------------------------------------------------------- */}
        <div className="flex flex-col flex-1 overflow-hidden">

          {/* Message List */}
          <div
            ref={listRef}
            className="flex-1 overflow-y-auto px-4 py-5 space-y-4"
          >
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-3 text-center py-16">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${dark ? "bg-gray-900" : "bg-gray-100"}`}>
                  <span className="text-2xl">💬</span>
                </div>
                <div>
                  <p className={`text-[14px] font-medium ${dark ? "text-gray-300" : "text-gray-700"}`}>
                    {isLive ? "Start the conversation!" : "Chat will be available when the session goes live."}
                  </p>
                  <p className={`text-[12px] ${muted} mt-1`}>
                    {isLive ? "Say hello to your study buddies 👋" : "Hang tight…"}
                  </p>
                </div>
              </div>
            ) : (
              messages.map((m, index) => {
                const isOwn = String(m.userId) === String(currentUserId);
                const prevMsg = index > 0 ? messages[index - 1] : null;
                const showSender = !prevMsg || prevMsg.userId !== m.userId;

                return (
                  <div
                    key={m.id || m._id || index}
                    className={`flex gap-2.5 ${isOwn ? "flex-row-reverse" : "flex-row"}`}
                  >
                    {/* Avatar — only on first message in a group */}
                    <div className="shrink-0 mt-0.5">
                      {showSender ? (
                        <Avatar name={m.name || "?"} size="sm" dark={dark} />
                      ) : (
                        <div className="w-7 h-7" />
                      )}
                    </div>

                    <div className={`flex flex-col max-w-[70%] ${isOwn ? "items-end" : "items-start"}`}>
                      {showSender && (
                        <div className={`flex items-center gap-2 mb-1 ${isOwn ? "flex-row-reverse" : "flex-row"}`}>
                          <span className="text-[11.5px] font-semibold">
                            {isOwn ? "You" : m.name}
                          </span>
                          <span className={`text-[10px] font-mono ${muted}`}>
                            {formatTime(m.ts)}
                          </span>
                        </div>
                      )}

                      <div
                        className={`px-3.5 py-2 rounded-2xl text-[13.5px] leading-relaxed break-words transition-colors
                          ${isOwn
                            ? dark
                              ? "bg-white text-black rounded-tr-sm"
                              : "bg-black text-white rounded-tr-sm"
                            : dark
                              ? `${surfaceBg} text-gray-200 border ${border} rounded-tl-sm`
                              : `${surfaceBg} text-gray-800 border ${border} rounded-tl-sm`
                          }`}
                      >
                        {(() => {
                          // Detect E2EE error sentinels — show a styled lock pill instead of raw error strings
                          const t = m.text;
                          const isLegacyLocked = t === '__E2EE_ERR__KEY_MISMATCH';
                          const isNotRecipient  = t === '__E2EE_ERR__NOT_RECIPIENT';
                          const isKeysNotReady  = t === '__E2EE_ERR__KEYS_NOT_READY';
                          const isEncryptedErr  = isLegacyLocked || isNotRecipient || isKeysNotReady;

                          if (isEncryptedErr) {
                            return (
                              <span className={`inline-flex items-center gap-1.5 text-[11.5px] font-medium italic
                                ${ isLegacyLocked
                                    ? dark ? 'text-gray-500' : 'text-gray-400'
                                    : dark ? 'text-amber-500/70' : 'text-amber-600/80'
                                }`}>
                                <Lock size={10} />
                                { isLegacyLocked
                                    ? 'Encrypted — sent before keys were established on this device'
                                    : isNotRecipient
                                    ? 'Encrypted — you are not a recipient'
                                    : 'Encrypted — keys initialising…'
                                }
                              </span>
                            );
                          }
                          return <>{t}</>;
                        })()}
                      </div>

                      {/* Time for non-first messages in group */}
                      {!showSender && (
                        <span className={`text-[9.5px] font-mono mt-0.5 ${muted}`}>
                          {formatTime(m.ts)}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Typing Indicator */}
          <div className={`px-4 h-6 shrink-0 flex items-center`}>
            {typingNames.length > 0 && (
              <span className={`text-[11.5px] font-medium ${dark ? "text-indigo-400" : "text-indigo-500"} flex items-center gap-1`}>
                {typingNames.length === 1
                  ? typingNames[0]
                  : typingNames.length === 2
                    ? `${typingNames[0]} and ${typingNames[1]}`
                    : `${typingNames[0]} and ${typingNames.length - 1} others`}
                {typingNames.length === 1 ? " is" : " are"} typing
                <TypingDots />
              </span>
            )}
          </div>

          {/* Input Bar */}
          <div className={`px-4 py-3 border-t ${border} shrink-0`}>
            {!isLive && (
              <p className={`text-[11.5px] text-center ${muted} mb-2`}>
                {isScheduled
                  ? "Chat is available once the session starts"
                  : "This session has ended"}
              </p>
            )}
            <div className="flex gap-2 items-end">
              <input
                ref={inputRef}
                disabled={disabled}
                value={text}
                onChange={(e) => handleTyping(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send();
                  }
                }}
                placeholder={
                  disabled
                    ? "Chat available when session is live…"
                    : "Type a message…"
                }
                className={`flex-1 px-3.5 py-2.5 text-[13.5px] rounded-xl border outline-none transition-colors resize-none disabled:opacity-40
                  ${dark
                    ? "bg-zinc-950 border-gray-800 text-white placeholder-gray-700 focus:border-gray-600"
                    : "bg-zinc-50 border-gray-200 text-gray-900 placeholder-gray-400 focus:border-gray-400"
                  }`}
                autoComplete="off"
              />
              <button
                disabled={disabled || !text.trim()}
                onClick={send}
                className={`px-4 py-2.5 rounded-xl text-[13px] font-medium flex items-center gap-1.5 transition-all active:scale-95 shrink-0
                  ${dark ? "bg-white text-black hover:bg-gray-100" : "bg-black text-white hover:bg-gray-900"}
                  disabled:opacity-40 disabled:cursor-not-allowed`}
                aria-label="Send message"
              >
                <Send size={14} />
                <span className="hidden sm:inline">Send</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
