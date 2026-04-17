import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";

import { cn } from "@/lib/utils";

type TabsProps = React.ComponentProps<typeof TabsPrimitive.Root> & {
  persistKey?: string;
  showSwipeHint?: boolean;
};

function Tabs({
  className,
  defaultValue,
  onValueChange,
  persistKey,
  showSwipeHint = true,
  ...props
}: TabsProps) {
  const rootRef = React.useRef<HTMLDivElement | null>(null);
  const touchStartRef = React.useRef<{ x: number; y: number } | null>(null);
  const [showHint, setShowHint] = React.useState(false);
  const [storedDefaultValue] = React.useState(() => {
    if (typeof window === "undefined" || !persistKey) return undefined;
    try {
      return localStorage.getItem(`tabs:${persistKey}`) || undefined;
    } catch {
      return undefined;
    }
  });

  const moveTab = React.useCallback((direction: "next" | "prev") => {
    const root = rootRef.current;
    if (!root) return;

    const triggers = Array.from(
      root.querySelectorAll<HTMLElement>('[data-slot="tabs-trigger"][data-tab-value]')
    ).filter((trigger) => !trigger.hasAttribute("disabled"));
    if (triggers.length < 2) return;

    const activeIndex = triggers.findIndex((trigger) => trigger.getAttribute("data-state") === "active");
    if (activeIndex < 0) return;

    const nextIndex = direction === "next" ? activeIndex + 1 : activeIndex - 1;
    const nextTrigger = triggers[nextIndex];
    if (!nextTrigger) return;
    nextTrigger.click();
  }, []);

  const onTouchStart = React.useCallback((event: React.TouchEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement | null;
    if (target?.closest("input, textarea, select, button[data-no-tab-swipe='true']")) {
      touchStartRef.current = null;
      return;
    }

    const touch = event.changedTouches[0];
    if (!touch) return;
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
  }, []);

  const onTouchEnd = React.useCallback((event: React.TouchEvent<HTMLDivElement>) => {
    const start = touchStartRef.current;
    touchStartRef.current = null;
    if (!start) return;

    const touch = event.changedTouches[0];
    if (!touch) return;

    const deltaX = touch.clientX - start.x;
    const deltaY = touch.clientY - start.y;
    if (Math.abs(deltaX) < 50 || Math.abs(deltaX) <= Math.abs(deltaY) * 1.2) return;

    if (deltaX < 0) {
      moveTab("next");
      return;
    }
    moveTab("prev");
  }, [moveTab]);

  React.useEffect(() => {
    if (typeof window === "undefined" || !showSwipeHint) return;
    if (window.matchMedia?.("(pointer: coarse)")?.matches !== true) return;
    if (localStorage.getItem("tabs:swipe-hint-seen") === "1") return;
    const root = rootRef.current;
    if (!root) return;
    const triggers = root.querySelectorAll('[data-slot="tabs-trigger"]');
    if (triggers.length < 2) return;

    const timer = window.setTimeout(() => {
      setShowHint(true);
      localStorage.setItem("tabs:swipe-hint-seen", "1");
      window.setTimeout(() => setShowHint(false), 2600);
    }, 600);
    return () => window.clearTimeout(timer);
  }, [showSwipeHint]);

  const handleValueChange = React.useCallback(
    (value: string) => {
      if (persistKey && typeof window !== "undefined") {
        try {
          localStorage.setItem(`tabs:${persistKey}`, value);
        } catch {
          // Ignore storage errors.
        }
      }
      onValueChange?.(value);
    },
    [onValueChange, persistKey]
  );

  return (
    <TabsPrimitive.Root
      ref={rootRef}
      data-slot="tabs"
      className={cn("relative flex flex-col gap-2", className)}
      defaultValue={storedDefaultValue ?? defaultValue}
      onValueChange={handleValueChange}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      {...props}
    >
      {props.children}
      {showHint ? (
        <div className="pointer-events-none absolute top-12 right-3 z-20 rounded-full border border-primary/20 bg-background/95 px-3 py-1 text-xs text-muted-foreground shadow-sm backdrop-blur">
          Swipe to change tabs
        </div>
      ) : null}
    </TabsPrimitive.Root>
  );
}

function TabsList({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      className={cn(
        "bg-muted text-muted-foreground inline-flex h-9 w-fit max-w-full items-center justify-start gap-1 overflow-x-auto rounded-lg p-[3px] [scrollbar-width:none]",
        className
      )}
      {...props}
    />
  );
}

function TabsTrigger({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      data-tab-value={typeof props.value === "string" ? props.value : undefined}
      className={cn(
        "data-[state=active]:bg-background dark:data-[state=active]:text-foreground focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:outline-ring dark:data-[state=active]:border-input dark:data-[state=active]:bg-input/30 text-foreground dark:text-muted-foreground inline-flex h-[calc(100%-1px)] flex-1 items-center justify-center gap-1.5 rounded-md border border-transparent px-2 py-1 text-sm font-medium whitespace-nowrap transition-[color,box-shadow] focus-visible:ring-[3px] focus-visible:outline-1 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:shadow-sm [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    />
  );
}

function TabsContent({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn("flex-1 outline-none", className)}
      {...props}
    />
  );
}

export { Tabs, TabsList, TabsTrigger, TabsContent };
