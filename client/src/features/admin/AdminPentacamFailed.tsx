import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { getTrpcErrorMessage } from "@/lib/utils";
import { getApiUrl } from "@/const";
import { Eye, RefreshCw, ScanLine } from "lucide-react";
import { toast } from "sonner";
import AdminPentacamDuplicates from "./AdminPentacamDuplicates";
import AuthenticatedImage from "@/components/AuthenticatedImage";

type FailedPentacamSuggestion = {
  patientId: number;
  patientCode: string;
  fullName: string;
  matchedBy: string;
  score: number;
};

type FailedPentacamRow = {
  fileName: string;
  groupKey: string;
  groupLabel: string;
  pageType: string;
  size: number;
  modifiedAt: string;
  previewUrl: string;
  detectedId: string;
  score: number;
  status: string;
  topPasses: Array<{
    pass?: string;
    text?: string;
    candidates?: string[];
  }>;
  suggestions: FailedPentacamSuggestion[];
};

type FailedPentacamGroup = {
  key: string;
  label: string;
  rows: FailedPentacamRow[];
  suggestions: FailedPentacamSuggestion[];
  suggestedId: string;
  latestModifiedAt: string;
};

type RenamePreviewEntry = {
  fileName: string;
  proposedFileName: string;
  willDuplicate: boolean;
};

function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 KB";
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(0)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

function buildTraceText(row: FailedPentacamRow): string {
  return row.topPasses
    .map((pass) => {
      const candidates =
        Array.isArray(pass.candidates) && pass.candidates.length > 0
          ? ` candidates=${pass.candidates.join(", ")}`
          : "";
      return `${pass.pass ?? "pass"}: ${String(pass.text ?? "").trim() || "(empty)"}${candidates}`;
    })
    .join("\n\n");
}

function resolvePreviewUrl(raw: string): string {
  const value = String(raw ?? "").trim();
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) return value;
  return getApiUrl(value.startsWith("/") ? value : `/${value}`);
}

export default function AdminPentacamFailed({
  hideDuplicates = false,
}: {
  hideDuplicates?: boolean;
} = {}) {
  const [search, setSearch] = useState("");
  const [manualIds, setManualIds] = useState<Record<string, string>>({});
  const [renamePreview, setRenamePreview] = useState<
    Record<string, RenamePreviewEntry[]>
  >({});

  const filesQuery = trpc.medical.listFailedPentacamFiles.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });

  const reviewMutation = trpc.medical.reviewFailedPentacamFile.useMutation({
    onSuccess: async (result) => {
      toast.success(`تمت إعادة تسمية الملف إلى ${result.finalFileName}`);
      setManualIds((prev) => {
        const next = { ...prev };
        delete next[result.fileName];
        return next;
      });
      await filesQuery.refetch();
    },
    onError: (error) =>
      toast.error(getTrpcErrorMessage(error, "تعذرت إعادة تسمية الملف")),
  });

  const reviewGroupMutation =
    trpc.medical.reviewFailedPentacamGroup.useMutation({
      onSuccess: async (result) => {
        toast.success(`تم تحديث ${result.count} ملفات بالرمز ${result.idCode}`);
        await filesQuery.refetch();
      },
      onError: (error) =>
        toast.error(getTrpcErrorMessage(error, "تعذرت إعادة تسمية المجموعة")),
    });

  const releaseMutation = trpc.medical.releaseFailedPentacamFile.useMutation({
    onSuccess: async (result) => {
      toast.success(`تم نقل الملف كما هو باسم ${result.finalFileName}`);
      setManualIds((prev) => {
        const next = { ...prev };
        delete next[result.fileName];
        return next;
      });
      await filesQuery.refetch();
    },
    onError: (error) =>
      toast.error(getTrpcErrorMessage(error, "تعذر نقل الملف")),
  });

  const previewMutation = trpc.medical.previewFailedPentacamRename.useMutation({
    onError: (error) =>
      toast.error(getTrpcErrorMessage(error, "تعذر معاينة إعادة التسمية")),
  });

  const retryOcrMutation = trpc.medical.retryFailedPentacamOcr.useMutation({
    onSuccess: async (result) => {
      setManualIds((prev) => ({
        ...prev,
        [result.fileName]: result.detectedId || prev[result.fileName] || "",
      }));
      toast.success(
        result.detectedId
          ? `OCR detected ${result.detectedId}`
          : "اكتملت إعادة قراءة OCR دون العثور على رمز",
      );
      await filesQuery.refetch();
    },
    onError: (error) =>
      toast.error(getTrpcErrorMessage(error, "تعذرت إعادة قراءة OCR")),
  });

  const rows: FailedPentacamRow[] = filesQuery.data ?? [];
  const groups = useMemo(() => {
    const grouped = new Map<string, FailedPentacamGroup>();
    for (const row of rows) {
      const existing = grouped.get(row.groupKey);
      if (!existing) {
        grouped.set(row.groupKey, {
          key: row.groupKey,
          label: row.groupLabel || row.fileName,
          rows: [row],
          suggestions: row.suggestions ?? [],
          suggestedId:
            row.detectedId || row.suggestions?.[0]?.patientCode || "",
          latestModifiedAt: row.modifiedAt,
        });
        continue;
      }
      existing.rows.push(row);
      if (Date.parse(row.modifiedAt) > Date.parse(existing.latestModifiedAt)) {
        existing.latestModifiedAt = row.modifiedAt;
      }
      if (
        (!existing.suggestedId || existing.suggestedId.length < 4) &&
        row.detectedId
      ) {
        existing.suggestedId = row.detectedId;
      }
      const merged = [...existing.suggestions];
      for (const suggestion of row.suggestions ?? []) {
        if (!merged.some((item) => item.patientId === suggestion.patientId)) {
          merged.push(suggestion);
        }
      }
      merged.sort((a, b) => b.score - a.score);
      existing.suggestions = merged.slice(0, 3);
    }

    return Array.from(grouped.values())
      .map((group) => ({
        ...group,
        rows: group.rows.sort((a, b) => a.fileName.localeCompare(b.fileName)),
      }))
      .sort(
        (a, b) =>
          Date.parse(b.latestModifiedAt) - Date.parse(a.latestModifiedAt),
      );
  }, [rows]);

  const groupConfidence = (group: FailedPentacamGroup) => {
    const counts = new Map<string, number>();
    for (const row of group.rows) {
      if (!row.detectedId) continue;
      counts.set(row.detectedId, (counts.get(row.detectedId) ?? 0) + 1);
    }
    const top = Array.from(counts.entries()).sort((a, b) => b[1] - a[1])[0];
    if (!top)
      return { label: "لا يوجد توافق في قراءة OCR", tone: "muted" as const };
    if (top[1] === group.rows.length)
      return { label: `تطابق كامل ${top[0]}`, tone: "good" as const };
    if (top[1] >= Math.max(2, Math.ceil(group.rows.length / 2)))
      return {
        label: `أغلبية ${top[0]} (${top[1]}/${group.rows.length})`,
        tone: "warn" as const,
      };
    return {
      label: `تطابق OCR ضعيف ${top[0]} (${top[1]}/${group.rows.length})`,
      tone: "muted" as const,
    };
  };

  const badgeClass = (tone: "good" | "warn" | "muted") =>
    tone === "good"
      ? "border-secondary/40 bg-secondary text-secondary-foreground"
      : tone === "warn"
        ? "border-warning bg-warning/10 text-warning-text"
        : "border-border bg-muted text-muted-foreground";

  const loadPreview = async (
    key: string,
    fileNames: string[],
    idCode: string,
  ) => {
    const result = await previewMutation.mutateAsync({ fileNames, idCode });
    setRenamePreview((prev) => ({
      ...prev,
      [key]: result.files,
    }));
  };

  const filteredGroups = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return groups;
    return groups.filter((group) => {
      if (group.label.toLowerCase().includes(needle)) return true;
      if (
        group.suggestions.some(
          (item) =>
            item.patientCode.includes(needle) ||
            item.fullName.toLowerCase().includes(needle),
        )
      )
        return true;
      return group.rows.some(
        (row) =>
          row.fileName.toLowerCase().includes(needle) ||
          row.detectedId.includes(needle),
      );
    });
  }, [groups, search]);

  const getManualValue = (key: string, fallback: string) =>
    manualIds[key] ?? fallback;

  return (
    <div className="space-y-4" dir="rtl">
      <Card className="rounded-lg border-border/80 bg-background shadow-none">
        <CardHeader>
          <CardTitle>مراجعة ملفات البنتاكام غير المرتبطة</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="text-sm text-muted-foreground">
              جُمعت الملفات حسب الاسم المتوقع للمريض. راجع الرمز للمجموعة أو صحح
              كل ملف على حدة.
            </div>
            <Button
              variant="outline"
              onClick={() => filesQuery.refetch()}
              disabled={filesQuery.isFetching}
              className="gap-2 border-border bg-background"
            >
              <RefreshCw
                className={`h-4 w-4 ${filesQuery.isFetching ? "animate-spin" : ""}`}
              />
              تحديث
            </Button>
          </div>
          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px]">
            <Input aria-label="بحث بالاسم أو الملف أو كود المريض"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="بحث بالاسم أو الملف أو كود المريض"
            />
            <div className="rounded-md border px-3 py-2 text-sm text-muted-foreground">
              {filesQuery.isLoading
                ? "جارٍ تحميل الملفات…"
                : `${filteredGroups.length} مجموعات / ${rows.length} ملفات`}
            </div>
          </div>
        </CardContent>
      </Card>

      {filesQuery.isError ? (
        <Card className="border-destructive/30 bg-destructive/10">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 py-6 text-sm text-destructive">
            <span>
              {getTrpcErrorMessage(
                filesQuery.error,
                "تعذر تحميل ملفات البنتاكام غير المرتبطة",
              )}
            </span>
            <Button
              type="button"
              variant="outline"
              onClick={() => filesQuery.refetch()}
              disabled={filesQuery.isFetching}
            >
              إعادة المحاولة
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <div className="space-y-6">
        {filteredGroups.map((group) => {
          const groupValue = getManualValue(group.key, group.suggestedId);
          const confidence = groupConfidence(group);
          const groupPreview = renamePreview[group.key] ?? [];
          return (
            <Card
              key={group.key}
              className="overflow-hidden rounded-lg border-border/80 bg-background shadow-none"
            >
              <CardHeader className="space-y-2">
                <CardTitle className="text-lg">
                  {group.label || group.key}
                </CardTitle>
                <div className="flex flex-wrap gap-2 text-xs">
                  <span className="text-muted-foreground">
                    {group.rows.length} ملفات | آخر تعديل{" "}
                    {new Date(group.latestModifiedAt).toLocaleString("ar-EG")}
                  </span>
                  <span
                    className={`rounded-full border px-2 py-0.5 ${badgeClass(confidence.tone)}`}
                  >
                    {confidence.label}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_320px]">
                  <div className="space-y-3">
                    <div className="grid gap-3 md:grid-cols-[160px_minmax(0,1fr)_auto]">
                      <div className="rounded-xl border border-border bg-muted/70 px-3 py-2 text-sm">
                        الرمز المقترح:{" "}
                        <span className="font-semibold">
                          {group.suggestedId || "-"}
                        </span>
                      </div>
                      <Input
                        value={groupValue}
                        onChange={(e) =>
                          setManualIds((prev) => ({
                            ...prev,
                            [group.key]: e.target.value,
                          }))
                        }
                        aria-label={`الرمز الصحيح للمجموعة ${group.label}`}
                        placeholder="أدخل رمزًا واحدًا للمجموعة كاملة"
                      />
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() =>
                            loadPreview(
                              group.key,
                              group.rows.map((row) => row.fileName),
                              groupValue,
                            )
                          }
                          disabled={
                            !groupValue.trim() || previewMutation.isPending
                          }
                          className="gap-2 border-border bg-background"
                        >
                          <ScanLine className="h-4 w-4" />
                          معاينة إعادة التسمية
                        </Button>
                        <Button
                          onClick={() =>
                            reviewGroupMutation.mutate({
                              fileNames: group.rows.map((row) => row.fileName),
                              idCode: groupValue,
                            })
                          }
                          disabled={
                            !groupValue.trim() ||
                            reviewMutation.isPending ||
                            reviewGroupMutation.isPending ||
                            releaseMutation.isPending
                          }
                        >
                          تطبيق على المجموعة
                        </Button>
                      </div>
                    </div>

                    {group.suggestions.length > 0 ? (
                      <div className="rounded-2xl border border-border bg-muted/70 p-3">
                        <div className="mb-2 text-sm font-medium">
                          اقتراحات المرضى
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {group.suggestions.map((suggestion) => (
                            <Button
                              key={suggestion.patientId}
                              type="button"
                              variant="outline"
                              className="h-auto whitespace-normal px-3 py-2 text-end"
                              onClick={() =>
                                setManualIds((prev) => ({
                                  ...prev,
                                  [group.key]: suggestion.patientCode,
                                }))
                              }
                            >
                              {suggestion.patientCode} | {suggestion.fullName}
                            </Button>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    {groupPreview.length > 0 ? (
                      <div className="rounded-2xl border border-border bg-muted/70 p-3 text-sm">
                        <div className="mb-2 font-medium">
                          معاينة إعادة التسمية
                          {groupPreview.some((row) => row.willDuplicate) ? (
                            <span className="me-2 rounded-full border border-warning bg-warning/10 px-2 py-0.5 text-warning-text">
                              {
                                groupPreview.filter((row) => row.willDuplicate)
                                  .length
                              }{" "}
                              ملفات مكررة
                            </span>
                          ) : null}
                        </div>
                        <div className="space-y-1">
                          {groupPreview.map((item) => (
                            <div
                              key={`${group.key}-${item.fileName}`}
                              className="break-all"
                            >
                              {item.willDuplicate ? "مكرر" : "جديد"} |{" "}
                              {item.proposedFileName}
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>

                  <div className="rounded-2xl border border-dashed border-border bg-muted/60 p-3 text-sm text-muted-foreground">
                    تطبيق رمز المجموعة يحدّث كل ملفاتها ويحافظ على بقية اسم كل
                    ملف.
                  </div>
                </div>

                <div className="grid gap-4 xl:grid-cols-2">
                  {group.rows.map((row) => {
                    const value = getManualValue(
                      row.fileName,
                      row.detectedId || groupValue,
                    );
                    const previewUrl = resolvePreviewUrl(row.previewUrl);
                    return (
                      <Card
                        key={row.fileName}
                        className="overflow-hidden border-dashed border-border bg-muted/30 shadow-none"
                      >
                        <CardHeader className="space-y-2">
                          <CardTitle className="break-all text-base">
                            {row.fileName}
                          </CardTitle>
                          <div className="flex flex-wrap gap-2 text-xs">
                            <span className="text-muted-foreground">
                              الدرجة {row.score} | {formatFileSize(row.size)} |{" "}
                              {new Date(row.modifiedAt).toLocaleString("ar-EG")}
                            </span>
                            <span className="rounded-full border border-border bg-muted text-muted-foreground">
                              {row.pageType}
                            </span>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="overflow-hidden rounded-xl border border-border bg-muted/20">
                            <AuthenticatedImage
                              src={previewUrl}
                              alt={row.fileName}
                              className="h-[280px] w-full object-contain bg-background"
                              loading="lazy"
                            />
                          </div>

                          <div className="grid gap-3 md:grid-cols-[140px_minmax(0,1fr)]">
                            <div className="rounded-xl border border-border bg-background px-3 py-2 text-sm">
                              رمز OCR:{" "}
                              <span className="font-semibold">
                                {row.detectedId || "-"}
                              </span>
                            </div>
                            <Input
                              value={value}
                              onChange={(e) =>
                                setManualIds((prev) => ({
                                  ...prev,
                                  [row.fileName]: e.target.value,
                                }))
                              }
                              aria-label={`الرمز الصحيح للملف ${row.fileName}`}
                              placeholder="أدخل الرمز الصحيح"
                            />
                          </div>

                          {row.suggestions.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                              {row.suggestions.map((suggestion) => (
                                <Button
                                  key={`${row.fileName}-${suggestion.patientId}`}
                                  type="button"
                                  variant="ghost"
                                  className="h-auto px-2 py-1 text-xs"
                                  onClick={() =>
                                    setManualIds((prev) => ({
                                      ...prev,
                                      [row.fileName]: suggestion.patientCode,
                                    }))
                                  }
                                >
                                  {suggestion.patientCode} |{" "}
                                  {suggestion.fullName}
                                </Button>
                              ))}
                            </div>
                          ) : null}

                          <Textarea
                            value={buildTraceText(row)}
                            readOnly
                            aria-label={`تفاصيل محاولات قراءة OCR للملف ${row.fileName}`}
                            className="min-h-[160px] border-border bg-background font-mono text-xs"
                          />

                          <div className="flex flex-wrap gap-2">
                            <Button
                              onClick={() =>
                                reviewMutation.mutate({
                                  fileName: row.fileName,
                                  idCode: value,
                                })
                              }
                              disabled={
                                !value.trim() ||
                                reviewMutation.isPending ||
                                reviewGroupMutation.isPending ||
                                releaseMutation.isPending
                              }
                            >
                              إعادة تسمية ملف واحد
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() =>
                                loadPreview(row.fileName, [row.fileName], value)
                              }
                              disabled={
                                !value.trim() || previewMutation.isPending
                              }
                              className="gap-2 border-border bg-background"
                            >
                              <ScanLine className="h-4 w-4" />
                              معاينة
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() =>
                                retryOcrMutation.mutate({
                                  fileName: row.fileName,
                                })
                              }
                              disabled={
                                retryOcrMutation.isPending ||
                                reviewMutation.isPending ||
                                reviewGroupMutation.isPending
                              }
                            >
                              إعادة قراءة OCR
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() =>
                                releaseMutation.mutate({
                                  fileName: row.fileName,
                                })
                              }
                              disabled={
                                reviewMutation.isPending ||
                                reviewGroupMutation.isPending ||
                                releaseMutation.isPending
                              }
                            >
                              نقل كما هو
                            </Button>
                            {previewUrl ? (
                              <Button asChild variant="ghost" className="gap-2">
                                <a
                                  href={previewUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                >
                                  <Eye className="h-4 w-4" />
                                  فتح الصورة
                                </a>
                              </Button>
                            ) : null}
                          </div>
                          {(renamePreview[row.fileName] ?? []).length > 0 ? (
                            <div className="rounded-xl border border-border bg-background p-3 text-sm">
                              {(renamePreview[row.fileName] ?? []).map(
                                (item) => (
                                  <div
                                    key={`${row.fileName}-${item.proposedFileName}`}
                                    className="break-all"
                                  >
                                    {item.willDuplicate ? "مكرر" : "جديد"} |{" "}
                                    {item.proposedFileName}
                                  </div>
                                ),
                              )}
                            </div>
                          ) : null}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {!filesQuery.isLoading &&
      !filesQuery.isError &&
      filteredGroups.length === 0 ? (
        <Card className="border-border bg-muted/70">
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            لا توجد ملفات بنتاكام غير مرتبطة.
          </CardContent>
        </Card>
      ) : null}

      {!hideDuplicates ? (
        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">
              المكررات في قاعدة البيانات
            </CardTitle>
          </CardHeader>
          <CardContent>
            <AdminPentacamDuplicates />
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
