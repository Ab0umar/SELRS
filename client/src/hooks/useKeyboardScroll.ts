import { useEffect } from "react";

/** On touch devices, keeps a focused field centered so the on-screen keyboard does not cover it. */
export function useKeyboardScroll() {
  useEffect(() => {
    if (!window.matchMedia("(pointer: coarse)").matches) return;
    const onFocusIn = (event: FocusEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target || !/^(INPUT|SELECT|TEXTAREA)$/.test(target.tagName)) return;
      window.setTimeout(
        () => target.scrollIntoView({ block: "center", behavior: "smooth" }),
        300,
      );
    };
    document.addEventListener("focusin", onFocusIn);
    return () => document.removeEventListener("focusin", onFocusIn);
  }, []);
}
