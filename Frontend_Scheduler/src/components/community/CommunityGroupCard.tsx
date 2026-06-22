'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Users, Lock, Eye, Mail, Shield, Crown } from 'lucide-react';
import { CommunityGroup } from '@/context/CommunityGroupContext';

interface CommunityGroupCardProps {
  community: CommunityGroup;
  dark: boolean;
  onJoinToggle?: (slug: string, joined: boolean, memberCount: number) => void;
  isAuthenticated?: boolean;
}

const VISIBILITY_ICONS = {
  public: <Eye size={11} />,
  private: <Lock size={11} />,
  invite_only: <Mail size={11} />,
};

const VISIBILITY_LABELS = {
  public: 'Public',
  private: 'Private',
  invite_only: 'Invite only',
};

const getBannerPositionY = (url: string | null | undefined): number => {
  if (!url) return 50;
  const match = url.match(/[?&]pos=(\d+)/);
  if (match) {
    const parsedPos = parseInt(match[1], 10);
    if (!isNaN(parsedPos)) return Math.max(0, Math.min(100, parsedPos));
  }
  return 50;
};

export default function CommunityGroupCard({
  community,
  dark,
  onJoinToggle,
  isAuthenticated,
}: CommunityGroupCardProps) {
  const router = useRouter();
  const [localJoined, setLocalJoined] = useState(community.joined);
  const [localCount, setLocalCount] = useState(community.memberCount);
  const [joining, setJoining] = useState(false);

  const handleJoin = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    if (joining) return;
    setJoining(true);
    try {
      if (onJoinToggle) {
        const newJoined = !localJoined;
        const newCount = localCount + (newJoined ? 1 : -1);
        setLocalJoined(newJoined);
        setLocalCount(newCount);
        await onJoinToggle(community.slug, newJoined, newCount);
      }
    } catch {
      setLocalJoined(localJoined);
      setLocalCount(localCount);
    } finally {
      setJoining(false);
    }
  };

  return (
    <div
      onClick={() => router.push(`/community/groups/${community.slug}`)}
      className={`group rounded-md border cursor-pointer overflow-hidden transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 active:scale-[0.98] ${dark ? 'bg-zinc-900 border-zinc-800 hover:border-zinc-700' : 'bg-white border-zinc-200 hover:border-zinc-300'
        }`}
    >
      {/* Banner & Avatar Wrapper */}
      <div className="relative">
        <div
          className={`h-20 overflow-hidden ${dark ? 'bg-gradient-to-br from-indigo-950 to-zinc-900' : 'bg-gradient-to-br from-indigo-100 to-indigo-50'
            }`}
        >
          {community.bannerUrl && (
            <img
              src={community.bannerUrl}
              alt=""
              className="w-full h-full object-cover"
              style={{ objectPosition: `center ${getBannerPositionY(community.bannerUrl)}%` }}
            />
          )}
        </div>
        {/* Avatar */}
        <div
          className={`absolute -bottom-5 left-4 w-10 h-10 rounded-xl border-2 flex items-center justify-center overflow-hidden shrink-0 z-10 ${dark ? 'border-zinc-900 bg-indigo-900' : 'border-white bg-indigo-100'
            }`}
        >
          {community.avatarUrl ? (
            <img src={community.avatarUrl} alt={community.name} className="w-full h-full object-contain bg-black/5 dark:bg-white/5" />
          ) : (
            <span className={`text-[13px] font-bold ${dark ? 'text-indigo-300' : 'text-indigo-600'}`}>
              {community.name.charAt(0).toUpperCase()}
            </span>
          )}
        </div>
      </div>

      <div className="p-4 pt-7">
        {/* Name + visibility */}
        <div className="flex items-start justify-between gap-2 mb-1">
          <div className="min-w-0">
            <h3
              className={`text-[15px] font-semibold leading-tight truncate ${dark ? 'text-white' : 'text-zinc-900'
                }`}
            >
              {community.name}
            </h3>
            <p className={`text-[11.5px] ${dark ? 'text-zinc-500' : 'text-zinc-400'}`}>
              c/{community.slug}
            </p>
          </div>
          <span
            className={`flex items-center gap-1 text-[10.5px] font-medium px-2 py-0.5 rounded-full shrink-0 mt-0.5 ${dark ? 'bg-zinc-800 text-zinc-400' : 'bg-zinc-100 text-zinc-500'
              }`}
          >
            {VISIBILITY_ICONS[community.visibility]}
            {VISIBILITY_LABELS[community.visibility]}
          </span>
        </div>

        {/* Description */}
        {community.description && (
          <p
            className={`text-[12.5px] leading-relaxed line-clamp-2 mb-3 ${dark ? 'text-zinc-400' : 'text-zinc-500'
              }`}
          >
            {community.description}
          </p>
        )}

        {/* Stats + join button */}
        <div className="flex items-center justify-between mt-3">
          <div className="flex items-center gap-1.5">
            <Users size={13} className={dark ? 'text-zinc-500' : 'text-zinc-400'} />
            <span className={`text-[12px] ${dark ? 'text-zinc-500' : 'text-zinc-400'}`}>
              {localCount.toLocaleString()} {localCount === 1 ? 'member' : 'members'}
            </span>
          </div>

          {community.myRole === 'creator' ? (
            <span
              className={`flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-xl ${dark ? 'bg-amber-900/30 text-amber-400' : 'bg-amber-50 text-amber-600'
                }`}
            >
              <Crown size={11} />
              Creator
            </span>
          ) : community.myRole === 'moderator' ? (
            <span
              className={`flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-xl ${dark ? 'bg-violet-900/30 text-violet-400' : 'bg-violet-50 text-violet-600'
                }`}
            >
              <Shield size={11} />
              Mod
            </span>
          ) : (
            <button
              onClick={handleJoin}
              disabled={joining || community.visibility === 'invite_only' && !localJoined}
              className={`text-[12px] font-semibold px-3 py-1.5 rounded-xl transition-all active:scale-95 disabled:opacity-50 ${localJoined
                  ? dark
                    ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                    : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                }`}
            >
              {joining ? '…' : localJoined ? 'Joined' : community.visibility === 'invite_only' ? 'Invite only' : 'Join'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
