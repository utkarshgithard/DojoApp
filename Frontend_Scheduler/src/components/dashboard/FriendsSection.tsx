"use client";

import React from 'react';
import { toast } from 'sonner';

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
  primaryBtn,
}: FriendsSectionProps) {
  return (
    <section className={cardClass}>
      <p className={`text-[11px] uppercase tracking-widest ${muted} mb-2`}>Social Network</p>
      <h2 className="text-[16px] font-medium tracking-tight mb-4">Friends & Connections</h2>

      {/* Add friend */}
      <div className="mb-6">
        <p className={`text-[12px] font-medium mb-2.5 ${muted}`}>Add a Friend</p>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Enter 6-digit friend code"
            value={friendCode}
            onChange={(e) => setFriendCode(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddFriend()}
            className={`${inputClass} flex-1`}
            maxLength={6}
          />
          <button
            onClick={handleAddFriend}
            disabled={!friendCode}
            className={primaryBtn}
          >
            Add
          </button>
        </div>
        {friendMessage && (
          <p className={`mt-2 text-xs font-medium ${friendMessage.type === 'error' ? 'text-red-500' : 'text-green-500'}`}>
            {friendMessage.text}
          </p>
        )}
      </div>

      {/* Friends list */}
      <div>
        <p className={`text-[12px] font-medium mb-3 ${muted}`}>Your Friends</p>
        {friendsLoading ? (
          <div className="space-y-2 animate-pulse">
            {[1, 2, 3].map((i) => (
              <div key={i} className={`p-3 rounded-lg border flex justify-between items-center ${border}`}>
                <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-1/3"></div>
                <div className="h-6 w-24 bg-gray-100 dark:bg-gray-900/50 rounded-lg"></div>
              </div>
            ))}
          </div>
        ) : friends.length === 0 ? (
          <p className={`text-[13px] ${muted} py-2`}>No friends added yet.</p>
        ) : (
          <ul className="space-y-2">
            {friends.map((f: any) => (
              <li
                key={f._id || f.id}
                className={`p-3 rounded-lg border flex justify-between items-center ${border}`}
              >
                <span className="text-[14px] font-medium">{f.name}</span>
                <div className="flex items-center gap-2">
                  <span className={`text-[12px] ${muted}`}>{f.friendCode}</span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(f.friendCode);
                      toast.success("Friend code copied!");
                    }}
                    className={`p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-900 border ${border} transition-colors text-gray-500 hover:text-current`}
                    aria-label="Copy friend code"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3.5 h-3.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0 0 13.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 0 1-.75.75H9a.75.75 0 0 1-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 0 1-2.25 2.25H6.75A2.25 2.25 0 0 1 4.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 0 1 1.927-.184" />
                    </svg>
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
