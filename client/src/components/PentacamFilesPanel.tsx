import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ChevronLeft, ChevronRight, Download, ExternalLink, Eye, ImageIcon, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { getTrpcErrorMessage } from "@/lib/utils";
import { useEffect, useMemo, useState } from "react";
import { getApiUrl } from "@/const";
import AuthenticatedImage, { prefetchAuthenticatedImage } from "@/components/AuthenticatedImage";
import PentacamThumbnail from "@/components/PentacamThumbnail";

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
  const [viewerIndex, setViewerIndex] = useState<number>(-1);
  const filesQuery = trpc.medical.getPentacamFilesByPatient.useQuery(
    { patientId: targetPatientId, limit: compact ? 20 : 100 },
    {
      enabled: active && targetPatientId > 0,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      staleTime: 30_000,
    }
  );
  const removeLinkMutation = trpc.medical.removePentacamLink.useMutation();

  const files = useMemo(() => (Array.isArray(filesQuery.data) ? filesQuery.data : []), [filesQuery.data]);
  const imageFiles = useMemo(
    () =>
      files.filter((row: any) => String(row?.mimeType ?? "").startsWith("image/")).map((row: any) => ({
        id: Number(row?.id ?? 0),
        fileName: String(row?.sourceFileName ?? "file"),
        url: normalizeUrl(row?.storageUrl),
      })),
    [files]
  );
  const activeImage = viewerIndex >= 0 ? imageFiles[viewerIndex] : null;
  const selectedIds = useMemo(
    () =>
      Object.entries(selected)
        .filter(([, checked]) => Boolean(checked))
        .map(([id]) => Number(id))
        .filter((id) => Number.isFinite(id) && id > 0),
    [selected]
  );

  useEffect(() => {
    const valid = new Set(
      files
        .map((row: any) => Number(row?.id ?? 0))
        .filter((id: number) => Number.isFinite(id) && id > 0)
    );
    setSelected((prev: Record<number, boolean>) => {
      const next: Record<number, boolean> = {};
      for (const [idRaw, checked] of Object.entries(prev)) {
        const id = Number(idRaw);
        if (valid.has(id)) next[id] = Boolean(checked);
      }
      return next;
    });
  }, [files]);

  useEffect(() => {
    if (!active || imageFiles.length === 0) return;
    imageFiles.slice(0, compact ? 6 : 12).forEach((item) => {
      void prefetchAuthenticatedImage(item.url);
    });
  }, [active, compact, imageFiles]);

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

  function openViewer(resultId: number) {
    const nextIndex = imageFiles.findIndex((item) => item.id === resultId);
    if (nextIndex >= 0) setViewerIndex(nextIndex);
  }

  if (!targetPatientId) {
    return (
      <Card className="border-slate-200/80 bg-white/92 shadow-sm">
        <CardContent className="pt-6 text-sm text-muted-foreground">Select patient first.</CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden border-slate-200/80 bg-white/92 shadow-sm">
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
      <CardContent>
        {files.length === 0 ? (
          <div className="text-sm text-muted-foreground">
            No Pentacam files yet for this patient.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {files.map((row: any, index: number) => {
              const url = normalizeUrl(row?.storageUrl);
              const mimeType = String(row?.mimeType ?? "");
              const isImage = mimeType.startsWith("image/");
              const status = String(row?.importStatus ?? "");
              const fileName = String(row?.sourceFileName ?? "file");
              return (
                <div
                  key={row?.id ?? `${fileName}-${row?.importedAt ?? ""}`}
                  className="space-y-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_18px_40px_rgba(15,23,42,0.10)]"
                >
                  <label className="flex items-center gap-2 text-xs">
                    <input
                      type="checkbox"
                      checked={Boolean(selected[Number(row?.id ?? 0)])}
                      onChange={(e) => {
                        const resultId = Number(row?.id ?? 0);
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
                  <div className="grid grid-cols-2 gap-2 pt-1">
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
                        const resultId = Number(row?.id ?? 0);
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
                    <button type="button" className="group block w-full text-left" onClick={() => openViewer(Number(row?.id ?? 0))}>
                      <PentacamThumbnail
                        src={url}
                        alt={fileName}
                        className="h-48 w-full rounded-xl border border-slate-200 bg-muted/30 object-cover sm:h-56"
                        loading={index < (compact ? 6 : 12) ? "eager" : "lazy"}
                      />
                      <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-slate-900/85 px-2.5 py-1 text-[11px] font-semibold text-white opacity-90 transition-opacity group-hover:opacity-100">
                        <Eye className="h-3.5 w-3.5" />
                        معاينة
                      </div>
                    </button>
                  ) : (
                    <a href={url || "#"} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 p-4 text-sm text-center hover:bg-muted">
                      <ImageIcon className="h-4 w-4" />
                      Open file
                    </a>
                  )}
                  <div className="text-xs font-medium text-slate-700 break-all">{fileName}</div>
                  <div className="text-[11px] text-muted-foreground">{formatDate(row?.capturedAt || row?.importedAt)}</div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
      <Dialog open={viewerIndex >= 0} onOpenChange={(open) => setViewerIndex(open ? viewerIndex : -1)}>
        <DialogContent className="max-h-[95vh] w-[96vw] max-w-5xl overflow-hidden p-0">
          <DialogHeader className="border-b bg-white px-4 py-3">
            <DialogTitle className="truncate text-sm sm:text-base">
              {activeImage?.fileName ?? "Pentacam image"}
            </DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-between gap-2 border-b bg-slate-50/90 px-3 py-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setViewerIndex((prev) => Math.max(0, prev - 1))}
              disabled={viewerIndex <= 0}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <div className="text-xs text-muted-foreground">
              {activeImage ? `${viewerIndex + 1} / ${imageFiles.length}` : ""}
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setViewerIndex((prev) => Math.min(imageFiles.length - 1, prev + 1))}
              disabled={viewerIndex < 0 || viewerIndex >= imageFiles.length - 1}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex max-h-[calc(95vh-9rem)] items-center justify-center bg-black/95 p-3 sm:p-4">
            {activeImage?.url ? (
              <AuthenticatedImage
                src={activeImage.url}
                alt={activeImage.fileName}
                className="max-h-full max-w-full rounded-md object-contain"
                loading="eager"
              />
            ) : null}
          </div>
          <div className="grid grid-cols-2 gap-2 border-t bg-white px-3 py-3">
            {activeImage?.url ? (
              <Button type="button" variant="outline" asChild>
                <a href={activeImage.url} download={activeImage.fileName}>
                  <Download className="h-4 w-4" />
                  Download
                </a>
              </Button>
            ) : null}
            {activeImage?.url ? (
              <Button type="button" variant="outline" asChild>
                <a href={activeImage.url} target="_blank" rel="noreferrer">
                  <ExternalLink className="h-4 w-4" />
                  Open in browser
                </a>
              </Button>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

