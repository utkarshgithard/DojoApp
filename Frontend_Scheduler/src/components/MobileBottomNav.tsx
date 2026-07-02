"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Hash, MessageSquare, LayoutDashboard, BookOpen, Calendar } from 'lucide-react';
import { useDarkMode } from '@/context/DarkModeContext';
import { useChat } from '@/context/ChatContext';

export default function MobileBottomNav() {
  const { darkMode } = useDarkMode() as any;
  const pathname = usePathname();
  const { unreadCounts } = useChat() as any;

  // Calculate total unread chats
  const [totalUnread, setTotalUnread] = useState(0);
  useEffect(() => {
    if (unreadCounts) {
      setTotalUnread(Object.values(unreadCounts).reduce((a: any, b: any) => a + b, 0) as number);
    }
  }, [unreadCounts]);

  const dark = darkMode;
  
  // Base classes for the navbar container
  const navContainerClasses = `
    md:hidden fixed bottom-0 left-0 w-full z-[100] 
    border-t pb-safe 
    backdrop-blur-xl transition-all duration-300
    ${dark 
      ? 'bg-black/90 border-zinc-900 shadow-[0_-10px_40px_rgba(0,0,0,0.5)]' 
      : 'bg-white/90 border-gray-200 shadow-[0_-10px_40px_rgba(0,0,0,0.05)]'
    }
  `;

  // Helper for normal icons
  const getIconClass = (path: string) => {
    const isActive = pathname === path || pathname.startsWith(path + '/');
    if (isActive) {
      return dark ? 'text-white' : 'text-[#6C3CE9]';
    }
    return dark ? 'text-zinc-500 hover:text-zinc-300' : 'text-gray-400 hover:text-gray-600';
  };

  const getLabelClass = (path: string) => {
    const isActive = pathname === path || pathname.startsWith(path + '/');
    if (isActive) {
      return dark ? 'text-white font-semibold' : 'text-[#6C3CE9] font-semibold';
    }
    return dark ? 'text-zinc-500 font-medium' : 'text-gray-400 font-medium';
  };

  return (
    <nav className={navContainerClasses}>
      <div className="flex items-center justify-around h-[65px] px-2 relative">
        
        {/* Community */}
        <Link href="/community" className="flex flex-col items-center justify-center w-[20%] gap-1">
          <Hash size={22} className={getIconClass('/community')} strokeWidth={pathname.startsWith('/community') ? 2.5 : 2} />
          <span className={`text-[10px] ${getLabelClass('/community')}`}>Community</span>
        </Link>

        {/* Chat */}
        <Link href="/chat" className="relative flex flex-col items-center justify-center w-[20%] gap-1">
          <div className="relative">
            <MessageSquare size={22} className={getIconClass('/chat')} strokeWidth={pathname.startsWith('/chat') ? 2.5 : 2} />
            {totalUnread > 0 && (
              <span className="absolute -top-1.5 -right-2 min-w-[16px] h-[16px] rounded-full bg-[#FF5D5D] text-white text-[9px] font-bold flex items-center justify-center px-1 shadow-sm border-[1.5px] border-white dark:border-black">
                {totalUnread > 99 ? '99+' : totalUnread}
              </span>
            )}
          </div>
          <span className={`text-[10px] ${getLabelClass('/chat')}`}>Chat</span>
        </Link>

        {/* Dashboard (Center FAB) */}
        <div className="w-[20%] flex justify-center">
          <Link 
            href="/dashboard" 
            className="relative -top-5 flex flex-col items-center justify-center"
          >
            <div className={`
              w-[52px] h-[52px] rounded-full flex items-center justify-center shadow-lg transition-transform active:scale-95
              ${pathname === '/dashboard' 
                ? 'bg-gradient-to-br from-[#6C3CE9] to-[#4A22B0] text-white shadow-[#6C3CE9]/40' 
                : dark 
                  ? 'bg-zinc-800 text-zinc-300 border-[3px] border-[#0a0a0a] shadow-black/50 hover:bg-zinc-700' 
                  : 'bg-white text-gray-600 border-[3px] border-[#f4f4f5] shadow-gray-200 hover:bg-gray-50'
              }
            `}>
              <LayoutDashboard size={24} strokeWidth={pathname === '/dashboard' ? 2.5 : 2} />
            </div>
          </Link>
        </div>

        {/* Exam Prep */}
        <Link href="/exam-prep" className="flex flex-col items-center justify-center w-[20%] gap-1">
          <BookOpen size={22} className={getIconClass('/exam-prep')} strokeWidth={pathname.startsWith('/exam-prep') ? 2.5 : 2} />
          <span className={`text-[10px] ${getLabelClass('/exam-prep')}`}>Exams</span>
        </Link>

        {/* Calendar / Your Class */}
        <Link href="/calendar" className="flex flex-col items-center justify-center w-[20%] gap-1">
          <Calendar size={22} className={getIconClass('/calendar')} strokeWidth={pathname.startsWith('/calendar') ? 2.5 : 2} />
          <span className={`text-[10px] ${getLabelClass('/calendar')}`}>Class</span>
        </Link>

      </div>
    </nav>
  );
}
