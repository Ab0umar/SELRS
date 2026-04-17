import { useEffect, useMemo, useRef } from "react";
import { readPrintMode } from "@/lib/print";
import { canUseNativeAndroidPrint, requestNativeAndroidPrint } from "@/lib/nativePrint";

type UsePrintModeOptions = {
  ready?: boolean;
  delayMs?: number;
};

export function usePrintMode(options: UsePrintModeOptions = {}) {
  const { ready = true, delayMs = 180 } = options;
  const autoPrintDoneRef = useRef(false);
  const printMode = useMemo(() => readPrintMode(), []);

  useEffect(() => {
    if (!ready || !printMode.autoPrint || autoPrintDoneRef.current || typeof window === "undefined") {
      return;
    }
    autoPrintDoneRef.current = true;
    const timer = window.setTimeout(() => {
      if (canUseNativeAndroidPrint()) {
        void requestNativeAndroidPrint(document.title || "SELRS Print");
        return;
      }
      window.print();
    }, delayMs);
    return () => window.clearTimeout(timer);
  }, [delayMs, printMode.autoPrint, ready]);

  return printMode;
}

