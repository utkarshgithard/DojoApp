"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { useDarkMode } from "@/context/DarkModeContext";
import { useRouter } from "next/navigation";
import { CalendarCheck, Clock, Users, Sparkles, Compass, ArrowRight } from "lucide-react";

export function DirectionSetSection() {
  const { darkMode } = useDarkMode();
  const router = useRouter();
  const sectionRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(sectionRef, { once: false, amount: 0.3 });

  // Themes
  const bgStyle = darkMode ? "#2b2f38" : "#e4e9f2";
  const shadowLight = darkMode ? "#363b46" : "#ffffff";
  const shadowDark = darkMode ? "#15171c" : "#aab4c6";
  const textPrimary = darkMode ? "#e7ebf2" : "#2e3a4f";
  const textSecondary = darkMode ? "#8b94a7" : "#6b7588";
  const accent = darkMode ? "#5fd99a" : "#4caf82";
  const accentBg = darkMode ? "rgba(95,217,154,0.15)" : "rgba(76,175,130,0.15)";

  const cardShadow = `12px 12px 28px ${shadowDark}, -12px -12px 28px ${shadowLight}`;
  const insetShadow = `inset 4px 4px 8px ${shadowDark}, inset -4px -4px 8px ${shadowLight}`;

  // Journey milestones/icons along the path
  const pathMilestones = [
    { Icon: CalendarCheck, x: 90, y: 155, label: "Attendance Control", color: "#60a5fa" },
    { Icon: Clock, x: 220, y: 90, label: "Focus Analytics", color: "#f59e0b" },
    { Icon: Users, x: 380, y: 145, label: "Session Rooms", color: "#10b981" },
    { Icon: Sparkles, x: 500, y: 70, label: "Vibrant Community", color: "#a855f7" },
  ];

  return (
    <section
      ref={sectionRef}
      className="relative z-10 flex min-h-screen items-center justify-center overflow-hidden py-20 px-6 transition-colors duration-500"
      style={{ background: bgStyle }}
    >
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-12 lg:flex-row lg:gap-16">
        {/* Left Side: Copy and Neumorphic Info Card */}
        <motion.div
          initial={{ opacity: 0, x: -50 }}
          animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -50 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="flex flex-1 flex-col gap-6 text-left"
        >
          <div
            className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em]"
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              color: accent,
              background: accentBg,
              boxShadow: insetShadow,
            }}
          >
            <Compass className="animate-spin-slow" size={14} />
            Compass Calibrated
          </div>

          <h2
            className="text-4xl font-bold leading-tight tracking-tight text-[var(--neo-text-primary)] md:text-5xl"
            style={{
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              color: textPrimary,
            }}
          >
            Your Direction <br />
            is Set.
          </h2>

          <p
            className="text-base leading-relaxed"
            style={{
              fontFamily: "Inter, sans-serif",
              color: textSecondary,
            }}
          >
            No more wandering without a path. DojoClass acts as your academic compass, keeping your routines, tasks, and friends connected in a unified space designed specifically for student success.
          </p>

          <div className="mt-4 flex flex-wrap gap-4">
            <button
              onClick={() => router.push("/register")}
              className="neo-button flex items-center gap-2 rounded-full px-8 py-3.5 text-sm font-semibold transition-all duration-200 hover:scale-[1.03]"
              style={{
                fontFamily: "Inter, sans-serif",
                background: `linear-gradient(135deg, ${accent}, ${darkMode ? "#34d399" : "#34d399"})`,
              }}
            >
              Get Started Free <ArrowRight size={16} />
            </button>
            <button
              onClick={() => {
                const el = document.getElementById("how-it-works");
                if (el) el.scrollIntoView({ behavior: "smooth" });
              }}
              className="rounded-full px-6 py-3.5 text-sm font-semibold transition-all duration-200 hover:scale-[1.03]"
              style={{
                fontFamily: "Inter, sans-serif",
                color: textPrimary,
                boxShadow: cardShadow,
              }}
            >
              Explore Path
            </button>
          </div>
        </motion.div>

        {/* Right Side: Cool Interactive Animated SVG Path Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={isInView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.9 }}
          transition={{ duration: 0.7, delay: 0.2, ease: "easeOut" }}
          className="relative flex w-full max-w-[580px] justify-center rounded-[32px] p-6 lg:p-8 shrink-0"
          style={{
            boxShadow: cardShadow,
            background: bgStyle,
          }}
        >
          {/* Animated Road/Journey Map SVG */}
          <svg
            viewBox="0 0 600 240"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="w-full h-auto drop-shadow-lg"
          >
            {/* The Winding Path Shadow/Outline (for Neumorphic Depth) */}
            <path
              d="M 30 180 Q 90 180 120 150 T 220 90 T 320 120 T 420 150 T 520 70 L 570 70"
              stroke={darkMode ? "rgba(0,0,0,0.15)" : "rgba(0,0,0,0.06)"}
              strokeWidth="24"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* Main Path Inset Track */}
            <path
              d="M 30 180 Q 90 180 120 150 T 220 90 T 320 120 T 420 150 T 520 70 L 570 70"
              stroke={darkMode ? "#22252c" : "#d8dfeb"}
              strokeWidth="16"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* Animated glowing success line */}
            <motion.path
              d="M 30 180 Q 90 180 120 150 T 220 90 T 320 120 T 420 150 T 520 70 L 570 70"
              stroke={`url(#path-grad-${darkMode ? "dark" : "light"})`}
              strokeWidth="6"
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ strokeDasharray: "600", strokeDashoffset: "600" }}
              animate={isInView ? { strokeDashoffset: 0 } : { strokeDashoffset: 600 }}
              transition={{ duration: 2.2, ease: "easeInOut" }}
            />

            {/* Pulsing Finish Node */}
            <g transform="translate(570, 70)">
              <circle r="12" fill={accent} opacity="0.3" className="animate-ping" />
              <circle r="7" fill={accent} />
            </g>

            {/* Path Milestones */}
            {pathMilestones.map((milestone, idx) => {
              const { Icon, x, y, label, color } = milestone;
              return (
                <g key={idx} transform={`translate(${x}, ${y})`}>
                  {/* Neumorphic container for milestone icons */}
                  <motion.circle
                    r="20"
                    fill={bgStyle}
                    style={{ filter: "drop-shadow(2px 2px 4px rgba(0,0,0,0.15))" }}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={isInView ? { scale: 1, opacity: 1 } : { scale: 0, opacity: 0 }}
                    transition={{ delay: 0.4 + idx * 0.25, type: "spring", stiffness: 120 }}
                  />
                  {/* Inside glow for active step */}
                  <circle r="16" fill={darkMode ? "rgba(0,0,0,0.1)" : "rgba(255,255,255,0.4)"} />
                  {/* Milestone Icon */}
                  <g transform="translate(-8, -8)">
                    <Icon size={16} color={color} />
                  </g>
                  {/* Subtle Text Tag */}
                  <motion.text
                    y="-28"
                    textAnchor="middle"
                    fill={textSecondary}
                    fontSize="8.5"
                    fontWeight="600"
                    style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                    initial={{ opacity: 0, y: -20 }}
                    animate={isInView ? { opacity: 1, y: -28 } : { opacity: 0, y: -20 }}
                    transition={{ delay: 0.6 + idx * 0.25 }}
                  >
                    {label}
                  </motion.text>
                </g>
              );
            })}

            {/* Gradients */}
            <defs>
              <linearGradient id="path-grad-dark" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#8b5cf6" />
                <stop offset="50%" stopColor="#3b82f6" />
                <stop offset="100%" stopColor="#10b981" />
              </linearGradient>
              <linearGradient id="path-grad-light" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#a855f7" />
                <stop offset="50%" stopColor="#60a5fa" />
                <stop offset="100%" stopColor="#34d399" />
              </linearGradient>
            </defs>
          </svg>
        </motion.div>
      </div>
    </section>
  );
}
