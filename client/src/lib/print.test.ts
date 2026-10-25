import { describe, expect, it, vi } from "vitest";
import { buildPrintUrl, openPrintWindow } from "./print";

const SHEET_PATH = "/patients/5/sheet";

describe("openPrintWindow", () => {
  it("should_open_window_and_sever_opener_link", () => {
    const win = {
      opener: { replaced: false },
      focus: vi.fn(),
    } as unknown as Window;
    const open = vi.fn(() => win);

    const result = openPrintWindow(SHEET_PATH, {}, open);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.win).toBe(win);
    }
    expect(win.opener).toBeNull();
    expect(win.focus).toHaveBeenCalled();
    expect(open).toHaveBeenCalledWith(
      `${SHEET_PATH}?print=1&autoprint=1`,
      "_blank",
    );
  });

  it("should_report_blocked_when_open_returns_null", () => {
    const open = vi.fn(() => null);

    const result = openPrintWindow(SHEET_PATH, {}, open);

    expect(result).toEqual({
      ok: false,
      reason: "blocked",
      url: `${SHEET_PATH}?print=1&autoprint=1`,
    });
  });

  it("should_return_no_window_when_window_is_undefined", () => {
    const globalWithWindow = globalThis as typeof globalThis & {
      window?: unknown;
    };
    const savedWindow = globalWithWindow.window;
    delete globalWithWindow.window;

    try {
      const result = openPrintWindow(SHEET_PATH);

      expect(result).toEqual({
        ok: false,
        reason: "no-window",
        url: `${SHEET_PATH}?print=1&autoprint=1`,
      });
    } finally {
      if (savedWindow !== undefined) {
        globalWithWindow.window = savedWindow;
      }
    }
  });

  it("should_still_return_ok_when_setting_opener_throws", () => {
    const win = {} as Window;
    Object.defineProperty(win, "opener", {
      get() {
        return {};
      },
      set() {
        throw new Error("cross-origin access denied");
      },
    });
    const open = vi.fn(() => win);

    const result = openPrintWindow(SHEET_PATH, {}, open);

    expect(result.ok).toBe(true);
  });

  it("should_respect_auto_print_false_option", () => {
    const open = vi.fn(() => ({}) as Window);

    openPrintWindow(SHEET_PATH, { autoPrint: false }, open);

    expect(open).toHaveBeenCalledWith(SHEET_PATH, "_blank");
  });
});

describe("buildPrintUrl", () => {
  it("should_add_print_and_autoprint_params_by_default", () => {
    expect(buildPrintUrl(SHEET_PATH)).toBe(
      `${SHEET_PATH}?print=1&autoprint=1`,
    );
  });

  it("should_omit_print_params_when_auto_print_false", () => {
    expect(buildPrintUrl(SHEET_PATH, { autoPrint: false })).toBe(SHEET_PATH);
  });

  it("should_use_native_print_param_when_requested", () => {
    expect(buildPrintUrl(SHEET_PATH, { nativePrint: true })).toBe(
      `${SHEET_PATH}?nativeprint=1`,
    );
  });
});
