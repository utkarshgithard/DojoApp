"use client";

import React, { useState, useEffect } from 'react';
import { 
  Lock, 
  Users, 
  Clock, 
  Flame, 
  AlertTriangle, 
  UserCheck, 
  BarChart3 
} from 'lucide-react';
import { getStudentAvatar } from './StudentAvatar';

interface LandingFeaturesProps {
  dark: boolean;
  textMutedClass: string;
  cardBgClass: string;
}

export function LandingFeatures({ dark, textMutedClass, cardBgClass }: LandingFeaturesProps) {
  const [sessionChatStep, setSessionChatStep] = useState(0);

  const sessionChats = [
    { sender: 'Rohan M.', text: "Wait, is equation 3 correct? 🤔", avatar: 'RM' },
    { sender: 'Ananya M.', text: "Yes! Just divide by gravity. 🚀", avatar: 'AM' },
    { sender: 'Siddharth V.', text: "Joining in 2 minutes guys! 🎯", avatar: 'SV' },
    { sender: 'Riya M.', text: "Let's review the motion graphs next. 📈", avatar: 'Riya' }
  ];

  useEffect(() => {
    const sessionChatInterval = setInterval(() => {
      setSessionChatStep(prev => (prev + 1) % 4);
    }, 2800);
    return () => clearInterval(sessionChatInterval);
  }, []);

  return (
    <div id="features" className="space-y-20 md:space-y-36">
      {/* 01 · Attendance Marking */}
      <section className="grid md:grid-cols-12 gap-8 items-center">
        <div className="md:col-span-5 space-y-4">
          <span className={`text-xs font-bold uppercase tracking-widest ${dark ? 'text-zinc-500' : 'text-[#6A635B]'}`}>
            01 · ATTENDANCE MARKING
          </span>
          <h2 className="text-3xl md:text-4xl font-bold font-serif tracking-tight">
            Subject-Wise Attendance Tracking: One tap per class.
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
            Weekly Timetable & Schedule Planner: Your timetable, always with you.
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
            Encrypted Study Rooms & Video Calling: Study together, privately.
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
            Accountability Partner & Study Buddy: Keep each other on track.
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
    </div>
  );
}
