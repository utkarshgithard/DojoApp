import { motion, AnimatePresence } from "framer-motion";
import React, { useState, useEffect } from "react";
import { useDarkMode } from "@/context/DarkModeContext";
import { useRouter } from "next/navigation";

interface CardProps {
  isActive: boolean;
  index?: number;
  isLeftSide?: boolean;
}

// Animated Counter
function AnimatedCounter({ target, isActive, suffix = "%" }: { target: number; isActive: boolean; suffix?: string }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!isActive) { setCount(0); return; }
    let start = 0;
    const duration = 1000;
    const startTime = Date.now();
    const timer = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      start = Math.round(eased * target);
      setCount(start);
      if (progress >= 1) clearInterval(timer);
    }, 16);
    return () => clearInterval(timer);
  }, [isActive, target]);
  return <span>{count}{suffix}</span>;
}

// Premium Neumorphic Card Wrapper
function NeumorphicCard({ isActive, children, index = 0, isLeftSide = false }: { isActive: boolean; children: React.ReactNode; index?: number; isLeftSide?: boolean; }) {
  const { darkMode } = useDarkMode();

  // Custom neumorphic variables matched to the requested design spec
  const bgStyle = darkMode ? "#2b2f38" : "#e4e9f2";
  const shadowLight = darkMode ? "#363b46" : "#ffffff";
  const shadowDark = darkMode ? "#15171c" : "#aab4c6";
  const borderStyle = darkMode ? "1px solid rgba(255,255,255,0.02)" : "1px solid rgba(255,255,255,0.4)";

  const shadowStyle = `10px 10px 24px ${shadowDark}, -10px -10px 24px ${shadowLight}`;

  return (
    <motion.div
      animate={{ opacity: isActive ? 1 : 0, y: isActive ? 0 : 12, scale: isActive ? 1 : 0.95 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1], delay: index * 0.01 }}
      className="relative rounded-[20px] lg:rounded-[24px] xl:rounded-[28px] overflow-hidden flex flex-col gap-3 xl:gap-4 p-4 lg:p-5 xl:p-7 w-full max-w-[220px] xl:max-w-[280px]"
      style={{
        background: bgStyle,
        border: borderStyle,
        boxShadow: shadowStyle,
      }}
    >
      <div className="relative z-10 flex flex-col gap-3 xl:gap-4">{children}</div>
    </motion.div>
  );
}

function Eyebrow({ direction, label, isActive }: { direction: string; label: string; isActive: boolean }) {
  const { darkMode } = useDarkMode();
  const accent = darkMode ? "#5fd99a" : "#4caf82";
  const shadowLight = darkMode ? "#363b46" : "#ffffff";
  const shadowDark = darkMode ? "#15171c" : "#aab4c6";
  const textSecondary = darkMode ? "#8b94a7" : "#6b7588";

  const badgeShadow = `inset 2px 2px 4px ${shadowDark}, inset -2px -2px 4px ${shadowLight}`;

  return (
    <div className="flex items-center justify-between">
      <span
        className="text-[10px] xl:text-[12px] font-bold tracking-[0.14em] uppercase px-2 py-0.5 xl:px-2.5 xl:py-1 rounded-full shrink-0 flex items-center gap-1"
        style={{
          background: darkMode ? "#2b2f38" : "#e4e9f2",
          boxShadow: badgeShadow,
          color: isActive ? accent : textSecondary,
          fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          transition: "color 0.4s"
        }}
      >
        <Bolt size={10} className="shrink-0" />
        {direction}&nbsp;&middot;&nbsp;{label}
      </span>
      <motion.div
        animate={{
          background: isActive ? (darkMode ? "#1f3a2d" : "#dcf0e6") : "transparent"
        }}
        transition={{ duration: 0.4 }}
        className="w-5 h-5 xl:w-6 xl:h-6 rounded-full flex items-center justify-center shrink-0"
        style={{
          boxShadow: isActive
            ? (darkMode ? "inset 2px 2px 4px #14271d, inset -2px -2px 4px #2a4f3c" : "inset 2px 2px 4px #b9d6c6, inset -2px -2px 4px #ffffff")
            : `3px 3px 6px ${shadowDark}, -3px -3px 6px ${shadowLight}`
        }}
      >
        <svg className="w-2 xl:w-2.5 h-2 xl:h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} style={{ color: isActive ? accent : textSecondary }}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
        </svg>
      </motion.div>
    </div>
  );
}

function CardHeadline({ children, isActive }: { children: React.ReactNode; isActive: boolean }) {
  const { darkMode } = useDarkMode();
  const textPrimary = darkMode ? "#e7ebf2" : "#2e3a4f";
  const textSecondary = darkMode ? "#8b94a7" : "#6b7588";
  return (
    <h4 className="text-[15px] xl:text-[20px] font-bold leading-snug tracking-tight" style={{ color: isActive ? textPrimary : textSecondary, fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", transition: "color 0.4s" }}>
      {children}
    </h4>
  );
}

function QuoteLine({ children, isActive }: { children: React.ReactNode; isActive: boolean }) {
  const { darkMode } = useDarkMode();
  const accent = darkMode ? "#5fd99a" : "#4caf82";
  const textSecondary = darkMode ? "#8b94a7" : "#6b7588";
  return (
    <div className="pl-2 xl:pl-3 border-l-2 text-[12px] xl:text-[15px] leading-relaxed" style={{ borderColor: isActive ? accent : "rgba(100,100,120,0.15)", color: isActive ? (darkMode ? "#e7ebf2" : "#2e3a4f") : textSecondary, fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", transition: "border-color 0.4s, color 0.4s" }}>
      {children}
    </div>
  );
}

function StatsRow({ stats, isActive }: { stats: { value: string | number; label: string; isCounter?: boolean; target?: number; suffix?: string }[]; isActive: boolean }) {
  const { darkMode } = useDarkMode();
  const textPrimary = darkMode ? "#e7ebf2" : "#2e3a4f";
  const textSecondary = darkMode ? "#8b94a7" : "#6b7588";
  return (
    <div className="flex items-start gap-3 xl:gap-4">
      {stats.map((s, i) => (
        <div key={i} className="flex flex-col">
          <span className="text-[14px] xl:text-[18px] font-bold leading-none tracking-tight" style={{ color: isActive ? textPrimary : textSecondary, fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", transition: "color 0.4s" }}>
            {s.isCounter ? <AnimatedCounter target={s.target ?? 0} isActive={isActive} suffix={s.suffix ?? ""} /> : s.value}
          </span>
          <span className="text-[8px] xl:text-[9px] mt-0.5 leading-tight" style={{ color: textSecondary, fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", transition: "color 0.4s" }}>
            {s.label}
          </span>
        </div>
      ))}
    </div>
  );
}

function CardCTA({ label, isActive, onClick }: { label: string; isActive: boolean; onClick?: () => void }) {
  const { darkMode } = useDarkMode();
  const accent = darkMode ? "#5fd99a" : "#4caf82";
  const textSecondary = darkMode ? "#8b94a7" : "#6b7588";
  const shadowLight = darkMode ? "#363b46" : "#ffffff";
  const shadowDark = darkMode ? "#15171c" : "#aab4c6";

  const buttonShadow = isActive
    ? (darkMode ? "inset 3px 3px 6px #14271d, inset -3px -3px 6px #2a4f3c" : "inset 3px 3px 6px #b9d6c6, inset -3px -3px 6px #ffffff")
    : `4px 4px 8px ${shadowDark}, -4px -4px 8px ${shadowLight}`;

  return (
    <motion.button onClick={onClick} whileHover={{ scale: isActive ? 1.03 : 1 }} whileTap={{ scale: isActive ? 0.97 : 1 }} className="w-full flex items-center justify-between px-3 py-2 xl:px-4 xl:py-2.5 rounded-full text-[9px] xl:text-[11px] font-bold overflow-hidden relative"
      style={{
        background: isActive ? (darkMode ? "#1f3a2d" : "#dcf0e6") : (darkMode ? "#2b2f38" : "#e4e9f2"),
        boxShadow: buttonShadow,
        border: "none",
        color: isActive ? accent : textSecondary,
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        transition: "background 0.4s, color 0.4s"
      }}>
      <span>{label}</span>
      <motion.svg className="w-3.5 h-3.5 xl:w-4 xl:h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} animate={isActive ? { x: [0, 3, 0] } : { x: 0 }} transition={{ duration: 1.5, repeat: isActive ? Infinity : 0, repeatDelay: 2, ease: "easeInOut" }}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
      </motion.svg>
    </motion.button>
  );
}

import { Bolt, CalendarCheck, ListTodo, BookOpen, Check } from "lucide-react";

// 1. Attendance Card
export function AttendanceCard({ isActive, index = 0, isLeftSide = false }: CardProps) {
  const { darkMode } = useDarkMode();

  // Dynamic color definitions to match neumorphic style for both modes
  const textPrimary = darkMode ? "rgba(240, 235, 255, 0.97)" : "#2e3a4f";
  const textSecondary = darkMode ? "rgba(160, 150, 200, 0.55)" : "#6b7588";

  // Shadows for neumorphic flow circles
  const circleBg = darkMode ? "#161622" : "#f0f2f5";
  const shadowLight = darkMode ? "rgba(255, 255, 255, 0.02)" : "#ffffff";
  const shadowDark = darkMode ? "rgba(0, 0, 0, 0.65)" : "#aab4c6";

  const circleShadowNormal = `4px 4px 8px ${shadowDark}, -4px -4px 8px ${shadowLight}`;

  // Pressed accent style (green)
  const pressedBg = darkMode ? "rgba(76, 175, 130, 0.12)" : "#dcf0e6";
  const pressedShadow = darkMode
    ? "inset 3px 3px 6px rgba(0, 0, 0, 0.8), inset -3px -3px 6px rgba(255, 255, 255, 0.03)"
    : "inset 3px 3px 6px #b9d6c6, inset -3px -3px 6px #ffffff";

  // Inset badge style
  const badgeShadow = darkMode
    ? "inset 2px 2px 4px rgba(0, 0, 0, 0.7), inset -2px -2px 4px rgba(255, 255, 255, 0.02)"
    : "inset 2px 2px 5px #aab4c6, inset -2px -2px 5px #ffffff";

  return (
    <NeumorphicCard isActive={isActive} index={index} isLeftSide={isLeftSide}>
      {/* Top section: Badge + Content */}
      <div className="flex flex-col gap-2 text-left">

        <Eyebrow direction="N" label="synced instantly" isActive={isActive} />

        <CardHeadline isActive={isActive}>Get back the hours you used to spend calculating</CardHeadline>

        <QuoteLine isActive={isActive}>Attendance, tasks, and exam prep tracked separately cost real time. One system, one tap.</QuoteLine>
      </div>




      {/* Bottom section: Flow chart + Footer */}
      <div className="flex flex-col gap-3 mt-1.5">
        <div className="flex items-center justify-between px-0.5">
          {/* Node 1 */}
          <div className="flex flex-col items-center gap-1 shrink-0">
            <div
              className="w-6 h-6 xl:w-8 xl:h-8 rounded-full flex items-center justify-center transition-shadow"
              style={{ background: circleBg, boxShadow: circleShadowNormal }}
            >
              <CalendarCheck className="w-3 h-3 xl:w-3.5 xl:h-3.5" style={{ color: textSecondary }} />
            </div>
            <span className="text-[8px] xl:text-[10px]" style={{ color: textSecondary }}>attendance</span>
          </div>

          <span className="text-[7px] xl:text-[9px] font-bold" style={{ color: textSecondary }}>+</span>

          {/* Node 2 */}
          <div className="flex flex-col items-center gap-1 shrink-0">
            <div
              className="w-6 h-6 xl:w-8 xl:h-8 rounded-full flex items-center justify-center transition-shadow"
              style={{ background: circleBg, boxShadow: circleShadowNormal }}
            >
              <ListTodo className="w-3 h-3 xl:w-3.5 xl:h-3.5" style={{ color: textSecondary }} />
            </div>
            <span className="text-[8px] xl:text-[10px]" style={{ color: textSecondary }}>tasks</span>
          </div>

          <span className="text-[7px] xl:text-[9px] font-bold" style={{ color: textSecondary }}>+</span>

          {/* Node 3 */}
          <div className="flex flex-col items-center gap-1 shrink-0">
            <div
              className="w-6 h-6 xl:w-8 xl:h-8 rounded-full flex items-center justify-center transition-shadow"
              style={{ background: circleBg, boxShadow: circleShadowNormal }}
            >
              <BookOpen className="w-3 h-3 xl:w-3.5 xl:h-3.5" style={{ color: textSecondary }} />
            </div>
            <span className="text-[8px] xl:text-[10px]" style={{ color: textSecondary }}>exam prep</span>
          </div>

          <span className="text-[7px] xl:text-[9px] font-bold" style={{ color: textSecondary }}>&rarr;</span>

          {/* Node 4 (Pressed Green) */}
          <div className="flex flex-col items-center gap-1 shrink-0">
            <div
              className="w-6 h-6 xl:w-8 xl:h-8 rounded-full flex items-center justify-center transition-shadow"
              style={{ background: pressedBg, boxShadow: pressedShadow }}
            >
              <Check className="w-3 h-3 xl:w-3.5 xl:h-3.5" style={{ color: "#4caf82" }} />
            </div>
            <span className="text-[8px] xl:text-[10px] font-bold" style={{ color: "#4caf82" }}>one tap</span>
          </div>
        </div>

        {/* Footer */}
        <div
          className="flex justify-between text-[7px] xl:text-[8px] pt-2"
          style={{
            borderTop: darkMode ? "1px solid rgba(255, 255, 255, 0.05)" : "1px solid #ffffff",
            boxShadow: darkMode ? "0 -1px 0 rgba(0, 0, 0, 0.5)" : "0 -1px 0 #c7cedb",
            color: textSecondary,
            fontFamily: "'Plus Jakarta Sans', sans-serif"
          }}
        >
          <span>updated automatically</span>
          <span>no manual tracking</span>
        </div>
      </div>
    </NeumorphicCard>
  );
}

// 2. Analytics Card
export function AnalyticsCard({ isActive, index = 1, isLeftSide = false }: CardProps) {
  const bars = [{ h: 40, label: "M" }, { h: 70, label: "T" }, { h: 45, label: "W" }, { h: 90, label: "T" }, { h: 60, label: "F" }];
  return (
    <NeumorphicCard isActive={isActive} index={index} isLeftSide={isLeftSide}>
      <Eyebrow direction="NE" label="Analytics" isActive={isActive} />
      <CardHeadline isActive={isActive}>Focus Hours,<br />Visualized Daily.</CardHeadline>
      <QuoteLine isActive={isActive}>Break down study time by subject and find your peak hours.</QuoteLine>
      <StatsRow isActive={isActive} stats={[{ value: "", isCounter: true, target: 18, suffix: "h", label: "This week" }, { value: "5", label: "Subjects" }]} />
      <div className="flex items-end gap-1.5 h-8 xl:h-[42px]">
        {bars.map((bar, i) => (
          <div key={i} className="flex flex-col items-center gap-1 flex-1">
            <div className="w-full rounded-sm relative overflow-hidden h-6 xl:h-8" style={{ background: "rgba(60,45,100,0.35)", border: "1px solid rgba(80,60,140,0.2)" }}>
              <motion.div className="absolute bottom-0 w-full rounded-sm" style={{ background: i === 3 ? "linear-gradient(to top, #a855f7, #c084fc)" : "linear-gradient(to top, #7c3aed, #a855f7)" }} initial={{ height: 0 }} animate={{ height: isActive ? `${bar.h}%` : "0%" }} transition={{ duration: 0.7, delay: 0.2 + i * 0.08, ease: [0.22, 1, 0.36, 1] }} />
            </div>
            <span className="text-[7px] xl:text-[8px] font-medium" style={{ color: isActive ? "rgba(160,140,220,0.6)" : "rgba(90,70,140,0.3)", fontFamily: "'Plus Jakarta Sans', sans-serif", transition: "color 0.4s" }}>{bar.label}</span>
          </div>
        ))}
      </div>
      <CardCTA label="Open Analytics" isActive={isActive} />
    </NeumorphicCard>
  );
}

import { getStudentAvatar } from "../landing/StudentAvatar";

// 3. Session Rooms Card
export function SessionRoomsCard({ isActive, index = 2, isLeftSide = false }: CardProps) {
  const names = ["Ananya", "Rohan", "Siddharth"];
  return (
    <NeumorphicCard isActive={isActive} index={index} isLeftSide={isLeftSide}>
      <Eyebrow direction="E" label="Sessions" isActive={isActive} />
      <CardHeadline isActive={isActive}>Study Together,<br />Stay Private.</CardHeadline>
      <QuoteLine isActive={isActive}>End-to-end encrypted rooms — only your group can read it.</QuoteLine>
      <StatsRow isActive={isActive} stats={[{ value: "15+", label: "Online now" }, { value: "", isCounter: true, target: 48, suffix: "K+", label: "Sessions hosted" }]} />
      <div className="flex items-center gap-2">
        <div className="flex items-center">
          {names.map((name, i) => (
            <motion.div key={i} className="relative ml-[-6px] xl:ml-[-8px] first:ml-0" style={{ zIndex: names.length - i }} initial={{ scale: 0, opacity: 0 }} animate={isActive ? { scale: 1, opacity: 1 } : { scale: 0.7, opacity: 0.3 }} transition={{ delay: 0.1 + i * 0.1, type: "spring", stiffness: 400, damping: 22 }}>
              {getStudentAvatar(name, "w-5.5 h-5.5 xl:w-7 xl:h-7")}
            </motion.div>
          ))}
          <AnimatePresence>
            {isActive && (
              <motion.div initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0, opacity: 0 }} transition={{ delay: 0.4, type: "spring", stiffness: 400, damping: 22 }} className="relative w-5.5 h-5.5 xl:w-7 xl:h-7 rounded-full border xl:border-2 flex items-center justify-center text-[7.5px] xl:text-[9px] font-bold ml-[-6px] xl:ml-[-8px]" style={{ background: "rgba(100,70,200,0.3)", borderColor: "#12101e", color: "rgba(180,150,255,0.85)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>+12</motion.div>
            )}
          </AnimatePresence>
        </div>
        <motion.span animate={{ opacity: isActive ? 1 : 0 }} transition={{ delay: 0.5, duration: 0.4 }} className="text-[8px] xl:text-[10px]" style={{ color: "rgba(140,120,220,0.7)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>active now</motion.span>
      </div>
      <CardCTA label="Join a Session" isActive={isActive} />
    </NeumorphicCard>
  );
}

// 4. Community Card
export function CommunityCard({ isActive, index = 3, isLeftSide = false }: CardProps) {
  const { darkMode } = useDarkMode();
  const router = useRouter();
  const tags = darkMode
    ? [{ label: "Calculus", color: "rgba(168,85,247,0.95)" }, { label: "Physics", color: "rgba(96,165,250,0.95)" }, { label: "CS Algo", color: "rgba(52,211,153,0.95)" }]
    : [{ label: "Calculus", color: "rgba(107,33,168,0.9)" }, { label: "Physics", color: "rgba(30,64,175,0.9)" }, { label: "CS Algo", color: "rgba(6,95,70,0.9)" }];
    
  return (
    <NeumorphicCard isActive={isActive} index={index} isLeftSide={isLeftSide}>
      <Eyebrow direction="S" label="Community" isActive={isActive} />
      <CardHeadline isActive={isActive}>Learn Together,<br />Grow Faster.</CardHeadline>
      <QuoteLine isActive={isActive}>Share resources, solve doubts, and stay accountable with peers.</QuoteLine>
      <StatsRow isActive={isActive} stats={[{ value: "3", label: "New posts" }, { value: "120+", label: "Active members" }]} />
      <div className="flex flex-wrap gap-1.5">
        {tags.map((tag, i) => (
          <motion.span key={i} initial={{ opacity: 0, scale: 0.85 }} animate={isActive ? { opacity: 1, scale: 1 } : { opacity: 0.25, scale: 0.9 }} transition={{ delay: 0.15 + i * 0.07, duration: 0.35, ease: [0.22, 1, 0.36, 1] }} className="flex items-center gap-1 px-1.5 py-0.5 xl:px-2 rounded-full text-[8px] xl:text-[9.5px] font-semibold" style={{ background: darkMode ? "rgba(60,45,100,0.5)" : "rgba(130,100,220,0.15)", border: darkMode ? "1px solid rgba(100,80,180,0.25)" : "1px solid rgba(130,100,200,0.3)", color: tag.color, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            <span className="w-1 h-1 xl:w-1.5 xl:h-1.5 rounded-full shrink-0" style={{ background: tag.color }} />
            {tag.label}
          </motion.span>
        ))}
        <div className="relative flex items-center gap-1 px-1.5 py-0.5 xl:px-2 rounded-full text-[8px] xl:text-[9.5px] font-semibold" style={{ background: darkMode ? "rgba(60,45,100,0.5)" : "rgba(130,100,220,0.15)", border: darkMode ? "1px solid rgba(100,80,180,0.25)" : "1px solid rgba(130,100,200,0.3)", color: darkMode ? "rgba(200,170,255,0.9)" : "rgba(107,33,168,0.9)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          <span className="relative w-1 h-1 xl:w-1.5 xl:h-1.5 rounded-full bg-purple-500 shrink-0" />
          3 New
        </div>
      </div>
      <CardCTA label="Explore Community" isActive={isActive} onClick={() => router.push("/community")} />
    </NeumorphicCard>
  );
}

// 5. Management Card
export function ManagementCard({ isActive, index = 4, isLeftSide = false }: CardProps) {
  const { darkMode } = useDarkMode();
  const tasks = [{ label: "Exam Prep", progress: 75, on: true }, { label: "Lab Report", progress: 30, on: false }];
  return (
    <NeumorphicCard isActive={isActive} index={index} isLeftSide={isLeftSide}>
      <Eyebrow direction="SW" label="Management" isActive={isActive} />
      <CardHeadline isActive={isActive}>Your Routine,<br />Always in Sync.</CardHeadline>
      <QuoteLine isActive={isActive}>Tasks, exams, and attendance — unified in one place.</QuoteLine>
      <StatsRow isActive={isActive} stats={[{ value: "< 5 min", label: "Setup time" }, { value: "100%", label: "Sync rate" }]} />
      <div className="flex flex-col gap-2">
        {tasks.map((task, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 5 }} animate={isActive ? { opacity: 1, y: 0 } : { opacity: 0.3, y: 4 }} transition={{ delay: 0.2 + i * 0.1, duration: 0.45, ease: [0.22, 1, 0.36, 1] }} className="flex flex-col gap-1.5 px-2 py-1.5 xl:px-2.5 xl:py-2 rounded-lg" style={{ background: darkMode ? "rgba(50,38,90,0.4)" : "rgba(130,100,220,0.12)", border: darkMode ? "1px solid rgba(90,70,160,0.2)" : "1px solid rgba(130,100,220,0.25)" }}>
            <div className="flex items-center justify-between">
              <span className="text-[8px] xl:text-[10px] font-semibold" style={{ color: darkMode ? "rgba(200,185,255,0.75)" : "rgba(70,50,110,0.85)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{task.label}</span>
              <motion.div className="w-5.5 h-3 xl:w-7 xl:h-3.5 rounded-full flex items-center px-[2px] xl:px-[3px]" animate={{ background: isActive && task.on ? (darkMode ? "rgba(120,70,220,0.7)" : "rgba(100,50,200,0.6)") : (darkMode ? "rgba(60,50,100,0.5)" : "rgba(180,170,220,0.4)"), justifyContent: isActive && task.on ? "flex-end" : "flex-start" }} transition={{ duration: 0.4 }}>
                <motion.div className="w-2 h-2 xl:w-2.5 xl:h-2.5 rounded-full shadow-sm" style={{ background: "rgba(255,255,255,0.95)" }} layout transition={{ type: "spring", stiffness: 500, damping: 30 }} />
              </motion.div>
            </div>
            <div className="w-full h-0.5 xl:h-1 rounded-full overflow-hidden" style={{ background: darkMode ? "rgba(60,50,100,0.5)" : "rgba(180,160,220,0.3)" }}>
              <motion.div className="h-full rounded-full" style={{ background: isActive && task.on ? "linear-gradient(90deg, #7c3aed, #a855f7)" : (darkMode ? "rgba(100,80,180,0.2)" : "rgba(140,120,200,0.2)") }} initial={{ width: 0 }} animate={{ width: isActive ? `${task.progress}%` : "0%" }} transition={{ duration: 0.8, delay: 0.35 + i * 0.1, ease: [0.22, 1, 0.36, 1] }} />
            </div>
          </motion.div>
        ))}
      </div>
      <CardCTA label="Open Planner" isActive={isActive} />
    </NeumorphicCard>
  );
}

// 6. Journey Card
export function JourneyCard({ isActive, index = 5, isLeftSide = false }: CardProps) {
  const router = useRouter();
  return (
    <NeumorphicCard isActive={isActive} index={index} isLeftSide={isLeftSide}>
      <Eyebrow direction="W" label="Get Started Today" isActive={isActive} />
      <CardHeadline isActive={isActive}>Start Your Journey.</CardHeadline>
      <QuoteLine isActive={isActive}>Your first step is free, forever.</QuoteLine>
      <StatsRow isActive={isActive} stats={[{ value: "< 5 min", label: "Setup time" }, { value: "Forever", label: "Free tier" }, { value: "48K+", label: "Students" }]} />
      <motion.button onClick={() => router.push("/register")} whileHover={{ scale: isActive ? 1.04 : 1 }} whileTap={{ scale: isActive ? 0.97 : 1 }} className="w-full flex items-center justify-between px-3 py-2.5 xl:px-4 xl:py-3 rounded-xl text-[10px] xl:text-[13px] font-bold overflow-hidden relative shadow-md hover:shadow-lg"
        style={{ background: isActive ? "linear-gradient(135deg, #7c3aed, #a855f7)" : "rgba(40,30,80,0.15)", border: `1px solid ${isActive ? "rgba(168,85,247,0.4)" : "rgba(60,50,120,0.15)"}`, color: isActive ? "#ffffff" : "rgba(120,100,180,0.4)", fontFamily: "'Plus Jakarta Sans', sans-serif", transition: "background 0.4s, border-color 0.4s, color 0.4s", boxShadow: isActive ? "0 4px 20px rgba(124,58,237,0.35)" : "none" }}>
        <AnimatePresence>
          {isActive && (
            <motion.div initial={{ x: "-100%", opacity: 0 }} animate={{ x: "200%", opacity: [0, 0.35, 0] }} transition={{ duration: 2.2, delay: 0.5, repeat: Infinity, repeatDelay: 3.5, ease: "easeInOut" }} className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent pointer-events-none" />
          )}
        </AnimatePresence>
        <span className="relative z-10">Create Free Account</span>
        <motion.span className="relative z-10 text-[13px] xl:text-[16px] leading-none" animate={isActive ? { x: [0, 4, 0] } : { x: 0 }} transition={{ duration: 1.6, repeat: isActive ? Infinity : 0, repeatDelay: 2, ease: "easeInOut" }}>→</motion.span>
      </motion.button>
    </NeumorphicCard>
  );
}

// Export Config
export const dynamicFeatures = [
  { id: 0, angle: 45, direction: "N", icon: "CalendarCheck", Component: AttendanceCard, title: "Smart Attendance Tracking", description: "Never guess how many classes you can afford to miss." },
  { id: 1, angle: 90, direction: "NE", icon: "Users", Component: SessionRoomsCard, title: "Live Session Rooms", description: "Study and collaborate with peers seamlessly." },
  { id: 2, angle: 135, direction: "E", icon: "Sparkles", Component: CommunityCard, title: "Vibrant Community", description: "Share resources and solve problems together." },
  { id: 3, angle: 225, direction: "S", icon: "Clock", Component: AnalyticsCard, title: "Time & Focus Analytics", description: "Visualize your study habits." },
  { id: 4, angle: 270, direction: "SW", icon: "BarChart3", Component: ManagementCard, title: "Seamless Management", description: "Sync tasks, exams, and routines instantly." },
  { id: 5, angle: 315, direction: "W", icon: "Navigation", Component: JourneyCard, title: "Start Your Journey", description: "Ready to take control of your academic life?" },
];
