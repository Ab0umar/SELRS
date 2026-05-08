import { Capacitor } from "@capacitor/core";
import { Printer } from "@bcyesil/capacitor-plugin-printer";
import { toast } from "sonner";

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
      content: htmlContent,
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
