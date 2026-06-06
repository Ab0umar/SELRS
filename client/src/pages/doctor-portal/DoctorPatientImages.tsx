import { useRoute, useLocation } from "wouter";
import { ArrowRight, Download, Eye, FileImage, FileText, RefreshCw, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import DoctorLayout from "./DoctorLayout";

function mimeIcon(mime: string) {
  if (mime.startsWith("image/")) return FileImage;
  return FileText;
}

function formatDate(iso: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB");
}

export default function DoctorPatientImages() {
  const [, params] = useRoute("/doctor-portal/patient/:patientCode");
  const [, navigate] = useLocation();
  const patientCode = params?.patientCode ?? "";

  const { data, isLoading, error, refetch } = trpc.doctorPortal.getPatientImages.useQuery(
    { patientCode },
    { enabled: Boolean(patientCode) },
  );

  return (
    <DoctorLayout>
      <div className="rounded-[2rem] border border-[#dbe7f4] bg-white p-4 shadow-[0_12px_36px_rgba(28,64,104,0.06)] sm:p-5">
        <div className="mb-4 flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-muted-foreground"
            onClick={() => navigate("/doctor-portal/dashboard")}
          >
            <ArrowRight className="size-4" />
            رجوع
          </Button>
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-lg font-semibold text-foreground">
              {data?.patientName ?? "صور المريض"}
            </h2>
            <p className="text-xs text-muted-foreground font-mono">{patientCode}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => void refetch()} className="text-muted-foreground">
            <RefreshCw className="size-4" />
          </Button>
        </div>

        {isLoading && (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className="h-16 animate-pulse rounded-xl bg-[#eef4fa]" />
            ))}
          </div>
        )}

        {error && (
          <div className="flex flex-col items-center gap-3 rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-8 text-center">
            <ShieldAlert className="size-8 text-destructive/60" />
            <p className="text-sm font-medium text-destructive">{error.message}</p>
            <Button size="sm" variant="outline" onClick={() => void refetch()}>إعادة المحاولة</Button>
          </div>
        )}

        {data && data.images.length === 0 && (
          <div className="rounded-xl border border-dashed border-[#d7e2ee] bg-[#f7fbfe] px-4 py-10 text-center">
            <FileImage className="mx-auto mb-2 size-8 text-muted-foreground/40" />
            <p className="text-sm font-medium text-muted-foreground">لا توجد صور متاحة</p>
            <p className="text-xs text-muted-foreground">لا توجد ملفات مرفوعة لهذا المريض.</p>
          </div>
        )}

        {data && data.images.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground mb-3">
              {data.images.length} ملف
            </p>
            {data.images.map((img) => {
              const Icon = mimeIcon(img.mimeType);
              return (
                <div
                  key={img.id}
                  className="flex flex-col gap-3 rounded-xl border border-[#e1ebf6] bg-[#fbfdff] p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Icon className="size-5" />
                    </div>
                    <div className="min-w-0 space-y-1">
                      <p className="truncate text-sm font-semibold text-foreground">
                        {img.fileName || `Image #${img.id}`}
                      </p>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span className="rounded-full bg-muted px-2 py-0.5">{img.mimeType}</span>
                        <span>{formatDate(img.createdAt)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button asChild variant="outline" size="sm" className="gap-2">
                      <a href={img.viewUrl} target="_blank" rel="noopener noreferrer">
                        <Eye className="size-4" />
                        <span className="hidden sm:inline">عرض</span>
                      </a>
                    </Button>
                    <Button asChild variant="secondary" size="sm" className="gap-2">
                      <a href={`${img.viewUrl}?download=1`} download>
                        <Download className="size-4" />
                        <span className="hidden sm:inline">تنزيل</span>
                      </a>
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </DoctorLayout>
  );
}
