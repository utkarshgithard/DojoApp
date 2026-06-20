"use client";

import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import API from '@/lib/axios';

export interface NetworkUser {
  id: string;
  name: string;
  avatarUrl?: string | null;
  friendCode?: string;
  followsBack?: boolean;
  since?: string;
}

interface NetworkState {
  friends: NetworkUser[];
  following: NetworkUser[];
  followers: NetworkUser[];
}

interface NetworkContextType {
  network: NetworkState;
  loading: boolean;
  hasData: boolean;
  followStates: Record<string, boolean>;
  fetchNetwork: () => Promise<void>;
  silentRefresh: () => Promise<void>;
  toggleFollow: (targetId: string) => Promise<void>;
  addFriendOptimistic: (friend: NetworkUser) => void;
  addFriend: (friendCode: string) => Promise<{ success: boolean; message: string }>;
}

const NetworkContext = createContext<NetworkContextType | undefined>(undefined);

export const NetworkProvider = ({ children }: { children: React.ReactNode }) => {
  const [network, setNetwork] = useState<NetworkState>({ friends: [], following: [], followers: [] });
  const [loading, setLoading] = useState(false);
  const [hasData, setHasData] = useState(false);
  const [followStates, setFollowStates] = useState<Record<string, boolean>>({});
  const fetchingRef = useRef(false);

  const applyNetwork = (data: NetworkState) => {
    setNetwork(data);
    setHasData(true);
    // Build follow states from the following list
    const states: Record<string, boolean> = {};
    for (const u of data.following) states[u.id] = true;
    setFollowStates(states);
  };

  const fetchNetwork = useCallback(async () => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    setLoading(true);
    try {
      const res = await API.get('/community/my-network');
      applyNetwork(res.data);
    } catch {
      // silently fail — page will show empty state
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  }, []);

  // Silent background revalidation — doesn't show loading spinner
  const silentRefresh = useCallback(async () => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    try {
      const res = await API.get('/community/my-network');
      applyNetwork(res.data);
    } catch {
      // ignore
    } finally {
      fetchingRef.current = false;
    }
  }, []);

  const toggleFollow = useCallback(async (targetId: string) => {
    const was = !!followStates[targetId];
    // Optimistic update
    setFollowStates((prev) => ({ ...prev, [targetId]: !was }));
    setNetwork((prev) => {
      if (was) {
        // Remove from following
        return { ...prev, following: prev.following.filter((u) => u.id !== targetId) };
      } else {
        // If they're in followers, just flip followsBack
        return {
          ...prev,
          followers: prev.followers.map((u) =>
            u.id === targetId ? { ...u, followsBack: true } : u
          ),
        };
      }
    });

    try {
      await API.post(`/community/users/${targetId}/follow`);
      // Silent refresh to get accurate data
      silentRefresh();
    } catch {
      // Revert on error
      setFollowStates((prev) => ({ ...prev, [targetId]: was }));
      setNetwork((prev) => {
        if (was) {
          return prev; // hard to revert cleanly, silentRefresh will fix it
        }
        return {
          ...prev,
          followers: prev.followers.map((u) =>
            u.id === targetId ? { ...u, followsBack: false } : u
          ),
        };
      });
    }
  }, [followStates, silentRefresh]);

  const addFriendOptimistic = useCallback((friend: NetworkUser) => {
    setNetwork((prev) => ({
      ...prev,
      friends: [friend, ...prev.friends.filter((f) => f.id !== friend.id)],
    }));
  }, []);

  const addFriend = useCallback(async (friendCode: string) => {
    try {
      const res = await API.post('/auth/add', { friendCode: friendCode.trim() });
      await silentRefresh();
      return { success: true, message: res.data.message };
    } catch (err: any) {
      throw new Error(err.response?.data?.error || 'Failed to add friend');
    }
  }, [silentRefresh]);

  return (
    <NetworkContext.Provider value={{
      network,
      loading,
      hasData,
      followStates,
      fetchNetwork,
      silentRefresh,
      toggleFollow,
      addFriendOptimistic,
      addFriend,
    }}>
      {children}
    </NetworkContext.Provider>
  );
};

export const useNetwork = () => {
  const ctx = useContext(NetworkContext);
  if (!ctx) throw new Error('useNetwork must be used within a NetworkProvider');
  return ctx;
};
