"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { useDarkMode } from "@/context/DarkModeContext";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

export function FooterSection() {
  const { darkMode } = useDarkMode();
  const sectionRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(sectionRef, { once: false, amount: 0.15 });

  // Themes
  const bgStyle = darkMode ? "#2b2f38" : "#e4e9f2";
  const shadowLight = darkMode ? "#363b46" : "#ffffff";
  const shadowDark = darkMode ? "#15171c" : "#aab4c6";
  const textPrimary = darkMode ? "#e7ebf2" : "#2e3a4f";
  const textSecondary = darkMode ? "#8b94a7" : "#6b7588";
  const accent = darkMode ? "#5fd99a" : "#4caf82";
  const footerLineColor = darkMode ? "#1a1d23" : "#c7cedb";

  const cardShadow = `12px 12px 28px ${shadowDark}, -12px -12px 28px ${shadowLight}`;
  const insetShadow = `inset 4px 4px 8px ${shadowDark}, inset -4px -4px 8px ${shadowLight}`;
  const navLinkShadow = `4px 4px 8px ${shadowDark}, -4px -4px 8px ${shadowLight}`;

  return (
    <footer
      ref={sectionRef}
      className="relative z-10 w-full py-20 px-6 transition-colors duration-500 overflow-hidden"
      style={{ background: bgStyle }}
    >
      <div className="mx-auto max-w-5xl">
        {/* Large Final CTA Block */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
          transition={{ duration: 0.7 }}
          className="rounded-[32px] p-8 md:p-14 text-center mb-16"
          style={{
            boxShadow: cardShadow,
            background: bgStyle,
          }}
        >
          <h2
            className="text-3xl font-bold tracking-tight text-[var(--neo-text-primary)] md:text-4xl mb-4"
            style={{
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              color: textPrimary,
            }}
          >
            Ready to Take Control?
          </h2>
          <p
            className="text-sm max-w-lg mx-auto mb-8 leading-relaxed"
            style={{
              fontFamily: "Inter, sans-serif",
              color: textSecondary,
            }}
          >
            Join thousands of students who are staying on top of attendance, managing exams, and collaborating in real-time.
          </p>

          <div className="flex flex-wrap justify-center gap-4">
            <Link
              href="/register"
              className="neo-button flex items-center gap-2 rounded-full px-8 py-3.5 text-sm font-semibold transition-all duration-200 hover:scale-[1.03] text-white"
              style={{
                fontFamily: "Inter, sans-serif",
                background: `linear-gradient(135deg, ${accent}, ${darkMode ? "#34d399" : "#34d399"})`,
              }}
            >
              Get Started Now <ArrowUpRight size={16} />
            </Link>
            <Link
              href="/login"
              className="rounded-full px-6 py-3.5 text-sm font-semibold transition-all duration-200 hover:scale-[1.03] flex items-center justify-center"
              style={{
                fontFamily: "Inter, sans-serif",
                color: textPrimary,
                boxShadow: insetShadow,
              }}
            >
              Log In
            </Link>
          </div>
        </motion.div>

        {/* Footer Navigation Link Bar */}
        <div
          className="pt-10 flex flex-col md:flex-row items-center justify-between gap-6 border-t"
          style={{ borderColor: footerLineColor }}
        >
          {/* Logo brand */}
          <div className="flex items-center gap-2">
            <span
              className="text-lg font-bold tracking-wide"
              style={{
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                color: textPrimary,
              }}
            >
              Dojo<span style={{ color: accent }}>Class</span>
            </span>
          </div>

          {/* Links */}
          <div className="flex flex-wrap justify-center gap-3">
            {[
              { label: "About", path: "/about" },
              { label: "Privacy", path: "/privacy" },
              { label: "Terms", path: "/terms" },
              { label: "Contact", path: "/contact" },
            ].map((link, i) => (
              <Link
                key={i}
                href={link.path}
                className="rounded-full px-4.5 py-2 text-xs font-semibold transition-all duration-200 hover:scale-[1.03] flex items-center justify-center"
                style={{
                  fontFamily: "Inter, sans-serif",
                  color: textSecondary,
                  boxShadow: navLinkShadow,
                  background: bgStyle,
                }}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Copyright */}
          <span
            className="text-[10px]"
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              color: textSecondary,
            }}
          >
            © {new Date().getFullYear()} DojoClass. All rights reserved.
          </span>
        </div>
      </div>
    </footer>
  );
}
