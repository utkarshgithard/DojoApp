"use client";

import React, { createContext, useContext, useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { Play, Pause, Square, GripHorizontal } from "lucide-react";
import { useDarkMode } from "@/context/DarkModeContext";
import API from "@/lib/axios";

interface TimerContextType {
  time: number;
  setTime: React.Dispatch<React.SetStateAction<number>>;
  isRunning: boolean;
  setIsRunning: React.Dispatch<React.SetStateAction<boolean>>;
  totalFocusTime: number;
  setTotalFocusTime: React.Dispatch<React.SetStateAction<number>>;
  isCountdown: boolean;
  setIsCountdown: React.Dispatch<React.SetStateAction<boolean>>;
  initialCountdownTime: number;
  setInitialCountdownTime: React.Dispatch<React.SetStateAction<number>>;
  isFloating: boolean;
  setIsFloating: React.Dispatch<React.SetStateAction<boolean>>;
  stopTimer: () => void;
}

const TimerContext = createContext<TimerContextType | undefined>(undefined);

export const useTimer = () => {
  const context = useContext(TimerContext);
  if (!context) {
    throw new Error("useTimer must be used within a TimerProvider");
  }
  return context;
};

export const TimerProvider = ({ children }: { children: React.ReactNode }) => {
  const [mounted, setMounted] = useState(false);
  
  // Timer states
  const [time, setTime] = useState(0); // seconds
  const [isRunning, setIsRunning] = useState(false);
  const [totalFocusTime, setTotalFocusTime] = useState(0);
  const [isCountdown, setIsCountdown] = useState(false);
  const [initialCountdownTime, setInitialCountdownTime] = useState(0);

  // Floating timer states
  const [isFloating, setIsFloating] = useState(false);
  const [pos, setPos] = useState({ x: 40, y: 100 });
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<{ startX: number; startY: number; initialX: number; initialY: number } | null>(null);

  const { darkMode } = useDarkMode() as any;

  const syncStudyTime = async (seconds: number) => {
    if (typeof window === "undefined" || seconds <= 0) return;

    try {
      const today = new Date();
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth() + 1).padStart(2, "0");
      const dd = String(today.getDate()).padStart(2, "0");
      const date = `${yyyy}-${mm}-${dd}`;
      await API.post("/auth/study-time", { date, duration: seconds });
    } catch (error) {
      console.error("Failed to sync study time", error);
    }
  };

  // Load from local storage
  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedFocus = localStorage.getItem("examPrep_focusTime");
      if (storedFocus) setTotalFocusTime(parseInt(storedFocus, 10));
      setMounted(true);
    }
  }, []);

  // Save to local storage
  useEffect(() => {
    if (mounted) {
      localStorage.setItem("examPrep_focusTime", totalFocusTime.toString());
    }
  }, [totalFocusTime, mounted]);

  // Timer logic
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRunning) {
      interval = setInterval(() => {
        setTime((prev) => {
          if (isCountdown) {
            if (prev <= 1) {
              clearInterval(interval);
              setIsRunning(false);
              setTotalFocusTime((t) => {
                const nextValue = t + initialCountdownTime;
                void syncStudyTime(initialCountdownTime);
                return nextValue;
              });
              toast.success("Focus session completed!");
              setIsCountdown(false);
              setInitialCountdownTime(0);
              return 0;
            }
            return prev - 1;
          } else {
            return prev + 1;
          }
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRunning, isCountdown, initialCountdownTime]);

  const stopTimer = () => {
    setIsRunning(false);
    if (time > 0 || isCountdown) {
      const elapsed = isCountdown ? initialCountdownTime - time : time;
      if (elapsed > 0) {
        setTotalFocusTime((prev) => {
          const nextValue = prev + elapsed;
          void syncStudyTime(elapsed);
          return nextValue;
        });
        toast.success("Focus session logged!");
      }
      setTime(0);
      setIsCountdown(false);
      setInitialCountdownTime(0);
    }
  };

  const handleMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isFloating) return;
    setIsDragging(true);
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    dragRef.current = { startX: clientX, startY: clientY, initialX: pos.x, initialY: pos.y };
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent | TouchEvent) => {
      if (!isDragging || !dragRef.current) return;
      const clientX = 'touches' in e ? (e as TouchEvent).touches[0].clientX : (e as MouseEvent).clientX;
      const clientY = 'touches' in e ? (e as TouchEvent).touches[0].clientY : (e as MouseEvent).clientY;
      const dx = clientX - dragRef.current.startX;
      const dy = clientY - dragRef.current.startY;
      setPos({
        x: dragRef.current.initialX + dx,
        y: dragRef.current.initialY + dy
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      dragRef.current = null;
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('touchmove', handleMouseMove, { passive: false });
      window.addEventListener('touchend', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleMouseMove);
      window.removeEventListener('touchend', handleMouseUp);
    };
  }, [isDragging]);

  const formatTime = (totalSeconds: number) => {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const dark = darkMode;
  const muted = dark ? "text-gray-400" : "text-gray-500";

  return (
    <TimerContext.Provider
      value={{
        time,
        setTime,
        isRunning,
        setIsRunning,
        totalFocusTime,
        setTotalFocusTime,
        isCountdown,
        setIsCountdown,
        initialCountdownTime,
        setInitialCountdownTime,
        isFloating,
        setIsFloating,
        stopTimer,
      }}
    >
      {children}
      
      {/* Global Floating Timer UI */}
      {isFloating && mounted && (
        <div 
          onDoubleClick={() => setIsFloating(false)}
          onMouseDown={handleMouseDown}
          onTouchStart={handleMouseDown}
          className={`fixed z-40 p-6 rounded-3xl shadow-2xl cursor-move flex flex-col items-center select-none ${dark ? 'bg-gray-900 border border-gray-800' : 'bg-white border border-gray-200'}`}
          style={{ left: `${pos.x}px`, top: `${pos.y}px`, margin: 0 }}
        >
          <div className={`absolute top-2 right-4 ${muted} text-[10px] flex items-center gap-1 cursor-pointer hover:text-red-500 transition-colors`} onMouseDown={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()} onDoubleClick={(e) => e.stopPropagation()} onClick={() => setIsFloating(false)}>
            Double tap to dock
          </div>
          <div className={`mb-3 ${muted}`}>
            <GripHorizontal size={20} />
          </div>
          
          <div className="text-[48px] font-light tracking-wider mb-6 font-mono pointer-events-none">
            {formatTime(time)}
          </div>
          
          <div className="flex gap-4">
            {!isRunning ? (
              <button onMouseDown={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()} onDoubleClick={(e) => e.stopPropagation()} onClick={() => setIsRunning(true)} className="flex items-center gap-2 px-6 py-2.5 bg-green-500 hover:bg-green-600 text-white rounded-full font-medium transition-all active:scale-95">
                <Play size={16} fill="currentColor" /> {time > 0 ? "Resume" : "Start"}
              </button>
            ) : (
              <button onMouseDown={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()} onDoubleClick={(e) => e.stopPropagation()} onClick={() => setIsRunning(false)} className="flex items-center gap-2 px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-full font-medium transition-all active:scale-95">
                <Pause size={16} fill="currentColor" /> Pause
              </button>
            )}
            
            <button 
              onMouseDown={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()} onDoubleClick={(e) => e.stopPropagation()}
              onClick={stopTimer} 
              disabled={time === 0 && !isRunning}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-full font-medium transition-all ${
                time === 0 && !isRunning ? 'bg-gray-200 text-gray-400 dark:bg-gray-800 dark:text-gray-600 cursor-not-allowed' : 'bg-red-500 hover:bg-red-600 text-white active:scale-95'
              }`}
            >
              <Square size={16} fill="currentColor" /> Stop
            </button>
          </div>
        </div>
      )}
    </TimerContext.Provider>
  );
};
