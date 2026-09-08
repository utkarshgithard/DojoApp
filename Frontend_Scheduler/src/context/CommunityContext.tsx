"use client";

import React, { createContext, useContext, useState, useCallback } from 'react';
import API from '@/lib/axios';

export interface PostAuthor {
  id: string;
  name: string;
  avatarUrl?: string | null;
}

export interface PostMedia {
  id: string;
  url: string;
  type: 'image' | 'video';
  thumbnailUrl?: string | null;
}

export interface Post {
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

export interface ShareSender {
  id: string;
  name: string;
  avatarUrl?: string | null;
}

export interface SharedPost {
  shareId: string;
  sharedAt: string;
  viewed: boolean;
  sender: ShareSender;
  post: {
    id: string;
    content: string;
    createdAt: string;
    author: { id: string; name: string; avatarUrl?: string | null };
    media: { id: string; url: string; type: string }[];
    likeCount: number;
    commentCount: number;
    likedByMe: boolean;
  };
}

interface CommunityContextType {
  posts: Post[];
  nextCursor: string | null;
  initialLoading: boolean;
  fetching: boolean;
  error: string | null;
  scrollPosition: number;
  hasNewPosts: boolean;
  setScrollPosition: (pos: number) => void;
  fetchPosts: (cursor?: string, isSilent?: boolean) => Promise<void>;
  handlePostCreated: (post: Post) => void;
  handlePostDeleted: (postId: string) => void;
  refreshFeed: () => void;
  applyNewPosts: () => void;
  shares: SharedPost[];
  sharesLoading: boolean;
  hasSharesData: boolean;
  sharesNextCursor: string | null;
  sharesTotalCount: number;
  fetchShares: (isSilent?: boolean, loadMore?: boolean, includeViewed?: boolean) => Promise<void>;
  markShareReadLocal: (shareId: string) => void;
}

const CommunityContext = createContext<CommunityContextType | undefined>(undefined);
const POST_CACHE_KEY = 'dojo_community_posts_cache';
const POST_CACHE_MAX_AGE_MS = 5 * 60 * 1000;
const SILENT_REFRESH_COOLDOWN_MS = 30 * 1000;

const isValidPost = (value: unknown): value is Post => {
  if (!value || typeof value !== 'object') return false;
  const post = value as Partial<Post>;
  return Boolean(
    typeof post.id === 'string' &&
    typeof post.content === 'string' &&
    post.author &&
    typeof post.author.id === 'string' &&
    Array.isArray(post.media)
  );
};

const dedupePosts = (posts: Post[]): Post[] => {
  const byId = new Map<string, Post>();
  for (const post of posts) byId.set(post.id, post);
  return [...byId.values()];
};

export const CommunityProvider = ({ children }: { children: React.ReactNode }) => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scrollPosition, setScrollPositionState] = useState(0);
  const [hasNewPosts, setHasNewPosts] = useState(false);
  const [pendingPosts, setPendingPosts] = useState<Post[]>([]);

  const postsRef = React.useRef<Post[]>([]);
  const fetchingRef = React.useRef(false);
  const lastSilentRefreshRef = React.useRef(0);

  // Load from cache after mount to prevent hydration errors
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const cached = localStorage.getItem(POST_CACHE_KEY);
      if (cached) {
        try {
          const parsed = JSON.parse(cached) as { savedAt?: number; posts?: unknown[] } | unknown[];
          const cachedPosts = Array.isArray(parsed) ? parsed : parsed.posts;
          const savedAt = Array.isArray(parsed) ? 0 : parsed.savedAt || 0;
          if (Array.isArray(cachedPosts) && cachedPosts.length > 0 &&
            (!savedAt || Date.now() - savedAt <= POST_CACHE_MAX_AGE_MS)) {
            setPosts(dedupePosts(cachedPosts.filter(isValidPost)));
            setInitialLoading(false);
          } else if (savedAt && Date.now() - savedAt > POST_CACHE_MAX_AGE_MS) {
            localStorage.removeItem(POST_CACHE_KEY);
          }
        } catch {
          localStorage.removeItem(POST_CACHE_KEY);
        }
      }
    }
  }, []);

  React.useEffect(() => {
    postsRef.current = posts;
    if (typeof window !== 'undefined' && posts.length > 0) {
      localStorage.setItem(POST_CACHE_KEY, JSON.stringify({
        savedAt: Date.now(),
        posts: posts.slice(0, 20),
      }));
    }
  }, [posts]);

  const setScrollPosition = useCallback((pos: number) => {
    setScrollPositionState(pos);
  }, []);

  const fetchPosts = useCallback(async (cursor?: string, isSilent = false) => {
    if (fetchingRef.current) return;
    if (isSilent && Date.now() - lastSilentRefreshRef.current < SILENT_REFRESH_COOLDOWN_MS) return;
    if (isSilent) lastSilentRefreshRef.current = Date.now();
    fetchingRef.current = true;
    setFetching(true);
    setError(null);
    if (!isSilent && !cursor) {
      setInitialLoading(true);
    }
    try {
      const { data } = await API.get('/community/posts', {
        params: cursor ? { cursor } : {},
      });
      const incomingPosts = Array.isArray(data?.posts) ? data.posts.filter(isValidPost) : [];
      const incomingCursor = typeof data?.nextCursor === 'string' ? data.nextCursor : null;
      if (cursor) {
        setPosts((prev) => {
          const existingIds = new Set(prev.map((p) => p.id));
          const filteredNew = incomingPosts.filter((p: Post) => !existingIds.has(p.id));
          return dedupePosts([...prev, ...filteredNew]);
        });
      } else {
        const currentPosts = postsRef.current;
        if (isSilent && currentPosts.length > 0) {
          const currentPostIds = new Set(currentPosts.map((post) => post.id));
          const hasUnseenPost = incomingPosts.some((post: Post) => !currentPostIds.has(post.id));
          if (hasUnseenPost) {
            setPendingPosts(incomingPosts);
            setHasNewPosts(true);
          } else {
            // No new posts at the top, but update existing posts with fresh data (likes, comments)
            setPosts((prev) => {
              const freshMap = new Map<string, Post>();
              incomingPosts.forEach((p: Post) => freshMap.set(p.id, p));
              return prev.map((p) => (freshMap.has(p.id) ? freshMap.get(p.id)! : p));
            });
          }
        } else {
          setPosts(dedupePosts(incomingPosts));
          setHasNewPosts(false);
          setPendingPosts([]);
        }
      }
      setNextCursor(incomingCursor);
    } catch (err: any) {
      setError('Failed to load posts. Please try again.');
    } finally {
      fetchingRef.current = false;
      setFetching(false);
      setInitialLoading(false);
    }
  }, []);

  const handlePostCreated = useCallback((newPost: Post) => {
    if (!isValidPost(newPost)) return;
    setPosts((prev) => dedupePosts([newPost, ...prev]));
  }, []);

  const handlePostDeleted = useCallback((postId: string) => {
    setPosts((prev) => prev.filter((p) => p.id !== postId));
  }, []);

  const refreshFeed = useCallback(() => {
    setPosts([]);
    setNextCursor(null);
    setInitialLoading(true);
    setError(null);
    setFetching(false);
    setHasNewPosts(false);
    setPendingPosts([]);
    lastSilentRefreshRef.current = 0;
  }, []);

  const [shares, setShares] = useState<SharedPost[]>([]);
  const [sharesLoading, setSharesLoading] = useState(false);
  const [hasSharesData, setHasSharesData] = useState(false);
  const [sharesNextCursor, setSharesNextCursor] = useState<string | null>(null);
  const sharesNextCursorRef = React.useRef<string | null>(null);
  const [sharesTotalCount, setSharesTotalCount] = useState(0);
  const sharesFetchingRef = React.useRef(false);

  const fetchShares = useCallback(async (isSilent = false, loadMore = false, includeViewed = false) => {
    if (sharesFetchingRef.current) return;
    sharesFetchingRef.current = true;
    if (!isSilent && !loadMore) {
      setSharesLoading(true);
    }
    try {
      const cursor = loadMore ? sharesNextCursorRef.current : undefined;
      const res = await API.get('/community/shared-with-me', {
        params: {
          includeViewed,
          cursor,
          limit: 5,
        },
      });
      const newShares = res.data.shares ?? [];
      if (loadMore) {
        setShares((prev) => {
          const existingIds = new Set(prev.map((s) => s.shareId));
          const filteredNew = newShares.filter((s: SharedPost) => !existingIds.has(s.shareId));
          return [...prev, ...filteredNew];
        });
      } else {
        setShares(newShares);
      }
      const nextC = res.data.nextCursor || null;
      setSharesNextCursor(nextC);
      sharesNextCursorRef.current = nextC;
      setSharesTotalCount(res.data.totalCount || 0);
      setHasSharesData(true);
    } catch {
      // Keep previous cache on error
    } finally {
      sharesFetchingRef.current = false;
      setSharesLoading(false);
    }
  }, []);

  const markShareReadLocal = useCallback((shareId: string) => {
    setShares((prev) => {
      let changed = false;
      const next = prev.map((s) => {
        if (s.shareId === shareId && !s.viewed) {
          changed = true;
          return { ...s, viewed: true };
        }
        return s;
      });
      if (changed) {
        setSharesTotalCount((c) => Math.max(0, c - 1));
      }
      return next;
    });
  }, []);

  const applyNewPosts = useCallback(() => {
    if (pendingPosts.length > 0) {
      setPosts(dedupePosts(pendingPosts.filter(isValidPost)));
      setPendingPosts([]);
      setHasNewPosts(false);
    }
  }, [pendingPosts]);

  return (
    <CommunityContext.Provider
      value={{
        posts,
        nextCursor,
        initialLoading,
        fetching,
        error,
        scrollPosition,
        hasNewPosts,
        setScrollPosition,
        fetchPosts,
        handlePostCreated,
        handlePostDeleted,
        refreshFeed,
        applyNewPosts,
        shares,
        sharesLoading,
        hasSharesData,
        sharesNextCursor,
        sharesTotalCount,
        fetchShares,
        markShareReadLocal,
      }}
    >
      {children}
    </CommunityContext.Provider>
  );
};

export const useCommunity = () => {
  const context = useContext(CommunityContext);
  if (context === undefined) {
    throw new Error('useCommunity must be used within a CommunityProvider');
  }
  return context;
};
