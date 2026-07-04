"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Check, CheckCheck, Loader2, Send, Wifi, WifiOff, Phone, Video, Paperclip, Smile, MoreVertical, Mic, Square, FileText, Download, Play, Pause, Trash2, X, CornerUpRight } from "lucide-react";
import API from "@/lib/axios";
import ChatAvatar from "@/components/chat/ChatAvatar";
import { useAuth } from "@/context/authContext";
import { useAttendance } from "@/context/AttendanceContext";
import { useDarkMode } from "@/context/DarkModeContext";
import { useSocket } from "@/context/SocketContext";
import { useChat } from "@/context/ChatContext";
import { useE2EE } from "@/context/E2EEContext";
import type { Message } from "@/lib/types";

function formatMessageDate(dateStr: string | Date) {
  const date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - date.getTime());
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0 && now.getDate() === date.getDate()) return "Today";
  if (diffDays === 1 || (diffDays === 0 && now.getDate() !== date.getDate())) return "Yesterday";
  if (diffDays < 7) return date.toLocaleDateString([], { weekday: "long" });
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

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

function WaveformAnimation() {
  return (
    <div className="flex items-center gap-[3px] h-4">
      {[...Array(6)].map((_, i) => (
        <div
          key={i}
          className="w-[3px] bg-[#FF5D5D] rounded-full animate-bounce"
          style={{
            animationDelay: `${i * 0.15}s`,
            animationDuration: '0.9s',
            height: i % 2 === 0 ? '100%' : '60%'
          }}
        />
      ))}
    </div>
  );
}

function CustomAudioPlayer({ src, isOwn, dark, duration }: { src: string; isOwn: boolean; dark: boolean; duration?: number }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [currentTime, setCurrentTime] = useState(0);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateProgress = () => {
      setCurrentTime(audio.currentTime);
      setProgress((audio.currentTime / (audio.duration || 1)) * 100);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setProgress(0);
      setCurrentTime(0);
    };

    audio.addEventListener('timeupdate', updateProgress);
    audio.addEventListener('ended', handleEnded);
    return () => {
      audio.removeEventListener('timeupdate', updateProgress);
      audio.removeEventListener('ended', handleEnded);
    };
  }, []);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  return (
    <div className={`flex items-center gap-3 w-[190px] sm:w-[220px] rounded-[12px]`}>
      <audio ref={audioRef} src={src} preload="metadata" />
      <button
        onClick={togglePlay}
        className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-colors ${isOwn ? 'bg-white/20 hover:bg-white/30 text-white' : (dark ? 'bg-zinc-800 hover:bg-zinc-700 text-white' : 'bg-[#E7E3F3] hover:bg-[#D8D4EA] text-[#15131F]')}`}
      >
        {isPlaying ? <Pause size={17} /> : <Play size={17} style={{ marginLeft: 2 }} />}
      </button>
      <div className="flex-1 flex flex-col justify-center gap-[5px]">
        {/* Progress Bar */}
        <div className={`h-[5px] w-full rounded-full overflow-hidden ${isOwn ? 'bg-white/30' : (dark ? 'bg-zinc-800' : 'bg-[#E7E3F3]')}`}>
          <div
            className={`h-full transition-all duration-100 ease-linear ${isOwn ? 'bg-white' : (dark ? 'bg-[#9B7BF2]' : 'bg-[#6C3CE9]')}`}
            style={{ width: `${progress}%` }}
          />
        </div>
        {/* Duration / Time */}
        <div className="flex justify-between items-center text-[10px] font-medium" style={{ opacity: isOwn ? 0.8 : 0.6 }}>
          <span>{Math.floor(currentTime / 60)}:{Math.floor(currentTime % 60).toString().padStart(2, '0')}</span>
          {duration !== undefined && <span>{Math.floor(duration / 60)}:{Math.floor(duration % 60).toString().padStart(2, '0')}</span>}
        </div>
      </div>
    </div>
  );
}

function MessageContent({ text, isOwn, dark, onImageClick }: { text: string; isOwn: boolean; dark: boolean; onImageClick?: (url: string) => void }) {
  if (text === "$$DELETED$$") {
    return <span className="italic opacity-60">{isOwn ? "You deleted this message" : "This message was deleted"}</span>;
  }
  if (text.startsWith("AUDIO::")) {
    try {
      const data = JSON.parse(text.slice(7));
      return <CustomAudioPlayer src={data.data} isOwn={isOwn} dark={dark} duration={data.duration} />;
    } catch (e) { }
  }
  if (text.startsWith("IMAGE::")) {
    try {
      const data = JSON.parse(text.slice(7));
      return (
        <div onClick={() => onImageClick?.(data.data)} className="block mt-0.5">
          <img src={data.data} alt={data.name} className="w-[240px] aspect-[4/3] object-cover rounded-[10px] cursor-pointer hover:opacity-90 shadow-sm" />
        </div>
      );
    } catch (e) { }
  }
  if (text.startsWith("FILE::")) {
    try {
      const data = JSON.parse(text.slice(6));
      return (
        <a href={data.data} download={data.name} className={`flex items-center gap-3 p-2 rounded-[8px] transition-colors min-w-[200px] max-w-[240px] ${isOwn ? 'bg-white/10 hover:bg-white/20' : (dark ? 'bg-zinc-800 hover:bg-zinc-700' : 'bg-[#F3F1FA] hover:bg-[#E7E3F3]')}`}>
          <div className={`w-[36px] h-[36px] rounded-[6px] flex items-center justify-center shrink-0 ${isOwn ? 'bg-white/20' : (dark ? 'bg-zinc-700' : 'bg-white')}`}>
            <FileText size={18} color={isOwn ? "#fff" : (dark ? "#fff" : "#15131F")} />
          </div>
          <div className="flex flex-col min-w-0 flex-1">
            <span className="text-[13px] font-medium truncate">{data.name}</span>
            <span className="text-[11px] opacity-70 mt-0.5">{data.size}</span>
          </div>
          <div className="ml-1 shrink-0">
            <Download size={16} className="opacity-70" />
          </div>
        </a>
      );
    } catch (e) { }
  }

  return <p className="break-words whitespace-pre-wrap">{text}</p>;
}

export default function FriendChatPage() {
  const params = useParams();
  const router = useRouter();
  const chatId = params?.id as string;
  const { socket } = useSocket() as any;
  const { userId: currentUserId } = useAuth() as any;
  const { friends: globalFriends } = useAttendance() as any;
  const { darkMode } = useDarkMode() as any;
  const {
    activeChatId,
    setActiveChatId,
    chats,
    setMessagesForChat,
    appendMessageToChat,
    updateMessageInChat,
    removeMessageFromChat,
    setFriendForChat,
    setLoadingMessagesForChat,
    setLoadingFriendForChat,
    cacheActivity,
    globalOnlineUsers,
    globalTypingUsers,
    setUnreadCounts,
    setForwardingMessages,
  } = useChat();

  const chatState = chats[chatId] || {
    messages: [],
    friend: null,
    loadingMessages: true,
    loadingFriend: true,
  };
  const { messages, friend, loadingMessages, loadingFriend } = chatState;

  const { isReady: isE2EEReady, encrypt, decrypt, announcePublicKey } = useE2EE() as any;

  const [input, setInput] = useState("");
  const [socketConnected, setSocketConnected] = useState(Boolean((socket as any)?.connected));
  const listRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const shareButtonRef = useRef<HTMLButtonElement | null>(null);

  // Audio Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Audio Preview & Lightbox States
  const [audioPreview, setAudioPreview] = useState<{ data: string; duration: number } | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);


  // Local Chat Management States
  const [localDeletedMessages, setLocalDeletedMessages] = useState<Set<string>>(new Set());
  const [clearedAt, setClearedAt] = useState<number>(0);
  const [chatTheme, setChatTheme] = useState<string>("default");
  const [showHeaderMenu, setShowHeaderMenu] = useState(false);
  const [showThemeModal, setShowThemeModal] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  // Multi-select & Forward state
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (typeof window !== "undefined" && chatId) {
      const deleted = localStorage.getItem(`deleted_${chatId}`);
      if (deleted) setLocalDeletedMessages(new Set(JSON.parse(deleted)));

      const cleared = localStorage.getItem(`cleared_${chatId}`);
      if (cleared) setClearedAt(Number(cleared));

      const theme = localStorage.getItem(`theme_${chatId}`);
      if (theme) setChatTheme(theme);

      setIsHydrated(true);
    }
  }, [chatId]);

  const storageKey = useMemo(() => (chatId ? `friend_chat_${chatId}` : ""), [chatId]);
  const dark = darkMode;
  const border = dark ? "border-zinc-800" : "border-zinc-200";
  const muted = dark ? "text-zinc-400" : "text-zinc-500";
  const bg = dark ? "bg-black" : "bg-white";

  const friendId = useMemo(() => {
    if (!chatId || !currentUserId) return null;
    const parts = chatId.split("_");
    if (parts.length !== 3 || parts[0] !== "friend") return null;
    return parts[1] === currentUserId ? parts[2] : parts[1];
  }, [chatId, currentUserId]);

  const persistRecentActivity = useCallback((message: Message) => {
    if (typeof window === "undefined" || !chatId) return;
    cacheActivity(chatId, message, currentUserId);
    window.dispatchEvent(new Event("chat-activity-updated"));
  }, [cacheActivity, chatId, currentUserId]);

  const scrollToBottom = useCallback((smooth = false) => {
    if (listRef.current) {
      listRef.current.scrollTo({
        top: listRef.current.scrollHeight,
        behavior: smooth ? "smooth" : "auto",
      });
    }
  }, []);

  const markMessagesRead = useCallback(() => {
    if (!socket || !chatId || typeof window === "undefined") return;
    const isVisible = document.visibilityState === "visible" || document.hasFocus();
    if (!isVisible) return;
    socket.emit("markMessagesRead", { chatId });
    setUnreadCounts((prev) => ({ ...prev, [chatId]: 0 }));
  }, [chatId, socket, setUnreadCounts]);

  useEffect(() => {
    if (chatId) {
      setActiveChatId(chatId);
    }
  }, [chatId, setActiveChatId]);

  useEffect(() => {
    if (!chatId) return;
    const parts = chatId.split("_");
    if (parts.length === 3 && parts[0] === "friend") {
      const sorted = [parts[1], parts[2]].sort();
      const canonicalId = `friend_${sorted[0]}_${sorted[1]}`;
      if (canonicalId !== chatId) {
        router.replace(`/chat/${canonicalId}`);
      }
    }
  }, [chatId, router]);

  useEffect(() => {
    if (!friendId || !chatId) return;
    if (friend) return; // Already cached

    const loadFriend = async () => {
      setLoadingFriendForChat(chatId, true);
      try {
        const res = await API.get(`/auth/users/${friendId}`);
        setFriendForChat(chatId, res.data.user || res.data);
      } catch (err) {
        console.error("Failed to load friend", err);
        setLoadingFriendForChat(chatId, false);
      }
    };

    loadFriend();
  }, [friendId, chatId, friend, setFriendForChat, setLoadingFriendForChat]);

  const messagesRef = useRef(messages);
  messagesRef.current = messages;

  const friendRef = useRef(friend);
  friendRef.current = friend;

  // Load initial messages from localStorage if not already in context
  useEffect(() => {
    if (!storageKey || typeof window === "undefined" || !chatId) return;
    if (!loadingMessages) return;

    if (messages.length > 0) {
      setLoadingMessagesForChat(chatId, false);
      return;
    }

    const cached = localStorage.getItem(storageKey);
    if (cached) {
      try {
        const parsed = JSON.parse(cached) as Message[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          const cleared = localStorage.getItem(`cleared_${chatId}`);
          const clearedTime = cleared ? Number(cleared) : 0;
          const filtered = parsed.filter(m => new Date(m.ts).getTime() > clearedTime);

          setMessagesForChat(chatId, filtered);
          setLoadingMessagesForChat(chatId, false);
          return;
        }
      } catch {
        localStorage.removeItem(storageKey);
      }
    }
    setLoadingMessagesForChat(chatId, false);
  }, [chatId, messages.length, loadingMessages, setMessagesForChat, setLoadingMessagesForChat, storageKey]);

  // One-way sync from context messages to localStorage to avoid loops
  useEffect(() => {
    if (typeof window !== "undefined" && storageKey && messages.length > 0) {
      localStorage.setItem(storageKey, JSON.stringify(messages));
    }
  }, [messages, storageKey]);

  useEffect(() => {
    setSocketConnected(Boolean(socket?.connected));
  }, [socket]);

  useEffect(() => {
    if (!socket || !chatId) return;

    const handleConnect = () => setSocketConnected(true);
    const handleDisconnect = () => setSocketConnected(false);

    const handleHistory = async (data: { chatId?: string; messages?: Message[] }) => {
      if (data.chatId !== chatId) return;
      let nextMessages = data.messages || [];

      const cleared = typeof window !== "undefined" ? localStorage.getItem(`cleared_${chatId}`) : null;
      const clearedTime = cleared ? Number(cleared) : 0;
      nextMessages = nextMessages.filter(m => new Date(m.ts).getTime() > clearedTime);

      nextMessages = await Promise.all(
        nextMessages.map(async (m) => ({ ...m, text: await decrypt(m) }))
      );
      setMessagesForChat(chatId, nextMessages);
      if (nextMessages.length > 0) {
        persistRecentActivity(nextMessages[nextMessages.length - 1]);
      }
      setTimeout(() => scrollToBottom(false), 0);
    };

    const handleNewMessage = async (message: Message) => {
      if (message.chatId !== chatId) return;
      const decryptedText = await decrypt(message);
      const normalizedMessage = {
        ...message,
        text: decryptedText,
        status: String(message.userId) === String(currentUserId) ? "delivered" : "received",
      } as Message;

      updateMessageInChat(chatId, normalizedMessage);
      persistRecentActivity(normalizedMessage);
      if (String(message.userId) !== String(currentUserId)) {
        markMessagesRead();
        if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
          const friendName = friendRef.current?.name || "A friend";
          new Notification(`${friendName} sent a message`, { body: message.text || "New message" });
        }
      }
      setTimeout(() => scrollToBottom(true), 0);
    };

    const handleError = (error: { msg?: string }) => {
      console.warn("chatError", error?.msg);
    };

    const handleMessageDeleted = (data: { chatId?: string; messageId?: string }) => {
      if (data.chatId !== chatId || !data.messageId) return;
      const msg = messagesRef.current.find(m => m.id === data.messageId);
      if (msg) {
        const deletedMsg = {
          ...msg,
          text: '$$DELETED$$',
          ciphertext: undefined,
          iv: undefined,
          encryptedKeys: undefined
        };
        updateMessageInChat(chatId, deletedMsg);
        persistRecentActivity(deletedMsg);
      }
    };

    const handleMessagesRead = (data: { chatId?: string; userId?: string }) => {
      if (data.chatId !== chatId || !data.userId || data.userId === currentUserId) return;

      // Update read status for messages in this chat using ref to avoid stale closure
      const next = messagesRef.current.map((msg) => {
        if (String(msg.userId) === String(currentUserId) && msg.status !== "read") {
          return { ...msg, status: "read" as const };
        }
        return msg;
      });
      setMessagesForChat(chatId, next);
    };

    const joinRoom = () => {
      if (chatId) {
        socket.emit("joinFriendChat", { chatId });
        markMessagesRead();
        announcePublicKey(chatId);
      }
    };

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("serverReady", joinRoom);
    socket.on("chatMessages", handleHistory);
    socket.on("newChatMessage", handleNewMessage);
    socket.on("messagesRead", handleMessagesRead);
    socket.on("messageDeleted", handleMessageDeleted);
    socket.on("chatError", handleError);

    if (socket.connected) {
      joinRoom();
    }

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("serverReady", joinRoom);
      socket.off("chatMessages", handleHistory);
      socket.off("newChatMessage", handleNewMessage);
      socket.off("messagesRead", handleMessagesRead);
      socket.off("messageDeleted", handleMessageDeleted);
      socket.off("chatError", handleError);
      if (chatId) {
        socket.emit("leaveFriendChat", { chatId });
      }
    };
  }, [chatId, currentUserId, updateMessageInChat, setMessagesForChat, persistRecentActivity, scrollToBottom, socket, markMessagesRead, decrypt, announcePublicKey]);

  useEffect(() => {
    if (messages.length === 0) return;
    const timer = setTimeout(() => scrollToBottom(false), 50);
    return () => clearTimeout(timer);
  }, [messages, scrollToBottom]);

  const isFriendTyping = friendId && globalTypingUsers[friendId] === chatId;
  useEffect(() => {
    if (isFriendTyping) {
      setTimeout(() => scrollToBottom(true), 50);
    }
  }, [isFriendTyping, scrollToBottom]);

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      if (recordTimerRef.current) clearInterval(recordTimerRef.current);
      if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!chatId || typeof window === "undefined") return;
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        markMessagesRead();
      }
    };

    if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "default") {
      Notification.requestPermission().catch(() => undefined);
    }

    window.addEventListener("focus", handleVisibility);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      window.removeEventListener("focus", handleVisibility);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [chatId, markMessagesRead]);

  const sendMessage = async () => {
    const trimmed = input.trim();
    if (!socket || !chatId || !trimmed) return;

    const clientId = `client_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const optimistic: Message = {
      id: `${Date.now()}`,
      chatId,
      userId: currentUserId,
      name: "You",
      text: trimmed,
      ts: new Date().toISOString(),
      clientId,
      status: "sent",
    };

    appendMessageToChat(chatId, optimistic);
    persistRecentActivity(optimistic);
    setInput("");

    let payloadText = trimmed;
    let e2eePayload = {};
    if (isE2EEReady && friendId) {
      const encrypted = await encrypt(trimmed, [currentUserId, friendId]);
      if (encrypted) {
        payloadText = '';
        e2eePayload = encrypted;
      }
    }

    socket.emit("sendChatMessage", { chatId, text: payloadText, clientId, ...e2eePayload });
    socket.emit("typing", { chatId, isTyping: false });
    setTimeout(() => scrollToBottom(true), 0);
  };

  const sendMediaMessage = async (rawPayloadText: string) => {
    if (!socket || !chatId) return;

    const clientId = `client_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const optimistic: Message = {
      id: `${Date.now()}`,
      chatId,
      userId: currentUserId,
      name: "You",
      text: rawPayloadText,
      ts: new Date().toISOString(),
      clientId,
      status: "sent",
    };

    appendMessageToChat(chatId, optimistic);
    persistRecentActivity(optimistic);

    let payloadText = rawPayloadText;
    let e2eePayload = {};
    if (isE2EEReady && friendId) {
      const encrypted = await encrypt(rawPayloadText, [currentUserId, friendId]);
      if (encrypted) {
        payloadText = '';
        e2eePayload = encrypted;
      }
    }

    socket.emit("sendChatMessage", { chatId, text: payloadText, clientId, ...e2eePayload });
    setTimeout(() => scrollToBottom(true), 0);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
          const base64String = reader.result as string;
          setAudioPreview({
            data: base64String,
            duration: recordingDuration
          });
        };
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingDuration(0);

      recordTimerRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error("Error accessing microphone:", err);
      alert("Microphone access denied or unavailable.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordTimerRef.current) clearInterval(recordTimerRef.current);
    }
  };

  const handleDeleteMessage = (messageId: string) => {
    const msg = messages.find(m => m.id === messageId);
    if (!msg) return;

    if (String(msg.userId) === String(currentUserId)) {
      if (socket && chatId) {
        socket.emit("deleteChatMessage", { chatId, messageId });
      }
      const deletedMsg = {
        ...msg,
        text: '$$DELETED$$',
        ciphertext: undefined,
        iv: undefined,
        encryptedKeys: undefined
      };
      updateMessageInChat(chatId, deletedMsg);
      persistRecentActivity(deletedMsg);
    } else {
      const newSet = new Set(localDeletedMessages);
      newSet.add(messageId);
      setLocalDeletedMessages(newSet);
      if (typeof window !== "undefined") {
        localStorage.setItem(`deleted_${chatId}`, JSON.stringify(Array.from(newSet)));
      }
    }
  };

  const handleClearChat = () => {
    const now = Date.now();
    setClearedAt(now);
    if (typeof window !== "undefined") {
      localStorage.setItem(`cleared_${chatId}`, String(now));
      localStorage.removeItem(storageKey);
    }
    setMessagesForChat(chatId, []);
    setShowHeaderMenu(false);
  };

  // ─── Multi-select & Forward handlers ──────────────────────────────────────
  const enterSelectionMode = (id: string) => {
    setSelectionMode(true);
    setSelectedIds(new Set([id]));
  };

  const toggleSelectMessage = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        if (next.size === 0) setSelectionMode(false);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const exitSelectionMode = () => {
    setSelectionMode(false);
    setSelectedIds(new Set());
  };

  const handleBulkDelete = () => {
    const newLocalDeleted = new Set(localDeletedMessages);
    let localDeletedChanged = false;
    Array.from(selectedIds).forEach(messageId => {
      const msg = messages.find(m => m.id === messageId);
      if (!msg) return;
      if (String(msg.userId) === String(currentUserId)) {
        if (socket && chatId) socket.emit("deleteChatMessage", { chatId, messageId });
        const deletedMsg = {
          ...msg,
          text: '$$DELETED$$',
          ciphertext: undefined,
          iv: undefined,
          encryptedKeys: undefined
        };
        updateMessageInChat(chatId, deletedMsg);
        persistRecentActivity(deletedMsg);
      } else {
        newLocalDeleted.add(messageId);
        localDeletedChanged = true;
      }
    });
    if (localDeletedChanged) {
      setLocalDeletedMessages(newLocalDeleted);
      if (typeof window !== "undefined") {
        localStorage.setItem(`deleted_${chatId}`, JSON.stringify(Array.from(newLocalDeleted)));
      }
    }
    exitSelectionMode();
  };


  // Store selected texts in context and let the sidebar list of chats handle targets selection (both desktop & mobile)
  const handleShareClick = () => {
    if (selectedIds.size === 0) return;
    const msgsToForward = messages.filter(m =>
      selectedIds.has(m.id) &&
      m.text !== '$$DELETED$$'
    );
    if (msgsToForward.length > 0) setForwardingMessages(msgsToForward);
    exitSelectionMode();
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
    if (isMobile) {
      router.push('/chat');
    }
  };

  // Select All visible messages (Toggles select all / unselect all)
  const handleSelectAll = () => {
    const nonDeletedMessages = visibleMessages.filter(m => m.text !== '$$DELETED$$');
    const allIds = new Set(nonDeletedMessages.map(m => m.id));
    const allSelected = nonDeletedMessages.length > 0 && nonDeletedMessages.every(m => selectedIds.has(m.id));

    if (allSelected) {
      setSelectedIds(new Set());
      setSelectionMode(false);
    } else {
      setSelectedIds(allIds);
    }
  };

  const handleChangeTheme = (theme: string) => {
    setChatTheme(theme);
    if (typeof window !== "undefined") {
      localStorage.setItem(`theme_${chatId}`, theme);
    }
    setShowThemeModal(false);
  };

  const discardAudio = () => {
    setAudioPreview(null);
  };

  const sendAudioPreview = () => {
    if (!audioPreview) return;
    const payload = `AUDIO::${JSON.stringify({
      data: audioPreview.data,
      duration: audioPreview.duration
    })}`;
    sendMediaMessage(payload);
    setAudioPreview(null);
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onloadend = () => {
      const base64String = reader.result as string;
      const isImage = file.type.startsWith("image/");

      const fileData = {
        name: file.name,
        type: file.type,
        size: (file.size / 1024 / 1024).toFixed(2) + " MB",
        data: base64String
      };

      const payload = isImage
        ? `IMAGE::${JSON.stringify(fileData)}`
        : `FILE::${JSON.stringify(fileData)}`;

      sendMediaMessage(payload);
    };

    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleTyping = (value: string) => {
    setInput(value);
    if (socket && chatId) {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      if (!value.trim()) {
        socket.emit("typing", { chatId, isTyping: false });
        return;
      }
      socket.emit("typing", { chatId, isTyping: true });
      typingTimeoutRef.current = setTimeout(() => {
        socket.emit("typing", { chatId, isTyping: false });
      }, 1500);
    }
  };

  // We define isOnline via global tracking
  const isOnline = friendId ? globalOnlineUsers.has(friendId) : false;

  const visibleMessages = useMemo(() => {
    if (!isHydrated) return [];
    return messages.filter(m => {
      if (localDeletedMessages.has(m.id)) return false;
      if (new Date(m.ts).getTime() <= clearedAt) return false;
      if (m.text === "$$DELETED$$" && String(m.userId) === String(currentUserId)) return false;
      return true;
    });
  }, [messages, localDeletedMessages, clearedAt, isHydrated, currentUserId]);

  const dateGroups = useMemo(() => {
    const result: { dateLabel: string; groups: { isOwn: boolean; items: Message[] }[] }[] = [];

    visibleMessages.forEach((m) => {
      const dateLabel = formatMessageDate(m.ts);

      let lastDateGroup = result[result.length - 1];
      if (!lastDateGroup || lastDateGroup.dateLabel !== dateLabel) {
        lastDateGroup = { dateLabel, groups: [] };
        result.push(lastDateGroup);
      }

      const isOwn = String(m.userId) === String(currentUserId);
      const lastGroup = lastDateGroup.groups[lastDateGroup.groups.length - 1];

      if (lastGroup && lastGroup.isOwn === isOwn) {
        lastGroup.items.push(m);
      } else {
        lastDateGroup.groups.push({ isOwn, items: [m] });
      }
    });

    return result;
  }, [visibleMessages, currentUserId]);

  const displayFriend = friend || (globalFriends || []).find((f: any) => String(f.id) === String(friendId));

  return (
    <div className={`flex h-full flex-col ${bg}`}>
      <header className={`h-[72px] shrink-0 border-b flex items-center justify-between px-1 md:px-4 transition-colors duration-200 ${dark ? 'bg-zinc-950 border-zinc-800' : 'bg-white border-[#E7E3F3]'}`}>
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/chat")}
            className={`flex md:hidden items-center justify-center rounded-lg p-1.5 ${muted}`}
            aria-label="Back to chats"
          >
            <ArrowLeft size={18} />
          </button>

          {displayFriend ? (
            <ChatAvatar
              name={displayFriend.name}
              avatarUrl={displayFriend.avatarUrl}
              size={42}
              online={isOnline}
              ring={false}
            />
          ) : (
            <div className="w-[42px] h-[42px] rounded-full bg-zinc-200 dark:bg-zinc-800 animate-pulse" />
          )}

          <div>
            {displayFriend ? (
              <div className={`font-bold text-[14px] md:text-[16px] tracking-tight font-sans ${dark ? 'text-white' : 'text-[#15131F]'}`}>
                {displayFriend.name}
              </div>
            ) : (
              <div className="h-4 w-24 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse mb-1.5" />
            )}

            <div className="flex items-center gap-1.5 mt-0.5">
              <span
                className={`w-[7px] h-[7px] rounded-full inline-block ${isOnline ? 'bg-[#25C77E]' : (dark ? 'bg-zinc-600' : 'bg-[#8D89A3]')}`}
              />
              <span className={`text-[10px] md:text-[12px] font-medium ${isOnline ? 'text-[#25C77E]' : muted}`}>
                {isOnline ? "Online" : ""}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1 relative">
          {selectionMode && (
            <div className="flex items-center gap-1.5 mr-2">
              <span className={`hidden sm:inline text-[12px] font-bold mr-1 ${dark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                {selectedIds.size} Selected
              </span>
              {/* Select All */}
              <button
                onClick={handleSelectAll}
                className={`flex items-center px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all ${dark ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300' : 'bg-[#F3F1FA] hover:bg-[#ECE9F8] text-zinc-500'}`}
              >
                All
              </button>
              {/* Forward / Share */}
              <button
                ref={shareButtonRef}
                onClick={handleShareClick}
                disabled={selectedIds.size === 0}
                className={`w-[34px] h-[34px] rounded-lg flex items-center justify-center transition-colors disabled:opacity-40 ${dark ? 'hover:bg-zinc-800 bg-zinc-900 text-white' : 'hover:bg-[#ECE9F8] bg-[#F3F1FA] text-[#15131F]'}`}
              >
                <CornerUpRight size={15} />
              </button>
              {/* Delete */}
              <button
                onClick={handleBulkDelete}
                disabled={selectedIds.size === 0}
                className="w-[34px] h-[34px] rounded-lg flex items-center justify-center transition-colors disabled:opacity-40 bg-red-500/10 hover:bg-red-500/20 text-[#FF5D5D]"
              >
                <Trash2 size={15} />
              </button>
              {/* Cancel selection */}
              <button
                onClick={exitSelectionMode}
                className={` h-[34px] rounded-lg flex items-center justify-center transition-colors ${dark ? 'hover:bg-zinc-800' : 'hover:bg-[#ECE9F8]'}`}
              >
                <X size={15} className={muted} />
              </button>

            </div>
          )}


          <div
            className={` h-[38px] rounded-[11px] flex items-center justify-center cursor-pointer transition-colors ${dark ? 'hover:bg-zinc-800' : 'hover:bg-[#ECE9F8]'}`}
            onClick={() => setShowHeaderMenu(!showHeaderMenu)}
          >
            <MoreVertical size={17} className={muted} />
          </div>

          {/* Header Dropdown */}
          {showHeaderMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowHeaderMenu(false)} />
              <div className={`absolute top-12 right-0 z-50 w-48 rounded-xl shadow-lg border py-2 overflow-hidden ${dark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-[#E7E3F3]'}`}>
                <div
                  className={`px-4 py-2 text-sm font-medium cursor-pointer transition-colors ${dark ? 'hover:bg-zinc-800 text-white' : 'hover:bg-[#F3F1FA] text-[#15131F]'}`}
                  onClick={() => setShowThemeModal(true)}
                >
                  Change Chat Theme
                </div>
                <div
                  className={`px-4 py-2 text-sm font-medium cursor-pointer transition-colors text-[#FF5D5D] ${dark ? 'hover:bg-zinc-800' : 'hover:bg-[#F3F1FA]'}`}
                  onClick={handleClearChat}
                >
                  Clear Chat History
                </div>
              </div>
            </>
          )}
        </div>
      </header>

      {/* Messages */}
      <div
        ref={listRef}
        className="flex-1 overflow-y-auto px-6 py-6 pb-2 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-[#D8D4EA] dark:[&::-webkit-scrollbar-thumb]:bg-zinc-800 [&::-webkit-scrollbar-thumb]:rounded-full"
        style={
          chatTheme === "midnight" ? { background: 'linear-gradient(to bottom, #0f0c29, #302b63, #24243e)' } :
            chatTheme === "ocean" ? { background: 'linear-gradient(to bottom, #1cb5e0, #000046)' } :
              chatTheme === "emerald" ? { background: 'linear-gradient(to bottom, #000000, #0f9b0f)' } :
                {}
        }
      >
        {(!isHydrated || loadingMessages) && visibleMessages.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="animate-spin text-indigo-500" size={20} />
          </div>
        ) : visibleMessages.length === 0 ? (
          <div className={`flex h-full items-center justify-center text-center text-sm ${muted}`}>
            Start the conversation with a friendly hello.
          </div>
        ) : (
          <div>
            {dateGroups.map((dateGroup, dgi) => (
              <div key={`date-${dgi}`}>
                <div className="flex justify-center mb-5 mt-2">
                  <span className={`text-[11.5px] font-semibold px-3.5 py-1 rounded-[20px] ${dark ? 'bg-zinc-900 text-zinc-400' : 'bg-[#EAE6F7] text-[#8D89A3]'}`}>
                    {dateGroup.dateLabel}
                  </span>
                </div>
                {dateGroup.groups.map((g, gi) => (
                  <div key={gi} className="mb-3.5">
                    {g.items.map((m, i) => {
                      const isFirst = i === 0;
                      const isLast = i === g.items.length - 1;

                      return (
                        <div
                          key={m.id || `${m.userId}-${i}`}
                          className={`flex mb-[3px] items-center transition-colors duration-150 rounded-xl ${selectionMode ? 'gap-3 cursor-pointer px-2 -mx-2' : (g.isOwn ? 'justify-end' : 'justify-start')} relative`}
                          style={selectionMode && selectedIds.has(m.id) ? { background: dark ? 'rgba(108, 60, 233, 0.14)' : 'rgba(108, 60, 233, 0.07)' } : {}}
                          onContextMenu={(e) => {
                            e.preventDefault();
                            if (m.text === "$$DELETED$$") return;
                            if (selectionMode) {
                              toggleSelectMessage(m.id);
                            } else {
                              enterSelectionMode(m.id);
                            }
                          }}
                          onPointerDown={() => {
                            if (m.text === "$$DELETED$$" || selectionMode) return;
                            longPressTimerRef.current = setTimeout(() => {
                              enterSelectionMode(m.id);
                            }, 420);
                          }}
                          onPointerUp={() => {
                            if (longPressTimerRef.current) {
                              clearTimeout(longPressTimerRef.current);
                              longPressTimerRef.current = null;
                            }
                          }}
                          onPointerLeave={() => {
                            if (longPressTimerRef.current) {
                              clearTimeout(longPressTimerRef.current);
                              longPressTimerRef.current = null;
                            }
                          }}
                          onPointerCancel={() => {
                            if (longPressTimerRef.current) {
                              clearTimeout(longPressTimerRef.current);
                              longPressTimerRef.current = null;
                            }
                          }}
                          onClick={() => {
                            if (selectionMode && m.text !== "$$DELETED$$") {
                              toggleSelectMessage(m.id);
                            }
                          }}
                        >
                          {/* Selection checkbox */}
                          {selectionMode && (
                            <div
                              className={`shrink-0 w-[20px] h-[20px] rounded-full border-2 flex items-center justify-center transition-all duration-200 pointer-events-none ${selectedIds.has(m.id)
                                ? 'bg-[#6C3CE9] border-[#6C3CE9] shadow-md shadow-indigo-500/40 scale-110'
                                : dark ? 'border-zinc-600 bg-zinc-900' : 'border-zinc-300 bg-white'
                                }`}
                            >
                              {selectedIds.has(m.id) && <Check size={11} color="white" strokeWidth={3} />}
                            </div>
                          )}
                          <div
                            className={`max-w-[85%] sm:max-w-[70%] px-3.5 py-2.5 text-[14.5px] leading-[1.45] font-sans transition-all duration-200 ${selectionMode && g.isOwn ? 'ml-auto' : ''}`}
                            style={{
                              background: m.text === "$$DELETED$$"
                                ? "transparent"
                                : g.isOwn
                                  ? `linear-gradient(135deg, #6C3CE9, #4A22B0)`
                                  : (dark ? '#18181b' : '#FFFFFF'),
                              color: m.text === "$$DELETED$$"
                                ? (dark ? '#71717a' : '#8D89A3')
                                : g.isOwn ? '#fff' : (dark ? '#fff' : '#15131F'),
                              border: m.text === "$$DELETED$$"
                                ? `1px dashed ${dark ? '#3f3f46' : '#C7C4D8'}`
                                : g.isOwn ? 'none' : `1px solid ${dark ? '#27272a' : '#E7E3F3'}`,
                              borderTopLeftRadius: g.isOwn ? 18 : isFirst ? 18 : 6,
                              borderTopRightRadius: g.isOwn ? (isFirst ? 18 : 6) : 18,
                              borderBottomLeftRadius: g.isOwn ? 18 : isLast ? 4 : 6,
                              borderBottomRightRadius: g.isOwn ? (isLast ? 4 : 6) : 18,
                            }}
                          >
                            <MessageContent text={m.text} isOwn={g.isOwn} dark={dark} onImageClick={setSelectedImage} />
                            {isLast && (
                              <div className="flex justify-end items-center gap-[3px] mt-[3px] text-[10.5px]" style={{ opacity: 0.5, color: dark ? '#a1a1aa' : '#8D89A3' }}>
                                <span>{new Date(m.ts).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</span>
                                {g.isOwn && m.text !== "$$DELETED$$" && (
                                  <span className="ml-[1px]">
                                    {m.status === "read" ? (
                                      <CheckCheck size={13} strokeWidth={2.5} color="#8FF0C7" />
                                    ) : m.status === "delivered" ? (
                                      <CheckCheck size={13} strokeWidth={2.5} color="#fff" opacity={0.8} />
                                    ) : (
                                      <Check size={13} strokeWidth={2.5} />
                                    )}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            ))}

            {friendId && globalTypingUsers[friendId] === chatId && (
              <div className="mb-2 flex justify-start">
                <div className={`px-3.5 py-2.5 rounded-[18px] rounded-bl-[4px] ${dark ? "bg-[#18181b] border border-[#27272a]" : "bg-[#FFFFFF] border border-[#E7E3F3]"}`}>
                  <TypingDots />
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Input */}
      <div className={`px-6 pt-4 pb-5 flex items-center gap-2.5 border-t shrink-0 ${dark ? 'bg-zinc-950 border-zinc-800' : 'bg-white border-[#E7E3F3]'}`}>
        {audioPreview ? (
          <div className="flex-1 flex items-center gap-3">
            <button
              onClick={discardAudio}
              className={`w-[44px] h-[44px] rounded-full flex items-center justify-center transition-colors ${dark ? 'hover:bg-zinc-800 text-zinc-400 hover:text-[#FF5D5D]' : 'hover:bg-[#ECE9F8] text-zinc-500 hover:text-[#FF5D5D]'}`}
            >
              <Trash2 size={20} />
            </button>
            <div className="flex-1 flex justify-center">
              <CustomAudioPlayer src={audioPreview.data} isOwn={true} dark={dark} duration={audioPreview.duration} />
            </div>
            <button
              onClick={sendAudioPreview}
              className="w-[44px] h-[44px] rounded-full flex items-center justify-center transition-transform hover:scale-105 active:scale-95"
              style={{ background: `linear-gradient(135deg, #6C3CE9, #4A22B0)` }}
            >
              <Send size={17} color="#fff" style={{ marginLeft: -2 }} />
            </button>
          </div>
        ) : (
          <>
            <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileSelect} />
            <div
              onClick={() => fileInputRef.current?.click()}
              className={`w-[38px] h-[38px] rounded-[11px] flex items-center justify-center cursor-pointer transition-colors ${dark ? 'hover:bg-zinc-800' : 'hover:bg-[#ECE9F8]'}`}
            >
              <Paperclip size={18} className={muted} />
            </div>

            <div className="flex-1 relative flex items-center">
              {isRecording ? (
                <div className={`w-full pl-5 pr-5 py-[11px] rounded-[22px] border flex items-center justify-between ${dark ? 'bg-zinc-900 border-zinc-800' : 'bg-[#F3F1FA] border-[#E7E3F3]'}`}>
                  <div className="flex items-center gap-3">
                    <WaveformAnimation />
                    <span className="text-[14px] font-medium text-[#FF5D5D] ml-2">Recording...</span>
                  </div>
                  <span className={`text-[13px] font-medium ${muted}`}>
                    {Math.floor(recordingDuration / 60)}:{(recordingDuration % 60).toString().padStart(2, '0')}
                  </span>
                </div>
              ) : (
                <>
                  <textarea
                    value={input}
                    onChange={(e) => {
                      handleTyping(e.target.value);
                      e.target.style.height = 'auto';
                      e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && !event.shiftKey) {
                        event.preventDefault();
                        sendMessage();
                      }
                    }}
                    placeholder="Type a message..."
                    rows={1}
                    style={{ resize: 'none' }}
                    className={`w-full pl-4 pr-[42px] py-[11px] rounded-[22px] outline-none text-[14px] font-sans border transition-colors overflow-y-auto ${dark
                      ? 'bg-zinc-900 border-zinc-800 text-white placeholder-zinc-500 focus:border-zinc-700'
                      : 'bg-[#F3F1FA] border-[#E7E3F3] text-[#15131F] placeholder-[#8D89A3] focus:border-[#D8D4EA]'
                      } [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-zinc-300 dark:[&::-webkit-scrollbar-thumb]:bg-zinc-700`}
                  />
                  <div className="absolute right-[12px] bottom-[11px] cursor-pointer">
                    <Smile size={18} className={muted} />
                  </div>
                </>
              )}
            </div>

            {input.trim() ? (
              <button
                onClick={sendMessage}
                className="w-[44px] h-[44px] rounded-full flex items-center justify-center cursor-pointer shrink-0 transition-transform hover:scale-105 active:scale-95"
                style={{ background: `linear-gradient(135deg, #6C3CE9, #4A22B0)` }}
                aria-label="Send message"
              >
                <Send size={17} color="#fff" style={{ marginLeft: -2 }} />
              </button>
            ) : (
              <button
                onPointerDown={startRecording}
                onPointerUp={stopRecording}
                onPointerLeave={stopRecording}
                className={`w-[44px] h-[44px] rounded-full flex items-center justify-center cursor-pointer shrink-0 transition-all ${isRecording ? 'scale-110 bg-[#FF5D5D]' : 'hover:scale-105 active:scale-95 bg-[#25C77E]'}`}
                aria-label="Record voice note"
              >
                {isRecording ? <Square size={17} color="#fff" /> : <Mic size={17} color="#fff" />}
              </button>
            )}
          </>
        )}
      </div>

      {/* Lightbox Modal */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={() => setSelectedImage(null)}
        >
          <button
            className="absolute top-6 right-6 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
            onClick={() => setSelectedImage(null)}
          >
            <X size={24} />
          </button>
          <img
            src={selectedImage}
            alt="Fullscreen Preview"
            className="max-w-[90vw] max-h-[90vh] object-contain rounded-[12px] shadow-2xl transition-transform duration-300 scale-100"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}


      {/* Theme Modal */}
      {showThemeModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowThemeModal(false)}>
          <div className={`w-[90%] max-w-sm rounded-2xl p-6 shadow-2xl ${dark ? 'bg-zinc-900 border border-zinc-800' : 'bg-white'}`} onClick={e => e.stopPropagation()}>
            <h3 className={`text-lg font-bold mb-4 ${dark ? 'text-white' : 'text-[#15131F]'}`}>Select Chat Theme</h3>
            <div className="grid grid-cols-2 gap-3">
              {[
                { id: "default", name: "Default", bg: dark ? '#000' : '#fff' },
                { id: "midnight", name: "Midnight", bg: 'linear-gradient(to bottom, #0f0c29, #302b63, #24243e)' },
                { id: "ocean", name: "Ocean", bg: 'linear-gradient(to bottom, #1cb5e0, #000046)' },
                { id: "emerald", name: "Emerald", bg: 'linear-gradient(to bottom, #000000, #0f9b0f)' },
              ].map(theme => (
                <div
                  key={theme.id}
                  onClick={() => handleChangeTheme(theme.id)}
                  className={`cursor-pointer rounded-xl h-20 border-2 transition-all hover:scale-105 flex items-end p-2 ${chatTheme === theme.id ? 'border-[#6C3CE9]' : 'border-transparent'}`}
                  style={{ background: theme.bg }}
                >
                  <span className={`text-[12px] font-bold ${theme.id === 'default' ? (dark ? 'text-white' : 'text-black') : 'text-white drop-shadow-md'}`}>
                    {theme.name}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
