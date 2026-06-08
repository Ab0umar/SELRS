import { Download, Eye, FileImage, FileText, RefreshCw, ShieldAlert, ArrowLeft } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import PatientLayout from "./PatientLayout";
import { PortalEmptyState, PortalLoadingRows } from "./portal-ui";

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

  const handleBack = () => {
    if (window.history.length > 1) {
      window.history.back();
      return;
    }
    window.location.href = "/my/file";
  };

  return (
    <PatientLayout>
      <div className="space-y-6">
        
        {/* Title Header */}
        <div className="flex items-center justify-between gap-3">
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-primary">أشعتي وفحوصاتي 🔬</h2>
            <p className="text-xs text-muted-foreground">تقارير الأشعة وصور العين والتحاليل المرفوعة بملفك الطبي.</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="gap-2 border-[#d8e4f1] bg-white text-primary hover:bg-[#f7fbff] cursor-pointer"
            onClick={handleBack}
          >
            <ArrowLeft className="size-4" />
            رجوع
          </Button>
        </div>

        {isLoading && <PortalLoadingRows rows={4} />}

        {error && (
          <PortalEmptyState
            icon={<ShieldAlert className="size-5" />}
            title="تعذر تحميل الأشعة"
            description={error.message}
            action={
              <Button onClick={() => void refetch()} className="gap-2 cursor-pointer">
                <RefreshCw className="size-4" />
                إعادة المحاولة
              </Button>
            }
          />
        )}

        {data && data.length === 0 && (
          <PortalEmptyState
            icon={<FileText className="size-5" />}
            title="لم يتم رفع أشعة أو تقارير بعد"
            description="عند قيامك بفحص أشعة أو بنتاكام داخل المركز، ستظهر ملفاتك هنا فور رفعها من الاستقبال."
          />
        )}

        {data && data.length > 0 && (
          <div className="space-y-6">
            
            {/* Quick summary card */}
            <div className="rounded-2xl border border-[#dbe7f4] bg-white p-5 shadow-xs">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-1">
                  <p className="text-xs font-bold text-secondary">الملفات الجاهزة للعرض</p>
                  <h3 className="text-lg font-bold text-foreground">تقارير أشعة العين</h3>
                  <p className="text-xs text-muted-foreground leading-normal">
                    لديك إجمالي <span className="font-bold text-primary">{data.length}</span> {data.length === 1 ? "ملف أشعة متاح" : "ملفات أشعة متاحة"}
                  </p>
                </div>
                <div className="bg-[#F4F8FB] border border-[#e2edf7] rounded-xl px-5 py-3 text-center min-w-[120px]">
                  <p className="text-[10px] text-muted-foreground font-semibold">الملفات المرفوعة</p>
                  <p className="text-sm font-bold text-foreground mt-0.5">{data.length} ملفات</p>
                </div>
              </div>
            </div>

            {/* List of files cards */}
            <div className="grid gap-3.5 sm:grid-cols-2">
              {data.map((scan) => {
                const Icon = mimeIcon(scan.mimeType);
                return (
                  <div
                    key={scan.id}
                    className="flex flex-col justify-between rounded-2xl border border-[#dbe7f4] bg-white p-5 shadow-xs hover:border-primary/20 transition-all duration-200"
                  >
                    <div className="flex items-start gap-3.5 mb-4">
                      <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                        <Icon className="size-5" />
                      </div>
                      <div className="min-w-0 space-y-1">
                        <p className="truncate text-sm font-bold text-foreground">{scan.fileName || `أشعة وفحص #${scan.id}`}</p>
                        <div className="flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground">
                          <span className="rounded-lg bg-[#F4F8FB] border border-[#e2edf7] px-2 py-0.5">{scan.mimeType.split("/")[1].toUpperCase()}</span>
                          <span>تاريخ الرفع: {formatScanDate(scan.createdAt)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-2 border-t border-[#f0f5fa]">
                      <a href={scan.viewUrl} target="_blank" rel="noopener noreferrer" className="flex-1">
                        <Button variant="outline" size="sm" className="w-full h-9 text-xs rounded-xl gap-1.5 border-[#dbe7f4] hover:bg-muted/40 cursor-pointer">
                          <Eye className="size-3.5" />
                          <span>عرض الملف</span>
                        </Button>
                      </a>
                      <a href={`${scan.viewUrl}?download=1`} download className="flex-1">
                        <Button variant="secondary" size="sm" className="w-full h-9 text-xs rounded-xl gap-1.5 bg-secondary text-secondary-foreground hover:bg-secondary/90 cursor-pointer">
                          <Download className="size-3.5" />
                          <span>تحميل</span>
                        </Button>
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>

          </div>
        )}
      </div>
    </PatientLayout>
  );
}
