import { useEffect, useState } from "react";
import { ChevronDown, ChevronUp, UserPlus } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ExaminationPatientQuickDialogContent } from "@/components/examination/ExaminationPatientQuickDialogContent";
import { useIsMobile } from "@/hooks/useMobile";
import { cn } from "@/lib/utils";

export function QuickPatientEntryDialog({
  open,
  onOpenChange,
  initialData,
  onSaved,
  inlineOnDesktop = false,
  inlineHeader = true,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: {
    patientId?: number | null;
    patientCode?: string | null;
    fullName?: string;
    age?: number | string | null;
    phone?: string | null;
    email?: string | null;
    visitDate?: string | null;
    serviceType?:
      "consultant" | "specialist" | "lasik" | "external" | "followup" | null;
  };
  onSaved?: (result: { patientId: number }) => void | Promise<void>;
  inlineOnDesktop?: boolean;
  inlineHeader?: boolean;
}) {
  const [mountKey, setMountKey] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const isMobile = useIsMobile();
  useEffect(() => {
    if (open) {
      setMountKey((k) => k + 1);
      setExpanded(true);
    }
  }, [open]);

  if (inlineOnDesktop && !isMobile) {
    const content = (
      <div
        className={cn(
          "overflow-x-hidden p-4",
          inlineHeader && !expanded && "hidden",
        )}
      >
        <ExaminationPatientQuickDialogContent
          key={mountKey}
          onClose={() => {
            setMountKey((key) => key + 1);
            setExpanded(false);
            onOpenChange(false);
          }}
          initialData={initialData}
          onSaved={onSaved}
        />
      </div>
    );

    if (!inlineHeader) {
      return (
        <section
          className="overflow-hidden rounded-lg border border-border bg-background"
          dir="rtl"
        >
          {content}
        </section>
      );
    }

    return (
      <section
        className="overflow-hidden rounded-lg border border-border bg-background"
        dir="rtl"
      >
        <button
          type="button"
          onClick={() => {
            const next = !expanded;
            setExpanded(next);
            onOpenChange(next);
          }}
          className="flex min-h-11 w-full items-center justify-between gap-3 border-b border-border px-4 py-2.5 text-right transition-colors hover:bg-muted/40"
          aria-expanded={expanded}
        >
          <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <UserPlus className="h-4 w-4 text-primary" aria-hidden />
            تسجيل مريض
          </span>
          {expanded ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" aria-hidden />
          ) : (
            <ChevronDown
              className="h-4 w-4 text-muted-foreground"
              aria-hidden
            />
          )}
        </button>
        {content}
      </section>
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="top"
        className="quick-patient-registration-sheet max-h-[92dvh] w-full gap-0 overflow-hidden p-0"
        dir="rtl"
      >
        <SheetHeader className="quick-patient-registration-header shrink-0 border-b px-5 py-4 text-right">
          <SheetTitle>تسجيل مريض</SheetTitle>
          <SheetDescription className="sr-only">
            نموذج تسجيل مريض جديد
          </SheetDescription>
        </SheetHeader>
        <div className="quick-patient-registration-scroll min-h-0 flex-1 overflow-x-hidden overflow-y-auto p-4 sm:p-5">
          {open ? (
            <ExaminationPatientQuickDialogContent
              key={mountKey}
              onClose={() => onOpenChange(false)}
              initialData={initialData}
              onSaved={onSaved}
            />
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}
