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

  const muted = dark ? "text-zinc-400" : "text-zinc-500";
  const border = dark ? "border-zinc-800" : "border-zinc-200";
  const cardClass = `border rounded-xl p-5 ${border} ${dark ? "bg-black" : "bg-white"}`;

  return (
    <div className={`min-h-screen transition-colors duration-300 pt-[96px] md:pt-[24px] pb-32 ${dark ? 'bg-[#0a0a0a] text-white' : 'bg-[#f5f5f5] text-zinc-900'}`}>
      <div className="max-w-[760px] w-full mx-auto px-4">
        
        {/* Header */}
        <div className="mb-8 border-b pb-5 border-gray-100 dark:border-gray-900">
          <p className={`text-[11px] uppercase tracking-widest ${muted} mb-1 flex items-center gap-1.5`}>
            <Network size={12} />
            <span>Community</span>
          </p>
          <h1 className="text-[22px] font-medium tracking-tight">My Network</h1>
          <p className={`text-[13px] ${muted} mt-0.5`}>Connect with friends, follow other students, and grow your study circle.</p>
        </div>

        <div className="flex flex-col gap-5">
          {/* Combined Invitation & Code block */}
          {userDetails?.friendCode && (
            <div className={`grid grid-cols-1 md:grid-cols-2 gap-6 p-5 rounded-xl border ${
              dark ? 'bg-zinc-900/20 border-zinc-800/80' : 'bg-zinc-50/40 border-zinc-150'
            }`}>
              {/* Your Code Section */}
              <div className="space-y-2">
                <h3 className="text-[14px] font-semibold tracking-tight">Your Friend Code</h3>
                <p className={`text-[12px] leading-normal ${muted}`}>Share this code with others so they can follow and add you instantly.</p>
                <div className="flex items-center gap-2.5">
                  <span className={`px-4 py-2 text-[16px] font-mono font-bold tracking-widest border rounded-lg ${
                    dark ? 'bg-black border-zinc-800 text-white' : 'bg-white border-zinc-200 text-zinc-950'
                  }`}>{userDetails.friendCode}</span>
                  <button 
                    onClick={handleCopyCode} 
                    className={`px-3.5 py-2.5 rounded-lg border font-medium text-[12.5px] transition-all flex items-center gap-1.5 shrink-0 ${
                      dark ? 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-750' : 'bg-white border-zinc-200 text-zinc-700 hover:bg-zinc-50'
                    }`}
                  >
                    {copied ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
                    <span>{copied ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              </div>

              {/* Add by Code Section */}
              <div className="space-y-2">
                <h3 className="text-[14px] font-semibold tracking-tight">Add by Friend Code</h3>
                <p className={`text-[12px] leading-normal ${muted}`}>Enter a friend's code to start following each other and connect.</p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={friendCode}
                    onChange={(e) => setFriendCode(e.target.value.toUpperCase())}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddFriend()}
                    placeholder="Friend code..."
                    maxLength={8}
                    className={`flex-1 px-3 py-2 text-sm rounded-lg border outline-none font-mono transition-colors ${
                      dark 
                        ? 'bg-black border-zinc-800 text-white placeholder-zinc-700 focus:border-zinc-700' 
                        : 'bg-white border-zinc-200 text-zinc-900 placeholder-zinc-400 focus:border-zinc-450'
                    }`}
                  />
                  <button
                    onClick={handleAddFriend}
                    disabled={!friendCode.trim() || addingFriend}
                    className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[12.5px] font-medium transition-all disabled:opacity-40 flex items-center justify-center gap-1.5 shrink-0"
                  >
                    {addingFriend ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />}
                    <span>Add Friend</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Horizontal Navigation Pills */}
          <div className="flex overflow-x-auto no-scrollbar gap-2 pb-1">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => { setActiveTab(tab.key); setQuery(''); }}
                className={`flex-shrink-0 px-4 py-2 rounded-full text-[13px] font-medium transition-colors flex items-center gap-2 border ${
                  activeTab === tab.key
                    ? dark
                      ? 'bg-white text-black border-white'
                      : 'bg-black text-white border-black'
                    : dark
                      ? 'bg-transparent border-gray-800 text-gray-400 hover:text-white hover:bg-gray-900/50'
                      : 'bg-transparent border-gray-200 text-gray-650 hover:text-black hover:bg-gray-50'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
                {!networkLoading && (
                  <span className="text-[11px] opacity-60">({tab.count})</span>
                )}
              </button>
            ))}
          </div>

          {/* List panel */}
          <div className={cardClass}>
            {/* Search bar */}
            <div className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border mb-5 ${dark ? 'bg-black border-zinc-800' : 'bg-zinc-50/50 border-zinc-150'}`}>
              <Search size={14} className={dark ? 'text-zinc-700' : 'text-zinc-400'} />
              <input
                type="text"
                placeholder={`Search ${activeTab}…`}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className={`bg-transparent flex-1 text-[13.5px] outline-none ${dark ? 'text-white placeholder-zinc-705' : 'text-zinc-850 placeholder-zinc-400'}`}
              />
            </div>

            {/* List content */}
            {networkLoading ? (
              <div className="flex justify-center items-center py-16">
                <Loader2 size={20} className="animate-spin text-indigo-500" />
              </div>
            ) : currentList.length === 0 ? (
              <div className="py-16 text-center">
                <div className={`w-14 h-14 rounded-2xl mx-auto mb-3 flex items-center justify-center ${dark ? 'bg-zinc-900/50 border border-zinc-800' : 'bg-zinc-50 border border-zinc-150'}`}>
                  {activeTab === 'friends' ? <Users size={22} className={dark ? 'text-zinc-600' : 'text-zinc-400'} /> :
                   activeTab === 'following' ? <UserCheck size={22} className={dark ? 'text-zinc-600' : 'text-zinc-400'} /> :
                   <UserPlus size={22} className={dark ? 'text-zinc-600' : 'text-zinc-400'} />}
                </div>
                <p className={`text-[14px] font-semibold mb-1 ${dark ? 'text-zinc-300' : 'text-zinc-700'}`}>
                  {query ? 'No results' : activeTab === 'friends' ? 'No friends yet' : activeTab === 'following' ? 'Not following anyone' : 'No followers yet'}
                </p>
                <p className={`text-[12.5px] ${dark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                  {!query && activeTab === 'friends' && 'Add friends using their friend code above'}
                  {!query && activeTab === 'following' && 'Follow people from their posts or profiles'}
                  {!query && activeTab === 'followers' && 'Share your content to gain followers'}
                </p>
              </div>
            ) : (
              <div className={`divide-y -mx-5 -mb-5 ${dark ? 'divide-zinc-900' : 'divide-zinc-100'}`}>
                {currentList.map((user) => (
                  <div key={user.id} className={`flex items-center gap-3.5 px-5 py-4 transition-colors ${dark ? 'hover:bg-zinc-900/20' : 'hover:bg-zinc-50/50'}`}>
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
                        <p className={`text-[12px] mt-0.5 ${dark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                          {user.followsBack ? '✓ You follow them back' : 'Follows you'}
                        </p>
                      )}
                      {activeTab === 'following' && (
                        <p className={`text-[12px] mt-0.5 ${dark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                          You follow this person
                        </p>
                      )}
                      {activeTab === 'friends' && (
                        <p className={`text-[12px] mt-0.5 ${dark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                          Friend · connected
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {user.id !== userId && activeTab !== 'friends' && (
                        <button
                          onClick={() => handleToggleFollow(user.id)}
                          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-[12.5px] font-semibold border transition-all ${
                            followStates[user.id]
                              ? dark
                                ? 'border-indigo-500/40 text-indigo-400 bg-indigo-500/10 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/30'
                                : 'border-indigo-200 text-indigo-650 bg-indigo-50 hover:bg-red-50 hover:text-red-550 hover:border-red-200'
                              : dark
                                ? 'border-zinc-700 text-zinc-300 hover:border-indigo-500 hover:text-indigo-400 hover:bg-indigo-500/10'
                                : 'border-zinc-300 text-zinc-700 hover:border-indigo-300 hover:text-indigo-650 hover:bg-indigo-50'
                          }`}
                        >
                          {followStates[user.id] ? <UserMinus size={13} /> : <UserPlus size={13} />}
                          {followStates[user.id] ? 'Unfollow' : 'Follow'}
                        </button>
                      )}

                      <button
                        onClick={() => router.push(`/user/${user.id}`)}
                        className={`p-2 rounded-lg border transition-colors ${dark ? 'border-zinc-800 text-zinc-550 hover:bg-zinc-900 hover:text-white' : 'border-zinc-200 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700'}`}
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
  );
}
