import { useEffect, useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, ExternalLink, Eye, ImageIcon, RefreshCw, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { getTrpcErrorMessage } from "@/lib/utils";
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
  const utils = trpc.useUtils();
  const [selected, setSelected] = useState<Record<number, boolean>>({});
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
  const removeLinkMutation = trpc.medical.removePentacamLink.useMutation();

  const files = useMemo(() => (Array.isArray(filesQuery.data) ? filesQuery.data : []), [filesQuery.data]);
  const imageFiles = useMemo(
    () =>
      files
        .filter((row: any) => String(row?.mimeType ?? "").startsWith("image/"))
        .map((row: any) => ({
          id: Number(row?.id ?? 0),
          fileName: String(row?.sourceFileName ?? "file"),
          url: normalizeUrl(row?.storageUrl),
          side: String(row?.eyeSide ?? ""),
          status: String(row?.importStatus ?? ""),
          importedAt: row?.importedAt,
          capturedAt: row?.capturedAt,
        })),
    [files],
  );
  const activeImage = imageFiles[previewIndex] ?? null;
  const selectedIds = useMemo(
    () =>
      Object.entries(selected)
        .filter(([, checked]) => Boolean(checked))
        .map(([id]) => Number(id))
        .filter((id) => Number.isFinite(id) && id > 0),
    [selected],
  );

  useEffect(() => {
    const valid = new Set(
      files
        .map((row: any) => Number(row?.id ?? 0))
        .filter((id: number) => Number.isFinite(id) && id > 0),
    );
    setSelected((prev: Record<number, boolean>) => {
      const next: Record<number, boolean> = {};
      for (const [idRaw, checked] of Object.entries(prev)) {
        const id = Number(idRaw);
        if (valid.has(id)) next[id] = Boolean(checked);
      }
      return next;
    });
    setPreviewIndex((prev) => {
      if (imageFiles.length === 0) return 0;
      if (prev < 0) return 0;
      return Math.min(prev, imageFiles.length - 1);
    });
  }, [files, imageFiles.length]);

  async function removeSelected() {
    if (selectedIds.length === 0) return;
    try {
      for (const resultId of selectedIds) {
        await removeLinkMutation.mutateAsync({ resultId });
      }
      toast.success(`Removed ${selectedIds.length} link(s).`);
      setSelected({});
      await utils.medical.getPentacamFilesByPatient.invalidate({
        patientId: targetPatientId,
        limit: compact ? 20 : 100,
      });
    } catch (error: unknown) {
      toast.error(getTrpcErrorMessage(error, "Failed to remove selected links."));
    }
  }

  function openPreview(resultId: number) {
    const nextIndex = imageFiles.findIndex((item) => item.id === resultId);
    if (nextIndex >= 0) setPreviewIndex(nextIndex);
  }

  if (!targetPatientId) {
    return (
      <Card className="border-slate-200/80 bg-white/92 shadow-sm">
        <CardContent className="pt-6 text-sm text-muted-foreground">Select patient first.</CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden border-slate-200/80 bg-white/95 shadow-sm">
      <CardHeader className="space-y-3 border-b border-slate-100 bg-[linear-gradient(180deg,rgba(248,250,252,0.9),rgba(255,255,255,0.96))] pb-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-base text-slate-900">الملفات المرتبطة بالبنتاكام</CardTitle>
            <div className="mt-1 text-sm text-muted-foreground">
              {files.length > 0 ? `${files.length} linked file${files.length === 1 ? "" : "s"}` : "No linked Pentacam files yet"}
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button type="button" variant="outline" size="sm" onClick={() => filesQuery.refetch()} disabled={filesQuery.isFetching}>
              <RefreshCw className={`h-4 w-4 ${filesQuery.isFetching ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={removeSelected}
              disabled={removeLinkMutation.isPending || selectedIds.length === 0}
            >
              {removeLinkMutation.isPending ? "Removing..." : `Remove Selected (${selectedIds.length})`}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {files.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-5 py-10 text-center text-sm text-muted-foreground">
            No Pentacam files yet for this patient.
          </div>
        ) : (
          <>
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
              <div className="space-y-3">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 2xl:grid-cols-3">
                  {files.map((row: any, index: number) => {
                    const url = normalizeUrl(row?.storageUrl);
                    const mimeType = String(row?.mimeType ?? "");
                    const isImage = mimeType.startsWith("image/");
                    const status = String(row?.importStatus ?? "");
                    const fileName = String(row?.sourceFileName ?? "file");
                    const resultId = Number(row?.id ?? 0);
                    return (
                      <div
                        key={row?.id ?? `${fileName}-${row?.importedAt ?? ""}`}
                        className={`space-y-3 rounded-2xl border bg-white p-3 shadow-sm transition-all hover:-translate-y-0.5 ${
                          previewIndex === index ? "border-primary/30 ring-1 ring-primary/10" : "border-slate-200"
                        }`}
                      >
                        <label className="flex items-center gap-2 text-xs">
                          <input
                            type="checkbox"
                            checked={Boolean(selected[resultId])}
                            onChange={(e) => {
                              if (!Number.isFinite(resultId) || resultId <= 0) return;
                              setSelected((prev: Record<number, boolean>) => ({ ...prev, [resultId]: e.target.checked }));
                            }}
                          />
                          Select
                        </label>
                        <div className="flex items-center justify-between gap-2">
                          <Badge variant={status === "imported" ? "default" : "secondary"}>{status || "unknown"}</Badge>
                          <span className="text-xs text-muted-foreground">{String(row?.eyeSide ?? "")}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          {url ? (
                            <Button type="button" size="sm" variant="outline" asChild>
                              <a href={url} download={fileName}>
                                <Download className="h-4 w-4" />
                                Download
                              </a>
                            </Button>
                          ) : null}
                          {url ? (
                            <Button type="button" size="sm" variant="outline" asChild>
                              <a href={url} target="_blank" rel="noreferrer">
                                <ExternalLink className="h-4 w-4" />
                                Open
                              </a>
                            </Button>
                          ) : null}
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="col-span-2"
                            disabled={removeLinkMutation.isPending}
                            onClick={async () => {
                              if (!Number.isFinite(resultId) || resultId <= 0) return;
                              try {
                                await removeLinkMutation.mutateAsync({ resultId });
                                toast.success("Pentacam link removed.");
                                await utils.medical.getPentacamFilesByPatient.invalidate({
                                  patientId: targetPatientId,
                                  limit: compact ? 20 : 100,
                                });
                              } catch (error: unknown) {
                                toast.error(getTrpcErrorMessage(error, "Failed to remove Pentacam link."));
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                            Remove Link
                          </Button>
                        </div>
                        {url && isImage ? (
                          <button type="button" className="group block w-full text-left" onClick={() => openPreview(resultId)}>
                            <PentacamThumbnail
                              src={url}
                              alt={fileName}
                              className="h-44 w-full rounded-xl border border-slate-200 bg-muted/30 object-cover"
                              loading={index < (compact ? 6 : 12) ? "eager" : "lazy"}
                            />
                            <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-slate-900/85 px-2.5 py-1 text-[11px] font-semibold text-white opacity-90 transition-opacity group-hover:opacity-100">
                              <Eye className="h-3.5 w-3.5" />
                              معاينة
                            </div>
                          </button>
                        ) : (
                          <a
                            href={url || "#"}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 p-4 text-center text-sm hover:bg-muted"
                          >
                            <ImageIcon className="h-4 w-4" />
                            Open file
                          </a>
                        )}
                        <div className="text-xs font-medium text-slate-700 break-all">{fileName}</div>
                        <div className="text-[11px] text-muted-foreground">
                          {formatDate(row?.capturedAt || row?.importedAt)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <aside className="overflow-hidden rounded-[1.5rem] border border-slate-200 bg-slate-50 shadow-[0_12px_32px_rgba(15,23,42,0.05)]">
                <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">Inline preview</div>
                    <div className="mt-1 text-sm font-semibold text-slate-900">
                      {activeImage?.fileName ?? "Pentacam image"}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => setPreviewIndex((prev) => Math.max(0, prev - 1))}
                      disabled={previewIndex <= 0}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
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
                    className="h-72 w-full object-contain bg-slate-900/95"
                    loading="eager"
                  />
                ) : (
                  <div className="flex h-72 items-center justify-center bg-slate-900/95 px-6 text-center text-sm text-slate-300">
                    Select an image to preview it here.
                  </div>
                )}

                <div className="space-y-3 px-4 py-4">
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="rounded-2xl border border-slate-200 bg-white px-3 py-2">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">Side</div>
                      <div className="mt-1 font-medium text-slate-800">{activeImage?.side || "—"}</div>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white px-3 py-2">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">Status</div>
                      <div className="mt-1 font-medium text-slate-800">{activeImage?.status || "—"}</div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
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
              </aside>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
