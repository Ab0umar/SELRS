// Hand-rolled dialog drawers (createPortal) bypass Radix, so initial focus
// and Tab containment have to be managed explicitly.

export const TABBABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(", ");

/** Tabbable elements under root in DOM order; skips disabled, aria-hidden, tabindex -1, and display:none elements. */
export function getTabbables(root: ParentNode | null): HTMLElement[] {
  if (!root) return [];
  return Array.from(root.querySelectorAll(TABBABLE_SELECTOR)).filter(
    (node): node is HTMLElement => {
      const el = node as HTMLElement;
      if ((el as HTMLButtonElement).disabled === true) return false;
      if (el.getAttribute("aria-hidden") === "true") return false;
      if (el.getAttribute("tabindex") === "-1") return false;
      // getClientRects is empty for display:none nodes; guarded so node-env tests can use plain fake elements.
      if (
        typeof el.getClientRects === "function" &&
        el.getClientRects().length === 0
      ) {
        return false;
      }
      return true;
    },
  );
}

/** Move keyboard focus into the dialog container so screen readers announce its accessible name. */
export function focusDialogContainer(el: HTMLElement | null): void {
  if (!el) return;
  el.focus();
  // focus() silently fails on hidden or not-yet-rendered elements; fall back to the first tabbable.
  if (typeof document !== "undefined" && document.activeElement !== el) {
    getTabbables(el)[0]?.focus();
  }
}

type TabKeyEvent = Pick<
  KeyboardEvent,
  "key" | "shiftKey" | "defaultPrevented" | "preventDefault"
>;

/** Keep Tab and Shift+Tab inside the dialog (WAI-ARIA APG wrap). Returns true when the event was handled. */
export function trapTabKey(
  event: TabKeyEvent,
  container: HTMLElement | null,
  activeElement: Element | null,
): boolean {
  // Already-handled events (e.g. Radix DropdownMenu inside the drawer) keep their own behavior.
  if (event.defaultPrevented || event.key !== "Tab") return false;

  const tabbables = getTabbables(container);
  const first = tabbables[0];
  const last = tabbables[tabbables.length - 1];

  if (!first || !last) {
    event.preventDefault();
    focusDialogContainer(container);
    return true;
  }

  const index = activeElement
    ? tabbables.indexOf(activeElement as HTMLElement)
    : -1;
  const onContainer = activeElement === container;

  if (event.shiftKey && (index === 0 || onContainer)) {
    event.preventDefault();
    last.focus();
    return true;
  }
  if (!event.shiftKey && index === tabbables.length - 1) {
    event.preventDefault();
    first.focus();
    return true;
  }
  if (index === -1 && !onContainer) {
    // Focus escaped the dialog, e.g. onto the overlay button rendered before the aside.
    event.preventDefault();
    (event.shiftKey ? last : first).focus();
    return true;
  }
  return false;
}
