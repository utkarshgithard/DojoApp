'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/authContext';
import { useDarkMode } from '@/context/DarkModeContext';
import { auth } from '@/lib/firebase';
import { useCommunity, Post } from '@/context/CommunityContext';
import CommunityPostComposer from '@/components/community/CommunityPostComposer';
import CommunityPostCard from '@/components/community/CommunityPostCard';
import SharedInbox from '@/components/community/SharedInbox';
import { Users2, RefreshCw, ArrowUp, ArrowLeft } from 'lucide-react';

export default function CommunityPage() {
  const router = useRouter();
  const { isAuthenticated, loading, userId, userName, userDetails, profileLoading } = useAuth() as any;
  const { darkMode } = useDarkMode() as any;
  const dark = darkMode;

  const avatarUrl = profileLoading ? null : (userDetails?.avatarUrl || auth.currentUser?.photoURL || null);

  // Scroll detection to sync with global Navbar
  const [showNavbar, setShowNavbar] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

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
  } = useCommunity();

  // Redirect if not auth
  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/');
    }
  }, [isAuthenticated, loading, router]);

  // Initial load or silent revalidation
  useEffect(() => {
    if (!loading && isAuthenticated) {
      if (posts.length === 0) {
        fetchPosts();
      } else {
        // Silent revalidation in the background
        fetchPosts(undefined, true);
      }
    }
  }, [loading, isAuthenticated, fetchPosts, posts.length]);

  // Silent background revalidation on page visibility refocus (e.g. returning to tab)
  useEffect(() => {
    if (!isAuthenticated || loading) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchPosts(undefined, true);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isAuthenticated, loading, fetchPosts]);

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

  if (loading || (!isAuthenticated && !loading)) return null;

  return (
    <div
      className={`min-h-screen pt-[50px] md:pt-0 transition-colors duration-300 ${dark ? 'bg-[#0a0a0a] text-white' : 'bg-[#f5f5f5] text-zinc-900'
        }`}
    >
      <div className="max-w-[680px] xl:max-w-[1240px] w-full mx-auto px-4 relative xl:grid xl:grid-cols-[minmax(0,680px)_480px] xl:justify-center xl:gap-6 xl:items-start">
        <div className="w-full flex flex-col">
          {/* Page header */}
          <div className={`sticky ${showNavbar ? 'top-[50px]' : 'top-0'} md:top-0 z-20 -mx-4 px-4 py-4 mb-6 backdrop-blur-md border-b flex items-center justify-between transition-all duration-300 ${dark ? 'bg-black/80 border-zinc-900/60' : 'bg-zinc-50/80 border-zinc-200/60'
            }`}>
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.back()}
                className={`p-2 rounded-xl transition-all mr-1 ${dark ? 'text-zinc-400 hover:text-white hover:bg-zinc-900' : 'text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100'}`}
                title="Go back"
              >
                <ArrowLeft size={20} />
              </button>
              <div
                className={`hidden sm:flex w-10 h-10 rounded-xl items-center justify-center ${dark ? 'bg-indigo-500/10 text-indigo-400' : 'bg-indigo-50 text-indigo-600'
                  }`}
              >
                <Users2 size={20} />
              </div>
              <div>
                <h1 className={`text-[20px] font-semibold tracking-tight ${dark ? 'text-white' : 'text-zinc-900'}`}>
                  Community
                </h1>
                <p className={`text-[12.5px] ${dark ? 'text-zinc-500' : 'text-zinc-500'}`}>
                  Share updates from the dojo
                </p>
              </div>
            </div>
            <button
              onClick={handleRefresh}
              disabled={fetching}
              className={`p-2 rounded-xl border transition-all ${dark
                ? 'border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-900'
                : 'border-zinc-200 text-zinc-500 hover:text-zinc-800 hover:bg-white'
                } disabled:opacity-40`}
              title="Refresh feed"
            >
              <RefreshCw size={16} className={fetching ? 'animate-spin' : ''} />
            </button>
          </div>

          {/* Mobile Post Composer & Inbox */}
          {isAuthenticated && (
            <div className="xl:hidden relative mb-6 space-y-4">
              <CommunityPostComposer
                currentUser={{ id: userId, name: userName || 'You', avatarUrl }}
                dark={dark}
                onPostCreated={handlePostCreated}
              />
              <SharedInbox dark={dark} />
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
                  : 'bg-white/90 backdrop-blur-md border-zinc-200 text-indigo-650 hover:bg-zinc-50 hover:text-indigo-700'
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
                  className={`rounded-lg border p-4 animate-pulse ${dark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'
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
              className={`rounded-lg border p-8 text-center ${dark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'
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
              className={`rounded-lg border p-12 text-center ${dark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'
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
            <div className="space-y-[2px]">
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
                <div className="pt-2 pb-8 flex justify-center">
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
                <p className={`text-center text-[12px] pb-8 ${dark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                  You&apos;ve seen all the posts 🎉
                </p>
              )}
            </div>
          )}
        </div>

        {/* Desktop right column: Composer + Shared Inbox */}
        {isAuthenticated && (
          <div className="hidden xl:block sticky top-[24px] space-y-0">
            <CommunityPostComposer
              currentUser={{ id: userId, name: userName || 'You', avatarUrl }}
              dark={dark}
              onPostCreated={handlePostCreated}
            />
            <SharedInbox dark={dark} />
          </div>
        )}
      </div>
    </div>
  );
}
