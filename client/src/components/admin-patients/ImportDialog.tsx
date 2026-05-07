import { useRef, type ReactNode } from "react";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { type ImportPreviewRow } from "@/hooks/admin-patients/adminPatientsShared";

type ImportDialogProps = {
  triggerLabel?: string;
  /** Overrides default outline button trigger */
  trigger?: ReactNode;
  applyImportPending: boolean;
  importDateFormat: "" | "DMY" | "MDY";
  importPreviewOpen: boolean;
  importPreviewRows: ImportPreviewRow[];
  importSummary: { total: number; valid: number; invalid: number } | null;
  onApply: () => void;
  onDateFormatChange: (value: "" | "DMY" | "MDY") => void;
  onDownloadErrors: () => void;
  onImportFile: (file: File) => void;
  onOpenChange: (open: boolean) => void;
};

export function ImportDialog({
  trigger,
  triggerLabel = "معاينة الاستيراد",
  applyImportPending,
  importDateFormat,
  importPreviewOpen,
  importPreviewRows,
  importSummary,
  onApply,
  onDateFormatChange,
  onDownloadErrors,
  onImportFile,
  onOpenChange,
}: ImportDialogProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  return (
    <Dialog open={importPreviewOpen} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>{trigger ?? <Button variant="outline" type="button">{triggerLabel}</Button>}</DialogTrigger>
      <DialogContent className="max-h-[calc(100vh-60px)] max-w-4xl overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-right">Staged Import Preview</DialogTitle>
          <DialogDescription className="text-right">
            {importSummary
              ? `Total: ${importSummary.total}, Valid: ${importSummary.valid}, Invalid: ${importSummary.invalid}`
              : "Upload an Excel workbook, validate it, then apply the valid rows."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap items-center justify-end gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) onImportFile(file);
              event.currentTarget.value = "";
            }}
          />
          <Select value={importDateFormat} onValueChange={(value) => onDateFormatChange(value as "" | "DMY" | "MDY")}>
            <SelectTrigger className="w-[210px]">
              <SelectValue placeholder="Excel Date Format" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="DMY">DD/MM/YYYY</SelectItem>
              <SelectItem value="MDY">MM/DD/YYYY</SelectItem>
            </SelectContent>
          </Select>
          <Button type="button" variant="outline" className="gap-2" onClick={() => fileInputRef.current?.click()}>
            <Upload className="h-4 w-4" />
            Upload Excel
          </Button>
        </div>

        <div className="max-h-[420px] overflow-auto rounded-md border">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-muted">
              <tr>
                <th className="p-2 text-right">Row</th>
                <th className="p-2 text-right">Code</th>
                <th className="p-2 text-right">Name</th>
                <th className="p-2 text-right">Service</th>
                <th className="p-2 text-right">Location</th>
                <th className="p-2 text-right">Status</th>
                <th className="p-2 text-right">Errors</th>
              </tr>
            </thead>
            <tbody>
              {importPreviewRows.map((row) => (
                <tr key={`${row.rowNumber}-${row.patientCode}-${row.fullName}`} className="border-t align-top">
                  <td className="p-2">{row.rowNumber}</td>
                  <td className="p-2">{row.patientCode}</td>
                  <td className="p-2">{row.fullName}</td>
                  <td className="p-2">{row.serviceType}</td>
                  <td className="p-2">{row.locationType}</td>
                  <td className="p-2">{row.status}</td>
                  <td className="p-2 text-xs text-destructive">{(row.errors ?? []).join(" | ")}</td>
                </tr>
              ))}
              {importPreviewRows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-4 text-center text-sm text-muted-foreground">
                    No staged rows yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onDownloadErrors}>
            Download Error CSV
          </Button>
          <Button type="button" onClick={onApply} disabled={applyImportPending || importPreviewRows.length === 0}>
            {applyImportPending ? "Applying..." : "Apply Valid Rows"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
