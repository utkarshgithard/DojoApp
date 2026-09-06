"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Compass, Hash, Users, LayoutDashboard, UserRound } from 'lucide-react';
import { useDarkMode } from '@/context/DarkModeContext';
import { useNotifications } from '@/context/NotificationContext';

export default function MobileBottomNav() {
  const { darkMode } = useDarkMode() as any;
  const pathname = usePathname();
  const { unreadCount } = useNotifications();

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

        {/* Friends */}
        <Link href="/friends" className="relative flex flex-col items-center justify-center w-[20%] gap-1">
          <div className="relative">
            <Users size={22} className={getIconClass('/friends')} strokeWidth={pathname.startsWith('/friends') ? 2.5 : 2} />
            {unreadCount > 0 && (
              <span className="absolute -top-1.5 -right-2 min-w-[16px] h-[16px] rounded-full bg-[#FF5D5D] text-white text-[9px] font-bold flex items-center justify-center px-1 shadow-sm border-[1.5px] border-white dark:border-black">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </div>
          <span className={`text-[10px] ${getLabelClass('/friends')}`}>Friends</span>
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

        {/* Discover communities */}
        <Link href="/community/groups" className="flex flex-col items-center justify-center w-[20%] gap-1">
          <Compass size={22} className={getIconClass('/community/groups')} strokeWidth={pathname.startsWith('/community/groups') ? 2.5 : 2} />
          <span className={`text-[10px] ${getLabelClass('/community/groups')}`}>Discover</span>
        </Link>

        {/* Class and Exam */}
        <Link href="/me" className="flex flex-col items-center justify-center w-[20%] gap-1">
          <UserRound size={22} className={getIconClass('/me')} strokeWidth={pathname.startsWith('/me') ? 2.5 : 2} />
          <span className={`text-[10px] ${getLabelClass('/me')}`}>Me</span>
        </Link>

      </div>
    </nav>
  );
}
