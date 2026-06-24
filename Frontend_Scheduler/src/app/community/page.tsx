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
              {/* DojoClass Themed Minimal SVG */}
              <div className="flex justify-center mb-4 mt-1">
                <div className="relative group">
                  <svg 
                    width="96" 
                    height="96" 
                    viewBox="0 0 120 120" 
                    fill="none" 
                    xmlns="http://www.w3.org/2000/svg"
                    className="transform group-hover:scale-105 transition-transform duration-300"
                  >
                    <defs>
                      {/* Body 3D Shading Gradient */}
                      <linearGradient id="rocketBodyGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#4f46e5" />
                        <stop offset="35%" stopColor="#818cf8" />
                        <stop offset="70%" stopColor="#4f46e5" />
                        <stop offset="100%" stopColor="#3730a3" />
                      </linearGradient>
                      
                      <linearGradient id="rocketBodyGradDark" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#27272a" />
                        <stop offset="35%" stopColor="#52525b" />
                        <stop offset="70%" stopColor="#27272a" />
                        <stop offset="100%" stopColor="#18181b" />
                      </linearGradient>

                      {/* Wings Left 3D Shading */}
                      <linearGradient id="wingLeftGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#6366f1" />
                        <stop offset="100%" stopColor="#312e81" />
                      </linearGradient>

                      {/* Wings Right 3D Shading */}
                      <linearGradient id="wingRightGrad" x1="100%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#6366f1" />
                        <stop offset="100%" stopColor="#312e81" />
                      </linearGradient>
                    </defs>
                     <style>{`
                      svg {
                        perspective: 300px;
                        transform-style: preserve-3d;
                      }
                      @keyframes verticalFloatAndRotate {
                        0%, 100% { transform: translateY(4px) rotateY(-15deg); }
                        50% { transform: translateY(-12px) rotateY(15deg); }
                      }
                      @keyframes flameFlicker {
                        0%, 100% { transform: scaleY(1) scaleX(1); opacity: 0.85; }
                        50% { transform: scaleY(1.3) scaleX(1.1) translateY(1.5px); opacity: 1; }
                      }
                      @keyframes orbitRevolve {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                      }
                      @keyframes starSpin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                      }
                      .rocket-g {
                        animation: verticalFloatAndRotate 4s ease-in-out infinite;
                        transform-origin: 60px 60px;
                        transform-style: preserve-3d;
                      }
                      .rocket-flame-1 {
                        animation: flameFlicker 0.12s ease-in-out infinite;
                        transform-origin: 60px 85px;
                      }
                      .rocket-flame-2 {
                        animation: flameFlicker 0.2s ease-in-out infinite;
                        transform-origin: 60px 85px;
                      }
                      .star-orbit-group {
                        animation: orbitRevolve 20s linear infinite;
                        transform-origin: 60px 60px;
                      }
                      .star-spin-1 { animation: starSpin 3s linear infinite; transform-origin: 25px 25px; }
                      .star-spin-2 { animation: starSpin 4s linear infinite; transform-origin: 95px 35px; }
                      .star-spin-3 { animation: starSpin 2.5s linear infinite; transform-origin: 30px 85px; }
                      .star-spin-4 { animation: starSpin 3.5s linear infinite; transform-origin: 90px 80px; }
                    `}</style>

                    {/* Outer Dashed Zen Circle */}
                    <circle 
                      cx="60" 
                      cy="60" 
                      r="50" 
                      className={dark ? 'stroke-indigo-500/20' : 'stroke-indigo-500/15'} 
                      strokeWidth="1.5" 
                      strokeDasharray="4 4" 
                    />
                    {/* Inner Glowing Glow */}
                    <circle 
                      cx="60" 
                      cy="60" 
                      r="42" 
                      className={dark ? 'fill-indigo-500/5 stroke-indigo-500/10' : 'fill-indigo-500/5 stroke-indigo-500/5'} 
                      strokeWidth="1"
                    />

                    {/* Animated Rocket Group - 3D Rendered & Enlarged */}
                    <g className="rocket-g">
                      {/* Flame Layer 1 (Outer Amber Plume) */}
                      <path 
                        d="M52 85 C49 98, 60 108, 60 108 C60 108, 71 98, 68 85 Z" 
                        fill="currentColor"
                        className="text-amber-500/90 rocket-flame-1"
                      />
                      {/* Flame Layer 2 (Inner Yellow Core) */}
                      <path 
                        d="M55 85 C54 94, 60 100, 60 100 C60 100, 66 94, 65 85 Z" 
                        fill="currentColor"
                        className="text-yellow-400 rocket-flame-2"
                      />

                      {/* Left Rocket Wing (3D shaded and larger) */}
                      <path 
                        d="M48 62 C26 67, 22 84, 31 88 C39 91, 45 82, 48 74 Z" 
                        fill="url(#wingLeftGrad)"
                        stroke="currentColor" 
                        strokeWidth="2" 
                        strokeLinecap="round" 
                        strokeLinejoin="round"
                        className="dark:stroke-indigo-400"
                      />
                      {/* Wing Highlight Panel */}
                      <path 
                        d="M36 82 C42 80, 44 76, 46 70" 
                        stroke="#a5b4fc" 
                        strokeWidth="1.2" 
                        strokeLinecap="round"
                        className="opacity-70"
                      />

                      {/* Right Rocket Wing (3D shaded and larger) */}
                      <path 
                        d="M72 62 C94 67, 98 84, 89 88 C81 91, 75 82, 72 74 Z" 
                        fill="url(#wingRightGrad)"
                        stroke="currentColor" 
                        strokeWidth="2" 
                        strokeLinecap="round" 
                        strokeLinejoin="round"
                        className="dark:stroke-indigo-400"
                      />
                      {/* Wing Highlight Panel */}
                      <path 
                        d="M84 82 C78 80, 76 76, 74 70" 
                        stroke="#a5b4fc" 
                        strokeWidth="1.2" 
                        strokeLinecap="round"
                        className="opacity-70"
                      />

                      {/* Rocket Engine Nozzle (3D curved base) */}
                      <path 
                        d="M52 85 C52 85, 54 90, 60 90 C66 90, 68 85, 68 85 Z" 
                        fill="currentColor"
                        className="text-zinc-600 dark:text-zinc-400"
                        stroke="currentColor"
                        strokeWidth="1.5"
                      />

                      {/* Rocket Body (sleek 3D capsule with horizontal shadow wrap) */}
                      <path 
                        d="M60 12 C72 28, 72 52, 72 85 H48 C48 52, 48 28, 60 12 Z" 
                        fill={dark ? 'url(#rocketBodyGradDark)' : 'url(#rocketBodyGrad)'}
                        stroke="currentColor" 
                        strokeWidth="2.2" 
                        strokeLinecap="round" 
                        strokeLinejoin="round"
                        className="dark:stroke-zinc-700" 
                      />

                      {/* 3D Specular Highlight Line along left side of rocket body */}
                      <path 
                        d="M52 24 C50.5 35, 50.5 52, 52 75" 
                        stroke="#ffffff" 
                        strokeWidth="1.5" 
                        strokeLinecap="round" 
                        className="opacity-45 pointer-events-none"
                      />

                      {/* Nose Cone colored tip with 3D gradient */}
                      <path 
                        d="M60 12 C64.5 18, 67.5 25, 68 31 H52 C52.5 25, 55.5 18, 60 12 Z" 
                        fill="currentColor"
                        className="text-indigo-900 dark:text-indigo-300 opacity-20"
                      />
                      <path 
                        d="M60 12 C64.5 18, 67.5 25, 68 31 H52 C52.5 25, 55.5 18, 60 12 Z" 
                        stroke="currentColor"
                        strokeWidth="2"
                        className="text-indigo-600 dark:text-indigo-400"
                        fill="none"
                      />

                      {/* Double Ring 3D Porthole Window */}
                      <circle 
                        cx="60" 
                        cy="48" 
                        r="8.5" 
                        stroke="currentColor" 
                        strokeWidth="2.2" 
                        className="text-indigo-500 dark:text-indigo-400 fill-indigo-900/10"
                      />
                      <circle 
                        cx="60" 
                        cy="48" 
                        r="5.5" 
                        stroke="currentColor" 
                        strokeWidth="1.2" 
                        className="text-indigo-400 dark:text-indigo-300 fill-zinc-50 dark:fill-zinc-900"
                      />
                      {/* Specular window reflection dot */}
                      <circle 
                        cx="57.5" 
                        cy="45.5" 
                        r="1.2" 
                        fill="#ffffff" 
                        className="opacity-80"
                      />
                      
                      {/* Body Panel line (vertical seam) */}
                      <line 
                        x1="60" y1="60" x2="60" y2="85" 
                        stroke="currentColor" 
                        strokeWidth="1.5" 
                        className="text-indigo-500/30 dark:text-indigo-400/30"
                      />
                    </g>

                    {/* Stars (Rotating, revolving & spinning background particles) */}
                    <g className="star-orbit-group">
                      {/* Star 1 (Top Left) */}
                      <g className="star-spin-1">
                        <path 
                          d="M25 21 L26.2 23.5 L28.8 24 L27 25.8 L27.5 28.5 L25 27 L22.5 28.5 L23 25.8 L21.2 24 L23.8 23.5 Z" 
                          fill="currentColor" 
                          className="text-indigo-400" 
                        />
                      </g>
                      {/* Star 2 (Right) */}
                      <g className="star-spin-2">
                        <circle cx="95" cy="35" r="2.5" fill="currentColor" className="text-violet-400" />
                      </g>
                      {/* Star 3 (Bottom Left) */}
                      <g className="star-spin-3">
                        <circle cx="30" cy="85" r="1.8" fill="currentColor" className="text-indigo-400" />
                      </g>
                      {/* Star 4 (Bottom Right) */}
                      <g className="star-spin-4">
                        <path 
                          d="M90 77 L91.2 79.5 L93.8 80 L92 81.8 L92.5 84.5 L90 83 L87.5 84.5 L88 81.8 L86.2 80 L88.8 79.5 Z" 
                          fill="currentColor" 
                          className="text-violet-400" 
                        />
                      </g>
                    </g>
                  </svg>
                </div>
              </div>
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
