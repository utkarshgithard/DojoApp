"use client";

import React, { useMemo, useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/context/authContext";
import { useAttendance } from "@/context/AttendanceContext";
import { useDarkMode } from "@/context/DarkModeContext";
import { useSocket } from "@/context/SocketContext";
import { useChat } from "@/context/ChatContext";
import { MessageSquare, Search, Loader2, MoreVertical } from "lucide-react";
import ChatAvatar from "@/components/chat/ChatAvatar";

export default function ChatLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading, userId: currentUserId } = useAuth() as any;
  const { friends, friendsLoading, fetchFriends } = useAttendance() as any;
  const { darkMode } = useDarkMode() as any;
  const { socket } = useSocket() as any;
  const { 
    recentActivity: sharedRecentActivity, 
    cacheActivity,
    globalOnlineUsers,
    setGlobalOnlineUsers,
    globalTypingUsers,
    setGlobalTypingUsers,
    unreadCounts,
    setUnreadCounts
  } = useChat();
  const router = useRouter();
  const params = useParams();
  const activeChatId = params?.id as string | undefined;

  const [query, setQuery] = useState("");

  // Use context recentActivity as the single source of truth
  const recentActivity = sharedRecentActivity;

  useEffect(() => {
    if (isAuthenticated) {
      fetchFriends();
    }
  }, [isAuthenticated, fetchFriends]);

  useEffect(() => {
    if (!socket) return;

    const handleIncomingMessage = (message: any) => {
      if (!message?.chatId) return;
      cacheActivity(message.chatId, message, currentUserId);
      if (message.chatId !== activeChatId && String(message.userId) !== String(currentUserId)) {
        setUnreadCounts((prev: Record<string, number>) => ({
          ...prev,
          [message.chatId]: (prev[message.chatId] || 0) + 1
        }));
      }
    };

    const handleSyncUnread = (counts: Record<string, number>) => {
      setUnreadCounts(counts);
    };

    const handleInitialOnline = (data: { onlineUsers: string[] }) => {
      setGlobalOnlineUsers(new Set(data.onlineUsers || []));
    };

    const handleGlobalUserOnline = (data: { userId: string }) => {
      if (!data.userId) return;
      setGlobalOnlineUsers(prev => {
        const next = new Set(prev);
        next.add(data.userId);
        return next;
      });
    };

    const handleGlobalUserOffline = (data: { userId: string }) => {
      if (!data.userId) return;
      setGlobalOnlineUsers(prev => {
        const next = new Set(prev);
        next.delete(data.userId);
        return next;
      });
    };

    const handleUserTyping = (data: { userId: string; isTyping: boolean; chatId: string }) => {
      if (!data.userId) return;
      setGlobalTypingUsers(prev => {
        const next = { ...prev };
        if (data.isTyping) {
          next[data.userId] = data.chatId;
        } else {
          delete next[data.userId];
        }
        return next;
      });
    };

    socket.on("newChatMessage", handleIncomingMessage);
    socket.on("initialOnlineFriends", handleInitialOnline);
    socket.on("globalUserOnline", handleGlobalUserOnline);
    socket.on("globalUserOffline", handleGlobalUserOffline);
    socket.on("userTyping", handleUserTyping);
    socket.on("syncUnreadCounts", handleSyncUnread);

    return () => {
      socket.off("newChatMessage", handleIncomingMessage);
      socket.off("initialOnlineFriends", handleInitialOnline);
      socket.off("globalUserOnline", handleGlobalUserOnline);
      socket.off("globalUserOffline", handleGlobalUserOffline);
      socket.off("userTyping", handleUserTyping);
      socket.off("syncUnreadCounts", handleSyncUnread);
    };
  }, [cacheActivity, currentUserId, socket, setGlobalOnlineUsers, setGlobalTypingUsers, activeChatId, setUnreadCounts]);

  const dark = darkMode;
  const border = dark ? "border-zinc-800" : "border-zinc-200";
  const bg = dark ? "bg-black text-white" : "bg-white text-zinc-900";
  const surfaceBg = dark ? "bg-zinc-950/40" : "bg-zinc-50/40";
  const muted = dark ? "text-zinc-400" : "text-zinc-500";

  const getChatIdForFriend = (friendId: string) => {
    if (!currentUserId) return `friend_${friendId}`;
    const sortedIds = [currentUserId, friendId].sort();
    return `friend_${sortedIds[0]}_${sortedIds[1]}`;
  };

  const filteredFriends = (friends || []).filter((f: any) =>
    f.name?.toLowerCase().includes(query.toLowerCase())
  );

  const sortedFriends = useMemo(() => {
    return [...filteredFriends].sort((a: any, b: any) => {
      const aChatId = getChatIdForFriend(a.id);
      const bChatId = getChatIdForFriend(b.id);
      const aTime = recentActivity[aChatId]?.ts ? new Date(recentActivity[aChatId].ts).getTime() : 0;
      const bTime = recentActivity[bChatId]?.ts ? new Date(recentActivity[bChatId].ts).getTime() : 0;
      return bTime - aTime || a.name.localeCompare(b.name);
    });
  }, [filteredFriends, recentActivity, currentUserId]);

  if (loading) {
    return (
      <div className={`min-h-[calc(100vh-72px)] flex justify-center items-center ${darkMode ? "bg-[#0a0a0a]" : "bg-[#f5f5f5]"}`}>
        <Loader2 size={24} className="animate-spin text-indigo-500" />
      </div>
    );
  }

  // Check if we are on a specific chat subroute
  const isChatActive = !!activeChatId;

  const handleFriendClick = (friend: any) => {
    const sortedIds = [currentUserId, friend.id].sort();
    const chatId = `friend_${sortedIds[0]}_${sortedIds[1]}`;
    router.push(`/chat/${chatId}`);
  };

  return (
    <div className={`h-[calc(100dvh-76px)] mt-[76px] md:h-screen md:mt-0 w-full flex ${bg} overflow-hidden font-sans relative`}>
      {/* LEFT PANE: Friends list (hidden on mobile if chat is active) */}
      <div
        className={`
          flex-col border-r ${border} bg-white dark:bg-black shrink-0 w-full md:w-80 lg:w-[320px]
          ${isChatActive ? "hidden md:flex" : "flex"}
        `}
      >
        {/* Header */}
        <div className={`px-5 pt-[22px] pb-[14px] shrink-0`}>
          <div className="flex items-center justify-between mb-[18px]">
            <h1 className="text-[22px] font-bold tracking-tight font-sans">Chats</h1>
            <div className={`w-[34px] h-[34px] rounded-[10px] flex items-center justify-center cursor-pointer transition-colors ${dark ? 'bg-zinc-900 hover:bg-zinc-800' : 'bg-[#F3F1FA] hover:bg-[#ECE9F8]'}`}>
              <MoreVertical size={17} className={muted} />
            </div>
          </div>

          {/* Search bar */}
          <div className="relative">
            <Search className={`absolute left-[13px] top-1/2 -translate-y-1/2 ${muted}`} size={16} />
            <input
              type="text"
              placeholder="Search chats"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className={`
                w-full pl-[36px] pr-3 py-[10px] text-[13.5px] rounded-xl outline-none transition-colors border
                ${dark 
                  ? "bg-zinc-950 border-zinc-800 text-white placeholder-zinc-600 focus:border-zinc-700" 
                  : "bg-[#F3F1FA] border-[#E7E3F3] text-[#15131F] placeholder-[#8D89A3] focus:border-[#D8D4EA]"
                }
              `}
            />
          </div>
        </div>

        {/* Friends list scroll area */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-[#D8D4EA] dark:[&::-webkit-scrollbar-thumb]:bg-zinc-800 [&::-webkit-scrollbar-thumb]:rounded-full">
          {friendsLoading ? (
            <div className="space-y-2 animate-pulse p-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className={`p-3 rounded-xl border flex items-center gap-3 ${border}`}>
                  <div className="w-9 h-9 rounded-full bg-gray-200 dark:bg-zinc-800 shrink-0"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-3 bg-gray-200 dark:bg-zinc-800 rounded w-1/3"></div>
                    <div className="h-2.5 bg-gray-200 dark:bg-zinc-800 rounded w-2/3"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : filteredFriends.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center px-4">
              <p className={`text-[12.5px] ${muted} leading-relaxed`}>
                {query ? "No friends match your search." : "No friends added yet. Go to Friends tab to add buddies."}
              </p>
            </div>
          ) : (
            sortedFriends.map((f: any) => {
              const expectedChatId = getChatIdForFriend(f.id);
              const isActive = activeChatId === expectedChatId;
              const recent = recentActivity[expectedChatId];

              return (
                <button
                  key={f.id}
                  onClick={() => handleFriendClick(f)}
                  className={`
                    w-full text-left px-2.5 py-2.5 rounded-[14px] flex items-center gap-3 transition-colors mb-0.5
                    ${isActive
                      ? dark
                        ? "bg-zinc-900/80"
                        : "bg-[#EFEAFB]"
                      : dark
                      ? "hover:bg-zinc-950/60"
                      : "hover:bg-[#ECE9F8]"
                    }
                  `}
                >
                  <ChatAvatar 
                    name={f.name} 
                    avatarUrl={f.avatarUrl} 
                    size={46} 
                    online={globalOnlineUsers.has(f.id)} 
                    ring={true}
                  />

                  {/* Name details */}
                  <div className="min-w-0 flex-1">
                    <div className="flex justify-between items-baseline">
                      <span className={`text-[14.5px] font-semibold truncate ${isActive ? (dark ? "text-[#9B7BF2]" : "text-[#4A22B0]") : (dark ? "text-white" : "text-[#15131F]")}`}>
                        {f.name}
                      </span>
                      <span className={`text-[11px] shrink-0 ml-1.5 ${muted}`}>
                        {/* If recent activity time, could show it here */}
                        {recent?.ts ? new Date(recent.ts).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : ""}
                      </span>
                    </div>
                    <div className="flex justify-between items-center mt-0.5">
                      <span className={`text-[12.5px] truncate ${unreadCounts[expectedChatId] > 0 ? "text-[#6C3CE9] font-medium" : muted}`}>
                        {globalTypingUsers[f.id] === expectedChatId
                          ? <span className="text-[#6C3CE9] font-medium">Typing...</span>
                          : recent?.preview
                            ? `${recent.fromMe ? "You: " : ""}${recent.preview.startsWith('AUDIO::') ? '🎤 Voice Message' : recent.preview.startsWith('IMAGE::') ? '🖼️ Image' : recent.preview.startsWith('FILE::') ? '📄 File' : recent.preview}`
                            : isActive
                              ? "Active conversation"
                              : "Tap to open chat"}
                      </span>
                      {unreadCounts[expectedChatId] > 0 ? (
                        <span className="bg-[#FF5D5D] text-white text-[10.5px] font-bold min-w-[18px] h-[18px] rounded-full flex items-center justify-center px-1.5 ml-1.5 shrink-0">
                          {unreadCounts[expectedChatId] > 99 ? '99+' : unreadCounts[expectedChatId]}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* RIGHT PANE: Chat area / children (hidden on mobile if no chat is active) */}
      <div className={`flex-1 flex flex-col overflow-hidden ${!isChatActive ? "hidden md:flex" : "flex"}`}>
        {children}
      </div>
    </div>
  );
}
