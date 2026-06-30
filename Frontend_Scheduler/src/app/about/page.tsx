"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { useDarkMode } from "@/context/DarkModeContext";

export default function AboutPage() {
  const router = useRouter();
  const { darkMode } = useDarkMode() as any;
  const dark = darkMode;

  const bgClass = dark ? "bg-[#09090B] text-zinc-100" : "bg-white text-[#1C1917]";
  const borderClass = dark ? "border-zinc-800" : "border-[#EBEAE4]";
  const textMutedClass = dark ? "text-zinc-400" : "text-[#6A635B]";

  return (
    <div className={`min-h-screen transition-colors duration-500 font-sans ${bgClass}`}>
      {/* Header */}
      <header className={`sticky top-0 z-50 backdrop-blur-md border-b transition-colors duration-300 ${
        dark ? "bg-[#09090B]/85 border-zinc-800/80" : "bg-white/85 border-[#EBEAE4]/80"
      }`}>
        <div className="max-w-4xl mx-auto px-6 py-4 flex justify-between items-center">
          <button
            onClick={() => router.push("/")}
            className="flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold transition-all hover:scale-105"
            style={{
              boxShadow: dark
                ? "3px 3px 6px rgba(0,0,0,0.45), -3px -3px 6px rgba(255,255,255,0.02)"
                : "4px 4px 8px var(--neo-shadow-dark), -4px -4px 8px var(--neo-shadow-light)",
              background: dark ? "#1f222b" : "#e4e9f2",
              color: dark ? "#e7ebf2" : "#2e3a4f",
            }}
          >
            <ArrowLeft size={14} />
            <span>Back to Home</span>
          </button>
          <span className="text-xs font-bold text-zinc-400 dark:text-zinc-500">ABOUT DOJOCLASS</span>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-6 py-12 md:py-16 space-y-8">
        <div className="space-y-4">
          <h1 className="text-3xl md:text-4xl font-bold font-serif tracking-tight">
            About DojoClass
          </h1>
          <p className={`text-sm ${textMutedClass}`}>
            The Internet of the Students.
          </p>
        </div>

        <div className="border-t border-inherit pt-8 space-y-6 text-sm leading-relaxed">
          <section className="space-y-3">
            <h2 className="text-xl font-bold font-serif">Our Mission</h2>
            <p className={textMutedClass}>
              DojoClass is built specifically for college students to bridge the gap between academic responsibilities and collaborative study. Our mission is to provide students with a unified, distraction-free environment to manage their daily schedules, track class attendance, and study in real-time with their peers.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold font-serif">Core Features</h2>
            <ul className={`list-disc pl-5 space-y-2 ${textMutedClass}`}>
              <li>
                <strong>Smart Attendance Tracking:</strong> Monitor your subject-wise attendance in real-time and know exactly how many classes you can afford to bunk while staying safely above the 75% threshold.
              </li>
              <li>
                <strong>Timetable Timelines:</strong> Organize your weekly schedules with a clean, repeating class calendar.
              </li>
              <li>
                <strong>Interactive Study Rooms:</strong> Join secure, encrypted study rooms equipped with focus timers, chats, and audio/video calls to collaborate with classmates.
              </li>
              <li>
                <strong>Vibrant Campus Feed:</strong> Share notes, ask academic questions, and engage with your student community.
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold font-serif">Our Vision</h2>
            <p className={textMutedClass}>
              We believe that academic success shouldn't be lonely or disorganized. By bringing together productivity tools and community accountability under one roof, DojoClass empowers students to take complete control of their college lives.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
