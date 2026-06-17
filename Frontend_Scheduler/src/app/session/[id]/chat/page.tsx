"use client";

import { useEffect, useLayoutEffect, useRef, useState, useCallback, useContext } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSocket } from "@/context/SocketContext";
import { useAuth } from "@/context/authContext";
import { useDarkMode } from "@/context/DarkModeContext";
import { Message, StudySession, Participant, TypingUsers } from "@/lib/types";
import API from "@/lib/axios";
import { useVideoCall } from "@/hooks/useVideoCall";
import { useGroupCall } from "@/hooks/useGroupCall";
import { CallButton } from "@/components/call/CallButton";
import { IncomingCallToast } from "@/components/call/IncomingCallToast";
import { CallOverlay } from "@/components/call/CallOverlay";
import { getCallDurationString } from "@/components/call/CallDurationTimer";
import { CallStatus } from "@/types/call";
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
  Paperclip,
  Download,
  FileText,
  X,
  Image as ImageIcon,
  StopCircle,
} from "lucide-react";
import { useE2EE } from "@/context/E2EEContext";
import { auth } from "@/lib/firebase";
import { toast } from "sonner";

// ---------------------------------------------------------------------------
// Helper: Avatar initial bubble
// ---------------------------------------------------------------------------
function Avatar({
  name,
  avatarUrl,
  size = "md",
  dark,
}: {
  name: string;
  avatarUrl?: string;
  size?: "sm" | "md";
  dark: boolean;
}) {
  const sizeClass = size === "sm" ? "w-7 h-7 text-[11px]" : "w-9 h-9 text-[13px]";
  if (avatarUrl) {
    return (
      <div className={`${sizeClass} rounded-full overflow-hidden shrink-0 border border-gray-250 dark:border-gray-800 shadow-sm`}>
        <img src={avatarUrl} alt={name} className="w-full h-full object-cover" />
      </div>
    );
  }
  const initial = name ? name.charAt(0).toUpperCase() : "?";
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
// Helpers: File sharing UI & size formatting
// ---------------------------------------------------------------------------
interface SharedFile {
  name: string;
  type: string;
  size: number;
  data: string; // base64 data URL
  caption?: string;
}

function formatFileSize(bytes: number) {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

function FileMessageBubble({
  file,
  isOwn,
  dark,
}: {
  file: SharedFile;
  isOwn: boolean;
  dark: boolean;
}) {
  const isImage = file.type?.startsWith("image/");

  return (
    <div className="flex flex-col gap-1.5 max-w-full">
      {/* File card */}
      <div className={`p-2.5 rounded-xl border flex items-center gap-3 text-left w-[240px] sm:w-[280px] max-w-full
        ${isOwn
          ? dark
            ? "border-black/10 bg-black/5 text-black"
            : "border-white/10 bg-white/10 text-white"
          : dark
            ? "border-zinc-800 bg-zinc-900/50 text-zinc-200"
            : "border-gray-200 bg-gray-50 text-gray-800"
        }`}
      >
        <div className={`p-2 rounded-lg shrink-0
          ${isOwn
            ? dark
              ? "bg-black/10 text-black"
              : "bg-white/10 text-white"
            : dark
              ? "bg-zinc-800 text-zinc-300"
              : "bg-gray-150 text-gray-600"
          }`}
        >
          {isImage ? (
            <ImageIcon size={18} />
          ) : (
            <FileText size={18} />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[12.5px] font-semibold truncate" title={file.name}>
            {file.name}
          </p>
          <p className={`text-[10px] ${isOwn ? "opacity-75" : "text-gray-400 dark:text-gray-500"}`}>
            {formatFileSize(file.size)}
          </p>
        </div>
        <a
          href={file.data}
          download={file.name}
          className={`p-2 rounded-lg border transition-all active:scale-95 flex items-center justify-center shrink-0
            ${isOwn
              ? dark
                ? "border-black/20 hover:bg-black/15 text-black"
                : "border-white/20 hover:bg-white/15 text-white"
              : dark
                ? "border-zinc-800 hover:bg-zinc-850 text-zinc-300 hover:text-white bg-zinc-900"
                : "border-gray-250 hover:bg-gray-150 text-gray-600 hover:text-black bg-white"
            }`}
          title="Download file"
        >
          <Download size={14} />
        </a>
      </div>

      {/* Image Preview (if image) */}
      {isImage && (
        <div className={`relative mt-1 max-w-[240px] sm:max-w-[280px] rounded-lg overflow-hidden border bg-black/5 dark:bg-white/5 shadow-sm
          ${isOwn
            ? dark ? "border-black/10" : "border-white/10"
            : dark ? "border-zinc-800" : "border-gray-200"
          }`}
        >
          <img
            src={file.data}
            alt={file.name}
            className="max-h-48 w-full object-contain cursor-pointer hover:opacity-95 transition-opacity"
            onClick={() => {
              const newTab = window.open();
              if (newTab) {
                newTab.document.write(`<img src="${file.data}" alt="${file.name}" style="max-width:100%; max-height:100vh; display:block; margin:auto;" />`);
                newTab.document.title = file.name;
              }
            }}
          />
        </div>
      )}

      {/* Caption (if any) */}
      {file.caption && (
        <p className="mt-1 text-[13.5px] leading-relaxed break-words text-left">
          {file.caption}
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helper: Countdown Widget (Shadcn-style, backward counting)
// ---------------------------------------------------------------------------
function CountdownWidget({
  secs,
  isOvertime,
  isNearEnd,
  isCreator,
  dark,
  onAddFiveMinutes,
  extendingMins,
}: {
  secs: number;
  isOvertime: boolean;
  isNearEnd: boolean;
  isCreator: boolean;
  dark: boolean;
  onAddFiveMinutes: (mins: number) => void;
  extendingMins: number | null;
}) {
  const absSecs = Math.abs(secs);
  const h = Math.floor(absSecs / 3600);
  const m = Math.floor((absSecs % 3600) / 60);
  const s = absSecs % 60;

  const pad = (num: number) => String(num).padStart(2, "0");

  const border = dark ? "border-zinc-800" : "border-gray-200";
  const bgCard = dark ? "bg-zinc-950/60" : "bg-zinc-50/60";

  let dotColor = isOvertime ? "bg-red-500" : isNearEnd ? "bg-amber-500" : "bg-emerald-500";
  let label = isOvertime ? "Overtime" : isNearEnd ? "Ending Soon" : "Remaining";

  return (
    <div className={`p-3.5 rounded-xl border ${border} ${bgCard} flex flex-col gap-3 shadow-sm transition-all`}>
      {/* Header status */}
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
          {label}
        </span>
        <span className="flex items-center gap-1.5">
          <span className={`w-1.5 h-1.5 rounded-full ${dotColor} ${!isOvertime ? "animate-pulse" : "animate-ping"}`} />
          <span className={`text-[10px] font-semibold uppercase ${isOvertime ? "text-red-400 font-bold" : "text-gray-500"}`}>
            Live
          </span>
        </span>
      </div>

      {/* Digits row */}
      <div className="flex items-center justify-center gap-1.5 select-none">
        {/* Hours */}
        <div className="flex flex-col items-center">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-mono text-[18px] font-bold border ${dark ? "bg-zinc-900 border-zinc-800 text-white" : "bg-white border-gray-250 text-gray-800"} shadow-sm`}>
            {pad(h)}
          </div>
          <span className="text-[9px] font-medium text-gray-400 dark:text-gray-500 mt-1 uppercase">h</span>
        </div>
        
        <span className="font-mono text-gray-400 dark:text-gray-600 text-[18px] font-bold -mt-3.5">:</span>

        {/* Minutes */}
        <div className="flex flex-col items-center">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-mono text-[18px] font-bold border ${dark ? "bg-zinc-900 border-zinc-800 text-white" : "bg-white border-gray-250 text-gray-800"} shadow-sm`}>
            {pad(m)}
          </div>
          <span className="text-[9px] font-medium text-gray-400 dark:text-gray-500 mt-1 uppercase">m</span>
        </div>

        <span className="font-mono text-gray-400 dark:text-gray-600 text-[18px] font-bold -mt-3.5">:</span>

        {/* Seconds */}
        <div className="flex flex-col items-center">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-mono text-[18px] font-bold border ${dark ? "bg-zinc-900 border-zinc-800 text-white" : "bg-white border-gray-250 text-gray-800"} shadow-sm`}>
            {pad(s)}
          </div>
          <span className="text-[9px] font-medium text-gray-400 dark:text-gray-500 mt-1 uppercase">s</span>
        </div>
      </div>

      {/* Creator actions */}
      {isCreator && (
        <div className="flex flex-col gap-1.5 pt-1.5 border-t border-dashed dark:border-zinc-800/80 border-gray-200">
          <p className="text-[9.5px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">Extend Session</p>
          <div className="grid grid-cols-2 gap-1.5">
            <button
              onClick={() => onAddFiveMinutes(5)}
              disabled={extendingMins !== null}
              className={`py-1.5 rounded-lg text-[11px] font-semibold border transition-all active:scale-95 flex items-center justify-center gap-1
                ${dark 
                  ? "border-zinc-800 text-zinc-300 bg-zinc-900 hover:bg-zinc-850 hover:text-white" 
                  : "border-gray-200 text-gray-700 bg-white hover:bg-gray-50 hover:text-black"}
                disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {extendingMins === 5 ? (
                <>
                  <Loader2 size={11} className="animate-spin" />
                  Adding...
                </>
              ) : (
                "+5 Min"
              )}
            </button>
            <button
              onClick={() => onAddFiveMinutes(15)}
              disabled={extendingMins !== null}
              className={`py-1.5 rounded-lg text-[11px] font-semibold border transition-all active:scale-95 flex items-center justify-center gap-1
                ${dark 
                  ? "border-zinc-800 text-zinc-300 bg-zinc-900 hover:bg-zinc-850 hover:text-white" 
                  : "border-gray-200 text-gray-700 bg-white hover:bg-gray-50 hover:text-black"}
                disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {extendingMins === 15 ? (
                <>
                  <Loader2 size={11} className="animate-spin" />
                  Adding...
                </>
              ) : (
                "+15 Min"
              )}
            </button>
          </div>
        </div>
      )}
    </div>
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
  const { userId: currentUserId, userName: currentUserName, userDetails } = useAuth() as any;
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
  const [session, setSession] = useState<StudySession | null>(() => {
    if (sessions && sessionId) {
      return (sessions as StudySession[]).find((s) => s.id === sessionId) || null;
    }
    return null;
  });
  const [loadingSession, setLoadingSession] = useState(() => !session);

  // Sync with global sessions list in case it changes
  useEffect(() => {
    if (sessions && sessionId) {
      const found = (sessions as StudySession[]).find((s) => s.id === sessionId);
      if (found) {
        setSession(found);
        setLoadingSession(false);
      }
    }
  }, [sessions, sessionId]);

  // Chat state
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [typingUsers, setTypingUsers] = useState<TypingUsers>({});
  const typingTimeouts = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // File upload state
  const [selectedFile, setSelectedFile] = useState<{
    name: string;
    type: string;
    size: number;
    data: string;
  } | null>(null);
  const [isReadingFile, setIsReadingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // UI state
  const [focusMode, setFocusMode] = useState(false);

  // Strict Focus Detection
  useEffect(() => {
    if (!focusMode) return;

    const handleFocusLost = async () => {
      toast.error("🚨 You broke your focus! Focus Mode disabled.", {
        duration: 5000,
        style: { border: '1px solid #ef4444' }, // highlight the error visually
      });
      setFocusMode(false);
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        handleFocusLost();
      }
    };

    const handleWindowBlur = () => {
      handleFocusLost();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleWindowBlur);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleWindowBlur);
    };
  }, [focusMode]);
  const [showParticipants, setShowParticipants] = useState(false); // mobile drawer
  const [isRefreshing, setIsRefreshing] = useState(false);
  // Initial messages load state — true until first sessionMessages event fires
  const [loadingMessages, setLoadingMessages] = useState(true);
  // Tracks whether the server has responded with sessionMessages at least once.
  // Using STATE (not ref) ensures it is always batched with loadingMessages + messages
  // in the same render cycle — prevents the "No messages yet" flash.
  const [hasServerResponded, setHasServerResponded] = useState(false);

  // Tracks if the room has ever had a message.
  // Initialized to false, and cached in localStorage so it persists across browser refresh.
  const [nomessageYet, setNomessageYet] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && sessionId) {
      const stored = localStorage.getItem(`nomessageYet_${sessionId}`);
      if (stored === "true") {
        setNomessageYet(true);
      }
    }
  }, [sessionId]);

  // Live session timer (seconds elapsed / seconds until start)
  const [sessionElapsed, setSessionElapsed] = useState(0);

  // Time extending state
  const [extendingMins, setExtendingMins] = useState<number | null>(null);
  const extendingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (extendingTimeoutRef.current) {
        clearTimeout(extendingTimeoutRef.current);
      }
    };
  }, []);

  // Session-ended overlay
  const [sessionEndedBy, setSessionEndedBy] = useState<string | null>(null);
  const [endCountdown, setEndCountdown] = useState(5);

  // End-session button animation state
  // 'idle' → 'confirm' (armed, countdown) → 'ending' (spinner, waiting for socket)
  const [endSessionState, setEndSessionState] = useState<'idle' | 'confirm' | 'ending'>('idle');
  const [endConfirmCountdown, setEndConfirmCountdown] = useState(3);
  const endConfirmTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Cleanup confirm timer on unmount
  useEffect(() => {
    return () => {
      if (endConfirmTimerRef.current) clearInterval(endConfirmTimerRef.current);
    };
  }, []);

  // Presence: track which participants are in the room
  const [joinedUsers, setJoinedUsers] = useState<Set<string>>(new Set());
  const [loadingPresence, setLoadingPresence] = useState(true);

  // Safety fallback for presence loading — 2s is enough for one RTT
  useEffect(() => {
    const timer = setTimeout(() => {
      setLoadingPresence(false);
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  // Safety fallback for message loading — 10s covers very slow connections.
  // In practice serverReady → sessionMessages arrives in <200ms.
  useEffect(() => {
    const timer = setTimeout(() => {
      setHasServerResponded(true); // treat timeout as a response — useLayoutEffect below will then clear loading states
    }, 10000);
    return () => clearTimeout(timer);
  }, []);

  // ── Guarantee: loading skeleton disappears ONLY after messages are in the DOM ──
  // useLayoutEffect fires synchronously after every DOM commit, before the browser paints.
  // By gating on hasServerResponded (set inside onHistory AFTER setMessages), we ensure
  // the previous render already committed the messages to the DOM before we remove the
  // skeleton — so the user never sees a blank frame between loading and messages.
  useLayoutEffect(() => {
    if (hasServerResponded) {
      setLoadingMessages(false);
      setIsRefreshing(false);
    }
  }, [hasServerResponded]);

  // Seed currentUser as joined once auth is ready (they are here = they are in the room)
  useEffect(() => {
    if (currentUserId) {
      setJoinedUsers((prev) => new Set([...prev, String(currentUserId)]));
    }
  }, [currentUserId]);

  // WebRTC Video Call state & refs
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const wasCallerRef = useRef(false);
  const startedAtRef = useRef<Date | null>(null);

  const {
    callState: vCallState,
    incomingCall,
    localStream: vLocalStream,
    remoteStream: vRemoteStream,
    call: initiate1to1Call,
    answer: answer1to1Call,
    reject: reject1to1Call,
    endCall: end1to1Call,
    toggleMic: toggleMic1to1,
    toggleCamera: toggleCam1to1,
    shareScreen: shareScreen1to1,
  } = useVideoCall({
    socket,
    localVideoRef,
    remoteVideoRef,
    userId: currentUserId || "",
  });

  const {
    callState: gCallState,
    peers,
    localStream: gLocalStream,
    joinGroupCall,
    leaveGroupCall,
    toggleMic: toggleMicGroup,
    toggleCamera: toggleCamGroup,
    shareScreen: shareScreenGroup,
  } = useGroupCall({
    socket,
    userId: currentUserId || "",
    // BUG FIX: Show a toast when a peer leaves and their video tile is removed
    onPeerLeft: (peerId) => {
      const participant = (session?.participants || []).find(
        (p) => String(p.userId || p.user?.id || "") === String(peerId)
      );
      const name = participant?.user?.name || "A participant";
      toast.info(`${name} left the call.`);
    },
  });

  // State for incoming group call invites (when another participant starts a call)
  const [incomingGroupInvite, setIncomingGroupInvite] = useState<{
    starterName: string;
    roomId: string;
    sessionId: string;
  } | null>(null);

  const participants: Participant[] = session?.participants || [];
  const isGroupCall = participants.length > 2;

  const callState = isGroupCall ? gCallState : vCallState;
  const localStream = isGroupCall ? gLocalStream : vLocalStream;
  const remoteStream = isGroupCall ? null : vRemoteStream;
  const status = callState.status;
  const startedAt = callState.startedAt;
  const isMicOn = callState.isMicOn;
  const isCamOn = callState.isCamOn;
  const isScreenSharing = callState.isScreenSharing;

  const sendSystemMessage = useCallback(async (messageText: string) => {
    if (!socket || !sessionId) return;
    
    if (encryptRef.current && e2eeRef.current?.isReady) {
      const memberIds = (session?.participants || [])
        .map((p) => String(p.userId || p.user?.id || ""))
        .filter(Boolean);
      try {
        const payload = await encryptRef.current(messageText, memberIds);
        if (payload) {
          socket.emit("sendChatMessage", { sessionId, ...payload, text: "" });
          return;
        }
      } catch (err) {
        console.warn("[E2EE] Encrypt failed on system message, falling back to plaintext:", err);
      }
    }
    socket.emit("sendChatMessage", { sessionId, text: messageText });
  }, [socket, sessionId, session?.participants]);

  const handleToggleMic = () => {
    if (isGroupCall) {
      toggleMicGroup();
    } else {
      toggleMic1to1();
    }
  };

  const handleToggleCam = () => {
    if (isGroupCall) {
      toggleCamGroup();
    } else {
      toggleCam1to1();
    }
  };

  const handleToggleScreen = () => {
    if (isGroupCall) {
      shareScreenGroup();
    } else {
      shareScreen1to1();
    }
  };

  const handleEndCall = useCallback(() => {
    if (isGroupCall) {
      leaveGroupCall();
    } else {
      end1to1Call();
    }
  }, [isGroupCall, leaveGroupCall, end1to1Call]);

  const handleCallButtonClick = () => {
    if (isGroupCall) {
      wasCallerRef.current = true;
      // Dismiss any pending group invite (they started it)
      setIncomingGroupInvite(null);
      joinGroupCall(sessionId, sessionId);
    } else {
      const otherPart = participants.find(
        (p) => String(p.userId || p.user?.id || "") !== String(currentUserId)
      );
      const targetId = otherPart?.userId || otherPart?.user?.id;
      if (targetId) {
        wasCallerRef.current = true;
        initiate1to1Call(targetId);
      } else {
        toast.error("No other participants to call.");
      }
    }
  };

  // Monitor call status changes for system message logging
  useEffect(() => {
    if (status === "connected") {
      if (!startedAtRef.current) {
        startedAtRef.current = startedAt || new Date();
        if (wasCallerRef.current) {
          sendSystemMessage(`[SYSTEM]:📹 Video call started by ${currentUserName}`);
        }
      }
    } else if (status === "ended") {
      if (startedAtRef.current) {
        const durationStr = getCallDurationString(startedAtRef.current);
        startedAtRef.current = null;
        if (wasCallerRef.current) {
          sendSystemMessage(`[SYSTEM]:📹 Call ended · ${durationStr}`);
          wasCallerRef.current = false;
        }
      }
    }
  }, [status, currentUserName, sendSystemMessage, startedAt]);

  // ---------------------------------------------------------------------------
  // Listen for group call invites from other participants
  // ---------------------------------------------------------------------------
  // Use a ref to avoid stale closure — the listener is registered once and always
  // reads the latest gCallState without needing to re-bind on every status change.
  const gCallStatusRef = useRef(gCallState.status);
  useEffect(() => {
    gCallStatusRef.current = gCallState.status;
  }, [gCallState.status]);

  useEffect(() => {
    if (!socket) return;

    const handleGroupCallStarted = ({
      starterName,
      roomId,
      sessionId: inviteSessionId,
    }: {
      startedBy: string;
      starterName: string;
      roomId: string;
      sessionId: string;
    }) => {
      console.log("[room:call-started] received", { starterName, roomId, inviteSessionId, currentStatus: gCallStatusRef.current });
      // Only show invite if this user isn't already in the call
      if (gCallStatusRef.current !== "idle" && gCallStatusRef.current !== "ended") {
        console.log("[room:call-started] ignored — already in call, status:", gCallStatusRef.current);
        return;
      }
      setIncomingGroupInvite({ starterName, roomId, sessionId: inviteSessionId });
    };

    socket.on("room:call-started", handleGroupCallStarted);
    return () => {
      socket.off("room:call-started", handleGroupCallStarted);
    };
  // Only re-bind when the socket instance changes — not on every status change
  }, [socket]);

  // ---------------------------------------------------------------------------
  // File upload handlers
  // ---------------------------------------------------------------------------
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Limit file size to 10MB to avoid hitting socket/database limits
    const maxSizeBytes = 10 * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      toast.error("File is too large. Maximum size allowed is 10MB.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setIsReadingFile(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setSelectedFile({
        name: file.name,
        type: file.type,
        size: file.size,
        data: dataUrl,
      });
      setIsReadingFile(false);
    };
    reader.onerror = () => {
      toast.error("Failed to read file.");
      setIsReadingFile(false);
    };
    reader.readAsDataURL(file);
  };

  const handleCancelFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

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
    if (endSessionState === 'idle') {
      // First click: arm the button, start 3s confirm countdown
      setEndSessionState('confirm');
      setEndConfirmCountdown(3);
      if (endConfirmTimerRef.current) clearInterval(endConfirmTimerRef.current);
      endConfirmTimerRef.current = setInterval(() => {
        setEndConfirmCountdown((prev) => {
          if (prev <= 1) {
            // Time expired — disarm
            clearInterval(endConfirmTimerRef.current!);
            endConfirmTimerRef.current = null;
            setEndSessionState('idle');
            return 3;
          }
          return prev - 1;
        });
      }, 1000);
    } else if (endSessionState === 'confirm') {
      // Second click: confirm — fire the event
      if (endConfirmTimerRef.current) {
        clearInterval(endConfirmTimerRef.current);
        endConfirmTimerRef.current = null;
      }
      setEndSessionState('ending');
      if (socket && sessionId) {
        socket.emit("endSession", { sessionId });
        // Don't navigate immediately — wait for sessionEnded event so the
        // admin also sees the same overlay as every other participant.
      }
    }
    // 'ending' state: button is disabled, nothing to do
  };

  const handleExtendSession = (extraMinutes: number) => {
    if (socket && sessionId) {
      setExtendingMins(extraMinutes);
      if (extendingTimeoutRef.current) clearTimeout(extendingTimeoutRef.current);
      extendingTimeoutRef.current = setTimeout(() => {
        setExtendingMins(null);
      }, 5000);
      socket.emit("extendSession", { sessionId, extraMinutes });
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
        const res = await API.get(`/study-session/${sessionId}`, {
          signal: controller.signal,
        });
        setSession(res.data || null);
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

  // Track previous message count for history vs live messages scroll timing
  const prevMessagesLength = useRef(0);

  // Declarative scroll-to-bottom on layout change or messages change
  useEffect(() => {
    if (loadingSession) return;
    if (messages.length === 0) return;

    const isNewMessage = messages.length > prevMessagesLength.current;
    // Large jump in message length signifies history load, 1 signifies single new message
    const isHistory = messages.length - prevMessagesLength.current > 1 || prevMessagesLength.current === 0;
    const smooth = isNewMessage && !isHistory;

    // Scroll immediately
    scrollToBottom(smooth);

    // Re-trigger scroll after short delays to ensure DOM has fully painted the new node heights
    const t1 = setTimeout(() => scrollToBottom(smooth), 50);
    const t2 = setTimeout(() => scrollToBottom(smooth), 150);

    prevMessagesLength.current = messages.length;

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [messages, loadingSession, scrollToBottom]);

  // ---------------------------------------------------------------------------
  // Mobile keyboard: re-scroll to bottom when the visual viewport shrinks
  // (i.e. when the on-screen keyboard pops up or dismisses on a phone).
  // `visualViewport` is the correct API — `window.resize` does NOT fire on
  // keyboard open in most mobile browsers.
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (typeof window === 'undefined' || !window.visualViewport) return;

    const handleViewportResize = () => {
      // Small timeout gives the browser a frame to repaint the shrunken layout
      // before we scroll, so we land exactly at the last message.
      setTimeout(() => scrollToBottom(false), 50);
    };

    window.visualViewport.addEventListener('resize', handleViewportResize);
    return () => {
      window.visualViewport!.removeEventListener('resize', handleViewportResize);
    };
  }, [scrollToBottom]);


  // ---------------------------------------------------------------------------
  // Re-join/Initialize room — can be called on mount, reconnect, or manually via Refresh
  // ---------------------------------------------------------------------------
  const doJoin = useCallback(() => {
    if (!socket || !sessionId) return;

    // Show skeleton immediately — hides any "No messages yet" flash while waiting
    setLoadingMessages(true);
    setHasServerResponded(false); // hide empty state until server confirms

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

    // Announce our ECDH public key to the session room so peers can send us
    // the current room key (Sender Key distribution)
    const currentE2ee = e2eeRef.current;
    if (currentE2ee?.isReady && currentE2ee.announcePublicKey) {
      setTimeout(() => currentE2ee.announcePublicKey(sessionId), 400);
    }
  }, [socket, sessionId]);

  // Manual refresh handler — shows the overlay spinner until messages event fires
  const handleRefresh = () => {
    setIsRefreshing(true);
    // doJoin will set loadingMessages=true (shows skeleton under the overlay)
    doJoin();
    // Safety fallback: clear after 8s in case server never responds
    setTimeout(() => setIsRefreshing(false), 8000);
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

      // ── Commit messages + signal server responded ──
      // loadingMessages and isRefreshing are intentionally NOT cleared here.
      // They are cleared by the useLayoutEffect below, which fires synchronously
      // AFTER this render's DOM commit — guaranteeing messages are in the DOM
      // before the skeleton disappears (no blank-frame flash).
      setMessages(msgs);
      setHasServerResponded(true);

      if (msgs.length > 0) {
        setNomessageYet(true);
        if (typeof window !== "undefined") {
          localStorage.setItem(`nomessageYet_${sessionId}`, "true");
        }
      }
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
      setNomessageYet(true);
      if (typeof window !== "undefined") {
        localStorage.setItem(`nomessageYet_${sessionId}`, "true");
      }
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

    const onSessionJoined = (data: { sessionId: string; activeUserIds?: string[] }) => {
      if (data.sessionId !== sessionId) return;
      const ids = data.activeUserIds || [];
      if (ids.length > 0) {
        setJoinedUsers((prev) => new Set([...prev, ...ids]));
      }
      setLoadingPresence(false);
    };

    // Presence snapshot: seed joinedUsers from server's in-memory activeSessions
    const onActiveParticipants = (data: { sessionId: string; userIds: string[] }) => {
      if (data.sessionId !== sessionId) return;
      setJoinedUsers((prev) => new Set([...prev, ...data.userIds]));
      setLoadingPresence(false);
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
      if (typeof window !== "undefined") {
        localStorage.removeItem(`nomessageYet_${sessionId}`);
      }
      setSessionEndedBy(data.endedBy || "The host");
      setEndCountdown(5);
    };

    const onSessionExtended = (data: { sessionId: string; duration: number; extraMinutes: number; extendedBy?: string }) => {
      if (data.sessionId !== sessionId) return;
      setSession((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          duration: data.duration,
        };
      });
      setExtendingMins(null);
      if (extendingTimeoutRef.current) clearTimeout(extendingTimeoutRef.current);
      // Reset the auto-ended ref since the duration was extended
      hasAutoEndedRef.current = false;
      toast.success(`Session extended by ${data.extraMinutes} minutes by ${data.extendedBy || "the host"}!`);
    };

    const onSessionError = (data: { message: string }) => {
      setExtendingMins(null);
      if (extendingTimeoutRef.current) clearTimeout(extendingTimeoutRef.current);
      toast.error(data.message);
    };

    // Register all listeners before emitting anything
    socket.on("sessionMessages", onHistory);
    socket.on("newChatMessage", onNew);
    socket.on("userTyping", onTyping);
    socket.on("chatError", onError);
    socket.on("sessionJoined", onSessionJoined);
    socket.on("activeParticipants", onActiveParticipants);
    socket.on("userLeftSession", onUserLeft);
    socket.on("userJoinedSession", onUserJoined);
    socket.on("participantAccepted", onParticipantAccepted);
    socket.on("participantDeclined", onParticipantDeclined);
    socket.on("sessionEnded", onSessionEnded);
    socket.on("sessionExtended", onSessionExtended);
    socket.on("sessionError", onSessionError);

    // ── Join strategy: avoid the race condition ──
    //
    // PROBLEM: On a browser refresh, the socket reconnects and immediately calls doJoin().
    // But the server's io.on('connection') handler is async (Firebase auth + DB lookup),
    // so 'joinSession' arrives BEFORE registerSessionHandlers() is called — the event
    // is silently dropped by socket.io and sessionMessages is never sent.
    //
    // FIX: The server emits 'serverReady' after ALL handlers are registered.
    // We wait for that before calling doJoin().
    //
    // NAVIGATION case (socket already connected): serverReady already fired for this
    // socket, so we call doJoin() immediately.
    //
    // REFRESH / FIRST LOAD case (socket not yet connected): doJoin() is called when
    // 'serverReady' arrives — guaranteed to be after handlers are registered.

    const onServerReady = () => {
      doJoin();
    };

    socket.on("serverReady", onServerReady);

    if ((socket as any).serverReady) {
      // Server is already fully ready (e.g., navigated here from another page)
      doJoin();
    }
    // else: doJoin() will be called by onServerReady when the server finishes async auth

    const timeouts = typingTimeouts.current;
    return () => {
      socket.off("serverReady", onServerReady);
      socket.off("sessionMessages", onHistory);
      socket.off("newChatMessage", onNew);
      socket.off("userTyping", onTyping);
      socket.off("chatError", onError);
      socket.off("sessionJoined", onSessionJoined);
      socket.off("activeParticipants", onActiveParticipants);
      socket.off("userLeftSession", onUserLeft);
      socket.off("userJoinedSession", onUserJoined);
      socket.off("participantAccepted", onParticipantAccepted);
      socket.off("participantDeclined", onParticipantDeclined);
      socket.off("sessionEnded", onSessionEnded);
      socket.off("sessionExtended", onSessionExtended);
      socket.off("sessionError", onSessionError);
      Object.values(timeouts).forEach(clearTimeout);
    };
  }, [socket, sessionId, router, scrollToBottom, doJoin]);

  // ---------------------------------------------------------------------------
  // Send message
  // ---------------------------------------------------------------------------
  const disabled = !socket || session?.status !== "in_progress";

  const send = async () => {
    if ((!text.trim() && !selectedFile) || disabled || !socket) return;
    const trimmed = text.trim();
    
    // Clear input/file states immediately
    setText("");
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    
    setNomessageYet(true);
    if (typeof window !== "undefined") {
      localStorage.setItem(`nomessageYet_${sessionId}`, "true");
    }
    
    socket.emit("typing", { sessionId, isTyping: false });
    inputRef.current?.focus();

    let messageBody = trimmed;

    if (selectedFile) {
      const filePayload = JSON.stringify({
        name: selectedFile.name,
        type: selectedFile.type,
        size: selectedFile.size,
        data: selectedFile.data,
        caption: trimmed
      });
      messageBody = `[FILE_SHARE]:${filePayload}`;
    }

    // Try E2EE encryption first
    if (encryptRef.current && e2ee?.isReady) {
      const memberIds = (session?.participants || [])
        .map((p) => String(p.userId || p.user?.id || ""))
        .filter(Boolean);
      try {
        const payload = await encryptRef.current(messageBody, memberIds);
        if (payload) {
          socket.emit("sendChatMessage", { sessionId, ...payload, text: "" });
          return;
        }
      } catch (err) {
        console.warn("[E2EE] Encrypt failed, falling back to plaintext:", err);
      }
    }

    // Fallback: plaintext (E2EE not yet ready or context unavailable)
    socket.emit("sendChatMessage", { sessionId, text: messageBody });
  };

  const handleTyping = (val: string) => {
    setText(val);
    if (socket) socket.emit("typing", { sessionId, isTyping: !!val });
  };

  // ---------------------------------------------------------------------------
  // Derived values
  // ---------------------------------------------------------------------------
  const typingNames = Object.values(typingUsers).filter(Boolean) as string[];



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
  // Overtime + near-end derived values (recalculated every second via sessionElapsed)
  // ---------------------------------------------------------------------------
  const sessionDurationSecs = (session?.duration ?? 0) * 60;
  // How many seconds remain (negative = overtime)
  const remainingSecs = sessionDurationSecs > 0 ? sessionDurationSecs - sessionElapsed : Infinity;
  const isNearEnd = isLive && remainingSecs > 0 && remainingSecs <= 5 * 60; // last 5 min
  const isOvertime = isLive && sessionDurationSecs > 0 && sessionElapsed >= sessionDurationSecs;
  const overtimeSecs = isOvertime ? sessionElapsed - sessionDurationSecs : 0;

  // ---------------------------------------------------------------------------
  // Live session elapsed timer
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!session) return;
    const tick = () => {
      if (session.status === "in_progress" && session.actualStartTime) {
        setSessionElapsed(Math.floor((Date.now() - new Date(session.actualStartTime).getTime()) / 1000));
      } else if (session.status === "scheduled") {
        const diff = Math.floor((new Date(session.startAt).getTime() - Date.now()) / 1000);
        setSessionElapsed(diff > 0 ? -diff : 0); // negative = countdown
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [session]);

  // Format seconds → "1h 23m 45s" or "23m 45s" or "45s"
  const formatElapsed = (secs: number) => {
    const abs = Math.abs(secs);
    const h = Math.floor(abs / 3600);
    const m = Math.floor((abs % 3600) / 60);
    const s = abs % 60;
    if (h > 0) return `${h}h ${String(m).padStart(2, "0")}m ${String(s).padStart(2, "0")}s`;
    if (m > 0) return `${m}m ${String(s).padStart(2, "0")}s`;
    return `${s}s`;
  };

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
  // Auto-end session when duration exceeded (creator only, fires once)
  // ---------------------------------------------------------------------------
  const hasAutoEndedRef = useRef(false);
  useEffect(() => {
    if (!isOvertime) return;
    if (hasAutoEndedRef.current) return;
    // Only the creator auto-ends — others just see the banner
    if (String(session?.creatorId) !== String(currentUserId)) return;
    hasAutoEndedRef.current = true;
    if (socket && sessionId) {
      socket.emit("endSession", { sessionId });
    }
  }, [isOvertime, session?.creatorId, currentUserId, socket, sessionId]);

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
      className={`h-[100dvh] flex flex-col overflow-hidden transition-colors duration-300 ${bg} ${dark ? "text-white" : "text-gray-900"}`}
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
              <span className="hidden sm:inline-flex shrink-0 items-center gap-1 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border border-green-500/30 text-green-500 bg-green-500/8">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                Live
              </span>
            )}
            {isScheduled && (
              <span className={`hidden sm:inline-flex shrink-0 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded border ${border} ${muted}`}>
                Scheduled
              </span>
            )}
          </div>
        </div>

        {/* Right: Controls */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Participants Logo with Overlapping Count Badge */}
          <button
            onClick={() => setShowParticipants((p) => !p)}
            className={`relative p-2 rounded-lg border transition-all active:scale-95 flex items-center justify-center shrink-0
              ${dark ? "border-gray-800 text-gray-350 hover:bg-gray-900 hover:text-white bg-zinc-950/40" : "border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-black bg-zinc-50/40"}`}
            aria-label="Toggle participants panel"
          >
            <Users size={15} />
            {participants.length > 0 && (
              <span className="absolute -top-1.5 -right-1.5 px-1 py-0.5 min-w-[18px] h-[18px] rounded-full bg-red-500 text-white font-mono font-bold text-[10.5px] flex items-center justify-center shadow-sm select-none animate-in zoom-in duration-350">
                {participants.length}
              </span>
            )}
          </button>

          {/* Refresh Button — icon-only on mobile */}
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className={`flex md:hidden items-center justify-center p-2 rounded-lg border transition-all active:scale-95 shrink-0
              ${dark ? "border-gray-800 text-gray-300 hover:bg-gray-900 bg-zinc-950/40" : "border-gray-200 text-gray-600 hover:bg-gray-50 bg-zinc-50/40"}
              disabled:opacity-60 disabled:cursor-not-allowed`}
            aria-label="Refresh chat connection"
          >
            <RefreshCw size={14} className={isRefreshing ? "animate-spin" : ""} />
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

          {/* Call Button */}
          {isLive && (
            <CallButton
              onClick={handleCallButtonClick}
              disabled={callState.status !== 'idle' && callState.status !== 'ended'}
              tooltipText={(callState.status !== 'idle' && callState.status !== 'ended') ? 'Call in progress' : undefined}
              dark={dark}
            />
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
          <div className={`px-4 py-3.5 border-b ${border} shrink-0 space-y-2`}>
            {/* Participants count */}
            <div className="flex items-center justify-between">
              <p className={`text-[10px] uppercase tracking-widest font-semibold ${muted}`}>Participants</p>
              <div className="relative mr-2 flex items-center justify-center select-none">
                <Users size={14} className={muted} />
                {participants.length > 0 && (
                  <span className="absolute -top-2 -right-2.5 px-1 py-0.5 min-w-[16px] h-[16px] rounded-full bg-red-500 text-white font-mono font-bold text-[9.5px] flex items-center justify-center shadow-sm animate-in zoom-in duration-300">
                    {participants.length}
                  </span>
                )}
              </div>
            </div>

            {/* Live session timer */}
            {isLive && session?.actualStartTime && (
              <CountdownWidget
                secs={isOvertime ? overtimeSecs : remainingSecs}
                isOvertime={isOvertime}
                isNearEnd={isNearEnd}
                isCreator={String(session.creatorId) === String(currentUserId)}
                dark={dark}
                onAddFiveMinutes={handleExtendSession}
                extendingMins={extendingMins}
              />
            )}
            {isScheduled && (
              <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg ${dark ? "bg-yellow-500/10 text-yellow-400" : "bg-yellow-50 text-yellow-600"}`}>
                <span className="text-[11px] font-mono font-semibold tracking-tight">Starts in {formatElapsed(sessionElapsed)}</span>
              </div>
            )}

            {/* E2EE status */}
            <div className={`flex items-center gap-1 ${e2ee?.isReady ? (dark ? "text-emerald-400" : "text-emerald-600") : (dark ? "text-gray-600" : "text-gray-400")}`}>
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
              const isChecking = loadingPresence && !isMe;

              // Dot color priority: checking → pulsing indigo, in-room → green, accepted → yellow, else gray
              const dotColor = isChecking
                ? "bg-indigo-400 animate-pulse"
                : isInRoom
                ? "bg-green-500"
                : p.status === "accepted" || p.status === "joined"
                ? "bg-yellow-400"
                : "bg-gray-400";

              // Status label
              const statusLabel = isChecking
                ? "Checking..."
                : isInRoom
                ? "Active"
                : p.status === "accepted" || p.status === "joined"
                ? "Joined"
                : p.status;

              const isCreator = String(pId) === String(session?.creatorId);

              return (
                <div
                  key={p.id}
                  className={`flex items-center gap-3 px-4 py-3 mx-2 my-0.5 rounded-xl transition-colors
                    ${dark ? "hover:bg-gray-900/70" : "hover:bg-gray-50"}`}
                >
                  {/* Avatar with presence ring */}
                  <div className="relative shrink-0">
                    {p.user?.avatarUrl ? (
                      <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 border border-gray-200 dark:border-gray-800 shadow-sm">
                        <img src={p.user.avatarUrl} alt={pName} className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-[12px] select-none
                        ${isInRoom
                          ? dark ? "bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/40" : "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-400/50"
                          : dark ? "bg-gray-800 text-gray-300" : "bg-gray-100 text-gray-600"
                        }`}>
                        {pName.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <span
                      className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 transition-colors duration-500 ${dark ? "border-[#0a0a0a]" : "border-white"} ${dotColor}`}
                    />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className={`text-[12.5px] font-semibold truncate ${
                        isMe
                          ? (dark ? "text-white" : "text-gray-900")
                          : (dark ? "text-gray-200" : "text-gray-800")
                      }`}>
                        {isMe ? "You" : pName}
                      </p>
                      {isCreator && (
                        <span title="Session creator" className="text-[11px] leading-none">👑</span>
                      )}
                      {isMe && !isCreator && (
                        <span className={`text-[9px] px-1 py-0.5 rounded font-semibold uppercase tracking-wide border ${dark ? "border-gray-700 text-gray-500" : "border-gray-200 text-gray-400"}`}>
                          me
                        </span>
                      )}
                    </div>

                    {isTypingNow ? (
                      <p className={`text-[10.5px] ${dark ? "text-indigo-400" : "text-indigo-500"} flex items-center gap-0.5`}>
                        typing <TypingDots />
                      </p>
                    ) : (
                      <p className={`text-[10.5px] capitalize ${
                        isInRoom
                          ? dark ? "text-emerald-400" : "text-emerald-600"
                          : muted
                      }`}>
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
                disabled={endSessionState === 'ending'}
                className={`w-full flex items-center justify-center gap-2 py-2 mb-2 rounded-lg text-[12.5px] font-semibold border transition-all active:scale-95
                  ${
                    endSessionState === 'ending'
                      ? 'border-red-500/60 text-red-400 bg-red-500/15 cursor-not-allowed opacity-80'
                      : endSessionState === 'confirm'
                      ? 'border-red-500 text-white bg-red-500 hover:bg-red-600 animate-pulse shadow-lg shadow-red-500/30'
                      : 'border-red-500/40 text-red-500 bg-red-500/8 hover:bg-red-500/15'
                  }`}
              >
                {endSessionState === 'ending' ? (
                  <>
                    <Loader2 size={13} className="animate-spin" />
                    Ending…
                  </>
                ) : endSessionState === 'confirm' ? (
                  <>
                    <StopCircle size={13} />
                    Confirm End? ({endConfirmCountdown}s)
                  </>
                ) : (
                  <>
                    <StopCircle size={13} />
                    End Session
                  </>
                )}
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

              {/* Mobile Countdown Widget */}
              {isLive && session?.actualStartTime && (
                <div className="px-4 py-3 border-b border-gray-200 dark:border-zinc-800">
                  <CountdownWidget
                    secs={isOvertime ? overtimeSecs : remainingSecs}
                    isOvertime={isOvertime}
                    isNearEnd={isNearEnd}
                    isCreator={String(session.creatorId) === String(currentUserId)}
                    dark={dark}
                    onAddFiveMinutes={handleExtendSession}
                    extendingMins={extendingMins}
                  />
                </div>
              )}
              {sortedParticipants.map((p) => {
                const pId = String(p.userId || p.user?.id || "");
                const isMe = pId === String(currentUserId);
                const pName = p.user?.name || (isMe ? (currentUserName || "You") : "Unknown");
                const isTypingNow = !!typingUsers[pId];

                const isInRoom = joinedUsers.has(pId);
                const isChecking = loadingPresence && !isMe;

                const dotColor = isChecking
                  ? "bg-indigo-400 animate-pulse"
                  : isInRoom
                  ? "bg-green-500"
                  : p.status === "accepted" || p.status === "joined"
                  ? "bg-yellow-400"
                  : "bg-gray-400";

                const statusLabel = isChecking
                  ? "Checking..."
                  : isInRoom
                  ? "Active"
                  : p.status === "accepted" || p.status === "joined"
                  ? "Joined"
                  : p.status;

                return (
                  <div key={p.id} className={`flex items-center gap-2.5 px-4 py-3`}>
                    <div className="relative shrink-0">
                      <Avatar name={pName} avatarUrl={p.user?.avatarUrl} size="sm" dark={dark} />
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
            className="flex-1 overflow-y-auto px-4 py-5 space-y-4 relative"
          >
            {/* Manual refresh overlay — shown while re-fetching after user clicks refresh */}
            {isRefreshing && (
              <div className={`absolute inset-0 z-10 flex flex-col items-center justify-center gap-3
                ${dark ? "bg-black/70" : "bg-white/80"} backdrop-blur-[2px] transition-all`}>
                <Loader2 size={22} className={`animate-spin ${dark ? "text-gray-400" : "text-gray-500"}`} />
                <p className={`text-[12.5px] font-medium ${dark ? "text-gray-400" : "text-gray-500"}`}>Loading messages…</p>
              </div>
            )}

            {/* Initial join loading skeleton — shown until first sessionMessages event arrives.
                Also shown when nomessageYet=true (localStorage confirms messages existed) but
                messages array is still empty — keeps skeleton visible until messages arrive
                instead of flashing a blank white screen. */}
            {(loadingMessages || (nomessageYet && messages.length === 0)) && !isRefreshing ? (
              <div className="flex flex-col gap-5 pt-4 animate-in fade-in duration-300">
                {/* Skeleton message rows — alternating own/other to mimic real chat layout */}
                {["other", "other", "own", "other", "own"].map((side, i) => (
                  <div key={i} className={`flex gap-2.5 ${side === "own" ? "flex-row-reverse" : "flex-row"}`}>
                    <div className={`w-7 h-7 rounded-full shrink-0 animate-pulse ${dark ? "bg-zinc-800" : "bg-gray-200"}`} />
                    <div className={`flex flex-col gap-1.5 ${side === "own" ? "items-end" : "items-start"}`}>
                      <div className={`h-2.5 w-16 rounded-full animate-pulse ${dark ? "bg-zinc-800" : "bg-gray-200"}`} />
                      <div
                        className={`h-9 rounded-2xl animate-pulse ${dark ? "bg-zinc-800/80" : "bg-gray-150"}`}
                        style={{ width: `${120 + (i * 37) % 80}px` }}
                      />
                      {i % 2 === 0 && (
                        <div
                          className={`h-7 rounded-2xl animate-pulse ${dark ? "bg-zinc-800/60" : "bg-gray-100"}`}
                          style={{ width: `${80 + (i * 23) % 60}px` }}
                        />
                      )}
                    </div>
                  </div>
                ))}
                <div className={`flex items-center justify-center gap-2 mt-4`}>
                  <Loader2 size={13} className={`animate-spin ${muted}`} />
                  <span className={`text-[11.5px] ${muted}`}>Loading chat history…</span>
                </div>
              </div>
            ) : messages.length === 0 && !isRefreshing && hasServerResponded && !nomessageYet ? (
              <div className="flex flex-col items-center justify-center h-full gap-5 text-center py-16">
                {/* Minimal SVG speech-bubble illustration */}
                <div className={dark ? "text-gray-700" : "text-gray-300"}>
                  <svg width="72" height="64" viewBox="0 0 72 64" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                    {/* Back bubble */}
                    <rect x="20" y="8" width="46" height="32" rx="10" stroke="currentColor" strokeWidth="1.8" />
                    <path d="M52 40 L58 50 L44 40" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
                    {/* Front bubble */}
                    <rect x="6" y="20" width="40" height="28" rx="9" stroke="currentColor" strokeWidth="1.8"
                      className={dark ? "fill-black" : "fill-white"} />
                    <path d="M16 48 L10 58 L26 48" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"
                      className={dark ? "fill-black" : "fill-white"} />
                    {/* Dots inside front bubble */}
                    <circle cx="18" cy="34" r="2.2" fill="currentColor" opacity="0.5" />
                    <circle cx="26" cy="34" r="2.2" fill="currentColor" opacity="0.5" />
                    <circle cx="34" cy="34" r="2.2" fill="currentColor" opacity="0.5" />
                  </svg>
                </div>
                <div className="flex flex-col gap-1.5">
                  <p className={`text-[14.5px] font-semibold tracking-tight ${dark ? "text-gray-200" : "text-gray-800"}`}>
                    {isLive ? "No messages yet" : "Chat starts when session goes live"}
                  </p>
                  <p className={`text-[12.5px] ${muted}`}>
                    {isLive
                      ? "Say hello to kick things off! 👋"
                      : "Hang tight until the session begins…"}
                  </p>
                  {isLive && (
                    <button
                      onClick={handleRefresh}
                      className={`mt-2 self-center flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11.5px] font-medium border transition-all active:scale-95
                        ${dark ? "border-gray-800 text-gray-400 hover:bg-gray-900 hover:text-gray-200" : "border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-800"}`}
                    >
                      <RefreshCw size={11} className={isRefreshing ? "animate-spin" : ""} />
                      Refresh chat
                    </button>
                  )}
                </div>
              </div>
            ) : (
              messages.map((m, index) => {
                if (m.text?.startsWith("[SYSTEM]:")) {
                  const systemText = m.text.substring(9);
                  return (
                    <div
                      key={m.id || m._id || index}
                      className="flex justify-center w-full my-2 animate-in fade-in duration-300"
                    >
                      <div className={`px-4 py-1.5 rounded-full text-[11px] font-semibold border select-none
                        ${dark 
                          ? "bg-zinc-900/50 border-zinc-800 text-zinc-400 shadow-sm" 
                          : "bg-zinc-50 border-zinc-200 text-zinc-500 shadow-sm"
                        }`}
                      >
                        {systemText}
                      </div>
                    </div>
                  );
                }

                const isOwn = String(m.userId) === String(currentUserId);
                const prevMsg = index > 0 ? messages[index - 1] : null;
                const showSender = !prevMsg || prevMsg.userId !== m.userId;

                const avatarUrlToRender = m.avatarUrl || (isOwn 
                  ? (userDetails?.avatarUrl || auth.currentUser?.photoURL || undefined) 
                  : (session?.participants?.find((p) => String(p.userId || p.user?.id) === String(m.userId))?.user?.avatarUrl || undefined));

                return (
                  <div
                    key={m.id || m._id || index}
                    className={`flex gap-2.5 ${isOwn ? "flex-row-reverse" : "flex-row"}`}
                  >
                    {/* Avatar — only on first message in a group */}
                    <div className="shrink-0 mt-0.5">
                      {showSender ? (
                        <Avatar name={m.name || "?"} avatarUrl={avatarUrlToRender} size="sm" dark={dark} />
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
                          if (t?.startsWith("[FILE_SHARE]:")) {
                            try {
                              const fileInfo = JSON.parse(t.substring(13));
                              return (
                                <FileMessageBubble
                                  file={fileInfo}
                                  isOwn={isOwn}
                                  dark={dark}
                                />
                              );
                            } catch (e) {
                              return <span className="text-red-500">Corrupted file message</span>;
                            }
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
            {/* Socket reconnecting notice — shown when connection drops */}
            {!socket?.connected && (
              <div className={`flex items-center gap-2 mb-2 px-3 py-1.5 rounded-lg text-[11.5px] font-medium
                ${dark ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" : "bg-amber-50 text-amber-600 border border-amber-200"}`}>
                <Loader2 size={11} className="animate-spin shrink-0" />
                Reconnecting to session… messages will load automatically.
              </div>
            )}
            {!isLive && socket?.connected && (
              <p className={`text-[11.5px] text-center ${muted} mb-2`}>
                {isScheduled
                  ? "Chat is available once the session starts"
                  : "This session has ended"}
              </p>
            )}


            {/* Selected File Preview Card */}
            {selectedFile && (
              <div className={`p-2 mb-2 rounded-xl border ${border} flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-900/50 animate-in slide-in-from-bottom-2 duration-200`}>
                <div className="flex items-center gap-2 min-w-0">
                  <div className={`p-2 rounded-lg ${dark ? "bg-zinc-800 text-zinc-300" : "bg-gray-150 text-gray-600"}`}>
                    {selectedFile.type.startsWith("image/") ? (
                      <ImageIcon size={16} />
                    ) : (
                      <FileText size={16} />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[12px] font-semibold truncate max-w-[200px] sm:max-w-xs">{selectedFile.name}</p>
                    <p className={`text-[10px] ${muted}`}>{formatFileSize(selectedFile.size)}</p>
                  </div>
                </div>
                <button
                  onClick={handleCancelFile}
                  className={`p-1.5 rounded-lg hover:bg-red-500/10 hover:text-red-500 transition-colors ${muted}`}
                  aria-label="Remove selected file"
                >
                  <X size={14} />
                </button>
              </div>
            )}

            <div className="flex gap-2 items-end">
              {/* Hidden File Input */}
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                className="hidden"
                disabled={disabled || isReadingFile}
              />
              
              {/* Attachment Button */}
              <button
                type="button"
                disabled={disabled || isReadingFile}
                onClick={() => fileInputRef.current?.click()}
                className={`p-2.5 rounded-xl border transition-all active:scale-95 flex items-center justify-center shrink-0
                  ${dark 
                    ? "border-gray-800 text-gray-350 hover:bg-gray-900 hover:text-white bg-zinc-950/40" 
                    : "border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-black bg-zinc-50/40"}
                  disabled:opacity-40 disabled:cursor-not-allowed`}
                title="Attach a file (Max 10MB)"
                aria-label="Attach file"
              >
                {isReadingFile ? (
                  <Loader2 size={15} className="animate-spin text-gray-400" />
                ) : (
                  <Paperclip size={15} />
                )}
              </button>

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
                onFocus={() => {
                  // When the user taps the input on mobile, the keyboard is about to
                  // open. Scroll to the very bottom so the most recent messages are
                  // visible right above the keyboard instead of being hidden behind it.
                  setTimeout(() => scrollToBottom(false), 100);
                }}
                placeholder={
                  disabled
                    ? "Chat available when session is live…"
                    : selectedFile
                      ? "Add a caption..."
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
                disabled={disabled || (!text.trim() && !selectedFile) || isReadingFile}
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

      {/* WebRTC Video Call Overlay & Toast components */}
      {incomingCall && (
        <IncomingCallToast
          callerName={incomingCall.callerName}
          onAccept={() => {
            wasCallerRef.current = false;
            answer1to1Call(incomingCall.callerId, incomingCall.offer);
          }}
          onReject={() => {
            reject1to1Call(incomingCall.callerId);
          }}
          dark={dark}
        />
      )}

      {/* Group call invite — shown when another participant starts a group call */}
      {incomingGroupInvite && (gCallState.status === "idle" || gCallState.status === "ended") && (
        <IncomingCallToast
          callerName={incomingGroupInvite.starterName}
          subtitle="Group video call · tap to join"
          onAccept={() => {
            wasCallerRef.current = false;
            setIncomingGroupInvite(null);
            joinGroupCall(incomingGroupInvite.roomId, incomingGroupInvite.sessionId);
          }}
          onReject={() => {
            setIncomingGroupInvite(null);
          }}
          dark={dark}
        />
      )}

      <CallOverlay
        isOpen={callState.status === "calling" || callState.status === "connected"}
        isGroup={isGroupCall}
        status={callState.status}
        startedAt={callState.startedAt}
        localStream={localStream}
        remoteStream={remoteStream}
        peers={peers}
        participants={participants}
        currentUserId={currentUserId || ""}
        isMicOn={isMicOn}
        isCamOn={isCamOn}
        isScreenSharing={isScreenSharing}
        onToggleMic={handleToggleMic}
        onToggleCam={handleToggleCam}
        onToggleScreen={handleToggleScreen}
        onEndCall={handleEndCall}
        peerName={
          isGroupCall
            ? undefined
            : participants.find(
                (p) => String(p.userId || p.user?.id || "") !== String(currentUserId)
              )?.user?.name || "User"
        }
      />
    </div>
  );
}
