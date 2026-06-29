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

  // Load from cache after mount to prevent hydration errors
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const cached = localStorage.getItem('dojo_community_posts_cache');
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (parsed && parsed.length > 0) {
            setPosts(parsed);
            setInitialLoading(false);
          }
        } catch (e) {
          // Ignore parse errors
        }
      }
    }
  }, []);

  React.useEffect(() => {
    postsRef.current = posts;
  }, [posts]);

  const setScrollPosition = useCallback((pos: number) => {
    setScrollPositionState(pos);
  }, []);

  const fetchPosts = useCallback(async (cursor?: string, isSilent = false) => {
    if (fetchingRef.current) return;
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
      if (cursor) {
        setPosts((prev) => {
          const existingIds = new Set(prev.map((p) => p.id));
          const filteredNew = data.posts.filter((p: Post) => !existingIds.has(p.id));
          return [...prev, ...filteredNew];
        });
      } else {
        const currentPosts = postsRef.current;
        if (isSilent && currentPosts.length > 0) {
          const currentFirstId = currentPosts[0]?.id;
          const newFirstId = data.posts[0]?.id;
          if (newFirstId && newFirstId !== currentFirstId) {
            setPendingPosts(data.posts);
            setHasNewPosts(true);
          }
        } else {
          setPosts(data.posts);
          setHasNewPosts(false);
          setPendingPosts([]);
          if (typeof window !== 'undefined') {
            localStorage.setItem('dojo_community_posts_cache', JSON.stringify(data.posts));
          }
        }
      }
      setNextCursor(data.nextCursor);
    } catch (err: any) {
      setError('Failed to load posts. Please try again.');
    } finally {
      fetchingRef.current = false;
      setFetching(false);
      setInitialLoading(false);
    }
  }, []);

  const handlePostCreated = useCallback((newPost: Post) => {
    setPosts((prev) => [newPost, ...prev]);
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
      setPosts(pendingPosts);
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
