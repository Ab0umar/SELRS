import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronDown, ChevronUp, FolderCog, Printer, RefreshCw, ScanSearch } from "lucide-react";
import { toast } from "sonner";
import { getApiUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { getTrpcErrorMessage } from "@/lib/utils";
import AuthenticatedImage, { prefetchAuthenticatedImage } from "@/components/AuthenticatedImage";
import PentacamThumbnail from "@/components/PentacamThumbnail";

type LocalExportItem = {
  name: string;
  size: number;
  mtime: string;
  url: string;
};

type ApiResponse = {
  ok: boolean;
  files: LocalExportItem[];
  count: number;
  error?: string;
};

function buildPentacamAssetUrl(item: LocalExportItem) {
  return getApiUrl(item.url);
}

function openPentacamPdfView(items: LocalExportItem[], title: string) {
  if (typeof window === "undefined" || items.length === 0) return false;

  const printWindow = window.open("", "_blank", "noopener,noreferrer");
  if (!printWindow) return false;

  const imageMarkup = items
    .map((item) => {
      const assetUrl = buildPentacamAssetUrl(item);
      const safeName = String(item.name ?? "").replace(/</g, "&lt;").replace(/>/g, "&gt;");
      return `
        <section class="page">
          <div class="label">${safeName}</div>
          <img src="${assetUrl}" alt="${safeName}" />
        </section>
      `;
    })
    .join("");

  printWindow.document.write(`
    <!doctype html>
    <html dir="ltr">
      <head>
        <meta charset="utf-8" />
        <title>${title}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 0; background: #f8fafc; color: #0f172a; }
          .page { page-break-after: always; padding: 16px; }
          .page:last-child { page-break-after: auto; }
          .label { margin-bottom: 10px; font-size: 12px; word-break: break-all; }
          img { display: block; width: 100%; height: auto; border: 1px solid #cbd5e1; background: white; }
          @media print {
            body { background: white; }
            .page { padding: 0; }
            img { border: none; }
          }
        </style>
      </head>
      <body>
        ${imageMarkup}
        <script>
          window.addEventListener("load", () => {
            setTimeout(() => window.print(), 250);
          });
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
  return true;
}

function formatDate(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.valueOf())) return value;
  return parsed.toLocaleString();
}

function formatSize(size: number) {
  if (!Number.isFinite(size) || size <= 0) return "0 B";
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

type LocalPentacamExportsPanelProps = {
  patientId?: number | null;
  active?: boolean;
};

type UnmatchedSuggestion = {
  fileName: string;
  candidates: Array<{
    patientId: number;
    patientCode: string;
    fullName: string;
    matchedBy: string;
    score: number;
  }>;
};

type PatientSearchResult = {
  patientId: number;
  patientCode: string;
  fullName: string;
};

type MismatchedLinkItem = {
  resultId: number;
  fileName: string;
  currentPatientId: number;
  currentPatientCode: string;
  currentPatientName: string;
  codeCandidates: string[];
  kind: "obvious" | "ambiguous";
  suggestedPatientId?: number;
  suggestedPatientCode?: string;
  suggestedPatientName?: string;
};

function extractNameHintFromPentacamFile(fileName: string): string {
  const stem = String(fileName ?? "").replace(/\.[^.]+$/, "");
  return stem.replace(/_(OD|OS)_\d{8}_\d{6}_.+$/i, "").replace(/_/g, " ").trim();
}

export default function LocalPentacamExportsPanel({ patientId, active = true }: LocalPentacamExportsPanelProps) {
  const PAGE_SIZE = 24;
  const [items, setItems] = useState<LocalExportItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [nameFilter, setNameFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [lastAutoWireSignature, setLastAutoWireSignature] = useState("");
  const [unmatchedSuggestions, setUnmatchedSuggestions] = useState<UnmatchedSuggestion[]>([]);
  const [manualSearchTermByFile, setManualSearchTermByFile] = useState<Record<string, string>>({});
  const [manualSearchResultsByFile, setManualSearchResultsByFile] = useState<Record<string, PatientSearchResult[]>>({});
  const [manualSearchLoadingByFile, setManualSearchLoadingByFile] = useState<Record<string, boolean>>({});
  const [mismatchedLinks, setMismatchedLinks] = useState<MismatchedLinkItem[]>([]);
  const [mismatchLoading, setMismatchLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const targetPatientId = Number(patientId ?? 0);
  const utils = trpc.useUtils();
  const importMutation = trpc.medical.importLocalPentacamExports.useMutation();
  const autoImportMutation = trpc.medical.autoImportLocalPentacamExports.useMutation();
  const unmatchedSuggestionsMutation = trpc.medical.getUnmatchedLocalPentacamSuggestions.useMutation();
  const searchPentacamPatientsMutation = trpc.medical.searchPentacamPatients.useMutation();
  const mismatchedLinksMutation = trpc.medical.getMismatchedLocalPentacamLinks.useMutation();
  const unlinkMismatchedMutation = trpc.medical.unlinkMismatchedLocalPentacamLinks.useMutation();
  const reassignLinkMutation = trpc.medical.reassignLocalPentacamLink.useMutation();

  const hasItems = useMemo(() => items.length > 0, [items.length]);
  const filteredItems = useMemo(() => {
    const q = nameFilter.trim().toLowerCase();
    const from = dateFrom.trim();
    const to = dateTo.trim();

    const extractDate = (fileName: string): string => {
      const match = fileName.match(/_(\d{8})_(\d{6})_/);
      if (!match) return "";
      const token = String(match[1] ?? "");
      if (token.length !== 8) return "";
      const dd = token.slice(0, 2);
      const mm = token.slice(2, 4);
      const yyyy = token.slice(4, 8);
      return `${yyyy}-${mm}-${dd}`;
    };

    return items.filter((item) => {
      const lowerName = item.name.toLowerCase();
      if (q && !lowerName.includes(q)) return false;
      const d = extractDate(item.name);
      if (from && (!d || d < from)) return false;
      if (to && (!d || d > to)) return false;
      return true;
    });
  }, [items, nameFilter, dateFrom, dateTo]);
  const visibleItems = useMemo(() => filteredItems.slice(0, visibleCount), [filteredItems, visibleCount]);
  const selectedNames = useMemo(
    () =>
      Object.entries(selected)
        .filter(([, isChecked]) => Boolean(isChecked))
        .map(([name]) => name),
    [selected]
  );
  const selectedItems = useMemo(
    () => filteredItems.filter((item) => Boolean(selected[item.name])),
    [filteredItems, selected]
  );
  const canImport = targetPatientId > 0 && selectedNames.length > 0 && !importMutation.isPending;
  const canAutoImport = filteredItems.length > 0 && !autoImportMutation.isPending;
  const autoWireSignature = useMemo(
    () => items.map((item) => item.name).sort().join("|"),
    [items]
  );

  useEffect(() => {
    visibleItems.slice(0, 12).forEach((item) => {
      void prefetchAuthenticatedImage(buildPentacamAssetUrl(item));
    });
  }, [visibleItems]);

  async function autoImportByBatches(fileNames: string[]) {
    const unique = Array.from(new Set(fileNames.map((name) => String(name ?? "").trim()).filter(Boolean)));
    const batchSize = 1000;
    let imported = 0;
    let unmatched = 0;
    let skipped = 0;
    let missing = 0;
    const unresolvedFiles: string[] = [];
    for (let i = 0; i < unique.length; i += batchSize) {
      const chunk = unique.slice(i, i + batchSize);
      const result = await autoImportMutation.mutateAsync({ fileNames: chunk });
      imported += Number(result.imported ?? 0);
      unmatched += Number(result.unmatched ?? 0);
      skipped += Number(result.skipped ?? 0);
      missing += Number(result.missing ?? 0);
      if (Array.isArray((result as any).unresolvedFiles)) {
        unresolvedFiles.push(...(result as any).unresolvedFiles.map((value: unknown) => String(value ?? "").trim()).filter(Boolean));
      }
    }
    return { imported, unmatched, skipped, missing, unresolvedFiles: Array.from(new Set(unresolvedFiles)) };
  }

  async function loadUnmatchedSuggestions(fileNames: string[]) {
    const unique = Array.from(new Set(fileNames.map((value) => String(value ?? "").trim()).filter(Boolean)));
    if (unique.length === 0) {
      setUnmatchedSuggestions([]);
      return;
    }
    try {
      const result = await unmatchedSuggestionsMutation.mutateAsync({
        fileNames: unique.slice(0, 2000),
        limitPerFile: 3,
      });
      const rows = Array.isArray(result?.suggestions) ? (result.suggestions as UnmatchedSuggestion[]) : [];
      setUnmatchedSuggestions(rows);
      setManualSearchTermByFile((prev) => {
        const next = { ...prev };
        for (const row of rows) {
          if (!next[row.fileName]) next[row.fileName] = extractNameHintFromPentacamFile(row.fileName);
        }
        return next;
      });
    } catch (error: unknown) {
      toast.error(getTrpcErrorMessage(error, "Failed to load unmatched suggestions."));
    }
  }

  async function searchPatientsForFile(fileName: string) {
    const query = String(manualSearchTermByFile[fileName] ?? "").trim();
    if (!query) return;
    setManualSearchLoadingByFile((prev) => ({ ...prev, [fileName]: true }));
    try {
      const rows = await searchPentacamPatientsMutation.mutateAsync({ searchTerm: query, limit: 10 });
      setManualSearchResultsByFile((prev) => ({ ...prev, [fileName]: Array.isArray(rows) ? rows : [] }));
    } catch (error: unknown) {
      toast.error(getTrpcErrorMessage(error, "Patient search failed."));
    } finally {
      setManualSearchLoadingByFile((prev) => ({ ...prev, [fileName]: false }));
    }
  }

  async function linkSuggestion(fileName: string, patientId: number) {
    try {
      const result = await importMutation.mutateAsync({
        patientId,
        fileNames: [fileName],
      });
      if (Number(result.imported ?? 0) > 0) {
        toast.success(`Linked ${fileName}`);
        setUnmatchedSuggestions((prev) => prev.filter((entry) => entry.fileName !== fileName));
        setManualSearchResultsByFile((prev) => {
          const next = { ...prev };
          delete next[fileName];
          return next;
        });
        if (targetPatientId > 0) {
          await utils.medical.getPentacamFilesByPatient.invalidate({ patientId: targetPatientId, limit: 100 });
        }
      } else {
        toast.info(`No change for ${fileName} (already linked or missing).`);
      }
    } catch (error: unknown) {
      toast.error(getTrpcErrorMessage(error, "Failed to link file."));
    }
  }

  async function loadMismatchedLinks() {
    setMismatchLoading(true);
    try {
      const result = await mismatchedLinksMutation.mutateAsync({ limit: 80000 });
      const rows = Array.isArray((result as any)?.rows) ? ((result as any).rows as MismatchedLinkItem[]) : [];
      setMismatchedLinks(rows);
    } catch (error: unknown) {
      toast.error(getTrpcErrorMessage(error, "Failed to scan mismatched links."));
    } finally {
      setMismatchLoading(false);
    }
  }

  async function unlinkObviousMismatches() {
    try {
      const result = await unlinkMismatchedMutation.mutateAsync({ obviousOnly: true, limit: 80000 });
      toast.success(`Unlinked ${Number((result as any)?.deleted ?? 0)} mismatched link(s).`);
      await loadMismatchedLinks();
      if (targetPatientId > 0) {
        await utils.medical.getPentacamFilesByPatient.invalidate({ patientId: targetPatientId, limit: 100 });
      }
    } catch (error: unknown) {
      toast.error(getTrpcErrorMessage(error, "Failed to unlink mismatched links."));
    }
  }

  async function reassignMismatch(resultId: number, patientId: number) {
    try {
      await reassignLinkMutation.mutateAsync({ resultId, patientId });
      toast.success(`Reassigned result #${resultId} to patient ${patientId}.`);
      await loadMismatchedLinks();
      if (targetPatientId > 0) {
        await utils.medical.getPentacamFilesByPatient.invalidate({ patientId: targetPatientId, limit: 100 });
      }
    } catch (error: unknown) {
      toast.error(getTrpcErrorMessage(error, "Failed to reassign link."));
    }
  }


  async function loadExports() {
    if (!active) return;
    setLoading(true);
    setError("");
    try {
      const response = await fetch(getApiUrl("/api/pentacam/exports?limit=100000"), { credentials: "include" });
      const contentType = String(response.headers.get("content-type") ?? "").toLowerCase();
      if (!contentType.includes("application/json")) {
        const preview = (await response.text()).slice(0, 160).replace(/\s+/g, " ").trim();
        throw new Error(`Expected JSON from /api/pentacam/exports but received ${contentType || "unknown"}: ${preview}`);
      }
      const json = (await response.json()) as ApiResponse;
      if (!json.ok) {
        setItems([]);
        setSelected({});
        setError(json.error || "Could not load local Pentacam exports.");
        return;
      }
      const list = Array.isArray(json.files) ? json.files : [];
      setItems(list);
      setVisibleCount(PAGE_SIZE);
      setSelected((prev) => {
        const next: Record<string, boolean> = {};
        for (const item of list) {
          next[item.name] = Boolean(prev[item.name]);
        }
        return next;
      });
    } catch (err: any) {
      setItems([]);
      setSelected({});
      setError(String(err?.message || "Could not load local Pentacam exports."));
    } finally {
      setLoading(false);
    }
  }

  async function autoImportFiltered() {
    const names = filteredItems.map((item) => item.name);
    if (names.length === 0) {
      toast.error("No files to auto-link.");
      return;
    }
    try {
      const result = await autoImportByBatches(names);
      toast.success(
        `Auto-linked ${result.imported}, unmatched ${result.unmatched}, skipped ${result.skipped}, missing ${result.missing}.`
      );
      if (result.unmatched > 0) {
        await loadUnmatchedSuggestions(result.unresolvedFiles);
      } else {
        setUnmatchedSuggestions([]);
      }
      if (targetPatientId > 0) {
        await utils.medical.getPentacamFilesByPatient.invalidate({ patientId: targetPatientId, limit: 100 });
      }
    } catch (error: unknown) {
      toast.error(getTrpcErrorMessage(error, "Failed to auto-link Pentacam exports."));
    }
  }
  async function importSelected() {
    if (!targetPatientId) {
      toast.error("Select a patient first.");
      return;
    }
    if (selectedNames.length === 0) {
      toast.error("Select at least one image.");
      return;
    }
    try {
      const result = await importMutation.mutateAsync({
        patientId: targetPatientId,
        fileNames: selectedNames,
      });
      toast.success(`Imported ${result.imported}, skipped ${result.skipped}, missing ${result.missing}.`);
      await utils.medical.getPentacamFilesByPatient.invalidate({ patientId: targetPatientId, limit: 100 });
    } catch (error: unknown) {
      toast.error(getTrpcErrorMessage(error, "Failed to import Pentacam exports."));
    }
  }

  function printSelectedItems() {
    if (selectedItems.length === 0) {
      toast.error("Select at least one Pentacam image first.");
      return;
    }
    const opened = openPentacamPdfView(
      selectedItems,
      selectedItems.length === 1 ? selectedItems[0].name : `Pentacam_${selectedItems.length}_images`
    );
    if (!opened) {
      toast.error("Could not open the print view.");
      return;
    }
    toast.success(selectedItems.length === 1 ? "Print view opened." : `Print view opened for ${selectedItems.length} images.`);
  }

  useEffect(() => {
    if (!active) return;
    void loadExports();
  }, [active]);
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [nameFilter, dateFrom, dateTo]);

  return (
    <Card className="overflow-hidden border-slate-200/80 bg-white/95 shadow-sm">
      <CardHeader className="space-y-3 pb-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-sky-700">
              <FolderCog className="h-3.5 w-3.5" />
              Pentacam Intake
            </div>
            <div>
              <CardTitle className="text-base text-slate-950">Local Pentacam Exports</CardTitle>
              <div className="mt-1 text-sm text-muted-foreground">
                Review and import Pentacam images from the local export folder.
              </div>
            </div>
            <div className="flex flex-wrap gap-2 text-xs text-slate-600">
              <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1">
                Total files: {items.length}
              </span>
              <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1">
                Filtered: {filteredItems.length}
              </span>
              <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1">
                Selected: {selectedNames.length}
              </span>
              <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1">
                Patient: {targetPatientId > 0 ? `#${targetPatientId}` : "not selected"}
              </span>
            </div>
          </div>
          <div className="sticky top-2 z-20 flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white/95 p-2 shadow-sm sm:flex-row sm:flex-wrap sm:items-center">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setExpanded((prev) => !prev)}
              title={expanded ? "Collapse" : "Expand"}
              className="gap-2 border-slate-200 bg-white"
            >
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              {expanded ? "Collapse" : "Expand"}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={printSelectedItems}
              disabled={selectedItems.length === 0}
              className="gap-2 border-slate-200 bg-white"
            >
              <Printer className="h-4 w-4" />
              Print Selected ({selectedItems.length})
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={autoImportFiltered}
              disabled={!canAutoImport}
              className="gap-2 border-slate-200 bg-white"
            >
              <ScanSearch className="h-4 w-4" />
              {autoImportMutation.isPending ? "Auto-linking..." : "Auto-wire filtered"}
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={importSelected}
              disabled={!canImport}
              className="bg-slate-900 text-white hover:bg-slate-800"
            >
              {importMutation.isPending ? "Saving..." : `Save Selected (${selectedNames.length})`}
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={loadExports} disabled={loading} className="gap-2 border-slate-200 bg-white">
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </div>
      </CardHeader>
      {expanded ? <CardContent>
        {targetPatientId <= 0 ? (
          <div className="mb-3 rounded-2xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-sm text-amber-900">
            Select a patient above, then choose images and click import.
          </div>
        ) : null}
        <div className="mb-4 grid grid-cols-1 gap-2 rounded-2xl border border-slate-200 bg-slate-50/70 p-3 sm:grid-cols-3">
          <input
            type="text"
            value={nameFilter}
            onChange={(e) => setNameFilter(e.target.value)}
            placeholder="Filter by name/code/file"
            className="h-9 rounded border px-2 text-sm"
          />
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="h-9 rounded border px-2 text-sm"
          />
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="h-9 rounded border px-2 text-sm"
          />
        </div>
        {hasItems ? (
          <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              const next: Record<string, boolean> = {};
              for (const item of visibleItems) next[item.name] = true;
              setSelected(next);
            }}
          >
              Select visible
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setSelected({})}
            >
              Clear
            </Button>
            <div className="text-xs text-muted-foreground sm:ml-auto">
              Showing {Math.min(visibleCount, filteredItems.length)} of {filteredItems.length} (total {items.length})
            </div>
          </div>
        ) : null}
        {!hasItems && !error ? (
          <div className="text-sm text-muted-foreground">No exported files found in the `Pentacam` folder.</div>
        ) : null}
        {error ? <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div> : null}
        {unmatchedSuggestions.length > 0 ? (
          <div className="mb-4 space-y-2 rounded-2xl border border-slate-200 bg-slate-50/70 p-3">
            <div className="text-sm font-medium">
              Unmatched Suggestions ({unmatchedSuggestions.length}) - Manual linking only
            </div>
            <div className="space-y-2 max-h-72 overflow-auto pr-1">
              {unmatchedSuggestions.map((entry) => (
                <div key={entry.fileName} className="rounded border p-2 text-xs space-y-2">
                  <div className="break-all font-medium">{entry.fileName}</div>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={manualSearchTermByFile[entry.fileName] ?? ""}
                      onChange={(e) =>
                        setManualSearchTermByFile((prev) => ({ ...prev, [entry.fileName]: e.target.value }))
                      }
                      placeholder="Search patient Arabic/English"
                      className="h-8 rounded border px-2 text-xs w-full"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => searchPatientsForFile(entry.fileName)}
                      disabled={Boolean(manualSearchLoadingByFile[entry.fileName])}
                    >
                      {manualSearchLoadingByFile[entry.fileName] ? "Searching..." : "Search"}
                    </Button>
                  </div>
                  {Array.isArray(manualSearchResultsByFile[entry.fileName]) &&
                  manualSearchResultsByFile[entry.fileName].length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {manualSearchResultsByFile[entry.fileName].map((row) => (
                        <Button
                          key={`${entry.fileName}-manual-${row.patientId}`}
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => linkSuggestion(entry.fileName, row.patientId)}
                          disabled={importMutation.isPending}
                        >
                          {row.patientCode} {row.fullName}
                        </Button>
                      ))}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        ) : null}
        <div className="mb-4 space-y-2 rounded-2xl border border-slate-200 bg-slate-50/70 p-3">
          <div className="flex items-center justify-between gap-2">
            <div className="text-sm font-medium">
              Mismatched Existing Links ({mismatchedLinks.length})
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" onClick={loadMismatchedLinks} disabled={mismatchLoading}>
                {mismatchLoading ? "Scanning..." : "Scan mismatches"}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={unlinkObviousMismatches}
                disabled={unlinkMismatchedMutation.isPending}
              >
                {unlinkMismatchedMutation.isPending ? "Unlinking..." : "Unlink obvious"}
              </Button>
            </div>
          </div>
          {mismatchedLinks.length > 0 ? (
            <div className="space-y-2 max-h-72 overflow-auto pr-1">
              {mismatchedLinks.map((row) => (
                <div key={`mismatch-${row.resultId}`} className="rounded border p-2 text-xs space-y-1">
                  <div className="break-all font-medium">#{row.resultId} - {row.fileName}</div>
                  <div className="text-muted-foreground">
                    current: {row.currentPatientCode || row.currentPatientId} {row.currentPatientName}
                  </div>
                  <div className="text-muted-foreground">codes: {row.codeCandidates.join(", ")}</div>
                  {row.kind === "obvious" && row.suggestedPatientId ? (
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => reassignMismatch(row.resultId, Number(row.suggestedPatientId))}
                        disabled={reassignLinkMutation.isPending}
                      >
                        Reassign to {row.suggestedPatientCode} {row.suggestedPatientName}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={async () => {
                          await unlinkMismatchedMutation.mutateAsync({ resultIds: [row.resultId] });
                          await loadMismatchedLinks();
                        }}
                        disabled={unlinkMismatchedMutation.isPending}
                      >
                        Unlink
                      </Button>
                    </div>
                  ) : (
                    <div className="text-amber-600">Ambiguous: manual decision required.</div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-xs text-muted-foreground">Run scan to load mismatched linked files.</div>
          )}
        </div>
        {hasItems ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {visibleItems.map((item, index) => (
              <div
                key={`${item.name}-${item.mtime}`}
                className="space-y-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm transition-all hover:-translate-y-0.5 hover:border-sky-200 hover:bg-sky-50/30"
              >
                <label className="flex items-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    checked={Boolean(selected[item.name])}
                    onChange={(e) => setSelected((prev) => ({ ...prev, [item.name]: e.target.checked }))}
                  />
                  Select
                </label>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" size="sm" asChild>
                    <a href={buildPentacamAssetUrl(item)} target="_blank" rel="noreferrer" download={item.name}>
                      Download
                    </a>
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const opened = openPentacamPdfView([item], item.name);
                      if (!opened) {
                        toast.error("Could not open the PDF view.");
                      }
                    }}
                  >
                    PDF
                  </Button>
                </div>
                <a href={buildPentacamAssetUrl(item)} target="_blank" rel="noreferrer" className="block">
                  <PentacamThumbnail
                    src={buildPentacamAssetUrl(item)}
                    alt={item.name}
                    className="h-24 w-full rounded-xl border border-slate-200 object-cover"
                    loading={index < 12 ? "eager" : "lazy"}
                  />
                </a>
                <div className="text-xs break-all">{item.name}</div>
                <div className="text-[11px] text-muted-foreground">{formatDate(item.mtime)}</div>
                <div className="text-[11px] text-muted-foreground">{formatSize(item.size)}</div>
              </div>
            ))}
          </div>
        ) : null}
        {filteredItems.length > visibleCount ? (
          <div className="mt-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setVisibleCount((prev) => prev + PAGE_SIZE)}
            >
              Load more
            </Button>
          </div>
        ) : null}
      </CardContent> : null}
    </Card>
  );
}




