import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { marketingSlotLabel } from "@shared/marketingSchedule";

const PAGE_LABEL = { center: "صفحة المركز", doctor: "صفحة الدكتور" } as const;
const STATUS_LABEL: Record<string, string> = {
  draft: "مسودة مستنية موافقتك",
  scheduled: "مجدول",
  publishing: "جاري النشر",
  published: "اتنشر",
};
const STATUS_TONE: Record<string, string> = {
  draft: "border-warning/40 bg-warning/10",
  scheduled: "border-info/30 bg-info/5",
  publishing: "border-info/30 bg-info/5",
  published: "border-success/30 bg-success/5",
};

type PageRole = keyof typeof PAGE_LABEL;
type Target = { pageRole: PageRole; date: string } | "week";

function dayHeading(date: string) {
  return new Date(`${date}T12:00:00Z`).toLocaleDateString("ar-EG", {
    weekday: "long",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

function timeOf(iso: string) {
  return new Date(iso).toLocaleTimeString("ar-EG", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Africa/Cairo",
  });
}

export default function ContentCalendar() {
  const utils = trpc.useUtils();
  const [confirm, setConfirm] = useState<Target | null>(null);
  const calendar = trpc.marketing.contentCalendar.useQuery(undefined, {
    refetchInterval: 30_000,
  });
  const refresh = () => {
    void utils.marketing.contentCalendar.invalidate();
    void utils.marketing.listPosts.invalidate();
  };
  const unschedule = trpc.marketing.unschedulePost.useMutation({
    onSuccess: () => {
      toast.success("أُعيد المنشور إلى المسودات");
      refresh();
    },
    onError: (error) => toast.error(error.message),
  });
  const generate = trpc.marketing.generateWeekDrafts.useMutation({
    onSuccess: () => {
      setConfirm(null);
      toast.success("بدأ تجهيز المسودة، وهتظهر هنا لما تخلص");
      refresh();
    },
    onError: (error) => toast.error(error.message),
  });

  const data = calendar.data;
  const days = useMemo(() => {
    if (!data) return [];
    const byDate = new Map<
      string,
      { slots: typeof data.slots; posts: typeof data.posts }
    >();
    const entry = (date: string) => {
      if (!byDate.has(date)) byDate.set(date, { slots: [], posts: [] });
      return byDate.get(date)!;
    };
    for (const slot of data.slots) entry(slot.date).slots.push(slot);
    for (const post of data.posts)
      if (post.date) entry(post.date).posts.push(post);
    return [...byDate.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [data]);

  const weekEnd = Date.now() + 7 * 24 * 60 * 60 * 1000;
  const emptyThisWeek =
    data?.slots.filter(
      (slot) =>
        new Date(slot.at).getTime() < weekEnd &&
        !slot.generating &&
        !data.posts.some(
          (post) => post.date === slot.date && post.pageRole === slot.pageRole,
        ),
    ).length ?? 0;
  const thisWeek = days.filter(
    ([date]) => new Date(`${date}T12:00:00Z`).getTime() < weekEnd,
  );
  const nextWeek = days.filter(
    ([date]) => new Date(`${date}T12:00:00Z`).getTime() >= weekEnd,
  );

  const renderDays = (list: typeof days) => (
    <ol className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {list.flatMap(([date, day]) => [
        ...day.posts.map((post) => (
          <li
            key={`post-${post.id}`}
            className={`min-w-0 space-y-2 rounded-lg border p-3 text-sm ${STATUS_TONE[post.status] ?? "border-border"}`}
          >
            <p className="text-xs text-muted-foreground">
              {dayHeading(date)}
              {post.scheduledAt ? ` · ${timeOf(post.scheduledAt)}` : ""} ·{" "}
              {PAGE_LABEL[post.pageRole]}
            </p>
            <p className="font-medium break-words">
              {post.topic || post.title}
            </p>
            <p className="text-xs">{STATUS_LABEL[post.status] ?? post.status}</p>
            {post.status === "draft" && (
              <Link
                href={`/ai/marketing/drafts?post=${post.id}`}
                className="inline-flex min-h-11 items-center text-sm text-primary underline underline-offset-4"
              >
                راجع وانشر
              </Link>
            )}
            {post.status === "scheduled" && (
              <Button
                size="sm"
                variant="outline"
                className="min-h-11"
                disabled={unschedule.isPending}
                onClick={() => unschedule.mutate({ id: post.id })}
              >
                إعادة إلى المسودات
              </Button>
            )}
            {post.status === "published" && (
              <Link
                href="/ai/marketing/history"
                className="inline-flex min-h-11 items-center text-sm text-primary underline underline-offset-4"
              >
                شوف الأداء
              </Link>
            )}
          </li>
        )),
        ...day.slots
          .filter(
            (slot) => !day.posts.some((post) => post.pageRole === slot.pageRole),
          )
          .map((slot) => (
            <li
              key={`slot-${slot.pageRole}-${slot.at}`}
              className="min-w-0 space-y-2 rounded-lg border border-dashed border-border p-3 text-sm"
            >
              <p className="text-xs text-muted-foreground">
                {dayHeading(date)} · {timeOf(slot.at)} ·{" "}
                {PAGE_LABEL[slot.pageRole]} (
                {marketingSlotLabel(slot.slot, slot.pageRole)})
              </p>
              {slot.generating ? (
                <p role="status">جارٍ تجهيز النص والصورة</p>
              ) : (
                <>
                  <p className="text-muted-foreground">
                    مفيش منشور لليوم ده.
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="min-h-11"
                    disabled={generate.isPending}
                    onClick={() =>
                      setConfirm({ pageRole: slot.pageRole, date: slot.date })
                    }
                  >
                    ولّد منشور
                  </Button>
                </>
              )}
            </li>
          )),
      ])}
    </ol>
  );

  return (
    <section
      aria-labelledby="content-calendar-title"
      className="space-y-4 rounded-xl border border-border bg-card p-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="content-calendar-title" className="text-base font-semibold">
          تقويم المحتوى
        </h2>
        <Button
          size="sm"
          className="min-h-11 h-auto whitespace-normal"
          disabled={generate.isPending || emptyThisWeek === 0}
          onClick={() => setConfirm("week")}
        >
          جهّز مسودات الأسبوع ده كلها
        </Button>
      </div>
      {calendar.isLoading && <p role="status">جارٍ تحميل التقويم...</p>}
      {calendar.error && (
        <p role="alert" className="text-sm text-destructive">
          تعذر تحميل التقويم: {calendar.error.message}
        </p>
      )}
      {data && days.length === 0 && (
        <p className="text-sm text-muted-foreground">
          لا توجد مواعيد نشر مفعلة في الأسبوعين القادمين. فعّل أيام النشر واربط
          الصفحة من الإعدادات.
        </p>
      )}
      {thisWeek.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-muted-foreground">
            الأسبوع ده
          </h3>
          {renderDays(thisWeek)}
        </div>
      )}
      {nextWeek.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-muted-foreground">
            الأسبوع الجاي
          </h3>
          {renderDays(nextWeek)}
        </div>
      )}
      <Dialog
        open={confirm !== null}
        onOpenChange={(open) => !open && setConfirm(null)}
      >
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>
              {confirm === "week" ? "تجهيز مسودات الأسبوع" : "تجهيز مسودة"}
            </DialogTitle>
            <DialogDescription>
              {confirm === "week"
                ? `هنجهز مسودة لكل موعد فارغ في الأيام السبعة الجاية (${emptyThisWeek} موعد) بمزوّد الجدولة لكل صفحة، وده ممكن يستهلك رصيد.`
                : confirm
                  ? `هنجهز مسودة ل${PAGE_LABEL[confirm.pageRole]} يوم ${dayHeading(confirm.date)} بمزوّد الجدولة للصفحة، وده ممكن يستهلك رصيد.`
                  : ""}{" "}
              المسودات مش بتتنشر لحد ما تراجعها وتجدولها.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-wrap gap-3">
            <Button
              className="min-h-11"
              variant="outline"
              onClick={() => setConfirm(null)}
            >
              إلغاء
            </Button>
            <Button
              className="min-h-11 h-auto whitespace-normal"
              disabled={generate.isPending}
              onClick={() =>
                generate.mutate(
                  confirm && confirm !== "week" ? { slot: confirm } : undefined,
                )
              }
            >
              ابدأ التجهيز
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
