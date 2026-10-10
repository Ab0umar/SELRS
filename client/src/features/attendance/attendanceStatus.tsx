import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Day-level attendance statuses used across daily reports and employee detail. */
export const ATTENDANCE_STATUS_LABELS: Record<string, string> = {
  present: "حاضر",
  absent: "غائب",
  leave: "إجازة",
  partial: "جزئي",
  holiday: "عطلة",
  missing_checkout: "لم يسجل الخروج",
  late: "متأخر",
  weekend: "عطلة أسبوعية",
  rest: "راحة",
};

/**
 * Shared pill tones for day status badges (DailyView look: bordered rounded-full).
 * Leave uses the info tone everywhere.
 */
export const ATTENDANCE_STATUS_TONE: Record<string, string> = {
  present: "border-success/20 bg-success/10 text-success",
  absent: "border-destructive/20 bg-destructive/10 text-destructive",
  leave: "border-info/20 bg-info/10 text-info",
  partial: "border-warning/30 bg-warning/10 text-warning-text",
  holiday: "border-secondary/20 bg-secondary/10 text-primary",
  missing_checkout:
    "border-muted-foreground/20 bg-muted/70 text-foreground",
  late: "border-warning/30 bg-warning/10 text-warning-text",
  weekend: "border-secondary/20 bg-secondary/10 text-primary",
  rest: "border-secondary/20 bg-secondary/10 text-primary",
};

/** Time / metric chip tones (in, out, late, early, overtime). */
export const ATTENDANCE_TIME_TONE: Record<string, string> = {
  in: "border-success/20 bg-success/10 text-success",
  out: "border-destructive/20 bg-destructive/10 text-destructive",
  late: "border-warning/30 bg-warning/10 text-warning-text",
  early: "border-info/20 bg-info/10 text-info",
  overtime: "border-primary/20 bg-primary/10 text-primary",
};

const FALLBACK_STATUS_TONE =
  "border-muted-foreground/20 bg-muted/70 text-foreground";

export function getAttendanceStatusLabel(status: string): string {
  return ATTENDANCE_STATUS_LABELS[status] ?? status;
}

export function attendanceStatusClass(status: string): string {
  return ATTENDANCE_STATUS_TONE[status] ?? FALLBACK_STATUS_TONE;
}

export function attendanceTimeClass(kind: string): string {
  return ATTENDANCE_TIME_TONE[kind] ?? FALLBACK_STATUS_TONE;
}

const PILL_BASE =
  "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold";

type AttendanceStatusBadgeProps = {
  status: string;
  className?: string;
  children?: ReactNode;
};

/** Day-status pill matching the DailyView report look. */
export function AttendanceStatusBadge({
  status,
  className,
  children,
}: AttendanceStatusBadgeProps) {
  return (
    <span className={cn(PILL_BASE, attendanceStatusClass(status), className)}>
      {children ?? getAttendanceStatusLabel(status)}
    </span>
  );
}

type AttendanceToneBadgeProps = {
  tone: string;
  className?: string;
  children: ReactNode;
};

/** Metric/time chip using shared time tones (in/out/late/early/overtime). */
export function AttendanceToneBadge({
  tone,
  className,
  children,
}: AttendanceToneBadgeProps) {
  return (
    <span className={cn(PILL_BASE, attendanceTimeClass(tone), className)}>
      {children}
    </span>
  );
}
