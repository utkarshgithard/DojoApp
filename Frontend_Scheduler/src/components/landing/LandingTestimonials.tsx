import React from 'react';
import { getStudentAvatar } from './StudentAvatar';

interface LandingTestimonialsProps {
  dark: boolean;
  textMutedClass: string;
  cardBgClass: string;
}

export function LandingTestimonials({ dark, textMutedClass, cardBgClass }: LandingTestimonialsProps) {
  return (
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
  );
}
