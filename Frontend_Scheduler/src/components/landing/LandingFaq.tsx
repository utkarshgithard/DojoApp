"use client";

import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

interface LandingFaqProps {
  dark: boolean;
  textMutedClass: string;
}

export function LandingFaq({ dark, textMutedClass }: LandingFaqProps) {
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  const faqs = [
    {
      question: "How do I track my college attendance by subject on DojoClass?",
      answer: "DojoClass provides an intuitive, one-tap dashboard to mark present, absent, or cancelled classes for each of your subjects. It automatically recalculates your attendance percentage in real-time, helping you visualize your progress and stay on track with your academic criteria."
    },
    {
      question: "What is a study buddy streak and how does it keep me motivated?",
      answer: "A study buddy streak is a built-in motivation system where you pair up with a classmate. You can check each other's attendance statistics, monitor streaks, and keep each other accountable through friendly competition so that neither of you falls below 75%."
    },
    {
      question: "Are the study rooms and group video calls secure?",
      answer: "Absolutely. DojoClass study sessions, chat messages, and group video/audio calls are fully secured. Study rooms feature private, host-controlled access to guarantee a focused and distraction-free collaboration space."
    },
    {
      question: "How does the weekly class scheduler predict my future attendance?",
      answer: "By entering your weekly class schedule once, DojoClass maps out your repeating timetable. It automatically forecasts your future attendance percentages and alerts you if upcoming absences might push your criteria below safe limits."
    }
  ];

  return (
    <section aria-label="Frequently Asked Questions" className="space-y-12 pt-8 border-t border-inherit">
      <div className="text-center max-w-xl mx-auto space-y-4">
        <span className={`text-xs font-bold uppercase tracking-widest ${dark ? 'text-zinc-500' : 'text-[#6A635B]'}`}>
          QUESTIONS & ANSWERS · FAQ
        </span>
        <h2 className="text-4xl font-bold font-serif tracking-tight">
          Frequently Asked Questions
        </h2>
        <p className={`text-sm md:text-base leading-relaxed ${textMutedClass}`}>
          Have questions about DojoClass? We've got you covered with everything you need to know to get started.
        </p>
      </div>

      <div className="max-w-3xl mx-auto space-y-4">
        {faqs.map((faq, idx) => {
          const isOpen = activeFaq === idx;
          return (
            <div
              key={idx}
              className={`rounded-2xl border transition-all duration-300 ${
                dark 
                  ? 'bg-[#18181B] border-zinc-800 hover:border-zinc-700' 
                  : 'bg-[#FAF9F5] border-[#EBEAE4] hover:border-zinc-350'
              } overflow-hidden`}
            >
              <button
                onClick={() => setActiveFaq(isOpen ? null : idx)}
                className="w-full px-6 py-5 text-left flex justify-between items-center gap-4 transition-colors"
                aria-expanded={isOpen}
              >
                <span className="text-sm md:text-base font-bold text-zinc-900 dark:text-white">
                  {faq.question}
                </span>
                <span className={`text-zinc-400 transition-transform duration-300 shrink-0 ${
                  isOpen ? 'rotate-180 text-blue-500' : ''
                }`}>
                  <ChevronDown size={18} />
                </span>
              </button>
              
              <div
                className={`transition-all duration-300 ease-in-out overflow-hidden ${
                  isOpen ? 'max-h-[200px] border-t border-inherit opacity-100' : 'max-h-0 opacity-0'
                }`}
              >
                <p className={`p-6 text-xs md:text-sm leading-relaxed ${textMutedClass}`}>
                  {faq.answer}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
