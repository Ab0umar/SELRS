import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "./ui/button";
import { CalendarIcon, Pill, Activity, FileCheck, FileText } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Calendar } from "./ui/calendar";
import { localISODate } from "@/lib/utils";
import { ROUTES } from "../../../shared/routes";

// Parses a yyyy-mm-dd string into a local Date fixed at noon, so the
// calendar never drifts to the neighbouring day across timezones.
function isoToDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1, 12, 0, 0);
}

export const QUICK_ACTIONS = [
  {
    icon: FileText,
    label: "الملف الطبي",
    path: ROUTES.patientFile,
    color: "text-card-foreground",
    hoverColor: "hover:bg-primary/5",
  },
  {
    icon: Pill,
    label: "الروشتة",
    path: ROUTES.prescription,
    color: "text-card-foreground",
    hoverColor: "hover:bg-success/10",
  },
  {
    icon: Activity,
    label: "طلب التحاليل",
    path: ROUTES.requestTests,
    color: "text-card-foreground",
    hoverColor: "hover:bg-primary/5",
  },
  {
    icon: FileCheck,
    label: "التقارير الطبية",
    path: ROUTES.medicalReports,
    color: "text-primary",
    hoverColor: "hover:bg-secondary/10",
  },
];

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// Carries the date chosen in the panel to the target page as
// ?visitDate=YYYY-MM-DD. Anything that is not a plain ISO day (empty
// string, partial input) keeps the bare path so we never navigate to
// ?visitDate=garbage.
export function withVisitDate(path: string, visitDate: string): string {
  return ISO_DATE_RE.test(visitDate)
    ? `${path}?visitDate=${encodeURIComponent(visitDate)}`
    : path;
}

export default function TodayPatientsPanel() {
  const [, setLocation] = useLocation();
  const today = localISODate();
  const [selectedDate, setSelectedDate] = useState(today);
  const [datePopoverOpen, setDatePopoverOpen] = useState(false);

  const quickActionButtons = QUICK_ACTIONS.map(action => ({
    ...action,
    onClick: () => setLocation(withVisitDate(action.path, selectedDate)),
  }));

  return (
    <div className="space-y-3 h-full flex flex-col">
      <div className="flex-shrink-0">
        <h3 className="text-sm font-bold text-start">مرضى اليوم</h3>
      </div>

      {/* Date Picker */}
      <div className="flex-shrink-0">
        <Popover open={datePopoverOpen} onOpenChange={setDatePopoverOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="gap-2 px-2 text-primary hover:text-foreground"
              aria-label="تغيير تاريخ مرضى اليوم"
            >
              <CalendarIcon className="h-4 w-4" aria-hidden />
              <span
                dir="ltr"
                className="tabular-nums text-xs font-medium text-primary"
              >
                {selectedDate}
              </span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" dir="rtl">
            <Calendar
              mode="single"
              selected={isoToDate(selectedDate)}
              defaultMonth={isoToDate(selectedDate)}
              onSelect={(d) => {
                if (d) {
                  setSelectedDate(localISODate(d));
                  setDatePopoverOpen(false);
                }
              }}
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* Quick Action Buttons */}
      <div className="flex-1 space-y-2 overflow-y-auto min-h-0">
        {quickActionButtons.map((btn) => {
          const Icon = btn.icon;
          return (
            <Button
              key={btn.path}
              type="button"
              onClick={btn.onClick}
              variant="outline"
              className={`w-full justify-start gap-2 text-xs ${btn.color} ${btn.hoverColor}`}
            >
              <Icon className="h-4 w-4" aria-hidden />
              <span>{btn.label}</span>
            </Button>
          );
        })}
      </div>
    </div>
  );
}
