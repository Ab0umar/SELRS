import * as React from "react";

const MOBILE_BREAKPOINT = 768;

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(
    undefined,
  );

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };
    mql.addEventListener("change", onChange);
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return !!isMobile;
}

const COMPACT_BREAKPOINT = 1024;

/** True below 1024px: phones and tablets, where wide tables switch to cards. */
export function useIsCompact() {
  const [compact, setCompact] = React.useState<boolean | undefined>(undefined);

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${COMPACT_BREAKPOINT - 1}px)`);
    const onChange = () => setCompact(window.innerWidth < COMPACT_BREAKPOINT);
    mql.addEventListener("change", onChange);
    setCompact(window.innerWidth < COMPACT_BREAKPOINT);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return !!compact;
}
