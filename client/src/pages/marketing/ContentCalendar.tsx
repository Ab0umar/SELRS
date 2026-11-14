import { useMemo, useState } from "react";
import { toast } from "sonner";
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

const PAGE_LABEL = { center: "المركز", doctor: "الدكتور" } as const;
const STATUS_LABEL: Record<string, string> = {
  draft: "مسودة للمراجعة",
  scheduled: "مجدول",
  publishing: "جاري النشر",
  published: "منشور",
};

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
  const [confirmWeek, setConfirmWeek] = useState(false);
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
  const generateWeek = trpc.marketing.generateWeekDrafts.useMutation({
    onSuccess: () => {
      setConfirmWeek(false);
      toast.success("بدأ تجهيز مسودات الأسبوع، وستظهر هنا عند اكتمالها");
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

  const emptyThisWeek =
    data?.slots.filter(
      (slot) =>
        new Date(slot.at).getTime() < Date.now() + 7 * 24 * 60 * 60 * 1000 &&
        !data.posts.some(
          (post) => post.date === slot.date && post.pageRole === slot.pageRole,
        ),
    ).length ?? 0;

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold">تقويم المحتوى</h2>
          <p className="text-xs text-muted-foreground">
            الأسبوعان القادمان: المسودات المجهزة والمنشورات المجدولة والمواعيد
            الفارغة
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="min-h-11 h-auto whitespace-normal"
          disabled={generateWeek.isPending || emptyThisWeek === 0}
          onClick={() => setConfirmWeek(true)}
        >
          تجهيز مسودات هذا الأسبوع
        </Button>
      </div>
      {calendar.isLoading && <p role="status">جارٍ تحميل التقويم...</p>}
      {calendar.error && (
        <p role="alert" className="text-sm text-destructive">
          تعذر تحميل التقويم. حدّث الصفحة للمتابعة.
        </p>
      )}
      {data && days.length === 0 && (
        <p className="text-sm text-muted-foreground">
          لا توجد مواعيد نشر مفعلة في الأسبوعين القادمين. فعّل أيام النشر من
          الإعدادات.
        </p>
      )}
      <ol className="space-y-3">
        {days.map(([date, day]) => (
          <li key={date}>
            <p className="mb-1 text-xs font-semibold text-muted-foreground">
              {dayHeading(date)}
            </p>
            <ul className="space-y-1">
              {day.posts.map((post) => (
                <li
                  key={`post-${post.id}`}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border px-3 py-2 text-sm"
                >
                  <span className="min-w-0">
                    <span className="text-muted-foreground">
                      {PAGE_LABEL[post.pageRole]} ·{" "}
                      {post.scheduledAt ? timeOf(post.scheduledAt) : ""} ·{" "}
                      {STATUS_LABEL[post.status] ?? post.status}:
                    </span>{" "}
                    {post.topic || post.title}
                  </span>
                  {post.status === "scheduled" && (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={unschedule.isPending}
                      onClick={() => unschedule.mutate({ id: post.id })}
                    >
                      إعادة إلى المسودات
                    </Button>
                  )}
                  {post.status === "draft" && (
                    <a
                      className="text-xs text-primary underline underline-offset-2"
                      href={`/marketing/drafts?post=${post.id}`}
                    >
                      مراجعة وجدولة
                    </a>
                  )}
                </li>
              ))}
              {day.slots
                .filter(
                  (slot) =>
                    !day.posts.some((post) => post.pageRole === slot.pageRole),
                )
                .map((slot) => (
                  <li
                    key={`slot-${slot.pageRole}-${slot.at}`}
                    className="rounded-lg border border-dashed border-border px-3 py-2 text-sm text-muted-foreground"
                  >
                    {PAGE_LABEL[slot.pageRole]} · {timeOf(slot.at)} · موعد فارغ
                    ({marketingSlotLabel(slot.slot, slot.pageRole)})
                  </li>
                ))}
            </ul>
          </li>
        ))}
      </ol>
      <Dialog open={confirmWeek} onOpenChange={setConfirmWeek}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>تجهيز مسودات هذا الأسبوع</DialogTitle>
            <DialogDescription>
              سنجهز مسودة لكل موعد فارغ في الأيام السبعة القادمة (
              {emptyThisWeek} موعد) بمزوّد الجدولة لكل صفحة، وقد يستهلك ذلك
              رصيدًا. لن تُنشر المسودات حتى تراجعها وتجدولها.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-wrap gap-3">
            <Button
              className="min-h-11"
              variant="outline"
              onClick={() => setConfirmWeek(false)}
            >
              إلغاء
            </Button>
            <Button
              className="min-h-11 h-auto whitespace-normal"
              disabled={generateWeek.isPending}
              onClick={() => generateWeek.mutate()}
            >
              ابدأ التجهيز
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
