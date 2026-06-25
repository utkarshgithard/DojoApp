import React from 'react';
import { UserCheck, Calendar, Users, Sparkles } from 'lucide-react';

interface LandingAboutProps {
  dark: boolean;
  textMutedClass: string;
}

export function LandingAbout({ dark, textMutedClass }: LandingAboutProps) {
  return (
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
  );
}
