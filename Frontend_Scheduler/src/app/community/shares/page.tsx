'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/authContext';
import { useDarkMode } from '@/context/DarkModeContext';
import SharedInbox from '@/components/community/SharedInbox';
import { ArrowLeft, Inbox } from 'lucide-react';

export default function MobileSharesPage() {
  const router = useRouter();
  const { isAuthenticated, loading } = useAuth() as any;
  const { darkMode } = useDarkMode() as any;
  const dark = darkMode;

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, loading, router]);

  const border = dark ? 'border-zinc-900/60' : 'border-zinc-200/60';
  const muted = dark ? 'text-zinc-500' : 'text-zinc-500';

  if (loading || !isAuthenticated) {
    return (
      <div className={`min-h-screen flex justify-center items-center transition-colors duration-300 ${dark ? 'bg-[#0a0a0a] text-white' : 'bg-[#f5f5f5] text-zinc-900'}`}>
        <span className="inline-block w-6 h-6 rounded-full border-[2px] border-current border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className={`min-h-screen pt-[50px] md:pt-0 transition-colors duration-300 ${dark ? 'bg-[#0a0a0a] text-white' : 'bg-[#f5f5f5] text-zinc-900'}`}>
      <div className="max-w-[680px] w-full mx-auto px-4 flex flex-col">
        {/* Page header */}
        <div className={`sticky top-0 z-20 -mx-4 px-4 py-4 mb-6 backdrop-blur-md border-b flex items-center justify-between transition-all duration-300 ${dark ? 'bg-black/80 border-zinc-900/60' : 'bg-zinc-50/80 border-zinc-200/60'}`}>
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/community')}
              className={`p-2 rounded-xl transition-all mr-1 ${dark ? 'text-zinc-400 hover:text-white hover:bg-zinc-900' : 'text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100'}`}
              title="Back to Community"
            >
              <ArrowLeft size={20} />
            </button>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${dark ? 'bg-indigo-500/10 text-indigo-400' : 'bg-indigo-50 text-indigo-600'}`}>
              <Inbox size={20} />
            </div>
            <div>
              <h1 className={`text-[20px] font-semibold tracking-tight ${dark ? 'text-white' : 'text-zinc-900'}`}>
                Shared with me
              </h1>
              <p className={`text-[12.5px] ${muted}`}>
                Posts shared directly with you
              </p>
            </div>
          </div>
        </div>

        {/* Full Page Shared Inbox list */}
        <div className="w-full">
          <SharedInbox dark={dark} isPage={true} />
        </div>
      </div>
    </div>
  );
}
