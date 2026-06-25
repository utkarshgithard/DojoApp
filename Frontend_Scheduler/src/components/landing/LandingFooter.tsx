import React from 'react';
import { Mail, Phone } from 'lucide-react';
import Link from 'next/link';

interface LandingFooterProps {
  dark: boolean;
}

export function LandingFooter({ dark }: LandingFooterProps) {
  return (
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
          <Link href="/privacy" className={`transition-colors ${dark ? 'hover:text-white' : 'hover:text-[#1C1917]'}`}>Privacy Policy</Link>
          <Link href="/terms" className={`transition-colors ${dark ? 'hover:text-white' : 'hover:text-[#1C1917]'}`}>Terms of Service</Link>
        </div>
      </div>
    </footer>
  );
}
