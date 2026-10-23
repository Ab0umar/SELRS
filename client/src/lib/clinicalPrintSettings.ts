import {
  defaultPrintProfile,
  readClinicalPrintSettings,
  type ClinicalPrintSettings,
  type PrintProfile,
  type PrintProfileId,
} from "../../../shared/printSettings";

export const PRINT_DOCUMENTS: {
  id: PrintProfileId;
  label: string;
  selector: string;
  route: RegExp;
}[] = [
  {
    id: "prescription",
    label: "الروشتات",
    selector: ".prescription-paper",
    route: /^\/prescription(?:\/|$)/,
  },
  {
    id: "tests",
    label: "طلبات التحاليل والفحوصات",
    selector: ".request-tests-paper",
    route: /^\/request-tests(?:\/|$)/,
  },
  {
    id: "radiology",
    label: "طلبات الأشعة",
    selector: ".request-tests-paper",
    route: /$^/,
  },
  {
    id: "consultant",
    label: "شيت الاستشاري",
    selector: ".lasik-sheet",
    route: /^\/sheets\/consultant(?:\/|$)/,
  },
  {
    id: "specialist",
    label: "شيت الأخصائي",
    selector: ".specialist-sheet",
    route: /^\/sheets\/specialist(?:\/|$)/,
  },
  {
    id: "lasik",
    label: "شيت الليزك",
    selector: ".lasik-sheet",
    route: /^\/sheets\/lasik(?:\/|$)/,
  },
  {
    id: "external",
    label: "الشيت الخارجي",
    selector: ".lasik-sheet, .a4-page-card",
    route: /^\/sheets\/external(?:\/|$)/,
  },
  {
    id: "followup",
    label: "شيت المتابعة",
    selector: ".lasik-sheet, .sheet-followup-body",
    route: /^\/sheets\/(?:consultant-followup|lasik-followup)(?:\/|$)/,
  },
  {
    id: "refraction",
    label: "مقاس النظارة",
    selector: ".refraction-print-card",
    route: /^\/refraction(?:\/|$)/,
  },
  {
    id: "clinical-report",
    label: "التقرير السريري",
    selector: ".report-sheet-body",
    route: /^\/clinical-report(?:\/|$)/,
  },
  {
    id: "medical-condition",
    label: "تقرير الحالة الطبية",
    selector: ".report-sheet-body",
    route: /^\/medical-condition-report(?:\/|$)/,
  },
  {
    id: "pre-post-op",
    label: "تقرير ما قبل وبعد العملية",
    selector: ".report-sheet-body",
    route: /^\/pre-post-op-report(?:\/|$)/,
  },
  {
    id: "offdays",
    label: "إجازات العمليات",
    selector: ".report-sheet-body",
    route: /^\/post-op-offdays(?:-en)?(?:\/|$)/,
  },
  {
    id: "summary",
    label: "ملخص المريض",
    selector: ".patient-summary-print-root",
    route: /^\/patient-summary(?:\/|$)/,
  },
  {
    id: "referral",
    label: "خطابات التحويل",
    selector: ".report-sheet-body",
    route: /^\/sheets\/referral(?:\/|$)/,
  },
  {
    id: "report",
    label: "التقارير الطبية",
    selector: ".printable-report-sheet",
    route: /^\/(?:medical-reports|clinical-reports)(?:\/|$)/,
  },
];

let settings: ClinicalPrintSettings = readClinicalPrintSettings(null);
let loader: ((signal?: AbortSignal) => Promise<unknown>) | undefined;
let pending: Promise<void> | undefined;
export function setClinicalPrintSettings(value: unknown) {
  settings = readClinicalPrintSettings(value);
}
export function setPrintSettingsLoader(
  value: ((signal?: AbortSignal) => Promise<unknown>) | undefined,
) {
  loader = value;
}
export async function ensureClinicalPrintSettings() {
  if (!loader) return;
  if (!pending) {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const deadline = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        controller.abort();
        reject(new Error("Print settings timeout"));
      }, 2500);
    });
    pending = Promise.race([loader(controller.signal), deadline])
      .then((value) => {
        setClinicalPrintSettings(value);
      })
      .catch(() => {
        /* Keep the last known configuration when printing offline. */
      })
      .finally(() => {
        clearTimeout(timer);
        pending = undefined;
      });
  }
  await pending;
}
export function resolvePrintDocument(path: string, explicit?: string | null) {
  path = path.replace(/^\/(?:patient-hub|clinics-hub)(?=\/)/, "");
  if (
    !explicit &&
    /^\/sheets\/(?:consultant|lasik)\/[^/]+\/followup\/?$/.test(path)
  )
    return PRINT_DOCUMENTS.find((item) => item.id === "followup");
  return (
    PRINT_DOCUMENTS.find((item) => item.id === explicit) ??
    PRINT_DOCUMENTS.find((item) => item.route.test(path))
  );
}
export function currentPrintDocument() {
  const eligible = (node: Element) =>
    !node.closest('[hidden], [role="tabpanel"][data-state="inactive"]');
  const tagged = [
    ...document.querySelectorAll("[data-clinical-print-profile]"),
  ].filter(eligible);
  const explicit = (
    tagged.find((node) => node.getClientRects().length > 0) ?? tagged[0]
  )?.getAttribute("data-clinical-print-profile");
  const sheet = [
    ...document.querySelectorAll(
      ".sheet-type-consultant, .sheet-type-lasik, .sheet-type-external",
    ),
  ].find(eligible);
  const sheetId = sheet
    ? ["consultant", "lasik", "external"].find((id) =>
        sheet.classList.contains(`sheet-type-${id}`),
      )
    : undefined;
  return (
    resolvePrintDocument(window.location.pathname, explicit) ??
    (document.querySelector('[data-print-document="followup"]')
      ? PRINT_DOCUMENTS.find((item) => item.id === "followup")
      : undefined) ??
    (sheetId
      ? PRINT_DOCUMENTS.find((item) => item.id === sheetId)
      : undefined) ??
    PRINT_DOCUMENTS.find(
      (item) =>
        ["prescription", "tests", "specialist", "report"].includes(item.id) &&
        [...document.querySelectorAll(item.selector)].some(eligible),
    )
  );
}
export function currentPrintProfile(): PrintProfile | undefined {
  const definition = currentPrintDocument();
  const profile = definition ? settings.profiles[definition.id] : undefined;
  return profile?.enabled ? profile : undefined;
}
export function getPrintProfile(
  config: ClinicalPrintSettings,
  id: PrintProfileId,
) {
  return config.profiles[id] ?? defaultPrintProfile();
}
export function profileRootCss(profile: PrintProfile, contentOnly = false) {
  const width = contentOnly
    ? profile.widthMm - profile.leftMm - profile.rightMm
    : profile.widthMm;
  const height = contentOnly
    ? profile.heightMm - profile.topMm - profile.bottomMm
    : profile.heightMm;
  const padding = contentOnly
    ? "0"
    : `${profile.topMm}mm ${profile.rightMm}mm ${profile.bottomMm}mm ${profile.leftMm}mm`;
  return `box-sizing:border-box!important;position:relative!important;inset:auto!important;margin:0!important;min-width:0!important;width:${width}mm!important;max-width:none!important;height:auto!important;min-height:${height}mm!important;padding:${padding}!important;overflow:visible!important;transform:none!important;background:#fff!important;color:#111!important;`;
}
export function addPrintText(
  root: HTMLElement,
  profile: PrintProfile,
  preview = false,
) {
  root
    .querySelectorAll(":scope > [data-clinical-print-text]")
    .forEach((node) => node.remove());
  for (const position of ["header", "footer"] as const) {
    if (!profile[position].trim()) continue;
    const node = root.ownerDocument.createElement("div");
    node.dataset.clinicalPrintText = position;
    node.textContent = profile[position];
    node.style.cssText = `white-space:pre-wrap;overflow-wrap:anywhere;font-size:10pt;line-height:1.5;direction:rtl;text-align:center;${position === "header" ? "margin-bottom:5mm" : "margin-top:5mm"};${preview ? "" : "display:none"}`;
    if (position === "header") root.prepend(node);
    else root.append(node);
  }
}
export function applyClinicalPrintSettings(): void {
  document.getElementById("clinical-print-settings-style")?.remove();
  document.documentElement.removeAttribute("data-clinical-print-active");
  document.body.removeAttribute("data-clinical-print-active");
  document
    .querySelectorAll("[data-configured-print-container]")
    .forEach((node) => node.removeAttribute("data-configured-print-container"));
  document.querySelectorAll("[data-configured-print-root]").forEach((node) => {
    node.removeAttribute("data-configured-print-root");
    node
      .querySelectorAll(":scope > [data-clinical-print-text]")
      .forEach((child) => child.remove());
  });
  const definition = currentPrintDocument(),
    profile = currentPrintProfile();
  if (!definition || !profile) return;
  const roots = [
    ...document.querySelectorAll<HTMLElement>(definition.selector),
  ].filter((root) => !root.parentElement?.closest(definition.selector));
  if (!roots.length) return;
  document.body.dataset.clinicalPrintActive = "true";
  document.documentElement.dataset.clinicalPrintActive = "true";
  roots.forEach((root) => {
    root.dataset.configuredPrintRoot = "true";
    addPrintText(root, profile);
    for (
      let ancestor = root.parentElement;
      ancestor && ancestor !== document.body;
      ancestor = ancestor.parentElement
    )
      ancestor.dataset.configuredPrintContainer = "true";
  });
  const style = document.createElement("style");
  style.id = "clinical-print-settings-style";
  style.textContent = `@media print{@page{size:${profile.widthMm}mm ${profile.heightMm}mm;margin:${profile.topMm}mm ${profile.rightMm}mm ${profile.bottomMm}mm ${profile.leftMm}mm}@layer base{html[data-clinical-print-active],html body[data-clinical-print-active],html body [data-configured-print-container]{width:auto!important;max-width:none!important;min-width:0!important;min-height:0!important;height:auto!important;margin:0!important;padding:0!important;overflow:visible!important;transform:none!important;position:static!important;}html body [data-configured-print-root]{${profileRootCss(profile, true)}}html body [data-configured-print-root]>[data-clinical-print-text]{display:block!important;}}}`;
  document.body.append(style);
}
