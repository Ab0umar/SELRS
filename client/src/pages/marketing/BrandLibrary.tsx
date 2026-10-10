import { useEffect, useRef, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  BookImage,
  CheckCircle2,
  Clock,
  AlertCircle,
  Loader2,
  Palette,
  RefreshCw,
  RotateCcw,
  Sparkles,
  Trash2,
  Upload,
} from "lucide-react";

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
type AcceptedMimeType = (typeof ACCEPTED_TYPES)[number];
type PageRole = "center" | "doctor";

type ReferenceDesign = {
  id: number;
  fileUrl: string;
  originalName: string;
  analysisStatus?: string | null;
  analysisError?: string | null;
};

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () =>
      resolve((reader.result as string).split(",")[1] ?? "");
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function BrandLibrary() {
  const [pageRole, setPageRole] = useState<PageRole>("center");
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [rebuilding, setRebuilding] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const utils = trpc.useUtils();

  const designsQuery = trpc.marketing.listReferenceDesigns.useQuery({
    pageRole,
  });
  const profileQuery = trpc.marketing.getBrandProfile.useQuery(
    { pageRole },
    { refetchInterval: rebuilding ? 5000 : false },
  );

  useEffect(() => {
    const status = profileQuery.data?.rebuildStatus;
    if (status === "running") setRebuilding(true);
    if (rebuilding && status === "completed") {
      setRebuilding(false);
      toast.success("تم إعادة بناء ملف العلامة التجارية");
      void utils.marketing.listReferenceDesigns.invalidate({ pageRole });
    }
    if (rebuilding && status === "failed") {
      setRebuilding(false);
      toast.error(
        profileQuery.data?.rebuildError ?? "فشل بناء ملف العلامة التجارية",
      );
    }
  }, [
    profileQuery.data?.rebuildError,
    profileQuery.data?.rebuildStatus,
    rebuilding,
    pageRole,
    utils,
  ]);

  const uploadMutation = trpc.marketing.uploadReferenceDesign.useMutation({
    onSuccess: () => {
      void utils.marketing.listReferenceDesigns.invalidate({ pageRole });
    },
    onError: (err: { message: string }) => toast.error(err.message),
  });

  const deleteMutation = trpc.marketing.deleteReferenceDesign.useMutation({
    onSuccess: () => {
      toast.success("تم حذف التصميم");
      void utils.marketing.listReferenceDesigns.invalidate({ pageRole });
    },
    onError: (err: { message: string }) => toast.error(err.message),
  });

  const retryMutation = trpc.marketing.retryReferenceDesignAnalysis.useMutation(
    {
      onSuccess: () => {
        toast.info("جارٍ إعادة تحليل التصميم");
        void utils.marketing.listReferenceDesigns.invalidate({ pageRole });
      },
      onError: (err: { message: string }) => toast.error(err.message),
    },
  );

  const rebuildMutation = trpc.marketing.rebuildBrandProfile.useMutation({
    onSuccess: (result) => {
      setRebuilding(result.started || result.alreadyRunning);
      void utils.marketing.getBrandProfile.invalidate({ pageRole });
      toast.info(
        result.started
          ? "جارٍ بناء ملف العلامة التجارية — قد يستغرق بضع دقائق"
          : "إعادة بناء الملف تعمل بالفعل",
      );
    },
    onError: (err: { message: string }) => toast.error(err.message),
  });

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    let uploaded = 0;
    for (const file of Array.from(files)) {
      if (!ACCEPTED_TYPES.includes(file.type as AcceptedMimeType)) {
        toast.error(`نوع الملف غير مدعوم: ${file.name}`);
        continue;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`الملف كبير جداً (الحد الأقصى 10 ميجابايت): ${file.name}`);
        continue;
      }
      try {
        const base64Data = await fileToBase64(file);
        await uploadMutation.mutateAsync({
          filename: file.name,
          mimeType: file.type as AcceptedMimeType,
          base64Data,
          pageRole,
          fileSize: file.size,
        });
        uploaded++;
      } catch {
        toast.error(`فشل رفع: ${file.name}`);
      }
    }
    setUploading(false);
    if (uploaded > 0) {
      toast.success(
        `تم رفع ${uploaded} تصميم${uploaded > 1 ? "اً" : ""} — جارٍ التحليل في الخلفية`,
      );
    }
  }

  const designs = (designsQuery.data ?? []) as ReferenceDesign[];
  const profile = profileQuery.data;
  const profileStatus = profile?.rebuildStatus ?? "idle";
  const hasBuiltProfile = Boolean(profile?.builtAt);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            مكتبة العلامة التجارية
          </h1>
          <p className="text-sm text-muted-foreground">
            ارفع تصاميمك المرجعية حتى تتعلم الأداة أسلوب علامتك التجارية
          </p>
          <div className="mt-3 inline-flex rounded-lg border border-border bg-muted/20 p-1">
            {(
              [
                ["center", "هوية المركز"],
                ["doctor", "هوية الدكتور"],
              ] as const
            ).map(([role, label]) => (
              <Button variant="bare"
                key={role}
                type="button"
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${pageRole === role ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
                onClick={() => setPageRole(role)}
                aria-pressed={pageRole === role}
              >
                {label}
              </Button>
            ))}
          </div>
        </div>
        <Button
          size="sm"
          variant="ghost"
          aria-label="تحديث"
          onClick={() => {
            void utils.marketing.listReferenceDesigns.invalidate({ pageRole });
            void utils.marketing.getBrandProfile.invalidate({ pageRole });
          }}
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {/* Upload zone */}
      <div
        role="button"
        tabIndex={0}
        aria-label="رفع تصاميم مرجعية — اسحب أو انقر للاختيار"
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          void handleFiles(e.dataTransfer.files);
        }}
        onClick={() => fileInputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            fileInputRef.current?.click();
          }
        }}
        className={`relative flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 text-center transition-colors ${
          dragOver
            ? "border-primary bg-primary/10"
            : "border-border bg-muted/20 hover:border-primary/50 hover:bg-muted/40"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          className="hidden"
          onChange={(e) => void handleFiles(e.target.files)}
        />
        {uploading ? (
          <>
            <Loader2 className="mb-3 h-8 w-8 animate-spin text-primary" />
            <p className="text-sm font-medium text-foreground">جارٍ الرفع…</p>
          </>
        ) : (
          <>
            <Upload className="mb-3 h-8 w-8 text-muted-foreground/50" />
            <p className="text-sm font-medium text-foreground">
              اسحب التصاميم هنا أو انقر للاختيار
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              JPEG, PNG, WEBP — حتى 10 ميجابايت لكل صورة
            </p>
          </>
        )}
      </div>

      {/* Brand profile card */}
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <Palette className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">
              ملف العلامة التجارية
            </h2>
            {profileStatus === "running" ? (
              <Badge className="bg-primary/15 text-primary text-xs">
                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                جارٍ البناء
              </Badge>
            ) : profileStatus === "failed" ? (
              <Badge className="bg-destructive/15 text-destructive text-xs">
                <AlertCircle className="mr-1 h-3 w-3" />
                فشل البناء
              </Badge>
            ) : hasBuiltProfile ? (
              <Badge className="bg-success/15 text-success text-xs">
                <CheckCircle2 className="mr-1 h-3 w-3" />
                مُنشأ من {profile.designCount} تصميم
              </Badge>
            ) : (
              <Badge className="bg-muted text-muted-foreground text-xs">
                لم يُنشأ بعد
              </Badge>
            )}
          </div>
          <Button
            size="sm"
            variant="default"
            onClick={() => rebuildMutation.mutate({ pageRole })}
            disabled={
              rebuildMutation.isPending || rebuilding || designs.length === 0
            }
          >
            {rebuildMutation.isPending || rebuilding ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="mr-1.5 h-4 w-4" />
            )}
            {rebuilding
              ? "جارٍ البناء…"
              : hasBuiltProfile
                ? "إعادة بناء الملف"
                : "بناء الملف"}
          </Button>
        </div>

        {profileQuery.isLoading ? (
          <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            جارٍ التحميل…
          </div>
        ) : (
          <>
            {profileStatus === "running" && (
              <div
                className="mb-3 flex items-center gap-2 rounded-lg border border-primary/25 bg-primary/5 px-3 py-2 text-sm text-foreground"
                role="status"
                aria-live="polite"
              >
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                يتم تحليل التصاميم وبناء الملف في الخلفية…
              </div>
            )}
            {profileStatus === "failed" && (
              <div
                className="mb-3 flex items-start gap-2 rounded-lg border border-destructive/25 bg-destructive/5 px-3 py-2 text-sm text-foreground"
                role="alert"
              >
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                <span>
                  {profile.rebuildError ?? "تعذر بناء ملف العلامة التجارية"} —
                  يمكنك إعادة المحاولة.
                </span>
              </div>
            )}
            {hasBuiltProfile ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <ProfileField
                  label="الألوان الأساسية"
                  value={profile.dominantColors}
                />
                <ProfileField
                  label="لوحة الألوان"
                  value={profile.colorPalette}
                />
                <ProfileField
                  label="أسلوب التخطيط"
                  value={profile.layoutStyle}
                />
                <ProfileField
                  label="تكوين الصورة"
                  value={profile.imageComposition}
                />
                <ProfileField
                  label="أسلوب العلامة التجارية"
                  value={profile.brandingStyle}
                />
                <ProfileField
                  label="الأسلوب الطبي البصري"
                  value={profile.medicalVisualStyle}
                />
                <ProfileField label="موضع CTA" value={profile.ctaPositioning} />
                <ProfileField
                  label="موضع الشعار"
                  value={profile.logoPlacementStyle}
                />
                <ProfileField
                  label="أسلوب الخطوط"
                  value={profile.typographyStyle}
                />
                {profile.overallAesthetic && (
                  <div className="sm:col-span-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2">
                    <p className="text-xs font-semibold text-primary mb-1">
                      الهوية البصرية الكاملة
                    </p>
                    <p className="text-sm text-foreground leading-relaxed">
                      {profile.overallAesthetic}
                    </p>
                  </div>
                )}
              </div>
            ) : profileStatus !== "running" ? (
              <div className="flex items-center gap-2 rounded-lg border border-dashed border-border bg-muted/20 px-4 py-6 text-center flex-col">
                <BookImage className="h-6 w-6 text-muted-foreground/40 mx-auto" />
                <p className="text-sm text-muted-foreground">
                  ارفع تصاميم مرجعية ثم اضغط "بناء الملف" لاستخراج هوية علامتك
                  التجارية
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  بعد البناء، سيتم توليد صور مستقبلية تتوافق مع أسلوب مركزك
                </p>
              </div>
            ) : null}
          </>
        )}
      </div>

      {/* Reference designs grid */}
      <div aria-live="polite" aria-busy={designsQuery.isLoading}>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">
            التصاميم المرجعية ({designs.length})
          </h2>
        </div>

        {designsQuery.isLoading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : designs.length === 0 ? (
          <div className="rounded-xl border border-border bg-card py-10 text-center">
            <BookImage className="mx-auto mb-3 h-8 w-8 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">
              لا توجد تصاميم مرجعية بعد
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {designs.map((design) => {
              const analysisStatus = design.analysisStatus ?? "pending";
              const analyzed = analysisStatus === "analyzed";
              return (
                <div
                  key={design.id}
                  className="group relative rounded-xl border border-border bg-card overflow-hidden"
                >
                  {/* Image */}
                  <div className="relative h-36 bg-muted">
                    <img
                      src={design.fileUrl}
                      alt={design.originalName}
                      className="h-full w-full object-cover"
                      loading="lazy"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).style.display =
                          "none";
                      }}
                    />
                    {/* Overlay on hover */}
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                      <Button
                        size="sm"
                        variant="destructive"
                        className="h-7 gap-1 text-xs"
                        onClick={() => deleteMutation.mutate({ id: design.id })}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="h-3 w-3" />
                        حذف
                      </Button>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="px-2 py-2">
                    <p className="truncate text-xs font-medium text-foreground">
                      {design.originalName}
                    </p>
                    <div className="mt-1 flex items-center gap-1">
                      {analyzed ? (
                        <Badge className="bg-success/15 text-success text-[10px] px-1.5 py-0">
                          <CheckCircle2 className="mr-0.5 h-2.5 w-2.5" />
                          محلَّل
                        </Badge>
                      ) : analysisStatus === "analyzing" ? (
                        <Badge className="bg-primary/15 text-primary text-[10px] px-1.5 py-0">
                          <Loader2 className="mr-0.5 h-2.5 w-2.5 animate-spin" />
                          جارٍ التحليل
                        </Badge>
                      ) : analysisStatus === "failed" ? (
                        <Badge className="bg-destructive/15 text-destructive text-[10px] px-1.5 py-0">
                          <AlertCircle className="mr-0.5 h-2.5 w-2.5" />
                          فشل التحليل
                        </Badge>
                      ) : (
                        <Badge className="bg-muted text-muted-foreground text-[10px] px-1.5 py-0">
                          <Clock className="mr-0.5 h-2.5 w-2.5" />
                          في الانتظار
                        </Badge>
                      )}
                    </div>
                    {analysisStatus === "failed" && (
                      <div className="mt-1 flex items-start justify-between gap-1">
                        <p
                          className="line-clamp-2 text-[10px] text-destructive"
                          role="alert"
                        >
                          {design.analysisError ?? "تعذر تحليل التصميم"}
                        </p>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="h-6 shrink-0 px-1.5 text-[10px]"
                          onClick={() =>
                            retryMutation.mutate({ id: design.id })
                          }
                          disabled={retryMutation.isPending}
                        >
                          <RotateCcw className="mr-1 h-3 w-3" />
                          إعادة التحليل
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function ProfileField({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  if (!value) return null;
  return (
    <div className="rounded-lg border border-border bg-background px-3 py-2">
      <p className="text-xs font-semibold text-muted-foreground mb-0.5">
        {label}
      </p>
      <p className="text-sm text-foreground leading-snug">{value}</p>
    </div>
  );
}
