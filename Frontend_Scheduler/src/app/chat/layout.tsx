"use client";

import React, { useMemo, useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/context/authContext";
import { useAttendance } from "@/context/AttendanceContext";
import { useDarkMode } from "@/context/DarkModeContext";
import { useSocket } from "@/context/SocketContext";
import { useChat } from "@/context/ChatContext";
import { MessageSquare, Search, Loader2, MoreVertical, CornerUpRight, X, Check } from "lucide-react";
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
    setUnreadCounts,
    forwardingMessages,
    setForwardingMessages,
  } = useChat();
  const router = useRouter();
  const params = useParams();
  const activeChatId = params?.id as string | undefined;

  const [query, setQuery] = useState("");
  const [forwardTargets, setForwardTargets] = useState<Set<string>>(new Set());
  const [isSendingForward, setIsSendingForward] = useState(false);

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

  const isForwarding = !!forwardingMessages && forwardingMessages.length > 0;

  const handleFriendClick = (friend: any) => {
    if (isForwarding) {
      // Toggle selection in forwarding mode
      setForwardTargets(prev => {
        const next = new Set(prev);
        if (next.has(friend.id)) next.delete(friend.id);
        else next.add(friend.id);
        return next;
      });
      return;
    }
    router.push(`/chat/${friend.id}`);
  };

  const handleSendForwardFromLayout = async () => {
    if (!socket || !forwardingMessages || forwardTargets.size === 0) return;
    setIsSendingForward(true);
    for (const friendId of Array.from(forwardTargets)) {
      const sortedIds = [currentUserId, friendId].sort();
      const targetChatId = `friend_${sortedIds[0]}_${sortedIds[1]}`;
      for (const msg of forwardingMessages) {
        const clientId = `client_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        const isMedia = msg.text.startsWith('AUDIO::') || msg.text.startsWith('IMAGE::') || msg.text.startsWith('FILE::');
        socket.emit('sendChatMessage', {
          chatId: targetChatId,
          text: isMedia ? msg.text : `↗ Forwarded\n${msg.text}`,
          clientId,
        });
        await new Promise(r => setTimeout(r, 30));
      }
    }
    setIsSendingForward(false);
    setForwardingMessages(null);
    setForwardTargets(new Set());
  };

  const cancelForwarding = () => {
    setForwardingMessages(null);
    setForwardTargets(new Set());
  };

  return (
    <div className={`
      w-full flex ${bg} overflow-hidden font-sans relative
      ${isChatActive ? "h-[100dvh] mt-0 md:h-screen" : "h-[calc(100dvh-49px)] mt-[49px] md:h-screen md:mt-0"}
    `}>
      {/* LEFT PANE: Friends list (hidden on mobile if chat is active) */}
      <div
        className={`
          relative flex flex-col h-full border-r ${border} bg-white dark:bg-black shrink-0 w-full md:w-80 lg:w-[320px] overflow-hidden
          ${isChatActive ? "hidden md:flex" : "flex"}
        `}
      >
        {/* Header — swaps to forwarding mode banner */}
        <div className={`px-5 pt-[22px] pb-[14px] shrink-0`}>
          {isForwarding ? (
            <>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <CornerUpRight size={18} className="text-indigo-500" />
                  <div>
                    <h1 className="text-[16px] font-bold tracking-tight">Forward to</h1>
                    <p className={`text-[11.5px] ${muted}`}>{forwardingMessages!.length} message{forwardingMessages!.length !== 1 ? 's' : ''}</p>
                  </div>
                </div>
                <button
                  onClick={cancelForwarding}
                  className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${dark ? 'bg-zinc-900 hover:bg-zinc-800' : 'bg-zinc-100 hover:bg-zinc-200'}`}
                >
                  <X size={16} className={muted} />
                </button>
              </div>
              {/* Search within forwarding mode */}
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
            </>
          ) : (
            <>
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
            </>
          )}
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
                const isForwardSelected = forwardTargets.has(f.id);

                return (
                  <button
                    key={f.id}
                    onClick={() => handleFriendClick(f)}
                    className={`
                      w-full text-left px-2.5 py-2.5 rounded-[14px] flex items-center gap-3 transition-colors mb-0.5
                      ${isForwarding && isForwardSelected
                        ? dark ? "bg-indigo-500/15 ring-1 ring-indigo-500/30" : "bg-indigo-50 ring-1 ring-indigo-200"
                        : isActive && !isForwarding
                          ? dark ? "bg-zinc-900/80" : "bg-[#EFEAFB]"
                          : dark ? "hover:bg-zinc-950/60" : "hover:bg-[#ECE9F8]"
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
                        <span className={`text-[14.5px] font-semibold truncate ${isActive && !isForwarding ? (dark ? "text-[#9B7BF2]" : "text-[#4A22B0]") : (dark ? "text-white" : "text-[#15131F]")}`}>
                          {f.name}
                        </span>
                        {!isForwarding && (
                          <span className={`text-[11px] shrink-0 ml-1.5 ${muted}`}>
                            {recent?.ts ? new Date(recent.ts).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : ""}
                          </span>
                        )}
                      </div>
                      <div className="flex justify-between items-center mt-0.5">
                        <span className={`text-[12.5px] truncate ${!isForwarding && unreadCounts[expectedChatId] > 0 ? "text-[#6C3CE9] font-medium" : muted}`}>
                          {isForwarding
                            ? (globalOnlineUsers.has(f.id) ? 'Active now' : 'Offline')
                            : globalTypingUsers[f.id] === expectedChatId
                              ? <span className="text-[#6C3CE9] font-medium">Typing...</span>
                              : recent?.preview
                                ? (recent.preview === "$$DELETED$$" || recent.preview === "You deleted this message" || recent.preview === "This message was deleted")
                                  ? (recent.fromMe ? "You deleted this message" : "This message was deleted")
                                  : `${recent.fromMe ? "You: " : ""}${recent.preview.startsWith('AUDIO::') ? '🎤 Voice Message' : recent.preview.startsWith('IMAGE::') ? '🖼️ Image' : recent.preview.startsWith('FILE::') ? '📄 File' : recent.preview}`
                                : isActive
                                  ? "Active conversation"
                                  : "Tap to open chat"}
                        </span>
                        {/* Checkbox when forwarding, unread badge otherwise */}
                        {isForwarding ? (
                          <div className={`shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                            isForwardSelected ? 'bg-[#6C3CE9] border-[#6C3CE9]' : dark ? 'border-zinc-600' : 'border-zinc-300'
                          }`}>
                            {isForwardSelected && <Check size={11} color="white" strokeWidth={3} />}
                          </div>
                        ) : (
                          unreadCounts[expectedChatId] > 0 ? (
                            <span className="bg-[#FF5D5D] text-white text-[10.5px] font-bold min-w-[18px] h-[18px] rounded-full flex items-center justify-center px-1.5 ml-1.5 shrink-0">
                              {unreadCounts[expectedChatId] > 99 ? '99+' : unreadCounts[expectedChatId]}
                            </span>
                          ) : null
                        )}
                      </div>
                    </div>
                  </button>
                );
              })
          )}
        </div>

        {/* Floating Send button in forwarding mode */}
        {isForwarding && (
          <button
            onClick={handleSendForwardFromLayout}
            disabled={forwardTargets.size === 0 || isSendingForward}
            className={`absolute bottom-20 md:bottom-8 right-6 z-30 w-14 h-14 rounded-full flex items-center justify-center text-white transition-all duration-300 shadow-2xl ${
              forwardTargets.size > 0 && !isSendingForward
                ? 'opacity-100 translate-y-0 scale-100 hover:scale-105 active:scale-95 cursor-pointer shadow-indigo-500/40'
                : 'opacity-0 translate-y-20 scale-90 pointer-events-none'
            }`}
            style={{
              background: 'linear-gradient(135deg, #6C3CE9, #4A22B0)',
            }}
            aria-label="Send forwarded messages"
          >
            {isSendingForward ? (
              <Loader2 className="animate-spin" size={22} />
            ) : (
              <div className="relative">
                <CornerUpRight size={22} strokeWidth={2.5} />
                {forwardTargets.size > 0 && (
                  <span className="absolute -top-3.5 -right-3.5 bg-red-500 text-white text-[10px] font-black w-[18px] h-[18px] rounded-full flex items-center justify-center border-2 border-white dark:border-zinc-950 animate-scale-in">
                    {forwardTargets.size}
                  </span>
                )}
              </div>
            )}
          </button>
        )}
      </div>

      {/* RIGHT PANE: Chat area / children (hidden on mobile if no chat is active) */}
      <div className={`flex-1 flex flex-col overflow-hidden ${!isChatActive ? "hidden md:flex" : "flex"}`}>
        {children}
      </div>
    </div>
  );
}
