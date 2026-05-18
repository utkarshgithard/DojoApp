"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Moon, Sun } from 'lucide-react';
import { useSwipeable } from 'react-swipeable';
import { useDarkMode } from '@/context/DarkModeContext';
import { useAuth } from '@/context/authContext';

const slides = [
  { num: '01 / 03', title: 'Track attendance by subject', type: 'bars' },
  { num: '02 / 03', title: 'Plan your weekly schedule', type: 'schedule' },
  { num: '03 / 03', title: 'Visualize your attendance summary', type: 'stats' },
];

function BarsSlide({ dark }: { dark: boolean }) {
  const bars = [
    { name: 'Maths', pct: 91, level: 'good' },
    { name: 'Physics', pct: 82, level: 'good' },
    { name: 'Chemistry', pct: 64, level: 'warn' },
    { name: 'English', pct: 49, level: 'low' },
  ];
  const fillColor = (level: string) => {
    if (level === 'good') return dark ? '#f5f5f5' : '#111';
    if (level === 'warn') return dark ? '#888' : '#666';
    return dark ? '#555' : '#bbb';
  };
  return (
    <div className="space-y-3">
      {bars.map(b => (
        <div key={b.name} className="flex items-center gap-3">
          <span className={`text-xs w-16 shrink-0 ${dark ? 'text-gray-400' : 'text-gray-500'}`}>{b.name}</span>
          <div className={`flex-1 h-[3px] rounded-full ${dark ? 'bg-gray-700' : 'bg-gray-200'}`}>
            <div className="h-full rounded-full" style={{ width: `${b.pct}%`, background: fillColor(b.level) }} />
          </div>
          <span className={`text-xs font-medium w-8 text-right ${dark ? 'text-gray-200' : 'text-gray-800'}`}>
            {b.pct}%
          </span>
        </div>
      ))}
    </div>
  );
}

function ScheduleSlide({ dark }: { dark: boolean }) {
  const slots = [
    { time: 'Mon · 9:00 AM', subj: 'Physics' },
    { time: 'Mon · 11:00 AM', subj: 'Lab' },
    { time: 'Tue · 10:00 AM', subj: 'Maths' },
    { time: 'Wed · 2:00 PM', subj: 'English' },
  ];
  return (
    <div className="grid grid-cols-2 gap-2">
      {slots.map(s => (
        <div key={s.subj + s.time} className={`rounded-lg p-2.5 border ${dark ? 'border-gray-700' : 'border-gray-200'}`}>
          <span className={`text-[11px] block mb-0.5 ${dark ? 'text-gray-500' : 'text-gray-400'}`}>{s.time}</span>
          <span className={`text-[13px] font-medium ${dark ? 'text-gray-100' : 'text-gray-900'}`}>{s.subj}</span>
        </div>
      ))}
    </div>
  );
}

function StatsSlide({ dark }: { dark: boolean }) {
  const stats = [
    { val: '5', label: 'Subjects' },
    { val: '76%', label: 'Overall' },
    { val: '3', label: 'Can bunk' },
  ];
  return (
    <div className="grid grid-cols-3 gap-2">
      {stats.map(s => (
        <div key={s.label} className={`rounded-lg p-3 text-center ${dark ? 'bg-gray-900' : 'bg-gray-50'}`}>
          <div className={`text-xl font-medium ${dark ? 'text-gray-100' : 'text-gray-900'}`}>{s.val}</div>
          <div className={`text-[11px] mt-0.5 ${dark ? 'text-gray-500' : 'text-gray-400'}`}>{s.label}</div>
        </div>
      ))}
    </div>
  );
}

export default function LandingPage() {
  const router = useRouter();
  const { darkMode, toggleDarkMode } = useDarkMode() as any;
  const { isAuthenticated, loading } = useAuth();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [manual, setManual] = useState(false);

  useEffect(() => {
    if (!loading && isAuthenticated) router.push('/dashboard');
  }, [isAuthenticated, loading, router]);

  useEffect(() => {
    if (manual) return;
    const interval = setInterval(() => setCurrentSlide(p => (p + 1) % slides.length), 3000);
    return () => clearInterval(interval);
  }, [manual]);

  const goTo = (i: number) => { setManual(true); setCurrentSlide(i); };
  const goToPrev = () => goTo(currentSlide === 0 ? slides.length - 1 : currentSlide - 1);
  const goToNext = () => goTo((currentSlide + 1) % slides.length);

  const swipeHandlers = useSwipeable({
    onSwipedLeft: goToNext,
    onSwipedRight: goToPrev,
    preventScrollOnSwipe: true,
    trackTouch: true,
    trackMouse: true,
  });

  const dark = darkMode;
  const border = dark ? 'border-gray-800' : 'border-gray-200';
  const muted = dark ? 'text-gray-400' : 'text-gray-500';

  return (
    <div className={`min-h-screen transition-colors duration-300 ${dark ? 'bg-black text-white' : 'bg-white text-gray-900'}`}>

      {/* Header */}
      <div className={`flex justify-between items-center px-5 py-4 border-b ${border}`}>
        <h1 className="text-[17px] font-medium tracking-tight">ClassMate</h1>
        <button
          onClick={toggleDarkMode}
          className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] border transition-colors ${dark ? 'border-gray-700 text-gray-300 hover:bg-gray-900' : 'border-gray-300 text-gray-600 hover:bg-gray-50'
            }`}
        >
          {dark ? <Sun size={14} /> : <Moon size={14} />}
          {dark ? 'Light' : 'Dark'}
        </button>
      </div>

      {/* Hero */}
      <div className="px-5 pt-10 pb-8">
        <p className={`text-[11px] uppercase tracking-widest mb-3 ${muted}`}>
          Attendance tracker · for students
        </p>
        <h2 className="text-[30px] font-medium leading-[1.1] tracking-tight mb-3">
          Stay above 75%.<br />Always.
        </h2>
        <p className={`text-[14px] leading-relaxed mb-7 max-w-sm ${muted}`}>
          Track attendance, plan your schedule, and know exactly how many classes you can afford to miss.
        </p>
        <div className="flex items-center gap-5 flex-wrap">
          <button
            onClick={() => router.push('/register')}
            className={`px-5 py-2.5 rounded-lg text-[14px] font-medium transition-opacity hover:opacity-80 active:scale-95 ${dark ? 'bg-white text-black' : 'bg-black text-white'
              }`}
          >
            Get started
          </button>
          <button
            onClick={() => router.push('/login')}
            className={`text-[13px] underline underline-offset-2 transition-colors ${muted} hover:text-current`}
          >
            Already have an account? Log in
          </button>
        </div>
      </div>

      {/* Slide card */}
      <div className={`mx-5 border rounded-xl overflow-hidden ${border}`} {...swipeHandlers}>
        <div className="overflow-hidden">
          <div
            className="flex transition-transform duration-500 ease-[cubic-bezier(0.4,0,0.2,1)]"
            style={{ transform: `translateX(-${currentSlide * 100}%)` }}
          >
            {slides.map((slide, i) => (
              <div key={i} className="min-w-full p-5">
                <p className={`text-[11px] uppercase tracking-wider mb-1.5 ${muted}`}>{slide.num}</p>
                <p className="text-[15px] font-medium mb-4">{slide.title}</p>
                {slide.type === 'bars' && <BarsSlide dark={dark} />}
                {slide.type === 'schedule' && <ScheduleSlide dark={dark} />}
                {slide.type === 'stats' && <StatsSlide dark={dark} />}
              </div>
            ))}
          </div>
        </div>

        {/* Dots */}
        <div className="flex justify-center gap-1.5 py-4">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              aria-label={`Go to slide ${i + 1}`}
              className="h-[5px] rounded-full transition-all duration-300"
              style={{
                width: currentSlide === i ? 18 : 6,
                background: currentSlide === i
                  ? dark ? '#f5f5f5' : '#111'
                  : dark ? '#444' : '#ddd',
              }}
            />
          ))}
        </div>
      </div>

      {/* Feature strip */}
      <div className={`grid grid-cols-3 border-t mt-8 ${border}`}>
        {[
          { label: 'Mark attendance', desc: 'One tap per class, present or absent' },
          { label: 'Weekly schedule', desc: 'Set up classes for each day' },
          { label: 'Subject stats', desc: 'See exactly where you stand' },
        ].map((f, i) => (
          <div key={f.label} className={`px-4 py-5 ${i < 2 ? `border-r ${border}` : ''}`}>
            <p className="text-[12px] font-medium mb-1">{f.label}</p>
            <p className={`text-[11px] leading-snug ${muted}`}>{f.desc}</p>
          </div>
        ))}
      </div>

    </div>
  );
}