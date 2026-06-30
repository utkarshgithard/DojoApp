"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Mail, Phone } from "lucide-react";
import { useDarkMode } from "@/context/DarkModeContext";

export default function ContactPage() {
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
          <span className="text-xs font-bold text-zinc-400 dark:text-zinc-500">CONTACT US</span>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-6 py-12 md:py-16 space-y-8">
        <div className="space-y-4">
          <h1 className="text-3xl md:text-4xl font-bold font-serif tracking-tight">
            Contact Us
          </h1>
          <p className={`text-sm ${textMutedClass}`}>
            Have questions or feedback? We'd love to hear from you.
          </p>
        </div>

        <div className="border-t border-inherit pt-8 space-y-8">
          <p className={textMutedClass}>
            Whether you are facing issues with attendance calculations, need help setting up your study rooms, or want to suggest new features for DojoClass, our support team is ready to help you.
          </p>

          <div className="grid gap-6 sm:grid-cols-2">
            <div className={`p-6 rounded-2xl border ${borderClass} bg-zinc-50/50 dark:bg-zinc-900/20 space-y-3`}>
              <div className="flex items-center gap-3 text-[#F4761C]">
                <Mail size={20} />
                <h3 className="font-bold font-serif">Email Support</h3>
              </div>
              <p className={`text-sm ${textMutedClass}`}>
                For general inquiries, account issues, or feature requests:
              </p>
              <a href="mailto:bceutkarsh@gmail.com" className="text-sm font-semibold text-[#F4761C] hover:underline block">
                bceutkarsh@gmail.com
              </a>
            </div>

            <div className={`p-6 rounded-2xl border ${borderClass} bg-zinc-50/50 dark:bg-zinc-900/20 space-y-3`}>
              <div className="flex items-center gap-3 text-[#F4761C]">
                <Phone size={20} />
                <h3 className="font-bold font-serif">Call or WhatsApp</h3>
              </div>
              <p className={`text-sm ${textMutedClass}`}>
                For urgent help or immediate support:
              </p>
              <a href="tel:+919508761011" className="text-sm font-semibold text-[#F4761C] hover:underline block">
                +91 9508761011
              </a>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
