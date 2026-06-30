import { motion } from "framer-motion";
import { ScrollScene } from "./ScrollScene.tsx";
import { useDarkMode } from "@/context/DarkModeContext";
import { Sun, Moon } from "lucide-react";
import Link from "next/link";

export function Hero() {
  const { darkMode, toggleDarkMode } = useDarkMode();

  return (
    <main className="relative min-h-screen overflow-hidden bg-[var(--neo-bg)] text-[var(--neo-text-primary)] transition-colors duration-500">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.72),transparent_60%),radial-gradient(circle_at_bottom_right,rgba(120,130,145,0.12),transparent_48%)]" />
      {/* Top-left brand logo with favicon */}
      <motion.div
        initial={{ opacity: 0, x: -12 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.7, ease: "easeOut" }}
        className="fixed left-4 top-4 z-50 flex items-center gap-2.5 rounded-full p-2 sm:px-4 sm:py-2"
        style={{
          background: "var(--neo-bg)",
          boxShadow: "6px 6px 12px var(--neo-shadow-dark), -6px -6px 12px var(--neo-shadow-light)",
        }}
      >
        <div
          className="flex h-8 w-8 items-center justify-center rounded-full p-[2px]"
          style={{
            boxShadow: "inset 2px 2px 4px var(--neo-shadow-dark), inset -2px -2px 4px var(--neo-shadow-light)",
          }}
        >
          <img src="/favicon.png" alt="DojoClass Logo" className="h-full w-full object-contain rounded-full" />
        </div>
        <span
          className="text-sm font-bold tracking-wide hidden sm:inline-block"
          style={{
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            color: "var(--neo-text-primary)",
          }}
        >
          Dojo<span className="text-[var(--neo-accent)]">Class</span>
        </span>
      </motion.div>

      {/* Top navigation bar */}
      <motion.nav
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: "easeOut" }}
        className="fixed right-4 top-4 z-50 flex items-center gap-1.5 sm:gap-2"
      >
        <button
          onClick={toggleDarkMode}
          className="rounded-full bg-[var(--neo-bg)] p-2 sm:p-2.5 text-[var(--neo-text-secondary)] transition-all hover:scale-105"
          style={{ boxShadow: "4px 4px 8px var(--neo-shadow-dark), -4px -4px 8px var(--neo-shadow-light)" }}
          aria-label="Toggle theme"
        >
          {darkMode ? <Sun size={15} className="sm:w-[18px] sm:h-[18px]" /> : <Moon size={15} className="sm:w-[18px] sm:h-[18px]" />}
        </button>

        <Link
          href="/login"
          className="rounded-full bg-[var(--neo-bg)] px-3 py-1.5 sm:px-4 sm:py-2 text-[11px] sm:text-sm font-medium text-[var(--neo-text-secondary)] transition-all hover:scale-[1.02] flex items-center justify-center"
          style={{ boxShadow: "4px 4px 8px var(--neo-shadow-dark), -4px -4px 8px var(--neo-shadow-light)" }}
        >
          Login
        </Link>

        <Link
          href="/register"
          className="rounded-full bg-[var(--neo-bg)] px-3.5 py-1.5 sm:px-5 sm:py-2 text-[11px] sm:text-sm font-semibold text-[var(--neo-text-primary)] transition-all hover:scale-[1.03] flex items-center justify-center"
          style={{ boxShadow: "6px 6px 12px var(--neo-shadow-dark), -6px -6px 12px var(--neo-shadow-light)" }}
        >
          Sign Up
        </Link>
      </motion.nav>

      {/* Main scroll scene */}
      <ScrollScene />
    </main>
  );
}
