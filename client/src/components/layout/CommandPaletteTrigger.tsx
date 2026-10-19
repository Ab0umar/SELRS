import { Search } from "lucide-react";
import { useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { cn } from "@/lib/utils";
import {
  getCommandPaletteShortcutLabel,
  openCommandPalette,
} from "@/lib/commandPalette";

// Rendered before mount so server HTML and the first client render match;
// replaced by the platform-aware label once hydrated.
const SSR_SHORTCUT_LABEL = "Ctrl K";

const emptySubscribe = () => () => {};

type CommandPaletteTriggerProps = {
  className?: string;
};

export function CommandPaletteTrigger({
  className,
}: CommandPaletteTriggerProps) {
  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
  const shortcutLabel = mounted
    ? getCommandPaletteShortcutLabel()
    : SSR_SHORTCUT_LABEL;

  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      onClick={openCommandPalette}
      aria-label="فتح لوحة البحث"
      aria-keyshortcuts="Control+K Meta+K"
      title={`بحث (${shortcutLabel})`}
      className={cn(
        "size-11 shrink-0 rounded-lg border-border bg-background/70 md:rounded-2xl",
        "xl:w-auto xl:gap-2 xl:px-3",
        className,
      )}
    >
      <Search className="h-4 w-4" aria-hidden="true" />
      <span className="hidden xl:inline">بحث</span>
      <Kbd dir="ltr" className="hidden xl:inline-flex">
        {shortcutLabel}
      </Kbd>
    </Button>
  );
}
