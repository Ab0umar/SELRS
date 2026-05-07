import { Capacitor } from "@capacitor/core";
import { Printer } from "@bcyesil/capacitor-plugin-printer";

export function canUseNativeAndroidPrint() {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android";
}

export async function requestNativeAndroidPrint(jobName = "SELRS Print") {
  if (!canUseNativeAndroidPrint()) {
    return { attempted: false, started: false };
  }

  try {
    const htmlContent = document.documentElement.outerHTML;
    await Printer.print({
      printHTML: htmlContent,
      name: jobName,
    });
    return { attempted: true, started: true };
  } catch (e) {
    console.debug("Native print failed:", e);
    // Fallback to web print
    window.print();
    return { attempted: true, started: true };
  }
}
