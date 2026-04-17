import { Skeleton } from './ui/skeleton';

export function DashboardLayoutSkeleton() {
  return (
    <div className="flex min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.08),_transparent_34%),linear-gradient(180deg,_#fff,_#f8fafc)]">
      {/* Sidebar skeleton */}
      <div className="relative w-[280px] border-r border-border/70 bg-white/90 p-4 space-y-6 shadow-sm">
        {/* Logo area */}
        <div className="flex items-center gap-3 px-2">
          <Skeleton className="h-9 w-9 rounded-xl" />
          <div className="space-y-2">
            <Skeleton className="h-3 w-16 rounded-full" />
            <Skeleton className="h-4 w-24 rounded-full" />
          </div>
        </div>

        {/* Menu items */}
        <div className="space-y-2 px-2">
          <Skeleton className="h-11 w-full rounded-xl" />
          <Skeleton className="h-11 w-full rounded-xl" />
          <Skeleton className="h-11 w-full rounded-xl" />
          <Skeleton className="h-11 w-4/5 rounded-xl" />
        </div>

        {/* User profile area at bottom */}
        <div className="absolute bottom-4 left-4 right-4">
          <div className="flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-slate-50/70 px-3 py-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3 w-20 rounded-full" />
              <Skeleton className="h-2 w-32 rounded-full" />
            </div>
          </div>
        </div>
      </div>

      {/* Main content skeleton */}
      <div className="flex-1 p-4 space-y-4">
        {/* Content blocks */}
        <div className="rounded-[28px] border border-slate-200/80 bg-white/90 p-6 shadow-sm">
          <Skeleton className="h-3 w-24 rounded-full" />
          <Skeleton className="mt-3 h-10 w-64 rounded-2xl" />
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <Skeleton className="h-24 rounded-2xl" />
            <Skeleton className="h-24 rounded-2xl" />
            <Skeleton className="h-24 rounded-2xl" />
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-32 rounded-2xl" />
          <Skeleton className="h-32 rounded-2xl" />
          <Skeleton className="h-32 rounded-2xl" />
        </div>
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    </div>
  );
}
