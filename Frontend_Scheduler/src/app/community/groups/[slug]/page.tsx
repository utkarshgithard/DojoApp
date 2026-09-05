'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/authContext';
import { useDarkMode } from '@/context/DarkModeContext';
import { useCommunityGroups, CommunityGroup } from '@/context/CommunityGroupContext';
import { auth } from '@/lib/firebase';
import API from '@/lib/axios';
import CommunityPostCard from '@/components/community/CommunityPostCard';
import CommunityPostComposer from '@/components/community/CommunityPostComposer';
import InviteFriendsModal from '@/components/community/InviteFriendsModal';
import CommunityShareModal from '@/components/community/CommunityShareModal';
import {
  ArrowLeft, Users, Lock, Eye, Mail, Crown, Shield, Share2,
  Settings, RefreshCw, Loader2, Plus, X
} from 'lucide-react';

interface CommunityPost {
  id: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  author: { id: string; name: string; avatarUrl?: string | null };
  media: { id: string; url: string; type: 'image' | 'video'; thumbnailUrl?: string | null }[];
  likeCount: number;
  commentCount: number;
  likedByMe: boolean;
}

const VISIBILITY_ICONS: Record<string, React.ReactNode> = {
  public: <Eye size={13} />,
  private: <Lock size={13} />,
  invite_only: <Mail size={13} />,
};
const VISIBILITY_LABELS: Record<string, string> = {
  public: 'Public',
  private: 'Private',
  invite_only: 'Invite only',
};

const getBannerPositionY = (url: string | null | undefined): number => {
  if (!url) return 50;
  const match = url.match(/[?&]pos=(\d+)/);
  if (match) {
    const parsedPos = parseInt(match[1], 10);
    if (!isNaN(parsedPos)) return Math.max(0, Math.min(100, parsedPos));
  }
  return 50;
};

export default function CommunityHomePage() {
  const params = useParams();
  const slug = params?.slug as string;
  const router = useRouter();
  const { isAuthenticated, loading: authLoading, userId, userName, userDetails, profileLoading } = useAuth() as any;
  const { darkMode } = useDarkMode() as any;
  const dark = darkMode;
  const {
    joinOrLeave,
    activeCommunity: community,
    activePosts: posts,
    activeNextCursor: nextCursor,
    activeLoading: communityLoading,
    activePostsLoading: postsLoading,
    activeError: communityError,
    activePostsError: postsError,
    fetchCommunityBySlug,
    fetchCommunityPosts,
    handleCommunityPostCreated,
    handleCommunityPostDeleted,
  } = useCommunityGroups();

  const avatarUrl = profileLoading ? null : (userDetails?.avatarUrl || auth.currentUser?.photoURL || null);

  const [joining, setJoining] = useState(false);
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);

  useEffect(() => {
    if (!authLoading && slug) {
      const isSilent = community?.slug === slug;
      fetchCommunityBySlug(slug, isSilent);
    }
  }, [authLoading, slug, fetchCommunityBySlug, community?.slug]);

  useEffect(() => {
    if (!authLoading && !communityLoading && community && community.slug === slug) {
      const isSilent = posts.length > 0;
      fetchCommunityPosts(slug, undefined, isSilent);
    }
  }, [authLoading, communityLoading, community, slug, fetchCommunityPosts, posts.length]);

  const handleJoinToggle = async () => {
    if (!isAuthenticated) { router.push('/login'); return; }
    if (joining) return;
    setJoining(true);
    try {
      await joinOrLeave(slug);
    } catch {}
    finally { setJoining(false); }
  };

  const handlePostCreated = (post: any) => {
    handleCommunityPostCreated(post);
    setIsComposeOpen(false);
  };

  const handlePostDeleted = (postId: string) => {
    handleCommunityPostDeleted(postId);
  };

  if (authLoading || communityLoading) {
    return (
      <div className={`min-h-screen pt-[50px] md:pt-0 ${dark ? 'bg-[#0a0a0a]' : 'bg-[#f5f5f5]'} flex items-center justify-center`}>
        <Loader2 size={28} className="animate-spin text-indigo-500" />
      </div>
    );
  }

  if (communityError) {
    return (
      <div className={`min-h-screen pt-[50px] md:pt-0 ${dark ? 'bg-[#0a0a0a] text-white' : 'bg-[#f5f5f5] text-zinc-900'} flex flex-col items-center justify-center gap-4 p-8`}>
        <p className={`text-[16px] font-semibold ${dark ? 'text-zinc-300' : 'text-zinc-700'}`}>{communityError}</p>
        <button onClick={() => router.back()} className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-[13px] font-medium ${dark ? 'border-zinc-700 text-zinc-300 hover:bg-zinc-900' : 'border-zinc-200 text-zinc-600 hover:bg-white'}`}>
          <ArrowLeft size={15} /> Go back
        </button>
      </div>
    );
  }

  if (!community) return null;

  const isMember = community.joined;
  const isCreator = community.myRole === 'creator';
  const isMod = community.myRole === 'moderator' || isCreator;
  const canPost = isMember;

  return (
    <div className={`group min-h-screen pt-[50px] md:pt-0 transition-colors duration-300 ${dark ? 'bg-[#0a0a0a] text-white' : 'bg-[#f5f5f5] text-zinc-900'}`}>

      {/* Banner */}
      <div className={`relative h-40 sm:h-56 overflow-hidden ${dark ? 'bg-gradient-to-br from-indigo-950 via-zinc-900 to-zinc-950' : 'bg-gradient-to-br from-indigo-200 via-indigo-100 to-violet-100'}`}>
        {community.bannerUrl && (
          <img
            src={community.bannerUrl}
            alt=""
            className="w-full h-full object-cover transition-transform duration-700 hover:scale-105"
            style={{ objectPosition: `center ${getBannerPositionY(community.bannerUrl)}%` }}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-black/30" />
        
        {/* Top Floating Actions */}
        <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-10">
          <button
            onClick={() => router.back()}
            className="p-2.5 rounded-xl bg-black/40 text-white backdrop-blur-md hover:bg-black/60 transition-all duration-200 shadow-md active:scale-95 border border-white/10"
            title="Go back"
          >
            <ArrowLeft size={18} />
          </button>
          {isCreator && (
            <button
              onClick={() => router.push(`/community/groups/${slug}/settings`)}
              className="p-2.5 rounded-xl bg-black/40 text-white backdrop-blur-md hover:bg-black/60 transition-all duration-200 shadow-md active:scale-95 border border-white/10"
              title="Community Settings"
            >
              <Settings size={18} />
            </button>
          )}
        </div>
      </div>

      <div className="max-w-[1140px] mx-auto px-4">
        {/* Community info header card */}
        <div className={`relative -mt-14 sm:-mt-16 mb-6 rounded-2xl border p-5 sm:p-6 backdrop-blur-xl shadow-xl transition-all duration-300 ${
          dark ? 'bg-zinc-950/90 border-zinc-800/80 shadow-black/50' : 'bg-white/95 border-zinc-200/80 shadow-zinc-200/50'
        }`}>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6">
            {/* Avatar */}
            <div className={`relative w-20 h-20 sm:w-24 sm:h-24 rounded-2xl border-4 overflow-hidden shrink-0 flex items-center justify-center shadow-lg transition-transform duration-300 hover:scale-105 ${
              dark ? 'border-zinc-950 bg-indigo-950 ring-2 ring-indigo-500/30' : 'border-white bg-indigo-100 ring-2 ring-indigo-300'
            }`}>
              {community.avatarUrl ? (
                <img src={community.avatarUrl} alt={community.name} className="w-full h-full object-contain bg-black/5 dark:bg-white/5" />
              ) : (
                <span className={`text-3xl font-extrabold ${dark ? 'text-indigo-300' : 'text-indigo-600'}`}>
                  {community.name.charAt(0).toUpperCase()}
                </span>
              )}
            </div>

            {/* Info Metadata */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1.5">
                <h1 className={`text-[22px] sm:text-[28px] font-black tracking-tight leading-tight ${dark ? 'text-white' : 'text-zinc-900'}`}>
                  {community.name}
                </h1>
                {isCreator && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-extrabold px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-500 border border-amber-500/30">
                    <Crown size={11} /> Creator
                  </span>
                )}
                {community.myRole === 'moderator' && !isCreator && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-extrabold px-2.5 py-0.5 rounded-full bg-violet-500/15 text-violet-400 border border-violet-500/30">
                    <Shield size={11} /> Mod
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-3 text-[12.5px] mb-2 font-semibold">
                <span className={`text-[12.5px] font-bold ${dark ? 'text-indigo-400' : 'text-indigo-600'}`}>
                  c/{community.slug}
                </span>
                <span className="text-zinc-500">•</span>
                <span className={`flex items-center gap-1.5 ${dark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                  <Users size={14} className="text-indigo-500" />
                  {community.memberCount.toLocaleString()} members
                </span>
                <span className="text-zinc-500">•</span>
                <span className={`flex items-center gap-1.5 ${dark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                  {VISIBILITY_ICONS[community.visibility]}
                  {VISIBILITY_LABELS[community.visibility]}
                </span>
              </div>

              {community.description && (
                <p className={`text-[13.5px] leading-relaxed max-w-2xl font-normal ${dark ? 'text-zinc-300' : 'text-zinc-600'}`}>
                  {community.description}
                </p>
              )}
            </div>

            {/* Desktop Join / Invite / Settings Toolbar */}
            <div className="hidden sm:flex items-center gap-2.5 shrink-0">
              {community.visibility === 'public' && (
                <button
                  onClick={() => setIsShareOpen(true)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-[13px] font-bold transition-all duration-200 active:scale-95 shadow-sm ${
                    dark ? 'border-zinc-700/80 text-zinc-200 bg-zinc-900/60 hover:bg-zinc-800' : 'border-zinc-300 text-zinc-700 bg-white hover:bg-zinc-50'
                  }`}
                >
                  <Share2 size={15} className="text-indigo-500" /> Share
                </button>
              )}
              {(isMember || isCreator) && (
                <button
                  onClick={() => setIsInviteOpen(true)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-[13px] font-bold transition-all duration-200 active:scale-95 shadow-sm ${
                    dark
                      ? 'border-zinc-700/80 text-zinc-200 bg-zinc-900/60 hover:bg-zinc-800 hover:text-white'
                      : 'border-zinc-300 text-zinc-700 bg-white hover:bg-zinc-50'
                  }`}
                >
                  <Mail size={15} className="text-indigo-500" /> Invite Friends
                </button>
              )}
              {isCreator ? (
                <button
                  onClick={() => router.push(`/community/groups/${slug}/settings`)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-[13px] font-bold transition-all duration-200 active:scale-95 shadow-sm ${
                    dark ? 'border-zinc-700/80 bg-zinc-900/60 text-zinc-200 hover:bg-zinc-800' : 'border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50'
                  }`}
                >
                  <Settings size={15} /> Settings
                </button>
              ) : (
                <button
                  onClick={handleJoinToggle}
                  disabled={joining || (community.visibility === 'invite_only' && !isMember)}
                  className={`px-6 py-2 rounded-xl text-[13.5px] font-bold transition-all duration-200 active:scale-95 disabled:opacity-50 flex items-center gap-2 shadow-md ${
                    isMember
                      ? dark
                        ? 'bg-zinc-800 text-zinc-300 hover:bg-rose-500/15 hover:text-rose-400 border border-zinc-700'
                        : 'bg-zinc-100 text-zinc-700 hover:bg-rose-50 hover:text-rose-600 border border-zinc-200'
                      : 'bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white shadow-indigo-600/25 hover:shadow-indigo-500/35'
                  }`}
                >
                  {joining && <Loader2 size={15} className="animate-spin" />}
                  {isMember ? 'Joined' : community.visibility === 'invite_only' ? 'Invite Only' : 'Join Group'}
                </button>
              )}
            </div>
          </div>

          {/* Mobile Actions */}
          <div className="flex sm:hidden flex-col gap-2 mt-4 pt-3 border-t border-zinc-200/40 dark:border-zinc-800/60">
            {community.visibility === 'public' && (
              <button
                onClick={() => setIsShareOpen(true)}
                className={`w-full py-2.5 rounded-xl border text-[13.5px] font-bold transition-all duration-200 active:scale-95 flex items-center justify-center gap-2 ${
                  dark ? 'border-zinc-800 bg-zinc-900/60 text-zinc-200 hover:bg-zinc-800' : 'border-zinc-200 bg-zinc-50 text-zinc-700 hover:bg-zinc-100'
                }`}
              >
                <Share2 size={15} className="text-indigo-500" /> Share Community
              </button>
            )}
            {!isCreator && (
              <button
                onClick={handleJoinToggle}
                disabled={joining || (community.visibility === 'invite_only' && !isMember)}
                className={`w-full py-2.5 rounded-xl text-[13.5px] font-bold transition-all duration-200 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 shadow-md ${
                  isMember
                    ? dark ? 'bg-zinc-800 text-zinc-300' : 'bg-zinc-100 text-zinc-700'
                    : 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-indigo-600/25'
                }`}
              >
                {joining && <Loader2 size={15} className="animate-spin" />}
                {isMember ? 'Joined Community' : community.visibility === 'invite_only' ? 'Invite Only' : 'Join Community'}
              </button>
            )}

            {(isMember || isCreator) && (
              <button
                onClick={() => setIsInviteOpen(true)}
                className={`w-full py-2.5 rounded-xl border text-[13.5px] font-bold transition-all duration-200 active:scale-95 flex items-center justify-center gap-2 ${
                  dark
                    ? 'border-zinc-800 bg-zinc-900/60 text-zinc-200 hover:bg-zinc-800'
                    : 'border-zinc-200 bg-zinc-50 text-zinc-700 hover:bg-zinc-100'
                }`}
              >
                <Mail size={15} className="text-indigo-500" /> Invite Friends
              </button>
            )}
          </div>
        </div>

        {/* Main layout */}
        <div className="xl:grid xl:grid-cols-[minmax(0,680px)_340px] xl:gap-6 xl:items-start">
          {/* Posts column */}
          <div className="w-full">
            {/* Desktop Composer */}
            {canPost && (
              <div className="hidden xl:block mb-5">
                <CommunityPostComposer
                  currentUser={{ id: userId, name: userName || 'You', avatarUrl }}
                  dark={dark}
                  communityId={community.id}
                  onPostCreated={handlePostCreated}
                />
              </div>
            )}

            {/* Header / Refresh bar */}
            <div className="flex items-center justify-between mb-4 px-1">
              <p className={`text-[13.5px] font-bold ${dark ? 'text-zinc-300' : 'text-zinc-700'}`}>
                {posts.length > 0 ? `${posts.length} Post${posts.length !== 1 ? 's' : ''}` : 'Group Feed'}
              </p>
              <button
                onClick={() => fetchCommunityPosts(slug)}
                disabled={postsLoading}
                className={`p-2 rounded-xl border transition-all duration-200 ${
                  dark ? 'border-zinc-800/80 text-zinc-400 hover:text-white hover:bg-zinc-800' : 'border-zinc-200 text-zinc-600 hover:text-zinc-900 hover:bg-white'
                } disabled:opacity-40`}
                title="Refresh posts"
              >
                <RefreshCw size={15} className={postsLoading ? 'animate-spin text-indigo-500' : ''} />
              </button>
            </div>

            {/* Access denied message */}
            {!isMember && community.visibility !== 'public' && (
              <div className={`rounded-2xl border p-10 text-center mb-6 shadow-md backdrop-blur-md ${
                dark ? 'bg-zinc-900/60 border-zinc-800/80' : 'bg-white border-zinc-200'
              }`}>
                <div className={`w-14 h-14 rounded-2xl mx-auto mb-3.5 flex items-center justify-center ${
                  dark ? 'bg-zinc-800 text-zinc-400' : 'bg-zinc-100 text-zinc-500'
                }`}>
                  <Lock size={26} />
                </div>
                <p className={`font-bold text-[16px] mb-1 ${dark ? 'text-white' : 'text-zinc-900'}`}>
                  Private Community
                </p>
                <p className={`text-[13px] font-medium ${dark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                  Join this group to view discussion posts and interact with members.
                </p>
              </div>
            )}

            {/* Posts feed */}
            {postsLoading && posts.length === 0 ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className={`rounded-2xl border p-5 sm:p-6 animate-pulse ${
                    dark ? 'bg-zinc-900/40 border-zinc-800/80' : 'bg-white border-zinc-200/80'
                  }`}>
                    <div className="flex gap-3.5 mb-4">
                      <div className={`w-10 h-10 rounded-full ${dark ? 'bg-zinc-800' : 'bg-zinc-200'}`} />
                      <div className="flex-1 space-y-2 pt-1">
                        <div className={`h-3.5 w-36 rounded-md ${dark ? 'bg-zinc-800' : 'bg-zinc-200'}`} />
                        <div className={`h-2.5 w-24 rounded-md ${dark ? 'bg-zinc-800' : 'bg-zinc-200'}`} />
                      </div>
                    </div>
                    <div className="space-y-2 mb-3">
                      <div className={`h-3.5 rounded-md ${dark ? 'bg-zinc-800' : 'bg-zinc-200'}`} />
                      <div className={`h-3.5 rounded-md w-3/4 ${dark ? 'bg-zinc-800' : 'bg-zinc-200'}`} />
                    </div>
                  </div>
                ))}
              </div>
            ) : postsError ? (
              <div className={`rounded-2xl border p-8 text-center shadow-md ${
                dark ? 'bg-zinc-900/60 border-zinc-800/80' : 'bg-white border-zinc-200'
              }`}>
                <p className={`text-[14px] mb-4 font-medium ${dark ? 'text-zinc-300' : 'text-zinc-600'}`}>{postsError}</p>
                <button
                  onClick={() => fetchCommunityPosts(slug)}
                  className="px-5 py-2.5 rounded-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-[13px] font-bold shadow-md shadow-indigo-600/25 transition-all duration-200 active:scale-95"
                >
                  Try again
                </button>
              </div>
            ) : posts.length === 0 ? (
              <div className={`rounded-2xl border p-12 text-center shadow-md ${
                dark ? 'bg-zinc-900/60 border-zinc-800/80' : 'bg-white border-zinc-200'
              }`}>
                <div className={`w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center ${
                  dark ? 'bg-indigo-950/40 text-indigo-400 ring-1 ring-indigo-800/50' : 'bg-indigo-50 text-indigo-600 ring-1 ring-indigo-200'
                }`}>
                  <Plus size={30} />
                </div>
                <p className={`text-[16px] font-extrabold mb-1.5 ${dark ? 'text-white' : 'text-zinc-900'}`}>No posts yet</p>
                <p className={`text-[13.5px] max-w-xs mx-auto font-medium ${dark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                  {canPost ? 'Be the first to create a post in this community!' : 'Join this community to start posting'}
                </p>
              </div>
            ) : (
              <div className={`rounded-2xl border overflow-hidden shadow-md divide-y transition-all duration-300 ${
                dark ? 'bg-zinc-950/40 border-zinc-800/80 divide-zinc-800/80 shadow-black/40' : 'bg-white border-zinc-200/80 divide-zinc-100 shadow-zinc-200/50'
              }`}>
                {posts.map((post) => (
                  <CommunityPostCard
                    key={post.id}
                    post={post as any}
                    currentUserId={userId}
                    dark={dark}
                    onDelete={handlePostDeleted}
                    isModerator={isMod}
                  />
                ))}
                {nextCursor && (
                  <div className="py-6 flex justify-center bg-white/40 dark:bg-zinc-950/20">
                    <button
                      onClick={() => fetchCommunityPosts(slug, nextCursor)}
                      disabled={postsLoading}
                      className={`px-7 py-2.5 rounded-full border text-[13px] font-bold transition-all duration-300 shadow-sm active:scale-95 disabled:opacity-40 ${
                        dark ? 'border-zinc-700/80 bg-zinc-900/60 text-zinc-200 hover:bg-zinc-800' : 'border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50'
                      }`}
                    >
                      {postsLoading ? 'Loading…' : 'Load more posts'}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Desktop Right Sidebar */}
          <div className="hidden xl:block sticky top-4 space-y-4">
            {/* About Card */}
            <div className={`rounded-2xl border p-5 backdrop-blur-md shadow-md ${
              dark ? 'bg-zinc-900/60 border-zinc-800/80 shadow-black/40' : 'bg-white/90 border-zinc-200/80 shadow-zinc-200/50'
            }`}>
              <h3 className={`text-[15px] font-extrabold tracking-tight mb-3 ${dark ? 'text-white' : 'text-zinc-900'}`}>
                About c/{community.slug}
              </h3>
              {community.description && (
                <p className={`text-[13px] leading-relaxed mb-4 font-normal ${dark ? 'text-zinc-300' : 'text-zinc-600'}`}>
                  {community.description}
                </p>
              )}
              <div className={`space-y-3 text-[13px] pt-3 border-t font-semibold ${
                dark ? 'border-zinc-800/80 text-zinc-400' : 'border-zinc-100 text-zinc-600'
              }`}>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Users size={15} className="text-indigo-500" /> Members
                  </span>
                  <span className={`font-bold ${dark ? 'text-zinc-200' : 'text-zinc-800'}`}>
                    {community.memberCount.toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    {VISIBILITY_ICONS[community.visibility]} Privacy
                  </span>
                  <span className={`font-bold ${dark ? 'text-zinc-200' : 'text-zinc-800'}`}>
                    {VISIBILITY_LABELS[community.visibility]}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Crown size={15} className="text-amber-500" /> Creator
                  </span>
                  <span className={`font-bold ${dark ? 'text-zinc-200' : 'text-zinc-800'}`}>
                    {community.creator.name}
                  </span>
                </div>
              </div>
            </div>

            {/* Mod Settings button */}
            {isCreator && (
              <button
                onClick={() => router.push(`/community/groups/${slug}/settings`)}
                className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl border text-[13.5px] font-bold transition-all duration-200 shadow-sm active:scale-95 ${
                  dark ? 'border-zinc-800/80 bg-zinc-900/60 text-zinc-200 hover:bg-zinc-800' : 'border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50'
                }`}
              >
                <Settings size={16} /> Community Settings
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Mobile FAB for posting */}
      {canPost && (
        <button
          onClick={() => setIsComposeOpen(true)}
          className="fixed bottom-6 right-6 z-40 w-14 h-14 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white rounded-full flex items-center justify-center shadow-xl shadow-indigo-600/30 active:scale-90 transition-all duration-300 xl:hidden"
        >
          <Plus size={26} />
        </button>
      )}

      {/* Mobile Compose Modal */}
      {isComposeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className={`rounded-2xl border p-5 max-w-lg w-full shadow-2xl relative animate-in zoom-in-95 duration-200 ${
            dark ? 'bg-zinc-950 border-zinc-800 text-white' : 'bg-white border-zinc-200 text-zinc-900'
          }`}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-[17px] font-extrabold tracking-tight">Post to c/{slug}</h3>
              <button
                onClick={() => setIsComposeOpen(false)}
                className={`p-1.5 rounded-xl transition-colors ${
                  dark ? 'text-zinc-400 hover:bg-zinc-900 hover:text-white' : 'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900'
                }`}
              >
                <X size={18} />
              </button>
            </div>
            <CommunityPostComposer
              currentUser={{ id: userId, name: userName || 'You', avatarUrl }}
              dark={dark}
              communityId={community.id}
              onPostCreated={handlePostCreated}
            />
          </div>
        </div>
      )}

      {/* Invite Friends Modal */}
      {isInviteOpen && (
        <InviteFriendsModal
          communitySlug={slug}
          communityName={community.name}
          dark={dark}
          onClose={() => setIsInviteOpen(false)}
        />
      )}

      {isShareOpen && (
        <CommunityShareModal
          communityName={community.name}
          communityDescription={community.description}
          communitySlug={community.slug}
          dark={dark}
          onClose={() => setIsShareOpen(false)}
        />
      )}
    </div>
  );
}
