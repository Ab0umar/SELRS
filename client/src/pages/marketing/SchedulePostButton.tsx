import { useState } from "react";
import { toast } from "sonner";
import { CalendarClock } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { DateInput } from "@/components/ui/date-input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

function cairoParts(date: Date) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "Africa/Cairo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(date)
      .map((part) => [part.type, part.value]),
  );
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    hour: Number(parts.hour),
  };
}

export default function SchedulePostButton({
  postId,
  pageRole,
  scheduledAt,
  disabled,
}: {
  postId: number;
  pageRole: "center" | "doctor";
  scheduledAt: string | Date | null;
  disabled?: boolean;
}) {
  const utils = trpc.useUtils();
  const [open, setOpen] = useState(false);
  const initial = cairoParts(
    scheduledAt && new Date(scheduledAt).getTime() > Date.now()
      ? new Date(scheduledAt)
      : new Date(Date.now() + 24 * 60 * 60 * 1000),
  );
  const [date, setDate] = useState(initial.date);
  const [hour, setHour] = useState(scheduledAt ? initial.hour : 9);
  const schedule = trpc.marketing.schedulePost.useMutation({
    onSuccess: () => {
      setOpen(false);
      toast.success("جُدول المنشور وسيُنشر في موعده");
      void utils.marketing.listPosts.invalidate();
      void utils.marketing.contentCalendar.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });
  return (
    <>
      <Button
        size="sm"
        variant="outline"
        className="gap-1.5 text-xs"
        disabled={disabled}
        onClick={() => setOpen(true)}
      >
        <CalendarClock className="h-3 w-3" />
        جدولة
      </Button>
      <Dialog
        open={open}
        onOpenChange={(next) => !schedule.isPending && setOpen(next)}
      >
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>جدولة المنشور</DialogTitle>
            <DialogDescription>
              يُنشر على صفحة {pageRole === "doctor" ? "الدكتور" : "المركز"} في
              الموعد المحدد بتوقيت القاهرة. يمكنك إعادته إلى المسودات قبل ذلك من
              تقويم المحتوى.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-wrap items-end gap-3">
            <label className="space-y-1 text-sm">
              <span className="block text-muted-foreground">اليوم</span>
              <DateInput
                value={date}
                onChange={(event) => setDate(event.target.value)}
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className="block text-muted-foreground">الساعة</span>
              <select
                value={hour}
                onChange={(event) => setHour(Number(event.target.value))}
                className="h-10 rounded-md border border-input bg-background px-2 text-sm text-foreground"
              >
                {Array.from({ length: 24 }, (_, value) => (
                  <option key={value} value={value}>
                    {String(value).padStart(2, "0")}:00
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button
              className="min-h-11"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              إلغاء
            </Button>
            <Button
              className="min-h-11"
              disabled={schedule.isPending || !date}
              onClick={() =>
                schedule.mutate({ id: postId, pageRole, date, hour })
              }
            >
              تأكيد الجدولة
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
