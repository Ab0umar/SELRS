import { Capacitor, registerPlugin } from "@capacitor/core";

interface ServerSwitcherPlugin {
  showChooser(): Promise<void>;
}

const ServerSwitcher = registerPlugin<ServerSwitcherPlugin>("ServerSwitcher");

export function canSwitchServer() {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android";
}

export async function openServerSwitcher() {
  if (!canSwitchServer()) return;
  await ServerSwitcher.showChooser();
}
