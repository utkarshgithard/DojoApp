"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Check, CheckCheck, Loader2, Send, Wifi, WifiOff } from "lucide-react";
import API from "@/lib/axios";
import { useAuth } from "@/context/authContext";
import { useDarkMode } from "@/context/DarkModeContext";
import { useSocket } from "@/context/SocketContext";
import { useChat } from "@/context/ChatContext";
import type { Message } from "@/lib/types";

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

export default function FriendChatPage() {
  const params = useParams();
  const router = useRouter();
  const chatId = params?.id as string;
  const { socket } = useSocket() as any;
  const { userId: currentUserId } = useAuth() as any;
  const { darkMode } = useDarkMode() as any;
  const {
    activeChatId,
    setActiveChatId,
    chats,
    setMessagesForChat,
    appendMessageToChat,
    updateMessageInChat,
    setFriendForChat,
    setLoadingMessagesForChat,
    setLoadingFriendForChat,
    cacheActivity,
    globalOnlineUsers,
    globalTypingUsers,
  } = useChat();

  const chatState = chats[chatId] || {
    messages: [],
    friend: null,
    loadingMessages: true,
    loadingFriend: true,
  };
  const { messages, friend, loadingMessages, loadingFriend } = chatState;

  const [input, setInput] = useState("");
  const [socketConnected, setSocketConnected] = useState(Boolean((socket as any)?.connected));
  const listRef = useRef<HTMLDivElement>(null);

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
  }, [chatId, socket]);

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
          setMessagesForChat(chatId, parsed);
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

    const handleHistory = (data: { chatId?: string; messages?: Message[] }) => {
      if (data.chatId !== chatId) return;
      const nextMessages = data.messages || [];
      setMessagesForChat(chatId, nextMessages);
      if (nextMessages.length > 0) {
        persistRecentActivity(nextMessages[nextMessages.length - 1]);
      }
      setTimeout(() => scrollToBottom(false), 0);
    };

    const handleNewMessage = (message: Message) => {
      if (message.chatId !== chatId) return;
      const normalizedMessage = {
        ...message,
        status: String(message.userId) === String(currentUserId) ? "delivered" : "received",
      } as Message;

      updateMessageInChat(chatId, normalizedMessage);
      persistRecentActivity(message);
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
      }
    };

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("serverReady", joinRoom);
    socket.on("chatMessages", handleHistory);
    socket.on("newChatMessage", handleNewMessage);
    socket.on("messagesRead", handleMessagesRead);
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
      socket.off("chatError", handleError);
      if (chatId) {
        socket.emit("leaveFriendChat", { chatId });
      }
    };
  }, [chatId, currentUserId, updateMessageInChat, setMessagesForChat, persistRecentActivity, scrollToBottom, socket, markMessagesRead]);

  useEffect(() => {
    if (messages.length === 0) return;
    const timer = setTimeout(() => scrollToBottom(false), 50);
    return () => clearTimeout(timer);
  }, [messages, scrollToBottom]);

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

  const sendMessage = () => {
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
    socket.emit("sendChatMessage", { chatId, text: trimmed, clientId });
    socket.emit("typing", { chatId, isTyping: false });
    setTimeout(() => scrollToBottom(true), 0);
  };

  const handleTyping = (value: string) => {
    setInput(value);
    if (socket && chatId) {
      socket.emit("typing", { chatId, isTyping: !!value.trim() });
    }
  };

  // We define isOnline via global tracking
  const isOnline = friendId ? globalOnlineUsers.has(friendId) : false;

  if (loadingFriend) {
    return (
      <div className={`flex h-[calc(100vh-72px)] items-center justify-center ${bg}`}>
        <Loader2 size={22} className="animate-spin text-indigo-500" />
      </div>
    );
  }

  if (!friend) {
    return (
      <div className={`flex h-[calc(100vh-72px)] flex-col items-center justify-center gap-3 ${bg}`}>
        <p className="text-sm font-medium">This chat could not be loaded.</p>
        <button onClick={() => router.push("/chat")} className="rounded-lg border px-4 py-2 text-sm">Back to chats</button>
      </div>
    );
  }

  return (
    <div className={`flex h-[calc(100vh-72px)] flex-col ${bg}`}>
      <header className={`flex items-center justify-between border-b px-4 py-3 ${border}`}>
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/chat")}
            className={`flex md:hidden items-center justify-center rounded-lg p-1.5 ${muted}`}
            aria-label="Back to chats"
          >
            <ArrowLeft size={18} />
          </button>
          {friend.avatarUrl ? (
            <img src={friend.avatarUrl} alt={friend.name} className="h-10 w-10 rounded-full object-cover" />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 text-sm font-semibold text-white">
              {friend.name?.charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <p className="text-sm font-semibold">{friend.name}</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="relative flex h-2 w-2">
                {isOnline && (
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                )}
                <span className={`relative inline-flex rounded-full h-2 w-2 ${isOnline ? "bg-emerald-500" : "bg-zinc-400"}`}></span>
              </span>
              <p className={`text-xs ${isOnline ? "text-emerald-500 font-medium" : muted}`}>
                {isOnline ? "Online" : "Offline"}
              </p>
            </div>
          </div>
        </div>
        <div className={`flex items-center gap-2 rounded-full px-2 py-1 text-xs ${socketConnected ? "text-emerald-600" : "text-amber-600"}`}>
          {socketConnected ? <Wifi size={14} /> : <WifiOff size={14} />} 
          {socketConnected ? "Live" : "Connecting"}
        </div>
      </header>

      <div ref={listRef} className="flex-1 overflow-y-auto px-4 py-4">
        {loadingMessages && messages.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="animate-spin text-indigo-500" size={20} />
          </div>
        ) : messages.length === 0 ? (
          <div className={`flex h-full items-center justify-center text-center text-sm ${muted}`}>
            Start the conversation with a friendly hello.
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map((message, index) => {
              const isOwn = String(message.userId) === String(currentUserId);
              return (
                <div key={message.id || `${message.userId}-${index}`} className={`flex ${isOwn ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm shadow-sm ${isOwn ? "bg-indigo-500 text-white" : dark ? "bg-zinc-900 text-zinc-100" : "bg-gray-100 text-gray-900"}`}>
                    <p className="break-words">{message.text}</p>
                    <div className={`mt-1 flex items-center justify-end gap-1 text-[10px] ${isOwn ? "text-indigo-100" : dark ? "text-zinc-500" : "text-gray-500"}`}>
                      <span>{new Date(message.ts).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</span>
                      {isOwn && (
                        <span className="ml-0.5">
                          {message.status === "read" ? (
                            <CheckCheck size={12} className="text-rose-500" />
                          ) : message.status === "delivered" ? (
                            <CheckCheck size={12} className="text-white/80" />
                          ) : (
                            <Check size={12} className="text-white/70" />
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className={`border-t px-4 py-3 ${border}`}>
        {friendId && globalTypingUsers[friendId] === chatId && (
          <div className="mb-2 flex justify-start">
            <div className={`rounded-2xl rounded-bl-none px-4 py-2 ${dark ? "bg-zinc-800 text-zinc-300" : "bg-zinc-100 text-zinc-500"}`}>
              <TypingDots />
            </div>
          </div>
        )}
        <div className="flex items-center gap-2">
          <input
            value={input}
            onChange={(e) => handleTyping(e.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                sendMessage();
              }
            }}
            placeholder="Type a message..."
            className={`flex-1 rounded-full border px-4 py-2.5 text-sm outline-none ${dark ? "border-zinc-800 bg-zinc-950 text-white" : "border-zinc-200 bg-white text-gray-900"}`}
          />
          <button
            onClick={sendMessage}
            className="rounded-full bg-indigo-500 p-2.5 text-white transition hover:bg-indigo-600"
            aria-label="Send message"
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
