"use client";

import React, { useMemo, useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/context/authContext";
import { useAttendance } from "@/context/AttendanceContext";
import { useDarkMode } from "@/context/DarkModeContext";
import { useSocket } from "@/context/SocketContext";
import { useChat } from "@/context/ChatContext";
import { MessageSquare, Search, Loader2 } from "lucide-react";

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
    setGlobalTypingUsers
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

    return () => {
      socket.off("newChatMessage", handleIncomingMessage);
      socket.off("initialOnlineFriends", handleInitialOnline);
      socket.off("globalUserOnline", handleGlobalUserOnline);
      socket.off("globalUserOffline", handleGlobalUserOffline);
      socket.off("userTyping", handleUserTyping);
    };
  }, [cacheActivity, currentUserId, socket, setGlobalOnlineUsers, setGlobalTypingUsers]);

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

  // Determine avatar gradient background based on name
  const getAvatarGradient = (name: string) => {
    const colors = [
      "from-indigo-500 to-purple-500",
      "from-blue-500 to-cyan-500",
      "from-emerald-500 to-teal-500",
      "from-rose-500 to-orange-500",
      "from-pink-500 to-rose-500",
      "from-purple-500 to-pink-500",
    ];
    let sum = 0;
    const cleanName = name || "User";
    for (let i = 0; i < cleanName.length; i++) {
      sum += cleanName.charCodeAt(i);
    }
    return colors[sum % colors.length];
  };

  const handleFriendClick = (friend: any) => {
    const sortedIds = [currentUserId, friend.id].sort();
    const chatId = `friend_${sortedIds[0]}_${sortedIds[1]}`;
    router.push(`/chat/${chatId}`);
  };

  return (
    <div className={`h-[calc(100vh-72px)] w-full flex ${bg} overflow-hidden font-sans relative`}>
      {/* LEFT PANE: Friends list (hidden on mobile if chat is active) */}
      <div
        className={`
          flex-col border-r ${border} bg-white dark:bg-black shrink-0 w-full md:w-80 lg:w-[320px]
          ${isChatActive ? "hidden md:flex" : "flex"}
        `}
      >
        {/* Header */}
        <div className={`px-4 py-4 border-b ${border} shrink-0 space-y-3`}>
          <div className="flex items-center gap-2">
            <MessageSquare className="text-indigo-500" size={18} />
            <h1 className="text-[17px] font-bold tracking-tight">Chats</h1>
          </div>

          {/* Search bar */}
          <div className="relative">
            <Search className={`absolute left-3 top-1/2 -translate-y-1/2 ${muted}`} size={14} />
            <input
              type="text"
              placeholder="Search chat..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className={`
                w-full pl-9 pr-4 py-2 text-[12.5px] rounded-xl border outline-none transition-colors
                ${dark 
                  ? "bg-zinc-950 border-zinc-800 text-white placeholder-zinc-700 focus:border-zinc-700" 
                  : "bg-zinc-50 border-zinc-200 text-zinc-900 placeholder-zinc-400 focus:border-zinc-300"
                }
              `}
            />
          </div>
        </div>

        {/* Friends list scroll area */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
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
                    w-full text-left p-3 rounded-xl flex items-center gap-3 transition-colors border border-transparent
                    ${isActive
                      ? dark
                        ? "bg-zinc-900/80 border-zinc-800 text-white"
                        : "bg-zinc-100 border-zinc-200 text-zinc-900 font-medium"
                      : dark
                      ? "hover:bg-zinc-950/60"
                      : "hover:bg-zinc-50/60"
                    }
                  `}
                >
                  {/* Avatar */}
                  <div className="relative shrink-0">
                    {f.avatarUrl ? (
                      <div className="w-9 h-9 rounded-full overflow-hidden border border-zinc-200 dark:border-zinc-800">
                        <img src={f.avatarUrl} alt={f.name} className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div className={`w-9 h-9 rounded-full bg-gradient-to-tr ${getAvatarGradient(f.name)} flex items-center justify-center text-white font-bold text-sm`}>
                        {f.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    {/* Online indicator */}
                    {globalOnlineUsers.has(f.id) && (
                      <span className="absolute bottom-0 right-0 flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 border border-white dark:border-black"></span>
                      </span>
                    )}
                  </div>

                  {/* Name details */}
                  <div className="min-w-0 flex-1">
                    <p className={`text-[13px] font-semibold truncate flex justify-between items-center ${isActive ? "text-indigo-500 dark:text-indigo-400" : ""}`}>
                      <span>{f.name}</span>
                    </p>
                    <p className={`text-[10px] ${muted} truncate`}>
                      {globalTypingUsers[f.id] === expectedChatId
                        ? <span className="text-indigo-500 font-medium">Typing...</span>
                        : recent?.preview
                          ? `${recent.fromMe ? "You: " : ""}${recent.preview}`
                          : isActive
                            ? "Active conversation"
                            : "Tap to open chat"}
                    </p>
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
