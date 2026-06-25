/* eslint-disable react/no-unescaped-entities */
"use client";

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useDarkMode } from '@/context/DarkModeContext';
import { useAuth } from '@/context/authContext';

// Landing Page Components
import { LandingHeader } from '@/components/landing/LandingHeader';
import { LandingHero } from '@/components/landing/LandingHero';
import { LandingAbout } from '@/components/landing/LandingAbout';
import { LandingFeatures } from '@/components/landing/LandingFeatures';
import { LandingTestimonials } from '@/components/landing/LandingTestimonials';
import { LandingFaq } from '@/components/landing/LandingFaq';
import { LandingFooter } from '@/components/landing/LandingFooter';

export default function LandingPage() {
  const router = useRouter();
  const { darkMode } = useDarkMode() as any;
  const { isAuthenticated, loading } = useAuth();

  useEffect(() => {
    if (!loading && isAuthenticated) {
      router.push('/community');
    }
  }, [isAuthenticated, loading, router]);

  const dark = darkMode;

  // Custom styles based on active theme
  const bgClass = dark ? 'bg-[#09090B] text-zinc-100' : 'bg-white text-[#1C1917]';
  const textMutedClass = dark ? 'text-zinc-400' : 'text-[#6A635B]';
  const cardBgClass = dark ? 'bg-[#18181B] border-zinc-800' : 'bg-[#FAF9F5] border-[#EBEAE4]';

  return (
    <div className={`min-h-screen transition-colors duration-500 font-sans ${bgClass}`}>
      <meta name="google-site-verification" content="MH-qCpIalYR4S1flnD1CRaPx_tUMSziNE9Y6cLpgdnI" />
      <style>{`
        @keyframes strokeDash {
          to {
            stroke-dashoffset: -20;
          }
        }
        .animate-connection-line {
          stroke-dasharray: 6 6;
          animation: strokeDash 1.5s linear infinite;
        }
        @keyframes checkPop {
          0% { transform: scale(0); opacity: 0; }
          80% { transform: scale(1.15); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        .animate-check-pop {
          animation: checkPop 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
        @keyframes lockClick {
          0% { transform: scale(0.6) rotate(-15deg); opacity: 0; }
          50% { transform: scale(1.25) rotate(10deg); }
          70% { transform: scale(0.9) rotate(-5deg); }
          100% { transform: scale(1) rotate(0deg); opacity: 1; }
        }
        .animate-lock-click {
          animation: lockClick 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
        @keyframes unlockClick {
          0% { transform: scale(0.6) rotate(15deg); opacity: 0; }
          50% { transform: scale(1.25) rotate(-10deg); }
          70% { transform: scale(0.9) rotate(5deg); }
          100% { transform: scale(1) rotate(0deg); opacity: 1; }
        }
        .animate-unlock-click {
          animation: unlockClick 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
        @keyframes vibrateAnimation {
          0%, 100% { transform: scale(1) rotate(0deg); }
          5%, 25% { transform: scale(1.05) rotate(-3deg); }
          10%, 30% { transform: scale(1.05) rotate(3deg); }
          15%, 35% { transform: scale(1.05) rotate(-2deg); }
          20%, 40% { transform: scale(1.05) rotate(2deg); }
          45% { transform: scale(1) rotate(0deg); }
        }
        .animate-vibrate {
          animation: vibrateAnimation 1.6s ease-in-out infinite;
        }
        @keyframes messageExchange {
          0% { left: 0%; transform: scale(0.7); opacity: 0; }
          10%, 40% { opacity: 1; }
          48% { left: 100%; transform: scale(1.15) translateX(-100%); opacity: 1; }
          50% { left: 100%; transform: scale(0.7) translateX(-100%); opacity: 0; }
          52% { left: 100%; transform: scale(0.7) translateX(-100%); opacity: 0; }
          60%, 90% { opacity: 1; }
          98% { left: 0%; transform: scale(1.15) translateX(0%); opacity: 1; }
          100% { left: 0%; transform: scale(0.7) translateX(0%); opacity: 0; }
        }
        .animate-message-exchange {
          animation: messageExchange 3.5s cubic-bezier(0.4, 0, 0.2, 1) infinite;
        }
        @keyframes floatYou {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
        .animate-float-you {
          animation: floatYou 3s ease-in-out infinite;
        }
        @keyframes floatAnanya {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
        .animate-float-ananya {
          animation: floatAnanya 3s ease-in-out infinite;
          animation-delay: 1.5s;
        }
        @keyframes headlineSlideIn {
          0% { transform: translateY(14px); opacity: 0; filter: blur(3px); }
          100% { transform: translateY(0); opacity: 1; filter: blur(0); }
        }
        .animate-headline-slide {
          animation: headlineSlideIn 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
      `}</style>

      <LandingHeader dark={dark} />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 md:py-12 space-y-16 md:space-y-32">
        <LandingHero dark={dark} textMutedClass={textMutedClass} />
        <LandingAbout dark={dark} textMutedClass={textMutedClass} />
        <LandingFeatures dark={dark} textMutedClass={textMutedClass} cardBgClass={cardBgClass} />
        <LandingTestimonials dark={dark} textMutedClass={textMutedClass} cardBgClass={cardBgClass} />
      </main>

      <LandingFaq dark={dark} textMutedClass={textMutedClass} />
      <LandingFooter dark={dark} />
    </div>
  );
}