import { useRef, useState } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { marketingSlotLabel } from "@shared/marketingSchedule";
import { ROUTES } from "@shared/routes";
import MarketingJobRecovery from "./MarketingJobRecovery";

export default function CentralMarketingDraft() {
  const [pageRole, setPageRole] = useState<"center" | "doctor">("center");
  const [postDay, setPostDay] = useState<"saturday" | "tuesday" | "thursday">(
    "saturday",
  );
  const [topic, setTopic] = useState("");
  const [requestId, setRequestId] = useState(
    () => sessionStorage.getItem("selrs.central-marketing.request") || "",
  );
  const busy = useRef(false);
  const utils = trpc.useUtils();
  const capabilities = trpc.aiManagement.status.useQuery(undefined, {
    retry: false,
  });
  const available =
    capabilities.data?.enabled && capabilities.data.marketingDraftAvailable;
  const jobs = trpc.marketing.centralGenerationJobs.useQuery(undefined, {
    enabled: Boolean(available),
    retry: false,
    refetchInterval: 5000,
  });
  const create = trpc.marketing.generateCentralPost.useMutation({
    retry: false,
    onError: (error) => {
      if (
        error.data?.code === "PRECONDITION_FAILED" &&
        error.message.startsWith("الموضوع سبق نشره")
      ) {
        sessionStorage.removeItem("selrs.central-marketing.request");
        setRequestId("");
      }
    },
    onSettled: () => {
      busy.current = false;
      void utils.marketing.centralGenerationJobs.invalidate();
      void utils.marketing.dashboardSummary.invalidate();
      void utils.marketing.listPosts.invalidate();
    },
  });
  const tracking = trpc.marketing.centralGenerationJob.useQuery(
    { requestId: requestId || "00000000-0000-4000-8000-000000000000" },
    {
      enabled: Boolean(available && requestId),
      retry: false,
      refetchInterval: requestId ? 5000 : false,
    },
  );
  const current = tracking.data;
  const pending =
    create.isPending ||
    Boolean(requestId && (!current || current.state === "running"));
  function beginAnother() {
    sessionStorage.removeItem("selrs.central-marketing.request");
    setRequestId("");
    create.reset();
  }
  return (
    <section
      className="min-w-0 rounded-xl border border-border bg-card p-4 space-y-4"
      dir="rtl"
      aria-label="مسودة Gemini المركزية"
    >
      <h2 className="text-lg font-semibold">مسودة باستخدام Gemini المركزي</h2>
      <p className="text-sm text-muted-foreground">
        نص وصورة محفوظان للمراجعة فقط، بدون نشر تلقائي. قد يستهلك التوليد رصيدًا
        مدفوعًا. Manus والجدولة الحالية كما هما. يلزم تفعيل مهمتي نصوص وصور
        التسويق بمزوّد Gemini في{" "}
        <Link href="/admin-hub/ai" className="underline">
          إدارة AI
        </Link>
        .
      </p>
      {capabilities.isLoading && (
        <p role="status">جارٍ التحقق من المسار المركزي...</p>
      )}
      {!capabilities.isLoading && !available && (
        <p role="status">المسار المركزي غير متاح على الخادم حاليًا.</p>
      )}
      <form
        className="grid gap-4 sm:grid-cols-2"
        onSubmit={(event) => {
          event.preventDefault();
          if (!available || busy.current || pending || requestId) return;
          busy.current = true;
          const id = crypto.randomUUID();
          sessionStorage.setItem("selrs.central-marketing.request", id);
          setRequestId(id);
          create.mutate({ requestId: id, topic, pageRole, postDay });
        }}
      >
        <label className="grid gap-2">
          صفحة مسودة Gemini
          <select
            aria-label="صفحة مسودة Gemini"
            className="min-h-11 rounded-md border border-input bg-background px-3 text-foreground"
            value={pageRole}
            disabled={pending}
            onChange={(event) =>
              setPageRole(event.target.value as "center" | "doctor")
            }
          >
            <option value="center">المركز</option>
            <option value="doctor">العيادة</option>
          </select>
        </label>
        <label className="grid gap-2">
          يوم مسودة Gemini
          <select
            aria-label="يوم مسودة Gemini"
            className="min-h-11 rounded-md border border-input bg-background px-3 text-foreground"
            value={postDay}
            disabled={pending}
            onChange={(event) =>
              setPostDay(event.target.value as typeof postDay)
            }
          >
            {(["saturday", "tuesday", "thursday"] as const).map((day) => (
              <option key={day} value={day}>
                {marketingSlotLabel(day, pageRole)}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-2 sm:col-span-2">
          موضوع مسودة Gemini
          <Input
            className="min-h-11"
            aria-label="موضوع مسودة Gemini"
            required
            maxLength={255}
            value={topic}
            disabled={pending}
            onChange={(event) => setTopic(event.target.value)}
            placeholder="مثال: تذكير بالكشف الدوري على العين"
          />
        </label>
        <Button
          className="min-h-11 h-auto whitespace-normal py-2"
          disabled={
            !available || pending || Boolean(requestId) || !topic.trim()
          }
        >
          {pending ? "جارٍ تجهيز النص والصورة..." : "توليد نص وصورة وحفظ مسودة"}
        </Button>
      </form>
      {requestId && (
        <p className="break-all text-sm">
          معرف المهمة: <bdi>{requestId}</bdi>
        </p>
      )}
      {create.error && (
        <p role="alert">
          {create.error.data?.code === "PRECONDITION_FAILED" &&
          create.error.message.startsWith("الموضوع سبق نشره")
            ? create.error.message
            : "تعذر التأكد من نتيجة الطلب. تابع المهمة نفسها قبل أي توليد جديد."}
        </p>
      )}
      {jobs.error && (
        <p role="alert">
          تعذرت قراءة مهام Gemini. حدّث قائمة المهام؛ لن نعيد التوليد تلقائيًا.
        </p>
      )}
      <Button
        type="button"
        variant="outline"
        className="min-h-11"
        disabled={!available || jobs.isFetching}
        onClick={() => void jobs.refetch()}
      >
        تحديث مهام Gemini
      </Button>
      {current?.state === "completed" && (
        <div role="status">
          <p>المسودة جاهزة بالنص والصورة، ولم تُنشر.</p>
          {current.errorCode === "recovered_usage_requires_review" && (
            <p>
              تم الاسترجاع من الملف المحفوظ؛ سجل الاستهلاك ما زال بحاجة إلى
              مراجعة.
            </p>
          )}
          <Link
            className="inline-flex min-h-11 items-center underline"
            href={ROUTES.marketingDrafts}
          >
            فتح المنشورات ومراجعة المسودة رقم {current.postId}
          </Link>
          <Button className="min-h-11" variant="outline" onClick={beginAnother}>
            تجهيز مسودة أخرى
          </Button>
        </div>
      )}
      {current?.state === "uncertain" && (
        <p role="alert">
          نتيجة المهمة غير محسومة. راجع سجل AI قبل أي طلب جديد؛ لا توجد إعادة
          توليد تلقائية.
        </p>
      )}
      <ul className="space-y-2">
        {jobs.data?.slice(0, 10).map((job) => (
          <li key={job.id} className="border-t border-border pt-2">
            <b>{job.pageRole === "center" ? "المركز" : "العيادة"}</b> ·{" "}
            {job.topic} ·{" "}
            {job.state === "completed"
              ? `مسودة ${job.postId}`
              : job.state === "running"
                ? "قيد التوليد"
                : "غير محسومة"}
            {Boolean(job.referenceIds?.length) && (
              <p className="text-xs text-muted-foreground">
                مراجع من نفس الصفحة: {job.referenceIds?.length}
              </p>
            )}
            {job.state === "uncertain" && (
              <MarketingJobRecovery jobId={job.id} />
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
