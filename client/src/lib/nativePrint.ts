import { Capacitor, registerPlugin } from "@capacitor/core";

type NativePrintResult = {
  started?: boolean;
};

type NativePrintPlugin = {
  printCurrentPage(options?: { jobName?: string }): Promise<NativePrintResult>;
};

const NativePrint = registerPlugin<NativePrintPlugin>("NativePrint");

export function canUseNativeAndroidPrint() {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android";
}

export async function requestNativeAndroidPrint(jobName = "SELRS Print") {
  if (!canUseNativeAndroidPrint()) {
    return { attempted: false, started: false };
  }

  const result = await NativePrint.printCurrentPage({ jobName });
  return {
    attempted: true,
    started: Boolean(result?.started ?? true),
  };
}
