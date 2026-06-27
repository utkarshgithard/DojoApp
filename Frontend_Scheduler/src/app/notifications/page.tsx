"use client";

import React from 'react';
import { useNotifications, Notification } from '@/context/NotificationContext';
import { useDarkMode } from '@/context/DarkModeContext';
import { useRouter } from 'next/navigation';
import { Bell, Heart, MessageSquare, Check, ArrowLeft, RefreshCw, User, UserPlus } from 'lucide-react';
import moment from 'moment';

export default function NotificationsPage() {
  const { notifications, unreadCount, loading, markAsRead, markAllAsRead, fetchNotifications } = useNotifications();
  const { darkMode } = useDarkMode() as any;
  const router = useRouter();

  const dark = darkMode;
  const border = dark ? 'border-zinc-800' : 'border-zinc-200';
  const textMuted = dark ? 'text-zinc-400' : 'text-zinc-500';

  const handleNotificationClick = async (n: Notification) => {
    if (!n.read) {
      await markAsRead(n.id);
    }
    if (n.type === 'follow_request' || n.type === 'friendship_mutual') {
      router.push('/friends');
    } else if (n.postId) {
      router.push(`/community/post/${n.postId}`);
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

        {/* Notifications List */}
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

              let badgeBg = 'bg-indigo-650 text-white border-indigo-500';
              let badgeIcon = <MessageSquare size={9} fill="white" />;
              let bodyText = 'commented on your post.';

              if (n.type === 'like') {
                badgeBg = 'bg-rose-500 text-white border-rose-450';
                badgeIcon = <Heart size={9} fill="white" />;
                bodyText = 'liked your post.';
              } else if (n.type === 'follow_request') {
                badgeBg = 'bg-blue-500 text-white border-blue-450';
                badgeIcon = <UserPlus size={9} />;
                bodyText = 'started following you. Follow back to become friends!';
              } else if (n.type === 'friendship_mutual') {
                badgeBg = 'bg-emerald-500 text-white border-emerald-450';
                badgeIcon = <User size={9} />;
                bodyText = 'and you followed each other and are now friends! 🤝';
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

                    {/* Post Content Snippet Preview */}
                    {n.post && (
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
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
