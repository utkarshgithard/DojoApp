'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/authContext';
import { useDarkMode } from '@/context/DarkModeContext';
import { useCommunityGroups } from '@/context/CommunityGroupContext';
import CommunityGroupCard from '@/components/community/CommunityGroupCard';
import CreateCommunityModal from '@/components/community/CreateCommunityModal';
import API from '@/lib/axios';
import { Users2, Search, Plus, ArrowLeft, RefreshCw, Compass, MailOpen, Check, Trash2 } from 'lucide-react';

export default function DiscoverCommunitiesPage() {
  const router = useRouter();
  const { isAuthenticated, loading } = useAuth() as any;
  const { darkMode } = useDarkMode() as any;
  const dark = darkMode;

  const { communities, nextCursor, loading: fetching, fetchCommunities, joinOrLeave } = useCommunityGroups();

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filter, setFilter] = useState<'' | 'joined' | 'created'>('');
  const [showCreate, setShowCreate] = useState(false);

  const [invites, setInvites] = useState<any[]>([]);
  const [invitesLoading, setInvitesLoading] = useState(false);

  const fetchInvites = useCallback(async () => {
    if (!isAuthenticated) return;
    setInvitesLoading(true);
    try {
      const { data } = await API.get('/groups/invites/mine');
      setInvites(data.invites || []);
    } catch (err) {
      console.error('[fetchInvites]', err);
    } finally {
      setInvitesLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchInvites();
    }
  }, [isAuthenticated, fetchInvites]);

  const handleAcceptInvite = async (inviteId: string) => {
    try {
      await API.post(`/groups/invites/${inviteId}/accept`);
      setInvites((prev) => prev.filter((inv) => inv.id !== inviteId));
      fetchCommunities(undefined, debouncedSearch || undefined, filter || undefined);
    } catch (err: any) {
      alert(err?.response?.data?.error || 'Failed to accept invitation');
    }
  };

  const handleDeclineInvite = async (inviteId: string) => {
    try {
      await API.delete(`/groups/invites/${inviteId}`);
      setInvites((prev) => prev.filter((inv) => inv.id !== inviteId));
    } catch (err: any) {
      alert(err?.response?.data?.error || 'Failed to decline invitation');
    }
  };

  // Debounce search input
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    if (!loading) {
      const isSilent = communities.length > 0;
      fetchCommunities(undefined, debouncedSearch || undefined, filter || undefined, isSilent);
    }
  }, [loading, debouncedSearch, filter, fetchCommunities, communities.length]);

  const handleJoinToggle = useCallback(async (slug: string) => {
    try {
      await joinOrLeave(slug);
    } catch {}
  }, [joinOrLeave]);

  const handleLoadMore = () => {
    if (nextCursor) fetchCommunities(nextCursor, debouncedSearch || undefined, filter || undefined);
  };

  if (loading) return null;

  const FILTERS = [
    { value: '', label: 'All' },
    { value: 'joined', label: 'Joined' },
    { value: 'created', label: 'My Communities' },
  ];

  return (
    <div className={`min-h-screen pt-[50px] md:pt-0 transition-colors duration-300 ${dark ? 'bg-[#0a0a0a] text-white' : 'bg-[#f5f5f5] text-zinc-900'}`}>
      <div className="max-w-[1100px] w-full mx-auto px-4 py-6">

        {/* Header */}
        <div className={`sticky top-[50px] md:top-0 z-20 mb-6 backdrop-blur-md border rounded-2xl p-4 transition-all duration-300 ${
          dark ? 'bg-zinc-950/40 border-zinc-800' : 'bg-white border-zinc-200'
        }`}>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.back()}
                className={`p-2 rounded-xl transition-all ${dark ? 'text-zinc-400 hover:text-white hover:bg-zinc-900' : 'text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100'}`}
              >
                <ArrowLeft size={20} />
              </button>
              <div className={`hidden sm:flex w-10 h-10 rounded-xl items-center justify-center ${dark ? 'bg-indigo-500/10 text-indigo-400' : 'bg-indigo-50 text-indigo-600'}`}>
                <Compass size={20} />
              </div>
              <div>
                <h1 className={`text-[20px] font-semibold tracking-tight ${dark ? 'text-white' : 'text-zinc-900'}`}>Discover</h1>
                <p className={`text-[12.5px] ${dark ? 'text-zinc-500' : 'text-zinc-500'}`}>Find and join communities</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => fetchCommunities(undefined, debouncedSearch || undefined, filter || undefined)}
                disabled={fetching}
                className={`p-2 rounded-xl border transition-all ${dark ? 'border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-900' : 'border-zinc-200 text-zinc-500 hover:text-zinc-800 hover:bg-white'} disabled:opacity-40`}
              >
                <RefreshCw size={16} className={fetching ? 'animate-spin' : ''} />
              </button>
              {isAuthenticated && (
                <button
                  onClick={() => setShowCreate(true)}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-[13px] font-semibold transition-all active:scale-95"
                >
                  <Plus size={16} />
                  <span className="hidden sm:inline">Create</span>
                </button>
              )}
            </div>
          </div>

          {/* Search + filter row */}
          <div className="flex gap-3 mt-4 flex-wrap">
            <div className={`flex-1 min-w-[180px] flex items-center gap-2 px-3.5 py-2 rounded-xl border transition-all focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500 ${
              dark ? 'bg-zinc-900 border-zinc-800' : 'bg-zinc-50 border-zinc-200'
            }`}>
              <Search size={15} className={dark ? 'text-zinc-500' : 'text-zinc-400'} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search communities…"
                className={`flex-1 bg-transparent text-[13.5px] outline-none ${dark ? 'text-white placeholder:text-zinc-600' : 'text-zinc-900 placeholder:text-zinc-400'}`}
              />
            </div>

            {isAuthenticated && (
              <div className={`flex rounded-xl border overflow-hidden ${dark ? 'border-zinc-800' : 'border-zinc-200'}`}>
                {FILTERS.map((f) => (
                  <button
                    key={f.value}
                    onClick={() => setFilter(f.value as any)}
                    className={`px-3.5 py-2 text-[12.5px] font-medium transition-colors ${
                      filter === f.value
                        ? 'bg-indigo-600 text-white'
                        : dark ? 'text-zinc-400 hover:bg-zinc-900' : 'text-zinc-500 hover:bg-zinc-50'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Pending Invites Section */}
        {isAuthenticated && invites.length > 0 && (
          <div className={`mb-6 p-5 border rounded-xl transition-all duration-300 ${
            dark ? 'bg-zinc-950/60 border-zinc-800' : 'bg-white border-zinc-200 shadow-sm'
          }`}>
            <div className="flex items-center gap-2 mb-4">
              <MailOpen size={16} className="text-indigo-500 animate-pulse" />
              <h2 className={`text-[14.5px] font-bold ${dark ? 'text-zinc-200' : 'text-zinc-800'}`}>
                Pending Invitations ({invites.length})
              </h2>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {invites.map((inv) => (
                <div
                  key={inv.id}
                  className={`flex flex-col justify-between p-4 rounded-xl border transition-all ${
                    dark ? 'bg-zinc-900/40 border-zinc-850 hover:bg-zinc-900/60' : 'bg-zinc-50/50 border-zinc-150 hover:bg-zinc-50'
                  }`}
                >
                  <div className="flex items-start gap-3 mb-3 min-w-0">
                    <div className={`w-10 h-10 rounded-lg border flex items-center justify-center overflow-hidden shrink-0 ${
                      dark ? 'border-zinc-800 bg-zinc-850' : 'border-zinc-200 bg-zinc-100'
                    }`}>
                      {inv.community.avatarUrl ? (
                        <img src={inv.community.avatarUrl} alt="" className="w-full h-full object-contain bg-black/5 dark:bg-white/5" />
                      ) : (
                        <span className={`text-[14px] font-bold ${dark ? 'text-indigo-400' : 'text-indigo-650'}`}>
                          {inv.community.name.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <h4 className={`text-[13px] font-bold truncate leading-tight ${dark ? 'text-white' : 'text-zinc-900'}`}>
                        {inv.community.name}
                      </h4>
                      <p className={`text-[10.5px] mt-0.5 leading-none ${dark ? 'text-zinc-505' : 'text-zinc-450'}`}>
                        c/{inv.community.slug}
                      </p>
                      <p className={`text-[10.5px] mt-1.5 leading-tight ${dark ? 'text-zinc-455' : 'text-zinc-550'}`}>
                        Invited by <span className="font-semibold text-indigo-500">{inv.invitedBy.name}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mt-1">
                    <button
                      onClick={() => handleAcceptInvite(inv.id)}
                      className="flex-1 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[12px] font-bold transition-all active:scale-[0.98] flex items-center justify-center gap-1"
                    >
                      <Check size={12} /> Accept
                    </button>
                    <button
                      onClick={() => handleDeclineInvite(inv.id)}
                      className={`flex-1 py-1.5 rounded-lg border text-[12px] font-bold transition-all active:scale-[0.98] flex items-center justify-center gap-1 ${
                        dark
                          ? 'border-zinc-800 text-zinc-450 hover:text-white hover:bg-zinc-900'
                          : 'border-zinc-200 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-800'
                      }`}
                    >
                      <Trash2 size={12} /> Ignore
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Grid */}
        {fetching && communities.length === 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className={`rounded-2xl border animate-pulse ${dark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'}`}>
                <div className={`h-20 ${dark ? 'bg-zinc-800' : 'bg-zinc-200'}`} />
                <div className="p-4 pt-7 space-y-2">
                  <div className={`h-4 w-3/4 rounded ${dark ? 'bg-zinc-800' : 'bg-zinc-200'}`} />
                  <div className={`h-3 w-1/2 rounded ${dark ? 'bg-zinc-800' : 'bg-zinc-200'}`} />
                  <div className={`h-3 w-full rounded ${dark ? 'bg-zinc-800' : 'bg-zinc-200'}`} />
                </div>
              </div>
            ))}
          </div>
        ) : communities.length === 0 ? (
          <div className={`rounded-2xl border p-16 text-center ${dark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'}`}>
            <div className={`w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center ${dark ? 'bg-zinc-800' : 'bg-zinc-100'}`}>
              <Users2 size={28} className={dark ? 'text-zinc-500' : 'text-zinc-400'} />
            </div>
            <p className={`text-[16px] font-semibold mb-1 ${dark ? 'text-white' : 'text-zinc-800'}`}>
              {search ? 'No communities found' : 'No communities yet'}
            </p>
            <p className={`text-[13px] mb-5 ${dark ? 'text-zinc-400' : 'text-zinc-500'}`}>
              {search ? `Try a different search term` : 'Be the first to create one!'}
            </p>
            {isAuthenticated && !search && (
              <button
                onClick={() => setShowCreate(true)}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-[13.5px] font-semibold transition-all active:scale-95"
              >
                Create a Community
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {communities.map((community) => (
                <CommunityGroupCard
                  key={community.id}
                  community={community}
                  dark={dark}
                  isAuthenticated={isAuthenticated}
                  onJoinToggle={handleJoinToggle}
                />
              ))}
            </div>

            {nextCursor && (
              <div className="flex justify-center mt-8">
                <button
                  onClick={handleLoadMore}
                  disabled={fetching}
                  className={`px-6 py-2.5 rounded-xl border text-[13px] font-medium transition-all disabled:opacity-40 ${
                    dark ? 'border-zinc-700 text-zinc-300 hover:bg-zinc-900' : 'border-zinc-300 text-zinc-700 hover:bg-white shadow-sm'
                  }`}
                >
                  {fetching ? 'Loading…' : 'Load more'}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {showCreate && <CreateCommunityModal dark={dark} onClose={() => setShowCreate(false)} />}
    </div>
  );
}
