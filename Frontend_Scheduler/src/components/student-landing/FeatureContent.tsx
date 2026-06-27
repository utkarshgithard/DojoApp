import { AnimatePresence, motion } from "framer-motion";
import { useDarkMode } from "@/context/DarkModeContext";
import { dynamicFeatures as features } from "./CompassCards";

interface Props {
  activeIndex: number;
  total: number;
}

const variants = {
  enter: {
    opacity: 0,
    y: 28,
    filter: "blur(8px)",
  },
  active: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
  },
  exit: {
    opacity: 0,
    y: -22,
    filter: "blur(6px)",
  },
};

function DirectionBadge({ feature, accent, badgeBg, badgeShadow }: { feature: typeof features[0]; accent: string; badgeBg: string; badgeShadow: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.25, duration: 0.35, ease: "easeOut" }}
      className="mb-6 inline-flex items-center gap-2"
    >
      <span
        className="rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em]"
        style={{
          fontFamily: "'JetBrains Mono', monospace",
          color: accent,
          background: badgeBg,
          boxShadow: badgeShadow,
        }}
      >
        {feature.direction}
      </span>
    </motion.div>
  );
}

export function FeatureContent({ activeIndex, total }: Props) {
  const feature = features[activeIndex];
  const { darkMode } = useDarkMode();

  const bgStyle = darkMode ? "#2b2f38" : "#e4e9f2";
  const shadowLight = darkMode ? "#363b46" : "#ffffff";
  const shadowDark = darkMode ? "#15171c" : "#aab4c6";
  const borderStyle = darkMode ? "1px solid rgba(255,255,255,0.02)" : "1px solid rgba(255,255,255,0.4)";
  const accent = darkMode ? "#5fd99a" : "#4caf82";
  const textPrimary = darkMode ? "#e7ebf2" : "#2e3a4f";
  const textSecondary = darkMode ? "#8b94a7" : "#6b7588";
  const badgeBg = darkMode ? "#2b2f38" : "#e4e9f2";
  const badgeShadow = `inset 2px 2px 4px ${shadowDark}, inset -2px -2px 4px ${shadowLight}`;

  return (
    <div className="mx-auto w-full max-w-[560px]" style={{ maxWidth: 560 }}>
      <AnimatePresence mode="wait">
        <motion.div
          key={activeIndex}
          variants={variants}
          initial="enter"
          animate="active"
          exit="exit"
          transition={{ duration: 0.55, ease: [0.25, 0.1, 0.25, 1] }}
          className="rounded-[28px] px-6 py-6 text-left md:px-8 md:py-7 h-[220px] md:h-[240px] flex flex-col justify-center"
          style={{
            background: bgStyle,
            border: borderStyle,
            boxShadow: `10px 10px 24px ${shadowDark}, -10px -10px 24px ${shadowLight}`,
          }}
        >
          <div className="flex items-start gap-4">
            <div className="mt-1 h-[calc(100%-2px)] min-h-[72px] w-1.5 flex-shrink-0 rounded-full shadow-[inset_1px_1px_2px_var(--neo-shadow-dark),inset_-1px_-1px_2px_var(--neo-shadow-light)]" style={{ background: accent }} />
            <div className="flex-1">
              <DirectionBadge feature={feature} accent={accent} badgeBg={badgeBg} badgeShadow={badgeShadow} />

              <h2
                className="mb-3 text-3xl font-bold leading-tight tracking-tight transition-colors md:text-4xl"
                style={{
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  color: textPrimary,
                }}
              >
                {feature.title}
              </h2>

              <p
                className="text-sm leading-relaxed transition-colors md:text-[15px]"
                style={{
                  fontFamily: "Inter, sans-serif",
                  fontWeight: 400,
                  color: textSecondary,
                }}
              >
                {feature.description}
              </p>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// Progress indicator
export function ProgressIndicator({
  activeIndex,
  total,
}: {
  activeIndex: number;
  total: number;
}) {
  return (
    <div className="flex flex-col items-center gap-3">
      {/* Dot row */}
      <div className="neo-inset flex items-center gap-2.5 rounded-full px-4 py-2.5">
        {Array.from({ length: total }, (_, i) => (
          <motion.div
            key={i}
            animate={{
              width: i === activeIndex ? 24 : 6,
              opacity: i === activeIndex ? 1 : i < activeIndex ? 0.45 : 0.2,
              backgroundColor:
                i === activeIndex ? "#a080ff" : i < activeIndex ? "#6040c0" : "#302840",
            }}
            transition={{ duration: 0.4, ease: "easeInOut" }}
            style={{ height: 6, borderRadius: 3 }}
          />
        ))}
      </div>

      {/* Numeric counter */}
      <div
        className="flex items-center gap-1"
        style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 12,
          color: "rgba(140,120,200,0.6)",
          letterSpacing: "0.1em",
        }}
      >
        <AnimatePresence mode="wait">
          <motion.span
            key={activeIndex}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.25 }}
            style={{ color: "rgba(180,155,255,0.8)" }}
          >
            {String(activeIndex + 1).padStart(2, "0")}
          </motion.span>
        </AnimatePresence>
        <span style={{ color: "rgba(80,65,120,0.7)" }}>/</span>
        <span>{String(total).padStart(2, "0")}</span>
      </div>
    </div>
  );
}
