"use client";

import { useRef, type ReactNode } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import "lenis/dist/lenis.css";
import "./landing-motion.css";

gsap.registerPlugin(useGSAP, ScrollTrigger);

/** Only the landing owns smooth scrolling; children still render on the server. */
export function LandingMotion({ children }: { children: ReactNode }) {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const element = root.current!;
      const select = gsap.utils.selector(element);
      const media = gsap.matchMedia();

      media.add(
        {
          desktop: "(min-width: 801px)",
          mobile: "(max-width: 800px)",
          reduced: "(prefers-reduced-motion: reduce)",
        },
        (context) => {
          const { desktop, reduced } = context.conditions!;
          element.dataset.motion = reduced ? "reduced" : "enabled";
          if (reduced)
            return () => {
              delete element.dataset.motion;
            };

          // Native scrolling is already the fastest path on touch devices. Keep
          // Lenis for pointer/desktop scrolling where its interpolation improves
          // the feel without adding a permanent mobile animation ticker.
          let lenis: Lenis | null = null;
          let tick: ((seconds: number) => void) | null = null;
          if (desktop) {
            lenis = new Lenis({
              autoRaf: false,
              lerp: 0.13,
              smoothWheel: true,
              syncTouch: false,
              anchors: { offset: -100 },
              stopInertiaOnNavigate: true,
              prevent: (node) => node.closest(".cookie-banner") !== null,
            });
            tick = (seconds: number) => lenis?.raf(seconds * 1000);
            lenis.on("scroll", ScrollTrigger.update);
            gsap.ticker.add(tick);
            gsap.ticker.lagSmoothing(0);
          }

          const reveals: { target: Element; animation: gsap.core.Animation }[] =
            [];
          const distance = desktop ? 42 : 22;
          const reveal = (selector: string, stagger = 0) => {
            select(selector).forEach((target: HTMLElement, index: number) => {
              const animation = gsap.from(target, {
                opacity: 0,
                y: distance,
                duration: 0.85,
                delay: (index % 4) * stagger,
                ease: "power3.out",
                clearProps: "opacity,transform",
                scrollTrigger: {
                  trigger: target,
                  start: "clamp(top 93%)",
                  once: true,
                },
              });
              reveals.push({ target, animation });
            });
          };

          // Short entrance; returning to a deep link doesn't replay the hero above it.
          const hero = gsap.timeline({
            defaults: { duration: 0.85, ease: "power3.out" },
          });
          hero
            .from(select(".hero-kicker"), { opacity: 0, y: 16 })
            .from(
              select(".hero-title-line"),
              { opacity: 0, yPercent: 65, stagger: 0.12 },
              0.08,
            )
            .from(
              select(
                ".hero-description, .hero-method, .hero-cta, .hero-assurance",
              ),
              {
                opacity: 0,
                y: 24,
                stagger: 0.1,
                clearProps: "opacity,transform",
              },
              0.35,
            )
            .from(
              select(".preview-window"),
              {
                opacity: 0,
                y: 48,
                scale: 0.94,
                duration: 1.2,
                clearProps: "opacity,transform",
              },
              0.15,
            )
            .from(
              select(".preview-metrics > div, .preview-row"),
              {
                opacity: 0,
                y: 12,
                stagger: 0.055,
                clearProps: "opacity,transform",
              },
              0.6,
            )
            .from(
              select(".preview-float"),
              {
                opacity: 0,
                y: 28,
                clearProps: "opacity,transform",
              },
              0.9,
            );
          reveals.push({ target: select(".hero")[0], animation: hero });
          if (window.scrollY > 120) hero.progress(1);

          reveal(".trust-strip > span", 0.07);
          reveal(
            ".section-heading > *, .trust-intro > *, .product-copy > :not(.feature-list), .center-heading > *",
          );
          reveal(".step-card", desktop ? 0.1 : 0.04);
          reveal(".method-stack article", 0.1);
          reveal(".feature-list li", 0.08);
          reveal(".plan-card", desktop ? 0.12 : 0);
          reveal(".pricing-footnote, .founder-photo, .founder-copy > *", 0.06);
          reveal(
            ".faq-section > div:first-child > *, .faq-list details",
            0.045,
          );
          reveal(
            ".final-cta > *, .legal-line, .footer-top > *, .footer-bottom",
            0.05,
          );

          gsap.from(select(".reference-image"), {
            scale: desktop ? 0.91 : 0.97,
            y: desktop ? 48 : 20,
            rotation: desktop ? -2 : 0,
            ease: "none",
            scrollTrigger: {
              trigger: select(".product-section")[0],
              start: "top 90%",
              end: "center 55%",
              scrub: 0.7,
            },
          });
          gsap.from(select(".steps-rail span"), {
            scaleX: 0,
            transformOrigin: "left center",
            ease: "none",
            scrollTrigger: {
              trigger: select(".steps-grid")[0],
              start: "top 88%",
              end: "bottom 50%",
              scrub: 0.5,
            },
          });
          gsap.fromTo(
            select(".landing-progress"),
            { scaleX: 0 },
            {
              scaleX: 1,
              ease: "none",
              scrollTrigger: { start: 0, end: "max", scrub: 0.2 },
            },
          );

          if (desktop) {
            gsap.to(select(".hero-visual"), {
              y: -65,
              ease: "none",
              scrollTrigger: {
                trigger: select(".hero")[0],
                start: "top top",
                end: "bottom top",
                scrub: 0.8,
              },
            });
            gsap.to(select(".preview-orbit"), {
              rotation: "+=30",
              scale: 1.08,
              ease: "none",
              scrollTrigger: {
                trigger: select(".hero")[0],
                start: "top top",
                end: "bottom top",
                scrub: 1,
              },
            });
            gsap.fromTo(
              select(".landing-glow"),
              { yPercent: -12 },
              {
                yPercent: 22,
                ease: "none",
                scrollTrigger: {
                  trigger: select(".hero")[0],
                  start: "top top",
                  end: "bottom top",
                  scrub: 1,
                },
              },
            );
          }

          // Native keyboard navigation must never land on an unrevealed control.
          const onFocus = (event: FocusEvent) => {
            if (!(event.target instanceof Element)) return;
            reveals.forEach(({ target, animation }) => {
              if (target.contains(event.target as Element))
                animation.progress(1);
            });
          };
          element.addEventListener("focusin", onFocus);

          // FAQ expansion, responsive text, and font/image loading change trigger positions.
          let frame = 0;
          let disposed = false;
          const refresh = () => {
            if (disposed) return;
            cancelAnimationFrame(frame);
            frame = requestAnimationFrame(() => {
              lenis?.resize();
              ScrollTrigger.refresh();
            });
          };
          const observer = new ResizeObserver(refresh);
          observer.observe(element);
          document.fonts.ready.then(refresh);
          refresh();

          return () => {
            disposed = true;
            observer.disconnect();
            cancelAnimationFrame(frame);
            element.removeEventListener("focusin", onFocus);
            if (tick) {
              gsap.ticker.remove(tick);
              gsap.ticker.lagSmoothing(500, 33);
            }
            lenis?.off("scroll", ScrollTrigger.update);
            lenis?.destroy();
            delete element.dataset.motion;
          };
        },
      );
      return () => media.revert();
    },
    { scope: root },
  );

  return (
    <div ref={root} className="landing-page">
      <div className="landing-progress" aria-hidden="true" />
      {children}
    </div>
  );
}
