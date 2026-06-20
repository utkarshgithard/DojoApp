"use client";

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useDarkMode } from '@/context/DarkModeContext';
import { useAuth } from '@/context/authContext';
import { useNetwork, NetworkUser } from '@/context/NetworkContext';
import API from '@/lib/axios';
import { useRouter } from 'next/navigation';
import {
  Users, UserPlus, UserCheck, UserMinus, Copy, Check,
  Search, Network, ChevronRight, Loader2, ArrowLeft
} from 'lucide-react';
import { toast } from 'sonner';

type Tab = 'friends' | 'following' | 'followers';

export default function FriendsPage() {
  const router = useRouter();
  const { darkMode } = useDarkMode() as any;
  const { isAuthenticated, loading, userDetails, userId } = useAuth() as any;
  const dark = darkMode;

  const {
    network,
    loading: networkLoadingState,
    hasData,
    followStates,
    fetchNetwork,
    silentRefresh,
    toggleFollow,
    addFriend,
  } = useNetwork();

  const networkLoading = networkLoadingState && !hasData;

  const [activeTab, setActiveTab] = useState<Tab>('friends');
  const [query, setQuery] = useState('');

  // Add friend
  const [friendCode, setFriendCode] = useState('');
  const [addingFriend, setAddingFriend] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!loading && !isAuthenticated) router.push('/');
  }, [isAuthenticated, loading, router]);

  useEffect(() => {
    if (!loading && isAuthenticated) {
      if (!hasData) {
        fetchNetwork();
      } else {
        silentRefresh();
      }
    }
  }, [loading, isAuthenticated, hasData, fetchNetwork, silentRefresh]);

  const handleAddFriend = async () => {
    if (!friendCode.trim() || addingFriend) return;
    setAddingFriend(true);
    try {
      const res = await addFriend(friendCode.trim());
      toast.success(res.message);
      setFriendCode('');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setAddingFriend(false);
    }
  };

  const handleToggleFollow = async (targetId: string) => {
    try {
      await toggleFollow(targetId);
    } catch {
      toast.error('Failed to update follow status');
    }
  };

  const handleCopyCode = () => {
    if (userDetails?.friendCode) {
      navigator.clipboard.writeText(userDetails.friendCode);
      setCopied(true);
      toast.success('Friend code copied!');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const colors = [
    'from-indigo-400 to-purple-500',
    'from-pink-400 to-rose-500',
    'from-emerald-400 to-teal-500',
    'from-amber-400 to-orange-500',
    'from-blue-400 to-cyan-500',
  ];

  const getAvatar = (name: string, avatarUrl?: string | null) => {
    if (avatarUrl) {
      return (
        <img src={avatarUrl} alt={name} referrerPolicy="no-referrer"
          className="w-11 h-11 rounded-full object-cover shrink-0" />
      );
    }
    const idx = name.charCodeAt(0) % colors.length;
    return (
      <div className={`w-11 h-11 rounded-full flex items-center justify-center text-[15px] font-bold text-white bg-gradient-to-br ${colors[idx]} shrink-0`}>
        {name.charAt(0).toUpperCase()}
      </div>
    );
  };

  const filtered = (list: NetworkUser[]) =>
    list.filter((u) => u.name.toLowerCase().includes(query.toLowerCase()));

  const tabs: { key: Tab; label: string; count: number; icon: React.ReactNode }[] = [
    { key: 'friends', label: 'Friends', count: network.friends.length, icon: <Users size={15} /> },
    { key: 'following', label: 'Following', count: network.following.length, icon: <UserCheck size={15} /> },
    { key: 'followers', label: 'Followers', count: network.followers.length, icon: <UserPlus size={15} /> },
  ];

  if (loading) {
    return (
      <div className={`min-h-screen flex justify-center items-center ${dark ? 'bg-[#0a0a0a]' : 'bg-[#f5f5f5]'}`}>
        <Loader2 size={22} className="animate-spin text-indigo-500" />
      </div>
    );
  }

  const currentList = filtered(
    activeTab === 'friends' ? network.friends :
    activeTab === 'following' ? network.following :
    network.followers
  );

  return (
    <div className={`min-h-screen transition-colors duration-300 pt-[96px] md:pt-[24px] pb-16 ${dark ? 'bg-[#0a0a0a] text-white' : 'bg-[#f5f5f5] text-zinc-900'}`}>
      <div className="max-w-[900px] w-full mx-auto px-4">

        {/* Sticky header */}
        <div className={`sticky top-0 z-20 -mx-4 px-4 py-4 mb-6 backdrop-blur-md border-b flex items-center justify-between ${
          dark ? 'bg-[#0a0a0a]/80 border-zinc-900' : 'bg-[#f5f5f5]/80 border-zinc-200/60'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${dark ? 'bg-indigo-500/10 text-indigo-400' : 'bg-indigo-50 text-indigo-600'}`}>
              <Network size={18} />
            </div>
            <div>
              <h1 className="text-[18px] font-semibold tracking-tight">My Network</h1>
              <p className={`text-[12px] ${dark ? 'text-zinc-500' : 'text-zinc-400'}`}>Friends, followers & following</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[260px_1fr] gap-5">

          {/* ── Left panel: sidebar nav ── */}
          <div className="xl:sticky xl:top-[80px] xl:self-start space-y-4">

            {/* My friend code card */}
            {userDetails?.friendCode && (
              <div className={`rounded-xl border p-4 ${dark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'}`}>
                <p className={`text-[10px] font-semibold uppercase tracking-wider mb-2 ${dark ? 'text-zinc-500' : 'text-zinc-400'}`}>Your Friend Code</p>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[18px] font-mono font-bold tracking-widest">{userDetails.friendCode}</span>
                  <button onClick={handleCopyCode} className={`p-2 rounded-lg border transition-colors flex items-center gap-1.5 text-[12px] ${
                    dark ? 'border-zinc-700 text-zinc-400 hover:bg-zinc-800' : 'border-zinc-200 text-zinc-500 hover:bg-zinc-50'
                  }`}>
                    {copied ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                </div>
              </div>
            )}

            {/* Nav tabs — sidebar style */}
            <div className={`rounded-xl border overflow-hidden ${dark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'}`}>
              <p className={`px-4 pt-3 pb-1.5 text-[10px] font-semibold uppercase tracking-wider ${dark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                Manage my network
              </p>
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => { setActiveTab(tab.key); setQuery(''); }}
                  className={`w-full flex items-center justify-between px-4 py-3 text-[13.5px] font-medium transition-colors border-l-[2.5px] ${
                    activeTab === tab.key
                      ? dark
                        ? 'border-indigo-500 bg-indigo-500/8 text-indigo-400'
                        : 'border-indigo-500 bg-indigo-50 text-indigo-600'
                      : dark
                        ? 'border-transparent text-zinc-400 hover:bg-zinc-800 hover:text-white'
                        : 'border-transparent text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    {tab.icon}
                    {tab.label}
                  </div>
                  <div className="flex items-center gap-2">
                    {!networkLoading && (
                      <span className={`text-[12px] font-semibold ${activeTab === tab.key ? '' : dark ? 'text-zinc-600' : 'text-zinc-400'}`}>
                        {tab.count}
                      </span>
                    )}
                    <ChevronRight size={13} className="opacity-40" />
                  </div>
                </button>
              ))}
            </div>

            {/* Add friend input */}
            <div className={`rounded-xl border p-4 ${dark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'}`}>
              <p className={`text-[11px] font-semibold uppercase tracking-wider mb-3 ${dark ? 'text-zinc-500' : 'text-zinc-400'}`}>Add by code</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={friendCode}
                  onChange={(e) => setFriendCode(e.target.value.toUpperCase())}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddFriend()}
                  placeholder="Friend code…"
                  maxLength={8}
                  className={`flex-1 px-3 py-2 text-[13px] rounded-lg border outline-none transition-colors font-mono ${
                    dark
                      ? 'bg-zinc-800 border-zinc-700 text-white placeholder-zinc-600 focus:border-indigo-500/60'
                      : 'bg-zinc-50 border-zinc-200 text-zinc-900 placeholder-zinc-400 focus:border-indigo-300'
                  }`}
                />
                <button
                  onClick={handleAddFriend}
                  disabled={!friendCode.trim() || addingFriend}
                  className="px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[13px] font-medium transition-all disabled:opacity-40 shrink-0"
                >
                  {addingFriend ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />}
                </button>
              </div>
            </div>
          </div>

          {/* ── Right panel: user list ── */}
          <div>
            {/* Search bar */}
            <div className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border mb-4 ${dark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'}`}>
              <Search size={14} className={dark ? 'text-zinc-600' : 'text-zinc-400'} />
              <input
                type="text"
                placeholder={`Search ${activeTab}…`}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className={`bg-transparent flex-1 text-[13.5px] outline-none ${dark ? 'text-white placeholder-zinc-600' : 'text-zinc-800 placeholder-zinc-400'}`}
              />
            </div>

            {/* List */}
            <div className={`rounded-xl border overflow-hidden ${dark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'}`}>
              {networkLoading ? (
                <div className="flex justify-center items-center py-16">
                  <Loader2 size={20} className="animate-spin text-indigo-500" />
                </div>
              ) : currentList.length === 0 ? (
                <div className="py-16 text-center">
                  <div className={`w-14 h-14 rounded-2xl mx-auto mb-3 flex items-center justify-center ${dark ? 'bg-zinc-800' : 'bg-zinc-100'}`}>
                    {activeTab === 'friends' ? <Users size={22} className={dark ? 'text-zinc-600' : 'text-zinc-400'} /> :
                     activeTab === 'following' ? <UserCheck size={22} className={dark ? 'text-zinc-600' : 'text-zinc-400'} /> :
                     <UserPlus size={22} className={dark ? 'text-zinc-600' : 'text-zinc-400'} />}
                  </div>
                  <p className={`text-[14px] font-semibold mb-1 ${dark ? 'text-zinc-300' : 'text-zinc-700'}`}>
                    {query ? 'No results' : activeTab === 'friends' ? 'No friends yet' : activeTab === 'following' ? 'Not following anyone' : 'No followers yet'}
                  </p>
                  <p className={`text-[12.5px] ${dark ? 'text-zinc-600' : 'text-zinc-400'}`}>
                    {!query && activeTab === 'friends' && 'Add friends using their friend code'}
                    {!query && activeTab === 'following' && 'Follow people from their posts or profiles'}
                    {!query && activeTab === 'followers' && 'Share your content to gain followers'}
                  </p>
                </div>
              ) : (
                <div className={`divide-y ${dark ? 'divide-zinc-800/80' : 'divide-zinc-100'}`}>
                  {currentList.map((user) => (
                    <div key={user.id} className={`flex items-center gap-3.5 px-5 py-4 transition-colors ${dark ? 'hover:bg-zinc-800/40' : 'hover:bg-zinc-50'}`}>
                      <button onClick={() => router.push(`/user/${user.id}`)} className="shrink-0">
                        {getAvatar(user.name, user.avatarUrl)}
                      </button>

                      <div className="flex-1 min-w-0">
                        <button
                          onClick={() => router.push(`/user/${user.id}`)}
                          className={`text-[14px] font-semibold hover:underline text-left ${dark ? 'text-white' : 'text-zinc-900'}`}
                        >
                          {user.name}
                        </button>
                        {activeTab === 'followers' && (
                          <p className={`text-[12px] mt-0.5 ${dark ? 'text-zinc-600' : 'text-zinc-400'}`}>
                            {user.followsBack ? '✓ You follow them back' : 'Follows you'}
                          </p>
                        )}
                        {activeTab === 'following' && (
                          <p className={`text-[12px] mt-0.5 ${dark ? 'text-zinc-600' : 'text-zinc-400'}`}>
                            You follow this person
                          </p>
                        )}
                        {activeTab === 'friends' && (
                          <p className={`text-[12px] mt-0.5 ${dark ? 'text-zinc-600' : 'text-zinc-400'}`}>
                            Friend · connected
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {/* Only show follow/unfollow on following and followers tabs, not own profile */}
                        {user.id !== userId && activeTab !== 'friends' && (
                          <button
                            onClick={() => handleToggleFollow(user.id)}
                            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-[12.5px] font-semibold border transition-all ${
                              followStates[user.id]
                                ? dark
                                  ? 'border-indigo-500/40 text-indigo-400 bg-indigo-500/10 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/30'
                                  : 'border-indigo-200 text-indigo-600 bg-indigo-50 hover:bg-red-50 hover:text-red-500 hover:border-red-200'
                                : dark
                                  ? 'border-zinc-700 text-zinc-300 hover:border-indigo-500 hover:text-indigo-400 hover:bg-indigo-500/10'
                                  : 'border-zinc-300 text-zinc-700 hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50'
                            }`}
                          >
                            {followStates[user.id] ? <UserMinus size={13} /> : <UserPlus size={13} />}
                            {followStates[user.id] ? 'Unfollow' : 'Follow'}
                          </button>
                        )}

                        <button
                          onClick={() => router.push(`/user/${user.id}`)}
                          className={`p-2 rounded-lg border transition-colors ${dark ? 'border-zinc-800 text-zinc-500 hover:bg-zinc-800 hover:text-white' : 'border-zinc-200 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700'}`}
                        >
                          <ChevronRight size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
