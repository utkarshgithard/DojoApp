"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { Message } from "@/lib/types";
import { safeSetItem } from "@/lib/safeStorage";

interface ChatState {
  messages: Message[];
  friend: any | null;
  loadingMessages: boolean;
  loadingFriend: boolean;
}

type ChatContextValue = {
  activeChatId: string | null;
  setActiveChatId: (chatId: string | null) => void;
  chats: Record<string, ChatState>;
  setChatState: (chatId: string, patch: Partial<ChatState>) => void;
  setMessagesForChat: (chatId: string, messages: Message[]) => void;
  appendMessageToChat: (chatId: string, message: Message) => void;
  updateMessageInChat: (chatId: string, message: Message) => void;
  setFriendForChat: (chatId: string, friend: any | null) => void;
  setLoadingMessagesForChat: (chatId: string, loading: boolean) => void;
  setLoadingFriendForChat: (chatId: string, loading: boolean) => void;
  cacheActivity: (chatId: string, message: Message, currentUserId?: string | null) => void;
  recentActivity: Record<string, { chatId: string; preview: string; ts: string; fromMe?: boolean }>;
  globalOnlineUsers: Set<string>;
  setGlobalOnlineUsers: React.Dispatch<React.SetStateAction<Set<string>>>;
  globalTypingUsers: Record<string, string>;
  setGlobalTypingUsers: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  unreadCounts: Record<string, number>;
  setUnreadCounts: React.Dispatch<React.SetStateAction<Record<string, number>>>;
};

const ChatContext = createContext<ChatContextValue | null>(null);

const emptyChatState: ChatState = {
  messages: [],
  friend: null,
  loadingMessages: true,
  loadingFriend: true,
};

const dedupeMessages = (messages: Message[]): Message[] => {
  const byIdentity = new Map<string, Message>();
  for (const message of messages) {
    const identity = message.id || message.clientId;
    if (!identity) continue;
    byIdentity.set(identity, message);
  }
  return [...byIdentity.values()];
};

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [chats, setChats] = useState<Record<string, ChatState>>({});
  const [recentActivity, setRecentActivity] = useState<Record<string, { chatId: string; preview: string; ts: string; fromMe?: boolean }>>({});
  const [globalOnlineUsers, setGlobalOnlineUsers] = useState<Set<string>>(new Set());
  const [globalTypingUsers, setGlobalTypingUsers] = useState<Record<string, string>>({});
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const stored = localStorage.getItem("friend_chat_activity");
      if (stored) {
        setRecentActivity(JSON.parse(stored));
      }
    } catch {
      localStorage.removeItem("friend_chat_activity");
    }
  }, []);

  const setChatState = useCallback((chatId: string, patch: Partial<ChatState>) => {
    setChats((prev) => ({
      ...prev,
      [chatId]: { ...(prev[chatId] || emptyChatState), ...patch },
    }));
  }, []);

  const setMessagesForChat = useCallback((chatId: string, messages: Message[]) => {
    setChatState(chatId, { messages: dedupeMessages(messages), loadingMessages: false });
  }, [setChatState]);

  const appendMessageToChat = useCallback((chatId: string, message: Message) => {
    setChats((prev) => {
      const current = prev[chatId] || emptyChatState;
      const existingIndex = current.messages.findIndex((entry) =>
        entry.id === message.id || (message.clientId && entry.clientId === message.clientId)
      );
      if (existingIndex >= 0) {
        const messages = [...current.messages];
        messages[existingIndex] = { ...messages[existingIndex], ...message };
        return { ...prev, [chatId]: { ...current, messages: dedupeMessages(messages), loadingMessages: false } };
      }
      return {
        ...prev,
        [chatId]: { ...current, messages: dedupeMessages([...current.messages, message]), loadingMessages: false },
      };
    });
  }, []);

  const updateMessageInChat = useCallback((chatId: string, message: Message) => {
    setChats((prev) => {
      const current = prev[chatId] || emptyChatState;
      const existing = current.messages;
      const index = existing.findIndex((entry) =>
        entry.id === message.id || (message.clientId && entry.clientId === message.clientId)
      );
      if (index >= 0) {
        const next = [...existing];
        next[index] = { ...next[index], ...message };
        return { ...prev, [chatId]: { ...current, messages: dedupeMessages(next), loadingMessages: false } };
      }
      return { ...prev, [chatId]: { ...current, messages: dedupeMessages([...existing, message]), loadingMessages: false } };
    });
  }, []);

  const setFriendForChat = useCallback((chatId: string, friend: any | null) => {
    setChatState(chatId, { friend, loadingFriend: false });
  }, [setChatState]);

  const setLoadingMessagesForChat = useCallback((chatId: string, loading: boolean) => {
    setChatState(chatId, { loadingMessages: loading });
  }, [setChatState]);

  const setLoadingFriendForChat = useCallback((chatId: string, loading: boolean) => {
    setChatState(chatId, { loadingFriend: loading });
  }, [setChatState]);

  const cacheActivity = useCallback((chatId: string, message: Message, currentUserId?: string | null) => {
    setRecentActivity((prev) => {
      const next = {
        ...prev,
        [chatId]: {
          chatId,
          preview: message.text || "",
          ts: message.ts ? new Date(message.ts).toISOString() : new Date().toISOString(),
          fromMe: String(message.userId) === String(currentUserId || ""),
        },
      };
      if (typeof window !== "undefined") {
        // Never fatal: quota errors here used to crash every page.
        safeSetItem("friend_chat_activity", JSON.stringify(next));
      }
      return next;
    });
  }, []);

  const value = useMemo(() => ({
    activeChatId,
    setActiveChatId,
    chats,
    setChatState,
    setMessagesForChat,
    appendMessageToChat,
    updateMessageInChat,
    setFriendForChat,
    setLoadingMessagesForChat,
    setLoadingFriendForChat,
    cacheActivity,
    recentActivity,
    globalOnlineUsers,
    setGlobalOnlineUsers,
    globalTypingUsers,
    setGlobalTypingUsers,
    unreadCounts,
    setUnreadCounts,
  }), [activeChatId, chats, recentActivity, globalOnlineUsers, globalTypingUsers, unreadCounts, setChatState, setMessagesForChat, appendMessageToChat, updateMessageInChat, setFriendForChat, setLoadingMessagesForChat, setLoadingFriendForChat, cacheActivity]);

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useChat() {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error("useChat must be used within a ChatProvider");
  }
  return context;
}
