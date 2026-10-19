import { describe, expect, it, vi } from "vitest";
import {
  TABBABLE_SELECTOR,
  focusDialogContainer,
  getTabbables,
  trapTabKey,
} from "./dialog-focus";

function el(attrs: Record<string, string> = {}, extras: Record<string, unknown> = {}) {
  return {
    disabled: false,
    focus: vi.fn(),
    getAttribute: (name: string) => (name in attrs ? attrs[name] : null),
    ...extras,
  } as unknown as HTMLElement;
}

function drawer(children: HTMLElement[]) {
  return {
    focus: vi.fn(),
    querySelectorAll: vi.fn(() => children),
  } as unknown as HTMLElement;
}

function keyEvent(key = "Tab", shiftKey = false, defaultPrevented = false) {
  return { key, shiftKey, defaultPrevented, preventDefault: vi.fn() };
}

describe("dialog focus helpers", () => {
  it("matches anchors, enabled form controls, and explicit tabindex targets", () => {
    expect(TABBABLE_SELECTOR).toContain("a[href]");
    expect(TABBABLE_SELECTOR).toContain("button:not([disabled])");
    expect(TABBABLE_SELECTOR).toContain('[tabindex]:not([tabindex="-1"])');
  });

  it("filters disabled, aria-hidden, tabindex -1, and hidden elements", () => {
    const enabled = el();
    const disabled = el({}, { disabled: true });
    const hidden = el({ "aria-hidden": "true" });
    const negativeTab = el({ tabindex: "-1" });
    const displayNone = el({}, { getClientRects: () => [] });
    const visible = el({}, { getClientRects: () => [{ width: 8 }] });
    const root = drawer([
      enabled,
      disabled,
      hidden,
      negativeTab,
      displayNone,
      visible,
    ]);
    expect(getTabbables(root)).toEqual([enabled, visible]);
  });

  it("returns no tabbables for a null root", () => {
    expect(getTabbables(null)).toEqual([]);
  });

  it("wraps forward from the last tabbable to the first", () => {
    const first = el();
    const middle = el();
    const last = el();
    const root = drawer([first, middle, last]);
    const event = keyEvent();
    expect(trapTabKey(event, root, last)).toBe(true);
    expect(event.preventDefault).toHaveBeenCalledOnce();
    expect(first.focus).toHaveBeenCalledOnce();
  });

  it("wraps backward from the first tabbable to the last", () => {
    const first = el();
    const middle = el();
    const last = el();
    const root = drawer([first, middle, last]);
    const event = keyEvent("Tab", true);
    expect(trapTabKey(event, root, first)).toBe(true);
    expect(event.preventDefault).toHaveBeenCalledOnce();
    expect(last.focus).toHaveBeenCalledOnce();
  });

  it("moves from the container itself to the last tabbable on Shift+Tab", () => {
    const first = el();
    const last = el();
    const root = drawer([first, last]);
    const event = keyEvent("Tab", true);
    expect(trapTabKey(event, root, root)).toBe(true);
    expect(event.preventDefault).toHaveBeenCalledOnce();
    expect(last.focus).toHaveBeenCalledOnce();
  });

  it("prevents Tab and focuses the container when nothing is tabbable", () => {
    const root = drawer([]);
    const event = keyEvent();
    expect(trapTabKey(event, root, null)).toBe(true);
    expect(event.preventDefault).toHaveBeenCalledOnce();
    expect(root.focus).toHaveBeenCalledOnce();
  });

  it("returns false for a middle element so the browser moves focus", () => {
    const first = el();
    const middle = el();
    const last = el();
    const root = drawer([first, middle, last]);
    const event = keyEvent();
    expect(trapTabKey(event, root, middle)).toBe(false);
    expect(event.preventDefault).not.toHaveBeenCalled();
    expect(first.focus).not.toHaveBeenCalled();
    expect(last.focus).not.toHaveBeenCalled();
  });

  it("pulls focus back in when it sits outside the drawer", () => {
    const first = el();
    const last = el();
    const outside = el();
    const root = drawer([first, last]);
    const forward = keyEvent();
    expect(trapTabKey(forward, root, outside)).toBe(true);
    expect(first.focus).toHaveBeenCalledOnce();
    const backward = keyEvent("Tab", true);
    expect(trapTabKey(backward, root, outside)).toBe(true);
    expect(last.focus).toHaveBeenCalledOnce();
  });

  it("ignores already-handled events and non-Tab keys", () => {
    const only = el();
    const root = drawer([only]);
    const handled = keyEvent("Tab", false, true);
    const escape = keyEvent("Escape");
    expect(trapTabKey(handled, root, null)).toBe(false);
    expect(trapTabKey(escape, root, null)).toBe(false);
    expect(handled.preventDefault).not.toHaveBeenCalled();
    expect(escape.preventDefault).not.toHaveBeenCalled();
    expect(only.focus).not.toHaveBeenCalled();
  });

  it("focuses the container, falling back to the first tabbable when focus does not stick", () => {
    const first = el();
    const root = drawer([first]);
    focusDialogContainer(root);
    expect(root.focus).toHaveBeenCalledOnce();

    vi.stubGlobal("document", { activeElement: {} });
    try {
      const fallback = el();
      const root2 = drawer([fallback]);
      focusDialogContainer(root2);
      expect(fallback.focus).toHaveBeenCalledOnce();
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("tolerates a null container", () => {
    expect(() => focusDialogContainer(null)).not.toThrow();
  });
});
