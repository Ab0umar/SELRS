import { trpc } from "@/lib/trpc";
import PatientLayout from "./PatientLayout";
import { Badge } from "@/components/ui/badge";

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "outline" | "secondary" | "destructive" }> = {
  pending:   { label: "قيد المراجعة", variant: "secondary" },
  confirmed: { label: "مؤكد", variant: "default" },
  cancelled: { label: "ملغي", variant: "destructive" },
  completed: { label: "مكتمل", variant: "outline" },
};

const DAY_NAMES = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];

function formatDate(d: string | null | undefined) {
  if (!d) return "";
  const date = new Date(d);
  return `${DAY_NAMES[date.getDay()]} ${date.toLocaleDateString("ar-EG")}`;
}

export default function PatientBookings() {
  const { data, isLoading, error } = trpc.patientPortal.getMyBookings.useQuery();

  return (
    <PatientLayout>
      <h2 className="text-lg font-bold text-gray-900 mb-4">مواعيدي</h2>

      {isLoading && <p className="text-gray-500 text-center py-8">جاري التحميل...</p>}
      {error && <p className="text-red-500 text-center py-8">{error.message}</p>}

      {data && data.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <p className="text-4xl mb-3">📅</p>
          <p>لا توجد حجوزات سابقة</p>
        </div>
      )}

      {data && data.length > 0 && (
        <div className="space-y-3">
          {data.map((b) => {
            const cfg = STATUS_CONFIG[b.status] ?? { label: b.status, variant: "outline" as const };
            return (
              <div key={b.id} className="bg-white rounded-2xl shadow-sm p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-gray-900">{b.typeLabel}</p>
                    <p className="text-sm text-gray-500">{formatDate(b.requestedDate)}</p>
                  </div>
                  <Badge variant={cfg.variant}>{cfg.label}</Badge>
                </div>
                {b.confirmedDate && b.confirmedDate !== b.requestedDate && (
                  <p className="text-xs text-blue-600">الموعد المؤكد: {formatDate(b.confirmedDate)}</p>
                )}
                {b.staffNotes && (
                  <p className="text-xs text-gray-500 bg-gray-50 rounded-lg p-2">{b.staffNotes}</p>
                )}
                {b.notes && (
                  <p className="text-xs text-gray-400">ملاحظتك: {b.notes}</p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </PatientLayout>
  );
}
