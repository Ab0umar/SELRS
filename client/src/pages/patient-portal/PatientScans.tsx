import { Download, Eye, FileImage, FileText, RefreshCw, ShieldAlert } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import PatientLayout from "./PatientLayout";
import { PortalEmptyState, PortalLoadingRows, PortalPanel, PortalShell } from "./portal-ui";

function mimeIcon(mime: string) {
  if (mime.startsWith("image/")) return FileImage;
  if (mime === "application/pdf") return FileText;
  return FileText;
}

function formatScanDate(value?: string) {
  if (!value) return "غير محدد";
  const date = new Date(value);
  return date.toLocaleDateString("ar-EG");
}

export default function PatientScans() {
  const { data, isLoading, error, refetch } = trpc.patientPortal.getMyScans.useQuery();

  return (
    <PatientLayout>
      <PortalShell
        title="الأشعة والفحوصات"
        subtitle="عرض ملف الأشعة في شكل قائمة واضحة، مع تاريخ الرفع وأزرار العرض والتحميل."
      >
        {isLoading && <PortalLoadingRows rows={4} />}

        {error && (
          <PortalEmptyState
            icon={<ShieldAlert className="size-5" />}
            title="تعذر تحميل الأشعة"
            description={error.message}
            action={
              <Button onClick={() => void refetch()} className="gap-2">
                <RefreshCw className="size-4" />
                إعادة المحاولة
              </Button>
            }
          />
        )}

        {data && data.length === 0 && (
          <PortalEmptyState
            icon={<FileText className="size-5" />}
            title="لم يتم رفع أشعة أو فحوصات بعد"
            description="ستظهر الملفات هنا فور رفعها إلى الملف الطبي."
          />
        )}

        {data && data.length > 0 && (
          <PortalPanel
            title="الملفات المتاحة"
            description={`${data.length} ملف ${data.length === 1 ? "متاح" : "متاحة"} الآن`}
          >
            <div className="space-y-3">
              {data.map((scan) => {
                const Icon = mimeIcon(scan.mimeType);
                return (
                  <div
                    key={scan.id}
                    className="flex flex-col gap-3 rounded-xl border border-border bg-background p-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex min-w-0 items-start gap-3">
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <Icon className="size-5" />
                      </div>
                      <div className="min-w-0 space-y-1">
                        <p className="truncate text-sm font-semibold text-foreground">{scan.fileName || `أشعة #${scan.id}`}</p>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          <span className="rounded-full bg-muted px-2 py-1">{scan.mimeType}</span>
                          <span>{formatScanDate(scan.createdAt)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button asChild variant="outline" size="sm" className="gap-2">
                        <a href={scan.viewUrl} target="_blank" rel="noopener noreferrer">
                          <Eye className="size-4" />
                          <span className="hidden sm:inline">عرض</span>
                        </a>
                      </Button>
                      <Button asChild variant="secondary" size="sm" className="gap-2">
                        <a href={`${scan.viewUrl}?download=1`} download>
                          <Download className="size-4" />
                          <span className="hidden sm:inline">تحميل</span>
                        </a>
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </PortalPanel>
        )}
      </PortalShell>
    </PatientLayout>
  );
}
