'use client';

import React, { useEffect, useState, useCallback, useRef, use } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Calendar, FileText, Info, UserPlus, UserCheck, Users } from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '@/context/authContext';
import { useDarkMode } from '@/context/DarkModeContext';
import { auth } from '@/lib/firebase';
import API from '@/lib/axios';

import CommunityPostCard from '@/components/community/CommunityPostCard';

interface UserProfile {
  id: string;
  name: string;
  avatarUrl?: string | null;
  bio?: string | null;
  role: string;
  createdAt: string;
}

interface PostAuthor {
  id: string;
  name: string;
  avatarUrl?: string | null;
}

interface PostMedia {
  id: string;
  url: string;
  type: 'image' | 'video';
  thumbnailUrl?: string | null;
}

interface Post {
  id: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  author: PostAuthor;
  media: PostMedia[];
  likeCount: number;
  commentCount: number;
  likedByMe: boolean;
  followedByMe?: boolean;
  community?: {
    id: string;
    name: string;
    slug: string;
    avatarUrl?: string | null;
  } | null;
}

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export default function UserProfilePage({ params }: PageProps) {
  const router = useRouter();
  const { id: targetUserId } = use(params);
  const { isAuthenticated, loading: authLoading, userId: currentUserId, userDetails } = useAuth() as any;
  const { darkMode } = useDarkMode() as any;
  const dark = darkMode;

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [postsLoading, setPostsLoading] = useState(true);
  const [fetchingMore, setFetchingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasFetched = useRef(false);

  // Follow state
  const [following, setFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [followLoading, setFollowLoading] = useState(false);
  const isOwnProfile = targetUserId === currentUserId;



  const fetchProfileAndPosts = useCallback(async () => {
    if (hasFetched.current) return;
    hasFetched.current = true;
    
    setProfileLoading(true);
    setPostsLoading(true);
    setError(null);

    try {
      // 1. Fetch profile details + follow status in parallel
      const [profileRes, followRes, postsRes] = await Promise.all([
        API.get(`/auth/users/${targetUserId}`),
        API.get(`/community/users/${targetUserId}/follow-status`),
        API.get(`/community/users/${targetUserId}/posts`),
      ]);
      setProfile(profileRes.data.user);
      setFollowing(followRes.data.following);
      setFollowerCount(followRes.data.followerCount);
      setFollowingCount(followRes.data.followingCount);
      setProfileLoading(false);

      // 2. Apply posts
      setPosts(postsRes.data.posts || []);
      setNextCursor(postsRes.data.nextCursor || null);
    } catch (err: any) {
      console.error('[fetchProfileAndPosts]', err);
      setError('Failed to load user profile or posts. Please try again.');
    } finally {
      setProfileLoading(false);
      setPostsLoading(false);
    }
  }, [targetUserId]);

  useEffect(() => {
    if (targetUserId) {
      fetchProfileAndPosts();
    }
  }, [targetUserId, fetchProfileAndPosts]);

  const handleLoadMore = async () => {
    if (!nextCursor || fetchingMore) return;
    setFetchingMore(true);
    try {
      const { data } = await API.get(`/community/users/${targetUserId}/posts?cursor=${nextCursor}`);
      setPosts((prev) => [...prev, ...(data.posts || [])]);
      setNextCursor(data.nextCursor || null);
    } catch (err) {
      console.error('[handleLoadMore]', err);
    } finally {
      setFetchingMore(false);
    }
  };

  const handlePostDeleted = (deletedPostId: string) => {
    setPosts((prev) => prev.filter((p) => p.id !== deletedPostId));
  };

  const handleFollow = async () => {
    if (!currentUserId) {
      router.push('/login');
      return;
    }
    if (followLoading) return;
    setFollowLoading(true);
    const wasFollowing = following;
    setFollowing(!wasFollowing);
    setFollowerCount((c) => wasFollowing ? c - 1 : c + 1);
    try {
      const res = await API.post(`/community/users/${targetUserId}/follow`);
      setFollowerCount(res.data.followerCount);
    } catch {
      setFollowing(wasFollowing);
      setFollowerCount((c) => wasFollowing ? c + 1 : c - 1);
    } finally {
      setFollowLoading(false);
    }
  };

  const getRoleBadge = (role: string) => {
    const colors: Record<string, string> = {
      admin: 'bg-red-500/10 text-red-500 border-red-500/20 dark:bg-red-500/5',
      instructor: 'bg-amber-500/10 text-amber-500 border-amber-500/20 dark:bg-amber-500/5',
      student: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20 dark:bg-indigo-500/5',
    };
    const cls = colors[role?.toLowerCase()] || colors.student;
    return (
      <span className={`text-[10px] uppercase tracking-wider font-semibold px-2.5 py-0.5 rounded-full border ${cls}`}>
        {role || 'student'}
      </span>
    );
  };

  const getAvatar = (name: string, avatarUrl?: string | null) => {
    let avatarToRender = avatarUrl;
    if (targetUserId === currentUserId) {
      avatarToRender = userDetails?.avatarUrl || avatarUrl || auth.currentUser?.photoURL || null;
    }
    if (avatarToRender) {
      return (
        <img
          src={avatarToRender}
          alt={name}
          referrerPolicy="no-referrer"
          className="w-20 h-20 rounded-full border-4 border-white dark:border-zinc-900 shadow-md object-cover bg-zinc-200 dark:bg-zinc-800"
        />
      );
    }
    const colors = [
      'from-indigo-400 to-purple-500',
      'from-pink-400 to-rose-500',
      'from-emerald-400 to-teal-500',
      'from-amber-400 to-orange-500',
      'from-blue-400 to-cyan-500',
    ];
    const colorIdx = name.charCodeAt(0) % colors.length;
    return (
      <div
        className={`w-20 h-20 rounded-full border-4 border-white dark:border-zinc-900 shadow-md flex items-center justify-center text-[28px] font-bold text-white bg-gradient-to-br ${colors[colorIdx]}`}
      >
        {name.charAt(0).toUpperCase()}
      </div>
    );
  };

  if (authLoading) {
    return (
      <div className={`min-h-screen flex justify-center items-center ${dark ? 'bg-black text-white' : 'bg-white text-zinc-900'}`}>
        <span className="inline-block w-6 h-6 rounded-full border-[2px] border-current border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className={`min-h-screen transition-colors duration-300 pt-[96px] md:pt-[24px] pb-16 ${dark ? 'bg-black text-white' : 'bg-white text-zinc-900'}`}>
      <div className="max-w-[600px] w-full mx-auto px-4">
        
        {/* Navigation Header */}
        <div className={`sticky top-0 z-20 -mx-4 px-4 py-4 mb-6 backdrop-blur-md border-b flex items-center gap-3.5 ${
          dark ? 'bg-black/80 border-zinc-800/60' : 'bg-white/80 border-zinc-200/60'
        }`}>
          <button
            onClick={() => router.push('/community')}
            className={`p-2 rounded-xl transition-colors ${
              dark ? 'hover:bg-zinc-900 text-zinc-400 hover:text-white' : 'hover:bg-zinc-100 text-zinc-500 hover:text-zinc-900'
            }`}
            title="Back to Community"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-[16px] font-semibold tracking-tight">
              {profileLoading ? 'Loading Profile…' : profile?.name}
            </h1>
            <p className={`text-[11.5px] ${dark ? 'text-zinc-500' : 'text-zinc-400'}`}>
              {!profileLoading && posts.length} {posts.length === 1 ? 'post' : 'posts'}
            </p>
          </div>
        </div>

        {error ? (
          <div className={`rounded-2xl border p-8 text-center ${dark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'}`}>
            <p className={`text-[14px] mb-4 ${dark ? 'text-zinc-400' : 'text-zinc-500'}`}>{error}</p>
            <button
              onClick={() => {
                hasFetched.current = false;
                fetchProfileAndPosts();
              }}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-[13px] font-medium transition-all"
            >
              Try again
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            
            {/* Profile Card */}
            <div className={`rounded-2xl border overflow-hidden ${
              dark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200 shadow-sm'
            }`}>
              {/* Profile card top banner */}
              <div className={`h-24 w-full bg-gradient-to-r border-b ${
                dark 
                  ? 'from-indigo-950/20 to-purple-950/20 border-zinc-800' 
                  : 'from-indigo-500/10 to-purple-500/10 border-zinc-200'
              }`} />

              <div className="relative px-6 pb-6 pt-3">
                {/* Avatar overlap */}
                <div className="absolute -top-10 left-6">
                  {profileLoading ? (
                    <div className={`w-20 h-20 rounded-full border-4 animate-pulse ${
                      dark ? 'bg-zinc-800 border-zinc-900' : 'bg-zinc-200 border-white'
                    }`} />
                  ) : (
                    profile && getAvatar(profile.name, profile.avatarUrl)
                  )}
                </div>

                {/* Profile Meta Details */}
                <div className="pt-12">
                  {profileLoading ? (
                    <div className="space-y-2">
                      <div className={`h-5 w-1/3 rounded animate-pulse ${dark ? 'bg-zinc-800' : 'bg-zinc-200'}`} />
                      <div className={`h-4 w-1/2 rounded animate-pulse ${dark ? 'bg-zinc-800' : 'bg-zinc-200'}`} />
                    </div>
                  ) : (
                    profile && (
                      <>
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h2 className={`text-[19px] font-bold tracking-tight ${dark ? 'text-white' : 'text-zinc-900'}`}>
                              {profile.name}
                            </h2>
                            {getRoleBadge(profile.role)}
                          </div>

                          {/* Follow button — only on other users' profiles */}
                          {!isOwnProfile && (
                            <button
                              onClick={handleFollow}
                              disabled={followLoading}
                              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-[13px] font-semibold border transition-all disabled:opacity-50 ${
                                following
                                  ? dark
                                    ? 'border-indigo-500/40 text-indigo-400 bg-indigo-500/10 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/40'
                                    : 'border-indigo-200 text-indigo-600 bg-indigo-50 hover:bg-red-50 hover:text-red-500 hover:border-red-200'
                                  : dark
                                    ? 'border-zinc-700 text-zinc-300 hover:border-indigo-500 hover:text-indigo-400 hover:bg-indigo-500/10'
                                    : 'border-zinc-300 text-zinc-700 hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50'
                              }`}
                            >
                              {following ? <UserCheck size={14} /> : <UserPlus size={14} />}
                              {following ? 'Following' : 'Follow'}
                            </button>
                          )}
                        </div>

                        {/* Follower / Following counts */}
                        <div className={`flex items-center gap-4 mt-2 text-[12.5px] ${dark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                          <span>
                            <strong className={dark ? 'text-white' : 'text-zinc-800'}>{followerCount}</strong>
                            {' '}follower{followerCount !== 1 ? 's' : ''}
                          </span>
                          <span>
                            <strong className={dark ? 'text-white' : 'text-zinc-800'}>{followingCount}</strong>
                            {' '}following
                          </span>
                        </div>

                        <p className={`text-[11.5px] flex items-center gap-1.5 mt-1 ${
                          dark ? 'text-zinc-500' : 'text-zinc-400'
                        }`}>
                          <Calendar size={13} className="shrink-0" />
                          <span>Joined DojoClass {format(new Date(profile.createdAt), 'MMMM yyyy')}</span>
                        </p>

                        {/* Bio box */}
                        {profile.bio ? (
                          <div className={`mt-4 p-3 rounded-xl border text-[13px] leading-relaxed ${
                            dark 
                              ? 'bg-zinc-800/30 border-zinc-800/80 text-zinc-300' 
                              : 'bg-zinc-50/50 border-zinc-200 text-zinc-600'
                          }`}>
                            {profile.bio}
                          </div>
                        ) : (
                          <p className={`text-[13.5px] italic mt-4 flex items-center gap-1.5 ${
                            dark ? 'text-zinc-600' : 'text-zinc-400'
                          }`}>
                            <Info size={13} />
                            <span>No bio details added yet.</span>
                          </p>
                        )}
                      </>
                    )
                  )}
                </div>
              </div>
            </div>

            {/* Timeline Feed */}
            <div>
              <h3 className={`text-[11px] uppercase tracking-widest font-bold mb-4 flex items-center gap-1.5 ${
                dark ? 'text-zinc-500' : 'text-zinc-400'
              }`}>
                <FileText size={12} />
                <span>Posts Timeline</span>
              </h3>

              {postsLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((n) => (
                    <div
                      key={n}
                      className={`rounded-2xl border p-4 animate-pulse ${
                        dark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'
                      }`}
                    >
                      <div className="flex gap-3 items-center mb-3">
                        <div className={`w-10 h-10 rounded-full ${dark ? 'bg-zinc-800' : 'bg-zinc-200'}`} />
                        <div className="flex-1 space-y-1.5">
                          <div className={`h-3 w-1/4 rounded ${dark ? 'bg-zinc-800' : 'bg-zinc-200'}`} />
                          <div className={`h-2.5 w-1/6 rounded ${dark ? 'bg-zinc-800' : 'bg-zinc-200'}`} />
                        </div>
                      </div>
                      <div className={`h-3 rounded mb-2 ${dark ? 'bg-zinc-800' : 'bg-zinc-200'}`} />
                      <div className={`h-3 rounded w-3/4 ${dark ? 'bg-zinc-800' : 'bg-zinc-200'}`} />
                    </div>
                  ))}
                </div>
              ) : posts.length === 0 ? (
                <div className={`rounded-2xl border p-12 text-center ${
                  dark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'
                }`}>
                  <p className={`text-[13.5px] font-semibold mb-1 ${dark ? 'text-zinc-400' : 'text-zinc-800'}`}>
                    No posts timeline
                  </p>
                  <p className={`text-[12px] ${dark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                    This user hasn&apos;t posted anything to the community feed yet.
                  </p>
                </div>
              ) : (
                <div className={`rounded-2xl border overflow-hidden shadow-sm divide-y ${
                  dark ? 'bg-zinc-950/40 border-zinc-800 divide-zinc-800' : 'bg-white border-zinc-200 divide-zinc-200/80'
                }`}>
                  {posts.map((post) => (
                    <CommunityPostCard
                      key={post.id}
                      post={post}
                      currentUserId={currentUserId}
                      dark={dark}
                      onDelete={handlePostDeleted}
                    />
                  ))}

                  {/* Load More posts */}
                  {nextCursor && (
                    <div className="pt-4 pb-8 flex justify-center bg-white/50 dark:bg-zinc-950/10">
                      <button
                        onClick={handleLoadMore}
                        disabled={fetchingMore}
                        className={`px-6 py-2.5 rounded-xl border text-[13px] font-medium transition-all ${
                          dark
                            ? 'border-zinc-700 text-zinc-300 hover:bg-zinc-900 disabled:opacity-40'
                            : 'border-zinc-300 text-zinc-700 hover:bg-white shadow-sm disabled:opacity-40'
                        }`}
                      >
                        {fetchingMore ? (
                          <span className="flex items-center gap-2">
                            <span className="w-3.5 h-3.5 border-[1.5px] border-current border-t-transparent rounded-full animate-spin" />
                            Loading…
                          </span>
                        ) : (
                          'Load more posts'
                        )}
                      </button>
                    </div>
                  )}

                  {!nextCursor && posts.length > 0 && (
                    <div className="py-6 bg-white/50 dark:bg-zinc-950/10">
                      <p className={`text-center text-[12px] ${dark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                        End of timeline feed
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
