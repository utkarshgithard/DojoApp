"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { useDarkMode } from "@/context/DarkModeContext";

export default function TermsOfService() {
  const router = useRouter();
  const { darkMode } = useDarkMode() as any;
  const dark = darkMode;

  const bgClass = dark ? "bg-[#09090B] text-zinc-100" : "bg-white text-[#1C1917]";
  const borderClass = dark ? "border-zinc-800" : "border-[#EBEAE4]";
  const textMutedClass = dark ? "text-zinc-400" : "text-[#6A635B]";

  return (
    <div className={`min-h-screen transition-colors duration-500 font-sans ${bgClass}`}>
      {/* Header */}
      <header className={`sticky top-0 z-50 backdrop-blur-md border-b transition-colors duration-300 ${dark ? "bg-[#09090B]/85 border-zinc-800/80" : "bg-white/85 border-[#EBEAE4]/80"
        }`}>
        <div className="max-w-4xl mx-auto px-6 py-4 flex justify-between items-center">
          <button
            onClick={() => router.push("/")}
            className="flex items-center gap-2 text-sm font-semibold tracking-tight font-serif hover:opacity-80 transition-opacity"
          >
            <ArrowLeft size={16} />
            <span>DojoClass</span>
          </button>
          <span className="text-xs font-bold text-zinc-405 dark:text-zinc-500">TERMS OF SERVICE</span>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-6 py-12 md:py-16 space-y-8">
        <div className="space-y-4">
          <h1 className="text-3xl md:text-4xl font-bold font-serif tracking-tight">
            Terms of Service
          </h1>
          <p className={`text-xs ${textMutedClass}`}>
            Last Updated: June 18, 2026
          </p>
        </div>

        <div className="border-t border-inherit pt-8 space-y-6 text-sm leading-relaxed">
          <section className="space-y-3">
            <h2 className="text-xl font-bold font-serif">1. Acceptance of Terms</h2>
            <p className={textMutedClass}>
              By accessing or using DojoClass Service, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not access or use our Service.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold font-serif">2. Account Registration & Security</h2>
            <p className={textMutedClass}>
              To access core features of DojoClass, you must sign up using Google Sign-In or magic link.
            </p>
            <ul className={`list-disc pl-5 space-y-2 ${textMutedClass}`}>
              <li>You agree to provide accurate, current, and complete registration info.</li>
              <li>You are responsible for safeguarding your credentials and browser sessions.</li>
              <li>You must notify us immediately of any unauthorized use of your account.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold font-serif">3. Permitted Use</h2>
            <p className={textMutedClass}>
              DojoClass is designed to help students track attendance, build schedules, and join study sessions.
            </p>
            <ul className={`list-disc pl-5 space-y-2 ${textMutedClass}`}>
              <li>You agree not to use the Service for any unlawful activities.</li>
              <li>You agree not to bypass security parameters, run unauthorized automated scripts, or compromise study room encryption.</li>
              <li>You must respect other students in group calls and study sessions. Aggressive, malicious, or inappropriate behavior will result in account termination.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold font-serif">4. Disclaimers & Accuracy</h2>
            <p className={textMutedClass}>
              DojoClass provides attendance calculation and timetable forecasting tools as a helpful guide for academic management.
            </p>
            <p className={`font-semibold ${dark ? "text-amber-400" : "text-amber-700"}`}>
              DojoClass is NOT affiliated with any official college or university administration database. The attendance calculations and skip margins predicted by DojoClass are estimates. You are solely responsible for ensuring your official college attendance criteria are met.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold font-serif">5. Termination</h2>
            <p className={textMutedClass}>
              We reserve the right to suspend or terminate your access to DojoClass at our sole discretion, without notice, for conduct that we believe violates these Terms of Service or is harmful to other users of the Service.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold font-serif">6. Contact Information</h2>
            <p className={textMutedClass}>
              If you have any questions or feedback about these Terms of Service, please contact us at:
            </p>
            <div className={`p-5 rounded-xl border ${borderClass} bg-zinc-50 dark:bg-zinc-900/40 text-xs md:text-sm font-semibold`}>
              <p>Email: bceutkarsh@gmail.com</p>
              <p className="mt-1">Phone: +91 9508761011</p>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
