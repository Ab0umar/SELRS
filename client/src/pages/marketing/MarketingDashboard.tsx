import { useState } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
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

const DAY_LABELS: Record<string, string> = {
  saturday: "السبت — تصحيح الإبصار والبنتاكام",
  tuesday: "الثلاثاء — المياه البيضاء والقرنية",
  thursday: "الخميس — صحة العيون العامة",
};

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  draft: { label: "مسودة", className: "bg-muted text-muted-foreground" },
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

export default function MarketingDashboard() {
  const [generateDay, setGenerateDay] = useState<
    "saturday" | "tuesday" | "thursday"
  >("saturday");
  const [publishId, setPublishId] = useState<number | null>(null);
  const [preview, setPreview] = useState<GeneratedPreview | null>(null);

  const utils = trpc.useUtils();

  const summaryQuery = trpc.marketing.dashboardSummary.useQuery();
  const settingsQuery = trpc.marketing.getSettings.useQuery();
  const schedulerQuery = trpc.marketing.getSchedulerStatus.useQuery(undefined, {
    refetchInterval: 30_000,
  });

  const generateMutation = trpc.marketing.generatePost.useMutation({
    onSuccess: (data) => {
      setPreview(data);
      toast.success(`تم توليد منشور عن: ${data.topic}`);
      void utils.marketing.dashboardSummary.invalidate();
      void utils.marketing.listPosts.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

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

  const updateSettingsMutation = trpc.marketing.updateSettings.useMutation({
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
          data.published ? "تم النشر على Facebook" : "تم حفظ المنشور كمسودة",
        );
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
  const settings = settingsQuery.data;
  const recentPosts = summary?.recentPosts ?? [];
  const counts = summary?.counts ?? {
    draft: 0,
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
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
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
        onRunNow={(day) => runNowMutation.mutate({ day })}
      />

      {/* Actions */}
      <div className="rounded-xl border border-border bg-card p-4">
        <h2 className="mb-4 text-sm font-semibold text-foreground">
          إجراءات سريعة
        </h2>
        <div className="flex flex-wrap gap-3">
          {/* Generate Post */}
          <div className="flex items-center gap-2">
            <select
              value={generateDay}
              onChange={(e) =>
                setGenerateDay(e.target.value as typeof generateDay)
              }
              className="rounded-md border border-input bg-background px-2 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="saturday">السبت</option>
              <option value="tuesday">الثلاثاء</option>
              <option value="thursday">الخميس</option>
            </select>
            <Button
              size="sm"
              variant="default"
              onClick={() => generateMutation.mutate({ postDay: generateDay })}
              disabled={generateMutation.isPending}
            >
              {generateMutation.isPending ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="mr-1.5 h-4 w-4" />
              )}
              {generateMutation.isPending ? "جارٍ التوليد…" : "توليد منشور"}
            </Button>
          </div>

          {/* Auto Publish toggle */}
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              updateSettingsMutation.mutate({
                autoPublish: !settings?.autoPublish,
              })
            }
            disabled={
              updateSettingsMutation.isPending || settingsQuery.isLoading
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

        {/* Generating indicator */}
        {generateMutation.isPending && (
          <div className="mt-4 flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-primary">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>
              Gemini AI يولّد محتوى عن{" "}
              <strong>{DAY_LABELS[generateDay]}</strong>…
            </span>
          </div>
        )}
      </div>

      {/* Generated Content Preview */}
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
              <button
                onClick={() => setPreview(null)}
                aria-label="إغلاق المعاينة"
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                ✕
              </button>
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
              <Lightbulb className="h-4 w-4 text-warning shrink-0 mt-0.5" />
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
                        <span>{DAY_LABELS[post.postDay] ?? post.postDay}</span>
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
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setPublishId(post.id);
                          publishMutation.mutate({ id: post.id });
                        }}
                        disabled={
                          publishMutation.isPending && publishId === post.id
                        }
                      >
                        {publishMutation.isPending && publishId === post.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Send className="h-3.5 w-3.5" />
                        )}
                        <span className="mr-1.5">نشر الآن</span>
                      </Button>
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

const DAY_AR: Record<string, string> = {
  saturday: "السبت",
  tuesday: "الثلاثاء",
  thursday: "الخميس",
};

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
  data,
  isLoading,
  isRunning,
  onRunNow,
}: {
  data: SchedulerData | null | undefined;
  isLoading: boolean;
  isRunning: boolean;
  onRunNow: (day?: "saturday" | "tuesday" | "thursday") => void;
}) {
  if (isLoading) return null;

  const status = data?.schedulerStatus ?? "idle";
  const active = data?.autoPublish && data?.fbConnected;

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
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
              {DAY_AR[data.nextRun.day] ?? data.nextRun.day}
              {" — "}
              {new Date(data.nextRun.date).toLocaleString("ar-EG", {
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
              data?.saturdayEnabled && "س",
              data?.tuesdayEnabled && "ث",
              data?.thursdayEnabled && "خ",
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
        <p className="mt-2 text-xs text-warning">
          Facebook غير مربوط — سيتم حفظ المنشورات كمسودات فقط
        </p>
      )}
    </div>
  );
}
