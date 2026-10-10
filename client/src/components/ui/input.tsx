import { useDialogComposition } from "@/components/ui/dialog";
import { useComposition } from "@/hooks/useComposition";
import { cn } from "@/lib/utils";
import * as React from "react";

function Input({
  className,
  type,
  onKeyDown,
  onCompositionStart,
  onCompositionEnd,
  ref,
  placeholder,
  bare = false,
  ...props
}: React.ComponentProps<"input"> & {
  /** Keep the field's own classes and layout; only naming, IME handling and the focus ring are shared. */
  bare?: boolean;
}) {
  // Get dialog composition context if available (will be no-op if not inside Dialog)
  const dialogComposition = useDialogComposition();

  // Add composition event handlers to support input method editor (IME) for CJK languages.
  const {
    onCompositionStart: handleCompositionStart,
    onCompositionEnd: handleCompositionEnd,
    onKeyDown: handleKeyDown,
  } = useComposition<HTMLInputElement>({
    onKeyDown: (e) => {
      // Check if this is an Enter key that should be blocked
      const isComposing =
        (e.nativeEvent as any).isComposing ||
        dialogComposition.justEndedComposing();

      // If Enter key is pressed while composing or just after composition ended,
      // don't call the user's onKeyDown (this blocks the business logic)
      if (e.key === "Enter" && isComposing) {
        return;
      }

      // Otherwise, call the user's onKeyDown
      onKeyDown?.(e);
    },
    onCompositionStart: (e) => {
      dialogComposition.setComposing(true);
      onCompositionStart?.(e);
    },
    onCompositionEnd: (e) => {
      // Mark that composition just ended - this helps handle the Enter key that confirms input
      dialogComposition.markCompositionEnd();
      // Delay setting composing to false to handle Safari's event order
      // In Safari, compositionEnd fires before the ESC keydown event
      setTimeout(() => {
        dialogComposition.setComposing(false);
      }, 100);
      onCompositionEnd?.(e);
    },
  });

  // Fields with only a placeholder get it as their accessible name (DESIGN.md: controls have labels).
  const setRef = React.useCallback(
    (el: HTMLInputElement | null) => {
      if (
        el &&
        !el.getAttribute("aria-label") &&
        !el.getAttribute("aria-labelledby") &&
        !el.getAttribute("title") &&
        !el.labels?.length
      ) {
        // Name unlinked fields from a sibling <label> in the same wrapper, then from the placeholder.
        const wrapperLabels = el.parentElement
          ? Array.from(el.parentElement.children).filter((c) => c.tagName === "LABEL")
          : [];
        const sibling =
          el.previousElementSibling?.tagName === "LABEL"
            ? el.previousElementSibling
            : wrapperLabels.length === 1
              ? wrapperLabels[0]
              : null;
        const text = sibling?.textContent?.trim() || placeholder;
        if (text) el.setAttribute("aria-label", text);
      }
      if (typeof ref === "function") ref(el);
      else if (ref) (ref as React.MutableRefObject<HTMLInputElement | null>).current = el;
    },
    [ref, placeholder],
  );

  return (
    <input
      ref={setRef}
      placeholder={placeholder}
      type={type}
      data-slot="input"
      className={cn(
        bare && "outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-50",
        !bare && "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground text-foreground border-input min-h-11 h-11 w-full max-w-full print:max-w-none print:min-h-0 min-w-0 rounded-md border bg-card px-3 py-2 text-base sm:text-sm transition-colors outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        !bare && "focus-visible:border-ring focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        !bare && "aria-invalid:border-destructive",
        className,
      )}
      onCompositionStart={handleCompositionStart}
      onCompositionEnd={handleCompositionEnd}
      onKeyDown={handleKeyDown}
      {...props}
    />
  );
}

export { Input };
