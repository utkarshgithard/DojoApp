import { useEffect, useRef, useState } from "react";
import { useCompassScroll } from "../../hooks/useCompassScroll";
import { BackgroundEffects } from "./BackgroundEffects";
import { Compass } from "./Compass";
import { FeatureContent, ProgressIndicator } from "./FeatureContent";
import { features } from "../../lib/compassData";
import { DirectionSetSection } from "./DirectionSetSection";
import { HowItWorksSection } from "./HowItWorksSection";
import { StatsSection } from "./StatsSection";
import { TestimonialsSection } from "./TestimonialsSection";
import { FooterSection } from "./FooterSection";

function getCompassSize() {
  if (typeof window === "undefined") return 320;
  const w = window.innerWidth;
  if (w < 480) return 190;
  if (w < 768) return 240;
  if (w < 1024) return 270;
  if (w < 1280) return 290;
  return 360;
}

export function ScrollScene() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { activeIndex, total } = useCompassScroll(
    containerRef as React.RefObject<HTMLElement | null>
  );
  const [compassSize, setCompassSize] = useState(320);

  useEffect(() => {
    const updateSize = () => {
      setCompassSize(getCompassSize());
    };

    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  return (
    <>
      {/* Pinned hero — GSAP will add its own scroll space after this */}
      <section
        ref={containerRef}
        className="relative w-full overflow-hidden bg-[var(--neo-bg)] transition-colors duration-500"
        style={{
          height: "100vh",
        }}
        aria-label="Feature showcase"
      >
        {/* Background layer */}
        <BackgroundEffects />

        {/* Content: vertically centered column */}
        <div className="relative z-10 flex h-full flex-col items-center justify-center gap-10 px-6 pb-8 pt-28 lg:gap-12">
          <div className="mx-auto flex w-full max-w-5xl flex-col items-center justify-center px-6 py-8 lg:px-10 lg:py-10">
            {/* Feature text above compass (Mobile/Tablet only) */}
            <div className="lg:hidden">
              <FeatureContent activeIndex={activeIndex} total={total} />
            </div>

            {/* Compass */}
            <div className="relative z-10 mt-6 lg:mt-0">
              <Compass activeIndex={activeIndex} size={compassSize} />
            </div>

            {/* Progress below compass */}
            <ProgressIndicator activeIndex={activeIndex} total={total} />
          </div>
        </div>

        {/* Scroll hint — fades out after first scroll */}
        <div
          className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 pointer-events-none"
          style={{
            opacity: activeIndex === 0 ? 1 : 0,
            transition: "opacity 0.6s ease",
          }}
          aria-hidden
        >
          <span
            style={{
              fontSize: 10,
              letterSpacing: "0.22em",
              color: "rgba(130,110,200,0.5)",
              fontFamily: "'JetBrains Mono', monospace",
              textTransform: "uppercase",
            }}
          >
            Scroll
          </span>
          <div
            className="w-[1px] h-8"
            style={{
              background:
                "linear-gradient(to bottom, rgba(130,110,200,0.5), transparent)",
            }}
          />
        </div>

        {/* Reduced-motion: show all features as text list */}
        <noscript>
          <ul className="sr-only">
            {features.map((f) => (
              <li key={f.id}>
                <strong>{f.title}</strong>: {f.description}
              </li>
            ))}
          </ul>
        </noscript>
      </section>

      <DirectionSetSection />
      <HowItWorksSection />
      <StatsSection />
      <TestimonialsSection />
      <FooterSection />
    </>
  );
}
