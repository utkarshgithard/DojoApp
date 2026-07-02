"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { Message } from "@/lib/types";

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
  messagesByChat: Record<string, Message[]>;
  setChatState: (chatId: string, patch: Partial<ChatState>) => void;
  setMessagesForChat: (chatId: string, messages: Message[]) => void;
  appendMessageToChat: (chatId: string, message: Message) => void;
  updateMessageInChat: (chatId: string, message: Message) => void;
  removeMessageFromChat: (chatId: string, messageId: string) => void;
  setFriendForChat: (chatId: string, friend: any | null) => void;
  setLoadingMessagesForChat: (chatId: string, loading: boolean) => void;
  setLoadingFriendForChat: (chatId: string, loading: boolean) => void;
  cacheActivity: (chatId: string, message: Message, currentUserId?: string | null) => void;
  recentActivity: Record<string, { chatId: string; preview: string; ts: string; fromMe?: boolean; status?: string }>;
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

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [chats, setChats] = useState<Record<string, ChatState>>({});
  const [recentActivity, setRecentActivity] = useState<Record<string, { chatId: string; preview: string; ts: string; fromMe?: boolean; status?: string }>>({});
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
    setChatState(chatId, { messages, loadingMessages: false });
  }, [setChatState]);

  const appendMessageToChat = useCallback((chatId: string, message: Message) => {
    setChats((prev) => {
      const current = prev[chatId] || emptyChatState;
      return {
        ...prev,
        [chatId]: { ...current, messages: [...current.messages, message], loadingMessages: false },
      };
    });
  }, []);

  const updateMessageInChat = useCallback((chatId: string, message: Message) => {
    setChats((prev) => {
      const current = prev[chatId] || emptyChatState;
      const existing = current.messages;
      const index = existing.findIndex((entry) => message.clientId && entry.clientId && entry.clientId === message.clientId);
      if (index >= 0) {
        const next = [...existing];
        next[index] = { ...next[index], ...message };
        return { ...prev, [chatId]: { ...current, messages: next, loadingMessages: false } };
      }
      return { ...prev, [chatId]: { ...current, messages: [...existing, message], loadingMessages: false } };
    });
  }, []);

  const removeMessageFromChat = useCallback((chatId: string, messageId: string) => {
    setChats((prev) => {
      const current = prev[chatId];
      if (!current) return prev;
      return {
        ...prev,
        [chatId]: {
          ...current,
          messages: current.messages.filter((m) => m.id !== messageId),
        },
      };
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
          status: message.status,
        },
      };
      if (typeof window !== "undefined") {
        localStorage.setItem("friend_chat_activity", JSON.stringify(next));
      }
      return next;
    });
  }, []);

  const messagesByChat = useMemo(() => {
    const result: Record<string, Message[]> = {};
    for (const [chatId, state] of Object.entries(chats)) {
      result[chatId] = state.messages;
    }
    return result;
  }, [chats]);

  const value = useMemo(() => ({
    activeChatId,
    setActiveChatId,
    chats,
    messagesByChat,
    setChatState,
    setMessagesForChat,
    appendMessageToChat,
    updateMessageInChat,
    removeMessageFromChat,
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
  }), [
    activeChatId, chats, messagesByChat, recentActivity, 
    setChatState, setMessagesForChat, appendMessageToChat, updateMessageInChat, removeMessageFromChat,
    setFriendForChat, setLoadingMessagesForChat, setLoadingFriendForChat, cacheActivity,
    globalOnlineUsers, globalTypingUsers, unreadCounts
  ]);

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useChat() {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error("useChat must be used within a ChatProvider");
  }
  return context;
}