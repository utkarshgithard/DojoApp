"use client";

import React, { useState, useContext, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { Moon, Sun, Menu, X, LogOut, LayoutDashboard, Calendar, Clock, Settings, User, Users, UserPlus } from 'lucide-react';
import { useDarkMode } from '@/context/DarkModeContext';
import { AuthContext } from '@/context/authContext';
import { useAttendance } from '@/context/AttendanceContext';
import { auth } from '@/lib/firebase';

const Navbar = () => {
  const { darkMode, toggleDarkMode } = useDarkMode() as any;
  const { logout, isAuthenticated, loading, userName, profileLoading, setUserName } = useContext(AuthContext) as any;
  const router = useRouter();
  const pathname = usePathname();

  const attendance = useAttendance();
  const invites = attendance?.invites || [];
  const activeInvitesCount = invites.filter((invite: any) => {
    if (!invite.invitedAt) return true;
    const age = Date.now() - new Date(invite.invitedAt).getTime();
    return age <= 15 * 60 * 1000;
  }).length;

  const [isOpen, setIsOpen] = useState(false);
  const [showNavbar, setShowNavbar] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [isMounted, setIsMounted] = useState(false);
  const [userPhoto, setUserPhoto] = useState<string | null>(null);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

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

  const toggleMenu = () => setIsOpen(!isOpen);
  const closeMenu = () => setIsOpen(false);

  const handleLogout = async () => {
    try {
      await logout();
      router.push('/');
    } catch (err) {
      console.error("Logout error:", err);
      router.push('/');
    }
  };

  // Scroll detection logic
  useEffect(() => {
    let timeout: NodeJS.Timeout;
    const controlNavbar = () => {
      if (window.scrollY < lastScrollY) {
        setShowNavbar(true); // scrolling up → show
      } else {
        setShowNavbar(false); // scrolling down → hide
      }
      setLastScrollY(window.scrollY);

      clearTimeout(timeout);
      timeout = setTimeout(() => setShowNavbar(true), 1500); // auto-show after pause
    };

    window.addEventListener('scroll', controlNavbar);
    return () => {
      window.removeEventListener('scroll', controlNavbar);
      clearTimeout(timeout);
    };
  }, [lastScrollY]);

  const dark = darkMode;
  const border = dark ? 'border-gray-800' : 'border-gray-200';
  const textMuted = dark ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-black';
  const textActive = dark ? 'text-white' : 'text-black';
  const muted = dark ? 'text-gray-400' : 'text-gray-500';

  return (
    <nav
      className={`
        md:hidden fixed top-0 left-0 w-full z-50 transition-transform duration-300 ease-in-out 
        ${showNavbar ? 'translate-y-0' : '-translate-y-full'}
        ${dark ? 'bg-black/80 text-white' : 'bg-white/80 text-gray-900'}
        backdrop-blur-md border-b ${border}
      `}
    >
      <div className="max-w-[1100px] mx-auto px-5 py-3 flex justify-between items-center">
        {/* Brand logo on the left */}
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="flex items-center gap-2" onClick={closeMenu}>
            <div className="w-6 h-6 flex items-center justify-center shrink-0">
              <img
                src="/favicon-6-Photoroom.png"
                alt="DojoClass Logo"
                className="w-full h-full object-contain"
              />
            </div>
            <span className="text-[16px] font-medium tracking-tight">DojoClass</span>
          </Link>
        </div>

        {/* Desktop Links */}
        <div className="hidden md:flex items-center gap-6">
          <Link
            href="/dashboard"
            className={`text-[13px] font-medium transition-colors ${
              pathname === '/dashboard' ? textActive : textMuted
            }`}
          >
            Dashboard
          </Link>
          <Link
            href="/sessions"
            className={`text-[13px] font-medium transition-colors ${
              pathname === '/sessions' ? textActive : textMuted
            }`}
          >
            Sessions
          </Link>
          <Link
            href="/friends"
            className={`text-[13px] font-medium transition-colors ${
              pathname === '/friends' ? textActive : textMuted
            }`}
          >
            Friends
          </Link>
          <Link
            href="/setup-schedule"
            className={`text-[13px] font-medium transition-colors ${
              pathname === '/setup-schedule' ? textActive : textMuted
            }`}
          >
            Add Classes
          </Link>
          <Link
            href="/calendar"
            className={`text-[13px] font-medium transition-colors ${
              pathname === '/calendar' ? textActive : textMuted
            }`}
          >
            Calendar
          </Link>
          <Link
            href="/settings"
            className={`text-[13px] font-medium transition-colors ${
              pathname === '/settings' ? textActive : textMuted
            }`}
          >
            Settings
          </Link>
        </div>

        {/* Right side controls (Always visible, containing desktop-only Dark Mode Switcher, mobile hamburger, & all-devices Profile Dropdown) */}
        <div className="flex items-center gap-3">
          {/* Dark Mode Switcher - hidden on mobile, visible on desktop */}
          <button
            onClick={toggleDarkMode}
            className={`hidden md:flex p-2 rounded-full border transition-colors ${
              dark ? 'border-gray-800 text-gray-300 hover:bg-gray-900' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
            aria-label="Toggle dark mode"
          >
            {dark ? <Sun size={14} /> : <Moon size={14} />}
          </button>

          {/* Mobile hamburger menu toggle button - placed immediately to the left of the profile */}
          <div className="relative md:hidden">
            <button
              onClick={toggleMenu}
              className={`p-1.5 rounded border transition-colors ${
                dark ? 'border-gray-800 text-white hover:bg-gray-900' : 'border-gray-200 text-gray-900 hover:bg-gray-50'
              }`}
              aria-label="Menu"
            >
              {isOpen ? <X size={16} /> : <Menu size={16} />}
            </button>
            {activeInvitesCount > 0 && !isOpen && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-red-500 border border-white dark:border-black animate-ping" />
            )}
            {activeInvitesCount > 0 && !isOpen && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-red-500 border border-white dark:border-black" />
            )}
          </div>

          {isMounted && isAuthenticated && (
            <div className="relative">
              {/* Profile Avatar Button */}
              {profileLoading ? (
                <button
                  disabled
                  className={`w-8 h-8 rounded-full border flex items-center justify-center ${
                    dark ? 'border-gray-800 bg-gray-900' : 'border-gray-200 bg-gray-50'
                  }`}
                  aria-label="Loading Profile"
                >
                  <span className="w-3.5 h-3.5 rounded-full border-[1.5px] border-current border-t-transparent animate-spin text-gray-400 dark:text-gray-500" />
                </button>
              ) : (
                <button
                  onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                  className={`w-8 h-8 rounded-full border text-[12.5px] font-semibold flex items-center justify-center hover:opacity-85 transition-opacity overflow-hidden ${
                    dark ? 'border-gray-800 bg-gray-900 text-white' : 'border-gray-200 bg-gray-50 text-gray-900'
                  }`}
                  aria-label="User Profile"
                >
                  {userPhoto ? (
                    <img
                      src={userPhoto}
                      alt={userName}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover animate-in fade-in duration-300"
                    />
                  ) : userName ? (
                    userName.charAt(0).toUpperCase()
                  ) : (
                    '👤'
                  )}
                </button>
              )}

              {/* Backdrop helper to close menu on click outside */}
              {profileMenuOpen && (
                <div 
                  className="fixed inset-0 z-40 bg-transparent"
                  onClick={() => setProfileMenuOpen(false)}
                />
              )}

              {/* Profile Dropdown Menu */}
              {profileMenuOpen && (
                <div className={`absolute right-0 top-full mt-2 w-48 rounded-xl border p-1.5 shadow-2xl z-50 animate-in fade-in slide-in-from-top-2 duration-150 ${
                  dark ? 'bg-black border-gray-800 text-white' : 'bg-white border-gray-200 text-gray-900'
                }`}>
                  <div className="px-3 py-2.5 border-b border-gray-100 dark:border-gray-950 flex items-center gap-2.5">
                    <div className="relative w-8 h-8 rounded-full overflow-hidden shrink-0 border border-gray-200 dark:border-gray-800 text-[11px] font-semibold flex items-center justify-center bg-gray-50 dark:bg-gray-900">
                      {userPhoto ? (
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
                    <div className="min-w-0">
                      <p className={`text-[9px] uppercase tracking-wider font-semibold ${muted}`}>Account</p>
                      <p className="text-[12.5px] font-semibold truncate mt-0.5 text-current">{userName || 'My Account'}</p>
                    </div>
                  </div>
                  
                  <div className="py-1">
                    <Link
                      href="/settings"
                      onClick={() => setProfileMenuOpen(false)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-[13px] font-medium transition-colors ${
                        dark ? 'text-gray-400 hover:text-white hover:bg-gray-950' : 'text-gray-600 hover:text-black hover:bg-gray-50'
                      }`}
                    >
                      <User size={13} />
                      <span>Profile Settings</span>
                    </Link>
                    <Link
                      href="/dashboard"
                      onClick={() => setProfileMenuOpen(false)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-[13px] font-medium transition-colors ${
                        dark ? 'text-gray-400 hover:text-white hover:bg-gray-950' : 'text-gray-600 hover:text-black hover:bg-gray-50'
                      }`}
                    >
                      <LayoutDashboard size={13} />
                      <span>Dashboard</span>
                    </Link>

                    {/* Mobile-only Dark/Light Mode toggle */}
                    <button
                      onClick={() => {
                        toggleDarkMode();
                      }}
                      className={`flex md:hidden items-center justify-between w-full px-3 py-2 rounded-lg text-[13px] font-medium transition-colors text-left ${
                        dark ? 'text-gray-400 hover:text-white hover:bg-gray-950' : 'text-gray-600 hover:text-black hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {dark ? <Sun size={13} /> : <Moon size={13} />}
                        <span>{dark ? 'Light Mode' : 'Dark Mode'}</span>
                      </div>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded border ${
                        dark ? 'border-gray-800 text-gray-400 bg-gray-950' : 'border-gray-200 text-gray-500 bg-gray-50'
                      }`}>
                        {dark ? 'Dark' : 'Light'}
                      </span>
                    </button>
                  </div>

                  <div className="border-t border-gray-100 dark:border-gray-950 pt-1 mt-1">
                    <button
                      onClick={() => {
                        setProfileMenuOpen(false);
                        handleLogout();
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[13px] font-medium transition-colors text-red-500 hover:bg-red-500/5 text-left"
                    >
                      <LogOut size={13} />
                      <span>Log out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div
          className={`${dark ? 'bg-black/95 border-b border-gray-800 text-white' : 'bg-white/95 border-b border-gray-200 text-gray-900'} 
          md:hidden px-5 py-4 space-y-3.5 backdrop-blur-lg transition-all duration-200`}
        >
          <Link
            href="/dashboard"
            onClick={closeMenu}
            className={`flex items-center gap-2.5 text-[14px] font-medium py-1 ${
              pathname === '/dashboard' ? textActive : textMuted
            }`}
          >
            <LayoutDashboard size={15} />
            <span>Dashboard</span>
          </Link>
          <Link
            href="/sessions"
            onClick={closeMenu}
            className={`flex items-center gap-2.5 text-[14px] font-medium py-1 w-full ${
              pathname === '/sessions' ? textActive : textMuted
            }`}
          >
            <Users size={15} />
            <span>Sessions</span>
            {activeInvitesCount > 0 && (
              <span className="ml-auto inline-flex items-center justify-center w-5 h-5 text-[10px] font-bold text-white bg-red-500 rounded-full animate-pulse">
                {activeInvitesCount}
              </span>
            )}
          </Link>
          <Link
            href="/friends"
            onClick={closeMenu}
            className={`flex items-center gap-2.5 text-[14px] font-medium py-1 ${
              pathname === '/friends' ? textActive : textMuted
            }`}
          >
            <UserPlus size={15} />
            <span>Friends</span>
          </Link>
          <Link
            href="/setup-schedule"
            onClick={closeMenu}
            className={`flex items-center gap-2.5 text-[14px] font-medium py-1 ${
              pathname === '/setup-schedule' ? textActive : textMuted
            }`}
          >
            <Clock size={15} />
            <span>Add Classes</span>
          </Link>
          <Link
            href="/calendar"
            onClick={closeMenu}
            className={`flex items-center gap-2.5 text-[14px] font-medium py-1 ${
              pathname === '/calendar' ? textActive : textMuted
            }`}
          >
            <Calendar size={15} />
            <span>Calendar</span>
          </Link>
          <Link
            href="/settings"
            onClick={closeMenu}
            className={`flex items-center gap-2.5 text-[14px] font-medium py-1 ${
              pathname === '/settings' ? textActive : textMuted
            }`}
          >
            <Settings size={15} />
            <span>Settings</span>
          </Link>

          {isMounted && isAuthenticated && (
            <div className="pt-2 border-t border-gray-100 dark:border-gray-900">
              <button
                onClick={() => {
                  handleLogout();
                  closeMenu();
                }}
                className={`flex items-center justify-center gap-2 w-full py-2.5 rounded-lg text-[13px] font-medium border ${
                  dark ? 'border-gray-800 text-gray-200 hover:bg-gray-900' : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                }`}
              >
                <LogOut size={14} />
                <span>Log out</span>
              </button>
            </div>
          )}
        </div>
      )}
    </nav>
  );
};

export default Navbar;
