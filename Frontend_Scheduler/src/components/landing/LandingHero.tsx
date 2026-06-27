"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Mail,
  ArrowRight,
  Lock,
  Unlock,
  Users,
  Check,
  BarChart3,
} from 'lucide-react';
import { getStudentAvatar } from './StudentAvatar';

interface LandingHeroProps {
  dark: boolean;
  textMutedClass: string;
}

export function LandingHero({ dark, textMutedClass }: LandingHeroProps) {
  const router = useRouter();

  const [isLocked, setIsLocked] = useState(false);
  const [attendanceStep, setAttendanceStep] = useState(0);
  const [sessionsCount, setSessionsCount] = useState(12);
  const [hoursCount, setHoursCount] = useState(18);
  const [attendancePercent, setAttendancePercent] = useState(86);
  const [chatStep, setChatStep] = useState(0);
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

    const headlineInterval = setInterval(() => {
      setHeadlineStep(prev => (prev + 1) % 4);
    }, 3000);

    return () => {
      clearInterval(lockInterval);
      clearInterval(attendanceInterval);
      clearInterval(progressInterval);
      clearInterval(chatInterval);
      clearInterval(headlineInterval);
    };
  }, []);

  return (
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
              className={`w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3.5 rounded-full text-sm font-medium border transition-all duration-300 hover:scale-102 ${dark
                ? 'bg-zinc-100 text-zinc-950 border-transparent hover:bg-white'
                : 'bg-zinc-950 text-white border-transparent hover:bg-zinc-800'
                }`}
            >
              <span>Get started free</span>
              <ArrowRight size={15} />
            </button>
            <a
              href="#features"
              className={`w-full sm:w-auto text-center px-6 py-3.5 rounded-full text-sm font-medium border transition-all duration-300 ${dark
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
          {/* Desktop Layout */}
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
              <div className={`w-8 h-8 rounded-full border bg-white dark:bg-zinc-900 shadow-sm flex items-center justify-center transition-all duration-300 border-purple-250 dark:border-purple-800 pointer-events-auto cursor-pointer ${isLocked ? 'text-purple-600 scale-105 shadow-sm' : 'text-purple-400 scale-95 opacity-80'
                }`}>
                <div className="w-5 h-5 rounded-full bg-purple-50 dark:bg-purple-950 flex items-center justify-center">
                  {isLocked ? (
                    <Lock size={12} className="animate-lock-click text-purple-600" />
                  ) : (
                    <Unlock size={12} className="animate-unlock-click text-purple-400" />
                  )}
                </div>
              </div>
              <div className={`px-2 py-0.5 rounded-full border text-[7.5px] font-bold tracking-wider uppercase transition-colors duration-300 pointer-events-auto ${dark
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
              <div className={`px-2 py-0.5 rounded-full border text-[7.5px] font-bold tracking-wider uppercase transition-colors duration-300 pointer-events-auto ${dark
                ? 'bg-[#18181B] border-zinc-800 text-teal-400'
                : 'bg-white border-[#EBEAE4] text-teal-700 shadow-sm'
                }`}>
                Manage Everything
              </div>
            </div>

            {/* Styled Mockup Cards surrounding central student */}
            {/* 1. Attendance Card */}
            <div className="absolute top-[2%] left-[2%] w-[210px]">
              <div className={`p-3 rounded-2xl border transition-all duration-300 ${dark ? 'bg-[#0f1b13]/85 border-emerald-500/30 shadow-lg shadow-emerald-950/20' : 'bg-[#E8F5E9]/40 border-[#C8E6C9]/85'
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

                <div className={`mt-2 p-1.5 rounded-xl border ${dark ? 'bg-zinc-900/95 border-zinc-800' : 'bg-white border-[#EBEAE4]'
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
              <div className={`p-4 rounded-2xl border transition-all duration-300 ${dark ? 'bg-[#150f1d]/85 border-purple-500/30 shadow-lg shadow-purple-950/20' : 'bg-[#F3E5F5]/40 border-[#E1BEE7]/85'
                }`}>
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full text-white flex items-center justify-center shrink-0 transition-all duration-300 ${isLocked
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

                <div className={`mt-3 p-2 rounded-xl border flex items-center justify-between ${dark ? 'bg-zinc-900/95 border-zinc-800' : 'bg-white border-[#EBEAE4]'
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
              <div className={`p-3 rounded-2xl border transition-all duration-300 ${dark ? 'bg-[#1a120b]/85 border-amber-500/30 shadow-lg shadow-amber-950/20' : 'bg-[#FFF3E0]/40 border-[#FFE0B2]/85'
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

                <div className={`mt-2.5 p-1.5 pb-11 rounded-xl border ${dark ? 'bg-zinc-900/95 border-zinc-800' : 'bg-white border-[#EBEAE4]'
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
              <div className={`p-3 rounded-2xl border transition-all duration-300 ${dark ? 'bg-[#0b1817]/85 border-teal-500/30 shadow-lg shadow-teal-950/20' : 'bg-[#E0F2F1]/40 border-[#B2DFDB]/85'
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

                <div className={`mt-2 p-1.5 rounded-xl border ${dark ? 'bg-zinc-900/95 border-zinc-800' : 'bg-white border-[#EBEAE4]'
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

          {/* Mobile Layout */}
          <div className="md:hidden space-y-6">
            <div className="flex justify-center">
              <div className="relative w-[180px] h-[180px] flex items-center justify-center overflow-visible">
                <div className="absolute w-[140px] h-[140px] rounded-full bg-gradient-to-tr from-purple-150 to-blue-150 dark:from-purple-950/20 dark:to-blue-950/20 border border-purple-255/25 shadow-inner" />
                <img
                  src="/edited-photo.png"
                  alt="Student learning"
                  className="w-[200px] h-[200px] object-contain scale-[1.8] translate-y-4 select-none z-10"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
              {/* Attendance Card */}
              <div className={`p-4 rounded-xl border ${dark ? 'bg-[#0f1b13]/85 border-emerald-500/30 shadow-lg shadow-emerald-950/15' : 'bg-[#E8F5E9]/40 border-[#C8E6C9]/85'
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

                <div className={`mt-2.5 p-2 rounded-xl border ${dark ? 'bg-zinc-900/95 border-zinc-800' : 'bg-white border-[#EBEAE4]'
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
              <div className={`p-4 rounded-xl border ${dark ? 'bg-[#150f1d]/85 border-purple-500/30 shadow-lg shadow-purple-950/15' : 'bg-[#F3E5F5]/40 border-[#E1BEE7]/85'
                }`}>
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full text-white flex items-center justify-center shrink-0 transition-all duration-300 ${isLocked
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

                <div className={`mt-2.5 p-2 rounded-xl border flex items-center justify-between ${dark ? 'bg-zinc-900/95 border-zinc-800' : 'bg-white border-[#EBEAE4]'
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
              <div className={`p-4 rounded-xl border ${dark ? 'bg-[#1a120b]/85 border-amber-500/30 shadow-lg shadow-amber-950/15' : 'bg-[#FFF3E0]/40 border-[#FFE0B2]/85'
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

                <div className={`mt-2.5 p-2 pb-6 rounded-xl border ${dark ? 'bg-zinc-900/95 border-zinc-800' : 'bg-white border-[#EBEAE4]'
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
              <div className={`p-4 rounded-xl border ${dark ? 'bg-[#0b1817]/85 border-teal-500/30 shadow-lg shadow-teal-950/15' : 'bg-[#E0F2F1]/40 border-[#B2DFDB]/85'
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

                <div className={`mt-2.5 p-2 rounded-xl border ${dark ? 'bg-zinc-900/95 border-zinc-800' : 'bg-white border-[#EBEAE4]'
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
  );
};