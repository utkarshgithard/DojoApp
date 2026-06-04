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
  UserPlus,
  X,
  Coffee
} from 'lucide-react';
import { useDarkMode } from '@/context/DarkModeContext';
import { AuthContext } from '@/context/authContext';
import { useAttendance } from '@/context/AttendanceContext';
import { auth } from '@/lib/firebase';

const Sidebar = () => {
  const { darkMode, toggleDarkMode } = useDarkMode() as any;
  const { logout, isAuthenticated, loading, userName, profileLoading } = useContext(AuthContext) as any;
  const router = useRouter();
  const pathname = usePathname();
  const [userPhoto, setUserPhoto] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [showCoffeeModal, setShowCoffeeModal] = useState(false);
  const [qrBlurred, setQrBlurred] = useState(true);

  const attendance = useAttendance();
  const invites = attendance?.invites || [];
  const [lastSeenInviteId, setLastSeenInviteId] = useState<string | null>(null);
  const [isDismissed, setIsDismissed] = useState(false);

  const activeInvites = invites.filter((invite: any) => {
    if (!invite.invitedAt) return true;
    const age = Date.now() - new Date(invite.invitedAt).getTime();
    return age <= 15 * 60 * 1000;
  });

  const latestInvite = activeInvites.length > 0 ? activeInvites[0] : null;

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (latestInvite && latestInvite.id !== lastSeenInviteId) {
      setLastSeenInviteId(latestInvite.id);
      setIsDismissed(false);
    }
  }, [latestInvite, lastSeenInviteId]);

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
          <div className="w-8 h-8 flex items-center justify-center shrink-0">
            <img
              src="/favicon-6-Photoroom.png"
              alt="DojoClass Logo"
              className="w-full h-full object-contain"
            />
          </div>
          <span className="text-[17px] font-semibold tracking-tight">DojoClass</span>
        </Link>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-4 py-6 space-y-1.5">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const isSessions = item.name === 'Sessions';
          return (
            <div key={item.href} className="relative" id={`sidebar-item-${item.name.toLowerCase().replace(/\s+/g, '-')}`}>
              <Link
                href={item.href}
                className={`
                  flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[13.5px] font-medium transition-all duration-200
                  ${isActive ? textActive : textMuted}
                `}
              >
                <span className="shrink-0">{item.icon}</span>
                <span>{item.name}</span>
                {isSessions && activeInvites.length > 0 && (
                  <span className="ml-auto inline-flex items-center justify-center w-5 h-5 text-[10px] font-bold text-white bg-red-500 rounded-full animate-pulse shrink-0">
                    {activeInvites.length}
                  </span>
                )}
              </Link>

              {/* Floating Cloud Popup (only for Sessions link) */}
              {isSessions && latestInvite && !isDismissed && (
                <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 z-50 pointer-events-auto">
                  {/* Cloud bubble container with floating animation */}
                  <div className="animate-float flex items-center relative">
                    {/* Left pointing arrow (triangle) */}
                    <div className="absolute right-full top-1/2 -translate-y-1/2 w-0 h-0 border-t-[6px] border-t-transparent border-b-[6px] border-b-transparent border-r-[8px] border-r-white dark:border-r-zinc-900 filter drop-shadow-[-1px_0_1px_rgba(0,0,0,0.1)]"></div>
                    
                    {/* The cloud speech bubble */}
                    <div className="backdrop-blur-md bg-white/95 dark:bg-zinc-900/95 text-zinc-900 dark:text-zinc-100 border border-zinc-200/80 dark:border-zinc-800/80 shadow-2xl rounded-2xl p-3.5 pr-8 min-w-[200px] max-w-[250px] relative">
                      {/* Dismiss close button */}
                      <button 
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setIsDismissed(true);
                        }}
                        className="absolute top-2.5 right-2.5 text-zinc-400 hover:text-zinc-650 dark:hover:text-zinc-250 transition-colors"
                        title="Dismiss"
                      >
                        <X size={13} />
                      </button>

                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center gap-1.5 text-red-500 font-semibold text-[10px] uppercase tracking-wider">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping"></span>
                          <span>Study Invite</span>
                        </div>
                        <p className="text-[13px] font-semibold leading-snug truncate">
                          {latestInvite.name} invited you!
                        </p>
                        <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
                          Subject: <span className="font-medium text-zinc-700 dark:text-zinc-300">{latestInvite.subject || 'No topic'}</span>
                        </p>
                        <div className="flex gap-2 mt-2">
                          <Link
                            href="/sessions"
                            onClick={() => setIsDismissed(true)}
                            className="flex-1 text-center py-1 rounded-lg text-[11px] font-semibold bg-black hover:bg-neutral-800 text-white dark:bg-white dark:hover:bg-neutral-100 dark:text-black transition-colors"
                          >
                            View Invite
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
        <style dangerouslySetInnerHTML={{__html: `
          @keyframes float {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-5px); }
          }
          .animate-float {
            animation: float 2.5s ease-in-out infinite;
          }
        `}} />
      </nav>

      {/* Buy Me a Coffee Widget */}
      <div className="px-4 pb-3.5">
        <div className={`p-3.5 rounded-xl border text-center transition-all ${
          dark 
            ? 'bg-amber-950/10 border-amber-900/20 text-amber-200' 
            : 'bg-amber-50/60 border-amber-100 text-amber-900'
        }`}>
          <div className="flex items-center justify-center mb-2">
            <div className="w-9 h-9 rounded-full bg-amber-500/15 flex items-center justify-center">
              <Coffee size={18} className="text-amber-500" />
            </div>
          </div>
          <p className="text-[11.5px] font-semibold leading-snug mb-2">
            Dojo helped your studies?
          </p>
          <button
            onClick={() => {
              setShowCoffeeModal(true);
              setQrBlurred(true);
            }}
            className="w-full py-1.5 rounded-lg text-[11.5px] font-semibold bg-amber-500 hover:bg-amber-600 text-white shadow-sm flex items-center justify-center gap-1.5 transition-all active:scale-[0.98]"
          >
            <Coffee size={12} />
            <span>Buy us a coffee</span>
          </button>
        </div>
      </div>

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

      {/* Buy Me a Coffee QR Modal */}
      {showCoffeeModal && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/70 backdrop-blur-md p-4 transition-all duration-300 pointer-events-auto">
          <div 
            className="fixed inset-0 cursor-default" 
            onClick={() => setShowCoffeeModal(false)}
          />
          <div className={`relative z-10 w-full max-w-[320px] rounded-2xl border p-5 text-center shadow-2xl animate-in zoom-in-95 duration-200 ${
            dark ? 'bg-zinc-950 border-zinc-800 text-white' : 'bg-white border-zinc-200 text-zinc-900'
          }`}>
            {/* Close button */}
            <button
              onClick={() => setShowCoffeeModal(false)}
              className={`absolute top-4 right-4 p-1 rounded-lg transition-colors ${
                dark ? 'hover:bg-zinc-900 text-zinc-400' : 'hover:bg-zinc-100 text-zinc-500'
              }`}
              title="Close"
            >
              <X size={15} />
            </button>

            <div className="flex flex-col items-center">
              <div className="w-12 h-12 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center mb-3">
                <Coffee size={26} strokeWidth={1.7} />
              </div>
              <h3 className="text-[16px] font-bold tracking-tight mb-1">Buy Me a Coffee</h3>
              <p className={`text-[12.5px] leading-relaxed mb-4 ${dark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                Scan using any UPI App (PhonePe, GPay, Paytm) to support DojoClass!
              </p>
              <p className={`text-[11px] mb-4 px-3 py-1.5 rounded-full border ${dark ? 'border-zinc-800 text-zinc-500 bg-zinc-900/50' : 'border-zinc-200 text-zinc-400 bg-zinc-50'}`}>
                🙏 This is completely optional
              </p>

              {/* QR Image Wrapper with Blur Effect */}
              <div 
                className="relative group w-56 h-[340px] rounded-xl overflow-hidden shadow-md border border-zinc-150 dark:border-zinc-850 cursor-pointer select-none bg-white mb-4"
                onClick={() => setQrBlurred(!qrBlurred)}
              >
                <img
                  src="/qr-code.jpg"
                  alt="UPI Donation QR Code"
                  className={`w-full h-full object-cover transition-all duration-500 ease-in-out ${
                    qrBlurred ? 'blur-md brightness-[0.75] scale-98' : 'blur-none brightness-100 scale-100'
                  }`}
                />

                {/* Blur reveal overlay indicator */}
                {qrBlurred && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-3 bg-black/45 backdrop-blur-[2px] transition-opacity duration-300">
                    <span className="text-[20px] mb-2 animate-bounce">👁️</span>
                    <span className="text-white text-[12px] font-semibold tracking-wide">
                      Click to Reveal QR Code
                    </span>
                    <span className="text-white/60 text-[9.5px] mt-1">
                      (Prevents accidental scans)
                    </span>
                  </div>
                )}
              </div>

              <p className={`text-[11px] font-medium ${dark ? 'text-zinc-500' : 'text-zinc-450'}`}>
                Thank you for supporting DojoClass! ❤️
              </p>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
};

export default Sidebar;
