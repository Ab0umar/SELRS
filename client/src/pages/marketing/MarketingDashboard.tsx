import { useEffect, useRef, useState } from "react";
import { marketingGenerationInput } from "@shared/ai-request-context";
import {
  readPending,
  savePending,
  removePending,
} from "@/features/ai/pending-request";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import ManusGenerationJobs from "./ManusGenerationJobs";
import PublishingPostResolve from "./PublishingPostResolve";
import ContentCalendar from "./ContentCalendar";
import { Input } from "@/components/ui/input";
import {
  CheckCircle2,
  ExternalLink,
  Hash,
  Image,
  Lightbulb,
  Loader2,
  MessageSquare,
  Play,
  RefreshCw,
  Sparkles,
  Zap,
} from "lucide-react";

import {
  marketingSlotLabel,
  marketingSlotDescription,
} from "@shared/marketingSchedule";
type PageRole = "center" | "doctor";
const PAGE_NAME = { center: "صفحة المركز", doctor: "صفحة الدكتور" } as const;

interface GeneratedPreview {
  id: number;
  title: string;
  content: string;
  topic: string;
  idea?: string | null;
  cta?: string | null;
  hashtags?: string | null;
  imagePrompt?: string | null;
}

import {
  configuredMarketingAssistant,
  marketingAssistantValue,
} from "@shared/marketing-assistant";
export default function MarketingDashboard() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [restored] = useState(() =>
    readPending("selrs.ai.marketing.context", marketingGenerationInput),
  );
  const [generationRequest, setGenerationRequest] = useState<string>(() => {
    try {
      return (
        restored?.requestId ??
        sessionStorage.getItem("selrs.ai.marketing.request") ??
        ""
      );
    } catch {
      return "";
    }
  });
  const startingGeneration = useRef(false);
  const [assistantOverride, setAssistant] = useState<string>();
  const [generatePage, setGeneratePage] = useState<PageRole>(
    restored?.pageRole ?? "center",
  );
  const [generateTopic, setGenerateTopic] = useState(restored?.topic ?? "");
  const capabilities = trpc.marketing.assistantStatus.useQuery(undefined, {
    retry: false,
  });
  const profiles = trpc.marketing.assistantProfiles.useQuery(undefined, {
    enabled: capabilities.data?.enabled,
    retry: false,
  });
  const configuredAssistant = configuredMarketingAssistant(profiles.data ?? []);
  const assistant =
    assistantOverride ??
    (configuredAssistant
      ? marketingAssistantValue(configuredAssistant)
      : "manus:standard");
  const [generateDay, setGenerateDay] = useState<
    "saturday" | "tuesday" | "thursday"
  >(restored?.postDay ?? "saturday");
  const [preview, setPreview] = useState<GeneratedPreview | null>(null);

  const utils = trpc.useUtils();
  const tracked = trpc.marketing.generationRequest.useQuery(
    { requestId: generationRequest },
    {
      enabled: Boolean(generationRequest),
      retry: false,
      refetchInterval: generationRequest ? 4000 : false,
    },
  );
  const knownGeneration = tracked.data?.job;
  useEffect(() => {
    if (tracked.data?.state === "rejected") {
      removePending("selrs.ai.marketing.context");
      removePending("selrs.ai.marketing.request");
      setGenerationRequest("");
      toast.info("لم يبدأ التوليد. راجع الإعدادات ثم ابدأ طلبًا جديدًا.");
      return;
    }
    const parsed = marketingGenerationInput.safeParse(tracked.data?.context);
    if (!parsed.success || parsed.data.requestId !== generationRequest) return;
    const context = parsed.data;
    setGeneratePage(context.pageRole);
    setGenerateDay(context.postDay);
    setGenerateTopic(context.topic ?? "");
    if (context.assistant)
      setAssistant(
        context.assistant.provider === "manus"
          ? `manus:${context.assistant.model}`
          : `${context.assistant.provider}:${context.assistant.model}|${context.assistant.imageModel}`,
      );
    savePending("selrs.ai.marketing.context", context);
  }, [tracked.data, generationRequest]);

  const summaryQuery = trpc.marketing.dashboardSummary.useQuery({
    pageRole: generatePage,
  });
  const schedulerQuery = trpc.marketing.getSchedulerStatus.useQuery(
    { pageRole: generatePage },
    {
      refetchInterval: 30_000,
    },
  );

  const generateMutation = trpc.marketing.generatePost.useMutation({
    retry: false,
    onSuccess: (data) => {
      toast.info(
        data.topic
          ? `بدأ تجهيز النص والصورة عن: ${data.topic}`
          : "بدأ اختيار الموضوع وتجهيز النص والصورة",
      );
      void utils.marketing.generationJobs.invalidate();
      void utils.marketing.centralGenerationJobs.invalidate();
      void utils.marketing.dashboardSummary.invalidate();
      void utils.marketing.listPosts.invalidate();
    },
    onError: (err) => {
      toast.error(err.message);
      void tracked.refetch();
    },
  });
  const generationLocked =
    Boolean(generationRequest) || generateMutation.isPending;
  const selectionReady =
    capabilities.isSuccess &&
    (!capabilities.data?.enabled || profiles.isSuccess) &&
    Boolean(assistant);
  function startGeneration() {
    if (
      generationRequest ||
      startingGeneration.current ||
      !assistant ||
      capabilities.isLoading ||
      capabilities.isError ||
      (capabilities.data?.enabled && !profiles.data)
    )
      return;
    startingGeneration.current = true;
    const requestId = createRequestId();
    setGenerationRequest(requestId);
    try {
      sessionStorage.setItem("selrs.ai.marketing.request", requestId);
    } catch {
      /* The server also retains the request identity. */
    }
    const context = marketingGenerationInput.parse({
      postDay: generateDay,
      requestId,
      pageRole: generatePage,
      topic: generateTopic.trim() || undefined,
      assistant: assistant.startsWith("grok:")
        ? {
            provider: "grok",
            model: assistant.slice(5).split("|")[0],
            imageModel: assistant.slice(5).split("|")[1],
          }
        : assistant.startsWith("gemini:")
          ? {
              provider: "gemini",
              model: assistant.slice("gemini:".length).split("|")[0],
              imageModel: assistant.slice("gemini:".length).split("|")[1],
            }
          : {
              provider: "manus",
              model: assistant.split(":")[1] as "standard" | "lite" | "max",
            },
    });
    savePending("selrs.ai.marketing.context", context);
    generateMutation.mutate(context, {
      onSettled: () => {
        startingGeneration.current = false;
      },
    });
  }

  const centerStatus = trpc.marketing.getSchedulerStatus.useQuery(
    { pageRole: "center" },
    { refetchInterval: 30_000 },
  );
  const doctorStatus = trpc.marketing.getSchedulerStatus.useQuery(
    { pageRole: "doctor" },
    { refetchInterval: 30_000 },
  );
  const centerApproval = trpc.marketing.approvalMode.useQuery(
    { pageRole: "center" },
    { enabled: isAdmin, retry: false },
  );
  const doctorApproval = trpc.marketing.approvalMode.useQuery(
    { pageRole: "doctor" },
    { enabled: isAdmin, retry: false },
  );

  const runNowMutation = trpc.marketing.runSchedulerNow.useMutation({
    onSuccess: (data) => {
      if (data.skipped) {
        toast.info(`تم التخطي: ${data.skipped}`);
      } else if (data.ok) {
        toast.success(
          data.jobId
            ? "بدأ تجهيز المسودة بالنص والصورة"
            : "تم حفظ المنشور كمسودة",
        );
        void utils.marketing.generationJobs.invalidate();
        void utils.marketing.dashboardSummary.invalidate();
        void utils.marketing.listPosts.invalidate();
      } else {
        toast.error(`فشل المجدول: ${data.error ?? "خطأ غير معروف"}`);
      }
      void utils.marketing.getSchedulerStatus.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const summary = summaryQuery.data;
  const recentPosts = summary?.recentPosts ?? [];
  const stuckPublishing = recentPosts.filter(
    (post: { status: string }) => post.status === "publishing",
  );
  const counts = summary?.counts ?? {
    draft: 0,
    publishing: 0,
    published: 0,
    failed: 0,
    scheduled: 0,
    total: 0,
  };

  const modeLine = (
    role: PageRole,
    status: typeof centerStatus,
    approval: typeof centerApproval,
  ) => {
    if (status.isLoading) return "جارٍ القراءة…";
    if (status.isError) return "تعذّرت قراءة الحالة";
    if (!status.data?.fbConnected) return "مش مربوطة بفيسبوك";
    if (!status.data.autoPublish) return "متوقف: مفيش توليد ولا نشر بالجدول";
    if (!isAdmin || !approval.data) return "الجدول شغّال";
    return approval.data.required
      ? "بيجهّز المنشورات، والنشر بعد موافقتك"
      : "بيجهّز وينشر لوحده";
  };

  return (
    <div className="mobile-flat-marketing space-y-5">
      {/* Publish mode per page */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
        {(
          [
            ["center", centerStatus, centerApproval],
            ["doctor", doctorStatus, doctorApproval],
          ] as const
        ).map(([role, status, approval]) => (
          <span key={role} className="min-w-0">
            <span className="font-medium">{PAGE_NAME[role]}:</span>{" "}
            <span className="text-muted-foreground">
              {modeLine(role, status, approval)}
            </span>
          </span>
        ))}
        {isAdmin && (
          <Link
            href="/ai/marketing/settings"
            className="inline-flex min-h-11 items-center text-primary underline underline-offset-4"
          >
            غيّر
          </Link>
        )}
      </div>

      <ContentCalendar />

      {/* Off-schedule post */}
      <details className="rounded-xl border border-border bg-card p-4">
        <summary className="flex min-h-11 cursor-pointer items-center text-sm font-semibold">
          منشور خارج الجدول
        </summary>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <label className="grid gap-2 text-sm">
            الصفحة
            <select
              aria-label="صفحة المحتوى"
              className="min-h-11 rounded-md border bg-background px-3"
              value={generatePage}
              disabled={generationLocked}
              onChange={(event) =>
                setGeneratePage(event.target.value as PageRole)
              }
            >
              <option value="center">{PAGE_NAME.center}</option>
              <option value="doctor">{PAGE_NAME.doctor}</option>
            </select>
          </label>
          <label className="grid gap-2 text-sm">
            نوع المحتوى
            <select
              aria-label="يوم توليد المنشور"
              value={generateDay}
              disabled={generationLocked}
              onChange={(e) =>
                setGenerateDay(e.target.value as typeof generateDay)
              }
              className="min-h-11 max-w-full rounded-md border border-input bg-background px-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              {(["saturday", "tuesday", "thursday"] as const).map((slot) => (
                <option key={slot} value={slot}>
                  {marketingSlotDescription(slot, generatePage)}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-2 text-sm sm:col-span-2">
            الموضوع
            <Input
              aria-label="موضوع المحتوى"
              value={generateTopic}
              disabled={generationLocked}
              maxLength={255}
              onChange={(event) => setGenerateTopic(event.target.value)}
              placeholder="اتركه فارغًا لاختيار الموضوع التالي من الجدول"
            />
          </label>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button
            className="min-h-11"
            onClick={startGeneration}
            disabled={generationLocked || !selectionReady}
          >
            {generateMutation.isPending ? (
              <Loader2 className="ml-1.5 h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="ml-1.5 h-4 w-4" />
            )}
            {generateMutation.isPending
              ? "جارٍ بدء التوليد…"
              : "توليد النص والصورة"}
          </Button>
          <span className="text-xs text-muted-foreground">
            {selectionReady
              ? "بالمساعد المختار في صفحة الذكاء الاصطناعي."
              : capabilities.isError || profiles.isError
                ? "تعذّرت قراءة إعدادات المساعد."
                : "جارٍ قراءة إعدادات المساعد…"}
          </span>
        </div>
        {generationRequest && (
          <div className="mt-4 space-y-2 text-sm" role="status">
            <p>
              حالة الطلب:{" "}
              {knownGeneration
                ? {
                    starting: "بدء التوليد",
                    running: "جارٍ التوليد",
                    completed: "مكتمل",
                    failed: "فشل مؤكد",
                    uncertain:
                      "نتيجة غير محسومة؛ راجع المهمة الأصلية قبل طلب بديل",
                  }[knownGeneration.state]
                : "جارٍ التحقق من النتيجة"}
              . تابع نفس الطلب قبل بدء توليد جديد.
            </p>
            <details className="text-xs text-muted-foreground">
              <summary className="inline-flex min-h-11 cursor-pointer items-center">
                تفاصيل للدعم الفني
              </summary>
              <p>
                رقم الطلب: <bdi className="break-all">{generationRequest}</bdi>
              </p>
            </details>
            {(knownGeneration?.state === "completed" ||
              knownGeneration?.state === "failed") && (
              <Button
                variant="outline"
                className="min-h-11"
                onClick={() => {
                  try {
                    sessionStorage.removeItem("selrs.ai.marketing.request");
                  } catch {
                    /* The completed job remains on the server. */
                  }
                  setGenerationRequest("");
                  removePending("selrs.ai.marketing.context");
                }}
              >
                تجهيز محتوى جديد
              </Button>
            )}
          </div>
        )}
        {generateMutation.isPending && (
          <div className="mt-4 flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-primary">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>
              بدء تجهيز النص والصورة عن{" "}
              <strong>
                {marketingSlotDescription(generateDay, generatePage)}
              </strong>
              …
            </span>
          </div>
        )}
      </details>

      {/* Generation jobs and their recovery */}
      <ManusGenerationJobs
        onCompleted={(postId) => {
          void utils.marketing.getPost
            .fetch({ id: postId })
            .then((post) => {
              if (post)
                setPreview({
                  ...post,
                  content: post.content ?? "",
                  topic: post.topic ?? "",
                });
            })
            .catch(() => toast.error("تعذر تحميل معاينة المسودة"));
        }}
      />
      {preview && (
        <div className="space-y-4 rounded-xl border border-primary/30 bg-primary/5 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-semibold text-primary">
                تم توليد المنشور
              </h2>
              <Badge className="bg-primary/15 text-xs text-primary">
                {preview.topic}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <Link href="/ai/marketing/drafts">
                <Button
                  size="sm"
                  variant="outline"
                  className="min-h-11 gap-1.5 text-xs"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  راجع وانشر من المسودات
                </Button>
              </Link>
              <Button
                variant="bare"
                onClick={() => setPreview(null)}
                aria-label="إغلاق المعاينة"
                className="min-h-11 min-w-11 text-xs text-muted-foreground hover:text-foreground"
              >
                ✕
              </Button>
            </div>
          </div>
          <div>
            <p className="mb-1 text-xs font-semibold text-muted-foreground">
              العنوان
            </p>
            <p className="text-sm font-semibold text-foreground">
              {preview.title}
            </p>
          </div>
          {preview.idea && (
            <div className="flex gap-2">
              <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-warning-text" />
              <div>
                <p className="mb-0.5 text-xs font-semibold text-foreground/50">
                  الفكرة التسويقية
                </p>
                <p className="text-sm text-foreground">{preview.idea}</p>
              </div>
            </div>
          )}
          <div className="flex gap-2">
            <MessageSquare className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <div className="min-w-0 flex-1">
              <p className="mb-0.5 text-xs font-semibold text-foreground/50">
                نص المنشور
              </p>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                {preview.content}
              </p>
            </div>
          </div>
          {preview.cta && (
            <div className="rounded-lg border border-primary/20 bg-background px-3 py-2">
              <p className="mb-0.5 text-xs font-semibold text-foreground/50">
                جملة الدعوة للتواصل
              </p>
              <p className="text-sm font-medium text-primary">{preview.cta}</p>
            </div>
          )}
          {preview.hashtags && (
            <div className="flex gap-2">
              <Hash className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <p className="text-sm text-primary/80">{preview.hashtags}</p>
            </div>
          )}
          {preview.imagePrompt && (
            <div className="flex gap-2">
              <Image className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <div>
                <p className="mb-0.5 text-xs font-semibold text-foreground/50">
                  وصف الصورة
                </p>
                <p className="text-xs italic text-muted-foreground">
                  {preview.imagePrompt}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Posts stuck in publishing */}
      {stuckPublishing.length > 0 && (
        <section
          aria-labelledby="stuck-publishing-title"
          className="space-y-2 rounded-xl border border-warning/40 bg-card p-4"
        >
          <h2 id="stuck-publishing-title" className="text-sm font-semibold">
            منشورات واقفة في النشر
          </h2>
          <ul className="divide-y divide-border">
            {stuckPublishing.map((post: any) => (
              <li
                key={post.id}
                className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm"
              >
                <span className="min-w-0 break-words">
                  {post.title} ·{" "}
                  {PAGE_NAME[(post.pageRole ?? "center") as PageRole]}
                </span>
                <PublishingPostResolve postId={post.id} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Scheduler status: kept, folded away */}
      <details className="rounded-xl border border-border bg-card p-4">
        <summary className="flex min-h-11 cursor-pointer items-center text-sm font-semibold">
          حالة المجدول والأرقام
        </summary>
        <div className="mt-3 space-y-3">
          <div
            role="group"
            aria-label="الصفحة"
            className="inline-flex rounded-lg border p-1"
          >
            {(["center", "doctor"] as const).map((role) => (
              <button
                key={role}
                type="button"
                aria-pressed={generatePage === role}
                disabled={generationLocked}
                onClick={() => setGeneratePage(role)}
                className={`min-h-11 rounded-md px-3 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                  generatePage === role
                    ? "bg-primary text-primary-foreground"
                    : "text-foreground"
                }`}
              >
                {PAGE_NAME[role]}
              </button>
            ))}
          </div>
          <p className="text-sm text-muted-foreground">
            {summaryQuery.isLoading
              ? "جارٍ تحميل الأرقام…"
              : summaryQuery.isError
                ? "تعذّر تحميل الأرقام."
                : `الإجمالي ${counts.total} · مسودات ${counts.draft} · مجدولة ${counts.scheduled} · جاري النشر ${counts.publishing} · منشورة ${counts.published} · فشلت ${counts.failed}`}
          </p>
          <SchedulerCard
            data={schedulerQuery.data}
            isLoading={schedulerQuery.isLoading}
            isRunning={runNowMutation.isPending}
            canRunNow={isAdmin}
            pageRole={generatePage}
            onRunNow={(day) =>
              runNowMutation.mutate({
                day: day ?? generateDay,
                pageRole: generatePage,
              })
            }
          />
          <Button
            size="sm"
            variant="ghost"
            className="min-h-11"
            onClick={() => {
              void utils.marketing.dashboardSummary.invalidate();
              void utils.marketing.getSchedulerStatus.invalidate();
            }}
          >
            <RefreshCw className="ml-1.5 h-4 w-4" />
            تحديث
          </Button>
        </div>
      </details>
    </div>
  );
}

// ─── Scheduler Card ───────────────────────────────────────────────────────────

const SCHED_STATUS_COLOR: Record<string, string> = {
  idle: "bg-muted text-muted-foreground",
  running: "bg-info/15 text-info",
  error: "bg-destructive/15 text-destructive",
};

interface SchedulerData {
  autoPublish: boolean;
  fbConnected: boolean;
  saturdayEnabled: boolean;
  tuesdayEnabled: boolean;
  thursdayEnabled: boolean;
  publishHour: number;
  lastSchedulerRun: Date | string | null;
  schedulerStatus: string | null;
  lastSkip?: { reason: string; at: string } | null;
  nextRun: { day: string; date: string } | null;
}

function SchedulerCard({
  pageRole,
  data,
  isLoading,
  isRunning,
  onRunNow,
  canRunNow,
}: {
  pageRole: PageRole;
  data: SchedulerData | null | undefined;
  isLoading: boolean;
  isRunning: boolean;
  onRunNow: (day?: "saturday" | "tuesday" | "thursday") => void;
  canRunNow: boolean;
}) {
  if (isLoading) return null;

  const status = data?.schedulerStatus ?? "idle";
  const active = data?.autoPublish;

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <Zap className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold text-foreground">
            المجدول التلقائي
          </h2>
          <Badge
            className={`text-xs ${SCHED_STATUS_COLOR[status] ?? SCHED_STATUS_COLOR.idle}`}
          >
            {status === "running" ? (
              <>
                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                يعمل
              </>
            ) : status === "error" ? (
              "خطأ"
            ) : (
              "جاهز"
            )}
          </Badge>
          {active ? (
            <Badge className="bg-success/15 text-success text-xs">
              <CheckCircle2 className="mr-1 h-3 w-3" />
              مفعّل
            </Badge>
          ) : (
            <Badge className="bg-muted text-muted-foreground text-xs">
              موقوف
            </Badge>
          )}
        </div>
        {canRunNow && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => onRunNow(undefined)}
            disabled={isRunning}
          >
            {isRunning ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Play className="h-4 w-4" />
            )}
            <span className="mr-1.5 text-xs">تشغيل الآن</span>
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 text-xs">
        <div className="rounded-lg border border-border bg-background px-3 py-2">
          <p className="font-semibold text-muted-foreground mb-0.5">
            المنشور القادم
          </p>
          {data?.nextRun ? (
            <p className="text-foreground font-medium">
              {marketingSlotLabel(data.nextRun.day, pageRole)}
              {" — "}
              {new Date(data.nextRun.date).toLocaleString("ar-EG", {
                timeZone: "Africa/Cairo",
                weekday: "short",
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          ) : (
            <p className="text-muted-foreground">لا يوجد</p>
          )}
        </div>
        <div className="rounded-lg border border-border bg-background px-3 py-2">
          <p className="font-semibold text-muted-foreground mb-0.5">
            آخر تشغيل
          </p>
          <p className="text-foreground">
            {data?.lastSchedulerRun
              ? new Date(data.lastSchedulerRun).toLocaleString("ar-EG", {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "لم يعمل بعد"}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-background px-3 py-2">
          <p className="font-semibold text-muted-foreground mb-0.5">
            وقت النشر
          </p>
          <p className="text-foreground">{data?.publishHour ?? 9}:00</p>
        </div>
        <div className="rounded-lg border border-border bg-background px-3 py-2">
          <p className="font-semibold text-muted-foreground mb-0.5">
            الأيام المفعّلة
          </p>
          <p className="text-foreground">
            {[
              data?.saturdayEnabled && marketingSlotLabel("saturday", pageRole),
              data?.tuesdayEnabled && marketingSlotLabel("tuesday", pageRole),
              data?.thursdayEnabled && marketingSlotLabel("thursday", pageRole),
            ]
              .filter(Boolean)
              .join(" · ") || "لا شيء"}
          </p>
        </div>
      </div>

      {!data?.autoPublish && (
        <p className="mt-2 text-xs text-muted-foreground">
          الجدول متوقف لهذه الصفحة — غيّر طريقة النشر من الإعدادات
        </p>
      )}
      {data?.lastSkip && (
        <p className="mt-2 text-xs text-muted-foreground">
          آخر تخطٍّ (
          {new Date(data.lastSkip.at).toLocaleString("ar-EG", {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
          ): {data.lastSkip.reason}
        </p>
      )}
      {data?.autoPublish && !data?.fbConnected && (
        <p className="mt-2 text-xs text-warning-text">
          Facebook غير مربوط — النشر التلقائي متوقف لحد ما تربط الصفحة
        </p>
      )}
    </div>
  );
}
import { createRequestId } from "@/lib/request-id";
