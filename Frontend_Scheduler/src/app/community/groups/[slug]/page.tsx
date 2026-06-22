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
import {
  ArrowLeft, Users, Lock, Eye, Mail, Crown, Shield,
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
      <div className={`relative h-36 sm:h-48 overflow-hidden ${dark ? 'bg-gradient-to-br from-indigo-950 via-zinc-900 to-zinc-950' : 'bg-gradient-to-br from-indigo-200 via-indigo-100 to-white'}`}>
        {community.bannerUrl && (
          <img
            src={community.bannerUrl}
            alt=""
            className="w-full h-full object-cover"
            style={{ objectPosition: `center ${getBannerPositionY(community.bannerUrl)}%` }}
          />
        )}
        <div className="absolute inset-0 bg-black/20" />
        {/* Back button */}
        <button
          onClick={() => router.back()}
          className="absolute top-4 left-4 p-2 rounded-xl bg-black/30 text-white backdrop-blur-sm hover:bg-black/40 transition-all"
        >
          <ArrowLeft size={18} />
        </button>
        {isCreator && (
          <button
            onClick={() => router.push(`/community/groups/${slug}/settings`)}
            className="absolute top-4 right-4 p-2 rounded-xl bg-black/30 text-white backdrop-blur-sm hover:bg-black/40 transition-all"
          >
            <Settings size={18} />
          </button>
        )}
      </div>

      <div className="max-w-[1100px] mx-auto px-4">
        {/* Community info card */}
        <div className={`relative -mt-12 sm:-mt-16 mb-6 rounded-2xl border p-5 shadow-sm ${dark ? 'bg-zinc-950 border-zinc-800' : 'bg-white border-zinc-200'}`}>
          <div className="flex items-start gap-4">
            {/* Avatar */}
            <div className={`w-20 h-20 sm:w-24 sm:h-24 rounded-2xl border-4 overflow-hidden shrink-0 flex items-center justify-center ${dark ? 'border-zinc-950 bg-indigo-900' : 'border-white bg-indigo-100'}`}>
              {community.avatarUrl ? (
                <img src={community.avatarUrl} alt={community.name} className="w-full h-full object-contain bg-black/5 dark:bg-white/5" />
              ) : (
                <span className={`text-3xl font-bold ${dark ? 'text-indigo-300' : 'text-indigo-600'}`}>
                  {community.name.charAt(0).toUpperCase()}
                </span>
              )}
            </div>

            <div className="flex-1 min-w-0 pt-1">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h1 className={`text-[22px] sm:text-[26px] font-bold tracking-tight leading-none ${dark ? 'text-white' : 'text-zinc-900'}`}>
                  {community.name}
                </h1>
                {isCreator && (
                  <span className={`flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${dark ? 'bg-amber-900/30 text-amber-400' : 'bg-amber-50 text-amber-600'}`}>
                    <Crown size={10} /> Creator
                  </span>
                )}
                {community.myRole === 'moderator' && (
                  <span className={`flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${dark ? 'bg-violet-900/30 text-violet-400' : 'bg-violet-50 text-violet-600'}`}>
                    <Shield size={10} /> Mod
                  </span>
                )}
              </div>

              <p className={`text-[13px] mb-2 ${dark ? 'text-zinc-500' : 'text-zinc-400'}`}>c/{community.slug}</p>

              <div className="flex flex-wrap items-center gap-4 text-[12.5px]">
                <span className={`flex items-center gap-1.5 ${dark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                  <Users size={13} />
                  {community.memberCount.toLocaleString()} members
                </span>
                <span className={`flex items-center gap-1.5 ${dark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                  {VISIBILITY_ICONS[community.visibility]}
                  {VISIBILITY_LABELS[community.visibility]}
                </span>
              </div>

              {community.description && (
                <p className={`mt-3 text-[13.5px] leading-relaxed ${dark ? 'text-zinc-300' : 'text-zinc-600'}`}>
                  {community.description}
                </p>
              )}
            </div>

            {/* Join / settings button (desktop) */}
            <div className="hidden sm:flex items-center gap-2 shrink-0">
              {(isMember || isCreator) && (
                <button
                  onClick={() => setIsInviteOpen(true)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-[13px] font-medium transition-all active:scale-95 ${
                    dark
                      ? 'border-zinc-700 text-zinc-300 hover:bg-zinc-900 hover:text-white'
                      : 'border-zinc-300 text-zinc-600 hover:bg-zinc-50 hover:text-zinc-800'
                  }`}
                >
                  <Mail size={15} /> Invite Friends
                </button>
              )}
              {isCreator ? (
                <button
                  onClick={() => router.push(`/community/groups/${slug}/settings`)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-[13px] font-medium transition-all active:scale-95 ${dark ? 'border-zinc-700 text-zinc-300 hover:bg-zinc-900' : 'border-zinc-300 text-zinc-650 hover:bg-zinc-50'}`}
                >
                  <Settings size={15} /> Settings
                </button>
              ) : (
                <button
                  onClick={handleJoinToggle}
                  disabled={joining || (community.visibility === 'invite_only' && !isMember)}
                  className={`px-5 py-2 rounded-xl text-[13.5px] font-semibold transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2 ${
                    isMember
                      ? dark ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                      : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                  }`}
                >
                  {joining && <Loader2 size={14} className="animate-spin" />}
                  {isMember ? 'Leave' : community.visibility === 'invite_only' ? 'Invite Only' : 'Join'}
                </button>
              )}
            </div>
          </div>

          {/* Mobile join button */}
          {!isCreator && (
            <button
              onClick={handleJoinToggle}
              disabled={joining || (community.visibility === 'invite_only' && !isMember)}
              className={`sm:hidden mt-4 w-full py-2.5 rounded-xl text-[13.5px] font-semibold transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 ${
                isMember
                  ? dark ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white'
              }`}
            >
              {joining && <Loader2 size={14} className="animate-spin" />}
              {isMember ? 'Leave Community' : community.visibility === 'invite_only' ? 'Invite Only' : 'Join Community'}
            </button>
          )}

          {/* Mobile Invite Button */}
          {(isMember || isCreator) && (
            <button
              onClick={() => setIsInviteOpen(true)}
              className={`sm:hidden mt-3 w-full py-2.5 rounded-xl border text-[13.5px] font-semibold transition-all active:scale-[0.98] flex items-center justify-center gap-2 ${
                dark
                  ? 'border-zinc-855 bg-zinc-900/30 text-zinc-350 hover:bg-zinc-900/60'
                  : 'border-zinc-200 bg-zinc-50/50 text-zinc-600 hover:bg-zinc-50'
              }`}
            >
              <Mail size={15} /> Invite Friends
            </button>
          )}
        </div>

        {/* Main layout */}
        <div className="xl:grid xl:grid-cols-[minmax(0,680px)_340px] xl:gap-6 xl:items-start">
          {/* Posts column */}
          <div className="w-full">
            {/* Desktop Composer */}
            {canPost && (
              <div className="hidden xl:block mb-4">
                <CommunityPostComposer
                  currentUser={{ id: userId, name: userName || 'You', avatarUrl }}
                  dark={dark}
                  communityId={community.id}
                  onPostCreated={handlePostCreated}
                />
              </div>
            )}

            {/* Refresh bar */}
            <div className="flex items-center justify-between mb-4">
              <p className={`text-[13px] font-semibold ${dark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                {posts.length > 0 ? `${posts.length} post${posts.length !== 1 ? 's' : ''}` : 'Posts'}
              </p>
              <button
                onClick={() => fetchCommunityPosts(slug)}
                disabled={postsLoading}
                className={`p-2 rounded-xl border transition-all ${dark ? 'border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-900' : 'border-zinc-200 text-zinc-500 hover:text-zinc-800 hover:bg-white'} disabled:opacity-40`}
              >
                <RefreshCw size={14} className={postsLoading ? 'animate-spin' : ''} />
              </button>
            </div>

            {/* Access denied message */}
            {!isMember && community.visibility !== 'public' && (
              <div className={`rounded-2xl border p-10 text-center mb-4 ${dark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'}`}>
                <Lock size={28} className={`mx-auto mb-3 ${dark ? 'text-zinc-500' : 'text-zinc-400'}`} />
                <p className={`font-semibold ${dark ? 'text-zinc-300' : 'text-zinc-700'}`}>This community is {VISIBILITY_LABELS[community.visibility]}</p>
                <p className={`text-[13px] mt-1 ${dark ? 'text-zinc-500' : 'text-zinc-400'}`}>Join to see posts</p>
              </div>
            )}

            {/* Posts feed */}
            {postsLoading && posts.length === 0 ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className={`rounded-xl border p-4 animate-pulse ${dark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'}`}>
                    <div className="flex gap-3 mb-3">
                      <div className={`w-10 h-10 rounded-full ${dark ? 'bg-zinc-800' : 'bg-zinc-200'}`} />
                      <div className="flex-1 space-y-2">
                        <div className={`h-3 w-32 rounded ${dark ? 'bg-zinc-800' : 'bg-zinc-200'}`} />
                        <div className={`h-2.5 w-20 rounded ${dark ? 'bg-zinc-800' : 'bg-zinc-200'}`} />
                      </div>
                    </div>
                    <div className={`h-3 rounded mb-2 ${dark ? 'bg-zinc-800' : 'bg-zinc-200'}`} />
                    <div className={`h-3 rounded w-3/4 ${dark ? 'bg-zinc-800' : 'bg-zinc-200'}`} />
                  </div>
                ))}
              </div>
            ) : postsError ? (
              <div className={`rounded-xl border p-8 text-center ${dark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'}`}>
                <p className={`text-[14px] mb-4 ${dark ? 'text-zinc-400' : 'text-zinc-500'}`}>{postsError}</p>
                <button onClick={() => fetchCommunityPosts(slug)} className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[13px] font-medium transition-all">
                  Try again
                </button>
              </div>
            ) : posts.length === 0 ? (
              <div className={`rounded-2xl border p-12 text-center ${dark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'}`}>
                <div className={`w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center ${dark ? 'bg-zinc-800' : 'bg-zinc-100'}`}>
                  <Plus size={28} className={dark ? 'text-zinc-500' : 'text-zinc-400'} />
                </div>
                <p className={`text-[16px] font-semibold mb-1 ${dark ? 'text-white' : 'text-zinc-800'}`}>No posts yet</p>
                <p className={`text-[13px] ${dark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                  {canPost ? 'Be the first to post in this community!' : 'Join to start posting'}
                </p>
              </div>
            ) : (
              <div className={`rounded-2xl border overflow-hidden shadow-sm divide-y ${dark ? 'bg-zinc-950/40 border-zinc-800 divide-zinc-800' : 'bg-white border-zinc-200 divide-zinc-200/80'}`}>
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
                  <div className="py-5 flex justify-center">
                    <button
                      onClick={() => fetchCommunityPosts(slug, nextCursor)}
                      disabled={postsLoading}
                      className={`px-6 py-2.5 rounded-xl border text-[13px] font-medium transition-all disabled:opacity-40 ${dark ? 'border-zinc-700 text-zinc-300 hover:bg-zinc-900' : 'border-zinc-300 text-zinc-700 hover:bg-white'}`}
                    >
                      {postsLoading ? 'Loading…' : 'Load more'}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="hidden xl:block sticky top-6 space-y-4">
            {/* About card */}
            <div className={`rounded-2xl border p-5 ${dark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'}`}>
              <h3 className={`text-[14px] font-bold mb-3 ${dark ? 'text-white' : 'text-zinc-800'}`}>About c/{community.slug}</h3>
              {community.description && (
                <p className={`text-[13px] leading-relaxed mb-4 ${dark ? 'text-zinc-400' : 'text-zinc-500'}`}>{community.description}</p>
              )}
              <div className={`space-y-2.5 text-[12.5px] ${dark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                <div className="flex items-center gap-2">
                  <Users size={14} />
                  <span>{community.memberCount.toLocaleString()} members</span>
                </div>
                <div className="flex items-center gap-2">
                  {VISIBILITY_ICONS[community.visibility]}
                  <span>{VISIBILITY_LABELS[community.visibility]}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`font-medium ${dark ? 'text-zinc-300' : 'text-zinc-600'}`}>Creator:</span>
                  <span>{community.creator.name}</span>
                </div>
              </div>
            </div>

            {/* Rules / placeholder */}
            {isCreator && (
              <button
                onClick={() => router.push(`/community/groups/${slug}/settings`)}
                className={`w-full flex items-center gap-2 px-4 py-3 rounded-2xl border text-[13px] font-medium transition-all active:scale-95 ${dark ? 'border-zinc-800 text-zinc-300 hover:bg-zinc-900' : 'border-zinc-200 text-zinc-600 hover:bg-zinc-50'}`}
              >
                <Settings size={15} /> Community Settings
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Mobile FAB for posting */}
      {canPost && (
        <button
          onClick={() => setIsComposeOpen(true)}
          className="fixed bottom-6 right-6 z-40 w-14 h-14 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full flex items-center justify-center shadow-2xl active:scale-95 transition-all xl:hidden group-has-[textarea:focus]:opacity-0 group-has-[textarea:focus]:pointer-events-none duration-300"
        >
          <Plus size={24} />
        </button>
      )}

      {/* Mobile Compose Modal */}
      {isComposeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className={`rounded-2xl border p-5 max-w-lg w-full shadow-2xl relative animate-in fade-in zoom-in-95 duration-200 ${dark ? 'bg-black border-zinc-800 text-white' : 'bg-white border-zinc-200 text-zinc-900'}`}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-[17px] font-semibold tracking-tight">Post to c/{slug}</h3>
              <button
                onClick={() => setIsComposeOpen(false)}
                className={`p-1.5 rounded-lg transition-colors ${dark ? 'text-zinc-400 hover:bg-zinc-900 hover:text-white' : 'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800'}`}
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
    </div>
  );
}
