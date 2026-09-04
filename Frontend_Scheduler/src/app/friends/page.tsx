"use client";

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useDarkMode } from '@/context/DarkModeContext';
import { useAuth } from '@/context/authContext';
import { useNetwork, NetworkUser } from '@/context/NetworkContext';
import { useRouter } from 'next/navigation';
import {
  Users, UserPlus, Copy, Check,
  Search, ChevronRight, ChevronLeft, Loader2, MessageCircle, X,
  Sparkles, RefreshCw, ArrowLeft, Share2, Link as LinkIcon
} from 'lucide-react';
import { toast } from 'sonner';

// ── Gradient palette for avatar initials ──────────────────────────────────────
const GRADIENTS = [
  'from-indigo-500 to-purple-600',
  'from-pink-500 to-rose-600',
  'from-emerald-500 to-teal-600',
  'from-amber-500 to-orange-600',
  'from-blue-500 to-cyan-600',
  'from-violet-500 to-fuchsia-600',
  'from-teal-500 to-emerald-600',
];

function Avatar({
  name,
  avatarUrl,
  size = 44,
  className = '',
}: {
  name: string;
  avatarUrl?: string | null;
  size?: number;
  className?: string;
}) {
  const idx = (name || '?').charCodeAt(0) % GRADIENTS.length;
  const px = `${size}px`;
  const fontSize = size <= 28 ? '10px' : size <= 36 ? '12px' : size <= 44 ? '14px' : '16px';

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        referrerPolicy="no-referrer"
        style={{ width: px, height: px }}
        className={`rounded-full object-cover shrink-0 ${className}`}
      />
    );
  }
  return (
    <div
      style={{ width: px, height: px, fontSize }}
      className={`rounded-full flex items-center justify-center font-bold text-white bg-gradient-to-br ${GRADIENTS[idx]} shrink-0 shadow-sm ${className}`}
    >
      {(name || '?').charAt(0).toUpperCase()}
    </div>
  );
}

// ── Reason Badge ───────────────────────────────────────────────────────────────
function ReasonBadge({ reason, dark }: { reason: string; dark: boolean }) {
  const isMutual = reason.includes('mutual');
  const isCommunity = reason.includes('communit');
  const isCollege = reason.includes('college');
  const isNew = reason === 'New to DojoApp';

  const color = isMutual
    ? dark ? 'bg-indigo-500/15 text-indigo-300 border-indigo-500/25' : 'bg-indigo-50 text-indigo-700 border-indigo-100'
    : isCollege
      ? dark ? 'bg-blue-500/15 text-blue-300 border-blue-500/25' : 'bg-blue-50 text-blue-700 border-blue-100'
      : isCommunity
      ? dark ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/25' : 'bg-emerald-50 text-emerald-700 border-emerald-100'
      : isNew
        ? dark ? 'bg-amber-500/15 text-amber-300 border-amber-500/25' : 'bg-amber-50 text-amber-700 border-amber-100'
        : dark ? 'bg-zinc-800/80 text-zinc-400 border-zinc-700' : 'bg-zinc-100 text-zinc-600 border-zinc-200';

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border whitespace-nowrap ${color}`}>
      {reason}
    </span>
  );
}

// ── Horizontal Suggestion Strip (Instagram Discover People Card) ─────────────
function SuggestionStripCard({
  user,
  dark,
  onAdd,
  onDismiss,
  addingId,
}: {
  user: NetworkUser;
  dark: boolean;
  onAdd: (id: string, name: string) => void;
  onDismiss: (id: string) => void;
  addingId: string | null;
}) {
  const router = useRouter();
  const isAdding = addingId === user.id;
  const previews = user.mutualFriendPreviews ?? [];
  const isFollowsYou = user.reason === 'Follows you';

  return (
    <div
      className={`
        relative w-[170px] sm:w-[185px] shrink-0 p-3.5 sm:p-4 rounded-2xl border flex flex-col items-center text-center justify-between gap-2.5
        transition-all duration-200 group hover:shadow-xl hover:-translate-y-0.5
        ${dark
          ? 'bg-zinc-950 hover:bg-zinc-900/90 border-zinc-800/80 hover:border-zinc-700'
          : 'bg-white hover:bg-zinc-50/50 border-zinc-200/90 hover:border-zinc-300 shadow-sm'}
      `}
    >
      {/* Dismiss (X) button */}
      <button
        onClick={() => onDismiss(user.id)}
        aria-label="Dismiss suggestion"
        className={`
          absolute top-2 right-2 p-1 rounded-full opacity-60 sm:opacity-0 group-hover:opacity-100
          transition-all duration-150 z-10
          ${dark ? 'text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800' : 'text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100'}
        `}
      >
        <X size={13} />
      </button>

      {/* Instagram Avatar with Gradient Ring */}
      <button
        onClick={() => router.push(`/user/${user.id}`)}
        className="flex flex-col items-center gap-2 w-full pt-1"
      >
        <div className="relative p-[2.5px] rounded-full bg-gradient-to-tr from-amber-500 via-rose-500 to-indigo-600 shadow-sm transition-transform duration-200 group-hover:scale-105">
          <Avatar
            name={user.name}
            avatarUrl={user.avatarUrl}
            size={54}
            className="ring-2 ring-white dark:ring-zinc-950"
          />
        </div>

        <div className="w-full px-1 min-w-0">
          <p className={`text-[13.5px] font-bold leading-tight truncate hover:underline ${dark ? 'text-white' : 'text-zinc-900'}`}>
            {user.name}
          </p>
        </div>
      </button>

      {/* Instagram Subtitle Reason & Mutual Avatars */}
      <div className="flex flex-col items-center gap-1.5 w-full min-h-[38px] justify-center px-1">
        {isFollowsYou ? (
          <span className="text-[11px] font-bold text-indigo-500 dark:text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full">
            Follows you
          </span>
        ) : (
          <p className={`text-[11px] leading-tight font-medium line-clamp-2 ${dark ? 'text-zinc-400' : 'text-zinc-500'}`}>
            {user.reason || 'Suggested for you'}
          </p>
        )}

        {previews.length > 0 && !isFollowsYou && (
          <div className="flex items-center justify-center gap-1">
            <div className="flex -space-x-1.5">
              {previews.slice(0, 3).map((p) => (
                <Avatar
                  key={p.id}
                  name={p.name}
                  avatarUrl={p.avatarUrl}
                  size={16}
                  className="ring-1 ring-white dark:ring-zinc-950"
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Instagram Primary CTA: Add Friend */}
      <button
        onClick={() => onAdd(user.id, user.name)}
        disabled={isAdding}
        className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-[12px] font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm shadow-indigo-600/20 active:scale-[0.98] transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isAdding ? <Loader2 size={13} className="animate-spin" /> : <UserPlus size={13} />}
        <span>{isAdding ? 'Adding…' : 'Add Friend'}</span>
      </button>
    </div>
  );
}

// ── Horizontal Suggestions Strip Component ───────────────────────────────────
function SuggestedFriendsStrip({
  suggestedUsers,
  suggestionsLoading,
  dark,
  onAdd,
  onDismiss,
  addingById,
  onRefresh,
  onLoadMore,
  hasMore,
  loadingMore,
}: {
  suggestedUsers: NetworkUser[];
  suggestionsLoading: boolean;
  dark: boolean;
  onAdd: (id: string, name: string) => void;
  onDismiss: (id: string) => void;
  addingById: string | null;
  onRefresh: () => void;
  onLoadMore: () => void;
  hasMore: boolean;
  loadingMore: boolean;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleScroll = () => {
    const element = scrollRef.current;
    if (!element || !hasMore || loadingMore) return;
    if (element.scrollLeft + element.clientWidth >= element.scrollWidth - 240) {
      onLoadMore();
    }
  };

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const amount = direction === 'left' ? -340 : 340;
      scrollRef.current.scrollBy({ left: amount, behavior: 'smooth' });
    }
  };

  if (!suggestionsLoading && suggestedUsers.length === 0) {
    return null;
  }

  return (
    <div className={`p-4 sm:p-5 rounded-2xl border transition-all ${dark ? 'bg-zinc-950/60 border-zinc-800/80' : 'bg-white border-zinc-200/90 shadow-sm'}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3 px-0.5">
        <div className="flex items-center gap-2.5">
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${dark ? 'bg-indigo-500/15 text-indigo-400' : 'bg-indigo-50 text-indigo-600'}`}>
            <Sparkles size={16} />
          </div>
          <div>
            <h3 className="text-[14.5px] font-bold tracking-tight">People You May Know</h3>
            <p className={`text-[11.5px] ${dark ? 'text-zinc-400' : 'text-zinc-500'}`}>
              Suggestions based on mutual peers &amp; shared communities
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Scroll buttons for desktop */}
          <div className="hidden sm:flex items-center gap-1 mr-1">
            <button
              onClick={() => scroll('left')}
              className={`p-1.5 rounded-lg border transition-all ${dark ? 'border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800' : 'border-zinc-200 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100'}`}
              title="Scroll left"
            >
              <ChevronLeft size={14} />
            </button>
            <button
              onClick={() => scroll('right')}
              className={`p-1.5 rounded-lg border transition-all ${dark ? 'border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800' : 'border-zinc-200 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100'}`}
              title="Scroll right"
            >
              <ChevronRight size={14} />
            </button>
          </div>

          <button
            onClick={onRefresh}
            disabled={suggestionsLoading}
            className={`p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg border text-[11.5px] font-medium flex items-center gap-1.5 transition-all
              ${dark ? 'border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800' : 'border-zinc-200 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'}
              disabled:opacity-40`}
            title="Refresh suggestions"
          >
            <RefreshCw size={13} className={suggestionsLoading ? 'animate-spin text-indigo-500' : ''} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      {/* Horizontal list */}
      {suggestionsLoading && suggestedUsers.length === 0 ? (
        <div className="flex gap-3 overflow-x-hidden py-2">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className={`w-[180px] h-[190px] rounded-2xl border animate-pulse shrink-0 ${dark ? 'bg-zinc-900/40 border-zinc-800' : 'bg-zinc-100 border-zinc-200'}`}
            />
          ))}
        </div>
      ) : (
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex gap-3.5 overflow-x-auto no-scrollbar py-1 scroll-smooth -mx-1 px-1"
        >
          {suggestedUsers.map((user) => (
            <SuggestionStripCard
              key={user.id}
              user={user}
              dark={dark}
              onAdd={onAdd}
              onDismiss={onDismiss}
              addingId={addingById}
            />
          ))}
          {loadingMore && <div className="w-[70px] shrink-0 flex items-center justify-center"><Loader2 size={18} className="animate-spin text-indigo-500" /></div>}
        </div>
      )}
    </div>
  );
}

// ── Main Friends Page ─────────────────────────────────────────────────────────
export default function FriendsPage() {
  const router = useRouter();
  const { darkMode } = useDarkMode() as any;
  const { isAuthenticated, loading, userDetails } = useAuth() as any;
  const dark = darkMode;

  const {
    network,
    loading: networkLoadingState,
    hasData,
    fetchNetwork,
    silentRefresh,
    addFriendById,
    dismissSuggestion,
    fetchSuggestedUsers,
    loadMoreSuggestedUsers,
    suggestionsHasMore,
    suggestionsLoading: contextSuggestionsLoading,
  } = useNetwork();

  const networkLoading = networkLoadingState && !hasData;

  const [query, setQuery] = useState('');
  const [addingById, setAddingById] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);

  useEffect(() => {
    if (!loading && !isAuthenticated) router.push('/');
  }, [isAuthenticated, loading, router]);

  useEffect(() => {
    if (!loading && isAuthenticated) {
      if (!hasData) {
        fetchNetwork();
      } else {
        silentRefresh();
      }
      loadSuggestions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, isAuthenticated]);

  const loadSuggestions = useCallback(async () => {
    setSuggestionsLoading(true);
    try {
      await fetchSuggestedUsers();
    } finally {
      setSuggestionsLoading(false);
    }
  }, [fetchSuggestedUsers]);

  const handleRefreshAll = async () => {
    setSuggestionsLoading(true);
    try {
      await Promise.all([silentRefresh(), fetchSuggestedUsers()]);
      toast.success('Friends list refreshed');
    } catch {
      toast.error('Failed to refresh');
    } finally {
      setSuggestionsLoading(false);
    }
  };

  const handleAddById = async (targetUserId: string, name: string) => {
    if (addingById) return;
    setAddingById(targetUserId);
    try {
      const res = await addFriendById(targetUserId);
      toast.success(res.message || `Added ${name} as a friend!`, {
        description: `You are now connected with ${name}`,
      });
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setAddingById(null);
    }
  };

  const handleShareInviteLink = async () => {
    if (!userDetails?.friendCode) return;
    const inviteUrl = `${window.location.origin}/register?ref=${userDetails.friendCode}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Connect with me on DojoApp',
          text: 'Join me on DojoApp to study and collaborate together!',
          url: inviteUrl,
        });
        return;
      } catch (err: any) {
        if (err.name === 'AbortError') return;
      }
    }

    navigator.clipboard.writeText(inviteUrl);
    setCopiedLink(true);
    toast.success('Invite link copied to clipboard!');
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const friends = network.friends || [];
  const filteredFriends = friends.filter((u) =>
    u.name.toLowerCase().includes(query.toLowerCase())
  );

  const suggestedUsers = network.suggestedUsers || [];
  const muted = dark ? 'text-zinc-400' : 'text-zinc-500';

  if (loading) {
    return (
      <div className={`min-h-screen flex justify-center items-center ${dark ? 'bg-black' : 'bg-zinc-50'}`}>
        <Loader2 size={24} className="animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className={`min-h-screen pt-[50px] md:pt-[24px] pb-32 transition-colors duration-300 ${dark ? 'bg-black text-white' : 'bg-zinc-50/50 text-zinc-900'}`}>
      <div className="max-w-[860px] w-full mx-auto px-4 space-y-6">

        {/* ── Top Header Bar ────────────────────────────────────────── */}
        <div className={`sticky top-0 z-20 -mx-4 px-4 py-3.5 backdrop-blur-md border-b transition-colors ${dark ? 'bg-black/85 border-zinc-800/80' : 'bg-white/85 border-zinc-200/80'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.back()}
                className={`p-2 rounded-xl transition-all ${dark ? 'hover:bg-zinc-900 text-zinc-400 hover:text-white' : 'hover:bg-zinc-100 text-zinc-600 hover:text-zinc-900'}`}
                title="Go back"
              >
                <ArrowLeft size={18} />
              </button>
              <div>
                <h1 className="text-[20px] font-bold tracking-tight leading-tight">Friends</h1>
                <p className={`text-[12px] ${muted} hidden sm:block`}>
                  Connect and study together with your peers
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleRefreshAll}
                disabled={networkLoading || suggestionsLoading}
                className={`p-2 rounded-xl border transition-all ${dark ? 'border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-900' : 'border-zinc-200 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'} disabled:opacity-40`}
                title="Refresh"
              >
                <RefreshCw size={15} className={suggestionsLoading || networkLoading ? 'animate-spin text-indigo-500' : ''} />
              </button>

              {userDetails?.friendCode && (
                <button
                  onClick={handleShareInviteLink}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[12.5px] font-semibold bg-indigo-600 hover:bg-indigo-700 text-white transition-all shadow-sm shadow-indigo-600/20 active:scale-95"
                >
                  {copiedLink ? <Check size={14} className="text-emerald-300" /> : <Share2 size={14} />}
                  <span>{copiedLink ? 'Link Copied!' : 'Share Invite Link'}</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── Suggestions above the friends list on every screen size ── */}
        <div className="pt-2">
          <SuggestedFriendsStrip
            suggestedUsers={suggestedUsers}
            suggestionsLoading={suggestionsLoading}
            dark={dark}
            onAdd={handleAddById}
            onDismiss={dismissSuggestion}
            addingById={addingById}
            onRefresh={loadSuggestions}
            onLoadMore={loadMoreSuggestedUsers}
            hasMore={suggestionsHasMore}
            loadingMore={contextSuggestionsLoading}
          />
        </div>

        {/* ── Sleek Share Invite Link Banner ───────────────────────── */}
        {userDetails?.friendCode && (
          <div className={`p-4 sm:p-4.5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all ${dark
            ? 'bg-gradient-to-r from-indigo-950/40 to-zinc-950 border-indigo-900/30'
            : 'bg-gradient-to-r from-indigo-50/70 to-purple-50/40 border-indigo-100'
            }`}>
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${dark ? 'bg-indigo-500/20 text-indigo-300' : 'bg-indigo-600 text-white shadow-sm'}`}>
                <LinkIcon size={16} />
              </div>
              <div>
                <p className={`text-[13.5px] font-semibold ${dark ? 'text-zinc-100' : 'text-zinc-900'}`}>
                  Invite study partners to connect
                </p>
                <p className={`text-[11.5px] ${muted}`}>
                  Anyone who registers with your link will automatically become your friend
                </p>
              </div>
            </div>

            <button
              onClick={handleShareInviteLink}
              className={`flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-[12.5px] font-semibold transition-all shrink-0 ${dark
                ? 'bg-white text-black hover:bg-zinc-200 shadow-sm'
                : 'bg-zinc-900 text-white hover:bg-black shadow-sm'
                }`}
            >
              {copiedLink ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
              <span>{copiedLink ? 'Copied Link' : 'Copy Invite Link'}</span>
            </button>
          </div>
        )}

        {/* ── Main Friends Section ──────────────────────────────────── */}
        <div className="space-y-3">
          {/* Header with Title & Search */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
            <div className="flex items-center gap-2">
              <Users size={16} className="text-indigo-500" />
              <h2 className="text-[15px] font-bold tracking-tight">
                All Friends
              </h2>
              {!networkLoading && (
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${dark ? 'bg-zinc-800 text-zinc-300' : 'bg-zinc-200 text-zinc-700'}`}>
                  {friends.length}
                </span>
              )}
            </div>

            {/* Search */}
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border w-full sm:w-[260px] transition-all ${dark ? 'bg-zinc-950 border-zinc-800 focus-within:border-zinc-700' : 'bg-white border-zinc-200 focus-within:border-zinc-300'}`}>
              <Search size={14} className={dark ? 'text-zinc-500' : 'text-zinc-400'} />
              <input
                type="text"
                placeholder="Search friends…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className={`bg-transparent flex-1 text-[13px] outline-none ${dark ? 'text-white placeholder-zinc-600' : 'text-zinc-900 placeholder-zinc-400'}`}
              />
              {query && (
                <button
                  onClick={() => setQuery('')}
                  className={`p-0.5 rounded-md ${dark ? 'text-zinc-500 hover:text-zinc-300' : 'text-zinc-400 hover:text-zinc-600'}`}
                >
                  <X size={12} />
                </button>
              )}
            </div>
          </div>

          {/* Friends List Container */}
          <div className={`rounded-2xl border overflow-hidden ${dark ? 'bg-zinc-950/60 border-zinc-800/80' : 'bg-white border-zinc-200/90 shadow-sm'}`}>
            {networkLoading ? (
              <div className="flex flex-col justify-center items-center py-20 gap-3">
                <Loader2 size={24} className="animate-spin text-indigo-500" />
                <p className={`text-[13px] ${muted}`}>Loading friends…</p>
              </div>
            ) : filteredFriends.length === 0 ? (
              <div className="py-20 text-center px-6">
                <div className={`w-14 h-14 rounded-2xl mx-auto mb-3 flex items-center justify-center ${dark ? 'bg-zinc-900 border border-zinc-800' : 'bg-zinc-100 border border-zinc-200'}`}>
                  <Users size={24} className={dark ? 'text-zinc-500' : 'text-zinc-400'} />
                </div>
                <p className={`text-[14.5px] font-semibold mb-1 ${dark ? 'text-zinc-200' : 'text-zinc-800'}`}>
                  {query ? `No friends found matching "${query}"` : 'No friends connected yet'}
                </p>
                <p className={`text-[12.5px] max-w-[340px] mx-auto ${muted} mb-4`}>
                  {query
                    ? 'Try searching with a different name.'
                    : 'Connect with students using the suggestions or share your invite link to get started.'}
                </p>
                {!query && userDetails?.friendCode && (
                  <button
                    onClick={handleShareInviteLink}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-[12.5px] font-semibold bg-indigo-600 hover:bg-indigo-700 text-white transition-all shadow-sm shadow-indigo-600/20"
                  >
                    <Share2 size={13} />
                    <span>Share Invite Link</span>
                  </button>
                )}
              </div>
            ) : (
              <div className={`divide-y ${dark ? 'divide-zinc-900' : 'divide-zinc-100'}`}>
                {filteredFriends.map((friend) => (
                  <div
                    key={friend.id}
                    className={`flex items-center gap-3.5 px-4 sm:px-5 py-3.5 transition-colors ${dark ? 'hover:bg-zinc-900/30' : 'hover:bg-zinc-50/70'}`}
                  >
                    {/* Avatar */}
                    <button
                      onClick={() => router.push(`/user/${friend.id}`)}
                      className="shrink-0 transition-transform active:scale-95"
                    >
                      <Avatar name={friend.name} avatarUrl={friend.avatarUrl} size={46} />
                    </button>

                    {/* Name & Details */}
                    <div className="flex-1 min-w-0">
                      <button
                        onClick={() => router.push(`/user/${friend.id}`)}
                        className={`text-[14px] font-semibold hover:underline text-left truncate block max-w-full ${dark ? 'text-white' : 'text-zinc-900'}`}
                      >
                        {friend.name}
                      </button>

                      {/* Mutual connections */}
                      {friend.mutualFriends && friend.mutualFriends > 0 ? (
                        <div className="flex items-center gap-1.5 mt-1 min-w-0">
                          {/* Stacked mutual avatars */}
                          {(friend.mutualFriendPreviews ?? []).length > 0 && (
                            <div className="flex -space-x-1.5 shrink-0">
                              {(friend.mutualFriendPreviews ?? []).slice(0, 3).map((p) => (
                                <Avatar
                                  key={p.id}
                                  name={p.name}
                                  avatarUrl={p.avatarUrl}
                                  size={16}
                                  className="ring-1 ring-white dark:ring-zinc-950"
                                />
                              ))}
                            </div>
                          )}
                          <p className={`text-[11.5px] font-medium truncate ${dark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                            {friend.mutualFriends === 1
                              ? `1 mutual connection: ${friend.mutualFriendPreviews?.[0]?.name?.split(' ')[0] ?? 'friend'}`
                              : `${friend.mutualFriends} mutual connections`}
                          </p>
                        </div>
                      ) : (
                        <p className="text-[12px] text-indigo-500 font-medium mt-0.5">
                          Connected friend
                        </p>
                      )}
                    </div>

                    {/* Chat & Profile Buttons */}
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => {
                          router.push(`/chat/${friend.id}`);
                        }}
                        className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-[12.5px] font-semibold border transition-all ${dark
                          ? 'border-indigo-500/30 text-indigo-400 bg-indigo-500/10 hover:bg-indigo-500/20'
                          : 'border-indigo-200 text-indigo-700 bg-indigo-50 hover:bg-indigo-100'
                          }`}
                      >
                        <MessageCircle size={13} />
                        <span>Chat</span>
                      </button>

                      <button
                        onClick={() => router.push(`/user/${friend.id}`)}
                        className={`p-2 rounded-xl border transition-colors ${dark ? 'border-zinc-800 text-zinc-500 hover:bg-zinc-900 hover:text-white' : 'border-zinc-200 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700'}`}
                        title="View Profile"
                      >
                        <ChevronRight size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
