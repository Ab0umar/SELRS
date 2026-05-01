import { BRAND_FOOTER_EN } from "@/lib/brand";

export function AppShellFooter() {
  const ver =
    typeof __APP_VERSION__ !== "undefined" && String(__APP_VERSION__).trim()
      ? `SELRS v${String(__APP_VERSION__).trim()}`
      : "SELRS";

  return (
    <footer
      className="shrink-0 border-t border-border/60 bg-background/90 px-3 py-2 backdrop-blur-sm sm:px-4 md:px-6"
      dir="ltr"
    >
      <div className="mx-auto flex w-full max-w-[1600px] flex-row items-center justify-between gap-3 text-[11px] leading-snug text-muted-foreground">
        <span className="min-w-0 truncate text-left">{BRAND_FOOTER_EN}</span>
        <span className="shrink-0 font-mono tabular-nums text-foreground/80">{ver}</span>
      </div>
    </footer>
  );
}
