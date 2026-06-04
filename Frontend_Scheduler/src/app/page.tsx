/* eslint-disable react/no-unescaped-entities */
"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Moon, 
  Sun, 
  Mail, 
  Phone, 
  ArrowRight, 
  Lock, 
  Unlock,
  Users, 
  Flame, 
  AlertTriangle, 
  Check, 
  BarChart3, 
  UserCheck, 
  Sparkles,
  Calendar,
  Clock
} from 'lucide-react';
import { useDarkMode } from '@/context/DarkModeContext';
import { useAuth } from '@/context/authContext';

export default function LandingPage() {
  const router = useRouter();
  const { darkMode, toggleDarkMode } = useDarkMode() as any;
  const { isAuthenticated, loading } = useAuth();

  const [isLocked, setIsLocked] = useState(false);
  const [attendanceStep, setAttendanceStep] = useState(0);
  const [sessionsCount, setSessionsCount] = useState(12);
  const [hoursCount, setHoursCount] = useState(18);
  const [attendancePercent, setAttendancePercent] = useState(86);
  const [chatStep, setChatStep] = useState(0);
  const [sessionChatStep, setSessionChatStep] = useState(0);
  const [headlineStep, setHeadlineStep] = useState(0);

  const headlinePhrases = [
    "Stay above 75%.",
    "Host Session.",
    "Make friends.",
    "Manage Everything."
  ];

  const chatMessages = [
    { sender: 'You', text: "Hey! Marked attendance?", align: 'left' },
    { sender: 'Ananya', text: "Yes! 95% safe. 🚀", align: 'right' },
    { sender: 'You', text: "Awesome! Let's prep Physics?", align: 'left' },
    { sender: 'Ananya', text: "Joining room now! 🎯", align: 'right' }
  ];

  const sessionChats = [
    { sender: 'Rohan M.', text: "Wait, is equation 3 correct? 🤔", avatar: 'RM' },
    { sender: 'Ananya M.', text: "Yes! Just divide by gravity. 🚀", avatar: 'AM' },
    { sender: 'Siddharth V.', text: "Joining in 2 minutes guys! 🎯", avatar: 'SV' },
    { sender: 'Riya M.', text: "Let's review the motion graphs next. 📈", avatar: 'Riya' }
  ];

  useEffect(() => {
    if (!loading && isAuthenticated) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, loading, router]);

  useEffect(() => {
    const lockInterval = setInterval(() => {
      setIsLocked(prev => !prev);
    }, 2500);

    const attendanceInterval = setInterval(() => {
      setAttendanceStep(prev => (prev + 1) % 6);
    }, 1200);

    const progressInterval = setInterval(() => {
      setSessionsCount(prev => {
        const change = Math.random() > 0.5 ? 1 : -1;
        const next = prev + change;
        return next >= 10 && next <= 15 ? next : 12;
      });
      setHoursCount(prev => {
        const change = Math.random() > 0.5 ? 1 : -1;
        const next = prev + change;
        return next >= 15 && next <= 22 ? next : 18;
      });
      setAttendancePercent(prev => {
        const change = Math.round((Math.random() - 0.5) * 2);
        const next = prev + change;
        return next >= 80 && next <= 95 ? next : 86;
      });
    }, 1800);

    const chatInterval = setInterval(() => {
      setChatStep(prev => (prev + 1) % 4);
    }, 3500);

    const sessionChatInterval = setInterval(() => {
      setSessionChatStep(prev => (prev + 1) % 4);
    }, 2800);

    const headlineInterval = setInterval(() => {
      setHeadlineStep(prev => (prev + 1) % 4);
    }, 3000);

    return () => {
      clearInterval(lockInterval);
      clearInterval(attendanceInterval);
      clearInterval(progressInterval);
      clearInterval(chatInterval);
      clearInterval(sessionChatInterval);
      clearInterval(headlineInterval);
    };
  }, []);

  const dark = darkMode;

  // Unique visual vector SVG avatars representing individual students
  const getStudentAvatar = (name: string, size: string = "w-8 h-8") => {
    switch (name) {
      case 'Ananya':
      case 'AM': // Ananya M.
        return (
          <div className={`${size} rounded-full overflow-hidden border-2 border-white dark:border-zinc-900 shadow-sm shrink-0 bg-gradient-to-tr from-pink-400 to-violet-500 flex items-center justify-center`}>
            <svg className="w-full h-full" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M16 19c-5 0-9 3-9 7v2h18v-2c0-4-4-7-9-7z" fill="#F5F3FF" />
              <path d="M13 22h6v6h-6z" fill="#DDD6FE" />
              <rect x="14.5" y="17.5" width="3" height="4" rx="1.5" fill="#FED7AA" />
              <circle cx="16" cy="14" r="5.5" fill="#FDBA74" />
              <path d="M10 11.5c.5-4 4-5.5 6-5.5s5.5 1.5 6 5.5c.5 4 0 4-1 4.5s-2-2-5-2-4 2-5 2-1-.5-1-4.5z" fill="#1F2937" />
              <circle cx="21" cy="9" r="2.5" fill="#1F2937" />
              <circle cx="14" cy="13.5" r="0.75" fill="#111827" />
              <circle cx="18" cy="13.5" r="0.75" fill="#111827" />
              <path d="M14.5 15.5c.5.8 2.5.8 3 0" stroke="#111827" strokeWidth="0.75" strokeLinecap="round" />
            </svg>
          </div>
        );
      case 'Rohan':
      case 'RM': // Rohan M. / Rohan S.
        return (
          <div className={`${size} rounded-full overflow-hidden border-2 border-white dark:border-zinc-900 shadow-sm shrink-0 bg-gradient-to-tr from-blue-400 to-emerald-500 flex items-center justify-center`}>
            <svg className="w-full h-full" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M16 19c-5 0-9 3-9 7v2h18v-2c0-4-4-7-9-7z" fill="#EFF6FF" />
              <path d="M14 19.5l2 3.5 2-3.5h-4z" fill="#2563EB" />
              <rect x="14.5" y="17.5" width="3" height="4" rx="1.5" fill="#FDBA74" />
              <circle cx="16" cy="13.5" r="5.5" fill="#FFD8A8" />
              <path d="M10.5 11c0-4.5 3-6.5 5.5-6.5s5.5 2 5.5 6.5c0 1-.5 1-1 .5s-1.5-2.5-4.5-2.5-4 2-4.5 2.5-.5.5-1-.5z" fill="#4B5563" />
              <rect x="12" y="12" width="3.5" height="2" rx="0.5" stroke="#111827" strokeWidth="0.75" />
              <rect x="16.5" y="12" width="3.5" height="2" rx="0.5" stroke="#111827" strokeWidth="0.75" />
              <line x1="15.5" y1="13" x2="16.5" y2="13" stroke="#111827" strokeWidth="0.75" />
              <path d="M14.5 16c.5.5 2.5.5 3 0" stroke="#111827" strokeWidth="0.75" strokeLinecap="round" />
            </svg>
          </div>
        );
      case 'Siddharth':
      case 'SV': // Siddharth V. / Shreya V. (SV)
        return (
          <div className={`${size} rounded-full overflow-hidden border-2 border-white dark:border-zinc-900 shadow-sm shrink-0 bg-gradient-to-tr from-amber-400 to-red-500 flex items-center justify-center`}>
            <svg className="w-full h-full" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M16 19c-5 0-9 3-9 7v2h18v-2c0-4-4-7-9-7z" fill="#FFF7ED" />
              <path d="M13.5 20.5h5v8h-5z" fill="#EA580C" />
              <rect x="14.5" y="17.5" width="3" height="4" rx="1.5" fill="#FDBA74" />
              <circle cx="16" cy="13.5" r="5.5" fill="#FDBA74" />
              <path d="M10.5 11c.5-3.5 3.5-5 5.5-5s5.5 1.5 5.5 5c0 .8-.5 1-1.5 0s-2-2-4-2-3 2-4.5 2.5-1-.3-1-.5z" fill="#78350F" />
              <circle cx="14.25" cy="13.5" r="0.75" fill="#111827" />
              <circle cx="17.75" cy="13.5" r="0.75" fill="#111827" />
              <path d="M14.5 15.5c.5.8 2.5.8 3 0" stroke="#111827" strokeWidth="0.75" strokeLinecap="round" />
            </svg>
          </div>
        );
      case 'Riya':
        return (
          <div className={`${size} rounded-full overflow-hidden border-2 border-white dark:border-zinc-900 shadow-sm shrink-0 bg-gradient-to-tr from-emerald-400 to-cyan-500 flex items-center justify-center`}>
            <svg className="w-full h-full" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M16 19c-5 0-9 3-9 7v2h18v-2c0-4-4-7-9-7z" fill="#ECFDF5" />
              <rect x="14.5" y="17.5" width="3" height="4" rx="1.5" fill="#FDBA74" />
              <circle cx="16" cy="14" r="5.5" fill="#FDBA74" />
              <path d="M11 9c.5-2.5 3-3.5 5-3.5s4.5 1 5 3.5c.5 2.5.5 6.5.5 8.5h-11c0-2 0-6 .5-8.5z" fill="#D97706" />
              <circle cx="14.25" cy="13.5" r="0.75" fill="#111827" />
              <circle cx="17.75" cy="13.5" r="0.75" fill="#111827" />
              <path d="M14.5 15.7c.4.6 2 .6 2.4 0" stroke="#111827" strokeWidth="0.75" strokeLinecap="round" />
            </svg>
          </div>
        );
      case 'Varun':
        return (
          <div className={`${size} rounded-full overflow-hidden border-2 border-white dark:border-zinc-900 shadow-sm shrink-0 bg-gradient-to-tr from-violet-500 to-pink-500 flex items-center justify-center`}>
            <svg className="w-full h-full" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M16 19c-5 0-9 3-9 7v2h18v-2c0-4-4-7-9-7z" fill="#FAF5FF" />
              <rect x="14.5" y="17.5" width="3" height="4" rx="1.5" fill="#FDBA74" />
              <circle cx="16" cy="13.5" r="5.5" fill="#FDBA74" />
              <path d="M10 11.5c0-4.5 3.5-5.5 6-5.5s6 1 6 5.5c0 1.5-.5 1-1.5 0s-2-2-4.5-2-3.5 2-4.5 2c-1 1-1.5.5-1.5-1z" fill="#111827" />
              <path d="M9.5 13.5c0-4 2.5-6.5 6.5-6.5s6.5 2.5 6.5 6.5" stroke="#3B82F6" strokeWidth="1.5" fill="none" />
              <rect x="9" y="12" width="2" height="3" rx="0.5" fill="#3B82F6" />
              <rect x="21" y="12" width="2" height="3" rx="0.5" fill="#3B82F6" />
              <circle cx="14.25" cy="13.5" r="0.75" fill="#111827" />
              <circle cx="17.75" cy="13.5" r="0.75" fill="#111827" />
              <path d="M14.5 15.5c.5.8 2.5.8 3 0" stroke="#111827" strokeWidth="0.75" strokeLinecap="round" />
            </svg>
          </div>
        );
      default:
        // Default avatar with initials
        return (
          <div className={`${size} rounded-full overflow-hidden border-2 border-white dark:border-zinc-900 bg-zinc-150 dark:bg-zinc-800 flex items-center justify-center text-[10px] font-bold text-zinc-650 dark:text-zinc-350 shadow-sm shrink-0`}>
            {name}
          </div>
        );
    }
  };

  // Custom styles based on active theme
  const bgClass = dark ? 'bg-[#09090B] text-zinc-100' : 'bg-white text-[#1C1917]';
  const borderClass = dark ? 'border-zinc-800' : 'border-[#EBEAE4]';
  const textMutedClass = dark ? 'text-zinc-400' : 'text-[#6A635B]';
  const cardBgClass = dark ? 'bg-[#18181B] border-zinc-800' : 'bg-[#FAF9F5] border-[#EBEAE4]';

  return (
    <div className={`min-h-screen transition-colors duration-500 font-sans ${bgClass}`}>
      <meta name="google-site-verification" content="MH-qCpIalYR4S1flnD1CRaPx_tUMSziNE9Y6cLpgdnI" />
      <style>{`
        @keyframes strokeDash {
          to {
            stroke-dashoffset: -20;
          }
        }
        .animate-connection-line {
          stroke-dasharray: 6 6;
          animation: strokeDash 1.5s linear infinite;
        }
        @keyframes checkPop {
          0% { transform: scale(0); opacity: 0; }
          80% { transform: scale(1.15); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        .animate-check-pop {
          animation: checkPop 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
        @keyframes lockClick {
          0% { transform: scale(0.6) rotate(-15deg); opacity: 0; }
          50% { transform: scale(1.25) rotate(10deg); }
          70% { transform: scale(0.9) rotate(-5deg); }
          100% { transform: scale(1) rotate(0deg); opacity: 1; }
        }
        .animate-lock-click {
          animation: lockClick 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
        @keyframes unlockClick {
          0% { transform: scale(0.6) rotate(15deg); opacity: 0; }
          50% { transform: scale(1.25) rotate(-10deg); }
          70% { transform: scale(0.9) rotate(5deg); }
          100% { transform: scale(1) rotate(0deg); opacity: 1; }
        }
        .animate-unlock-click {
          animation: unlockClick 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
        @keyframes vibrateAnimation {
          0%, 100% { transform: scale(1) rotate(0deg); }
          5%, 25% { transform: scale(1.05) rotate(-3deg); }
          10%, 30% { transform: scale(1.05) rotate(3deg); }
          15%, 35% { transform: scale(1.05) rotate(-2deg); }
          20%, 40% { transform: scale(1.05) rotate(2deg); }
          45% { transform: scale(1) rotate(0deg); }
        }
        .animate-vibrate {
          animation: vibrateAnimation 1.6s ease-in-out infinite;
        }
        @keyframes messageExchange {
          0% { left: 0%; transform: scale(0.7); opacity: 0; }
          10%, 40% { opacity: 1; }
          48% { left: 100%; transform: scale(1.15) translateX(-100%); opacity: 1; }
          50% { left: 100%; transform: scale(0.7) translateX(-100%); opacity: 0; }
          52% { left: 100%; transform: scale(0.7) translateX(-100%); opacity: 0; }
          60%, 90% { opacity: 1; }
          98% { left: 0%; transform: scale(1.15) translateX(0%); opacity: 1; }
          100% { left: 0%; transform: scale(0.7) translateX(0%); opacity: 0; }
        }
        .animate-message-exchange {
          animation: messageExchange 3.5s cubic-bezier(0.4, 0, 0.2, 1) infinite;
        }
        @keyframes floatYou {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
        .animate-float-you {
          animation: floatYou 3s ease-in-out infinite;
        }
        @keyframes floatAnanya {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
        .animate-float-ananya {
          animation: floatAnanya 3s ease-in-out infinite;
          animation-delay: 1.5s;
        }
        @keyframes headlineSlideIn {
          0% { transform: translateY(14px); opacity: 0; filter: blur(3px); }
          100% { transform: translateY(0); opacity: 1; filter: blur(0); }
        }
        .animate-headline-slide {
          animation: headlineSlideIn 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
      `}</style>

      {/* Header */}
      <header className={`sticky top-0 z-50 backdrop-blur-md border-b transition-colors duration-300 ${dark ? 'bg-[#09090B]/85 border-zinc-800/80' : 'bg-white/85 border-[#EBEAE4]/80'}`}>
        <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
          <nav aria-label="Main navigation" className="flex items-center gap-2">
            <span className="text-xl font-bold tracking-tight font-serif" aria-label="DojoClass home">
              DojoClass
            </span>
          </nav>

          <div className="flex items-center gap-2 md:gap-4">
            <button
              onClick={toggleDarkMode}
              aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
              className={`p-2 rounded-full border transition-all duration-300 ${
                dark 
                  ? 'border-zinc-850 text-zinc-300 hover:bg-zinc-900 hover:text-white' 
                  : 'border-neutral-200 text-[#6A635B] hover:bg-[#FAF9F5] hover:text-[#1C1917]'
              }`}
            >
              {dark ? <Sun size={17} /> : <Moon size={17} />}
            </button>

            {/* Mobile-only compact auth button (sign up only) */}
            <button 
              onClick={() => router.push('/register')}
              className={`md:hidden text-xs font-semibold px-3 py-1.5 rounded-full ${
                dark 
                  ? 'bg-zinc-100 text-zinc-950 hover:bg-white' 
                  : 'bg-zinc-950 text-white hover:bg-zinc-800'
              }`}
            >
              Sign up
            </button>

            {/* Desktop-only auth buttons */}
            <button 
              onClick={() => router.push('/login')}
              className={`hidden md:block text-sm font-medium transition-colors px-4 py-2 rounded-full border ${
                dark 
                  ? 'border-zinc-800 text-zinc-300 hover:bg-zinc-900 hover:text-white' 
                  : 'border-[#EBEAE4] text-[#1C1917] hover:bg-[#FAF9F5]'
              }`}
            >
              Log in
            </button>

            <button 
              onClick={() => router.push('/register')}
              className={`hidden md:block text-sm font-medium px-5 py-2 rounded-full transition-transform hover:scale-105 active:scale-95 duration-200 ${
                dark 
                  ? 'bg-zinc-100 text-zinc-950 hover:bg-white' 
                  : 'bg-zinc-950 text-white hover:bg-zinc-800'
              }`}
            >
              Get started
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 md:py-12 space-y-16 md:space-y-32">
        
        {/* Hero Section */}
        <section aria-label="Hero" className="pt-8 space-y-12">
          
          <div className="text-center md:text-left md:flex md:items-center md:gap-8 lg:gap-12">
            {/* Copy side */}
            <div className="md:w-[45%] lg:w-[42%] space-y-6 shrink-0 text-center md:text-left">
              <p className={`text-xs font-bold uppercase tracking-widest ${dark ? 'text-blue-400' : 'text-blue-600'}`}>
                ATTENDANCE TRACKER · FOR STUDENTS
              </p>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-[1.25] tracking-tight font-serif min-h-[2.1em] md:min-h-[2.3em] flex flex-col justify-end">
                <span className="block min-h-[1.2em] overflow-hidden">
                  <span key={headlineStep} className="inline-block animate-headline-slide text-zinc-900 dark:text-white">
                    {headlinePhrases[headlineStep]}
                  </span>
                </span>
                <span className={`block italic font-serif ${dark ? 'text-blue-400' : 'text-blue-600'} mt-1`}>
                  DojoClass.
                </span>
              </h1>
              <p className={`text-sm leading-relaxed ${textMutedClass}`}>
                Mark attendance, track subject state, study with friends in encrypted sessions, and never guess how many classes you can afford to miss.
              </p>
              
              <div className="flex flex-col sm:flex-row items-center justify-center md:justify-start gap-4 pt-2">
                <button
                  onClick={() => router.push('/register')}
                  className={`w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3.5 rounded-full text-sm font-medium border transition-all duration-300 hover:scale-102 ${
                    dark 
                      ? 'bg-zinc-100 text-zinc-950 border-transparent hover:bg-white' 
                      : 'bg-zinc-950 text-white border-transparent hover:bg-zinc-800'
                  }`}
                >
                  <span>Get started free</span>
                  <ArrowRight size={15} />
                </button>
                <a
                  href="#features"
                  className={`w-full sm:w-auto text-center px-6 py-3.5 rounded-full text-sm font-medium border transition-all duration-300 ${
                    dark 
                      ? 'border-zinc-800 text-zinc-300 bg-transparent hover:bg-zinc-900 hover:text-white' 
                      : 'border-[#EBEAE4] text-[#1C1917] bg-transparent hover:bg-[#FAF9F5]'
                  }`}
                >
                  See how it works
                </a>
              </div>
            </div>

            {/* Mockup visual side */}
            <div className="md:w-[55%] lg:w-[58%] mt-12 md:mt-0 flex-1">
                           {/* Desktop Layout (Positioned around central student image) */}
              <div className="relative w-full max-w-[640px] h-[460px] mx-auto hidden md:block select-none">
                
                {/* SVG Connections */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 640 460" fill="none">
                  {dark && (
                    <defs>
                      <filter id="neon-glow" x="-20%" y="-20%" width="140%" height="140%">
                        <feGaussianBlur stdDeviation="3.5" result="blur" />
                        <feComponentTransfer in="blur" result="glow">
                          <feFuncA type="linear" slope="1.8" />
                        </feComponentTransfer>
                        <feMerge>
                          <feMergeNode in="glow" />
                          <feMergeNode in="SourceGraphic" />
                        </feMerge>
                      </filter>
                    </defs>
                  )}
                  {/* Top-Left Line */}
                  <path 
                    d="M 115 105 L 320 230" 
                    stroke={dark ? '#00FF66' : '#10B981'} 
                    strokeWidth={dark ? '2' : '1.5'} 
                    filter={dark ? 'url(#neon-glow)' : undefined} 
                    className="animate-connection-line" 
                  />
                  {/* Top-Right Line */}
                  <path 
                    d="M 525 105 L 320 230" 
                    stroke={dark ? '#CC00FF' : '#8B5CF6'} 
                    strokeWidth={dark ? '2' : '1.5'} 
                    filter={dark ? 'url(#neon-glow)' : undefined} 
                    className="animate-connection-line" 
                  />
                  {/* Bottom-Left Line */}
                  <path 
                    d="M 115 355 L 320 230" 
                    stroke={dark ? '#FF9F00' : '#F59E0B'} 
                    strokeWidth={dark ? '2' : '1.5'} 
                    filter={dark ? 'url(#neon-glow)' : undefined} 
                    className="animate-connection-line" 
                  />
                  {/* Bottom-Right Line */}
                  <path 
                    d="M 525 355 L 320 230" 
                    stroke={dark ? '#00FFFF' : '#14B8A6'} 
                    strokeWidth={dark ? '2' : '1.5'} 
                    filter={dark ? 'url(#neon-glow)' : undefined} 
                    className="animate-connection-line" 
                  />
                </svg>

                {/* Central Girl Image with Glow Backdrop */}
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 w-[240px] h-[240px] flex items-center justify-center overflow-visible">
                  <img 
                    src="/edited-photo.png" 
                    alt="Student learning" 
                    className="w-full h-full object-contain scale-[2.7] translate-y-7 select-none"
                  />
                  {/* Circle outlines backing her */}
                  <div className="absolute w-[170px] h-[170px] rounded-full bg-gradient-to-tr from-purple-200 to-blue-200 dark:from-purple-950/20 dark:to-blue-950/20 blur-xl -z-10" />
                  <div className="absolute w-[140px] h-[140px] rounded-full border border-purple-200/30 dark:border-purple-800/25 -z-10" />
                </div>

                {/* Midpoint Badges on SVG Lines */}
                <div className="absolute left-[33.98%] top-[36.41%] -translate-x-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full border bg-white dark:bg-zinc-900 shadow-sm flex items-center justify-center text-emerald-500 border-emerald-250 dark:border-emerald-800">
                  <div className="w-5 h-5 rounded-full bg-emerald-50 dark:bg-emerald-950 flex items-center justify-center">
                    <Check size={11} strokeWidth={3} />
                  </div>
                </div>

                <div className="absolute left-[66.02%] top-[36.41%] -translate-x-1/2 -translate-y-1/2 z-20 flex flex-col items-center gap-1.5 pointer-events-none">
                  <div className={`w-8 h-8 rounded-full border bg-white dark:bg-zinc-900 shadow-sm flex items-center justify-center transition-all duration-300 border-purple-250 dark:border-purple-800 pointer-events-auto cursor-pointer ${
                    isLocked ? 'text-purple-600 scale-105 shadow-sm' : 'text-purple-400 scale-95 opacity-80'
                  }`}>
                    <div className="w-5 h-5 rounded-full bg-purple-50 dark:bg-purple-950 flex items-center justify-center">
                      {isLocked ? (
                        <Lock size={12} className="animate-lock-click text-purple-600" />
                      ) : (
                        <Unlock size={12} className="animate-unlock-click text-purple-400" />
                      )}
                    </div>
                  </div>
                  <div className={`px-2 py-0.5 rounded-full border text-[7.5px] font-bold tracking-wider uppercase transition-colors duration-300 pointer-events-auto ${
                    dark 
                      ? 'bg-[#18181B] border-zinc-800 text-purple-400' 
                      : 'bg-white border-[#EBEAE4] text-purple-700 shadow-sm'
                  }`}>
                    Host Session
                  </div>
                </div>

                <div className="absolute left-[33.98%] top-[63.59%] -translate-x-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full border bg-white dark:bg-zinc-900 shadow-sm flex items-center justify-center text-amber-500 border-amber-250 dark:border-amber-800">
                  <div className="w-5 h-5 rounded-full bg-amber-50 dark:bg-amber-950 flex items-center justify-center">
                    <Users size={10} />
                  </div>
                </div>

                <div className="absolute left-[66.02%] top-[63.59%] -translate-x-1/2 -translate-y-1/2 z-20 flex flex-col items-center gap-1.5 pointer-events-none">
                  <div className="w-8 h-8 rounded-full border bg-white dark:bg-zinc-900 shadow-sm flex items-center justify-center text-teal-500 border-teal-250 dark:border-teal-800 pointer-events-auto">
                    <div className="w-5 h-5 rounded-full bg-teal-50 dark:bg-teal-950 flex items-center justify-center">
                      <BarChart3 size={10} />
                    </div>
                  </div>
                  <div className={`px-2 py-0.5 rounded-full border text-[7.5px] font-bold tracking-wider uppercase transition-colors duration-300 pointer-events-auto ${
                    dark 
                      ? 'bg-[#18181B] border-zinc-800 text-teal-400' 
                      : 'bg-white border-[#EBEAE4] text-teal-700 shadow-sm'
                  }`}>
                    Manage Everything
                  </div>
                </div>

                {/* Styled Mockup Cards surrounding central student */}
                {/* 1. Attendance Card */}
                <div className="absolute top-[2%] left-[2%] w-[210px]">
                  <div className={`p-3 rounded-2xl border transition-all duration-300 ${
                    dark ? 'bg-[#0f1b13]/85 border-emerald-500/30 shadow-lg shadow-emerald-950/20' : 'bg-[#E8F5E9]/40 border-[#C8E6C9]/85'
                  }`}>
                    <div className="flex items-center gap-2">
                      <div className="w-6.5 h-6.5 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0">
                        <Check size={13} strokeWidth={3} />
                      </div>
                      <div className="text-left">
                        <h4 className="text-[10px] font-bold">Attendance</h4>
                        <p className="text-[8px] text-zinc-450">Host-end encrypted end-to-end.</p>
                      </div>
                    </div>
                    
                    <div className={`mt-2 p-1.5 rounded-xl border ${
                      dark ? 'bg-zinc-900/95 border-zinc-800' : 'bg-white border-[#EBEAE4]'
                    } shadow-sm`}>
                      <div className="grid grid-cols-5 gap-0.5 text-center">
                        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].map((day, idx) => (
                          <div key={day} className="space-y-0.5">
                            <div className="text-[7.5px] font-medium text-zinc-400">{day}</div>
                            <div className="flex justify-center h-4 items-center">
                              {idx < 4 ? (
                                idx < attendanceStep ? (
                                  <div className="w-3 h-3 rounded-full bg-emerald-500 text-white flex items-center justify-center animate-check-pop">
                                    <Check size={8} strokeWidth={3} />
                                  </div>
                                ) : (
                                  <div className="w-3 h-3 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-400 flex items-center justify-center text-[7.5px]">
                                    -
                                  </div>
                                )
                              ) : (
                                <div className="w-3 h-3 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-400 flex items-center justify-center text-[7.5px]">
                                  -
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="text-[8px] font-bold text-emerald-500 mt-1 text-left">
                        95% this week
                      </div>
                    </div>
                  </div>
                </div>
                {/* 2. Study Session Card */}
                <div className="absolute top-[2%] right-[1%] w-[245px]">
                  <div className={`p-4 rounded-2xl border transition-all duration-300 ${
                    dark ? 'bg-[#150f1d]/85 border-purple-500/30 shadow-lg shadow-purple-950/20' : 'bg-[#F3E5F5]/40 border-[#E1BEE7]/85'
                  }`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full text-white flex items-center justify-center shrink-0 transition-all duration-300 ${
                        isLocked 
                          ? 'bg-purple-600 scale-110 shadow-md shadow-purple-900/40 ring-4 ring-purple-500/20' 
                          : 'bg-purple-400 ring-4 ring-purple-400/10'
                      }`}>
                        {isLocked ? (
                          <Lock size={18} className="animate-lock-click" />
                        ) : (
                          <Unlock size={18} className="animate-unlock-click" />
                        )}
                      </div>
                      <div className="text-left">
                        <h4 className="text-[11px] font-bold">Study Session</h4>
                        <p className="text-[9px] text-zinc-400">Host-end encrypted end-to-end.</p>
                      </div>
                    </div>
 
                    <div className={`mt-3 p-2 rounded-xl border flex items-center justify-between ${
                      dark ? 'bg-zinc-900/95 border-zinc-800' : 'bg-white border-[#EBEAE4]'
                    } shadow-sm`}>
                      <div className="space-y-0.5 text-left">
                        <div className="text-[10.5px] font-bold">Physics – Motion</div>
                        <div className="text-[8.5px] text-emerald-500 flex items-center gap-0.5">
                          <span className="w-1 h-1 rounded-full bg-emerald-500 inline-block animate-pulse" />
                          <span>Live now · 8 joined</span>
                        </div>
                      </div>
                      <button className="bg-[#4f46e5] hover:bg-[#4338ca] active:scale-95 text-white text-[8.5px] font-bold px-3 py-1 rounded-md transition-all duration-200 animate-vibrate shadow-sm hover:shadow-indigo-500/20">
                        Join
                      </button>
                    </div>
                  </div>
                </div>

                {/* 3. Study Buddy Card */}
                <div className="absolute bottom-[0.5%] left-[0.5%] w-[215px]">
                  <div className={`p-3 rounded-2xl border transition-all duration-300 ${
                    dark ? 'bg-[#1a120b]/85 border-amber-500/30 shadow-lg shadow-amber-950/20' : 'bg-[#FFF3E0]/40 border-[#FFE0B2]/85'
                  }`}>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-sm">
                        <Users size={14} />
                      </div>
                      <div className="text-left">
                        <h4 className="text-[11px] font-bold">Study Buddy</h4>
                        <p className="text-[9px] text-zinc-400">Find a buddy and stay consistent.</p>
                      </div>
                    </div>
 
                    <div className={`mt-2.5 p-1.5 pb-11 rounded-xl border ${
                      dark ? 'bg-zinc-900/95 border-zinc-800' : 'bg-white border-[#EBEAE4]'
                    } shadow-sm`}>
                      <div className="flex items-center justify-between w-full">
                        <div className="flex flex-col items-center animate-float-you relative">
                          {chatStep % 2 === 0 && (
                            <div className="absolute top-[33px] left-1/2 -translate-x-1/2 bg-[#ef4444] text-white text-[8.5px] font-bold px-2 py-0.75 rounded-md rounded-bl-none shadow-md shadow-rose-900/10 animate-check-pop whitespace-nowrap z-30">
                              {chatMessages[chatStep].text}
                            </div>
                          )}
                          <div className="w-5 h-5 rounded-full shadow-sm border border-rose-350/20 overflow-hidden">
                            <svg className="w-full h-full" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <defs>
                                <linearGradient id="you-grad-desk" x1="0%" y1="0%" x2="100%" y2="100%">
                                  <stop offset="0%" stopColor="#FF8A80" />
                                  <stop offset="100%" stopColor="#FF5252" />
                                </linearGradient>
                              </defs>
                              <circle cx="16" cy="16" r="15" fill="url(#you-grad-desk)" />
                              <path d="M16 18c-4.4 0-8 2.2-8 5v1h16v-1c0-2.8-3.6-5-8-5z" fill="#FFF" />
                              <circle cx="16" cy="12" r="4.5" fill="#FFF" />
                            </svg>
                          </div>
                          <span className="text-[8px] font-semibold text-zinc-455 mt-0.5">You</span>
                        </div>
                        
                        <div className="flex-1 px-2 flex flex-col items-center justify-center relative">
                          <div className="w-full border-t border-dashed border-amber-300 dark:border-amber-700/60" />
                          {/* Message Packet Dot */}
                          <div className="animate-message-exchange absolute -top-1.5 flex items-center justify-center">
                            <div className="bg-amber-500 dark:bg-amber-400 w-3.5 h-3.5 rounded-full flex items-center justify-center shadow-md shadow-amber-500/35 border border-white dark:border-zinc-900">
                              <Mail size={7.5} className="text-white shrink-0" />
                            </div>
                          </div>
                        </div>
 
                        <div className="flex flex-col items-center animate-float-ananya relative">
                          {chatStep % 2 === 1 && (
                            <div className="absolute top-[33px] left-1/2 -translate-x-1/2 bg-[#0d9488] text-white text-[8.5px] font-bold px-2 py-0.75 rounded-md rounded-br-none shadow-md shadow-teal-900/10 animate-check-pop whitespace-nowrap z-30">
                              {chatMessages[chatStep].text}
                            </div>
                          )}
                          <div className="w-5 h-5 rounded-full shadow-sm border border-teal-350/20 overflow-hidden">
                            <svg className="w-full h-full" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <defs>
                                <linearGradient id="ananya-grad-desk" x1="0%" y1="0%" x2="100%" y2="100%">
                                  <stop offset="0%" stopColor="#00E5FF" />
                                  <stop offset="100%" stopColor="#00A5FF" />
                                </linearGradient>
                              </defs>
                              <circle cx="16" cy="16" r="15" fill="url(#ananya-grad-desk)" />
                              <path d="M16 18c-4.4 0-8 2.2-8 5v1h16v-1c0-2.8-3.6-5-8-5z" fill="#FFF" />
                              <circle cx="16" cy="11.5" r="4.5" fill="#FFF" />
                              <path d="M11.5 11c0-2.5 2-4.5 4.5-4.5s4.5 2 4.5 4.5c0 1-.5 1.8-1.2 2.3-.5-.7-1.3-1.3-2.3-1.5-.5-.1-1-.1-1.5 0-1 .2-1.8.8-2.3 1.5-.7-.5-1.2-1.3-1.2-2.3z" fill="#FFF" opacity="0.9" />
                            </svg>
                          </div>
                          <span className="text-[8px] font-semibold text-zinc-455 mt-0.5">Ananya</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 4. Progress Card */}
                <div className="absolute bottom-[2%] right-[2%] w-[210px]">
                  <div className={`p-3 rounded-2xl border transition-all duration-300 ${
                    dark ? 'bg-[#0b1817]/85 border-teal-500/30 shadow-lg shadow-teal-950/20' : 'bg-[#E0F2F1]/40 border-[#B2DFDB]/85'
                  }`}>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-teal-500 text-white flex items-center justify-center shrink-0 shadow-sm ring-4 ring-teal-500/20">
                        <BarChart3 size={18} />
                      </div>
                      <div className="text-left">
                        <h4 className="text-[11px] font-bold">Progress</h4>
                        <p className="text-[9px] text-zinc-400">Track your learning every day.</p>
                      </div>
                    </div>

                    <div className={`mt-2 p-1.5 rounded-xl border ${
                      dark ? 'bg-zinc-900/95 border-zinc-800' : 'bg-white border-[#EBEAE4]'
                    } shadow-sm`}>
                      <div className="grid grid-cols-3 gap-0.5 text-center divide-x divide-zinc-150 dark:divide-zinc-800">
                        <div>
                          <div className="text-[9.5px] font-bold transition-all duration-500 tabular-nums">{sessionsCount}</div>
                          <div className="text-[6.5px] text-zinc-450 uppercase tracking-tight">Sessions</div>
                        </div>
                        <div>
                          <div className="text-[9.5px] font-bold transition-all duration-500 tabular-nums">{hoursCount}h</div>
                          <div className="text-[6.5px] text-zinc-450 uppercase tracking-tight">Hours</div>
                        </div>
                        <div>
                          <div className="text-[9.5px] font-bold text-emerald-500 transition-all duration-500 tabular-nums">{attendancePercent}%</div>
                          <div className="text-[6.5px] text-zinc-450 uppercase tracking-tight">Att.</div>
                        </div>
                      </div>
                      {/* Mini animated progress bar inside Progress Card */}
                      <div className="mt-2 pt-1.5 border-t border-zinc-100 dark:border-zinc-800">
                        <div className="flex justify-between items-center text-[7px] text-zinc-400 font-semibold mb-1">
                          <span>Syllabus Target</span>
                          <span className="text-emerald-500 font-bold">{attendancePercent}%</span>
                        </div>
                        <div className="h-1 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden w-full">
                          <div 
                            className="h-full bg-gradient-to-r from-teal-400 to-emerald-500 rounded-full transition-all duration-700 ease-out"
                            style={{ width: `${attendancePercent}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

              </div>

              {/* Mobile Layout (Stacked list/grid below student image) */}
              <div className="md:hidden space-y-6">
                {/* Central Circle */}
                <div className="flex justify-center">
                  <div className="relative w-[180px] h-[180px] flex items-center justify-center overflow-visible">
                    {/* Circle background */}
                    <div className="absolute w-[140px] h-[140px] rounded-full bg-gradient-to-tr from-purple-150 to-blue-150 dark:from-purple-950/20 dark:to-blue-950/20 border border-purple-255/25 shadow-inner" />
                    {/* Popped out girl */}
                    <img 
                      src="/edited-photo.png" 
                      alt="Student learning" 
                      className="w-[200px] h-[200px] object-contain scale-[1.8] translate-y-4 select-none z-10"
                    />
                  </div>
                </div>

                {/* 2x2 Grid of Styled Cards on Mobile */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
                  {/* Attendance Card */}
                  <div className={`p-4 rounded-xl border ${
                    dark ? 'bg-[#0f1b13]/85 border-emerald-500/30 shadow-lg shadow-emerald-950/15' : 'bg-[#E8F5E9]/40 border-[#C8E6C9]/85'
                  }`}>
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0">
                        <Check size={14} strokeWidth={3} />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold">Attendance</h4>
                        <p className="text-[9px] text-zinc-400">Host-end encrypted end-to-end.</p>
                      </div>
                    </div>
                    
                    <div className={`mt-2.5 p-2 rounded-xl border ${
                      dark ? 'bg-zinc-900/95 border-zinc-800' : 'bg-white border-[#EBEAE4]'
                    } shadow-sm`}>
                      <div className="grid grid-cols-5 gap-1 text-center">
                        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].map((day, idx) => (
                          <div key={day} className="space-y-0.5">
                            <div className="text-[8px] font-medium text-zinc-450">{day}</div>
                            <div className="flex justify-center h-4 items-center">
                              {idx < 4 ? (
                                idx < attendanceStep ? (
                                  <div className="w-3.5 h-3.5 rounded-full bg-emerald-500 text-white flex items-center justify-center animate-check-pop">
                                    <Check size={8} strokeWidth={3} />
                                  </div>
                                ) : (
                                  <div className="w-3.5 h-3.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-400 flex items-center justify-center text-[8px]">-</div>
                                )
                              ) : (
                                <div className="w-3.5 h-3.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-400 flex items-center justify-center text-[8px]">-</div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="text-[9px] font-bold text-emerald-500 mt-2">
                        95% this week
                      </div>
                    </div>
                  </div>
                  {/* Study Session Card */}
                  <div className={`p-4 rounded-xl border ${
                    dark ? 'bg-[#150f1d]/85 border-purple-500/30 shadow-lg shadow-purple-950/15' : 'bg-[#F3E5F5]/40 border-[#E1BEE7]/85'
                  }`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full text-white flex items-center justify-center shrink-0 transition-all duration-300 ${
                        isLocked 
                          ? 'bg-purple-600 scale-110 shadow-md shadow-purple-900/40 ring-4 ring-purple-500/20' 
                          : 'bg-purple-400 ring-4 ring-purple-400/10'
                      }`}>
                        {isLocked ? (
                          <Lock size={18} className="animate-lock-click" />
                        ) : (
                          <Unlock size={18} className="animate-unlock-click" />
                        )}
                      </div>
                      <div>
                        <h4 className="text-[13px] font-bold">Study Session</h4>
                        <p className="text-[10px] text-zinc-400">Host-end encrypted end-to-end.</p>
                      </div>
                    </div>
 
                    <div className={`mt-2.5 p-2 rounded-xl border flex items-center justify-between ${
                      dark ? 'bg-zinc-900/95 border-zinc-800' : 'bg-white border-[#EBEAE4]'
                    } shadow-sm`}>
                      <div className="space-y-0.5">
                        <div className="text-[11px] font-bold">Physics – Motion</div>
                        <div className="text-[9px] text-emerald-500 flex items-center gap-0.5">
                          <span className="w-1 h-1 rounded-full bg-emerald-500 inline-block animate-pulse" />
                          <span>Live now · 8 joined</span>
                        </div>
                      </div>
                      <button className="bg-[#4f46e5] hover:bg-[#4338ca] active:scale-95 text-white text-[9.5px] font-bold px-3 py-1.5 rounded-md transition-all duration-250 animate-vibrate shadow-sm">
                        Join
                      </button>
                    </div>
                  </div>

                  {/* Study Buddy Card */}
                  <div className={`p-4 rounded-xl border ${
                    dark ? 'bg-[#1a120b]/85 border-amber-500/30 shadow-lg shadow-amber-950/15' : 'bg-[#FFF3E0]/40 border-[#FFE0B2]/85'
                  }`}>
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-amber-500 text-white flex items-center justify-center shrink-0">
                        <Users size={13} />
                      </div>
                      <div>
                        <h4 className="text-[13px] font-bold">Study Buddy</h4>
                        <p className="text-[10px] text-zinc-400">Find a buddy and stay consistent.</p>
                      </div>
                    </div>
 
                    <div className={`mt-2.5 p-2 pb-6 rounded-xl border ${
                      dark ? 'bg-zinc-900/95 border-zinc-800' : 'bg-white border-[#EBEAE4]'
                    } shadow-sm`}>
                      <div className="flex items-center justify-between w-full">
                        <div className="flex flex-col items-center animate-float-you relative">
                          {chatStep % 2 === 0 && (
                            <div className="absolute top-[28px] left-1/2 -translate-x-1/2 bg-[#ef4444] text-white text-[8px] font-bold px-1.5 py-0.5 rounded-md rounded-bl-none shadow-md shadow-rose-900/10 animate-check-pop whitespace-nowrap z-30">
                              {chatMessages[chatStep].text}
                            </div>
                          )}
                          <div className="w-4 h-4 rounded-full shadow-sm border border-rose-350/20 overflow-hidden">
                            <svg className="w-full h-full" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <defs>
                                <linearGradient id="you-grad-mob" x1="0%" y1="0%" x2="100%" y2="100%">
                                  <stop offset="0%" stopColor="#FF8A80" />
                                  <stop offset="100%" stopColor="#FF5252" />
                                </linearGradient>
                              </defs>
                              <circle cx="16" cy="16" r="15" fill="url(#you-grad-mob)" />
                              <path d="M16 18c-4.4 0-8 2.2-8 5v1h16v-1c0-2.8-3.6-5-8-5z" fill="#FFF" />
                              <circle cx="16" cy="12" r="4.5" fill="#FFF" />
                            </svg>
                          </div>
                          <span className="text-[9px] font-semibold text-zinc-450 mt-0.5">You</span>
                        </div>
                        
                        <div className="flex-1 px-2 flex flex-col items-center justify-center relative">
                          <div className="w-full border-t border-dashed border-amber-300 dark:border-amber-700/60" />
                          {/* Animated sliding message packet */}
                          <div className="animate-message-exchange absolute -top-1.5 flex items-center justify-center">
                            <div className="bg-amber-500 dark:bg-amber-400 w-3.5 h-3.5 rounded-full flex items-center justify-center shadow-md shadow-amber-500/35 border border-white dark:border-zinc-900">
                              <Mail size={8} className="text-white shrink-0" />
                            </div>
                          </div>
                        </div>
 
                        <div className="flex flex-col items-center animate-float-ananya relative">
                          {chatStep % 2 === 1 && (
                            <div className="absolute top-[33px] left-1/2 -translate-x-1/2 bg-[#0d9488] text-white text-[9.5px] font-bold px-2 py-0.75 rounded-md rounded-br-none shadow-md shadow-teal-900/10 animate-check-pop whitespace-nowrap z-30">
                              {chatMessages[chatStep].text}
                            </div>
                          )}
                          <div className="w-4 h-4 rounded-full shadow-sm border border-teal-355/20 overflow-hidden">
                            <svg className="w-full h-full" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <defs>
                                <linearGradient id="ananya-grad-mob" x1="0%" y1="0%" x2="100%" y2="100%">
                                  <stop offset="0%" stopColor="#00E5FF" />
                                  <stop offset="100%" stopColor="#00A5FF" />
                                </linearGradient>
                              </defs>
                              <circle cx="16" cy="16" r="15" fill="url(#ananya-grad-mob)" />
                              <path d="M16 18c-4.4 0-8 2.2-8 5v1h16v-1c0-2.8-3.6-5-8-5z" fill="#FFF" />
                              <circle cx="16" cy="11.5" r="4.5" fill="#FFF" />
                              <path d="M11.5 11c0-2.5 2-4.5 4.5-4.5s4.5 2 4.5 4.5c0 1-.5 1.8-1.2 2.3-.5-.7-1.3-1.3-2.3-1.5-.5-.1-1-.1-1.5 0-1 .2-1.8.8-2.3 1.5-.7-.5-1.2-1.3-1.2-2.3z" fill="#FFF" opacity="0.9" />
                            </svg>
                          </div>
                          <span className="text-[9px] font-semibold text-zinc-455 mt-0.5">Ananya</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Progress Card */}
                  <div className={`p-4 rounded-xl border ${
                    dark ? 'bg-[#0b1817]/85 border-teal-500/30 shadow-lg shadow-teal-950/15' : 'bg-[#E0F2F1]/40 border-[#B2DFDB]/85'
                  }`}>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-teal-500 text-white flex items-center justify-center shrink-0 shadow-sm ring-4 ring-teal-500/20">
                        <BarChart3 size={18} />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold">Progress</h4>
                        <p className="text-[9px] text-zinc-400">Track your learning every day.</p>
                      </div>
                    </div>

                    <div className={`mt-2.5 p-2 rounded-xl border ${
                      dark ? 'bg-zinc-900/95 border-zinc-800' : 'bg-white border-[#EBEAE4]'
                    } shadow-sm`}>
                      <div className="grid grid-cols-3 gap-1 text-center divide-x divide-inherit">
                        <div>
                          <div className="text-[10px] font-bold transition-all duration-500 tabular-nums">{sessionsCount}</div>
                          <div className="text-[7px] text-zinc-450">Sessions</div>
                        </div>
                        <div>
                          <div className="text-[10px] font-bold transition-all duration-500 tabular-nums">{hoursCount}h</div>
                          <div className="text-[7px] text-zinc-450">Hours</div>
                        </div>
                        <div>
                          <div className="text-[10px] font-bold text-emerald-500 transition-all duration-500 tabular-nums">{attendancePercent}%</div>
                          <div className="text-[7px] text-zinc-450">Att.</div>
                        </div>
                      </div>
                      {/* Mini animated progress bar inside Progress Card */}
                      <div className="mt-2.5 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                        <div className="flex justify-between items-center text-[7.5px] text-zinc-400 font-semibold mb-1">
                          <span>Syllabus Target</span>
                          <span className="text-emerald-500 font-bold">{attendancePercent}%</span>
                        </div>
                        <div className="h-1 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden w-full">
                          <div 
                            className="h-full bg-gradient-to-r from-teal-400 to-emerald-500 rounded-full transition-all duration-700 ease-out"
                            style={{ width: `${attendancePercent}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </section>

        {/* ── App Summary / About Section ── */}
        <section aria-label="About DojoClass" className="py-2">
          <div className="text-center mb-8 space-y-2">
            <span className={`text-xs font-bold uppercase tracking-widest ${dark ? 'text-zinc-500' : 'text-[#6A635B]'}`}>
              WHAT IS DOJOCLASS?
            </span>
            <h2 className="text-2xl md:text-3xl font-bold font-serif tracking-tight">
              Everything you need to stay on track.
            </h2>
            <p className={`text-sm leading-relaxed max-w-md mx-auto ${textMutedClass}`}>
              DojoClass is a free, all-in-one academic companion built for college students — track attendance, plan your week, and study with friends.
            </p>
          </div>

          {/* Cards with SVG curve connector */}
          <div className="relative">
            {/* Desktop: horizontal wavy dashed path connecting 4 cards */}
            <svg
              className="absolute inset-0 w-full h-full pointer-events-none z-0 hidden md:block"
              viewBox="0 0 1000 160"
              preserveAspectRatio="none"
              fill="none"
            >
              <path
                d="M 120 80 C 160 35, 205 125, 250 80 S 340 35, 380 80 S 470 125, 510 80 S 595 35, 630 80 S 720 125, 760 80 S 845 35, 880 80"
                stroke={dark ? '#818cf8' : '#d1d5db'}
                strokeWidth="1.8"
                strokeDasharray="7 5"
                strokeLinecap="round"
                style={dark ? { filter: 'drop-shadow(0 0 7px rgba(129,140,248,0.85))' } : {}}
              />
            </svg>
            {/* Mobile: zigzag dashed path connecting 2×2 grid */}
            <svg
              className="absolute inset-0 w-full h-full pointer-events-none z-0 md:hidden"
              viewBox="0 0 200 200"
              preserveAspectRatio="none"
              fill="none"
            >
              <path
                d="M 50 48 C 70 20, 130 20, 150 48 C 170 75, 170 90, 150 115 C 130 140, 70 140, 50 115 C 30 90, 30 140, 50 165 C 70 190, 130 190, 150 165"
                stroke={dark ? '#818cf8' : '#d1d5db'}
                strokeWidth="1.8"
                strokeDasharray="6 4"
                strokeLinecap="round"
                style={dark ? { filter: 'drop-shadow(0 0 7px rgba(129,140,248,0.85))' } : {}}
              />
            </svg>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 relative z-10">
              {[
                { icon: <UserCheck size={18} />, color: 'emerald', label: 'Attendance Tracker', desc: 'Mark & track per-subject attendance in real time. Know exactly how many classes you can skip.' },
                { icon: <Calendar size={18} />, color: 'blue', label: 'Weekly Scheduler', desc: 'Set up your timetable once. DojoClass auto-predicts attendance for every future class.' },
                { icon: <Users size={18} />, color: 'amber', label: 'Study Buddies', desc: 'Find accountability partners and build study streaks together with your classmates.' },
                { icon: <Sparkles size={18} />, color: 'purple', label: 'Encrypted Rooms', desc: 'Host private, encrypted study sessions. Invite friends and study live, together.' },
              ].map(({ icon, color, label, desc }) => (
                <div
                  key={label}
                  className={`p-4 rounded-2xl border transition-all duration-300 hover:-translate-y-0.5 ${
                    dark 
                      ? 'bg-[#18181B] border-zinc-800 hover:shadow-[0_0_18px_rgba(129,140,248,0.15)]' 
                      : 'bg-[#FAF9F5] border-[#EBEAE4] hover:shadow-md'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center mb-3 ${
                    color === 'emerald' ? 'bg-emerald-500/10 text-emerald-500' :
                    color === 'blue'    ? 'bg-blue-500/10 text-blue-500' :
                    color === 'amber'   ? 'bg-amber-500/10 text-amber-500' :
                                         'bg-purple-500/10 text-purple-500'
                  }`}>{icon}</div>
                  <h3 className="text-[12px] md:text-[13px] font-bold leading-snug mb-1">{label}</h3>
                  <p className={`text-[10px] md:text-[11px] leading-relaxed ${textMutedClass}`}>{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Feature Sections */}
        <div id="features" className="space-y-20 md:space-y-36">

          {/* 01 · Attendance Marking */}
          <section className="grid md:grid-cols-12 gap-8 items-center">
            <div className="md:col-span-5 space-y-4">
              <span className={`text-xs font-bold uppercase tracking-widest ${dark ? 'text-zinc-500' : 'text-[#6A635B]'}`}>
                01 · ATTENDANCE MARKING
              </span>
              <h2 className="text-3xl md:text-4xl font-bold font-serif tracking-tight">
                One tap per class.
              </h2>
              <p className={`text-sm md:text-base leading-relaxed ${textMutedClass}`}>
                Mark present, absent, or cancelled instantly. DojoClass recalculates your standing in real-time — subject by subject.
              </p>
            </div>

            <div className="md:col-span-7">
              <div className={`p-6 md:p-8 rounded-2xl border ${cardBgClass} shadow-sm space-y-6 transition-all duration-300`}>
                <div className="space-y-5">
                  {/* Maths row */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center text-xs font-semibold">
                      <span className="flex items-center gap-1.5">Maths</span>
                      <div className="flex items-center gap-2">
                        <span className="text-zinc-400">91%</span>
                        <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                          dark ? 'bg-emerald-950/80 text-emerald-400' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        }`}>
                          Safe
                        </span>
                      </div>
                    </div>
                    <div className={`h-2.5 rounded-full w-full overflow-hidden ${dark ? 'bg-zinc-800' : 'bg-[#EBEAE4]'}`}>
                      <div className="h-full bg-emerald-500 rounded-full w-[91%]" />
                    </div>
                  </div>

                  {/* Physics row */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center text-xs font-semibold">
                      <span>Physics</span>
                      <div className="flex items-center gap-2">
                        <span className="text-zinc-400">82%</span>
                        <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                          dark ? 'bg-emerald-950/80 text-emerald-400' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        }`}>
                          Safe
                        </span>
                      </div>
                    </div>
                    <div className={`h-2.5 rounded-full w-full overflow-hidden ${dark ? 'bg-zinc-800' : 'bg-[#EBEAE4]'}`}>
                      <div className="h-full bg-emerald-500 rounded-full w-[82%]" />
                    </div>
                  </div>

                  {/* Chemistry row */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center text-xs font-semibold">
                      <span>Chemistry</span>
                      <div className="flex items-center gap-2">
                        <span className="text-zinc-400">64%</span>
                        <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                          dark ? 'bg-amber-950/80 text-amber-400' : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}>
                          Ahead 1
                        </span>
                      </div>
                    </div>
                    <div className={`h-2.5 rounded-full w-full overflow-hidden ${dark ? 'bg-zinc-800' : 'bg-[#EBEAE4]'}`}>
                      <div className="h-full bg-amber-500 rounded-full w-[64%]" />
                    </div>
                  </div>

                  {/* English row */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center text-xs font-semibold">
                      <span>English</span>
                      <div className="flex items-center gap-2">
                        <span className="text-zinc-400">49%</span>
                        <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                          dark ? 'bg-rose-950/80 text-rose-450' : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}>
                          Alert
                        </span>
                      </div>
                    </div>
                    <div className={`h-2.5 rounded-full w-full overflow-hidden ${dark ? 'bg-zinc-800' : 'bg-[#EBEAE4]'}`}>
                      <div className="h-full bg-rose-500 rounded-full w-[49%]" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* 02 · Weekly Scheduler */}
          <section className="grid md:grid-cols-12 gap-8 items-center">
            <div className="md:col-span-5 md:order-2 space-y-4">
              <span className={`text-xs font-bold uppercase tracking-widest ${dark ? 'text-zinc-500' : 'text-[#6A635B]'}`}>
                02 · WEEKLY SCHEDULER
              </span>
              <h2 className="text-3xl md:text-4xl font-bold font-serif tracking-tight">
                Your timetable, always with you.
              </h2>
              <p className={`text-sm md:text-base leading-relaxed ${textMutedClass}`}>
                Set up recurring classes for each day. DojoClass uses your schedule to auto-suggest what to work and predict future attendance.
              </p>
            </div>

            <div className="md:col-span-7 md:order-1">
              <div className={`p-6 rounded-2xl border ${cardBgClass} shadow-sm overflow-hidden transition-all duration-300`}>
                <div className="divide-y divide-inherit">
                  {/* Monday */}
                  <div className="py-3.5 flex items-center gap-4">
                    <span className="text-xs font-bold w-8 uppercase text-zinc-400">Mon</span>
                    <div className="flex gap-2 flex-wrap">
                      <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-blue-100 dark:bg-blue-950/80 text-blue-800 dark:text-blue-300">
                        Maths
                      </span>
                      <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-purple-100 dark:bg-purple-950/80 text-purple-800 dark:text-purple-300">
                        Physics
                      </span>
                      <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300">
                        English
                      </span>
                    </div>
                  </div>

                  {/* Tuesday */}
                  <div className="py-3.5 flex items-center gap-4">
                    <span className="text-xs font-bold w-8 uppercase text-zinc-400">Tue</span>
                    <div className="flex gap-2 flex-wrap">
                      <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300">
                        Chemistry
                      </span>
                      <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-blue-100 dark:bg-blue-950/80 text-blue-800 dark:text-blue-300">
                        Maths
                      </span>
                    </div>
                  </div>

                  {/* Wednesday */}
                  <div className="py-3.5 flex items-center gap-4">
                    <span className="text-xs font-bold w-8 uppercase text-zinc-400">Wed</span>
                    <span className="text-xs italic text-zinc-400">No classes scheduled</span>
                  </div>

                  {/* Thursday */}
                  <div className="py-3.5 flex items-center gap-4">
                    <span className="text-xs font-bold w-8 uppercase text-zinc-400">Thu</span>
                    <div className="flex gap-2 flex-wrap">
                      <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-purple-100 dark:bg-purple-950/80 text-purple-800 dark:text-purple-300">
                        Physics
                      </span>
                      <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300">
                        English
                      </span>
                      <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300">
                        Chemistry
                      </span>
                    </div>
                  </div>

                  {/* Friday */}
                  <div className="py-3.5 flex items-center gap-4">
                    <span className="text-xs font-bold w-8 uppercase text-zinc-400">Fri</span>
                    <div className="flex gap-2 flex-wrap">
                      <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-blue-100 dark:bg-blue-950/80 text-blue-800 dark:text-blue-300">
                        Maths
                      </span>
                      <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-purple-100 dark:bg-purple-950/80 text-purple-800 dark:text-purple-300">
                        Physics
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* 03 · Study Sessions */}
          <section className="grid md:grid-cols-12 gap-8 items-center">
            <div className="md:col-span-5 space-y-4">
              <span className={`text-xs font-bold uppercase tracking-widest ${dark ? 'text-zinc-500' : 'text-[#6A635B]'}`}>
                03 · STUDY SESSIONS
              </span>
              <h2 className="text-3xl md:text-4xl font-bold font-serif tracking-tight">
                Study together, privately.
              </h2>
              <p className={`text-sm md:text-base leading-relaxed ${textMutedClass}`}>
                Host encrypted study rooms for your friend group. Every message is end-to-end encrypted — only people in the session can read it.
              </p>
            </div>

            <div className="md:col-span-7 space-y-4">
              {/* Physics Session card */}
              <div className={`p-5 rounded-2xl border transition-all duration-300 space-y-4 ${cardBgClass} hover:shadow-md`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3.5">
                    {/* Avatars overlay */}
                    <div className="flex -space-x-2.5 select-none items-center">
                      {getStudentAvatar('AM', 'w-9 h-9')}
                      {getStudentAvatar('RM', 'w-9 h-9')}
                      {getStudentAvatar('SV', 'w-9 h-9')}
                      <div className="w-9 h-9 rounded-full border-2 border-white dark:border-zinc-900 bg-stone-100 dark:bg-stone-800 flex items-center justify-center text-[10px] font-bold text-zinc-500 dark:text-zinc-300 shadow-sm shrink-0">
                        +2
                      </div>
                    </div>
                    <div>
                      <h3 className="text-xs font-bold flex items-center gap-1.5 text-zinc-900 dark:text-white">
                        <span>Physics midterm prep</span>
                        <Lock size={10.5} className="text-purple-500 dark:text-purple-400" />
                      </h3>
                      <p className="text-[10px] text-zinc-400 flex items-center gap-1">
                        <Users size={11} className="text-blue-500" /> 
                        <span className="font-medium">5 members · Active now</span>
                      </p>
                    </div>
                  </div>
                  
                  <button className={`text-xs px-5 py-2 rounded-full font-bold transition-all duration-300 hover:scale-105 active:scale-95 flex items-center gap-1 border shadow-sm hover:shadow-indigo-500/10 ${
                    dark
                      ? 'bg-indigo-600 text-white border-transparent hover:bg-indigo-500 shadow-indigo-900/20' 
                      : 'bg-zinc-950 text-white border-transparent hover:bg-zinc-800'
                  } animate-vibrate`}>
                    Join
                  </button>
                </div>

                {/* Interactive Live Chat Ticker */}
                <div className={`p-2.5 rounded-xl border transition-all duration-300 ${
                  dark ? 'bg-zinc-900/40 border-zinc-800/80' : 'bg-[#FAF9F5]/70 border-[#EBEAE4]/80'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[9px] uppercase tracking-wider text-zinc-450 dark:text-zinc-500 font-bold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping inline-block" />
                      <span className="text-emerald-600 dark:text-emerald-400">Live Session Discussion</span>
                    </span>
                    <span className="text-[7.5px] uppercase tracking-widest font-extrabold text-purple-500 bg-purple-500/10 px-1.5 py-0.5 rounded-md border border-purple-500/20">
                      E2E Encrypted
                    </span>
                  </div>
                  
                  {/* Animated Chat Window */}
                  <div className="h-[38px] relative overflow-hidden rounded-lg bg-white/40 dark:bg-zinc-950/40 border border-zinc-100 dark:border-zinc-900/60 p-2">
                    {sessionChats.map((msg, idx) => (
                      <div 
                        key={idx}
                        className={`absolute inset-x-2 transition-all duration-700 flex items-center gap-2.5 ${
                          idx === sessionChatStep 
                            ? 'opacity-100 translate-y-0 scale-100 pointer-events-auto' 
                            : 'opacity-0 translate-y-4 scale-95 pointer-events-none'
                        }`}
                      >
                        {getStudentAvatar(msg.avatar, 'w-7 h-7')}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline justify-between">
                            <span className="text-[9px] font-bold text-zinc-900 dark:text-zinc-100">{msg.sender}</span>
                            <span className="text-[7px] text-zinc-400">Just now</span>
                          </div>
                          <p className="text-[9.5px] text-zinc-650 dark:text-zinc-350 truncate">{msg.text}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Chem Session card */}
              <div className={`p-5 rounded-2xl border transition-all duration-300 opacity-80 hover:opacity-100 ${cardBgClass} hover:shadow-md`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3.5">
                    {/* Avatars overlay */}
                    <div className="flex -space-x-2.5 select-none items-center">
                      {getStudentAvatar('RM', 'w-9 h-9')}
                      {getStudentAvatar('SV', 'w-9 h-9')}
                    </div>
                    <div>
                      <h3 className="text-xs font-semibold flex items-center gap-1.5 text-zinc-500 dark:text-zinc-400">
                        <span>Chem doubts · Chapter 7</span>
                      </h3>
                      <p className="text-[10px] text-zinc-400 flex items-center gap-1">
                        <Clock size={11} className="text-zinc-400" />
                        <span>2 members · Ended 15 mins ago</span>
                      </p>
                    </div>
                  </div>
                  <span className="text-[9px] font-bold text-zinc-400 bg-zinc-100 dark:bg-zinc-900 px-3 py-1 rounded-full border border-inherit uppercase tracking-wider">
                    Ended
                  </span>
                </div>
              </div>
            </div>
          </section>

          {/* 04 · Study Buddy */}
          <section className="space-y-8">
            <div className="max-w-xl space-y-4">
              <span className={`text-xs font-bold uppercase tracking-widest ${dark ? 'text-zinc-500' : 'text-[#6A635B]'}`}>
                04 · STUDY BUDDY
              </span>
              <h2 className="text-3xl md:text-4xl font-bold font-serif tracking-tight">
                Keep each other accountable.
              </h2>
              <p className={`text-sm md:text-base leading-relaxed ${textMutedClass}`}>
                Link with a friend as study buddies. See each other's attendance percentage and streak — healthy competition keeps you both on track.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {/* Buddy 1 */}
              <div className={`p-6 rounded-2xl border ${cardBgClass} flex flex-col items-center text-center space-y-3 transition-all duration-300 hover:shadow-md`}>
                {getStudentAvatar('AM', 'w-12 h-12')}
                <div>
                  <h3 className="text-sm font-bold">Aniket M.</h3>
                  <p className="text-xs text-zinc-400">84% overall</p>
                </div>
                <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full flex items-center gap-1 bg-amber-50 dark:bg-amber-950/80 text-amber-700 dark:text-amber-400 border border-amber-250`}>
                  <Flame size={12} className="fill-current" /> 10 Day Streak
                </span>
              </div>

              {/* Buddy 2 */}
              <div className={`p-6 rounded-2xl border ${cardBgClass} flex flex-col items-center text-center space-y-3 transition-all duration-300 hover:shadow-md`}>
                {getStudentAvatar('RM', 'w-12 h-12')}
                <div>
                  <h3 className="text-sm font-bold">Rohan S.</h3>
                  <p className="text-xs text-zinc-400">79% overall</p>
                </div>
                <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full flex items-center gap-1 bg-amber-50 dark:bg-amber-950/80 text-amber-700 dark:text-amber-400 border border-amber-250`}>
                  <Flame size={12} className="fill-current" /> 8 Day Streak
                </span>
              </div>

              {/* Buddy 3 */}
              <div className={`p-6 rounded-2xl border ${cardBgClass} flex flex-col items-center text-center space-y-3 transition-all duration-300 hover:shadow-md`}>
                {getStudentAvatar('SV', 'w-12 h-12')}
                <div>
                  <h3 className="text-sm font-bold">Shreya V.</h3>
                  <p className="text-xs text-zinc-400 text-rose-500">71% overall</p>
                </div>
                <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full flex items-center gap-1 bg-rose-50 dark:bg-rose-950/80 text-rose-700 dark:text-rose-455 border border-rose-250`}>
                  <AlertTriangle size={12} /> Below 75%
                </span>
              </div>
            </div>
          </section>

          {/* Everything you need grid */}
          <section className="space-y-12">
            <div className="text-center max-w-xl mx-auto space-y-4">
              <span className={`text-xs font-bold uppercase tracking-widest ${dark ? 'text-zinc-500' : 'text-[#6A635B]'}`}>
                EVERYTHING YOU NEED
              </span>
              <h2 className="text-4xl font-bold font-serif tracking-tight">
                Four features, one goal.
              </h2>
              <p className={`text-sm md:text-base leading-relaxed ${textMutedClass}`}>
                Never lose exam eligibility because you lost count.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Card 1 - Black high contrast card */}
              <div className={`p-8 rounded-3xl border flex flex-col justify-between min-h-[220px] transition-all duration-300 hover:shadow-lg ${
                dark 
                  ? 'bg-zinc-50 text-zinc-950 border-transparent shadow-xl' 
                  : 'bg-zinc-950 text-zinc-50 border-transparent shadow-xl'
              }`}>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-6 border ${
                  dark ? 'bg-zinc-100 text-zinc-950 border-zinc-200' : 'bg-zinc-900 text-zinc-50 border-zinc-800'
                }`}>
                  <UserCheck size={18} />
                </div>
                <div>
                  <h3 className="text-lg font-bold mb-2">Attendance marking</h3>
                  <p className={`text-sm leading-relaxed ${dark ? 'text-zinc-600' : 'text-zinc-400'}`}>
                    One-tap tracking: present, absent, or cancelled. Instant calculations keep you updated on the fly.
                  </p>
                </div>
              </div>

              {/* Card 2 - Ivory card */}
              <div className={`p-8 rounded-3xl border flex flex-col justify-between min-h-[220px] transition-all duration-300 hover:shadow-md ${cardBgClass}`}>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-6 border ${
                  dark ? 'bg-zinc-800 text-zinc-100 border-zinc-700' : 'bg-white text-zinc-900 border-[#EBEAE4]'
                }`}>
                  <BarChart3 size={18} />
                </div>
                <div>
                  <h3 className="text-lg font-bold mb-2">Subject statistics</h3>
                  <p className={`text-sm leading-relaxed ${textMutedClass}`}>
                    See exactly where you stand, which subject is falling short, and exactly how many classes you can safely skip.
                  </p>
                </div>
              </div>

              {/* Card 3 - Ivory card */}
              <div className={`p-8 rounded-3xl border flex flex-col justify-between min-h-[220px] transition-all duration-300 hover:shadow-md ${cardBgClass}`}>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-6 border ${
                  dark ? 'bg-zinc-800 text-zinc-100 border-zinc-700' : 'bg-white text-zinc-900 border-[#EBEAE4]'
                }`}>
                  <Lock size={18} />
                </div>
                <div>
                  <h3 className="text-lg font-bold mb-2">Encrypted study sessions</h3>
                  <p className={`text-sm leading-relaxed ${textMutedClass}`}>
                    Private study rooms designed for you and your group. End-to-end encryption means only those in the room read the chat.
                  </p>
                </div>
              </div>

              {/* Card 4 - Ivory card */}
              <div className={`p-8 rounded-3xl border flex flex-col justify-between min-h-[220px] transition-all duration-300 hover:shadow-md ${cardBgClass}`}>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-6 border ${
                  dark ? 'bg-zinc-800 text-zinc-100 border-zinc-700' : 'bg-white text-zinc-900 border-[#EBEAE4]'
                }`}>
                  <Users size={18} />
                </div>
                <div>
                  <h3 className="text-lg font-bold mb-2">Study buddy</h3>
                  <p className={`text-sm leading-relaxed ${textMutedClass}`}>
                    Pair up with a friend, sync your progress, hold each other accountable, and build healthy academic habits together.
                  </p>
                </div>
              </div>

            </div>
          </section>

          {/* 05 · Student Testimonials (Trusted by Students) */}
          <section className="space-y-12 pt-8">
            <div className="text-center max-w-xl mx-auto space-y-4">
              <span className={`text-xs font-bold uppercase tracking-widest ${dark ? 'text-zinc-500' : 'text-[#6A635B]'}`}>
                TESTIMONIALS · TRUSTED BY THOUSANDS
              </span>
              <h2 className="text-4xl font-bold font-serif tracking-tight">
                Loved by students.
              </h2>
              <p className={`text-sm md:text-base leading-relaxed ${textMutedClass}`}>
                See how DojoClass helps students stay safe, pairs them with accountability buddies, and simplifies their academic routines.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              
              {/* Testimonial 1 */}
              <div className={`p-6 rounded-3xl border flex flex-col justify-between space-y-6 transition-all duration-300 hover:shadow-md ${cardBgClass} hover:-translate-y-1`}>
                <div className="space-y-4">
                  {/* Rating Stars */}
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <svg key={s} className="w-3.5 h-3.5 fill-amber-400 text-amber-400 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 .587l3.668 7.431 8.2 1.192-5.934 5.787 1.4 8.168L12 18.896l-7.334 3.858 1.4-8.168L.132 9.21l8.2-1.192L12 .587z" />
                      </svg>
                    ))}
                  </div>
                  <p className={`text-xs md:text-sm leading-relaxed ${textMutedClass}`}>
                    "DojoClass literally saved my semester! Tracking my skip margin subject-by-subject let me stay safe above 75% while juggling my hackathons. The encrypted study rooms are just the cherry on top. 🔥"
                  </p>
                </div>
                <div className="flex items-center gap-3 pt-2 border-t border-zinc-100 dark:border-zinc-800/40">
                  {getStudentAvatar('RM', 'w-9 h-9')}
                  <div>
                    <h4 className="text-xs font-bold">Rohan S.</h4>
                    <p className="text-[10px] text-zinc-400 font-medium">CSE Sophomore</p>
                  </div>
                </div>
              </div>

              {/* Testimonial 2 */}
              <div className={`p-6 rounded-3xl border flex flex-col justify-between space-y-6 transition-all duration-300 hover:shadow-md ${cardBgClass} hover:-translate-y-1`}>
                <div className="space-y-4">
                  {/* Rating Stars */}
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <svg key={s} className="w-3.5 h-3.5 fill-amber-400 text-amber-400 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 .587l3.668 7.431 8.2 1.192-5.934 5.787 1.4 8.168L12 18.896l-7.334 3.858 1.4-8.168L.132 9.21l8.2-1.192L12 .587z" />
                      </svg>
                    ))}
                  </div>
                  <p className={`text-xs md:text-sm leading-relaxed ${textMutedClass}`}>
                    "Accountability buddy streaks are extremely addictive. My friend and I have a 10-day streak, and neither of us wants to miss a single Physics session now! The UX is incredibly smooth. 🚀"
                  </p>
                </div>
                <div className="flex items-center gap-3 pt-2 border-t border-zinc-100 dark:border-zinc-800/40">
                  {getStudentAvatar('AM', 'w-9 h-9')}
                  <div>
                    <h4 className="text-xs font-bold">Ananya M.</h4>
                    <p className="text-[10px] text-zinc-400 font-medium">Physics Major</p>
                  </div>
                </div>
              </div>

              {/* Testimonial 3 */}
              <div className={`p-6 rounded-3xl border flex flex-col justify-between space-y-6 transition-all duration-300 hover:shadow-md ${cardBgClass} hover:-translate-y-1`}>
                <div className="space-y-4">
                  {/* Rating Stars */}
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <svg key={s} className="w-3.5 h-3.5 fill-amber-400 text-amber-400 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 .587l3.668 7.431 8.2 1.192-5.934 5.787 1.4 8.168L12 18.896l-7.334 3.858 1.4-8.168L.132 9.21l8.2-1.192L12 .587z" />
                      </svg>
                    ))}
                  </div>
                  <p className={`text-xs md:text-sm leading-relaxed ${textMutedClass}`}>
                    "Honestly, the best scheduler out there. It auto-updates my attendance status in real-time, and the timetable scheduler fits my busy college schedule perfectly. Simple, clean, secure. 🎯"
                  </p>
                </div>
                <div className="flex items-center gap-3 pt-2 border-t border-zinc-100 dark:border-zinc-800/40">
                  {getStudentAvatar('SV', 'w-9 h-9')}
                  <div>
                    <h4 className="text-xs font-bold">Siddharth V.</h4>
                    <p className="text-[10px] text-zinc-400 font-medium">Economics Student</p>
                  </div>
                </div>
              </div>

            </div>
          </section>

        </div>
      </main>

      {/* Footer */}
      <footer className={`border-t mt-16 md:mt-36 py-12 md:py-20 transition-all duration-500 relative overflow-hidden ${
        dark 
          ? 'bg-gradient-to-b from-[#09090B] to-[#030304] text-zinc-400 border-zinc-900' 
          : 'bg-gradient-to-b from-[#FAF9F5] to-[#F1EFEB] text-[#6A635B] border-[#EBEAE4]'
      }`}>
        {/* Subtle background radial glows in dark mode */}
        {dark && (
          <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-indigo-500/5 rounded-full blur-3xl pointer-events-none -z-10" />
        )}
        
        <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 md:grid-cols-12 gap-10 md:gap-12 relative z-10">
          
          {/* Column 1 - Brand & Mission */}
          <div className="md:col-span-4 space-y-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2.5">
                <h3 className={`text-xl font-bold tracking-tight font-serif ${dark ? 'text-white' : 'text-[#1C1917]'}`}>
                  DojoClass
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-[8px] font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 animate-pulse">
                  v1.0 LIVE
                </span>
              </div>
              <p className="text-xs leading-relaxed max-w-sm">
                Empowering students to take control of their academics. Maintain optimal attendance ratios, eliminate exam-eligibility anxiety, and build efficient routines effortlessly.
              </p>
            </div>
            
            <div className="pt-2">
              <p className={`text-[10px] uppercase tracking-widest font-extrabold ${dark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                Designed for students, by students.
              </p>
            </div>


          </div>

          {/* Column 2 - Core Features */}
          <div className="md:col-span-2 space-y-4">
            <h3 className={`text-xs font-bold tracking-widest uppercase ${dark ? 'text-zinc-350' : 'text-[#1C1917]'}`}>
              Product
            </h3>
            <ul className="space-y-2.5 text-xs">
              {['Scheduler', 'Attendance', 'Encrypted Rooms', 'Buddy Streaks'].map((item) => (
                <li key={item}>
                  <a 
                    href="#features" 
                    className={`inline-block transition-all duration-300 hover:translate-x-1.5 ${
                      dark ? 'hover:text-purple-400' : 'hover:text-blue-600'
                    }`}
                  >
                    {item}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3 - Resources */}
          <div className="md:col-span-2 space-y-4">
            <h3 className={`text-xs font-bold tracking-widest uppercase ${dark ? 'text-zinc-350' : 'text-[#1C1917]'}`}>
              System
            </h3>
            <ul className="space-y-2.5 text-xs">
              {['Security Architecture', 'Eligibility calculator', 'Syllabus planner'].map((item) => (
                <li key={item}>
                  <a 
                    href="#" 
                    className={`inline-block transition-all duration-300 hover:translate-x-1.5 ${
                      dark ? 'hover:text-purple-400' : 'hover:text-blue-600'
                    }`}
                  >
                    {item}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 4 - Contact card (Glassmorphic) */}
          <div className="md:col-span-4">
            <div className={`p-5 rounded-2xl border backdrop-blur-md space-y-4 shadow-sm transition-all duration-300 ${
              dark 
                ? 'bg-zinc-900/40 border-zinc-800/80 shadow-zinc-950/20' 
                : 'bg-white/60 border-[#EBEAE4] shadow-neutral-200/50'
            }`}>
              <div className="space-y-1">
                <h4 className={`text-xs font-bold ${dark ? 'text-white' : 'text-zinc-900'}`}>
                  Get In Touch
                </h4>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  Have feedback or running into any issues? Reach out directly, let's shape DojoClass together!
                </p>
              </div>

              <div className="space-y-2 pt-1">
                <a
                  href="mailto:bceutkarsh@gmail.com"
                  className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border text-xs font-bold transition-all duration-300 ${
                    dark 
                      ? 'bg-zinc-950/40 border-zinc-800/80 hover:bg-indigo-950/30 hover:border-indigo-500/30 hover:text-indigo-400 text-zinc-350' 
                      : 'bg-[#FAF9F5]/80 border-[#EBEAE4] hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700 text-zinc-700'
                  }`}
                >
                  <Mail size={13} className="shrink-0" />
                  <span>bceutkarsh@gmail.com</span>
                </a>
                <a
                  href="tel:9508761011"
                  className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border text-xs font-bold transition-all duration-300 ${
                    dark 
                      ? 'bg-zinc-950/40 border-zinc-800/80 hover:bg-emerald-950/30 hover:border-emerald-500/30 hover:text-emerald-400 text-zinc-350' 
                      : 'bg-[#FAF9F5]/80 border-[#EBEAE4] hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-700 text-zinc-700'
                  }`}
                >
                  <Phone size={13} className="shrink-0" />
                  <span>+91 9508761011</span>
                </a>
              </div>
            </div>
          </div>

        </div>

        {/* Footer bottom bar */}
        <div className="max-w-6xl mx-auto px-6 mt-16 pt-8 border-t border-inherit relative z-10 flex flex-col sm:flex-row justify-between items-center gap-5 text-xs">
          <span className="text-zinc-500 font-medium">© {new Date().getFullYear()} DojoClass. All rights reserved.</span>
          
          {/* Status badge */}
          <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-[10px] font-bold ${
            dark 
              ? 'bg-emerald-950/40 border-emerald-500/20 text-emerald-400' 
              : 'bg-emerald-50 border-emerald-200 text-emerald-700'
          }`}>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping inline-block" />
            <span>All Systems Operational</span>
          </div>

          <div className="flex gap-6 font-medium text-zinc-500">
            <a href="#" className={`transition-colors ${dark ? 'hover:text-white' : 'hover:text-[#1C1917]'}`}>Privacy Policy</a>
            <a href="#" className={`transition-colors ${dark ? 'hover:text-white' : 'hover:text-[#1C1917]'}`}>Terms of Service</a>
          </div>
        </div>
      </footer>
    </div>
  );
}