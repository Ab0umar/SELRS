import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { getTrpcErrorMessage } from "@/lib/utils";
import {
  classifyRecord,
  hasFullEye,
  type RecordStatus,
} from "../../../../shared/refractionCompleteness";

export type RecordStatusFilter = "all" | RecordStatus;

export const recordStatusTabs = [
  { value: "all", label: "الكل" },
  { value: "complete", label: "كامل" },
  { value: "partial", label: "غير مكتمل" },
  { value: "empty", label: "ناقص" },
];

export function getRecordStatus(
  row: Record<string, unknown> & { markedComplete?: boolean },
): RecordStatus {
  return classifyRecord(row, Boolean(row.markedComplete));
}

const badgeStyles: Record<RecordStatus, string> = {
  complete: "bg-success/15 text-success",
  partial: "bg-warning/20 text-warning-text/90",
  empty: "bg-destructive/10 text-destructive",
};

const badgeLabels: Record<RecordStatus, string> = {
  complete: "كامل",
  partial: "غير مكتمل",
  empty: "ناقص",
};

export function RecordStatusBadge({
  status,
  confirmed,
}: {
  status: RecordStatus;
  confirmed?: boolean;
}) {
  return (
    <span
      className={`rounded-full px-2.5 py-1 text-[13px] font-semibold ${badgeStyles[status]}`}
    >
      {badgeLabels[status]}
      {status === "complete" && confirmed ? " (مؤكد)" : ""}
    </span>
  );
}

/**
 * Converts a one-eye "غير مكتمل" record to "كامل" (or undoes it). Only offered when at least
 * one eye is fully recorded; the server checks the same rule.
 */
export function ConfirmCompleteButton({
  row,
  status,
  examinationId,
  onChanged,
}: {
  row: Record<string, unknown> & { markedComplete?: boolean };
  status: RecordStatus;
  examinationId: number;
  onChanged: () => void;
}) {
  const mutation = trpc.medical.setExaminationRecordComplete.useMutation({
    onSuccess: (_result, variables) => {
      toast.success(
        variables.complete ? "تم تحويل السجل لكامل" : "تم إلغاء التأكيد",
      );
      onChanged();
    },
    onError: (error) => toast.error(getTrpcErrorMessage(error, "تعذر التحديث")),
  });

  const confirmed = Boolean(row.markedComplete);
  const canConfirm = status === "partial" && hasFullEye(row);
  if (!canConfirm && !(status === "complete" && confirmed)) return null;

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="mt-2 h-8 text-xs"
      disabled={mutation.isPending}
      onClick={() =>
        mutation.mutate({ examinationId, complete: !confirmed })
      }
    >
      {confirmed ? "إلغاء التأكيد" : "تحويل لكامل"}
    </Button>
  );
}
