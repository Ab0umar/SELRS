import { Skeleton } from "@/components/ui/skeleton";

function SidebarItemSkeleton({ active = false }: { active?: boolean }) {
  return (
    <div
      className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 ${
        active ? "border-primary/20 bg-primary/8" : "border-border/60 bg-muted/20"
      }`}
    >
      <Skeleton className={`h-9 w-9 rounded-lg ${active ? "bg-primary/15" : ""}`} />
      <div className="min-w-0 flex-1 space-y-2">
        <Skeleton className={`h-3.5 w-24 rounded-full ${active ? "bg-primary/15" : ""}`} />
        <Skeleton className="h-2.5 w-14 rounded-full" />
      </div>
    </div>
  );
}

export function AppShellSkeleton() {
  return (
    <div
      className="min-h-screen bg-[radial-gradient(circle_at_top_left,color-mix(in_srgb,var(--primary)_8%,transparent),transparent_34%),linear-gradient(180deg,var(--background),var(--selrs-light-blue))]"
      aria-busy="true"
      aria-label="جاري تحميل واجهة النظام"
      dir="rtl"
    >
      <div className="mx-auto grid min-h-screen w-full max-w-[1520px] gap-4 px-3 py-4 sm:px-4 lg:grid-cols-[18rem_minmax(0,1fr)] lg:px-6">
        <aside className="space-y-3 rounded-2xl border border-border/70 bg-card/90 p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <Skeleton className="h-11 w-11 rounded-2xl" />
            <div className="min-w-0 space-y-2">
              <Skeleton className="h-4 w-24 rounded-full" />
              <Skeleton className="h-3 w-32 rounded-full" />
            </div>
          </div>

          <div className="space-y-2 pt-1">
            <SidebarItemSkeleton active />
            <SidebarItemSkeleton />
            <SidebarItemSkeleton />
            <SidebarItemSkeleton />
          </div>

          <div className="rounded-2xl border border-border/70 bg-muted/15 p-3">
            <Skeleton className="h-3 w-20 rounded-full" />
            <div className="mt-3 flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-3.5 w-24 rounded-full" />
                <Skeleton className="h-2.5 w-28 rounded-full" />
              </div>
            </div>
          </div>
        </aside>

        <main className="space-y-4">
          <section className="rounded-2xl border border-border/70 bg-card/90 p-4 shadow-sm sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 space-y-2">
                <Skeleton className="h-3 w-24 rounded-full" />
                <Skeleton className="h-8 w-64 rounded-2xl" />
                <Skeleton className="h-3 w-80 max-w-full rounded-full" />
              </div>
              <div className="flex items-center gap-2">
                <Skeleton className="h-10 w-28 rounded-xl" />
                <Skeleton className="h-10 w-24 rounded-xl" />
              </div>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="rounded-2xl border border-border/60 bg-muted/15 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 space-y-2">
                      <Skeleton className="h-3 w-20 rounded-full" />
                      <Skeleton className="h-7 w-14 rounded-full" />
                      <Skeleton className="h-3 w-24 rounded-full" />
                    </div>
                    <Skeleton className="h-9 w-9 rounded-xl" />
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_18rem]">
            <div className="space-y-4 rounded-2xl border border-border/70 bg-card/90 p-4 shadow-sm sm:p-5">
              <div className="flex items-center justify-between gap-3">
                <div className="space-y-2">
                  <Skeleton className="h-3 w-24 rounded-full" />
                  <Skeleton className="h-6 w-44 rounded-2xl" />
                </div>
                <Skeleton className="h-9 w-24 rounded-xl" />
              </div>
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="rounded-2xl border border-border/60 bg-muted/10 p-3 sm:p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 space-y-2">
                        <Skeleton className="h-4 w-28 rounded-full" />
                        <Skeleton className="h-3 w-40 max-w-full rounded-full" />
                      </div>
                      <Skeleton className="h-8 w-16 rounded-full" />
                    </div>
                    <div className="mt-3 grid gap-2 sm:grid-cols-3">
                      <Skeleton className="h-16 rounded-xl" />
                      <Skeleton className="h-16 rounded-xl" />
                      <Skeleton className="h-16 rounded-xl" />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4 rounded-2xl border border-border/70 bg-card/90 p-4 shadow-sm sm:p-5">
              <div className="space-y-2">
                <Skeleton className="h-3 w-24 rounded-full" />
                <Skeleton className="h-6 w-36 rounded-2xl" />
              </div>
              <div className="space-y-3">
                <Skeleton className="h-24 rounded-2xl" />
                <Skeleton className="h-24 rounded-2xl" />
                <Skeleton className="h-24 rounded-2xl" />
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
