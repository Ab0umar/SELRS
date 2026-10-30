import { useRef, useState, type PointerEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";

type BarPosition = { x: number; bottom: number };

function readStoredPosition(key: string): BarPosition | null {
  try {
    const raw = JSON.parse(localStorage.getItem(key) ?? "null");
    return Number.isFinite(raw?.x) && Number.isFinite(raw?.bottom) ? raw : null;
  } catch {
    return null;
  }
}

/**
 * Draggable floating pill with a review sheet that opens above it. The two
 * move together; drag from the pill background or the sheet title.
 */
export default function FloatingBar({
  label,
  storageKey,
  expanded,
  hidden = false,
  zIndex = 55,
  pill,
  sheetTitle,
  sheet,
  onEscape,
}: {
  label: string;
  storageKey: string;
  expanded: boolean;
  hidden?: boolean;
  zIndex?: number;
  pill: ReactNode;
  sheetTitle: ReactNode;
  sheet: ReactNode;
  onEscape?: () => void;
}) {
  const [position, setPosition] = useState(() =>
    readStoredPosition(storageKey),
  );
  const barRef = useRef<HTMLDivElement>(null);
  const dragOffset = useRef<{ x: number; y: number } | null>(null);
  const latest = useRef(position);

  const startDrag = (event: PointerEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    const handle = target.closest("[data-drag-handle]");
    const bar = barRef.current;
    if (!handle || target.closest("button,input,textarea,select") || !bar)
      return;
    dragOffset.current = {
      x: event.clientX - bar.getBoundingClientRect().left,
      y: handle.getBoundingClientRect().bottom - event.clientY,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const moveDrag = (event: PointerEvent<HTMLDivElement>) => {
    const offset = dragOffset.current;
    const bar = barRef.current;
    if (!offset || !bar) return;
    const next = {
      x: Math.max(
        0,
        Math.min(window.innerWidth - bar.offsetWidth, event.clientX - offset.x),
      ),
      bottom: Math.max(
        0,
        Math.min(
          window.innerHeight - 60,
          window.innerHeight - event.clientY - offset.y,
        ),
      ),
    };
    latest.current = next;
    setPosition(next);
  };
  const endDrag = () => {
    if (!dragOffset.current) return;
    dragOffset.current = null;
    try {
      if (latest.current)
        localStorage.setItem(storageKey, JSON.stringify(latest.current));
    } catch {
      // Position memory is a convenience only.
    }
  };

  return createPortal(
    <div
      ref={barRef}
      hidden={hidden}
      dir="rtl"
      role="dialog"
      aria-label={label}
      onKeyDown={(event) => {
        if (event.key === "Escape") onEscape?.();
      }}
      onPointerDown={startDrag}
      onPointerMove={moveDrag}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      style={{
        zIndex,
        ...(position
          ? {
              left: Math.min(position.x, window.innerWidth - 120),
              bottom: Math.min(position.bottom, window.innerHeight - 60),
            }
          : {}),
      }}
      className={
        "fixed w-[min(680px,calc(100vw-2rem))] print:hidden " +
        (position ? "" : "bottom-4 left-1/2 -translate-x-1/2")
      }
    >
      <div
        hidden={!expanded}
        className="mb-2 max-h-[min(42dvh,340px)] space-y-2 overflow-y-auto rounded-2xl border bg-card p-3 text-sm text-card-foreground shadow-2xl"
      >
        <div
          data-drag-handle
          className="cursor-grab touch-none select-none active:cursor-grabbing"
        >
          {sheetTitle}
        </div>
        {sheet}
      </div>
      <div
        data-drag-handle
        className="flex cursor-grab touch-none select-none items-center gap-2 rounded-full border bg-card py-1.5 pe-2 ps-4 text-card-foreground shadow-2xl active:cursor-grabbing"
      >
        {pill}
      </div>
    </div>,
    document.body,
  );
}
