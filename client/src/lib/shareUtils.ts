import { Share } from "@capacitor/share";
import { Capacitor } from "@capacitor/core";

export async function shareContent(options: {
  title?: string;
  text?: string;
  url?: string;
  dialogTitle?: string;
}) {
  // Web fallback
  if (!Capacitor.isNativePlatform()) {
    if (navigator.share) {
      try {
        await navigator.share({
          title: options.title,
          text: options.text,
          url: options.url,
        });
        return true;
      } catch (e) {
        console.debug("Web share failed:", e);
        return false;
      }
    }
    // Fallback: copy to clipboard
    const textToCopy = [options.title, options.text, options.url].filter(Boolean).join("\n");
    if (textToCopy && navigator.clipboard) {
      await navigator.clipboard.writeText(textToCopy);
      return true;
    }
    return false;
  }

  // Native
  try {
    await Share.share({
      title: options.title,
      text: options.text,
      url: options.url,
      dialogTitle: options.dialogTitle,
    });
    return true;
  } catch (e) {
    console.debug("Native share failed:", e);
    return false;
  }
}

export async function shareCurrentPage(title?: string) {
  const pageTitle = title || document.title || "Check this out";
  const pageUrl = window.location.href;
  const pageText = document.body.innerText?.substring(0, 500) || "";

  return shareContent({
    title: pageTitle,
    text: pageText,
    url: pageUrl,
    dialogTitle: "Share",
  });
}

export async function shareMedicalReport(reportId: string, reportTitle: string) {
  return shareContent({
    title: `Medical Report: ${reportTitle}`,
    text: `View my medical report: ${reportTitle}`,
    url: `${window.location.origin}/medical-reports/${reportId}`,
    dialogTitle: "Share Report",
  });
}

export async function sharePrescription(prescriptionId: string) {
  return shareContent({
    title: "Prescription",
    text: "View my prescription",
    url: `${window.location.origin}/prescription/${prescriptionId}`,
    dialogTitle: "Share Prescription",
  });
}
