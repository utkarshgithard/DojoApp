import { useEffect, useRef, memo } from "react";
import { motion } from "framer-motion";

const PARTICLE_COUNT = 28;

interface Particle {
  x: number;
  y: number;
  r: number;
  vx: number;
  vy: number;
  alpha: number;
}

function initParticles(w: number, h: number): Particle[] {
  return Array.from({ length: PARTICLE_COUNT }, () => ({
    x: Math.random() * w,
    y: Math.random() * h,
    r: Math.random() * 1.2 + 0.2,
    vx: (Math.random() - 0.5) * 0.12,
    vy: (Math.random() - 0.5) * 0.12,
    alpha: Math.random() * 0.25 + 0.04,
  }));
}

function ParticleCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      particlesRef.current = initParticles(canvas.width, canvas.height);
    };

    resize();
    window.addEventListener("resize", resize);

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const p of particlesRef.current) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(200, 200, 255, ${p.alpha})`;
        ctx.fill();
      }
      rafRef.current = requestAnimationFrame(draw);
    };

    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    if (!prefersReduced) {
      rafRef.current = requestAnimationFrame(draw);
    }

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none"
      style={{ opacity: 0.6 }}
      aria-hidden
    />
  );
}

export const BackgroundEffects = memo(function BackgroundEffects() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
      {/* Noise texture */}
      <svg className="absolute inset-0 w-full h-full opacity-[0.028]">
        <filter id="bg-noise">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.72"
            numOctaves="4"
            stitchTiles="stitch"
          />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#bg-noise)" />
      </svg>

      {/* Soft neutral gradient — no purple tint */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 85% 65% at 32% 38%, rgba(255,255,255,0.55) 0%, transparent 70%), radial-gradient(ellipse 65% 50% at 68% 62%, rgba(140,150,165,0.16) 0%, transparent 65%), radial-gradient(ellipse 40% 40% at 50% 50%, rgba(120,130,145,0.08) 0%, transparent 60%)",
        }}
      />

      {/* Top center soft glow */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2"
        style={{
          width: "60%",
          height: "1px",
          background:
            "linear-gradient(90deg, transparent, rgba(140,150,165,0.18), transparent)",
          boxShadow: "0 0 120px 60px rgba(140,150,165,0.06)",
        }}
      />

      {/* Particle field */}
      <ParticleCanvas />
    </div>
  );
});
