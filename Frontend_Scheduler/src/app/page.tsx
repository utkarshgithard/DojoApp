"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Moon, Sun, Mail, Phone } from 'lucide-react';
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
      <meta name="google-site-verification" content="MH-qCpIalYR4S1flnD1CRaPx_tUMSziNE9Y6cLpgdnI" />

      {/* Header */}
      <header className={`flex justify-between items-center px-5 py-4 border-b ${border}`}>
        <nav aria-label="Main navigation">
          <span className="text-[17px] font-medium tracking-tight" aria-label="DojoClass home">DojoClass</span>
        </nav>
        <button
          onClick={toggleDarkMode}
          aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
          className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] border transition-colors ${dark ? 'border-gray-700 text-gray-300 hover:bg-gray-900' : 'border-gray-300 text-gray-600 hover:bg-gray-50'
            }`}
        >
          {dark ? <Sun size={14} /> : <Moon size={14} />}
          {dark ? 'Light' : 'Dark'}
        </button>
      </header>

      <main>
        {/* Hero */}
        <section aria-label="Hero" className="px-5 pt-10 pb-8">
          <p className={`text-[11px] uppercase tracking-widest mb-3 ${muted}`}>
            Attendance tracker · for students
          </p>
          <h1 className="text-[30px] font-medium leading-[1.1] tracking-tight mb-3">
            Stay above 75%.<br />Always.
          </h1>
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
        </section>

        {/* Slide card */}
        <section aria-label="Feature showcase" className={`mx-5 border rounded-xl overflow-hidden ${border}`} {...swipeHandlers}>
          <div className="overflow-hidden" role="region" aria-roledescription="carousel" aria-label="App features">
            <div
              className="flex transition-transform duration-500 ease-[cubic-bezier(0.4,0,0.2,1)]"
              style={{ transform: `translateX(-${currentSlide * 100}%)` }}
            >
              {slides.map((slide, i) => (
                <article key={i} className="min-w-full p-5" role="group" aria-roledescription="slide" aria-label={slide.title}>
                  <p className={`text-[11px] uppercase tracking-wider mb-1.5 ${muted}`}>{slide.num}</p>
                  <h2 className="text-[15px] font-medium mb-4">{slide.title}</h2>
                  {slide.type === 'bars' && <BarsSlide dark={dark} />}
                  {slide.type === 'schedule' && <ScheduleSlide dark={dark} />}
                  {slide.type === 'stats' && <StatsSlide dark={dark} />}
                </article>
              ))}
            </div>
          </div>

          {/* Dots */}
          <div className="flex justify-center gap-1.5 py-4" role="tablist" aria-label="Slide navigation">
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => goTo(i)}
                role="tab"
                aria-selected={currentSlide === i}
                aria-label={`Go to slide ${i + 1}: ${slides[i].title}`}
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
        </section>

        {/* Feature strip */}
        <section aria-label="Key features" className={`grid grid-cols-3 border-t mt-8 ${border}`}>
          {[
            { label: 'Mark attendance', desc: 'One tap per class, present or absent' },
            { label: 'Weekly schedule', desc: 'Set up classes for each day' },
            { label: 'Subject stats', desc: 'See exactly where you stand' },
          ].map((f, i) => (
            <div key={f.label} className={`px-4 py-5 ${i < 2 ? `border-r ${border}` : ''}`}>
              <h2 className="text-[12px] font-medium mb-1">{f.label}</h2>
              <p className={`text-[11px] leading-snug ${muted}`}>{f.desc}</p>
            </div>
          ))}
        </section>
      </main>

      {/* Footer Area */}
      <footer className={`border-t ${border} ${dark ? 'bg-zinc-950 text-gray-400' : 'bg-gray-50 text-gray-600'} py-12 px-5 transition-colors duration-300`}>
        <div className="max-w-[1100px] mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">

          {/* Brand & Mission Statement */}
          <div className="space-y-4">
            <h3 className={`text-[15px] font-semibold tracking-tight ${dark ? 'text-white' : 'text-gray-900'}`}>
              DojoClass
            </h3>
            <p className="text-[12.5px] leading-relaxed">
              Empowering students to take control of their academics. Maintain optimal attendance ratios, eliminate exam-eligibility anxiety, and build efficient routines effortlessly.
            </p>
            <p className="text-[11.5px] italic text-zinc-500">
              Made with passion for students, by students.
            </p>
          </div>

          {/* Detailed Use Case & Importance */}
          <div className="space-y-4">
            <h3 className={`text-[15px] font-semibold tracking-tight ${dark ? 'text-white' : 'text-gray-900'}`}>
              How It Works & Why It Matters
            </h3>
            <div className="space-y-3">
              <div className="flex gap-2.5 items-start">
                <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded ${dark ? 'bg-zinc-800 text-zinc-300' : 'bg-zinc-200 text-zinc-800'} mt-0.5`}>1</span>
                <p className="text-[12.5px] leading-snug">
                  <strong>Upload Your Schedule:</strong> Set up your recurring weekly classes so DojoClass knows exactly when you have lectures.
                </p>
              </div>
              <div className="flex gap-2.5 items-start">
                <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded ${dark ? 'bg-zinc-800 text-zinc-300' : 'bg-zinc-200 text-zinc-800'} mt-0.5`}>2</span>
                <p className="text-[12.5px] leading-snug">
                  <strong>Mark Classes Daily:</strong> One tap to log whether you attended, missed, or if a class was cancelled.
                </p>
              </div>
              <div className="flex gap-2.5 items-start">
                <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded ${dark ? 'bg-zinc-800 text-zinc-300' : 'bg-zinc-200 text-zinc-800'} mt-0.5`}>3</span>
                <p className="text-[12.5px] leading-snug">
                  <strong>Stay Above 75%:</strong> Crucial for academic eligibility. Never guess how many classes you can afford to skip.
                </p>
              </div>
            </div>
          </div>

          {/* Contact & Support Section */}
          <div className="space-y-4">
            <h3 className={`text-[15px] font-semibold tracking-tight ${dark ? 'text-white' : 'text-gray-900'}`}>
              Get In Touch
            </h3>
            <p className="text-[12.5px] leading-relaxed">
              Have feedback, features you would like to request, or run into any issues? Reach out directly, and let's make your academic journey smoother together!
            </p>
            <div className="space-y-2.5 pt-1">
              <a
                href="mailto:bceutkarsh@gmail.com"
                className={`flex items-center gap-2 text-[13px] transition-colors ${dark ? 'hover:text-white' : 'hover:text-black'}`}
              >
                <Mail size={14} className="shrink-0" />
                <span>bceutkarsh@gmail.com</span>
              </a>
              <a
                href="tel:9508761011"
                className={`flex items-center gap-2 text-[13px] transition-colors ${dark ? 'hover:text-white' : 'hover:text-black'}`}
              >
                <Phone size={14} className="shrink-0" />
                <span>+91 9508761011</span>
              </a>
            </div>
          </div>

        </div>

        {/* Bottom copyright block */}
        <div className={`max-w-[1100px] mx-auto mt-10 pt-6 border-t ${dark ? 'border-zinc-900' : 'border-gray-200'} flex flex-col sm:flex-row justify-between items-center gap-4 text-[11px] text-zinc-500`}>
          <span>© {new Date().getFullYear()} DojoClass. All rights reserved.</span>
          <div className="flex gap-4">
            <span className="hover:underline cursor-pointer">Privacy Policy</span>
            <span className="hover:underline cursor-pointer">Terms of Service</span>
          </div>
        </div>
      </footer>

    </div>
  );
}