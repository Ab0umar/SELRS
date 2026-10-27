import { useEffect, useRef, useState } from "react";
import { marketingGenerationInput } from "@shared/ai-request-context";
import {
  readPending,
  savePending,
  removePending,
} from "@/features/ai/pending-request";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import ManusGenerationJobs from "./ManusGenerationJobs";
import AssistantModelSelect from "@/features/ai/AssistantModelSelect";
import { Input } from "@/components/ui/input";
import {
  CalendarDays,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileText,
  Hash,
  Image,
  Lightbulb,
  Loader2,
  MessageSquare,
  Play,
  RefreshCw,
  Send,
  Sparkles,
  ToggleLeft,
  ToggleRight,
  XCircle,
  Zap,
} from "lucide-react";

import {
  marketingSlotLabel,
  marketingSlotDescription,
} from "@shared/marketingSchedule";
type PageRole = "center" | "doctor";

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  draft: { label: "مسودة", className: "bg-muted text-muted-foreground" },
  publishing: { label: "جاري النشر", className: "bg-info/15 text-info" },
  published: { label: "منشور", className: "bg-success/15 text-success" },
  failed: { label: "فشل", className: "bg-destructive/15 text-destructive" },
  scheduled: { label: "مجدول", className: "bg-info/15 text-info" },
};

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
  const capabilities = trpc.aiManagement.status.useQuery(undefined, {
    retry: false,
  });
  const profiles = trpc.aiManagement.profiles.useQuery(undefined, {
    enabled: capabilities.data?.enabled,
    retry: false,
  });
  const geminiText = profiles.data?.find(
    (profile) => profile.workload === "marketing.text",
  );
  const configuredAssistant = configuredMarketingAssistant(profiles.data ?? []);
  const assistant =
    assistantOverride ??
    (configuredAssistant
      ? marketingAssistantValue(configuredAssistant)
      : capabilities.data?.enabled
        ? ""
        : "manus:standard");
  const geminiImage = profiles.data?.find(
    (profile) => profile.workload === "marketing.image",
  );
  const geminiModels = trpc.aiManagement.models.useQuery(undefined, {
    enabled: capabilities.data?.enabled,
    retry: false,
    staleTime: 300000,
  });
  const textModels = [
    ...new Set([
      ...(geminiModels.data
        ?.filter((model) => model.kind === "text")
        .map((model) => model.id) ?? []),
      ...(geminiText?.provider === "gemini" ? [geminiText.model] : []),
    ]),
  ];
  const imageModels = [
    ...new Set([
      ...(geminiModels.data
        ?.filter((model) => model.kind === "image")
        .map((model) => model.id) ?? []),
      ...(geminiImage?.provider === "gemini" ? [geminiImage.model] : []),
    ]),
  ];
  const [generateDay, setGenerateDay] = useState<
    "saturday" | "tuesday" | "thursday"
  >(restored?.postDay ?? "saturday");
  const [publishId, setPublishId] = useState<number | null>(null);
  const [publishPageRoles, setPublishPageRoles] = useState<
    Record<number, PageRole>
  >({});
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
          : `gemini:${context.assistant.model}|${context.assistant.imageModel}`,
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
      toast.info(`بدأ تجهيز النص والصورة عن: ${data.topic}`);
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
    const requestId = crypto.randomUUID();
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
      assistant: assistant.startsWith("gemini:")
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

  const publishMutation = trpc.marketing.publishPost.useMutation({
    onSuccess: () => {
      toast.success("تم تحديث حالة المنشور إلى منشور");
      setPublishId(null);
      void utils.marketing.dashboardSummary.invalidate();
    },
    onError: (err) => {
      toast.error(err.message);
      setPublishId(null);
    },
  });

  const updateSettingsMutation = trpc.marketing.setPageAutoPublish.useMutation({
    onSuccess: () => {
      toast.success("تم تحديث الإعدادات");
      void utils.marketing.getSettings.invalidate();
      void utils.marketing.getSchedulerStatus.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

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
  const settings = schedulerQuery.data;
  const recentPosts = summary?.recentPosts ?? [];
  const counts = summary?.counts ?? {
    draft: 0,
    publishing: 0,
    published: 0,
    failed: 0,
    scheduled: 0,
    total: 0,
  };

  const statCards = [
    {
      label: "الإجمالي",
      value: counts.total,
      icon: CalendarDays,
      tone: "text-foreground",
      accent: "bg-muted/30 border-border",
    },
    {
      label: "مسودات",
      value: counts.draft,
      icon: FileText,
      tone: "text-muted-foreground",
      accent: "bg-muted/20 border-border",
    },
    {
      label: "جاري النشر",
      value: counts.publishing,
      icon: Loader2,
      tone: "text-info",
      accent: "bg-info/10 border-info/20",
    },
    {
      label: "منشورة",
      value: counts.published,
      icon: CheckCircle2,
      tone: "text-success",
      accent: "bg-success/10 border-success/20",
    },
    {
      label: "مجدولة",
      value: counts.scheduled,
      icon: Clock,
      tone: "text-info",
      accent: "bg-info/10 border-info/20",
    },
    {
      label: "فشلت",
      value: counts.failed,
      icon: XCircle,
      tone: "text-destructive",
      accent: "bg-destructive/10 border-destructive/20",
    },
  ];

  return (
    <div className="mobile-flat-marketing space-y-6">
      {/* Stats */}
      <div className="mobile-summary-cards grid grid-cols-2 gap-3 sm:grid-cols-6">
        {statCards.map((card) => (
          <div
            key={card.label}
            className={`rounded-lg border p-3 ${card.accent}`}
          >
            <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground/60">
              <card.icon className="h-3.5 w-3.5" />
              {card.label}
            </div>
            <div className={`mt-1.5 text-2xl font-bold ${card.tone}`}>
              {summaryQuery.isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                card.value
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Scheduler Status */}
      <SchedulerCard
        data={schedulerQuery.data}
        isLoading={schedulerQuery.isLoading}
        isRunning={runNowMutation.isPending}
        pageRole={generatePage}
        onRunNow={(day) =>
          runNowMutation.mutate({
            day: day ?? generateDay,
            pageRole: generatePage,
          })
        }
      />

      {/* Actions */}
      <div className="rounded-xl border border-border bg-card p-4">
        <h2 className="mb-4 text-sm font-semibold text-foreground">
          إجراءات سريعة
        </h2>
        <div className="mb-4 grid gap-4 sm:grid-cols-2">
          <AssistantModelSelect
            value={assistant}
            onChange={(value) => {
              setAssistant(value);
            }}
            disabled={generationLocked || !selectionReady}
            options={[
              ...(!assistant
                ? [
                    {
                      value: "",
                      label: "تعذرت قراءة إعدادات المساعد",
                      disabled: true,
                    },
                  ]
                : []),
              { value: "manus:standard", label: "Manus · Standard" },
              { value: "manus:lite", label: "Manus · Lite" },
              { value: "manus:max", label: "Manus · Max" },
              ...textModels.flatMap((model) =>
                imageModels.map((imageModel) => ({
                  value: `gemini:${model}|${imageModel}`,
                  label: `Gemini · نص: ${model} / صورة: ${imageModel}`,
                  disabled: !geminiText?.enabled || !geminiImage?.enabled,
                })),
              ),
            ]}
          />
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
              <option value="center">المركز</option>
              <option value="doctor">العيادة</option>
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
        <div className="flex flex-wrap gap-3">
          {/* Generate Post */}
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <select
              aria-label="يوم توليد المنشور"
              value={generateDay}
              disabled={generationLocked}
              onChange={(e) =>
                setGenerateDay(e.target.value as typeof generateDay)
              }
              className="min-h-11 max-w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              {(["saturday", "tuesday", "thursday"] as const).map((slot) => (
                <option key={slot} value={slot}>
                  {marketingSlotDescription(slot, generatePage)}
                </option>
              ))}
            </select>
            <Button
              size="sm"
              variant="default"
              onClick={startGeneration}
              disabled={generationLocked || !selectionReady}
            >
              {generateMutation.isPending ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="mr-1.5 h-4 w-4" />
              )}
              {generateMutation.isPending
                ? "جارٍ بدء التوليد…"
                : "توليد النص والصورة"}
            </Button>
          </div>

          {/* Auto Publish toggle */}
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              updateSettingsMutation.mutate({
                pageRole: generatePage,
                autoPublish: !settings?.autoPublish,
              })
            }
            disabled={
              updateSettingsMutation.isPending ||
              schedulerQuery.isLoading ||
              !settings?.fbConnected
            }
          >
            {settings?.autoPublish ? (
              <>
                <ToggleRight className="mr-1.5 h-4 w-4 text-success" />
                النشر التلقائي: مفعّل
              </>
            ) : (
              <>
                <ToggleLeft className="mr-1.5 h-4 w-4 text-muted-foreground" />
                النشر التلقائي: موقوف
              </>
            )}
          </Button>

          <Button
            size="sm"
            variant="ghost"
            aria-label="تحديث"
            onClick={() => void utils.marketing.dashboardSummary.invalidate()}
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
        {generationRequest && (
          <div className="mt-4 space-y-2 text-sm" role="status">
            <p>
              معرف الطلب: <bdi className="break-all">{generationRequest}</bdi>.
              تابع حالة نفس الطلب قبل بدء توليد جديد.
            </p>
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
            </p>
            {(knownGeneration?.state === "completed" ||
              knownGeneration?.state === "failed") && (
              <Button
                variant="outline"
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

        {/* Generating indicator */}
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
      </div>

      {/* Generated Content Preview */}
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
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-semibold text-primary">
                تم توليد المنشور
              </h2>
              <Badge className="bg-primary/15 text-primary text-xs">
                {preview.topic}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <Link href="/marketing/drafts">
                <Button size="sm" variant="outline" className="gap-1.5 text-xs">
                  <ExternalLink className="h-3.5 w-3.5" />
                  فتح المسودات
                </Button>
              </Link>
              <Button
                variant="bare"
                onClick={() => setPreview(null)}
                aria-label="إغلاق المعاينة"
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                ✕
              </Button>
            </div>
          </div>

          {/* Title */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-1">
              العنوان
            </p>
            <p className="text-sm font-semibold text-foreground">
              {preview.title}
            </p>
          </div>

          {/* Idea */}
          {preview.idea && (
            <div className="flex gap-2">
              <Lightbulb className="h-4 w-4 text-warning-text shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-foreground/50 mb-0.5">
                  الفكرة التسويقية
                </p>
                <p className="text-sm text-foreground">{preview.idea}</p>
              </div>
            </div>
          )}

          {/* Content */}
          <div className="flex gap-2">
            <MessageSquare className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-xs font-semibold text-foreground/50 mb-0.5">
                نص المنشور
              </p>
              <p className="whitespace-pre-wrap text-sm text-foreground leading-relaxed">
                {preview.content}
              </p>
            </div>
          </div>

          {/* CTA */}
          {preview.cta && (
            <div className="rounded-lg border border-primary/20 bg-background px-3 py-2">
              <p className="text-xs font-semibold text-foreground/50 mb-0.5">
                نداء للعمل (CTA)
              </p>
              <p className="text-sm font-medium text-primary">{preview.cta}</p>
            </div>
          )}

          {/* Hashtags */}
          {preview.hashtags && (
            <div className="flex gap-2">
              <Hash className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
              <p className="text-sm text-primary/80">{preview.hashtags}</p>
            </div>
          )}

          {/* Image prompt */}
          {preview.imagePrompt && (
            <div className="flex gap-2">
              <Image className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-foreground/50 mb-0.5">
                  وصف الصورة (AI Image Prompt)
                </p>
                <p className="text-xs text-muted-foreground italic">
                  {preview.imagePrompt}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Recent Posts */}
      <div className="rounded-xl border border-border bg-card">
        <div className="border-b border-border px-4 py-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">
            آخر المنشورات
          </h2>
          <Link href="/marketing/drafts">
            <span className="text-xs text-primary hover:underline cursor-pointer">
              عرض المسودات ←
            </span>
          </Link>
        </div>
        {summaryQuery.isLoading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : recentPosts.length === 0 ? (
          <div className="py-10 text-center text-sm text-muted-foreground">
            لا توجد منشورات بعد — ابدأ بتوليد منشور
          </div>
        ) : (
          <div className="divide-y divide-border">
            {recentPosts.map((post: any) => {
              const badge = STATUS_BADGE[post.status] ?? {
                label: post.status,
                className: "",
              };
              return (
                <div
                  key={post.id}
                  className="flex items-start justify-between gap-3 px-4 py-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-foreground">
                      {post.title}
                    </div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      {post.postDay && (
                        <span>
                          {marketingSlotLabel(
                            post.postDay,
                            post.pageRole ?? "center",
                          )}
                        </span>
                      )}
                      {post.topic && (
                        <>
                          <span>·</span>
                          <span>{post.topic}</span>
                        </>
                      )}
                      <span>·</span>
                      <span>
                        {new Date(post.createdAt).toLocaleDateString("ar-EG")}
                      </span>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Badge className={`text-xs ${badge.className}`}>
                      {badge.label}
                    </Badge>
                    {post.status === "draft" && (
                      <>
                        <select
                          aria-label="صفحة النشر"
                          value={
                            publishPageRoles[post.id] ??
                            post.pageRole ??
                            "center"
                          }
                          onChange={(event) =>
                            setPublishPageRoles((current) => ({
                              ...current,
                              [post.id]: event.target.value as PageRole,
                            }))
                          }
                          className="h-9 rounded-md border border-input bg-background px-2 text-xs text-foreground"
                        >
                          <option value="center">المركز</option>
                          <option value="doctor">الدكتور</option>
                        </select>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setPublishId(post.id);
                            publishMutation.mutate({
                              id: post.id,
                              pageRole:
                                publishPageRoles[post.id] ??
                                post.pageRole ??
                                "center",
                            });
                          }}
                          disabled={
                            publishMutation.isPending && publishId === post.id
                          }
                        >
                          {publishMutation.isPending &&
                          publishId === post.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Send className="h-3.5 w-3.5" />
                          )}
                          <span className="mr-1.5">نشر الآن</span>
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
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
  nextRun: { day: string; date: string } | null;
}

function SchedulerCard({
  pageRole,
  data,
  isLoading,
  isRunning,
  onRunNow,
}: {
  pageRole: PageRole;
  data: SchedulerData | null | undefined;
  isLoading: boolean;
  isRunning: boolean;
  onRunNow: (day?: "saturday" | "tuesday" | "thursday") => void;
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
          النشر التلقائي معطّل — فعّله من الإعدادات
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
