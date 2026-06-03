"use client";

import React, { useState, useContext, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  Calendar, 
  Clock, 
  Settings, 
  LogOut, 
  Sun, 
  Moon, 
  User,
  Users,
  UserPlus
} from 'lucide-react';
import { useDarkMode } from '@/context/DarkModeContext';
import { AuthContext } from '@/context/authContext';
import { auth } from '@/lib/firebase';

const Sidebar = () => {
  const { darkMode, toggleDarkMode } = useDarkMode() as any;
  const { logout, isAuthenticated, loading, userName, profileLoading } = useContext(AuthContext) as any;
  const router = useRouter();
  const pathname = usePathname();
  const [userPhoto, setUserPhoto] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Sync photo from Firebase Auth
  useEffect(() => {
    if (loading) return;
    if (isAuthenticated) {
      const currentUser = auth.currentUser;
      setUserPhoto(currentUser?.photoURL || null);
    } else {
      setUserPhoto(null);
    }
  }, [isAuthenticated, loading, pathname]);

  const handleLogout = async () => {
    try {
      await logout();
      router.push('/');
    } catch (err) {
      console.error("Logout error:", err);
      router.push('/');
    }
  };

  if (!isMounted || !isAuthenticated) return null;

  const dark = darkMode;
  const border = dark ? 'border-gray-800' : 'border-gray-250';
  const textMuted = dark ? 'text-gray-400 hover:text-white hover:bg-gray-900/50' : 'text-gray-500 hover:text-black hover:bg-gray-50';
  const textActive = dark ? 'bg-white text-black font-semibold' : 'bg-black text-white font-semibold';
  const muted = dark ? 'text-gray-400' : 'text-gray-500';

  const navItems = [
    { name: 'Dashboard', href: '/dashboard', icon: <LayoutDashboard size={16} /> },
    { name: 'Sessions', href: '/sessions', icon: <Users size={16} /> },
    { name: 'Friends', href: '/friends', icon: <UserPlus size={16} /> },
    { name: 'Add Classes', href: '/setup-schedule', icon: <Clock size={16} /> },
    { name: 'Calendar', href: '/calendar', icon: <Calendar size={16} /> },
    { name: 'Settings', href: '/settings', icon: <Settings size={16} /> },
  ];

  return (
    <aside
      className={`
        hidden md:flex flex-col fixed top-0 left-0 h-screen w-64 z-40 
        ${dark ? 'bg-black text-white' : 'bg-white text-gray-900'}
        border-r ${border} transition-colors duration-300
      `}
    >
      {/* Brand logo/name */}
      <div className={`h-[76px] flex items-center px-6 border-b ${border}`}>
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <div className={`w-8 h-8 flex items-center justify-center ${dark ? 'text-white' : 'text-black'}`}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" className="w-full h-full">
              <path fill="none" stroke="currentColor" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" d="M 25 28 Q 60 22 95 28" />
              <path fill="none" stroke="currentColor" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" d="M 32 40 H 88" />
              <path fill="none" stroke="currentColor" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" d="M 46 40 V 95" />
              <path fill="none" stroke="currentColor" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" d="M 74 40 V 95" />
              <path fill="none" stroke="currentColor" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" d="M 46 54 H 74" />
            </svg>
          </div>
          <span className="text-[17px] font-semibold tracking-tight">DojoClass</span>
        </Link>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-4 py-6 space-y-1.5">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`
                flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[13.5px] font-medium transition-all duration-200
                ${isActive ? textActive : textMuted}
              `}
            >
              <span className="shrink-0">{item.icon}</span>
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* Bottom controls */}
      <div className={`p-4 border-t ${border} space-y-4`}>
        {/* Dark Mode Switcher Row */}
        <div className={`flex items-center justify-between p-2 rounded-xl border ${border} ${dark ? 'bg-neutral-900/20' : 'bg-gray-50/50'}`}>
          <span className={`text-[12px] font-medium ${muted}`}>Theme Mode</span>
          <button
            onClick={toggleDarkMode}
            className={`p-1.5 rounded-lg border transition-colors ${
              dark ? 'border-gray-800 text-gray-300 hover:bg-gray-900' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
            aria-label="Toggle dark mode"
          >
            {dark ? <Sun size={13} /> : <Moon size={13} />}
          </button>
        </div>

        {/* User profile details & Logout */}
        <div className="flex items-center justify-between gap-3 px-2">
          <div className="flex items-center gap-2.5 min-w-0">
            {/* User Photo */}
            <div className={`w-8 h-8 rounded-full border text-[12.5px] font-semibold flex items-center justify-center overflow-hidden shrink-0 ${
              dark ? 'border-gray-800 bg-gray-900 text-white' : 'border-gray-200 bg-gray-50 text-gray-900'
            }`}>
              {profileLoading ? (
                <span className="w-3.5 h-3.5 rounded-full border-[1.5px] border-current border-t-transparent animate-spin text-gray-400" />
              ) : userPhoto ? (
                <img
                  src={userPhoto}
                  alt={userName}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              ) : userName ? (
                userName.charAt(0).toUpperCase()
              ) : (
                '👤'
              )}
            </div>

            {/* Name/Email Info */}
            <div className="min-w-0">
              <p className="text-[12.5px] font-semibold truncate text-current">{userName || 'My Account'}</p>
              <p className={`text-[10px] truncate ${muted}`}>Online</p>
            </div>
          </div>

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            className="p-1.5 rounded-lg text-red-500 hover:bg-red-500/5 transition-colors shrink-0"
            title="Log out"
          >
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
