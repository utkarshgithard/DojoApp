'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/authContext';
import { useDarkMode } from '@/context/DarkModeContext';
import { auth } from '@/lib/firebase';
import { useCommunity, Post } from '@/context/CommunityContext';
import { useCommunityGroups } from '@/context/CommunityGroupContext';
import CommunityPostComposer from '@/components/community/CommunityPostComposer';
import CommunityPostCard from '@/components/community/CommunityPostCard';
import SharedInbox from '@/components/community/SharedInbox';
import { Users2, RefreshCw, ArrowUp, ArrowLeft, Inbox, Plus, X, Camera, Orbit } from 'lucide-react';

export default function CommunityPage() {
  const router = useRouter();
  const { isAuthenticated, loading, userId, userName, userDetails, profileLoading } = useAuth() as any;
  const { darkMode } = useDarkMode() as any;
  const dark = darkMode;

  const { myCommunities, fetchMyCommunities, myLoading } = useCommunityGroups();

  const avatarUrl = profileLoading ? null : (userDetails?.avatarUrl || auth.currentUser?.photoURL || null);

  // Scroll detection to sync with global Navbar
  const [showNavbar, setShowNavbar] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  // Mobile Compose Modal state
  const [isComposeOpen, setIsComposeOpen] = useState(false);

  // Preselected file (e.g. from camera quick action)
  const [preselectedFile, setPreselectedFile] = useState<File | null>(null);
  const cameraFabInputRef = useRef<HTMLInputElement>(null);

  const handleCloseCompose = () => {
    setIsComposeOpen(false);
    setPreselectedFile(null);
  };

  const handleCameraFabSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      setPreselectedFile(files[0]);
      setIsComposeOpen(true);
    }
  };

  useEffect(() => {
    let timeout: NodeJS.Timeout;
    const controlNavbar = () => {
      if (window.scrollY < lastScrollY) {
        setShowNavbar(true);
      } else {
        setShowNavbar(false);
      }
      setLastScrollY(window.scrollY);

      clearTimeout(timeout);
      timeout = setTimeout(() => setShowNavbar(true), 1500);
    };

    window.addEventListener('scroll', controlNavbar);
    return () => {
      window.removeEventListener('scroll', controlNavbar);
      clearTimeout(timeout);
    };
  }, [lastScrollY]);

  const {
    posts,
    nextCursor,
    initialLoading,
    fetching,
    error,
    scrollPosition,
    setScrollPosition,
    fetchPosts,
    handlePostCreated,
    handlePostDeleted,
    refreshFeed,
    hasNewPosts,
    applyNewPosts,
    sharesTotalCount,
    hasSharesData,
    fetchShares,
  } = useCommunity();

  // Initial load or silent revalidation
  useEffect(() => {
    if (!loading) {
      if (posts.length === 0) {
        fetchPosts();
      } else {
        // Silent revalidation in the background
        fetchPosts(undefined, true);
      }
    }
  }, [loading, fetchPosts, posts.length]);

  // Fetch followed communities on mount / auth change
  useEffect(() => {
    if (isAuthenticated) {
      fetchMyCommunities();
    }
  }, [isAuthenticated, fetchMyCommunities]);

  // Fetch shared posts in the background for the mobile header badge count
  useEffect(() => {
    if (!loading && isAuthenticated && !hasSharesData) {
      fetchShares(true);
    }
  }, [loading, isAuthenticated, hasSharesData, fetchShares]);

  // Silent background revalidation on page visibility refocus (e.g. returning to tab)
  useEffect(() => {
    if (loading) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchPosts(undefined, true);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [loading, fetchPosts]);

  // Restore scroll position on mount
  useEffect(() => {
    if (posts.length > 0 && scrollPosition > 0) {
      const timer = setTimeout(() => {
        window.scrollTo(0, scrollPosition);
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [posts.length, scrollPosition]);

  // Save scroll position on unmount
  useEffect(() => {
    return () => {
      setScrollPosition(window.scrollY);
    };
  }, [setScrollPosition]);

  const handleLoadMore = () => {
    if (nextCursor) fetchPosts(nextCursor);
  };

  const handleRefresh = () => {
    refreshFeed();
    setTimeout(() => {
      fetchPosts();
    }, 0);
  };

  if (loading) return null;

  return (
    <div
      className={`group min-h-screen pt-[50px] md:pt-0 transition-colors duration-300 ${dark ? 'bg-[#0a0a0a] text-white' : 'bg-[#f5f5f5] text-zinc-900'
        }`}
    >
      <div className="max-w-[680px] xl:max-w-[1240px] w-full mx-auto px-4 relative xl:grid xl:grid-cols-[minmax(0,680px)_480px] xl:justify-center xl:gap-6 xl:items-start">
        <div className="w-full flex flex-col">
          {/* Page header */}
          <div className={`sticky ${showNavbar ? 'top-[50px]' : 'top-0'} md:top-0 z-20 mb-4 backdrop-blur-md border rounded-md flex items-center justify-between p-3 sm:p-4 transition-all duration-300 ${dark ? 'bg-zinc-950/40 border-zinc-800 text-white' : 'bg-white border-zinc-200 text-zinc-900'
            }`}>
            <div className="flex items-center gap-2 sm:gap-3">
              <button
                onClick={() => router.back()}
                className={`p-1.5 sm:p-2 rounded-xl transition-all mr-0.5 sm:mr-1 ${dark ? 'text-zinc-400 hover:text-white hover:bg-zinc-900' : 'text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100'}`}
                title="Go back"
              >
                <ArrowLeft size={18} className="sm:w-5 sm:h-5" />
              </button>
              <div
                className={`hidden sm:flex w-10 h-10 rounded-xl items-center justify-center ${dark ? 'bg-indigo-500/10 text-indigo-400' : 'bg-indigo-50 text-indigo-600'
                  }`}
              >
                <Users2 size={20} />
              </div>
              <div>
                <h1 className={`text-[17px] sm:text-[20px] font-bold tracking-tight ${dark ? 'text-white' : 'text-zinc-900'}`}>
                  Community
                </h1>
                <p className={`text-[12.5px] hidden sm:block ${dark ? 'text-zinc-500' : 'text-zinc-500'}`}>
                  Share updates from the dojo
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Mobile Shared Inbox Icon */}
              {isAuthenticated && (
                <button
                  onClick={() => router.push('/community/shares')}
                  className={`relative p-2 rounded-xl border transition-all xl:hidden ${dark
                    ? 'border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-900'
                    : 'border-zinc-200 text-zinc-500 hover:text-zinc-800 hover:bg-white'
                    }`}
                  title="Shared with me"
                >
                  <Inbox size={16} />
                  {sharesTotalCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center animate-pulse">
                      {sharesTotalCount}
                    </span>
                  )}
                </button>
              )}

              <button
                onClick={() => router.push('/community/groups')}
                className={`p-2 rounded-xl border transition-all ${dark
                  ? 'border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-900'
                  : 'border-zinc-200 text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100'
                  }`}
                title="Explore Communities"
              >
                <Orbit size={16} />
              </button>

              <button
                onClick={handleRefresh}
                disabled={fetching}
                className={`p-2 rounded-xl border transition-all ${dark
                  ? 'border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-900'
                  : 'border-zinc-200 text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100'
                  } disabled:opacity-40`}
                title="Refresh feed"
              >
                <RefreshCw size={16} className={fetching ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>

          {/* Mobile Login Prompt (Only shown if NOT logged in) */}
          {!isAuthenticated && (
            <div className="xl:hidden relative mb-6">
              <div className={`rounded-lg border p-5 text-center shadow-sm ${dark ? 'bg-zinc-900 border-zinc-800 text-white' : 'bg-white border-zinc-200 text-zinc-900'
                }`}>
                <h3 className="font-semibold text-[15.5px] mb-1.5">Join the Dojo Community</h3>
                <p className={`text-[12.5px] mb-4 leading-relaxed ${dark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                  Log in or sign up to post updates, like training highlights, reply to comments, and connect with other members.
                </p>
                <div className="flex gap-3 justify-center">
                  <button
                    onClick={() => router.push('/login')}
                    className="px-4 py-2 text-[13px] font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-all active:scale-95 shadow-sm"
                  >
                    Log In
                  </button>
                  <button
                    onClick={() => router.push('/register')}
                    className={`px-4 py-2 text-[13px] font-semibold border rounded-xl transition-all active:scale-95 ${dark ? 'border-zinc-700 text-zinc-300 hover:bg-zinc-800' : 'border-zinc-300 text-zinc-750 hover:bg-zinc-50'
                      }`}
                  >
                    Sign Up
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* New Posts Indicator at the bottom */}
          {hasNewPosts && (
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 animate-in fade-in slide-in-from-bottom-4 duration-300">
              <button
                onClick={() => {
                  applyNewPosts();
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-full shadow-xl border text-[13px] font-semibold transition-all duration-300 hover:scale-105 active:scale-95 ${dark
                  ? 'bg-zinc-900/90 backdrop-blur-md border-zinc-800 text-indigo-400 hover:bg-zinc-800 hover:text-indigo-300'
                  : 'bg-white/90 backdrop-blur-md border-zinc-200 text-indigo-600 hover:bg-zinc-50 hover:text-indigo-700'
                  } animate-bounce`}
                style={{ animationDuration: '2.5s' }}
              >
                <ArrowUp size={14} />
                <span>New posts available</span>
              </button>
            </div>
          )}

          {/* Feed */}
          {initialLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className={`rounded-md border p-4 animate-pulse ${dark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'
                    }`}
                >
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
          ) : error ? (
            <div
              className={`rounded-md border p-8 text-center ${dark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'
                }`}
            >
              <p className={`text-[14px] mb-4 ${dark ? 'text-zinc-400' : 'text-zinc-500'}`}>{error}</p>
              <button
                onClick={handleRefresh}
                className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[13px] font-medium transition-all"
              >
                Try again
              </button>
            </div>
          ) : posts.length === 0 ? (
            <div
              className={`rounded-md border p-12 text-center ${dark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'
                }`}
            >
              <div
                className={`w-16 h-16 rounded-lg mx-auto mb-4 flex items-center justify-center ${dark ? 'bg-zinc-800' : 'bg-zinc-100'
                  }`}
              >
                <Users2 size={28} className={dark ? 'text-zinc-500' : 'text-zinc-400'} />
              </div>
              <p className={`text-[15px] font-semibold mb-1 ${dark ? 'text-white' : 'text-zinc-800'}`}>
                Nothing here yet
              </p>
              <p className={`text-[13px] ${dark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                Be the first to post something to the dojo community!
              </p>
            </div>
          ) : (
            <div className={`rounded-xl border overflow-hidden shadow-sm divide-y ${dark ? 'bg-zinc-950/40 border-zinc-800 divide-zinc-800' : 'bg-white border-zinc-200 divide-zinc-200/80'
              }`}>
              {posts.map((post) => (
                <CommunityPostCard
                  key={post.id}
                  post={post}
                  currentUserId={userId}
                  dark={dark}
                  onDelete={handlePostDeleted}
                />
              ))}

              {/* Load More */}
              {nextCursor && (
                <div className="pt-4 pb-8 flex justify-center bg-white/50 dark:bg-zinc-950/10">
                  <button
                    onClick={handleLoadMore}
                    disabled={fetching}
                    className={`px-6 py-2.5 rounded-xl border text-[13px] font-medium transition-all ${dark
                        ? 'border-zinc-700 text-zinc-300 hover:bg-zinc-900 disabled:opacity-40'
                        : 'border-zinc-300 text-zinc-700 hover:bg-white shadow-sm disabled:opacity-40'
                      }`}
                  >
                    {fetching ? (
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
                    You&apos;ve seen all the posts 🎉
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Desktop right column: Composer + Shared Inbox + Explore Communities */}
        {isAuthenticated ? (
          <div className="hidden xl:block sticky top-[24px] space-y-4">
            <CommunityPostComposer
              currentUser={{ id: userId, name: userName || 'You', avatarUrl }}
              dark={dark}
              onPostCreated={handlePostCreated}
            />
            <div className={`rounded-xl border p-5 ${dark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200 shadow-sm'}`}>
              <div className="flex items-center justify-between mb-4">
                <h3 className={`text-[14px] font-bold ${dark ? 'text-white' : 'text-zinc-800'}`}>Communities</h3>
                {myCommunities.length > 0 && (
                  <button
                    onClick={() => router.push('/community/groups')}
                    className="group flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-500/10 dark:hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 transition-all duration-300 hover:scale-105 active:scale-95"
                  >
                    <span className="text-[12px] font-semibold">Explore</span>
                    <Orbit size={14} className="transition-transform duration-700 group-hover:rotate-[360deg] ease-in-out" />
                  </button>
                )}
              </div>

              {myCommunities.length > 0 ? (
                <div className="flex flex-wrap gap-2 mb-3 max-h-[220px] overflow-y-auto pr-1 scrollbar-thin">
                  {myCommunities.map((group) => (
                    <div
                      key={group.id}
                      onClick={() => router.push(`/community/groups/${group.slug}`)}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-full cursor-pointer transition-all duration-300 border hover:-translate-y-0.5 hover:shadow-md ${
                        dark
                          ? 'bg-zinc-800/40 border-zinc-700 hover:bg-zinc-700/80 hover:border-zinc-600 active:bg-zinc-800'
                          : 'bg-zinc-50 border-zinc-200 hover:bg-white hover:border-zinc-300 active:bg-zinc-100'
                      }`}
                    >
                      {group.avatarUrl ? (
                        <img
                          src={group.avatarUrl}
                          alt={group.name}
                          className="w-5 h-5 rounded-full object-cover border border-zinc-200 dark:border-zinc-700"
                        />
                      ) : (
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] ${
                          dark ? 'bg-indigo-950 text-indigo-400' : 'bg-indigo-50 text-indigo-600'
                        }`}>
                          {group.name.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      <span className={`text-[12.5px] font-medium truncate max-w-[120px] ${dark ? 'text-zinc-200' : 'text-zinc-800'}`}>
                        {group.name}
                      </span>
                    </div>
                  ))}
                </div>
              ) : myLoading ? (
                <div className="space-y-3 mb-4">
                  {[1, 2].map((i) => (
                    <div key={i} className="flex items-center gap-3 p-2 animate-pulse">
                      <div className={`w-8 h-8 rounded-lg ${dark ? 'bg-zinc-800' : 'bg-zinc-150'}`} />
                      <div className="flex-1 space-y-1.5">
                        <div className={`h-3 w-2/3 rounded ${dark ? 'bg-zinc-800' : 'bg-zinc-150'}`} />
                        <div className={`h-2.5 w-1/3 rounded ${dark ? 'bg-zinc-800' : 'bg-zinc-150'}`} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className={`text-[12.5px] leading-relaxed mb-4 ${dark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                  Join specialized interest groups, post to specific communities, or moderate your own.
                </p>
              )}

              {(myCommunities.length === 0 && !myLoading) && (
                <button
                  onClick={() => router.push('/community/groups')}
                  className="group relative w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-[13px] font-semibold transition-all duration-300 hover:shadow-lg hover:shadow-indigo-500/30 hover:-translate-y-0.5 active:translate-y-0 active:scale-95"
                >
                  <Orbit size={16} className="transition-transform group-hover:rotate-[360deg] duration-1000 ease-in-out" />
                  <span>Explore Communities</span>
                </button>
              )}
            </div>
            <SharedInbox dark={dark} />
          </div>
        ) : (
          <div className="hidden xl:block sticky top-[24px]">
            <div className={`rounded-lg border p-6 text-center shadow-sm ${dark ? 'bg-zinc-900 border-zinc-800 text-white' : 'bg-white border-zinc-200 text-zinc-900'
              }`}>
              <h3 className="font-semibold text-[16px] mb-2">Join the Dojo Community</h3>
              <p className={`text-[13px] mb-5 leading-relaxed ${dark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                Log in or sign up to post updates, like posts, comment on discussions, and connect with other users in the dojo.
              </p>
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => router.push('/login')}
                  className="w-full py-2.5 text-[13.5px] font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-all active:scale-95 shadow-sm"
                >
                  Log In
                </button>
                <button
                  onClick={() => router.push('/register')}
                  className={`w-full py-2.5 text-[13.5px] font-semibold border rounded-xl transition-all active:scale-95 ${dark ? 'border-zinc-700 text-zinc-300 hover:bg-zinc-800' : 'border-zinc-300 text-zinc-750 hover:bg-zinc-50'
                    }`}
                >
                  Create an Account
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Floating Action Buttons (FAB) for Mobile Post & Camera Creation */}
      {isAuthenticated && (
        <div className="fixed bottom-6 right-6 z-40 flex flex-col gap-3 items-end xl:hidden group-has-[textarea:focus]:opacity-0 group-has-[textarea:focus]:pointer-events-none transition-all duration-300">
          {/* Quick Camera FAB */}
          <button
            onClick={() => cameraFabInputRef.current?.click()}
            className={`w-12 h-12 rounded-full flex items-center justify-center shadow-lg border active:scale-95 transition-all ${dark
                ? 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-800 hover:text-white'
                : 'bg-white border-zinc-200 text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900'
              }`}
            title="Snap a photo"
          >
            <Camera size={20} />
          </button>

          {/* Plus/Compose FAB */}
          <button
            onClick={() => setIsComposeOpen(true)}
            className="w-14 h-14 bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white rounded-full flex items-center justify-center shadow-2xl active:scale-95 transition-all"
            title="Create a post"
          >
            <Plus size={24} />
          </button>

          {/* Hidden input for quick camera capture */}
          <input
            ref={cameraFabInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleCameraFabSelect}
          />
        </div>
      )}

      {/* Mobile Compose Modal */}
      {isComposeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm transition-all duration-300 p-4">
          <div className={`rounded-xl border p-5 max-w-lg w-full shadow-2xl relative animate-in fade-in zoom-in-95 duration-200 ${dark ? 'bg-black border-zinc-800 text-white' : 'bg-white border-zinc-200 text-zinc-900'
            }`}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-[17px] font-semibold tracking-tight">Create Post</h3>
              <button
                onClick={handleCloseCompose}
                className={`p-1.5 rounded-lg transition-colors ${dark ? 'text-zinc-400 hover:bg-zinc-900 hover:text-white' : 'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800'}`}
              >
                <X size={18} />
              </button>
            </div>
            <CommunityPostComposer
              currentUser={{ id: userId, name: userName || 'You', avatarUrl }}
              dark={dark}
              initialFile={preselectedFile}
              onPostCreated={(post) => {
                handlePostCreated(post);
                handleCloseCompose();
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
