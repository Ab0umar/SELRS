import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  CheckCircle2,
  Clock,
  FileText,
  Loader2,
  RefreshCw,
  Send,
  Sparkles,
  ToggleLeft,
  ToggleRight,
  XCircle,
  CalendarDays,
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

export default function MarketingDashboard() {
  const [generateDay, setGenerateDay] = useState<"saturday" | "tuesday" | "thursday">("saturday");
  const [publishId, setPublishId] = useState<number | null>(null);

  const utils = trpc.useUtils();

  const summaryQuery = trpc.marketing.dashboardSummary.useQuery();
  const settingsQuery = trpc.marketing.getSettings.useQuery();

  const generateMutation = trpc.marketing.generatePost.useMutation({
    onSuccess: () => {
      toast.success("تم إنشاء المنشور وحفظه كمسودة");
      void utils.marketing.dashboardSummary.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const publishMutation = trpc.marketing.publishPost.useMutation({
    onSuccess: () => {
      toast.success("تم تحديث حالة المنشور إلى منشور");
      setPublishId(null);
      void utils.marketing.dashboardSummary.invalidate();
    },
    onError: (err) => { toast.error(err.message); setPublishId(null); },
  });

  const updateSettingsMutation = trpc.marketing.updateSettings.useMutation({
    onSuccess: () => {
      toast.success("تم تحديث الإعدادات");
      void utils.marketing.getSettings.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const summary = summaryQuery.data;
  const settings = settingsQuery.data;
  const recentPosts = summary?.recentPosts ?? [];
  const counts = summary?.counts ?? { draft: 0, published: 0, failed: 0, scheduled: 0, total: 0 };

  const statCards = [
    { label: "الإجمالي", value: counts.total, icon: CalendarDays, tone: "text-foreground", accent: "bg-muted/30 border-border" },
    { label: "مسودات", value: counts.draft, icon: FileText, tone: "text-muted-foreground", accent: "bg-muted/20 border-border" },
    { label: "منشورة", value: counts.published, icon: CheckCircle2, tone: "text-success", accent: "bg-success/10 border-success/20" },
    { label: "مجدولة", value: counts.scheduled, icon: Clock, tone: "text-info", accent: "bg-info/10 border-info/20" },
    { label: "فشلت", value: counts.failed, icon: XCircle, tone: "text-destructive", accent: "bg-destructive/10 border-destructive/20" },
  ];

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {statCards.map((card) => (
          <div key={card.label} className={`rounded-lg border p-3 ${card.accent}`}>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground/60">
              <card.icon className="h-3.5 w-3.5" />
              {card.label}
            </div>
            <div className={`mt-1.5 text-2xl font-bold ${card.tone}`}>
              {summaryQuery.isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : card.value}
            </div>
          </div>
        ))}
      </div>

      {/* Actions row */}
      <div className="rounded-xl border border-border bg-card p-4">
        <h2 className="mb-4 text-sm font-semibold text-foreground">إجراءات سريعة</h2>
        <div className="flex flex-wrap gap-3">
          {/* Generate Post */}
          <div className="flex items-center gap-2">
            <select
              value={generateDay}
              onChange={(e) => setGenerateDay(e.target.value as typeof generateDay)}
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
              توليد منشور
            </Button>
          </div>

          {/* Auto Publish toggle */}
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              updateSettingsMutation.mutate({ autoPublish: !settings?.autoPublish })
            }
            disabled={updateSettingsMutation.isPending || settingsQuery.isLoading}
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

          {/* Connect Facebook (placeholder) */}
          <Button size="sm" variant="outline" disabled>
            ربط Facebook (قريباً)
          </Button>

          {/* Refresh */}
          <Button
            size="sm"
            variant="ghost"
            onClick={() => void utils.marketing.dashboardSummary.invalidate()}
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Recent Posts */}
      <div className="rounded-xl border border-border bg-card">
        <div className="border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold text-foreground">آخر المنشورات</h2>
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
            {recentPosts.map((post) => {
              const badge = STATUS_BADGE[post.status] ?? { label: post.status, className: "" };
              return (
                <div key={post.id} className="flex items-start justify-between gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-foreground">{post.title}</div>
                    <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                      {post.postDay && <span>{DAY_LABELS[post.postDay] ?? post.postDay}</span>}
                      <span>·</span>
                      <span>{new Date(post.createdAt).toLocaleDateString("ar-EG")}</span>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Badge className={`text-xs ${badge.className}`}>{badge.label}</Badge>
                    {post.status === "draft" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setPublishId(post.id);
                          publishMutation.mutate({ id: post.id });
                        }}
                        disabled={publishMutation.isPending && publishId === post.id}
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
