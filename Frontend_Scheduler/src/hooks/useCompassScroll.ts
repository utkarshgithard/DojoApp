import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { dynamicFeatures as features } from "../components/student-landing/CompassCards";

gsap.registerPlugin(ScrollTrigger);

export function useCompassScroll(
  containerRef: React.RefObject<HTMLElement | null>
) {
  const [activeIndex, setActiveIndex] = useState(0);
  const activeIndexRef = useRef(0);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let ctx = gsap.context(() => {
      const prefersReduced =
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      const totalStops = features.length;

      ScrollTrigger.create({
        trigger: container,
        start: "top top",
        end: `+=${(totalStops - 1) * window.innerHeight}`,
        pin: true,
        anticipatePin: 1,
        snap: prefersReduced
          ? undefined
          : {
              snapTo: 1 / (totalStops - 1),
              duration: { min: 0.3, max: 0.7 },
              delay: 0.05,
              ease: "power2.inOut",
            },
        onUpdate: (self: any) => {
          const rawIndex = self.progress * (totalStops - 1);
          const index = Math.round(rawIndex);
          const clamped = Math.max(0, Math.min(totalStops - 1, index));
          if (clamped !== activeIndexRef.current) {
            activeIndexRef.current = clamped;
            setActiveIndex(clamped);
          }
        },
      });
    }, containerRef); // scope to container

    return () => {
      ctx.revert(); // cleanly reverts all GSAP DOM modifications (like pin-spacers)
    };
  }, [containerRef]);

  return { activeIndex, total: features.length };
}
