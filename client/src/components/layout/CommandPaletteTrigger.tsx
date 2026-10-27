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
        "h-9 shrink-0 rounded-lg border-border/70 bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground text-xs font-semibold",
        "w-9 p-0 xl:w-auto xl:gap-2 xl:px-3",
        className,
      )}
    >
      <Search className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span className="hidden xl:inline text-xs font-medium">بحث سريع</span>
      <Kbd dir="ltr" className="hidden xl:inline-flex text-[10px] font-mono py-0 px-1.5 h-4.5 bg-background border-border/80 text-muted-foreground">
        {shortcutLabel}
      </Kbd>
    </Button>
  );
}
