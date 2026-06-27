"use client";

import { motion, useInView } from "framer-motion";
import { useRef, useState, useEffect } from "react";
import { useDarkMode } from "@/context/DarkModeContext";
import { getStudentAvatar } from "../landing/StudentAvatar";

export function TestimonialsSection() {
  const { darkMode } = useDarkMode();
  const sectionRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(sectionRef, { once: false, amount: 0.2 });

  // Themes
  const bgStyle = darkMode ? "#2b2f38" : "#e4e9f2";
  const shadowLight = darkMode ? "#363b46" : "#ffffff";
  const shadowDark = darkMode ? "#15171c" : "#aab4c6";
  const textPrimary = darkMode ? "#e7ebf2" : "#2e3a4f";
  const textSecondary = darkMode ? "#8b94a7" : "#6b7588";
  const accent = darkMode ? "#5fd99a" : "#4caf82";

  const cardShadow = `12px 12px 28px ${shadowDark}, -12px -12px 28px ${shadowLight}`;
  const insetShadow = `inset 4px 4px 8px ${shadowDark}, inset -4px -4px 8px ${shadowLight}`;

  const testimonials = [
    {
      quote: "DojoClass completely changed how I track attendance. I went from constant spreadsheet calculations to a simple widget look. Highly recommend!",
      name: "Ananya",
      role: "B.Tech CS Student",
    },
    {
      quote: "The focus analytics helped me realize I was wasting half my study hours. Now I set clean focus session goals and stick to them.",
      name: "Rohan",
      role: "Economics Major",
    },
    {
      quote: "We use the Session Rooms for exam prep. It's so much more organized than jumping on random video calls. The chat is super fast.",
      name: "Siddharth",
      role: "Pre-Med Student",
    },
  ];

  // Auto carousel for mobile view
  const [activeMobileIdx, setActiveMobileIdx] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveMobileIdx((prev) => (prev + 1) % testimonials.length);
    }, 4500);
    return () => clearInterval(interval);
  }, [testimonials.length]);

  return (
    <section
      ref={sectionRef}
      className="relative z-10 w-full py-24 px-6 transition-colors duration-500 overflow-hidden"
      style={{ background: bgStyle }}
    >
      <div className="mx-auto max-w-5xl">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ duration: 0.6 }}
          className="mb-16 text-center"
        >
          <span
            className="text-[11px] font-semibold uppercase tracking-[0.25em]"
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              color: accent,
            }}
          >
            Student Feedback
          </span>
          <h2
            className="mt-3 text-3xl font-bold tracking-tight md:text-4xl"
            style={{
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              color: textPrimary,
            }}
          >
            Loved by Students
          </h2>
        </motion.div>

        {/* Desktop View (Show all 3) */}
        <div className="hidden md:grid grid-cols-3 gap-8">
          {testimonials.map((t, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 40 }}
              animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
              transition={{ duration: 0.6, delay: idx * 0.2 }}
              className="flex flex-col justify-between rounded-3xl p-8 transition-all duration-300 hover:translate-y-[-4px]"
              style={{
                boxShadow: cardShadow,
                background: bgStyle,
              }}
            >
              <p
                className="mb-6 text-sm italic leading-relaxed"
                style={{
                  fontFamily: "Inter, sans-serif",
                  color: textSecondary,
                }}
              >
                "{t.quote}"
              </p>

              <div className="flex items-center gap-3.5 mt-auto">
                {/* Render Custom Avatar */}
                {getStudentAvatar(t.name, "w-11 h-11")}

                <div className="flex flex-col">
                  <span
                    className="text-xs font-bold"
                    style={{
                      fontFamily: "'Plus Jakarta Sans', sans-serif",
                      color: textPrimary,
                    }}
                  >
                    {t.name}
                  </span>
                  <span
                    className="text-[10px]"
                    style={{
                      fontFamily: "Inter, sans-serif",
                      color: textSecondary,
                    }}
                  >
                    {t.role}
                  </span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Mobile View (Animated Carousel) */}
        <div className="md:hidden flex flex-col items-center">
          <motion.div
            key={activeMobileIdx}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.4 }}
            className="flex w-full flex-col rounded-3xl p-7 min-h-[220px] justify-between"
            style={{
              boxShadow: cardShadow,
              background: bgStyle,
            }}
          >
            <p
              className="mb-5 text-xs italic leading-relaxed"
              style={{
                fontFamily: "Inter, sans-serif",
                color: textSecondary,
              }}
            >
              "{testimonials[activeMobileIdx].quote}"
            </p>

            <div className="flex items-center gap-3 mt-auto">
              {/* Render Custom Avatar */}
              {getStudentAvatar(testimonials[activeMobileIdx].name, "w-10 h-10")}

              <div className="flex flex-col">
                <span
                  className="text-xs font-bold"
                  style={{
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                    color: textPrimary,
                  }}
                >
                  {testimonials[activeMobileIdx].name}
                </span>
                <span
                  className="text-[9px]"
                  style={{
                    fontFamily: "Inter, sans-serif",
                    color: textSecondary,
                  }}
                >
                  {testimonials[activeMobileIdx].role}
                </span>
              </div>
            </div>
          </motion.div>

          {/* Dots Indicator */}
          <div className="flex items-center gap-2 mt-6">
            {testimonials.map((_, i) => (
              <button
                key={i}
                onClick={() => setActiveMobileIdx(i)}
                className="h-1.5 rounded-full transition-all duration-300"
                style={{
                  width: i === activeMobileIdx ? 16 : 6,
                  background: i === activeMobileIdx ? accent : (darkMode ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.15)"),
                }}
                aria-label={`Slide ${i + 1}`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
