"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { useDarkMode } from "@/context/DarkModeContext";
import { Compass, BarChart2, CheckCircle2 } from "lucide-react";

export function HowItWorksSection() {
  const { darkMode } = useDarkMode();
  const containerRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(containerRef, { once: false, amount: 0.2 });

  // Themes
  const bgStyle = darkMode ? "#2b2f38" : "#e4e9f2";
  const shadowLight = darkMode ? "#363b46" : "#ffffff";
  const shadowDark = darkMode ? "#15171c" : "#aab4c6";
  const textPrimary = darkMode ? "#e7ebf2" : "#2e3a4f";
  const textSecondary = darkMode ? "#8b94a7" : "#6b7588";
  const accent = darkMode ? "#5fd99a" : "#4caf82";

  const cardShadow = `12px 12px 28px ${shadowDark}, -12px -12px 28px ${shadowLight}`;
  const insetShadow = `inset 4px 4px 8px ${shadowDark}, inset -4px -4px 8px ${shadowLight}`;

  const steps = [
    {
      num: "01",
      Icon: Compass,
      title: "Set Your Compass",
      description: "Define your schedules, list your classes, and choose your academic target lines.",
    },
    {
      num: "02",
      Icon: BarChart2,
      title: "Track & Analyze",
      description: "Stay consistent with attendance, build focus metrics, and watch your dashboard align.",
    },
    {
      num: "03",
      Icon: CheckCircle2,
      title: "Achieve Success",
      description: "Collaborate in study rooms, check off tasks, and point your compass to victory.",
    },
  ];

  return (
    <section
      id="how-it-works"
      ref={containerRef}
      className="relative z-10 w-full py-24 px-6 transition-colors duration-500 overflow-hidden"
      style={{ background: bgStyle }}
    >
      <div className="mx-auto max-w-5xl text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ duration: 0.6 }}
          className="mb-16"
        >
          <span
            className="text-[11px] font-semibold uppercase tracking-[0.25em]"
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              color: accent,
            }}
          >
            Three Easy Steps
          </span>
          <h2
            className="mt-3 text-3xl font-bold tracking-tight md:text-4xl"
            style={{
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              color: textPrimary,
            }}
          >
            How DojoClass Works
          </h2>
        </motion.div>

        {/* Steps Grid */}
        <div className="relative grid grid-cols-1 gap-12 md:grid-cols-3">
          {/* Animated Connecting Line (Desktop) */}
          <div className="absolute top-[68px] left-[15%] right-[15%] h-[2px] hidden md:block" style={{ zIndex: 0 }}>
            <svg className="w-full h-full" fill="none">
              <motion.line
                x1="0"
                y1="0"
                x2="100%"
                y2="0"
                stroke={darkMode ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)"}
                strokeWidth="2"
                strokeDasharray="8,8"
              />
              <motion.line
                x1="0"
                y1="0"
                x2="100%"
                y2="0"
                stroke={accent}
                strokeWidth="2"
                strokeDasharray="8,8"
                initial={{ strokeDashoffset: 500 }}
                animate={isInView ? { strokeDashoffset: 0 } : { strokeDashoffset: 500 }}
                transition={{ duration: 4, ease: "linear", repeat: Infinity }}
              />
            </svg>
          </div>

          {steps.map((step, idx) => {
            const { num, Icon, title, description } = step;
            return (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 40 }}
                animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
                transition={{ duration: 0.6, delay: idx * 0.2 }}
                className="relative z-10 flex flex-col items-center rounded-3xl p-8 text-center transition-all duration-300 hover:translate-y-[-4px]"
                style={{
                  background: bgStyle,
                  boxShadow: cardShadow,
                }}
              >
                {/* Number badge inside Neumorphic Inset */}
                <div
                  className="mb-6 flex h-14 w-14 items-center justify-center rounded-full text-sm font-bold"
                  style={{
                    boxShadow: insetShadow,
                    color: accent,
                    fontFamily: "'JetBrains Mono', monospace",
                  }}
                >
                  {num}
                </div>

                {/* Step Icon inside a soft ring */}
                <div
                  className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl"
                  style={{
                    background: darkMode ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)",
                    border: darkMode ? "1px solid rgba(255,255,255,0.05)" : "1px solid rgba(0,0,0,0.04)",
                  }}
                >
                  <Icon size={22} className="text-purple-400" />
                </div>

                <h3
                  className="mb-3 text-lg font-bold"
                  style={{
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                    color: textPrimary,
                  }}
                >
                  {title}
                </h3>

                <p
                  className="text-xs leading-relaxed"
                  style={{
                    fontFamily: "Inter, sans-serif",
                    color: textSecondary,
                  }}
                >
                  {description}
                </p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
