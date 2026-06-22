'use client';

import React, { useEffect, useState } from 'react';
import { useCommunity, SharedPost } from '@/context/CommunityContext';
import { Inbox, Loader2, ChevronDown, ChevronUp, Heart, MessageCircle } from 'lucide-react';
import { formatDistanceToNowStrict } from 'date-fns';
import { useRouter } from 'next/navigation';
import API from '@/lib/axios';

interface SharedInboxProps {
  dark: boolean;
  isPage?: boolean;
}

function SharedInboxSkeleton({ dark }: { dark: boolean }) {
  return (
    <div className={`divide-y ${dark ? 'divide-zinc-800/60' : 'divide-zinc-100'}`}>
      {[1, 2].map((i) => (
        <div key={i} className="flex gap-3 px-4 py-4 animate-pulse">
          {/* Avatar Skeleton */}
          <div className={`w-8 h-8 rounded-full shrink-0 ${dark ? 'bg-zinc-800' : 'bg-zinc-200'}`} />

          {/* Chat Message Bubble Skeleton */}
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex items-center gap-1.5 flex-wrap">
              <div className={`h-3 w-20 rounded ${dark ? 'bg-zinc-800' : 'bg-zinc-200'}`} />
              <div className={`h-2.5 w-32 rounded ${dark ? 'bg-zinc-800' : 'bg-zinc-200'}`} />
            </div>

            {/* Inner Card Skeleton */}
            <div className={`mt-2 rounded-xl border p-3 space-y-2.5 ${dark ? 'bg-zinc-950/80 border-zinc-800/80' : 'bg-zinc-50 border-zinc-200/80'}`}>
              <div className="flex items-center gap-2">
                <div className={`w-6 h-6 rounded-full ${dark ? 'bg-zinc-800' : 'bg-zinc-200'}`} />
                <div className={`h-2.5 w-16 rounded ${dark ? 'bg-zinc-800' : 'bg-zinc-200'}`} />
              </div>
              <div className="space-y-1.5">
                <div className={`h-2.5 w-full rounded ${dark ? 'bg-zinc-800' : 'bg-zinc-200'}`} />
                <div className={`h-2.5 w-5/6 rounded ${dark ? 'bg-zinc-800' : 'bg-zinc-200'}`} />
              </div>
              <div className={`h-2.5 w-12 rounded mt-2 ${dark ? 'bg-zinc-850' : 'bg-zinc-200'}`} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function SharedInbox({ dark, isPage = false }: SharedInboxProps) {
  const router = useRouter();
  const {
    shares,
    sharesLoading: sharesLoadingState,
    hasSharesData,
    sharesNextCursor,
    sharesTotalCount,
    fetchShares,
    markShareReadLocal,
  } = useCommunity();

  const loading = sharesLoadingState && !hasSharesData;
  const [collapsed, setCollapsed] = useState(false);
  const [showingHistory, setShowingHistory] = useState(false);

  useEffect(() => {
    if (!hasSharesData) {
      fetchShares();
    }
  }, [hasSharesData, fetchShares]);

  const colors = [
    'from-indigo-400 to-purple-500',
    'from-pink-400 to-rose-500',
    'from-emerald-400 to-teal-500',
    'from-amber-400 to-orange-500',
    'from-blue-400 to-cyan-500',
  ];

  const getAvatar = (name: string, avatarUrl?: string | null, size = 'w-7 h-7') => {
    if (avatarUrl) {
      return (
        <img
          src={avatarUrl}
          alt={name}
          referrerPolicy="no-referrer"
          className={`${size} rounded-full object-cover shrink-0`}
        />
      );
    }
    const colorIdx = name.charCodeAt(0) % colors.length;
    return (
      <div className={`${size} rounded-full flex items-center justify-center text-[11px] font-bold text-white bg-gradient-to-br ${colors[colorIdx]} shrink-0`}>
        {name.charAt(0).toUpperCase()}
      </div>
    );
  };

  const handleLoadMore = () => {
    if (!showingHistory) {
      setShowingHistory(true);
      fetchShares(false, false, true);
    } else {
      fetchShares(false, true, true);
    }
  };

  const displayedShares = showingHistory ? shares : shares.filter(s => !s.viewed);

  const showBody = isPage ? true : !collapsed;

  return (
    <div className={isPage ? "w-full" : `rounded-xl border overflow-hidden shadow-sm ${dark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'}`}>
      {/* Header */}
      {!isPage && (
        <button
          onClick={() => setCollapsed((v) => !v)}
          className={`w-full flex items-center justify-between px-4 py-3.5 transition-colors ${dark ? 'hover:bg-zinc-800/50' : 'hover:bg-zinc-50'}`}
        >
          <div className="flex items-center gap-2">
            <Inbox size={14} className={dark ? 'text-indigo-400' : 'text-indigo-500'} />
            <span className={`text-[13px] font-semibold ${dark ? 'text-white' : 'text-zinc-800'}`}>
              Shared with me
            </span>
            {sharesTotalCount > 0 && (
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${dark ? 'bg-indigo-500/20 text-indigo-400' : 'bg-indigo-100 text-indigo-700'}`}>
                {sharesTotalCount}
              </span>
            )}
          </div>
          {collapsed ? (
            <ChevronDown size={14} className={dark ? 'text-zinc-500' : 'text-zinc-400'} />
          ) : (
            <ChevronUp size={14} className={dark ? 'text-zinc-500' : 'text-zinc-400'} />
          )}
        </button>
      )}

      {/* Body */}
      {showBody && (
        <div className={isPage ? "" : `border-t ${dark ? 'border-zinc-800' : 'border-zinc-100'}`}>
          {loading ? (
            <SharedInboxSkeleton dark={dark} />
          ) : displayedShares.length === 0 ? (
            <div className="py-8 text-center px-4">
              <p className={`text-[12.5px] mb-3.5 ${dark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                No recent shares
              </p>
              {!showingHistory && (
                <button
                  onClick={handleLoadMore}
                  disabled={sharesLoadingState}
                  className={`px-4 py-1.5 rounded-lg border text-[11.5px] font-semibold transition-all ${
                    dark
                      ? 'border-zinc-800 text-zinc-350 hover:text-white hover:bg-zinc-800'
                      : 'border-zinc-200 text-zinc-650 hover:text-zinc-850 hover:bg-zinc-50'
                  }`}
                >
                  Show viewed history
                </button>
              )}
            </div>
          ) : (
            <div className="flex flex-col max-h-[60vh]">
              <div className={`divide-y ${dark ? 'divide-zinc-800/60' : 'divide-zinc-100'} overflow-y-auto scrollbar-thin flex-1`}>
                {displayedShares.map((item) => (
                  <div
                    key={item.shareId}
                    className={`flex gap-3 px-4 py-4 hover:bg-zinc-50/40 dark:hover:bg-zinc-800/20 transition-colors ${
                      item.viewed ? 'opacity-65' : ''
                    }`}
                  >
                    {/* Sender Avatar */}
                    <button
                      onClick={() => router.push(`/user/${item.sender.id}`)}
                      className="focus:outline-none shrink-0"
                    >
                      {getAvatar(item.sender.name, item.sender.avatarUrl, 'w-8 h-8')}
                    </button>

                    {/* Chat Message Bubble */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-1.5 flex-wrap">
                        <button
                          onClick={() => router.push(`/user/${item.sender.id}`)}
                          className={`text-[12.5px] font-bold hover:underline ${dark ? 'text-zinc-200' : 'text-zinc-800'}`}
                        >
                          {item.sender.name}
                        </button>
                        <span className={`text-[11.5px] ${dark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                          shared a post with you
                        </span>
                        {item.viewed && (
                          <span className={`text-[9px] font-semibold px-1 rounded bg-zinc-100 dark:bg-zinc-800 ${dark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                            Viewed
                          </span>
                        )}
                        <span className={`text-[10px] ml-auto shrink-0 ${dark ? 'text-zinc-600' : 'text-zinc-400'}`}>
                          {formatDistanceToNowStrict(new Date(item.sharedAt), { addSuffix: true })}
                        </span>
                      </div>

                      {/* Shared post preview card */}
                      <div
                        onClick={() => {
                          // Mark as viewed locally immediately
                          markShareReadLocal(item.shareId);
                          // Post to backend read endpoint in background
                          API.post(`/community/shares/${item.shareId}/read`).catch((err) => {
                            console.error('Failed to mark share as read', err);
                          });
                          // Navigate to dynamic post page immediately
                          router.push(`/community/post/${item.post.id}`);
                        }}
                        className={`mt-2 rounded-xl border p-3 cursor-pointer transition-all duration-200 hover:-translate-y-[1px] hover:shadow-md ${
                          dark
                            ? 'bg-zinc-950/80 border-zinc-800/80 hover:border-zinc-700/80 hover:bg-zinc-950'
                            : 'bg-zinc-50 border-zinc-200/80 hover:border-zinc-300/80 hover:bg-white'
                        }`}
                      >
                        {/* Original author row */}
                        <div className="flex items-center gap-2 mb-2">
                          {getAvatar(item.post.author.name, item.post.author.avatarUrl, 'w-6 h-6')}
                          <span className={`text-[11.5px] font-semibold truncate ${dark ? 'text-zinc-300' : 'text-zinc-800'}`}>
                            {item.post.author.name}
                          </span>
                          <span className={`text-[10px] ml-auto shrink-0 ${dark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                            {formatDistanceToNowStrict(new Date(item.post.createdAt), { addSuffix: true })}
                          </span>
                        </div>

                        {/* Content preview */}
                        {item.post.content && (
                          <p className={`text-[12.5px] leading-relaxed line-clamp-3 break-words ${dark ? 'text-zinc-400' : 'text-zinc-650'}`}>
                            {item.post.content}
                          </p>
                        )}

                        {/* Media thumbnails */}
                        {item.post.media.length > 0 && (
                          <div className="mt-2 flex gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
                            {item.post.media.slice(0, 3).map((m) => (
                              <div key={m.id} className="w-14 h-14 rounded-lg overflow-hidden bg-zinc-200 dark:bg-zinc-855 shrink-0 border border-zinc-300/10">
                                {m.type === 'image' ? (
                                  <img src={m.url} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center bg-zinc-900">
                                    <span className="text-[8.5px] font-bold text-zinc-500 uppercase tracking-widest">Video</span>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Mini stats */}
                        <div className={`flex items-center gap-3.5 mt-2.5 pt-2 border-t text-[11px] ${dark ? 'border-zinc-800/60 text-zinc-600' : 'border-zinc-100 text-zinc-400'}`}>
                          <span className="flex items-center gap-1">
                            <Heart size={11} className="fill-current" />
                            {item.post.likeCount}
                          </span>
                          <span className="flex items-center gap-1">
                            <MessageCircle size={11} className="fill-current" />
                            {item.post.commentCount}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Load More / History Button */}
              {(sharesNextCursor || !showingHistory) && (
                <div className="p-3 border-t border-zinc-150 dark:border-zinc-800/60 flex justify-center bg-zinc-50/20 dark:bg-zinc-900/10">
                  <button
                    onClick={handleLoadMore}
                    disabled={sharesLoadingState}
                    className={`px-4 py-1.5 rounded-lg border text-[11.5px] font-semibold transition-all ${
                      dark
                        ? 'border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800'
                        : 'border-zinc-200 text-zinc-500 hover:text-zinc-800 hover:bg-zinc-50'
                    }`}
                  >
                    {sharesLoadingState ? (
                      <span className="flex items-center gap-1.5">
                        <Loader2 size={12} className="animate-spin" />
                        Loading…
                      </span>
                    ) : showingHistory ? (
                      'Load more shared posts'
                    ) : (
                      'Show viewed history'
                    )}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
