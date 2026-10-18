import { useEffect, useRef, useState } from "react";
import type {
  PrintProfile,
  PrintProfileId,
} from "../../../../shared/printSettings";
import {
  PRINT_DOCUMENTS,
  addPrintText,
  profileRootCss,
} from "@/lib/clinicalPrintSettings";

export const printPreviewRoutes: Record<PrintProfileId, string> = {
  prescription: "/prescription",
  tests: "/request-tests",
  radiology: "/request-tests?printProfile=radiology",
  consultant: "/sheets/consultant",
  specialist: "/sheets/specialist",
  lasik: "/sheets/lasik",
  external: "/sheets/external",
  followup: "/sheets/followup/consultant",
  refraction: "/refraction",
  "clinical-report": "/clinical-report",
  "medical-condition": "/medical-condition-report",
  "pre-post-op": "/pre-post-op-report",
  offdays: "/post-op-offdays",
  summary: "/patient-summary",
  referral: "/sheets/referral",
  report: "/clinical-reports?tab=medical-report",
};

export default function ActualPrintPreview({
  id,
  profile,
  sourcePath,
  onPaper,
}: {
  id: PrintProfileId;
  profile: PrintProfile;
  sourcePath: string;
  onPaper: (paper: HTMLElement | null) => void;
}) {
  const source = useRef<HTMLIFrameElement>(null);
  const output = useRef<HTMLIFrameElement>(null);
  const [snapshot, setSnapshot] = useState<{
    html: string;
    css: string;
    complete: boolean;
  } | null>(null);
  const [status, setStatus] = useState("جارٍ تحميل الصفحة الأصلية…");
  const [contentHeight, setContentHeight] = useState(0);
  useEffect(() => {
    setSnapshot(null);
    onPaper(null);
    setStatus("جارٍ تحميل الصفحة الأصلية…");
    let previous = "";
    let attempts = 0;
    const timer = window.setInterval(() => {
      const doc = source.current?.contentDocument;
      const definition = PRINT_DOCUMENTS.find((item) => item.id === id)!;
      const root = Array.from(
        doc?.querySelectorAll<HTMLElement>(definition.selector) ?? [],
      ).find(
        (node) =>
          !node.closest('[hidden], [role="tabpanel"][data-state="inactive"]'),
      );
      if (root && doc) {
        let complete = true;
        const clone = root.cloneNode(true) as HTMLElement;
        const fields = root.querySelectorAll<
          HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
        >("input,textarea,select");
        clone
          .querySelectorAll("input,textarea,select")
          .forEach((field, index) => {
            const original = fields[index];
            const text = doc.createElement("span");
            text.className = field.className;
            text.textContent =
              original.tagName === "INPUT" &&
              ["checkbox", "radio"].includes(
                (original as HTMLInputElement).type,
              )
                ? (original as HTMLInputElement).checked
                  ? "☑"
                  : "☐"
                : original.tagName === "SELECT"
                  ? ((original as HTMLSelectElement).selectedOptions[0]
                      ?.textContent ?? "")
                  : original.value;
            field.replaceWith(text);
          });
        const canvases = root.querySelectorAll("canvas");
        clone.querySelectorAll("canvas").forEach((canvas, index) => {
          try {
            const image = doc.createElement("img");
            image.src = canvases[index].toDataURL();
            image.width = canvases[index].width;
            image.height = canvases[index].height;
            image.className = canvas.className;
            canvas.replaceWith(image);
          } catch {
            complete = false;
            const warning = doc.createElement("p");
            warning.textContent = "تعذر تحميل الرسم في المعاينة";
            canvas.replaceWith(warning);
          }
        });
        clone
          .querySelectorAll(
            "script,button,[data-clinical-print-text],.print\\:hidden",
          )
          .forEach((node) => node.remove());
        const html = clone.outerHTML;
        if (html !== previous) {
          previous = html;
          const css = Array.from(doc.styleSheets)
            .map((sheet) => {
              try {
                return Array.from(sheet.cssRules)
                  .map((rule) => rule.cssText)
                  .join("\n");
              } catch {
                return "";
              }
            })
            .join("\n")
            .replace(/@media\s+print\b/g, "@media all");
          setSnapshot({ html, css, complete });
          setStatus(complete ? "" : "المعاينة غير مكتملة: تعذر تحميل أحد الرسومات.");
        }
      }
      if (++attempts >= 40) {
        window.clearInterval(timer);
        if (!previous)
          setStatus(
            "لم يظهر مستند للطباعة. اختر رابط الصفحة التي تحتوي على المستند المطلوب.",
          );
      }
    }, 500);
    return () => {
      window.clearInterval(timer);
      onPaper(null);
    };
  }, [id, sourcePath, onPaper]);
  useEffect(() => {
    const doc = output.current?.contentDocument;
    if (!doc || !snapshot) return;
    doc.open();
    doc.write(
      "<!doctype html><html dir='rtl'><head><meta charset='utf-8'></head><body></body></html>",
    );
    doc.close();
    const base = doc.createElement("base");
    base.href = window.location.origin;
    doc.head.append(base);
    const style = doc.createElement("style");
    style.textContent = snapshot.css;
    doc.head.append(style);
    const template = doc.createElement("template");
    template.innerHTML = snapshot.html;
    const root = template.content.firstElementChild as HTMLElement;
    root.dataset.clinicalPreviewProfile = id;
    root.querySelectorAll("[onload],[onerror]").forEach((node) => {
      node.removeAttribute("onload");
      node.removeAttribute("onerror");
    });
    doc.body.append(root);
    root.style.cssText += profileRootCss(profile);
    root.style.setProperty("display", "block", "important");
    addPrintText(root, profile, true);
    const override = doc.createElement("style");
    override.textContent =
      "html,body{margin:0!important;padding:0!important;background:white!important;min-width:0!important}body>*{visibility:visible!important}body{overflow:hidden}*{animation:none!important}";
    doc.head.append(override);
    onPaper(snapshot.complete ? root : null);
    const measure = () => setContentHeight(root.scrollHeight);
    const observer = new ResizeObserver(measure);
    observer.observe(root);
    measure();
    return () => {
      observer.disconnect();
      onPaper(null);
    };
  }, [snapshot, profile, onPaper, id]);
  const url = new URL(sourcePath, window.location.origin);
  if (id === "radiology" || id === "tests")
    url.searchParams.set("printProfile", id);
  if (id === "report") url.searchParams.set("tab", "medical-report");
  url.searchParams.set("printPreview", "1");
  url.searchParams.set("print", "1");
  url.searchParams.delete("autoprint");
  url.searchParams.delete("nativeprint");
  return (
    <>
      <iframe
        ref={source}
        title="مصدر المستند"
        src={`${url.pathname}${url.search}`}
        className="print-preview-source"
        aria-hidden
        tabIndex={-1}
      />
      {status ? <p role="status">{status}</p> : null}
      <iframe
        ref={output}
        title="معاينة المستند الفعلي"
        sandbox="allow-same-origin"
        style={{
          width: "100%",
          height: Math.max((profile.heightMm * 96) / 25.4, contentHeight),
          border: 0,
          display: snapshot ? "block" : "none",
          pointerEvents: "none",
        }}
      />
    </>
  );
}
