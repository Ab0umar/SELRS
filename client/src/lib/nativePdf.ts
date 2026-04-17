import { Directory, Filesystem } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";
import html2canvas from "html2canvas";
import { Capacitor } from "@capacitor/core";
import { PDFDocument } from "pdf-lib";
import { triggerBlobDownload } from "@/_core/utils/export";
import { canUseNativeAndroidPrint, requestNativeAndroidPrint } from "@/lib/nativePrint";

const isNativeCapacitorPlatform = () => Capacitor.isNativePlatform();

type ExportElementToPdfOptions = {
  fileName: string;
  selector?: string;
  element?: HTMLElement | null;
};

const SNAPSHOT_STYLE_PROPERTIES = [
  "display",
  "position",
  "top",
  "right",
  "bottom",
  "left",
  "zIndex",
  "width",
  "height",
  "minWidth",
  "minHeight",
  "maxWidth",
  "maxHeight",
  "margin",
  "marginTop",
  "marginRight",
  "marginBottom",
  "marginLeft",
  "padding",
  "paddingTop",
  "paddingRight",
  "paddingBottom",
  "paddingLeft",
  "border",
  "borderTop",
  "borderRight",
  "borderBottom",
  "borderLeft",
  "borderRadius",
  "boxSizing",
  "overflow",
  "overflowX",
  "overflowY",
  "flex",
  "flexBasis",
  "flexDirection",
  "flexGrow",
  "flexShrink",
  "flexWrap",
  "alignItems",
  "alignContent",
  "alignSelf",
  "justifyContent",
  "justifyItems",
  "justifySelf",
  "gap",
  "rowGap",
  "columnGap",
  "gridTemplateColumns",
  "gridTemplateRows",
  "gridColumn",
  "gridRow",
  "placeItems",
  "placeContent",
  "font",
  "fontFamily",
  "fontSize",
  "fontWeight",
  "fontStyle",
  "lineHeight",
  "letterSpacing",
  "textAlign",
  "whiteSpace",
  "wordBreak",
  "overflowWrap",
  "direction",
  "unicodeBidi",
  "verticalAlign",
  "opacity",
  "transform",
  "transformOrigin",
  "visibility",
  "objectFit",
  "objectPosition",
  "color",
  "backgroundColor",
  "background",
  "backgroundImage",
  "backgroundPosition",
  "backgroundRepeat",
  "backgroundSize",
  "borderColor",
  "outlineColor",
  "textDecorationColor",
  "caretColor",
  "fill",
  "stroke",
  "boxShadow",
] as const;

function setSafeBackgroundImage(
  style: CSSStyleDeclaration,
  computedStyle: CSSStyleDeclaration
) {
  const backgroundImage = computedStyle.backgroundImage;
  if (
    !backgroundImage ||
    backgroundImage === "none" ||
    backgroundImage.includes("oklch(") ||
    backgroundImage.includes("color-mix(")
  ) {
    style.backgroundImage = "none";
    return;
  }
  style.backgroundImage = backgroundImage;
}

function applySnapshotSafeStyles(
  sourceElement: HTMLElement,
  cloneElement: HTMLElement,
  sourceWindow: Window
) {
  const computedStyle = sourceWindow.getComputedStyle(sourceElement);
  const style = cloneElement.style;

  SNAPSHOT_STYLE_PROPERTIES.forEach((property) => {
    const value = computedStyle.getPropertyValue(property);
    if (!value) return;
    if (value.includes("oklch(") || value.includes("color-mix(")) return;
    style.setProperty(property, value);
  });

  setSafeBackgroundImage(style, computedStyle);

  if (computedStyle.backdropFilter && computedStyle.backdropFilter !== "none") {
    style.backdropFilter = "none";
  }
  if (computedStyle.filter && computedStyle.filter !== "none") {
    style.filter = "none";
  }
}

function syncFormState(sourceElement: HTMLElement, cloneElement: HTMLElement) {
  if (sourceElement instanceof HTMLInputElement && cloneElement instanceof HTMLInputElement) {
    cloneElement.value = sourceElement.value;
    cloneElement.checked = sourceElement.checked;
    cloneElement.disabled = sourceElement.disabled;
    return;
  }

  if (
    sourceElement instanceof HTMLTextAreaElement &&
    cloneElement instanceof HTMLTextAreaElement
  ) {
    cloneElement.value = sourceElement.value;
    cloneElement.textContent = sourceElement.value;
    return;
  }

  if (sourceElement instanceof HTMLSelectElement && cloneElement instanceof HTMLSelectElement) {
    cloneElement.value = sourceElement.value;
  }
}

function syncCanvasContent(sourceElement: HTMLElement, cloneElement: HTMLElement) {
  if (!(sourceElement instanceof HTMLCanvasElement) || !(cloneElement instanceof HTMLCanvasElement)) {
    return;
  }

  cloneElement.width = sourceElement.width;
  cloneElement.height = sourceElement.height;
  const context = cloneElement.getContext("2d");
  if (!context) return;
  context.drawImage(sourceElement, 0, 0);
}

function sanitizeTreeIntoIsolatedDocument(
  sourceElement: HTMLElement,
  targetDocument: Document,
  sourceWindow: Window
): HTMLElement {
  const cloneRoot = sourceElement.cloneNode(true) as HTMLElement;
  const sourceNodes = [sourceElement, ...Array.from(sourceElement.querySelectorAll<HTMLElement>("*"))];
  const cloneNodes = [cloneRoot, ...Array.from(cloneRoot.querySelectorAll<HTMLElement>("*"))];

  cloneNodes.forEach((cloneNode, index) => {
    const sourceNode = sourceNodes[index];
    if (!sourceNode) return;
    applySnapshotSafeStyles(sourceNode, cloneNode, sourceWindow);
    syncFormState(sourceNode, cloneNode);
    syncCanvasContent(sourceNode, cloneNode);
  });

  targetDocument.body.appendChild(cloneRoot);
  return cloneRoot;
}

async function createIsolatedSnapshotTarget(sourceElement: HTMLElement) {
  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.position = "fixed";
  iframe.style.left = "-10000px";
  iframe.style.top = "0";
  iframe.style.width = `${Math.max(sourceElement.scrollWidth, sourceElement.clientWidth, 1)}px`;
  iframe.style.height = `${Math.max(sourceElement.scrollHeight, sourceElement.clientHeight, 1)}px`;
  iframe.style.border = "0";
  iframe.style.opacity = "0";
  iframe.style.pointerEvents = "none";

  document.body.appendChild(iframe);

  const iframeDocument = iframe.contentDocument;
  const iframeWindow = iframe.contentWindow;
  if (!iframeDocument || !iframeWindow) {
    iframe.remove();
    return null;
  }

  iframeDocument.open();
  iframeDocument.write(`<!doctype html><html><head><meta charset="utf-8" /></head><body></body></html>`);
  iframeDocument.close();

  const baseStyle = iframeDocument.createElement("style");
  baseStyle.textContent = `
    html, body {
      margin: 0;
      padding: 0;
      background: #ffffff;
      color: #111827;
    }

    *, *::before, *::after {
      box-sizing: border-box;
      text-shadow: none !important;
    }
  `;
  iframeDocument.head.appendChild(baseStyle);

  const cloneRoot = sanitizeTreeIntoIsolatedDocument(sourceElement, iframeDocument, window);

  await new Promise<void>((resolve) => {
    iframeWindow.requestAnimationFrame(() => resolve());
  });

  return {
    iframe,
    iframeWindow,
    iframeDocument,
    cloneRoot,
    cleanup: () => iframe.remove(),
  };
}

async function savePdfToNativeFile(bytes: Uint8Array, fileName: string) {
  const normalizedName = fileName.endsWith(".pdf") ? fileName : `${fileName}.pdf`;
  const binary = Array.from(bytes, (byte) => String.fromCharCode(byte)).join("");
  const base64Data = btoa(binary);
  const result = await Filesystem.writeFile({
    path: normalizedName,
    data: base64Data,
    directory: Directory.Cache,
    recursive: true,
  });
  return result.uri;
}

export async function exportElementToPdf({
  fileName,
  selector = "[data-mobile-pdf-root]",
  element,
}: ExportElementToPdfOptions) {
  if (typeof window === "undefined" || typeof document === "undefined") return false;
  const target = element ?? (document.querySelector(selector) as HTMLElement | null);
  if (!target) return false;

  const previousScrollTop = target.scrollTop;
  target.scrollTop = 0;

  try {
    if ((document as any).fonts?.ready) {
      await (document as any).fonts.ready;
    }

    const snapshot = await createIsolatedSnapshotTarget(target);
    if (!snapshot) return false;

    try {
      const canvas = await html2canvas(snapshot.cloneRoot, {
        backgroundColor: "#ffffff",
        scale: Math.max(2, window.devicePixelRatio || 1),
        useCORS: true,
        allowTaint: false,
        logging: false,
        imageTimeout: 15000,
        scrollX: 0,
        scrollY: 0,
        windowWidth: Math.max(
          snapshot.iframeDocument.documentElement.clientWidth,
          snapshot.cloneRoot.scrollWidth
        ),
        windowHeight: Math.max(
          snapshot.iframeDocument.documentElement.clientHeight,
          snapshot.cloneRoot.scrollHeight
        ),
      });

      const pdf = await PDFDocument.create();
      const pageWidth = 595.28;
      const pageHeight = 841.89;
      const margin = 12;
      const usableWidth = pageWidth - margin * 2;
      const scale = usableWidth / canvas.width;
      const sourcePageHeight = Math.max(1, Math.floor((pageHeight - margin * 2) / scale));

      for (let sourceY = 0; sourceY < canvas.height; sourceY += sourcePageHeight) {
        const sliceHeight = Math.min(sourcePageHeight, canvas.height - sourceY);
        const sliceCanvas = document.createElement("canvas");
        sliceCanvas.width = canvas.width;
        sliceCanvas.height = sliceHeight;
        const context = sliceCanvas.getContext("2d");
        if (!context) continue;
        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height);
        context.drawImage(
          canvas,
          0,
          sourceY,
          canvas.width,
          sliceHeight,
          0,
          0,
          canvas.width,
          sliceHeight
        );

        const dataUrl = sliceCanvas.toDataURL("image/jpeg", 0.92);
        const image = await pdf.embedJpg(dataUrl);
        const renderedHeight = sliceHeight * scale;
        const page = pdf.addPage([pageWidth, pageHeight]);
        page.drawImage(image, {
          x: margin,
          y: pageHeight - margin - renderedHeight,
          width: usableWidth,
          height: renderedHeight,
        });
      }

      const bytes = await pdf.save();
      const normalizedFileName = fileName.endsWith(".pdf") ? fileName : `${fileName}.pdf`;

      if (isNativeCapacitorPlatform()) {
        const fileUri = await savePdfToNativeFile(new Uint8Array(bytes), normalizedFileName);
        await Share.share({
          title: normalizedFileName,
          text: normalizedFileName,
          url: fileUri,
          dialogTitle: "Share PDF",
        });
        return true;
      }

      const blob = new Blob([new Uint8Array(bytes)], { type: "application/pdf" });
      await triggerBlobDownload(blob, normalizedFileName);
      return true;
    } finally {
      snapshot.cleanup();
    }
  } finally {
    target.scrollTop = previousScrollTop;
  }
}

export async function printOrExportPdf(
  fileName: string,
  options?: Omit<ExportElementToPdfOptions, "fileName">
) {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return false;
  }
  void fileName;
  void options;

  if (canUseNativeAndroidPrint()) {
    try {
      await requestNativeAndroidPrint(document.title || "SELRS Print");
      return true;
    } catch {
      // Fall back to browser print for non-native environments or plugin failures.
    }
  }

  window.print();
  return true;
}
