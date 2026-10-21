export const OPEN_COMMAND_PALETTE_EVENT = "selrs:open-command-palette";

const APPLE_SHORTCUT_LABEL = "⌘K";
const CONTROL_SHORTCUT_LABEL = "Ctrl K";
const APPLE_PLATFORM_PATTERN = /mac|iphone|ipad|ios/i;

function isApplePlatform(platform: string): boolean {
  return APPLE_PLATFORM_PATTERN.test(platform);
}

function readNavigatorPlatform(): string | undefined {
  if (typeof navigator === "undefined") return undefined;
  const withUserData = navigator as Navigator & {
    userAgentData?: { platform?: string };
  };
  const userAgentPlatform = withUserData.userAgentData?.platform;
  if (typeof userAgentPlatform === "string" && userAgentPlatform !== "") {
    return userAgentPlatform;
  }
  const platform = navigator.platform;
  if (typeof platform === "string" && platform !== "") return platform;
  return undefined;
}

export function openCommandPalette(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(OPEN_COMMAND_PALETTE_EVENT));
}

export function getCommandPaletteShortcutLabel(platform?: string): string {
  const source =
    typeof platform === "string" && platform !== ""
      ? platform
      : readNavigatorPlatform();
  return source && isApplePlatform(source)
    ? APPLE_SHORTCUT_LABEL
    : CONTROL_SHORTCUT_LABEL;
}
