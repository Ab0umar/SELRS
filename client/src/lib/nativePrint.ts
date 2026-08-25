import { Capacitor } from "@capacitor/core";
import { Printer } from "@bcyesil/capacitor-plugin-printer";
import { toast } from "sonner";

export function canUseNativeAndroidPrint() {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android";
}

// The native printer plugin's Android side loads our HTML into a fresh
// WebView via `loadDataWithBaseURL(null, content, ...)` — null baseUrl, so
// none of our <link>/<img>/<script> relative URLs can resolve (see
// extractAllCss below for the real consequence of that). It's a real WebView
// print pipeline once loaded, so @media print itself isn't the problem, but
// we still physically strip nav/sidebar/header chrome and single-section
// isolation rather than lean on CSS for it, since a plain clone would also
// carry stale open-dialog state that was never meant to print.
const PRINT_ISOLATION_SECTIONS: Record<string, string> = {
  "print-only-refraction": ".refraction-print-section",
  "print-ops-list": ".ops-print-table",
};

// The plugin's Android side loads our HTML via
// `webView.loadDataWithBaseURL(null, content, "text/HTML", "UTF-8", null)` —
// baseUrl is null, so <link rel="stylesheet" href="/assets/....css"> can
// never resolve (no origin to combine with). Every compiled Tailwind rule
// silently fails to load and the printed page renders with NO styling at
// all — not a `@media print` problem, a "the stylesheet never loaded"
// problem. Fix: inline every readable stylesheet's full CSS text directly,
// and while at it, unwrap @media print rules so they apply unconditionally
// too (A4 sizing for .sheet-layout/.lasik-print-root/etc. lives there).
function extractAllCss(): string {
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
      } else {
        parts.push(rule.cssText);
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
  // Read all CSS from the LIVE document (styleSheets only expose cssRules
  // for same-origin sheets that have actually loaded) before cloning.
  const allCss = extractAllCss();

  const clone = document.documentElement.cloneNode(true) as HTMLElement;
  clone.querySelectorAll('[class~="print:hidden"]').forEach((el) => el.remove());
  clone.querySelectorAll(OVERLAY_SELECTOR).forEach((el) => el.remove());
  // <link rel="stylesheet"> can never resolve under the plugin's null
  // baseUrl — drop them so there's no dead network request/flash, since
  // their content is now inlined below instead.
  clone.querySelectorAll('link[rel="stylesheet"]').forEach((el) => el.remove());
  // Same null-baseUrl problem hits relative <img src="/...">. Absolute URLs
  // resolve fine without a base, so rewrite them instead of dropping them.
  clone.querySelectorAll("img[src]").forEach((img) => {
    const src = img.getAttribute("src") ?? "";
    if (src && !/^(https?:|data:)/i.test(src)) {
      img.setAttribute("src", new URL(src, window.location.origin).href);
    }
  });
  // No reason to re-execute the whole SPA bundle in the throwaway print
  // WebView, and its <script src> tags can't resolve under null baseUrl
  // anyway — strip them so there's no dead-load noise.
  clone.querySelectorAll("script").forEach((el) => el.remove());

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

  if (allCss) {
    const style = document.createElement("style");
    style.textContent = allCss;
    (clone.querySelector("head") ?? clone).appendChild(style);
  }

  const printScrollbarReset = document.createElement("style");
  printScrollbarReset.textContent = `
    html, body, #root,
    [data-app-scroll-container],
    .a4-page-card, .print-page-center-a4, .print-page-center-a5,
    .attached-followup-page, .sheet-followup-body,
    .lasik-print-root, .specialist-page-root,
    .lasik-sheet, .specialist-sheet {
      height: auto !important;
      min-height: 0 !important;
      max-height: none !important;
      overflow: hidden !important;
      scrollbar-width: none !important;
      -ms-overflow-style: none !important;
    }

    html::-webkit-scrollbar,
    body::-webkit-scrollbar,
    #root::-webkit-scrollbar,
    [data-app-scroll-container]::-webkit-scrollbar,
    .a4-page-card::-webkit-scrollbar,
    .print-page-center-a4::-webkit-scrollbar,
    .print-page-center-a5::-webkit-scrollbar,
    .attached-followup-page::-webkit-scrollbar,
    .sheet-followup-body::-webkit-scrollbar,
    .lasik-print-root::-webkit-scrollbar,
    .specialist-page-root::-webkit-scrollbar,
    .lasik-sheet::-webkit-scrollbar,
    .specialist-sheet::-webkit-scrollbar {
      display: none !important;
      width: 0 !important;
      height: 0 !important;
      background: transparent !important;
    }
  `;
  (clone.querySelector("head") ?? clone).appendChild(printScrollbarReset);

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
