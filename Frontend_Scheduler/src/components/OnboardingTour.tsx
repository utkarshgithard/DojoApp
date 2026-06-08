"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowRight, X, HelpCircle, CheckCircle } from 'lucide-react';
import { useDarkMode } from '@/context/DarkModeContext';

interface TourStep {
  title: string;
  description: string;
  targetId?: string; // DOM ID to highlight
  actionHint?: string;
}

const STEPS: TourStep[] = [
  {
    title: "Welcome to DojoClass! ⛩️",
    description: "Let's take a quick 1-minute tour of your smart, distraction-free attendance workspace. We'll introduce you to your essential tools.",
    actionHint: "Click Next to start the tour"
  },
  {
    title: "Your Workspace Dashboard 📊",
    description: "This is your main dashboard. Track your classes, visualize your weekly progress, and see if you are meeting the 75% attendance threshold.",
    targetId: "sidebar-item-dashboard",
    actionHint: "Click Dashboard to log classes and view attendance stats"
  },
  {
    title: "Joint Study Sessions 👥",
    description: "Create and join real-time study rooms with your friends. Features End-to-End Encrypted chat, session timing extensions, and live peer indicators.",
    targetId: "sidebar-item-sessions",
    actionHint: "Click here to create study rooms and invite peers"
  },
  {
    title: "Classmate Network 🤝",
    description: "Connect with peers using unique, shareable Friend Codes. View their online status and sync schedules for joint learning.",
    targetId: "sidebar-item-friends",
    actionHint: "Click here to manage friends and view active connections"
  },
  {
    title: "Schedule Planner ⏰",
    description: "Add your subjects, class timings, and recurring days. DojoClass uses this to generate your daily class logs automatically.",
    targetId: "sidebar-item-add-classes",
    actionHint: "Click here to set up your weekly class schedule"
  },
  {
    title: "Academic Calendar 📅",
    description: "Browse past attendance records, mark college holidays, and view a comprehensive day-by-day log of your attendance status.",
    targetId: "sidebar-item-calendar",
    actionHint: "Click here to browse logs and modify calendar entries"
  },
  {
    title: "Account Settings ⚙️",
    description: "Customize your DojoClass profile, set up an avatar, toggle theme modes, or replay this onboarding tour at any time.",
    targetId: "sidebar-item-settings",
    actionHint: "Click here to update settings or profile info"
  },
  {
    title: "You're All Set! 🚀",
    description: "Enjoy a smarter way to manage your college classes and never fall below the 75% limit. Click below to enter your workspace!",
    actionHint: "Click Finish to complete the tour"
  }
];

export default function OnboardingTour() {
  const { darkMode } = useDarkMode() as any;
  const [stepIndex, setStepIndex] = useState(-1); // -1 means checking localStorage or loading
  const [coords, setCoords] = useState<{ top: number; left: number; width: number; height: number } | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  // Handle window resizing and mobile layout detection
  useEffect(() => {
    const checkMobileAndTour = () => {
      const isMobileView = window.innerWidth < 768;
      setIsMobile(isMobileView);
      
      if (isMobileView) {
        setStepIndex(-2); // Disable/hide tour completely on mobile view
        return;
      }
      
      if (stepIndex === -1) {
        const completed = localStorage.getItem('dojo_onboarding_completed');
        if (completed === 'true') {
          setStepIndex(-2); // -2 means fully completed, don't show
        } else {
          setStepIndex(0); // Start the tour
        }
      }
    };

    checkMobileAndTour();
    window.addEventListener('resize', checkMobileAndTour);
    return () => window.removeEventListener('resize', checkMobileAndTour);
  }, [stepIndex]);

  // Track position of the highlighted sidebar link
  useEffect(() => {
    if (stepIndex < 0 || isMobile) {
      setCoords(null);
      return;
    }

    const currentStep = STEPS[stepIndex];
    if (!currentStep.targetId) {
      setCoords(null);
      return;
    }

    const updatePosition = () => {
      const el = document.getElementById(currentStep.targetId!);
      if (el) {
        const rect = el.getBoundingClientRect();
        setCoords({
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height
        });
      } else {
        setCoords(null);
      }
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition);

    // Timeout fallback for transitions
    const timeout = setTimeout(updatePosition, 150);

    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition);
      clearTimeout(timeout);
    };
  }, [stepIndex, isMobile]);

  if (stepIndex < 0) return null;

  const currentStep = STEPS[stepIndex];
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === STEPS.length - 1;
  const hasTarget = !!currentStep.targetId && coords;

  const handleNext = () => {
    if (isLast) {
      completeTour();
    } else {
      setStepIndex(prev => prev + 1);
    }
  };

  const handleBack = () => {
    if (!isFirst) {
      setStepIndex(prev => prev - 1);
    }
  };

  const completeTour = () => {
    localStorage.setItem('dojo_onboarding_completed', 'true');
    setStepIndex(-2);
  };

  const dark = darkMode;
  
  // Floating styling for the card next to sidebar
  const cardStyle: React.CSSProperties = hasTarget && !isMobile
    ? {
        position: 'fixed',
        top: `${coords.top + coords.height / 2}px`,
        left: `${coords.left + coords.width + 16}px`,
        transform: 'translateY(-50%)',
        zIndex: 100,
      }
    : {
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 100,
      };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] pointer-events-none">
        
        {/* Darkening mask overlays */}
        {hasTarget && !isMobile ? (
          /* Invisible overlay that handles clicking outside to exit the tour */
          <div 
            className="fixed inset-0 pointer-events-auto bg-transparent"
            onClick={completeTour}
          />
        ) : (
          /* Full-screen darken overlay for welcome / finish steps */
          <div 
            className="fixed inset-0 pointer-events-auto bg-black/50 backdrop-blur-[1px]"
            onClick={completeTour}
          />
        )}

        {/* Dynamic target highlight container (spotlight overlay on link) */}
        {hasTarget && !isMobile && (
          <div 
            className="fixed z-[100] border-2 border-indigo-500 dark:border-indigo-400 rounded-xl shadow-[0_0_0_9999px_rgba(0,0,0,0.5),0_0_20px_rgba(99,102,241,0.3)] pointer-events-none animate-pulse-slow"
            style={{
              top: `${coords.top - 4}px`,
              left: `${coords.left - 4}px`,
              width: `${coords.width + 8}px`,
              height: `${coords.height + 8}px`,
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
          />
        )}

        {/* Guided Tooltip Card Wrapper */}
        <div style={cardStyle}>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className={`pointer-events-auto w-[320px] sm:w-[350px] p-5 rounded-2xl border shadow-2xl backdrop-blur-lg ${
              dark 
                ? 'bg-zinc-950/95 border-zinc-800 text-white' 
                : 'bg-white/95 border-zinc-200 text-zinc-900'
            }`}
          >
            {/* Arrow pointing to the target link on desktop */}
            {hasTarget && !isMobile && (
              <div className="absolute right-full top-1/2 -translate-y-1/2 w-0 h-0 border-t-[8px] border-t-transparent border-b-[8px] border-b-transparent border-r-[10px] border-r-white dark:border-r-zinc-950 filter drop-shadow-[-1px_0_1px_rgba(0,0,0,0.1)]"></div>
            )}

            {/* Close button */}
            <button
              onClick={completeTour}
              className={`absolute top-3.5 right-3.5 p-1 rounded-lg transition-colors ${
                dark ? 'hover:bg-zinc-900 text-zinc-400' : 'hover:bg-zinc-100 text-zinc-500'
              }`}
              title="Skip Tour"
            >
              <X size={15} />
            </button>

            {/* Icon indicator header */}
            <div className="flex items-center gap-2 mb-3.5">
              {isLast ? (
                <CheckCircle className="size-5 text-green-500" />
              ) : (
                <HelpCircle className="size-5 text-indigo-500 animate-pulse" />
              )}
              <span className={`text-[10px] font-bold uppercase tracking-widest ${dark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                Dojo Walkthrough &bull; Step {stepIndex + 1} of {STEPS.length}
              </span>
            </div>

            {/* Title & Body Description */}
            <h3 className="text-[17px] font-semibold tracking-tight mb-2 pr-5">
              {currentStep.title}
            </h3>
            <p className={`text-[13px] leading-relaxed mb-4 ${dark ? 'text-zinc-400' : 'text-zinc-650'}`}>
              {currentStep.description}
            </p>

            {/* Helper hint */}
            {currentStep.actionHint && (
              <p className={`text-[10.5px] italic mb-5 ${dark ? 'text-zinc-600' : 'text-zinc-450'}`}>
                Tip: {currentStep.actionHint}
              </p>
            )}

            {/* Footer Navigation Buttons */}
            <div className="flex items-center justify-between pt-3 border-t border-zinc-100 dark:border-zinc-900">
              {/* Skip Tour Button */}
              <button
                onClick={completeTour}
                className={`text-[12px] font-medium transition-colors ${
                  dark ? 'text-zinc-500 hover:text-zinc-300' : 'text-zinc-400 hover:text-zinc-600'
                }`}
              >
                Skip
              </button>

              <div className="flex gap-2">
                {/* Back Button */}
                {!isFirst && (
                  <button
                    onClick={handleBack}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-lg border text-[13px] font-medium transition-all hover:opacity-85 active:scale-95 ${
                      dark 
                        ? 'border-zinc-800 bg-zinc-900 text-zinc-200 hover:bg-zinc-850' 
                        : 'border-zinc-200 bg-zinc-50 text-zinc-700 hover:bg-zinc-100'
                    }`}
                  >
                    <ArrowLeft size={14} />
                    <span>Back</span>
                  </button>
                )}

                {/* Next / Finish Button */}
                <button
                  onClick={handleNext}
                  className={`flex items-center gap-1.5 px-5 py-2 rounded-lg text-[13px] font-semibold tracking-wide transition-all hover:opacity-90 active:scale-95 ${
                    dark 
                      ? 'bg-white text-black hover:bg-zinc-100' 
                      : 'bg-black text-white hover:bg-zinc-900'
                  }`}
                >
                  <span>{isLast ? 'Finish' : 'Next'}</span>
                  {!isLast && <ArrowRight size={14} />}
                </button>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Injected custom micro-animations style */}
        <style dangerouslySetInnerHTML={{__html: `
          @keyframes pulseSlow {
            0%, 100% { opacity: 0.4; }
            50% { opacity: 0.8; }
          }
          .animate-pulse-slow {
            animation: pulseSlow 2s ease-in-out infinite;
          }
        `}} />
      </div>
    </AnimatePresence>
  );
}
