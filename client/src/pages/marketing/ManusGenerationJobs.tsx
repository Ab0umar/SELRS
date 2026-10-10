import { useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export default function ManusGenerationJobs({
  onCompleted,
}: {
  onCompleted?: (postId: number) => void;
}) {
  const utils = trpc.useUtils();
  const previous = useRef(new Map<string, string>());
  const query = trpc.marketing.generationJobs.useQuery(undefined, {
    refetchInterval: (query) =>
      query.state.data?.some(
        (job) => job.state === "running" || job.state === "starting",
      )
        ? 5000
        : 15000,
  });
  useEffect(() => {
    for (const job of query.data ?? []) {
      const before = previous.current.get(job.id);
      if (
        (before === "running" || before === "starting") &&
        job.state === "completed"
      ) {
        toast.success("تم تجهيز النص والصورة وحفظ المسودة");
        void utils.marketing.listPosts.invalidate();
        void utils.marketing.dashboardSummary.invalidate();
        if (job.postId) onCompleted?.(job.postId);
      } else if (
        (before === "running" || before === "starting") &&
        job.state === "failed"
      )
        toast.error(job.error || "فشل التوليد");
      previous.current.set(job.id, job.state);
    }
  }, [query.data, onCompleted, utils]);
  const jobs = (query.data ?? []).slice(0, 5);
  if (query.error)
    return (
      <p role="alert" className="text-sm text-destructive">
        تعذر تحميل مهام التوليد: {query.error.message}
      </p>
    );
  if (!jobs.length) return null;
  const labels = {
    starting: "بدء التوليد",
    running: "جارٍ تجهيز النص والصورة",
    completed: "جاهزة للمراجعة",
    failed: "فشل التوليد",
  };
  return (
    <div
      className="rounded-xl border border-border bg-card p-4 space-y-2"
      aria-live="polite"
    >
      <h2 className="text-sm font-semibold">مهام التوليد</h2>
      {jobs.map((job) => (
        <div key={job.id} className="text-sm">
          <span>
            {job.topic} — {labels[job.state]}
          </span>
          {job.credits != null && (
            <span className="text-muted-foreground">
              {" "}
              · {job.credits} credit
            </span>
          )}
          {job.state === "failed" && (
            <p className="text-destructive">{job.error}</p>
          )}
        </div>
      ))}
    </div>
  );
}
