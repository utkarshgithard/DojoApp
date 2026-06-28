"use client";

import React, { useState, useEffect } from 'react';
import { useNotifications, Notification } from '@/context/NotificationContext';
import { useDarkMode } from '@/context/DarkModeContext';
import { useNetwork } from '@/context/NetworkContext';
import { useRouter } from 'next/navigation';
import { Bell, Heart, MessageSquare, Check, ArrowLeft, RefreshCw, User, UserPlus, Play, Film } from 'lucide-react';
import moment from 'moment';

export default function NotificationsPage() {
  const { notifications, unreadCount, loading, markAsRead, markAllAsRead, fetchNotifications } = useNotifications();
  const { darkMode } = useDarkMode() as any;
  const { followStates, toggleFollow, fetchNetwork, hasData } = useNetwork();
  const [loadingFollows, setLoadingFollows] = useState<Record<string, boolean>>({});
  const router = useRouter();

  const dark = darkMode;

  useEffect(() => {
    if (!hasData) {
      fetchNetwork();
    }
  }, [hasData, fetchNetwork]);
  const border = dark ? 'border-zinc-800' : 'border-zinc-200';
  const textMuted = dark ? 'text-zinc-400' : 'text-zinc-500';

  const [clickingId, setClickingId] = useState<string | null>(null);

  const handleNotificationClick = async (n: Notification) => {
    setClickingId(n.id);
    try {
      if (!n.read) {
        await markAsRead(n.id);
      }
      if (n.type === 'follow_request' || n.type === 'friendship_mutual') {
        router.push('/friends');
      } else if (n.postId) {
        router.push(`/community/post/${n.postId}`);
      } else {
        setClickingId(null);
      }
    } catch (err) {
      console.error(err);
      setClickingId(null);
    }
  };

  return (
    <div className={`min-h-screen pt-[76px] md:pt-[24px] transition-colors duration-300 ${dark ? 'bg-black text-white' : 'bg-white text-zinc-900'}`}>
      <div className="max-w-[720px] w-full mx-auto px-4 pb-12">
        
        {/* Header */}
        <div className={`sticky top-0 z-20 -mx-4 px-4 py-4 mb-6 backdrop-blur-md border-b ${dark ? 'bg-black/85 border-zinc-800' : 'bg-white/85 border-zinc-200'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.back()}
                className={`p-2 rounded-xl transition-all ${dark ? 'hover:bg-zinc-900 text-zinc-400 hover:text-white' : 'hover:bg-zinc-100 text-zinc-500 hover:text-zinc-800'}`}
                title="Go back"
              >
                <ArrowLeft size={18} />
              </button>
              <div>
                <h1 className="text-[20px] font-bold tracking-tight">Notifications</h1>
                <p className={`text-[12px] ${textMuted}`}>
                  {unreadCount > 0 ? `You have ${unreadCount} unread notification${unreadCount === 1 ? '' : 's'}` : 'Stay updated with your community'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => fetchNotifications()}
                disabled={loading}
                className={`p-2 rounded-xl border transition-all ${dark ? 'border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-900' : 'border-zinc-200 text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100'} disabled:opacity-40`}
                title="Refresh notifications"
              >
                <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
              </button>

              {notifications.length > 0 && unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[12px] font-semibold transition-all ${
                    dark 
                      ? 'border-indigo-500/30 bg-indigo-500/5 text-indigo-400 hover:bg-indigo-500/15' 
                      : 'border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
                  }`}
                >
                  <Check size={13} />
                  <span>Mark all read</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Notifications List — only show skeleton on first load (no cached data) */}
        {loading && notifications.length === 0 ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className={`border rounded-xl p-4 flex items-center gap-3 animate-pulse ${border} ${dark ? 'bg-zinc-900/40' : 'bg-zinc-50/50'}`}>
                <div className={`w-9 h-9 rounded-full ${dark ? 'bg-zinc-800' : 'bg-zinc-200'}`} />
                <div className="flex-1 space-y-1.5">
                  <div className={`h-3 w-1/3 rounded ${dark ? 'bg-zinc-850' : 'bg-zinc-250'}`} />
                  <div className={`h-2.5 w-2/3 rounded ${dark ? 'bg-zinc-850' : 'bg-zinc-250'}`} />
                </div>
              </div>
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <div className={`flex flex-col items-center justify-center py-16 text-center border border-dashed rounded-2xl ${dark ? 'border-zinc-800 bg-zinc-950/20' : 'border-zinc-200 bg-zinc-50/20'}`}>
            <div className={`p-4 rounded-full mb-3 ${dark ? 'bg-zinc-900 text-zinc-500 border border-zinc-800' : 'bg-zinc-50 text-zinc-400 border border-zinc-150'}`}>
              <Bell size={28} />
            </div>
            <h3 className="text-[15px] font-bold">No notifications yet</h3>
            <p className={`text-[12.5px] max-w-[280px] mt-1 leading-relaxed ${textMuted}`}>
              Likes, comments, and new followers will appear here.
            </p>
          </div>
        ) : (
          <div className={`rounded-2xl border divide-y overflow-hidden shadow-sm ${dark ? 'bg-zinc-950/40 border-zinc-800 divide-zinc-900' : 'bg-white border-zinc-200 divide-zinc-100'}`}>
            {notifications.map((n) => {
              const relativeTime = moment(n.createdAt).fromNow();

              let badgeBg = 'bg-indigo-600 text-white border-indigo-500';
              let badgeIcon = <MessageSquare size={9} fill="white" />;
              let bodyText = 'commented on your post.';

              if (n.type === 'like') {
                badgeBg = 'bg-rose-500 text-white border-rose-400';
                badgeIcon = <Heart size={9} fill="white" />;
                bodyText = 'liked your post.';
              } else if (n.type === 'follow_request') {
                badgeBg = 'bg-blue-500 text-white border-blue-400';
                badgeIcon = <UserPlus size={9} />;
                bodyText = 'started following you.';
              } else if (n.type === 'friendship_mutual') {
                badgeBg = 'bg-emerald-500 text-white border-emerald-400';
                badgeIcon = <User size={9} />;
                bodyText = 'and you are now friends! 🤝';
              }

              if (clickingId === n.id) {
                return (
                  <div key={n.id} className={`p-4 flex items-center gap-3.5 animate-pulse ${dark ? 'bg-zinc-900/40' : 'bg-zinc-50/50'}`}>
                    <div className={`w-10 h-10 rounded-full ${dark ? 'bg-zinc-800' : 'bg-zinc-200'}`} />
                    <div className="flex-1 space-y-2">
                      <div className={`h-3.5 w-1/4 rounded-lg ${dark ? 'bg-zinc-800' : 'bg-zinc-200'}`} />
                      <div className={`h-3 w-1/2 rounded-lg ${dark ? 'bg-zinc-850' : 'bg-zinc-250'}`} />
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={n.id}
                  onClick={() => handleNotificationClick(n)}
                  className={`p-4 flex items-start gap-3.5 transition-all cursor-pointer ${
                    !n.read 
                      ? dark 
                        ? 'bg-indigo-500/5 hover:bg-indigo-500/10' 
                        : 'bg-indigo-50/50 hover:bg-indigo-150/40' 
                      : dark 
                        ? 'hover:bg-zinc-900/40' 
                        : 'hover:bg-zinc-50/60'
                  }`}
                >
                  {/* Action Avatar with Status Icon Badge */}
                  <div className="relative shrink-0 select-none">
                    <div className={`w-10 h-10 rounded-full border overflow-hidden flex items-center justify-center bg-zinc-100 dark:bg-zinc-900 ${border}`}>
                      {n.sender.avatarUrl ? (
                        <img src={n.sender.avatarUrl} alt={n.sender.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-[13px] font-bold uppercase">{n.sender.name.charAt(0)}</span>
                      )}
                    </div>
                    
                    {/* Badge */}
                    <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center shadow border ${badgeBg}`}>
                      {badgeIcon}
                    </div>
                  </div>

                  {/* Body Copy */}
                  <div className="flex-1 min-w-0 space-y-1">
                    <p className="text-[13.5px] leading-snug break-words">
                      <span className="font-semibold text-current">{n.sender.name}</span>{' '}
                      {bodyText}
                    </p>

                    {/* Post Content Snippet — only show if no image/video attached */}
                    {n.post && !n.post.media?.length && (
                      <p className={`text-[12.5px] italic border-l-2 pl-2 truncate max-w-lg ${dark ? 'border-zinc-700 text-zinc-400' : 'border-zinc-200 text-zinc-500'}`}>
                        &ldquo;{n.post.content}&rdquo;
                      </p>
                    )}

                    <div className="flex items-center gap-2">
                      <span className={`text-[11px] ${textMuted}`}>{relativeTime}</span>
                      {!n.read && (
                        <>
                          <span className={`text-[10px] select-none ${textMuted}`}>&bull;</span>
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" title="Unread" />
                        </>
                      )}
                    </div>

                    {n.type === 'follow_request' && (
                      <div className="pt-2" onClick={(e) => e.stopPropagation()}>
                        {followStates[n.senderId] ? (
                          <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-semibold border ${
                            dark 
                              ? 'bg-zinc-900 border-zinc-800 text-zinc-450' 
                              : 'bg-zinc-100 border-zinc-200 text-zinc-600'
                          }`}>
                            <Check size={12} className="text-emerald-500" />
                            <span>Following Back</span>
                          </span>
                        ) : (
                          <button
                            disabled={loadingFollows[n.senderId]}
                            onClick={async () => {
                              setLoadingFollows(prev => ({ ...prev, [n.senderId]: true }));
                              try {
                                await toggleFollow(n.senderId);
                                if (!n.read) {
                                  await markAsRead(n.id);
                                }
                              } catch (err) {
                                console.error(err);
                              } finally {
                                setLoadingFollows(prev => ({ ...prev, [n.senderId]: false }));
                              }
                            }}
                            className={`inline-flex items-center justify-center min-w-[100px] h-7 px-3 rounded-lg text-xs font-semibold border transition-all ${
                              dark
                                ? 'border-indigo-500/30 bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20'
                                : 'border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
                            }`}
                          >
                            {loadingFollows[n.senderId] ? (
                              <div className="flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                                <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse [animation-delay:0.2s]" />
                                <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse [animation-delay:0.4s]" />
                              </div>
                            ) : (
                              <span className="flex items-center gap-1">
                                <UserPlus size={12} />
                                Follow Back
                              </span>
                            )}
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Post Image/Video Thumbnail (Right side) */}
                  {n.post?.media?.[0]?.url && (
                    <div className="relative w-11 h-11 rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-800 shrink-0 select-none">
                      {n.post.media[0].type === 'video' ? (
                        <div className="w-full h-full bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center">
                          <Film size={16} className="text-zinc-500" />
                          <div className="absolute inset-0 bg-black/25 flex items-center justify-center">
                            <Play size={10} className="text-white fill-white" />
                          </div>
                        </div>
                      ) : (
                        <img src={n.post.media[0].url} alt="Post preview" className="w-full h-full object-cover" />
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
