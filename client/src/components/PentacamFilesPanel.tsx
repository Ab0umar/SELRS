import { useEffect, useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, ExternalLink, Eye, RefreshCw, ChevronLeft, ChevronRight } from "lucide-react";
import AuthenticatedImage from "@/components/AuthenticatedImage";
import PentacamThumbnail from "@/components/PentacamThumbnail";
import { getApiUrl } from "@/const";

type PentacamFilesPanelProps = {
  patientId?: number | null;
  compact?: boolean;
  active?: boolean;
};

function formatDate(value: unknown) {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  const dt = new Date(raw);
  if (Number.isNaN(dt.valueOf())) return raw;
  return dt.toLocaleString();
}

function normalizeUrl(raw: unknown) {
  const value = String(raw ?? "").trim();
  if (!value) return "";
  if (value.startsWith("http://") || value.startsWith("https://")) return value;
  if (value.startsWith("/")) return getApiUrl(value);
  return getApiUrl(`/${value}`);
}

export default function PentacamFilesPanel({ patientId, compact = false, active = true }: PentacamFilesPanelProps) {
  const targetPatientId = Number(patientId ?? 0);
  const [previewIndex, setPreviewIndex] = useState(0);
  const filesQuery = trpc.medical.getPentacamFilesByPatient.useQuery(
    { patientId: targetPatientId, limit: compact ? 20 : 100 },
    {
      enabled: active && targetPatientId > 0,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      staleTime: 30_000,
    },
  );

  const files = useMemo(() => (Array.isArray(filesQuery.data) ? filesQuery.data : []), [filesQuery.data]);
  const imageFiles = useMemo(
    () =>
      files
        .map((row: any) => ({
          id: Number(row?.id ?? 0),
          fileName: String(row?.sourceFileName ?? "file"),
          url: normalizeUrl(row?.storageUrl),
          mimeType: String(row?.mimeType ?? ""),
          side: String(row?.eyeSide ?? ""),
          status: String(row?.importStatus ?? ""),
          importedAt: row?.importedAt,
          capturedAt: row?.capturedAt,
        }))
        .filter((row: any) => Boolean(row.url)),
    [files],
  );
  const activeImage = imageFiles[previewIndex] ?? null;

  useEffect(() => {
    setPreviewIndex((prev) => {
      if (imageFiles.length === 0) return 0;
      if (prev < 0) return 0;
      return Math.min(prev, imageFiles.length - 1);
    });
  }, [imageFiles.length]);

  if (!targetPatientId) {
    return (
      <Card className="border-border/80 bg-background/92 shadow-sm">
        <CardContent className="pt-6 text-sm text-muted-foreground">Select patient first.</CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden border-border/80 bg-background/95 shadow-sm">
      <CardHeader className="space-y-3 border-b border-border bg-muted/25 pb-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-base text-foreground">الملفات المرتبطة بالبنتاكام</CardTitle>
            <div className="mt-1 text-sm text-muted-foreground">
              {files.length > 0 ? `${files.length} linked file${files.length === 1 ? "" : "s"}` : "No linked Pentacam files yet"}
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button type="button" variant="outline" size="sm" onClick={() => filesQuery.refetch()} disabled={filesQuery.isFetching}>
              <RefreshCw className={`h-4 w-4 ${filesQuery.isFetching ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {imageFiles.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-muted px-5 py-10 text-center text-sm text-muted-foreground">
            No Pentacam images available for preview yet.
          </div>
        ) : (
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_18rem]">
            <div className="space-y-4">
              <div className="overflow-hidden rounded-[1.5rem] border border-border bg-foreground/95 shadow-[0_12px_32px_rgba(15,23,42,0.08)]">
                <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
                  <div className="min-w-0">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary-foreground/65">Preview</div>
                    <div className="mt-1 truncate text-sm font-semibold text-primary-foreground">
                      {activeImage?.fileName ?? "Pentacam image"}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      aria-label="الصورة السابقة"
                      onClick={() => setPreviewIndex((prev) => Math.max(0, prev - 1))}
                      disabled={previewIndex <= 0}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      aria-label="الصورة التالية"
                      onClick={() => setPreviewIndex((prev) => Math.min(imageFiles.length - 1, prev + 1))}
                      disabled={previewIndex >= imageFiles.length - 1}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {activeImage?.url ? (
                  <AuthenticatedImage
                    src={activeImage.url}
                    alt={activeImage.fileName}
                    className="h-[min(72vh,48rem)] w-full bg-foreground/95 object-contain"
                    loading="eager"
                  />
                ) : (
                  <div className="flex h-[min(72vh,48rem)] items-center justify-center bg-foreground/95 px-6 text-center text-sm text-muted-foreground">
                    Select an image to preview it here.
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 2xl:grid-cols-3">
                {imageFiles.map((row, index) => {
                  const isActive = previewIndex === index;
                  return (
                    <div
                      key={row.id}
                      className={`space-y-3 rounded-2xl border bg-background p-3 shadow-sm transition-all hover:-translate-y-0.5 ${
                        isActive ? "border-primary/30 ring-1 ring-primary/10" : "border-border"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <Badge variant={row.status === "imported" ? "default" : "secondary"}>{row.status || "unknown"}</Badge>
                      </div>

                      <button type="button" className="group block w-full text-left" onClick={() => setPreviewIndex(index)}>
                        <PentacamThumbnail
                          src={row.url}
                          alt={row.fileName}
                          className="h-36 w-full rounded-xl border border-border bg-muted/30 object-cover"
                          loading={index < (compact ? 6 : 12) ? "eager" : "lazy"}
                        />
                        <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-foreground/85 px-2.5 py-1 text-[11px] font-semibold text-primary-foreground opacity-90 transition-opacity group-hover:opacity-100">
                          <Eye className="h-3.5 w-3.5" />
                          معاينة
                        </div>
                      </button>

                      <div className="text-xs font-medium break-all text-foreground">{row.fileName}</div>
                      <div className="text-[11px] text-muted-foreground">{formatDate(row.capturedAt || row.importedAt)}</div>
                      <div className="flex flex-wrap gap-2">
                        <Button type="button" size="sm" variant="outline" asChild>
                          <a href={row.url} download={row.fileName}>
                            <Download className="h-4 w-4" />
                            Download
                          </a>
                        </Button>
                        <Button type="button" size="sm" variant="outline" asChild>
                          <a href={row.url} target="_blank" rel="noreferrer">
                            <ExternalLink className="h-4 w-4" />
                            Open in browser
                          </a>
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <aside className="space-y-4 self-start xl:sticky xl:top-4">
              <div className="rounded-[1.5rem] border border-border bg-background p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">Active image</div>
                    <div className="mt-1 text-sm font-semibold text-foreground">
                      {activeImage?.fileName ?? "No image selected"}
                    </div>
                  </div>
                  <span className="rounded-full border border-border bg-muted px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">
                    {activeImage ? `${previewIndex + 1}/${imageFiles.length}` : "0/0"}
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                  <div className="rounded-2xl border border-border bg-muted px-3 py-2">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">Side</div>
                    <div className="mt-1 font-medium text-foreground">{activeImage?.side || "—"}</div>
                  </div>
                  <div className="rounded-2xl border border-border bg-muted px-3 py-2">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">Status</div>
                    <div className="mt-1 font-medium text-foreground">{activeImage?.status || "—"}</div>
                  </div>
                  <div className="col-span-2 rounded-2xl border border-border bg-muted px-3 py-2">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">Captured</div>
                    <div className="mt-1 font-medium text-foreground">{formatDate(activeImage?.capturedAt || activeImage?.importedAt)}</div>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {activeImage?.url ? (
                    <>
                      <Button type="button" variant="outline" size="sm" asChild>
                        <a href={activeImage.url} download={activeImage.fileName}>
                          <Download className="h-4 w-4" />
                          Download
                        </a>
                      </Button>
                      <Button type="button" variant="outline" size="sm" asChild>
                        <a href={activeImage.url} target="_blank" rel="noreferrer">
                          <ExternalLink className="h-4 w-4" />
                          Open in browser
                        </a>
                      </Button>
                    </>
                  ) : null}
                </div>
              </div>

              <div className="rounded-[1.5rem] border border-border bg-muted/40 p-4 shadow-sm">
                <h3 className="text-sm font-semibold text-foreground">Preview mode</h3>
                <p className="mt-2 text-xs leading-5 text-muted-foreground">
                  This surface is read-only. Use the admin linking page to import, reassign, or unlink files.
                </p>
              </div>
            </aside>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
