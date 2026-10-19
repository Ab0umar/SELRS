import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getCommandPaletteShortcutLabel,
  OPEN_COMMAND_PALETTE_EVENT,
  openCommandPalette,
} from "./commandPalette";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("command palette helpers", () => {
  it("labels Mac, iPhone and iPad platforms with the command symbol", () => {
    expect(getCommandPaletteShortcutLabel("MacIntel")).toBe("⌘K");
    expect(getCommandPaletteShortcutLabel("macOS")).toBe("⌘K");
    expect(getCommandPaletteShortcutLabel("iPhone")).toBe("⌘K");
    expect(getCommandPaletteShortcutLabel("iPad")).toBe("⌘K");
  });

  it("labels other platforms with Ctrl K", () => {
    expect(getCommandPaletteShortcutLabel("Win32")).toBe("Ctrl K");
    expect(getCommandPaletteShortcutLabel("Linux x86_64")).toBe("Ctrl K");
  });

  it("defaults to Ctrl K when no platform can be resolved", () => {
    vi.stubGlobal("navigator", undefined);
    expect(getCommandPaletteShortcutLabel(undefined)).toBe("Ctrl K");
    expect(getCommandPaletteShortcutLabel("")).toBe("Ctrl K");
  });

  it("reads the platform from navigator when the argument is omitted", () => {
    vi.stubGlobal("navigator", { platform: "MacIntel" });
    expect(getCommandPaletteShortcutLabel()).toBe("⌘K");
    vi.stubGlobal("navigator", { platform: "Win32" });
    expect(getCommandPaletteShortcutLabel()).toBe("Ctrl K");
  });

  it("prefers navigator.userAgentData.platform over navigator.platform", () => {
    vi.stubGlobal("navigator", {
      platform: "Win32",
      userAgentData: { platform: "macOS" },
    });
    expect(getCommandPaletteShortcutLabel()).toBe("⌘K");
  });

  it("dispatches the palette event on window", () => {
    const listener = vi.fn();
    const stubWindow = new EventTarget();
    vi.stubGlobal("window", stubWindow);
    stubWindow.addEventListener(OPEN_COMMAND_PALETTE_EVENT, listener);

    openCommandPalette();

    expect(listener).toHaveBeenCalledTimes(1);
    const event = listener.mock.calls[0]?.[0] as Event;
    expect(event).toBeInstanceOf(Event);
    expect(event.type).toBe("selrs:open-command-palette");
  });

  it("does not throw when window is unavailable", () => {
    vi.stubGlobal("window", undefined);
    expect(() => openCommandPalette()).not.toThrow();
  });
});
