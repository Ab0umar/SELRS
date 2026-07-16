import { Capacitor } from "@capacitor/core";
import { Printer } from "@bcyesil/capacitor-plugin-printer";
import { toast } from "sonner";

export function canUseNativeAndroidPrint() {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android";
}

// The native printer plugin renders a raw HTML string outside the browser's
// print pipeline — it does not reliably apply `@media print` rules the way
// window.print() does. So instead of trusting print:hidden CSS to hide nav/
// sidebar/header chrome, physically strip those elements from a cloned DOM
// before handing the HTML off. Mirrors what real @media print already hides.
// Some pages isolate a single section for printing via a body class +
// `* { visibility: hidden }` under @media print (see index.css). That only
// works if @media print activates in the render surface, which the native
// printer doesn't guarantee — so replace the body with just that section.
const PRINT_ISOLATION_SECTIONS: Record<string, string> = {
  "print-only-refraction": ".refraction-print-section",
  "print-ops-list": ".ops-print-table",
};

// A4 sizing/layout for sheets (.sheet-layout, .lasik-print-root, etc.) lives
// inside `@media print { ... }` blocks in index.css/web.css/mobile.css. Those
// never activate in the native renderer either, so the sheet renders at its
// normal on-screen mobile width instead of the desktop print layout — this is
// the "content is scaled/cut off wrong" symptom. Pull every print-media rule
// out of its @media wrapper and re-emit it unconditionally.
function extractPrintOnlyCss(): string {
  const parts: string[] = [];
  for (const sheet of Array.from(document.styleSheets)) {
    let rules: CSSRuleList;
    try {
      rules = sheet.cssRules;
    } catch {
      continue; // cross-origin stylesheet — can't read its rules, skip
    }
    if (!rules) continue;
    for (const rule of Array.from(rules)) {
      if (rule instanceof CSSMediaRule && /print/i.test(rule.media.mediaText)) {
        for (const inner of Array.from(rule.cssRules)) {
          parts.push(inner.cssText);
        }
      }
    }
  }
  return parts.join("\n");
}

// Any open dialog/overlay (e.g. the global command palette / search modal)
// must never end up in printed output — it's UI chrome, not sheet content,
// regardless of why it happened to be open when print was triggered.
const OVERLAY_SELECTOR =
  '[data-slot="dialog-overlay"], [data-slot="dialog-content"], [role="dialog"], [role="alertdialog"], [data-radix-popper-content-wrapper]';

function buildScopedPrintHtml(): string {
  const clone = document.documentElement.cloneNode(true) as HTMLElement;
  clone.querySelectorAll('[class~="print:hidden"]').forEach((el) => el.remove());
  clone.querySelectorAll(OVERLAY_SELECTOR).forEach((el) => el.remove());

  for (const [bodyClass, sectionSelector] of Object.entries(
    PRINT_ISOLATION_SECTIONS,
  )) {
    if (document.body.classList.contains(bodyClass)) {
      const section = clone.querySelector(sectionSelector);
      const cloneBody = clone.querySelector("body");
      if (section && cloneBody) cloneBody.replaceChildren(section);
      break;
    }
  }

  const printCss = extractPrintOnlyCss();
  if (printCss) {
    const style = document.createElement("style");
    style.textContent = printCss;
    (clone.querySelector("head") ?? clone).appendChild(style);
  }

  return clone.outerHTML;
}

export async function requestNativeAndroidPrint(jobName = "SELRS Print", htmlContent?: string) {
  if (!canUseNativeAndroidPrint()) {
    return { attempted: false, started: false };
  }

  try {
    const content = htmlContent ?? buildScopedPrintHtml();
    await Printer.print({
      content,
      name: jobName,
    });
    return { attempted: true, started: true };
  } catch (e) {
    console.warn("Native print failed, falling back to web print:", e);
    try {
      window.print();
    } catch (webErr) {
      toast.error("تعذر الطباعة. يرجى المحاولة مرة أخرى.");
      console.error("Web print fallback also failed:", webErr);
    }
    return { attempted: true, started: true };
  }
}
