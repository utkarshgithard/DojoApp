'use client';

import React, { useEffect, useState, useCallback } from 'react';
import API from '@/lib/axios';
import { X, Send, Search, CheckCircle2, Loader2 } from 'lucide-react';
import { useNetwork } from '@/context/NetworkContext';

interface ShareModalProps {
  postId: string;
  dark: boolean;
  onClose: () => void;
}

export default function ShareModal({ postId, dark, onClose }: ShareModalProps) {
  const { network, fetchNetwork, hasData, loading: networkLoading } = useNetwork();
  const friends = network.friends;
  const loading = networkLoading && !hasData;

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState('');
  const [sharing, setSharing] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!hasData) {
      fetchNetwork();
    }
  }, [hasData, fetchNetwork]);

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleShare = async () => {
    if (selected.size === 0 || sharing) return;
    setSharing(true);
    try {
      await API.post(`/community/posts/${postId}/share`, { receiverIds: Array.from(selected) });
      setDone(true);
      setTimeout(onClose, 1200);
    } catch {
      setSharing(false);
    }
  };

  const filtered = friends.filter((f) =>
    f.name.toLowerCase().includes(query.toLowerCase())
  );

  const getInitials = (name: string) => name.charAt(0).toUpperCase();
  const colors = [
    'from-indigo-400 to-purple-500',
    'from-pink-400 to-rose-500',
    'from-emerald-400 to-teal-500',
    'from-amber-400 to-orange-500',
    'from-blue-400 to-cyan-500',
  ];

  return (
    // Backdrop
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div
        className={`relative z-10 w-full max-w-sm rounded-xl border shadow-2xl flex flex-col overflow-hidden ${
          dark ? 'bg-zinc-900 border-zinc-700' : 'bg-white border-zinc-200'
        }`}
        style={{ maxHeight: '70vh' }}
      >
        {/* Header */}
        <div className={`flex items-center justify-between px-4 py-3 border-b ${dark ? 'border-zinc-800' : 'border-zinc-100'}`}>
          <h2 className={`text-[15px] font-semibold ${dark ? 'text-white' : 'text-zinc-900'}`}>
            Share with friends
          </h2>
          <button
            onClick={onClose}
            className={`p-1.5 rounded-lg transition-colors ${dark ? 'text-zinc-400 hover:text-white hover:bg-zinc-800' : 'text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100'}`}
          >
            <X size={16} />
          </button>
        </div>

        {/* Search */}
        <div className={`px-4 py-2.5 border-b ${dark ? 'border-zinc-800' : 'border-zinc-100'}`}>
          <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-[13px] ${dark ? 'bg-zinc-800 text-zinc-300' : 'bg-zinc-100 text-zinc-600'}`}>
            <Search size={13} className="shrink-0 opacity-60" />
            <input
              type="text"
              placeholder="Search friends…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="bg-transparent outline-none flex-1 placeholder:opacity-50"
            />
          </div>
        </div>

        {/* Friend list */}
        <div className="flex-1 overflow-y-auto py-1">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 size={20} className={`animate-spin ${dark ? 'text-zinc-500' : 'text-zinc-400'}`} />
            </div>
          ) : filtered.length === 0 ? (
            <p className={`text-center text-[13px] py-8 ${dark ? 'text-zinc-500' : 'text-zinc-400'}`}>
              {friends.length === 0 ? 'No friends yet' : 'No results'}
            </p>
          ) : (
            filtered.map((friend) => {
              const isSelected = selected.has(friend.id);
              const colorIdx = friend.name.charCodeAt(0) % colors.length;
              return (
                <button
                  key={friend.id}
                  onClick={() => toggleSelect(friend.id)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 transition-colors text-left ${
                    isSelected
                      ? dark ? 'bg-indigo-500/10' : 'bg-indigo-50'
                      : dark ? 'hover:bg-zinc-800' : 'hover:bg-zinc-50'
                  }`}
                >
                  {/* Avatar */}
                  {friend.avatarUrl ? (
                    <img
                      src={friend.avatarUrl}
                      alt={friend.name}
                      referrerPolicy="no-referrer"
                      className="w-9 h-9 rounded-full object-cover shrink-0"
                    />
                  ) : (
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-[13px] font-bold text-white bg-gradient-to-br ${colors[colorIdx]} shrink-0`}>
                      {getInitials(friend.name)}
                    </div>
                  )}

                  <span className={`flex-1 text-[14px] font-medium ${dark ? 'text-zinc-100' : 'text-zinc-800'}`}>
                    {friend.name}
                  </span>

                  {/* Checkmark */}
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                    isSelected
                      ? 'border-indigo-500 bg-indigo-500'
                      : dark ? 'border-zinc-600' : 'border-zinc-300'
                  }`}>
                    {isSelected && <CheckCircle2 size={12} className="text-white" />}
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className={`px-4 py-3 border-t ${dark ? 'border-zinc-800' : 'border-zinc-100'}`}>
          <button
            onClick={handleShare}
            disabled={selected.size === 0 || sharing || done}
            className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-[13px] font-semibold transition-all ${
              done
                ? 'bg-emerald-500 text-white'
                : selected.size === 0
                ? dark ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed' : 'bg-zinc-100 text-zinc-400 cursor-not-allowed'
                : 'bg-indigo-600 hover:bg-indigo-700 text-white active:scale-[0.98]'
            }`}
          >
            {done ? (
              <>
                <CheckCircle2 size={15} />
                Shared!
              </>
            ) : sharing ? (
              <>
                <Loader2 size={15} className="animate-spin" />
                Sharing…
              </>
            ) : (
              <>
                <Send size={14} />
                {selected.size > 0 ? `Share with ${selected.size} friend${selected.size > 1 ? 's' : ''}` : 'Select friends to share'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
