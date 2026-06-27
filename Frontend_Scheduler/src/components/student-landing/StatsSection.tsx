"use client";

import { motion, useInView } from "framer-motion";
import { useRef, useState, useEffect } from "react";
import { useDarkMode } from "@/context/DarkModeContext";

function StatCounter({ target, suffix = "", isActive }: { target: number; suffix?: string; isActive: boolean }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!isActive) {
      setCount(0);
      return;
    }
    let start = 0;
    const duration = 1200; // ms
    const startTime = Date.now();

    const timer = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // Cubic ease out
      setCount(Math.round(eased * target));

      if (progress >= 1) {
        clearInterval(timer);
      }
    }, 16);

    return () => clearInterval(timer);
  }, [isActive, target]);

  return (
    <span>
      {count.toLocaleString()}
      {suffix}
    </span>
  );
}

export function StatsSection() {
  const { darkMode } = useDarkMode();
  const sectionRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(sectionRef, { once: false, amount: 0.3 });

  // Themes
  const bgStyle = darkMode ? "#2b2f38" : "#e4e9f2";
  const shadowLight = darkMode ? "#363b46" : "#ffffff";
  const shadowDark = darkMode ? "#15171c" : "#aab4c6";
  const textPrimary = darkMode ? "#e7ebf2" : "#2e3a4f";
  const textSecondary = darkMode ? "#8b94a7" : "#6b7588";
  const accent = darkMode ? "#5fd99a" : "#4caf82";

  const cardShadow = `12px 12px 28px ${shadowDark}, -12px -12px 28px ${shadowLight}`;
  const insetShadow = `inset 4px 4px 8px ${shadowDark}, inset -4px -4px 8px ${shadowLight}`;

  const stats = [
    { target: 2500, suffix: "+", label: "Active Students" },
    { target: 15000, suffix: "+", label: "Study Hours Logged" },
    { target: 98, suffix: "%", label: "Avg Attendance Rate" },
    { target: 5000, suffix: "+", label: "Peer Doubts Solved" },
  ];

  return (
    <section
      ref={sectionRef}
      className="relative z-10 w-full py-20 px-6 transition-colors duration-500 overflow-hidden"
      style={{ background: bgStyle }}
    >
      <div className="mx-auto max-w-5xl">
        <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
          {stats.map((stat, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={isInView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.5, delay: idx * 0.12 }}
              className="flex flex-col items-center justify-center rounded-3xl p-4 sm:p-6 md:p-8"
              style={{
                boxShadow: cardShadow,
                background: bgStyle,
              }}
            >
              {/* Stat value in an inset well */}
              <div
                className="mb-4 flex h-16 sm:h-20 w-full items-center justify-center rounded-2xl text-[16px] sm:text-2xl md:text-3xl font-bold"
                style={{
                  boxShadow: insetShadow,
                  color: accent,
                  fontFamily: "'JetBrains Mono', monospace",
                }}
              >
                <StatCounter target={stat.target} suffix={stat.suffix} isActive={isInView} />
              </div>

              <span
                className="text-center text-[8.5px] sm:text-xs font-semibold uppercase tracking-wider"
                style={{
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  color: textSecondary,
                }}
              >
                {stat.label}
              </span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
