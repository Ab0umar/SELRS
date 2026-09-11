import { Button } from "@/components/ui/button";

type QueueLoadStatusProps = {
  isError: boolean;
  hasData: boolean;
  isFetching: boolean;
  dataUpdatedAt: number;
  refetch: () => Promise<unknown>;
};

/** Keep failed refreshes distinct from an empty queue without exposing server details. */
export function QueueLoadStatus({
  isError,
  hasData,
  isFetching,
  dataUpdatedAt,
  refetch,
}: QueueLoadStatusProps) {
  if (!isError) return null;
  return (
    <div
      role="alert"
      dir="rtl"
      className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm text-foreground"
    >
      <div>
        <p className="font-medium">
          {hasData ? "تعذر تحديث قائمة المرضى" : "تعذر تحميل قائمة المرضى"}
        </p>
        <p className="text-muted-foreground">
          {hasData
            ? `المعروض آخر بيانات محفوظة${dataUpdatedAt ? ` — آخر تحديث ${new Date(dataUpdatedAt).toLocaleTimeString("ar-EG")}` : ""}.`
            : "البيانات غير متاحة حالياً. أعد المحاولة."}
        </p>
      </div>
      <Button
        type="button"
        variant="outline"
        className="min-h-11"
        disabled={isFetching}
        onClick={() => void refetch()}
      >
        {isFetching ? "جارٍ إعادة المحاولة…" : "إعادة المحاولة"}
      </Button>
    </div>
  );
}
