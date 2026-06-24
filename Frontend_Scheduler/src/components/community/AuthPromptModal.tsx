'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { X, LogIn, UserPlus } from 'lucide-react';
import { useAuth } from '@/context/authContext';
import { useDarkMode } from '@/context/DarkModeContext';

export default function AuthPromptModal() {
  const [isOpen, setIsOpen] = useState(false);
  const { isAuthenticated } = useAuth() as any;
  const { darkMode } = useDarkMode();
  const router = useRouter();
  const pathname = usePathname();

  // Listen to open event
  useEffect(() => {
    const handleOpen = () => {
      setIsOpen(true);
    };

    window.addEventListener('open-auth-modal', handleOpen);
    return () => {
      window.removeEventListener('open-auth-modal', handleOpen);
    };
  }, []);

  // 20-second timer for mobile view on community page
  useEffect(() => {
    if (isAuthenticated || isOpen) return;

    // Check if shown in this session
    const hasShown = sessionStorage.getItem('hasShownAuthModalMobile');
    if (hasShown) return;

    // We only trigger this on the community feed
    if (pathname !== '/community') return;

    // Setup 20s timer (only for mobile viewports < 1280px)
    const timer = setTimeout(() => {
      const isMobile = window.innerWidth < 1280;
      if (isMobile) {
        setIsOpen(true);
        sessionStorage.setItem('hasShownAuthModalMobile', 'true');
      }
    }, 20000);

    return () => clearTimeout(timer);
  }, [isAuthenticated, pathname, isOpen]);

  if (!isOpen || isAuthenticated) return null;

  const handleLoginRedirect = () => {
    setIsOpen(false);
    router.push('/login');
  };

  const handleRegisterRedirect = () => {
    setIsOpen(false);
    router.push('/register');
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-end justify-center sm:items-center p-0 sm:p-4 animate-in fade-in duration-200">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => setIsOpen(false)}
      />

      {/* Modal Container */}
      <div
        className={`relative w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl border p-6 text-center shadow-2xl transition-all duration-300 transform translate-y-0 scale-100 animate-in slide-in-from-bottom-8 sm:slide-in-from-bottom-0 sm:zoom-in-95
          ${darkMode
            ? 'bg-zinc-900 border-zinc-800 text-white'
            : 'bg-white border-zinc-200 text-zinc-900'
          }`}
      >
        {/* Close Button */}
        <button
          onClick={() => setIsOpen(false)}
          className={`absolute right-4 top-4 p-1.5 rounded-full transition-colors ${darkMode
              ? 'hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200'
              : 'hover:bg-zinc-100 text-zinc-500 hover:text-zinc-800'
            }`}
          aria-label="Close modal"
        >
          <X size={18} />
        </button>

        {/* DojoClass Themed Minimal SVG */}
        <div className="flex justify-center mb-5 mt-2">
          <div className="relative group">
            <svg
              width="110"
              height="110"
              viewBox="0 0 120 120"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="transform group-hover:scale-105 transition-transform duration-300"
            >
              <defs>
                {/* Body 3D Shading Gradient */}
                <linearGradient id="rocketBodyGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#4f46e5" />
                  <stop offset="35%" stopColor="#818cf8" />
                  <stop offset="70%" stopColor="#4f46e5" />
                  <stop offset="100%" stopColor="#3730a3" />
                </linearGradient>
                
                <linearGradient id="rocketBodyGradDark" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#27272a" />
                  <stop offset="35%" stopColor="#52525b" />
                  <stop offset="70%" stopColor="#27272a" />
                  <stop offset="100%" stopColor="#18181b" />
                </linearGradient>

                {/* Wings Left 3D Shading */}
                <linearGradient id="wingLeftGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#6366f1" />
                  <stop offset="100%" stopColor="#312e81" />
                </linearGradient>

                {/* Wings Right 3D Shading */}
                <linearGradient id="wingRightGrad" x1="100%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#6366f1" />
                  <stop offset="100%" stopColor="#312e81" />
                </linearGradient>
              </defs>

              <style>{`
                svg {
                  perspective: 300px;
                  transform-style: preserve-3d;
                }
                @keyframes verticalFloatAndRotate {
                  0%, 100% { transform: translateY(4px) rotateY(-15deg); }
                  50% { transform: translateY(-12px) rotateY(15deg); }
                }
                @keyframes flameFlicker {
                  0%, 100% { transform: scaleY(1) scaleX(1); opacity: 0.85; }
                  50% { transform: scaleY(1.3) scaleX(1.1) translateY(1.5px); opacity: 1; }
                }
                @keyframes orbitRevolve {
                  0% { transform: rotate(0deg); }
                  100% { transform: rotate(360deg); }
                }
                @keyframes starSpin {
                  0% { transform: rotate(0deg); }
                  100% { transform: rotate(360deg); }
                }
                .rocket-g {
                  animation: verticalFloatAndRotate 4s ease-in-out infinite;
                  transform-origin: 60px 60px;
                  transform-style: preserve-3d;
                }
                .rocket-flame-1 {
                  animation: flameFlicker 0.12s ease-in-out infinite;
                  transform-origin: 60px 85px;
                }
                .rocket-flame-2 {
                  animation: flameFlicker 0.2s ease-in-out infinite;
                  transform-origin: 60px 85px;
                }
                .star-orbit-group {
                  animation: orbitRevolve 20s linear infinite;
                  transform-origin: 60px 60px;
                }
                .star-spin-1 { animation: starSpin 3s linear infinite; transform-origin: 25px 25px; }
                .star-spin-2 { animation: starSpin 4s linear infinite; transform-origin: 95px 35px; }
                .star-spin-3 { animation: starSpin 2.5s linear infinite; transform-origin: 30px 85px; }
                .star-spin-4 { animation: starSpin 3.5s linear infinite; transform-origin: 90px 80px; }
              `}</style>

              {/* Outer Dashed Zen Circle */}
              <circle
                cx="60"
                cy="60"
                r="50"
                className={darkMode ? 'stroke-indigo-500/20' : 'stroke-indigo-500/15'}
                strokeWidth="1.5"
                strokeDasharray="4 4"
              />
              {/* Inner Glowing Glow */}
              <circle
                cx="60"
                cy="60"
                r="42"
                className={darkMode ? 'fill-indigo-500/5 stroke-indigo-500/10' : 'fill-indigo-500/5 stroke-indigo-500/5'}
                strokeWidth="1"
              />

              {/* Animated Rocket Group - 3D Rendered & Enlarged */}
              <g className="rocket-g">
                {/* Flame Layer 1 (Outer Amber Plume) */}
                <path 
                  d="M52 85 C49 98, 60 108, 60 108 C60 108, 71 98, 68 85 Z" 
                  fill="currentColor"
                  className="text-amber-500/90 rocket-flame-1"
                />
                {/* Flame Layer 2 (Inner Yellow Core) */}
                <path 
                  d="M55 85 C54 94, 60 100, 60 100 C60 100, 66 94, 65 85 Z" 
                  fill="currentColor"
                  className="text-yellow-400 rocket-flame-2"
                />

                {/* Left Rocket Wing (3D shaded and larger) */}
                <path 
                  d="M48 62 C26 67, 22 84, 31 88 C39 91, 45 82, 48 74 Z" 
                  fill="url(#wingLeftGrad)"
                  stroke="currentColor" 
                  strokeWidth="2" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                  className="dark:stroke-indigo-400"
                />
                {/* Wing Highlight Panel */}
                <path 
                  d="M36 82 C42 80, 44 76, 46 70" 
                  stroke="#a5b4fc" 
                  strokeWidth="1.2" 
                  strokeLinecap="round"
                  className="opacity-70"
                />

                {/* Right Rocket Wing (3D shaded and larger) */}
                <path 
                  d="M72 62 C94 67, 98 84, 89 88 C81 91, 75 82, 72 74 Z" 
                  fill="url(#wingRightGrad)"
                  stroke="currentColor" 
                  strokeWidth="2" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                  className="dark:stroke-indigo-400"
                />
                {/* Wing Highlight Panel */}
                <path 
                  d="M84 82 C78 80, 76 76, 74 70" 
                  stroke="#a5b4fc" 
                  strokeWidth="1.2" 
                  strokeLinecap="round"
                  className="opacity-70"
                />

                {/* Rocket Engine Nozzle (3D curved base) */}
                <path 
                  d="M52 85 C52 85, 54 90, 60 90 C66 90, 68 85, 68 85 Z" 
                  fill="currentColor"
                  className="text-zinc-600 dark:text-zinc-400"
                  stroke="currentColor"
                  strokeWidth="1.5"
                />

                {/* Rocket Body (sleek 3D capsule with horizontal shadow wrap) */}
                <path 
                  d="M60 12 C72 28, 72 52, 72 85 H48 C48 52, 48 28, 60 12 Z" 
                  fill={darkMode ? 'url(#rocketBodyGradDark)' : 'url(#rocketBodyGrad)'}
                  stroke="currentColor" 
                  strokeWidth="2.2" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                  className="dark:stroke-zinc-700" 
                />

                {/* 3D Specular Highlight Line along left side of rocket body */}
                <path 
                  d="M52 24 C50.5 35, 50.5 52, 52 75" 
                  stroke="#ffffff" 
                  strokeWidth="1.5" 
                  strokeLinecap="round" 
                  className="opacity-45 pointer-events-none"
                />

                {/* Nose Cone colored tip with 3D gradient */}
                <path 
                  d="M60 12 C64.5 18, 67.5 25, 68 31 H52 C52.5 25, 55.5 18, 60 12 Z" 
                  fill="currentColor"
                  className="text-indigo-900 dark:text-indigo-300 opacity-20"
                />
                <path 
                  d="M60 12 C64.5 18, 67.5 25, 68 31 H52 C52.5 25, 55.5 18, 60 12 Z" 
                  stroke="currentColor"
                  strokeWidth="2"
                  className="text-indigo-600 dark:text-indigo-400"
                  fill="none"
                />

                {/* Double Ring 3D Porthole Window */}
                <circle 
                  cx="60" 
                  cy="48" 
                  r="8.5" 
                  stroke="currentColor" 
                  strokeWidth="2.2" 
                  className="text-indigo-500 dark:text-indigo-400 fill-indigo-900/10"
                />
                <circle 
                  cx="60" 
                  cy="48" 
                  r="5.5" 
                  stroke="currentColor" 
                  strokeWidth="1.2" 
                  className="text-indigo-400 dark:text-indigo-300 fill-zinc-50 dark:fill-zinc-900"
                />
                {/* Specular window reflection dot */}
                <circle 
                  cx="57.5" 
                  cy="45.5" 
                  r="1.2" 
                  fill="#ffffff" 
                  className="opacity-80"
                />
                
                {/* Body Panel line (vertical seam) */}
                <line 
                  x1="60" y1="60" x2="60" y2="85" 
                  stroke="currentColor" 
                  strokeWidth="1.5" 
                  className="text-indigo-500/30 dark:text-indigo-400/30"
                />
              </g>

              {/* Stars (Rotating, revolving & spinning background particles) */}
              <g className="star-orbit-group">
                {/* Star 1 (Top Left) */}
                <g className="star-spin-1">
                  <path 
                    d="M25 21 L26.2 23.5 L28.8 24 L27 25.8 L27.5 28.5 L25 27 L22.5 28.5 L23 25.8 L21.2 24 L23.8 23.5 Z" 
                    fill="currentColor" 
                    className="text-indigo-400" 
                  />
                </g>
                {/* Star 2 (Right) */}
                <g className="star-spin-2">
                  <circle cx="95" cy="35" r="2.5" fill="currentColor" className="text-violet-400" />
                </g>
                {/* Star 3 (Bottom Left) */}
                <g className="star-spin-3">
                  <circle cx="30" cy="85" r="1.8" fill="currentColor" className="text-indigo-400" />
                </g>
                {/* Star 4 (Bottom Right) */}
                <g className="star-spin-4">
                  <path 
                    d="M90 77 L91.2 79.5 L93.8 80 L92 81.8 L92.5 84.5 L90 83 L87.5 84.5 L88 81.8 L86.2 80 L88.8 79.5 Z" 
                    fill="currentColor" 
                    className="text-violet-400" 
                  />
                </g>
              </g>
            </svg>
          </div>
        </div>

        {/* Text Details */}
        <h3 className="text-xl font-bold mb-2 tracking-tight">
          Join the Dojo Community
        </h3>
        <p className={`text-[13.5px] leading-relaxed mb-6 px-2 ${darkMode ? 'text-zinc-400' : 'text-zinc-500'
          }`}>
          Log in or sign up to interact with posts, reply to comments, follow members, and explore community groups in the dojo.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col gap-2.5">
          <button
            onClick={handleLoginRedirect}
            className="flex items-center justify-center gap-2 w-full py-3 text-[14px] font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-all duration-200 active:scale-[0.98] shadow-md shadow-indigo-600/10"
          >
            <LogIn size={16} />
            <span>Log In</span>
          </button>

          <button
            onClick={handleRegisterRedirect}
            className={`flex items-center justify-center gap-2 w-full py-3 text-[14px] font-semibold border rounded-xl transition-all duration-200 active:scale-[0.98] ${darkMode
                ? 'border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:border-zinc-600'
                : 'border-zinc-300 text-zinc-750 hover:bg-zinc-50 hover:border-zinc-400'
              }`}
          >
            <UserPlus size={16} />
            <span>Create an Account</span>
          </button>
        </div>
      </div>
    </div>
  );
}
