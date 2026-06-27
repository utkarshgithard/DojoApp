import { memo, useMemo } from "react";
import { motion } from "framer-motion";
import { CompassNeedle } from "./CompassNeedle.tsx";
import { dynamicFeatures as features } from "./CompassCards";
import { CalendarCheck, Clock, Users, Sparkles, BarChart3, Navigation } from "lucide-react";
import { useDarkMode } from "@/context/DarkModeContext";

const IconMap: Record<string, React.ElementType> = {
  CalendarCheck,
  Clock,
  Users,
  Sparkles,
  BarChart3,
  Navigation,
};

interface Props {
  activeIndex: number;
  size?: number;
}

function round(value: number) {
  return Number(value.toFixed(3));
}

function buildTicks(darkMode: boolean) {
  const ticks = [];
  for (let i = 0; i < 72; i++) {
    const deg = i * 5;
    const isMajor = deg % 90 === 0;
    const isSemi = deg % 45 === 0 && !isMajor;
    const isMedium = deg % 10 === 0 && !isMajor && !isSemi;

    const outerR = 224;
    const innerR = isMajor ? 204 : isSemi ? 210 : isMedium ? 216 : 220;
    const strokeW = isMajor ? 1.8 : isSemi ? 1.4 : isMedium ? 1.0 : 0.6;
    
    const strokeColor = darkMode
      ? isMajor
        ? "rgba(220,210,255,0.75)"
        : isSemi
        ? "rgba(190,180,230,0.55)"
        : isMedium
        ? "rgba(160,150,200,0.38)"
        : "rgba(130,120,170,0.22)"
      : isMajor
        ? "rgba(30,41,59,0.85)"
        : isSemi
        ? "rgba(51,65,85,0.7)"
        : isMedium
        ? "rgba(71,85,105,0.55)"
        : "rgba(100,116,139,0.4)";

    const rad = ((deg - 90) * Math.PI) / 180;
    ticks.push({
      x1: round(250 + outerR * Math.cos(rad)),
      y1: round(250 + outerR * Math.sin(rad)),
      x2: round(250 + innerR * Math.cos(rad)),
      y2: round(250 + innerR * Math.sin(rad)),
      strokeW,
      strokeColor,
    });
  }
  return ticks;
}

const cardinals = [
  { label: "NW", angle: 0, primary: false },
  { label: "N", angle: 45, primary: true },
  { label: "NE", angle: 90, primary: false },
  { label: "E", angle: 135, primary: true },
  { label: "SE", angle: 180, primary: false },
  { label: "S", angle: 225, primary: true },
  { label: "SW", angle: 270, primary: false },
  { label: "W", angle: 315, primary: true },
];

export const Compass = memo(function Compass({
  activeIndex,
  size = 500,
}: Props) {
  const { darkMode } = useDarkMode();
  const ticks = useMemo(() => buildTicks(darkMode), [darkMode]);

  const faceBgStart = darkMode ? "#1e1c30" : "#ffffff";
  const faceBgMiddle = darkMode ? "#131220" : "#dbe1ee";
  const faceBgEnd = darkMode ? "#09090f" : "#b2bdd2";

  const innerBezelStart = darkMode ? "#d4d4e0" : "#ffffff";
  const innerBezelMiddle1 = darkMode ? "#4a4a5e" : "#8c99b5";
  const innerBezelMiddle2 = darkMode ? "#8a8aa0" : "#dce3f0";
  const innerBezelEnd = darkMode ? "#1c1c2c" : "#4e5a75";

  const bezelRadialStart = darkMode ? "#e8e8f8" : "#ffffff";
  const bezelRadial2 = darkMode ? "#9090aa" : "#b4c2db";
  const bezelRadial3 = darkMode ? "#282838" : "#5d6d8a";
  const bezelRadial4 = darkMode ? "#8888a0" : "#cfd9e8";
  const bezelRadial5 = darkMode ? "#c0c0d8" : "#e6ecf7";
  const bezelRadial6 = darkMode ? "#1e1e2c" : "#2f3847";

  const decoRingStart = darkMode ? "rgba(180,160,255,0.35)" : "rgba(30,41,59,0.35)";
  const decoRingMiddle = darkMode ? "rgba(80,60,140,0.15)" : "rgba(30,41,59,0.08)";

  const cardinalColorPrimary = darkMode ? "rgba(220,212,255,0.90)" : "#1e293b";
  const cardinalColorSecondary = darkMode ? "rgba(160,150,210,0.50)" : "rgba(71,85,105,0.7)";

  return (
    <div
      className="relative"
      style={{ width: size, height: size }}
      role="img"
      aria-label="Compass navigation indicator"
    >
      {/* Outer glow */}
      

      {/* Compass body SVG */}
      <svg
        viewBox="0 0 500 500"
        width={size}
        height={size}
        className="absolute inset-0"
        aria-hidden
        style={{ overflow: "visible" }}
      >
        <defs>
          {/* Outer bezel metallic radial gradient — more distinct banding */}
          <radialGradient id="bezel-radial" cx="35%" cy="28%">
            <stop offset="0%" stopColor={bezelRadialStart} />
            <stop offset="12%" stopColor={bezelRadial2} />
            <stop offset="28%" stopColor={bezelRadial3} />
            <stop offset="48%" stopColor={bezelRadial4} />
            <stop offset="68%" stopColor={bezelRadial5} />
            <stop offset="84%" stopColor={bezelRadial2} />
            <stop offset="100%" stopColor={bezelRadial6} />
          </radialGradient>

          {/* Inner bezel gradient */}
          <radialGradient id="inner-bezel" cx="40%" cy="35%">
            <stop offset="0%" stopColor={innerBezelStart} />
            <stop offset="30%" stopColor={innerBezelMiddle1} />
            <stop offset="60%" stopColor={innerBezelMiddle2} />
            <stop offset="100%" stopColor={innerBezelEnd} />
          </radialGradient>

          {/* Compass face background */}
          <radialGradient id="face-bg" cx="50%" cy="45%">
            <stop offset="0%" stopColor={faceBgStart} />
            <stop offset="50%" stopColor={faceBgMiddle} />
            <stop offset="100%" stopColor={faceBgEnd} />
          </radialGradient>

          {/* Inner decorative ring gradient */}
          <linearGradient id="deco-ring" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={decoRingStart} />
            <stop offset="50%" stopColor={decoRingMiddle} />
            <stop offset="100%" stopColor={decoRingStart} />
          </linearGradient>

          {/* Glass reflection gradient */}
          <radialGradient id="glass-reflect" cx="28%" cy="22%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.14)" />
            <stop offset="60%" stopColor="rgba(255,255,255,0.04)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0)" />
          </radialGradient>

          {/* Cardinal highlight gradient */}
          <radialGradient id="cardinal-highlight" cx="50%" cy="50%">
            <stop offset="0%" stopColor="#e0d8ff" stopOpacity="1" />
            <stop offset="100%" stopColor="#8070c0" stopOpacity="0.6" />
          </radialGradient>

          {/* Drop shadow filter */}
          <filter id="compass-shadow" x="-25%" y="-25%" width="150%" height="150%">
            <feDropShadow
              dx="0"
              dy="10"
              stdDeviation="24"
              floodColor="#000000"
              floodOpacity={darkMode ? "0.8" : "0.26"}
            />
            <feDropShadow
              dx="0"
              dy="-6"
              stdDeviation="10"
              floodColor={darkMode ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.55)"}
              floodOpacity="1"
            />
          </filter>

          {/* Subtle inner glow */}
          <filter id="inner-glow" x="-10%" y="-10%" width="120%" height="120%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>

          {/* Cardinal glow for active direction */}
          <filter id="cardinal-glow" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* ── Outer shadow disc ── */}
        <circle
          cx="250"
          cy="250"
          r="242"
          fill="rgba(0,0,0,0.5)"
          filter="url(#compass-shadow)"
        />

        {/* ── Outer metallic bezel ── */}
        <circle cx="250" cy="250" r="242" fill="url(#bezel-radial)" />
        <circle
          cx="250"
          cy="250"
          r="238"
          fill="none"
          stroke={darkMode ? "rgba(255,255,255,0.16)" : "rgba(255,255,255,0.85)"}
          strokeWidth="5"
        />
        <circle
          cx="250"
          cy="250"
          r="244"
          fill="none"
          stroke={darkMode ? "rgba(20,16,32,0.7)" : "rgba(60,70,92,0.35)"}
          strokeWidth="3"
        />

        {/* Bezel edge rings */}
        <circle
          cx="250"
          cy="250"
          r="242"
          fill="none"
          stroke={darkMode ? "rgba(60,50,90,0.8)" : "rgba(100,90,140,0.3)"}
          strokeWidth="1.2"
        />
        <circle
          cx="250"
          cy="250"
          r="240"
          fill="none"
          stroke={darkMode ? "rgba(200,190,240,0.12)" : "rgba(100,90,140,0.15)"}
          strokeWidth="0.8"
        />

        {/* ── Main face area ── */}
        <circle cx="250" cy="250" r="226" fill="url(#face-bg)" />

        {/* ── Tick marks ── */}
        {ticks.map((t, i) => (
          <line
            key={i}
            x1={t.x1}
            y1={t.y1}
            x2={t.x2}
            y2={t.y2}
            stroke={t.strokeColor}
            strokeWidth={t.strokeW}
          />
        ))}

        {/* ── Cardinal and ordinal labels ── */}
        {cardinals.map(({ label, angle, primary }) => {
          const r = primary ? 190 : 190;
          const rad = ((angle - 90) * Math.PI) / 180;
          const x = 250 + r * Math.cos(rad);
          const y = 250 + r * Math.sin(rad);
          return (
            <text
              key={label}
              x={x}
              y={y}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={primary ? 16 : 9}
              fontWeight={primary ? "700" : "400"}
              fontFamily="'Plus Jakarta Sans', sans-serif"
              fill={primary ? cardinalColorPrimary : cardinalColorSecondary}
              letterSpacing={primary ? "0.08em" : "0"}
            >
              {label}
            </text>
          );
        })}

        {/* ── Inner bezel ring ── */}
        <circle cx="250" cy="250" r="170" fill="url(#inner-bezel)" />
        <circle
          cx="250"
          cy="250"
          r="170"
          fill="none"
          stroke={darkMode ? "rgba(255,255,255,0.14)" : "rgba(255,255,255,0.8)"}
          strokeWidth="4"
        />
        <circle
          cx="250"
          cy="250"
          r="172"
          fill="none"
          stroke={darkMode ? "rgba(20,16,32,0.55)" : "rgba(60,70,92,0.25)"}
          strokeWidth="2"
        />
        <circle
          cx="250"
          cy="250"
          r="168"
          fill="none"
          stroke={darkMode ? "rgba(200,190,255,0.08)" : "rgba(100,90,150,0.12)"}
          strokeWidth="0.6"
        />

        {/* ── Compass face ── */}
        <circle cx="250" cy="250" r="162" fill="url(#face-bg)" />
        <circle
          cx="250"
          cy="250"
          r="162"
          fill="none"
          stroke={darkMode ? "rgba(80,70,120,0.4)" : "rgba(30,41,59,0.5)"}
          strokeWidth="1"
        />

        {/* ── Subtle degree notches on face ── */}
        {Array.from({ length: 36 }, (_, i) => {
          const deg = i * 10;
          const rad = ((deg - 90) * Math.PI) / 180;
          const outerR = 156;
          const innerR = 152;
          return (
            <line
              key={i}
              x1={round(250 + outerR * Math.cos(rad))}
              y1={round(250 + outerR * Math.sin(rad))}
              x2={round(250 + innerR * Math.cos(rad))}
              y2={round(250 + innerR * Math.sin(rad))}
              stroke={darkMode ? "rgba(120,110,180,0.2)" : "rgba(30,41,59,0.4)"}
              strokeWidth="0.5"
            />
          );
        })}

        {/* ── Inner decorative rings ── */}
        <circle
          cx="250"
          cy="250"
          r="136"
          fill="none"
          stroke={darkMode ? "rgba(255,255,255,0.08)" : "rgba(100,90,140,0.16)"}
          strokeWidth="1"
        />
        <circle
          cx="250"
          cy="250"
          r="122"
          fill="none"
          stroke={darkMode ? "rgba(255,255,255,0.09)" : "rgba(100,90,140,0.12)"}
          strokeWidth="0.8"
        />
        <circle
          cx="250"
          cy="250"
          r="108"
          fill="none"
          stroke="url(#deco-ring)"
          strokeWidth="0.8"
        />
        <circle
          cx="250"
          cy="250"
          r="94"
          fill="none"
          stroke={darkMode ? "rgba(255,255,255,0.06)" : "rgba(100,90,140,0.11)"}
          strokeWidth="0.7"
        />
        <circle
          cx="250"
          cy="250"
          r="80"
          fill="none"
          stroke="url(#deco-ring)"
          strokeWidth="0.5"
          opacity="0.6"
        />
        <circle
          cx="250"
          cy="250"
          r="66"
          fill="none"
          stroke={darkMode ? "rgba(255,255,255,0.05)" : "rgba(100,90,140,0.08)"}
          strokeWidth="0.5"
        />

        {/* ── Compass rose cross-hairs (faint) ── */}
        <line
          x1="250"
          y1="88"
          x2="250"
          y2="412"
          stroke={darkMode ? "rgba(120,100,200,0.06)" : "rgba(120,100,200,0.18)"}
          strokeWidth="0.5"
        />
        <line
          x1="88"
          y1="250"
          x2="412"
          y2="250"
          stroke={darkMode ? "rgba(120,100,200,0.06)" : "rgba(120,100,200,0.18)"}
          strokeWidth="0.5"
        />

        {/* ── Glass reflection ── */}
        <ellipse
          cx="215"
          cy="195"
          rx="110"
          ry="80"
          fill="url(#glass-reflect)"
          transform="rotate(-25 215 195)"
          opacity="0.7"
        />

        {/* ── Metallic shine sweep highlight on bezel — sharper/brighter ── */}
        <path
          d="M 250 8 A 242 242 0 0 1 430 85"
          fill="none"
          stroke="rgba(255,255,255,0.18)"
          strokeWidth="6"
          strokeLinecap="round"
        />
        <path
          d="M 250 8 A 242 242 0 0 1 492 250"
          fill="none"
          stroke="rgba(255,255,255,0.07)"
          strokeWidth="3"
          strokeLinecap="round"
        />
        {/* Bottom shadow arc on bezel */}
        <path
          d="M 250 492 A 242 242 0 0 1 8 250"
          fill="none"
          stroke="rgba(0,0,0,0.25)"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </svg>

      {/* Needle overlay (separate positioned SVG) */}
      <CompassNeedle activeIndex={activeIndex} size={size} />

      {/* Feature Icons Around Compass */}
      {features.map((feature, i) => {
        const rad = ((feature.angle - 90) * Math.PI) / 180;
        const isActive = i === activeIndex;
        // Using 62% radius so icons sit beautifully just outside the main compass body
        const radiusPercent = 62;
        const left = 50 + radiusPercent * Math.cos(rad);
        const top = 50 + radiusPercent * Math.sin(rad);
        const IconComponent = IconMap[feature.icon];

        // Determine text alignment based on angle to avoid overlapping the compass
        let textContainerClass = "absolute hidden lg:flex flex-col w-[220px] xl:w-[280px] ";
        if (feature.angle === 0 || feature.angle === 360) {
           textContainerClass += "bottom-[120%] mb-2 left-1/2 -translate-x-1/2 text-left";
        } else if (feature.angle === 180) {
           textContainerClass += "top-[120%] mt-2 left-1/2 -translate-x-1/2 text-left";
        } else if (feature.angle < 180) {
           if (feature.angle === 135) {
             textContainerClass += "left-[92%] xl:left-[112%] ml-1 top-1/2 -translate-y-[62%] text-left";
           } else {
             textContainerClass += "left-[112%] ml-1.5 top-1/2 -translate-y-1/2 text-left";
           }
        } else {
           if (feature.angle === 225) {
             textContainerClass += "right-[92%] xl:right-[112%] mr-1 top-1/2 -translate-y-[62%] text-left";
           } else {
             textContainerClass += "right-[112%] mr-1.5 top-1/2 -translate-y-1/2 text-left";
           }
        }

        const isRightSide = feature.angle < 180;
        const hiddenX = isRightSide ? "-55%" : "-45%";

        return (
          <motion.div
            key={feature.id}
            className={`absolute ${isActive ? '' : 'pointer-events-none'}`}
            style={{
              left: `${left}%`,
              top: `${top}%`,
              zIndex: isActive ? 20 : 10,
              transformOrigin: isRightSide ? "left center" : "right center",
            }}
            initial={{ 
              opacity: 0, 
              x: hiddenX, 
              y: "-50%", 
              scale: 0, 
              rotateY: isRightSide ? 90 : -90, 
              filter: "blur(10px) brightness(2)" 
            }}
            animate={{ 
              opacity: isActive ? 1 : 0, 
              scale: isActive ? 1 : 0.9,
              rotateY: isActive ? 0 : (isRightSide ? -90 : 90),
              filter: isActive ? "blur(0px) brightness(1)" : "blur(4px) brightness(1.2)",
              x: isActive ? "-50%" : hiddenX,
              y: "-50%"
            }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          >
            <motion.div
              className="relative flex items-center justify-center rounded-full"
              style={{
                width: size < 300 ? 36 : 48,
                height: size < 300 ? 36 : 48,
                background: isActive 
                  ? darkMode 
                    ? 'rgba(120, 90, 255, 0.25)' 
                    : 'rgba(120, 90, 255, 0.15)' 
                  : darkMode 
                    ? 'rgba(40, 30, 60, 0.4)' 
                    : 'rgba(228, 228, 231, 0.7)',
                border: isActive 
                  ? darkMode 
                    ? '1px solid rgba(160, 130, 255, 0.6)' 
                    : '1px solid rgba(120, 90, 255, 0.5)' 
                  : darkMode 
                    ? '1px solid rgba(100, 80, 140, 0.25)' 
                    : '1px solid rgba(200, 200, 220, 0.3)',
                backdropFilter: 'blur(6px)',
                boxShadow: isActive 
                  ? darkMode 
                    ? '0 0 28px rgba(120, 90, 255, 0.6)' 
                    : '0 0 20px rgba(120, 90, 255, 0.25)' 
                  : 'none',
              }}
              animate={{
                scale: isActive ? 1.25 : 0.85,
              }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            >
              {IconComponent && (
                <IconComponent
                  size={size < 300 ? 16 : 22}
                  color={
                    isActive 
                      ? darkMode 
                        ? "#dcd4ff" 
                        : "#6b21a8" 
                      : darkMode 
                        ? "#8c7dc3" 
                        : "#71717a"
                  }
                />
              )}
            </motion.div>
            
            {/* Desktop Neon Edge Card Overlay */}
            <div className={textContainerClass}>
              <feature.Component isActive={isActive} isLeftSide={!isRightSide} />
            </div>
          </motion.div>
        );
      })}

      {/* Micro lock pulse when arriving at stop */}
      <motion.div
        key={activeIndex}
        className="absolute inset-0 rounded-full pointer-events-none"
        initial={{ opacity: 0.5, scale: 1 }}
        animate={{ opacity: 0, scale: 1.04 }}
        transition={{ duration: 0.9, ease: "easeOut", delay: 0.6 }}
        style={{
          boxShadow: "inset 0 0 0 1px rgba(160,120,255,0.35)",
        }}
      />
    </div>
  );
});
