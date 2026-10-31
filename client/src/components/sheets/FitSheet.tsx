import { useLayoutEffect, useRef, useState, type ReactNode } from "react";

const FIT_MIN_VIEWPORT = 1024;
const FIT_MIN_SCALE = 0.45;
const FIT_BOTTOM_GAP = 12;

/**
 * Scales a sheet down so all of it is visible without scrolling. Only active on
 * wide screens; below that, and when printing, the sheet keeps its natural size.
 */
export default function FitSheet({ children }: { children: ReactNode }) {
  const outerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [fit, setFit] = useState({ scale: 1, height: 0 });

  useLayoutEffect(() => {
    const outer = outerRef.current;
    const inner = innerRef.current;
    if (!outer || !inner) return;
    const scroller = outer.closest<HTMLElement>("[data-app-scroll-container]");

    const measure = () => {
      const natural = inner.offsetHeight;
      const firstPaper = inner.querySelector<HTMLElement>(
        ".a4-page-card, .specialist-sheet, .sheet-followup-body",
      );
      // Fit the first page; any further pages simply follow below it.
      const basis = firstPaper
        ? firstPaper.offsetTop + firstPaper.offsetHeight
        : natural;
      if (window.innerWidth < FIT_MIN_VIEWPORT || !natural) {
        setFit((prev) =>
          prev.scale === 1 && prev.height === 0 ? prev : { scale: 1, height: 0 },
        );
        return;
      }
      const viewport = scroller?.clientHeight ?? window.innerHeight;
      const top =
        outer.getBoundingClientRect().top -
        (scroller?.getBoundingClientRect().top ?? 0) +
        (scroller?.scrollTop ?? 0);
      const available = viewport - top - FIT_BOTTOM_GAP;
      const scale = Math.min(1, Math.max(FIT_MIN_SCALE, available / basis));
      setFit((prev) =>
        Math.abs(prev.scale - scale) < 0.005 && prev.height === natural * scale
          ? prev
          : { scale, height: natural * scale },
      );
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(inner);
    if (scroller) observer.observe(scroller);
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  const active = fit.scale < 1;
  return (
    <div
      ref={outerRef}
      className="sheet-fit-outer"
      style={active ? { height: fit.height } : undefined}
    >
      <div
        ref={innerRef}
        className="sheet-fit-inner relative"
        style={
          active
            ? { transform: `scale(${fit.scale})`, transformOrigin: "top center" }
            : undefined
        }
      >
        {children}
      </div>
    </div>
  );
}
