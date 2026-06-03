"use client";

import React, { useEffect, useState, useRef } from 'react';
import { useDarkMode } from '@/context/DarkModeContext';
import { useAttendance } from '@/context/AttendanceContext';
import { useAuth } from '@/context/authContext';
import API from '@/lib/axios';
import FriendsSection from '@/components/dashboard/FriendsSection';
import { useRouter } from 'next/navigation';
import { UserPlus, Settings, Check, Copy } from 'lucide-react';
import { toast } from 'sonner';

export default function FriendsPage() {
  const router = useRouter();
  const { darkMode } = useDarkMode() as any;
  const { friends, friendsLoading } = useAttendance() as any;
  const { isAuthenticated, loading, userDetails } = useAuth() as any;

  const [friendCode, setFriendCode] = useState('');
  const [friendMessage, setFriendMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const friendMessageTimer = useRef<NodeJS.Timeout | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/');
    }
  }, [isAuthenticated, loading, router]);

  const showFriendMessage = (text: string, type: 'success' | 'error') => {
    setFriendMessage({ text, type });
    if (friendMessageTimer.current) clearTimeout(friendMessageTimer.current);
    friendMessageTimer.current = setTimeout(() => setFriendMessage(null), 3000);
  };

  const handleAddFriend = async () => {
    if (!friendCode) return;
    try {
      const res = await API.post('/auth/add', { friendCode });
      showFriendMessage(res.data.message, 'success');
      setFriendCode('');
    } catch (error: any) {
      showFriendMessage(error.response?.data?.error || 'Failed to add friend', 'error');
    }
  };

  const handleCopyCode = () => {
    if (userDetails?.friendCode) {
      navigator.clipboard.writeText(userDetails.friendCode);
      setCopied(true);
      toast.success('Friend Code copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  useEffect(() => {
    return () => {
      if (friendMessageTimer.current) clearTimeout(friendMessageTimer.current);
    };
  }, []);

  const dark = darkMode;
  const border = dark ? 'border-gray-800' : 'border-gray-200';
  const muted = dark ? 'text-gray-400' : 'text-gray-500';
  const cardClass = `border rounded-xl p-5 ${border} ${dark ? 'bg-black' : 'bg-white'}`;

  const inputClass = `w-full px-3.5 py-2 text-sm rounded-lg border outline-none transition-colors
    ${dark
      ? 'bg-black border-gray-800 text-white placeholder-gray-700 focus:border-gray-600'
      : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400 focus:border-gray-400'
    }`;

  const primaryBtn = `px-3.5 py-1.5 rounded-lg text-[13px] font-medium transition-opacity hover:opacity-80 active:scale-95
    ${dark ? 'bg-white text-black' : 'bg-black text-white'}
    disabled:opacity-40`;

  const secondaryBtn = `px-3.5 py-1.5 rounded-lg text-[13px] font-medium border transition-colors flex items-center justify-center gap-1.5
    ${dark
      ? 'border-gray-800 text-gray-200 hover:bg-gray-900 active:bg-gray-950'
      : 'border-gray-200 text-gray-700 hover:bg-gray-50 active:bg-gray-100'
    } disabled:opacity-40`;

  if (loading) {
    return (
      <div className={`min-h-screen flex justify-center items-center transition-colors duration-300 ${dark ? 'bg-black text-white' : 'bg-white text-gray-900'}`}>
        <span className="inline-block w-6 h-6 rounded-full border-[2px] border-current border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className={`min-h-screen transition-colors duration-300 pt-[96px] md:pt-[24px] pb-16 ${dark ? 'bg-black text-white' : 'bg-white text-gray-900'}`}>
      <div className="max-w-[750px] w-full mx-auto px-5">
        
        {/* Page Header */}
        <div className="mb-8 border-b pb-5 border-gray-100 dark:border-gray-900">
          <p className={`text-[11px] uppercase tracking-widest ${muted} mb-1 flex items-center gap-1.5`}>
            <UserPlus size={12} />
            <span>Connections</span>
          </p>
          <h1 className="text-[22px] font-medium tracking-tight">Friends & Connections</h1>
          <p className={`text-[13px] ${muted} mt-0.5`}>Connect with other students to invite them to study rooms and track schedules together.</p>
        </div>

        {/* Invitation Key Card */}
        {userDetails?.friendCode && (
          <div className={`mb-8 p-4 rounded-xl border flex justify-between items-center gap-4 ${dark ? 'border-gray-800 bg-gray-950/20' : 'border-gray-200 bg-gray-50/50'}`}>
            <div>
              <p className={`text-[10px] font-semibold uppercase tracking-wider ${muted} mb-1`}>Your Dojo Friend Code</p>
              <p className="text-[20px] font-mono font-bold tracking-widest text-current">{userDetails.friendCode}</p>
            </div>
            <button
              type="button"
              onClick={handleCopyCode}
              className={secondaryBtn}
            >
              {copied ? <Check size={13} className="text-green-500" /> : <Copy size={13} />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
        )}

        {/* Friends Section Component */}
        <FriendsSection
          friendCode={friendCode}
          setFriendCode={setFriendCode}
          handleAddFriend={handleAddFriend}
          friendMessage={friendMessage}
          friends={friends}
          friendsLoading={friendsLoading}
          cardClass={cardClass}
          border={border}
          muted={muted}
          inputClass={inputClass}
          primaryBtn={primaryBtn}
        />
      </div>
    </div>
  );
}
