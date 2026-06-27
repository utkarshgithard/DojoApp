"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { useDarkMode } from "@/context/DarkModeContext";

export default function PrivacyPolicy() {
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
          <span className="text-xs font-bold text-zinc-405 dark:text-zinc-500">PRIVACY POLICY</span>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-6 py-12 md:py-16 space-y-8">
        <div className="space-y-4">
          <h1 className="text-3xl md:text-4xl font-bold font-serif tracking-tight">
            Privacy Policy
          </h1>
          <p className={`text-xs ${textMutedClass}`}>
            Last Updated: June 18, 2026
          </p>
        </div>

        <div className="border-t border-inherit pt-8 space-y-6 text-sm leading-relaxed">
          <section className="space-y-3">
            <h2 className="text-xl font-bold font-serif">1. Introduction</h2>
            <p className={textMutedClass}>
              Welcome to DojoClass. We are committed to protecting your personal information and your right to privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website (https://dojoclass.space) and use our attendance tracking and study group features.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold font-serif">2. Information We Collect</h2>
            <p className={textMutedClass}>
              To provide you with our tracking and collaboration services, we collect information in the following ways:
            </p>
            <ul className={`list-disc pl-5 space-y-2 ${textMutedClass}`}>
              <li>
                <strong>Account Credentials:</strong> When you sign up using Google Sign-In or magic link, we collect your email address, full name, and profile picture (via Firebase Authentication).
              </li>
              <li>
                <strong>Academic Data:</strong> We store attendance entries, schedules, subjects, and study room details you create to synchronize them across your devices.
              </li>
              <li>
                <strong>Usage Data:</strong> We may collect technical logs such as IP addresses, browser types, and access times to ensure system performance and security.
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold font-serif">3. How We Use Your Information</h2>
            <p className={textMutedClass}>
              We use the collected information for the following purposes:
            </p>
            <ul className={`list-disc pl-5 space-y-2 ${textMutedClass}`}>
              <li>To create, manage, and security-authenticate your account.</li>
              <li>To calculate and present your subject-wise attendance statistics.</li>
              <li>To facilitate encrypted study sessions, chat rooms, and peer accountability buddy streaks.</li>
              <li>To maintain, analyze, and optimize platform safety and performance.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold font-serif">4. Data Security & Encryption</h2>
            <p className={textMutedClass}>
              Security is a core feature of DojoClass.
            </p>
            <ul className={`list-disc pl-5 space-y-2 ${textMutedClass}`}>
              <li>All database connections are secured via SSL.</li>
              <li>Your study session chats and group peer calls utilize end-to-end encryption architecture to prevent unauthorized interception.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold font-serif">5. Your Data Choices & Rights</h2>
            <p className={textMutedClass}>
              We respect your rights to your data:
            </p>
            <ul className={`list-disc pl-5 space-y-2 ${textMutedClass}`}>
              <li>
                <strong>Data Deletion:</strong> You can purge your subject statistics or attendance records directly from your dashboard at any time.
              </li>
              <li>
                <strong>Account Removal:</strong> You can contact us to request the complete deletion of your account and credentials from our active databases.
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold font-serif">6. Contact Us</h2>
            <p className={textMutedClass}>
              If you have questions, comments, or requests regarding this Privacy Policy, please contact us at:
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
