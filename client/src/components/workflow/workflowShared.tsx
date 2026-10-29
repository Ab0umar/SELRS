import { Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { trpc } from "@/lib/trpc";

const FINISH_ROLES = [
  "doctor",
  "nurse",
  "technician",
  "reception",
  "accountant",
  "manager",
  "admin",
];

/** Marks the visit as treated and refreshes the day queue, as the legacy panel did. */
export function useFinishVisit() {
  const utils = trpc.useUtils();
  const mutation = trpc.medical.updateVisitQueueStatus.useMutation();
  return async (visitId: number | undefined) => {
    if (!visitId) throw new Error("تعذر تحديد الزيارة لإنهائها");
    await mutation.mutateAsync({ visitId, queueStatus: "treated" });
    await utils.medical.getTodayPatientsByQueueStatus.invalidate();
    toast.success("تم حفظ وإنهاء الزيارة");
  };
}

export function WorkflowSaveBar({
  saving,
  disabled,
  onSave,
}: {
  saving: "save" | "finish" | null;
  disabled?: boolean;
  onSave: (finish: boolean) => void;
}) {
  const { user } = useAuth();
  const canFinish = FINISH_ROLES.includes(String(user?.role ?? ""));
  return (
    <div className="flex flex-wrap items-center gap-2 border-t border-border/50 px-4 py-2.5">
      <Button
        size="sm"
        className="gap-1.5 text-xs"
        onClick={() => onSave(false)}
        disabled={Boolean(saving) || disabled}
      >
        <Save className="h-3.5 w-3.5" />
        {saving === "save" ? "جاري الحفظ…" : "حفظ"}
      </Button>
      {canFinish ? (
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5 text-xs"
          onClick={() => onSave(true)}
          disabled={Boolean(saving) || disabled}
        >
          <Save className="h-3.5 w-3.5" />
          {saving === "finish" ? "جاري حفظ وإنهاء الزيارة…" : "حفظ وإنهاء الزيارة"}
        </Button>
      ) : null}
    </div>
  );
}

export function WorkflowCard({
  title,
  children,
  footer,
}: {
  title?: string | null;
  children: React.ReactNode;
  footer: React.ReactNode;
}) {
  return (
    <div className="flex min-h-0 w-full flex-col rounded-lg border border-border/50 bg-background text-foreground shadow-sm">
      <div className="flex items-center justify-between border-b border-border/50 px-4 py-3">
        <h2 className="truncate text-sm font-semibold">{title || "بدون اسم"}</h2>
      </div>
      <div className="space-y-4 px-4 py-4" dir="rtl">
        {children}
      </div>
      {footer}
    </div>
  );
}
