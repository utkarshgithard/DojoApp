"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useDarkMode } from '@/context/DarkModeContext';
import { Users, UserPlus, X, AlertCircle, CheckCircle } from 'lucide-react';

interface FriendsSectionProps {
  friendCode: string;
  setFriendCode: (val: string) => void;
  handleAddFriend: () => void;
  friendMessage: { text: string; type: 'success' | 'error' } | null;
  friends: any[];
  friendsLoading: boolean;
  cardClass: string;
  border: string;
  muted: string;
  inputClass: string;
  primaryBtn: string;
}

export default function FriendsSection({
  friendCode,
  setFriendCode,
  handleAddFriend,
  friendMessage,
  friends,
  friendsLoading,
  cardClass,
  border,
  muted,
  inputClass,
}: FriendsSectionProps) {
  const { darkMode } = useDarkMode() as any;
  const dark = darkMode;
  
  const [showFriends, setShowFriends] = useState(false);
  const [addFriendOpen, setAddFriendOpen] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  // Close modal when clicked outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        setAddFriendOpen(false);
      }
    };
    if (addFriendOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [addFriendOpen]);

  // Determine avatar gradient background based on name
  const getAvatarGradient = (name: string) => {
    const colors = [
      'from-indigo-500 to-purple-500',
      'from-blue-500 to-cyan-500',
      'from-emerald-500 to-teal-500',
      'from-rose-500 to-orange-500',
      'from-pink-500 to-rose-500',
      'from-purple-500 to-pink-500',
    ];
    let sum = 0;
    const cleanName = name || 'User';
    for (let i = 0; i < cleanName.length; i++) {
      sum += cleanName.charCodeAt(i);
    }
    return colors[sum % colors.length];
  };

  return (
    <section className={cardClass}>
      <style>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none !important;
        }
        .scrollbar-hide {
          -ms-overflow-style: none !important;
          scrollbar-width: none !important;
        }
      `}</style>

      <p className={`text-[11px] uppercase tracking-widest ${muted} mb-2`}>Social Network</p>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-[16px] font-medium tracking-tight">Friends & Connections</h2>
        <div className="flex items-center gap-2">
          <span className={`text-[11px] px-2 py-0.5 rounded border ${border} ${muted}`}>
            {friends.length} friends
          </span>
        </div>
      </div>

      {/* Buttons row */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => setShowFriends(!showFriends)}
          className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-[13px] font-semibold border transition-all active:scale-95
            ${showFriends 
              ? dark ? 'bg-zinc-900 border-zinc-800 text-white' : 'bg-zinc-100 border-zinc-200 text-black'
              : dark ? 'border-zinc-800 text-zinc-305 hover:bg-zinc-900 bg-zinc-950/20' : 'border-zinc-200 text-zinc-700 hover:bg-zinc-50 bg-zinc-50/20'}`}
        >
          <Users size={14} className={muted} />
          <span>{showFriends ? 'Hide Friends' : 'Show Friends'}</span>
        </button>

        <button
          onClick={() => setAddFriendOpen(true)}
          className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-[13px] font-semibold border transition-all active:scale-95
            ${dark 
              ? 'bg-white text-black border-white hover:bg-zinc-100' 
              : 'bg-black text-white border-black hover:bg-zinc-800'}`}
        >
          <UserPlus size={14} />
          <span>Add Friend</span>
        </button>
      </div>

      {/* Collapsible Friends List (Vertical Scrolling, No Scrollbar) */}
      {showFriends && (
        <div className="mt-4 pt-4 border-t border-dashed border-gray-150 dark:border-gray-905">
          {friendsLoading ? (
            <div className="space-y-2 animate-pulse py-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className={`p-2.5 rounded-lg border flex items-center gap-3 ${border}`}>
                  <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-800 shrink-0"></div>
                  <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-1/3"></div>
                </div>
              ))}
            </div>
          ) : friends.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <p className={`text-[12.5px] ${muted}`}>No friends added yet.</p>
              <button 
                onClick={() => setAddFriendOpen(true)}
                className={`text-[12px] font-medium underline mt-1.5 text-indigo-500 hover:text-indigo-400`}
              >
                Invite your first study buddy
              </button>
            </div>
          ) : (
            <div className="max-h-56 overflow-y-auto scrollbar-hide space-y-2 py-1 pr-1">
              {friends.map((f: any) => (
                <div
                  key={f._id || f.id}
                  className={`p-2.5 rounded-xl border flex items-center gap-3 transition-colors ${border} ${dark ? 'bg-zinc-950/40 hover:bg-zinc-900/40' : 'bg-zinc-50/40 hover:bg-zinc-100/40'}`}
                >
                  {/* Premium Profile Picture Avatar */}
                  {f.avatarUrl ? (
                    <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 shadow-sm border border-zinc-200 dark:border-zinc-800">
                      <img
                        src={f.avatarUrl}
                        alt={f.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className={`w-8 h-8 rounded-full bg-gradient-to-tr ${getAvatarGradient(f.name)} flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-sm`}>
                      {f.name.charAt(0).toUpperCase()}
                    </div>
                  )}

                  {/* Name only (no friend code displayed) */}
                  <div className="min-w-0 flex-1">
                    <p className={`text-[13.5px] font-semibold truncate ${dark ? 'text-zinc-200' : 'text-zinc-800'}`}>
                      {f.name}
                    </p>
                    <p className={`text-[10px] ${muted} uppercase tracking-wider font-medium`}>
                      Student Connection
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Nice Add Friend Modal Popup */}
      {addFriendOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
          <div 
            ref={modalRef}
            className={`w-full max-w-sm rounded-xl border p-5 shadow-2xl animate-in zoom-in-95 duration-200
              ${dark ? 'bg-black border-zinc-850 text-white' : 'bg-white border-zinc-150 text-gray-900'}`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-gray-150 dark:border-gray-900">
              <div className="flex items-center gap-2">
                <UserPlus size={16} className="text-indigo-500" />
                <h3 className="text-[15px] font-semibold tracking-tight">Add Study Buddy</h3>
              </div>
              <button
                onClick={() => setAddFriendOpen(false)}
                className={`p-1 rounded-full transition-colors ${dark ? 'hover:bg-zinc-900' : 'hover:bg-zinc-100'} ${muted}`}
                aria-label="Close add friend modal"
              >
                <X size={15} />
              </button>
            </div>

            {/* Content */}
            <p className={`text-[12.5px] mb-4 ${muted} leading-relaxed`}>
              Connect with your friends to invite them to dynamic joint study sessions and share real-time collaboration.
            </p>

            <div className="space-y-3">
              <div>
                <label className={`block text-[10px] uppercase tracking-wider font-semibold mb-1.5 ${muted}`}>
                  6-Digit Friend Code
                </label>
                <input
                  autoFocus
                  type="text"
                  placeholder="e.g. AB12CD"
                  value={friendCode}
                  onChange={(e) => setFriendCode(e.target.value.toUpperCase())}
                  onKeyDown={(e) => e.key === 'Enter' && friendCode && handleAddFriend()}
                  className={`${inputClass} tracking-widest text-[15px] font-mono text-center placeholder-gray-400`}
                  maxLength={6}
                />
              </div>

              {friendMessage && (
                <div className={`p-2.5 rounded-lg border flex items-start gap-2 text-xs font-medium mt-2
                  ${friendMessage.type === 'error' 
                    ? 'border-red-500/20 bg-red-500/5 text-red-500' 
                    : 'border-green-500/20 bg-green-500/5 text-green-500'}`}>
                  {friendMessage.type === 'error' ? <AlertCircle size={14} className="shrink-0 mt-0.5" /> : <CheckCircle size={14} className="shrink-0 mt-0.5" />}
                  <span className="leading-tight">{friendMessage.text}</span>
                </div>
              )}

              <div className="flex gap-2.5 pt-2">
                <button
                  onClick={() => setAddFriendOpen(false)}
                  className={`flex-1 py-2 rounded-lg text-[13px] font-semibold border transition-all active:scale-95
                    ${dark ? 'border-zinc-800 hover:bg-zinc-900 text-zinc-300' : 'border-zinc-200 hover:bg-zinc-50 text-zinc-700'}`}
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddFriend}
                  disabled={!friendCode || friendCode.length < 6}
                  className={`flex-1 py-2 rounded-lg text-[13px] font-semibold transition-all active:scale-95
                    ${dark ? 'bg-white hover:bg-zinc-100 text-black' : 'bg-black hover:bg-zinc-800 text-white'}
                    disabled:opacity-40 disabled:pointer-events-none`}
                >
                  Add Friend
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
