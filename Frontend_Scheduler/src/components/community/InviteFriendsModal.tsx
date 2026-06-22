'use client';

import React, { useState, useEffect } from 'react';
import { X, Search, Loader2, Check, Send, Users } from 'lucide-react';
import API from '@/lib/axios';

interface Friend {
  id: string;
  name: string;
  friendCode: string;
  email: string;
  avatarUrl?: string | null;
}

interface InviteFriendsModalProps {
  communitySlug: string;
  communityName: string;
  dark: boolean;
  onClose: () => void;
}

export default function InviteFriendsModal({
  communitySlug,
  communityName,
  dark,
  onClose,
}: InviteFriendsModalProps) {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [members, setMembers] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const [invitingIds, setInvitingIds] = useState<Record<string, boolean>>({});
  const [invitedIds, setInvitedIds] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [friendsRes, membersRes] = await Promise.all([
          API.get('/auth/friends-List'),
          API.get(`/groups/${communitySlug}/members`),
        ]);

        setFriends(friendsRes.data.friends || []);

        const memberIds = new Set<string>(
          (membersRes.data.members || []).map((m: any) => m.userId)
        );
        setMembers(memberIds);
      } catch (err: any) {
        console.error('[InviteFriendsModal fetch]', err);
        setError('Failed to load friends or community members.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [communitySlug]);

  const handleInvite = async (friendId: string) => {
    if (invitingIds[friendId]) return;
    setInvitingIds((prev) => ({ ...prev, [friendId]: true }));
    try {
      await API.post(`/groups/${communitySlug}/invites`, { invitedUserId: friendId });
      setInvitedIds((prev) => ({ ...prev, [friendId]: true }));
    } catch (err: any) {
      console.error('[handleInvite]', err);
      // If user is already invited or a member, we can handle it or show as sent
      const msg = err?.response?.data?.error || 'Failed to send invite';
      alert(msg);
    } finally {
      setInvitingIds((prev) => ({ ...prev, [friendId]: false }));
    }
  };

  const filteredFriends = friends.filter((friend) =>
    friend.name.toLowerCase().includes(search.toLowerCase()) ||
    friend.friendCode.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div
        className={`w-full max-w-md rounded-xl border shadow-2xl flex flex-col overflow-hidden transition-all duration-300 ${
          dark ? 'bg-zinc-950 border-zinc-800 text-white' : 'bg-white border-zinc-200 text-zinc-900'
        }`}
      >
        {/* Header */}
        <div className={`flex items-center justify-between p-5 border-b shrink-0 ${dark ? 'border-zinc-850' : 'border-zinc-100'}`}>
          <div>
            <h3 className="text-[16px] font-bold tracking-tight">Invite Friends</h3>
            <p className={`text-[11.5px] mt-0.5 leading-none ${dark ? 'text-zinc-500' : 'text-zinc-400'}`}>
              Invite friends to join <span className="font-semibold text-indigo-500">{communityName}</span>.
            </p>
          </div>
          <button
            onClick={onClose}
            className={`p-1.5 rounded-lg transition-colors ${
              dark ? 'text-zinc-400 hover:bg-zinc-900 hover:text-white' : 'text-zinc-500 hover:bg-zinc-100'
            }`}
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex flex-col p-5 space-y-4 min-h-[300px] max-h-[400px]">
          {/* Search */}
          <div className={`flex items-center gap-2 px-3.5 py-2.5 rounded-lg border transition-all focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500 ${
            dark ? 'bg-zinc-900 border-zinc-800' : 'bg-zinc-50 border-zinc-200'
          }`}>
            <Search size={15} className={dark ? 'text-zinc-500' : 'text-zinc-450'} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search friends by name or code…"
              className={`flex-1 bg-transparent text-[13px] outline-none ${
                dark ? 'text-white placeholder:text-zinc-650' : 'text-zinc-900 placeholder:text-zinc-450'
              }`}
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className={`text-[11px] font-semibold hover:underline ${dark ? 'text-zinc-550' : 'text-zinc-400'}`}
              >
                Clear
              </button>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-[12px] text-red-400">
              {error}
            </div>
          )}

          {/* List */}
          <div className="flex-1 overflow-y-auto pr-1 space-y-2">
            {loading ? (
              <div className="h-full flex items-center justify-center py-10">
                <Loader2 size={24} className="animate-spin text-indigo-500" />
              </div>
            ) : filteredFriends.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center py-10 text-center">
                <Users size={32} className={`mb-2 ${dark ? 'text-zinc-700' : 'text-zinc-350'}`} />
                <p className={`text-[13px] font-semibold ${dark ? 'text-zinc-400' : 'text-zinc-650'}`}>
                  {search ? 'No friends match your search.' : 'You have no friends added yet.'}
                </p>
                {!search && (
                  <p className={`text-[11px] mt-1 max-w-[240px] mx-auto leading-relaxed ${dark ? 'text-zinc-550' : 'text-zinc-450'}`}>
                    Add friends in your profile settings screen using their Friend Codes to invite them.
                  </p>
                )}
              </div>
            ) : (
              filteredFriends.map((friend) => {
                const isMember = members.has(friend.id);
                const isInvited = invitedIds[friend.id];
                const isInviting = invitingIds[friend.id];

                return (
                  <div
                    key={friend.id}
                    className={`flex items-center justify-between p-3 rounded-lg border transition-all ${
                      dark ? 'bg-zinc-900/30 border-zinc-850 hover:bg-zinc-900/60' : 'bg-zinc-50/50 border-zinc-150 hover:bg-zinc-50'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Avatar */}
                      <div className={`w-9 h-9 rounded-lg border flex items-center justify-center overflow-hidden shrink-0 ${
                        dark ? 'border-zinc-800 bg-zinc-850' : 'border-zinc-200 bg-zinc-100'
                      }`}>
                        {friend.avatarUrl ? (
                          <img src={friend.avatarUrl} alt="" className="w-full h-full object-contain" />
                        ) : (
                          <span className={`text-[13px] font-bold ${dark ? 'text-indigo-400' : 'text-indigo-650'}`}>
                            {friend.name.charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>

                      {/* Info */}
                      <div className="min-w-0">
                        <div className={`text-[13px] font-bold truncate leading-tight ${dark ? 'text-white' : 'text-zinc-900'}`}>
                          {friend.name}
                        </div>
                        <div className={`text-[10.5px] mt-0.5 leading-none ${dark ? 'text-zinc-500' : 'text-zinc-450'}`}>
                          #{friend.friendCode}
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div>
                      {isMember ? (
                        <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${
                          dark ? 'bg-zinc-800 text-zinc-400' : 'bg-zinc-200/50 text-zinc-500'
                        }`}>
                          Member
                        </span>
                      ) : isInvited ? (
                        <span className="text-[11px] font-bold text-emerald-500 flex items-center gap-1 px-2.5 py-1">
                          <Check size={13} /> Sent
                        </span>
                      ) : (
                        <button
                          onClick={() => handleInvite(friend.id)}
                          disabled={isInviting}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[12px] font-bold transition-all active:scale-95 disabled:opacity-50"
                        >
                          {isInviting ? (
                            <Loader2 size={12} className="animate-spin" />
                          ) : (
                            <Send size={11} />
                          )}
                          Invite
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Footer */}
        <div className={`p-4 border-t flex items-center justify-end shrink-0 ${dark ? 'border-zinc-850 bg-zinc-950/20' : 'border-zinc-100 bg-zinc-50/20'}`}>
          <button
            onClick={onClose}
            className={`px-4 py-2 rounded-lg text-[13px] font-bold transition-all ${
              dark ? 'text-zinc-400 hover:bg-zinc-900 hover:text-white' : 'text-zinc-650 hover:bg-zinc-100'
            }`}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
