import { useEffect, useMemo, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import MarketingJobRecovery from "./MarketingJobRecovery";

export default function ManusGenerationJobs({
  onCompleted,
}: {
  onCompleted?: (postId: number) => void;
}) {
  const utils = trpc.useUtils();
  const previous = useRef(new Map<string, string>());
  const capabilities = trpc.aiManagement.status.useQuery(undefined, {
    retry: false,
  });
  const central = trpc.marketing.centralGenerationJobs.useQuery(undefined, {
    enabled: capabilities.data?.enabled,
    retry: false,
    refetchInterval: 5000,
  });
  const query = trpc.marketing.generationJobs.useQuery(undefined, {
    refetchInterval: (query) =>
      query.state.data?.some(
        (job) => job.state === "running" || job.state === "starting",
      )
        ? 5000
        : 15000,
  });
  const allJobs = useMemo(
    () =>
      [
        ...(query.data ?? []).map((job) => ({ ...job, central: false })),
        ...(central.data ?? []).map((job) => ({
          ...job,
          central: true,
          credits: null,
          error: job.errorCode,
        })),
      ].sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      ),
    [query.data, central.data],
  );
  useEffect(() => {
    for (const job of allJobs) {
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
  }, [allJobs, onCompleted, utils]);
  const jobs = allJobs.slice(0, 10);
  const labels: Record<string, string> = {
    starting: "بدء التوليد",
    running: "جارٍ تجهيز النص والصورة",
    completed: "جاهزة للمراجعة",
    failed: "فشل التوليد",
    uncertain: "نتيجة غير محسومة، تحتاج مراجعة",
  };
  return (
    <div
      className="rounded-xl border border-border bg-card p-4 space-y-2"
      aria-live="polite"
    >
      <h2 className="text-sm font-semibold">مهام التوليد</h2>
      {(query.isLoading ||
        (capabilities.data?.enabled && central.isLoading)) && (
        <p role="status">جارٍ تحميل مهام التوليد...</p>
      )}
      {(query.error || central.error) && (
        <p role="alert">
          تعذر تحميل بعض مهام التوليد. حدّث الصفحة للمتابعة، ولا تبدأ طلبًا
          بديلًا قبل التحقق.
        </p>
      )}
      {!jobs.length &&
        !query.isLoading &&
        !central.isLoading &&
        !query.error &&
        !central.error && (
          <p>لا توجد مهام توليد بعد. اختر المساعد والموضوع لبدء مسودة.</p>
        )}
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
          {!job.central && job.state === "uncertain" && (
            <p className="text-muted-foreground">
              {job.error || "راجع المهمة الأصلية في Manus قبل بدء توليد بديل."}
            </p>
          )}
          {job.central && job.state === "uncertain" && (
            <MarketingJobRecovery jobId={job.id} />
          )}
        </div>
      ))}
    </div>
  );
}
