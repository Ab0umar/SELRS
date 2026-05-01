import { Skeleton } from "@/components/ui/skeleton";

export function AppShellSkeleton() {
  return (
    <div
      className="flex min-h-screen bg-[radial-gradient(circle_at_top_left,color-mix(in_srgb,var(--primary)_8%,transparent),transparent_34%),linear-gradient(180deg,#fff,var(--selrs-light-blue))]"
      dir="rtl"
    >
      <div className="relative w-[280px] border-r border-border/70 bg-card/90 p-4 shadow-sm">
        <div className="flex items-center gap-3 px-2">
          <Skeleton className="h-9 w-9 rounded-xl" />
          <div className="space-y-2">
            <Skeleton className="h-3 w-16 rounded-full" />
            <Skeleton className="h-4 w-24 rounded-full" />
          </div>
        </div>
        <div className="mt-6 space-y-2 px-2">
          <Skeleton className="h-11 w-full rounded-xl" />
          <Skeleton className="h-11 w-full rounded-xl" />
          <Skeleton className="h-11 w-full rounded-xl" />
        </div>
        <div className="absolute bottom-4 left-4 right-4">
          <div className="flex items-center gap-3 rounded-2xl border border-border/80 bg-muted/40 px-3 py-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3 w-20 rounded-full" />
              <Skeleton className="h-2 w-32 rounded-full" />
            </div>
          </div>
        </div>
      </div>
      <div className="min-w-0 flex-1 space-y-4 p-4">
        <div className="rounded-[28px] border border-border/80 bg-card/90 p-6 shadow-sm">
          <Skeleton className="h-3 w-24 rounded-full" />
          <Skeleton className="mt-3 h-10 w-64 rounded-2xl" />
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <Skeleton className="h-24 rounded-2xl" />
            <Skeleton className="h-24 rounded-2xl" />
            <Skeleton className="h-24 rounded-2xl" />
          </div>
        </div>
      </div>
    </div>
  );
}
