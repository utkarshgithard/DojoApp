'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import API from '@/lib/axios';

export type CommunityVisibility = 'public' | 'private' | 'invite_only';
export type CommunityRole = 'creator' | 'moderator' | 'member';

export interface CommunityGroup {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  avatarUrl?: string | null;
  bannerUrl?: string | null;
  visibility: CommunityVisibility;
  memberCount: number;
  postCount: number;
  createdAt: string;
  creator: { id: string; name: string; avatarUrl?: string | null };
  joined: boolean;
  myRole?: CommunityRole | null;
}

interface CommunityGroupContextType {
  communities: CommunityGroup[];
  myCommunities: CommunityGroup[];
  nextCursor: string | null;
  loading: boolean;
  myLoading: boolean;
  hasFetched: boolean;
  fetchCommunities: (cursor?: string, search?: string, filter?: string, isSilent?: boolean) => Promise<void>;
  fetchMyCommunities: () => Promise<void>;
  createCommunity: (data: {
    name: string;
    slug: string;
    description?: string;
    visibility: CommunityVisibility;
    avatarUrl?: string;
    bannerUrl?: string;
  }) => Promise<CommunityGroup>;
  joinOrLeave: (slug: string) => Promise<{ joined: boolean; memberCount: number }>;
  updateCommunityLocal: (slug: string, updates: Partial<CommunityGroup>) => void;
  removeCommunityLocal: (slug: string) => void;

  // Active community detail states (prevents route-change reload flashes)
  activeCommunity: CommunityGroup | null;
  activePosts: any[];
  activeNextCursor: string | null;
  activeLoading: boolean;
  activePostsLoading: boolean;
  activeError: string | null;
  activePostsError: string | null;
  fetchCommunityBySlug: (slug: string, isSilent?: boolean) => Promise<void>;
  fetchCommunityPosts: (slug: string, cursor?: string, isSilent?: boolean) => Promise<void>;
  handleCommunityPostCreated: (post: any) => void;
  handleCommunityPostDeleted: (postId: string) => void;
}

const CommunityGroupContext = createContext<CommunityGroupContextType | undefined>(undefined);

export const CommunityGroupProvider = ({ children }: { children: React.ReactNode }) => {
  const [communities, setCommunities] = useState<CommunityGroup[]>([]);
  const [myCommunities, setMyCommunities] = useState<CommunityGroup[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [myLoading, setMyLoading] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);

  // Selected active community detail state cache
  const [activeCommunity, setActiveCommunity] = useState<CommunityGroup | null>(null);
  const [activePosts, setActivePosts] = useState<any[]>([]);
  const [activeNextCursor, setActiveNextCursor] = useState<string | null>(null);
  const [activeLoading, setActiveLoading] = useState(false);
  const [activePostsLoading, setActivePostsLoading] = useState(false);
  const [activeError, setActiveError] = useState<string | null>(null);
  const [activePostsError, setActivePostsError] = useState<string | null>(null);

  const fetchCommunities = useCallback(async (cursor?: string, search?: string, filter?: string, isSilent = false) => {
    if (!isSilent) {
      setLoading(true);
    }
    try {
      const { data } = await API.get('/groups', {
        params: {
          ...(cursor ? { cursor } : {}),
          ...(search ? { search } : {}),
          ...(filter ? { filter } : {}),
        },
      });
      if (cursor) {
        setCommunities((prev) => {
          const existingIds = new Set(prev.map((c) => c.id));
          return [...prev, ...data.communities.filter((c: CommunityGroup) => !existingIds.has(c.id))];
        });
      } else {
        setCommunities(data.communities);
      }
      setNextCursor(data.nextCursor);
      setHasFetched(true);
    } catch {
      // silent
    } finally {
      if (!isSilent) {
        setLoading(false);
      }
    }
  }, []);

  const fetchMyCommunities = useCallback(async () => {
    setMyLoading(true);
    try {
      const { data } = await API.get('/groups/my');
      setMyCommunities(data.communities);
    } catch {
      // silent
    } finally {
      setMyLoading(false);
    }
  }, []);

  const createCommunity = useCallback(async (formData: {
    name: string;
    slug: string;
    description?: string;
    visibility: CommunityVisibility;
    avatarUrl?: string;
    bannerUrl?: string;
  }): Promise<CommunityGroup> => {
    const { data } = await API.post('/groups', formData);
    const community = data.community as CommunityGroup;
    setCommunities((prev) => [community, ...prev]);
    setMyCommunities((prev) => [community, ...prev]);
    return community;
  }, []);

  const updateCommunityLocal = useCallback((slug: string, updates: Partial<CommunityGroup>) => {
    const fn = (prev: CommunityGroup[]) =>
      prev.map((c) => c.slug === slug ? { ...c, ...updates } : c);
    setCommunities(fn);
    setMyCommunities(fn);
    setActiveCommunity((prev) => (prev && prev.slug === slug ? { ...prev, ...updates } : prev));
  }, []);

  const joinOrLeave = useCallback(async (slug: string): Promise<{ joined: boolean; memberCount: number }> => {
    const { data } = await API.post(`/groups/${slug}/join`);
    
    let fullCommunity: CommunityGroup | undefined;
    
    // Update in all communities list
    setCommunities((prev) => {
      fullCommunity = prev.find((c) => c.slug === slug);
      return prev.map((c) => c.slug === slug ? { ...c, joined: data.joined, memberCount: data.memberCount } : c);
    });

    if (data.joined) {
      setMyCommunities((prev) => {
        const exists = prev.some((c) => c.slug === slug);
        if (exists) {
          return prev.map((c) => c.slug === slug ? { ...c, joined: data.joined, memberCount: data.memberCount } : c);
        }
        if (fullCommunity) {
          return [{ ...fullCommunity, joined: true, memberCount: data.memberCount }, ...prev];
        }
        return prev;
      });
    } else {
      setMyCommunities((prev) => prev.filter((c) => c.slug !== slug));
    }

    // Update active community if currently viewing
    setActiveCommunity((prev) => {
      if (prev && prev.slug === slug) {
        return { ...prev, joined: data.joined, memberCount: data.memberCount };
      }
      return prev;
    });

    return data;
  }, []);

  const removeCommunityLocal = useCallback((slug: string) => {
    setCommunities((prev) => prev.filter((c) => c.slug !== slug));
    setMyCommunities((prev) => prev.filter((c) => c.slug !== slug));
    setActiveCommunity((prev) => (prev && prev.slug === slug ? null : prev));
  }, []);

  const fetchCommunityBySlug = useCallback(async (slug: string, isSilent = false) => {
    if (!isSilent) {
      setActiveCommunity(null);
      setActivePosts([]);
      setActiveNextCursor(null);
      setActiveLoading(true);
      setActiveError(null);
      setActivePostsError(null);
    }
    try {
      const { data } = await API.get(`/groups/${slug}`);
      setActiveCommunity(data.community);
      // Update locally inside discover lists too
      const fn = (prev: CommunityGroup[]) =>
        prev.map((c) => c.slug === slug ? { ...c, ...data.community } : c);
      setCommunities(fn);
      setMyCommunities(fn);
    } catch (err: any) {
      if (!isSilent) {
        setActiveError(err?.response?.data?.error || 'Community not found');
      }
    } finally {
      if (!isSilent) {
        setActiveLoading(false);
      }
    }
  }, []);

  const fetchCommunityPosts = useCallback(async (slug: string, cursor?: string, isSilent = false) => {
    if (!isSilent && !cursor) {
      setActivePostsLoading(true);
      setActivePostsError(null);
    }
    try {
      const { data } = await API.get(`/groups/${slug}/posts`, { params: cursor ? { cursor } : {} });
      if (cursor) {
        setActivePosts((prev) => {
          const ids = new Set(prev.map((p) => p.id));
          return [...prev, ...data.posts.filter((p: any) => !ids.has(p.id))];
        });
      } else {
        setActivePosts(data.posts);
      }
      setActiveNextCursor(data.nextCursor);
    } catch (err: any) {
      if (!isSilent && !cursor) {
        setActivePostsError(err?.response?.data?.error || 'Failed to load posts');
      }
    } finally {
      if (!isSilent && !cursor) {
        setActivePostsLoading(false);
      }
    }
  }, []);

  const handleCommunityPostCreated = useCallback((post: any) => {
    setActivePosts((prev) => [post, ...prev]);
  }, []);

  const handleCommunityPostDeleted = useCallback((postId: string) => {
    setActivePosts((prev) => prev.filter((p) => p.id !== postId));
  }, []);

  return (
    <CommunityGroupContext.Provider
      value={{
        communities,
        myCommunities,
        nextCursor,
        loading,
        myLoading,
        hasFetched,
        fetchCommunities,
        fetchMyCommunities,
        createCommunity,
        joinOrLeave,
        updateCommunityLocal,
        removeCommunityLocal,

        activeCommunity,
        activePosts,
        activeNextCursor,
        activeLoading,
        activePostsLoading,
        activeError,
        activePostsError,
        fetchCommunityBySlug,
        fetchCommunityPosts,
        handleCommunityPostCreated,
        handleCommunityPostDeleted,
      }}
    >
      {children}
    </CommunityGroupContext.Provider>
  );
};

export const useCommunityGroups = () => {
  const context = useContext(CommunityGroupContext);
  if (!context) throw new Error('useCommunityGroups must be used within a CommunityGroupProvider');
  return context;
};
