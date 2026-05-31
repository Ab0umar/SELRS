import { trpc } from "@/lib/trpc";
import PatientLayout from "./PatientLayout";
import { Button } from "@/components/ui/button";

function mimeIcon(mime: string): string {
  if (mime.startsWith("image/")) return "🖼";
  if (mime === "application/pdf") return "📄";
  return "📎";
}

export default function PatientScans() {
  const { data, isLoading, error } = trpc.patientPortal.getMyScans.useQuery();

  return (
    <PatientLayout>
      <h2 className="text-lg font-bold text-gray-900 mb-4">أشعتي</h2>

      {isLoading && <p className="text-gray-500 text-center py-8">جاري التحميل...</p>}
      {error && <p className="text-red-500 text-center py-8">{error.message}</p>}

      {data && data.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <p className="text-4xl mb-3">📭</p>
          <p>لا توجد أشعة مسجلة حتى الآن</p>
        </div>
      )}

      {data && data.length > 0 && (
        <div className="space-y-3">
          {data.map((scan) => (
            <div key={scan.id} className="bg-white rounded-2xl shadow-sm p-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-2xl">{mimeIcon(scan.mimeType)}</span>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{scan.fileName || `أشعة #${scan.id}`}</p>
                  {scan.createdAt && (
                    <p className="text-xs text-gray-500">
                      {new Date(scan.createdAt).toLocaleDateString("ar-EG")}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <Button size="sm" variant="outline" asChild>
                  <a href={scan.viewUrl} target="_blank" rel="noopener noreferrer">عرض</a>
                </Button>
                <Button size="sm" variant="ghost" asChild>
                  <a href={`${scan.viewUrl}?download=1`} download>تحميل</a>
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </PatientLayout>
  );
}
