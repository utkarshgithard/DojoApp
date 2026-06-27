import { useEffect, useRef, memo } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";
import { dynamicFeatures as features } from "./CompassCards";

interface Props {
  activeIndex: number;
  size: number;
}

// Needle drawn with pivot at SVG center (250, 250)
// North arm: tip at (250, 72), South arm: tip at (250, 390)
const NeedleNorthPath =
  "M 250 72 L 258.5 245 L 250 264 L 241.5 245 Z";
const NeedleSouthPath =
  "M 250 390 L 257 255 L 250 264 L 243 255 Z";

export const CompassNeedle = memo(function CompassNeedle({
  activeIndex,
  size,
}: Props) {
  const needleGroupRef = useRef<SVGGElement>(null);
  const rotationValue = useMotionValue(0);
  const prefersReduced =
    typeof window !== "undefined"
      ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
      : false;

  const springConfig = prefersReduced
    ? { stiffness: 400, damping: 60, mass: 1 }
    : { stiffness: 180, damping: 28, mass: 1 };

  const springRotation = useSpring(rotationValue, springConfig);

  // Animate needle via direct DOM attribute — zero React re-renders
  useEffect(() => {
    const unsubscribe = springRotation.on("change", (v: number) => {
      if (needleGroupRef.current) {
        needleGroupRef.current.setAttribute(
          "transform",
          `rotate(${v} 250 250)`
        );
      }
    });
    return unsubscribe;
  }, [springRotation]);

  // Drive rotation when active index changes
  useEffect(() => {
    rotationValue.set(features[activeIndex].angle);
  }, [activeIndex, rotationValue]);

  return (
    <svg
      viewBox="0 0 500 500"
      width={size}
      height={size}
      className="absolute inset-0 pointer-events-none"
      aria-hidden
    >
      <defs>
        {/* North arm gradient — polished crimson/red metallic */}
        <linearGradient id="needle-north" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#7f1d1d" />
          <stop offset="20%" stopColor="#dc2626" />
          <stop offset="42%" stopColor="#fecaca" />
          <stop offset="50%" stopColor="#ffffff" />
          <stop offset="58%" stopColor="#fca5a5" />
          <stop offset="78%" stopColor="#b91c1c" />
          <stop offset="100%" stopColor="#450a0a" />
        </linearGradient>

        {/* South arm gradient — brushed steel */}
        <linearGradient id="needle-south" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#09090b" />
          <stop offset="22%" stopColor="#3f3f46" />
          <stop offset="45%" stopColor="#a1a1aa" />
          <stop offset="55%" stopColor="#d4d4d8" />
          <stop offset="75%" stopColor="#52525b" />
          <stop offset="100%" stopColor="#09090b" />
        </linearGradient>

        {/* Center jewel gradient */}
        <radialGradient id="needle-jewel" cx="40%" cy="35%">
          <stop offset="0%" stopColor="#e0c0ff" stopOpacity="0.9" />
          <stop offset="40%" stopColor="#9060d0" />
          <stop offset="80%" stopColor="#3a1860" />
          <stop offset="100%" stopColor="#1a0830" />
        </radialGradient>

        {/* Jewel glow filter */}
        <filter id="jewel-glow" x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>

        {/* Pulse filter */}
        <filter id="needle-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      <g ref={needleGroupRef} transform="rotate(0 250 250)">
        {/* South arm (rendered first, behind) */}
        <path
          d={NeedleSouthPath}
          fill="url(#needle-south)"
          filter="url(#needle-glow)"
          opacity="0.85"
        />
        {/* North arm */}
        <path
          d={NeedleNorthPath}
          fill="url(#needle-north)"
          filter="url(#needle-glow)"
        />
        {/* Edge highlight on north arm */}
        <line
          x1="250"
          y1="72"
          x2="250"
          y2="264"
          stroke="rgba(255,255,255,0.25)"
          strokeWidth="1"
        />
      </g>

      {/* Center jewel cap (stays static on top) */}
      <circle cx="250" cy="250" r="15" fill="url(#needle-jewel)" />
      <circle
        cx="250"
        cy="250"
        r="15"
        fill="none"
        stroke="rgba(160,120,220,0.6)"
        strokeWidth="1"
      />
      {/* Inner highlight */}
      <ellipse
        cx="246"
        cy="245"
        rx="5"
        ry="3"
        fill="rgba(255,255,255,0.45)"
        style={{ filter: "blur(1px)" }}
      />
      {/* Micro pulse dot */}
      <motion.circle
        cx="250"
        cy="250"
        r="4"
        fill="rgba(200,160,255,0.7)"
        animate={{ r: [4, 7, 4], opacity: [0.7, 0.2, 0.7] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
      />
    </svg>
  );
});
