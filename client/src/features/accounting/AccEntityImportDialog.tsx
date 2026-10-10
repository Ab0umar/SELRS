import { useMemo, useRef, useState } from "react";
import { FileSpreadsheet, Loader2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { loadXlsx } from "@/lib/xlsx";
import { trpc } from "@/lib/trpc";
import { parseAccSheet, type AccImportRow } from "./accImportParse";
import { fmt } from "./accountingFormat";

export type AccImportEntity = "insta" | "home";

type Props = {
  entity: AccImportEntity;
  onDone: () => void;
};

const MAX_ROWS = 2000;

export function AccEntityImportDialog({ entity, onDone }: Props) {
  const [open, setOpen] = useState(false);
  const [fileName, setFileName] = useState("");
  const [parsing, setParsing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sheets, setSheets] = useState<
    { name: string; rows: AccImportRow[]; invalid: number; mapped: string[] }[]
  >([]);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const importMut =
    entity === "insta"
      ? trpc.accounting.importAccInstapay.useMutation()
      : trpc.accounting.importAccHome.useMutation();

  const merged = useMemo(() => {
    const rows: AccImportRow[] = [];
    let invalid = 0;
    for (const s of sheets) {
      if (!selected[s.name]) continue;
      rows.push(...s.rows);
      invalid += s.invalid;
    }
    const totalIn = rows.reduce((sum, r) => sum + r.inAmount, 0);
    const totalOut = rows.reduce((sum, r) => sum + r.outAmount, 0);
    const preview = [...rows]
      .sort((a, b) => (a.txDate < b.txDate ? 1 : -1))
      .slice(0, 8);
    return { rows, invalid, totalIn, totalOut, preview };
  }, [sheets, selected]);

  async function handleFile(file: File) {
    setParsing(true);
    try {
      const XLSX = await loadXlsx();
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { cellDates: true });
      const parsed = wb.SheetNames.map((name) => {
        const rows2d = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[name], {
          header: 1,
          raw: true,
          defval: null,
        });
        const { rows, invalid, mappedColumns } = parseAccSheet(rows2d);
        return { name, rows, invalid, mapped: mappedColumns };
      });
      const withRows = parsed.filter((s) => s.rows.length > 0 || s.invalid > 0);
      if (withRows.length === 0) {
        toast.error(
          "لم يتم التعرف على أعمدة الملف. يلزم عمود تاريخ وعمود مبلغ أو عمودا داخل وخارج",
        );
        return;
      }
      setFileName(file.name);
      setSheets(withRows);
      setSelected(
        Object.fromEntries(withRows.map((s, i) => [s.name, i === 0])),
      );
    } catch {
      toast.error("تعذر قراءة الملف. تأكد من سلامة ملف Excel");
    } finally {
      setParsing(false);
    }
  }

  async function handleApply() {
    if (merged.rows.length === 0) return;
    if (merged.rows.length > MAX_ROWS) {
      toast.error(`عدد الصفوف أكبر من ${MAX_ROWS}. قسّم الملف قبل الاستيراد`);
      return;
    }
    setBusy(true);
    try {
      const res = await importMut.mutateAsync({ rows: merged.rows });
      toast.success(
        `تم استيراد ${res.inserted.toLocaleString("ar-EG")} حركة` +
          (res.skipped
            ? ` · تم تخطي ${res.skipped.toLocaleString("ar-EG")}`
            : ""),
      );
      setOpen(false);
      setSheets([]);
      setFileName("");
      onDone();
    } catch {
      toast.error("تعذر الاستيراد");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button
        type="button"
        variant="outline"
        className="gap-1.5"
        onClick={() => setOpen(true)}
      >
        <Upload className="h-4 w-4" />
        استيراد Excel
      </Button>
      <DialogContent
        className="max-h-[calc(100vh-60px)] max-w-3xl overflow-y-auto"
        dir="rtl"
      >
        <DialogHeader>
          <DialogTitle className="text-start">
            استيراد حركات من Excel
          </DialogTitle>
          <DialogDescription className="text-start">
            ارفع كشف الحساب (xlsx). عمود التاريخ + عمود المبلغ بالإشارة (موجب =
            منه، سالب = معاه) أو عمودي داخل/خارج. الحركات المكررة بتتخطى
            تلقائيًا بالرقم المرجعي.
          </DialogDescription>
        </DialogHeader>

        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void handleFile(file);
            event.currentTarget.value = "";
          }}
        />

        <div className="flex flex-wrap items-center justify-between gap-2">
          <Button
            type="button"
            variant="outline"
            className="gap-2"
            disabled={parsing}
            onClick={() => fileInputRef.current?.click()}
          >
            {parsing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FileSpreadsheet className="h-4 w-4" />
            )}
            {fileName ? "تغيير الملف" : "اختيار ملف"}
          </Button>
          {fileName && (
            <span className="max-w-[280px] truncate text-xs text-muted-foreground">
              {fileName}
            </span>
          )}
        </div>

        {sheets.length > 0 && (
          <>
            {sheets.length > 1 && (
              <div
                className="flex flex-wrap items-center gap-1.5"
                role="group"
                aria-label="أوراق العمل المشمولة في الاستيراد"
              >
                <span className="text-xs text-muted-foreground">الشيتات:</span>
                {sheets.map((s) => (
                  <Button variant="bare"
                    key={s.name}
                    type="button"
                    aria-pressed={Boolean(selected[s.name])}
                    onClick={() =>
                      setSelected((prev) => ({
                        ...prev,
                        [s.name]: !prev[s.name],
                      }))
                    }
                    className={
                      "min-h-11 rounded-full border px-3 py-2 text-xs font-medium transition-colors " +
                      (selected[s.name]
                        ? "border-primary/40 bg-primary/10 text-primary"
                        : "border-border bg-muted text-muted-foreground")
                    }
                  >
                    {s.name} ({s.rows.length.toLocaleString("ar-EG")})
                  </Button>
                ))}
              </div>
            )}

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <div className="rounded-xl border border-border bg-muted px-3 py-2">
                <div className="text-[13px] text-muted-foreground">
                  صالح للاستيراد
                </div>
                <div className="mt-0.5 text-sm font-bold tabular-nums text-foreground">
                  {merged.rows.length.toLocaleString("ar-EG")}
                </div>
              </div>
              <div className="rounded-xl border border-border bg-success/5 px-3 py-2">
                <div className="text-[13px] text-success">إجمالي منه</div>
                <div className="mt-0.5 text-sm font-bold tabular-nums text-success">
                  {fmt(merged.totalIn)}
                </div>
              </div>
              <div className="rounded-xl border border-border bg-destructive/5 px-3 py-2">
                <div className="text-[13px] text-destructive">إجمالي معاه</div>
                <div className="mt-0.5 text-sm font-bold tabular-nums text-destructive">
                  {fmt(merged.totalOut)}
                </div>
              </div>
              <div className="rounded-xl border border-border bg-muted px-3 py-2">
                <div className="text-[13px] text-muted-foreground">
                  صفوف متجاهلة
                </div>
                <div className="mt-0.5 text-sm font-bold tabular-nums text-muted-foreground">
                  {merged.invalid.toLocaleString("ar-EG")}
                </div>
              </div>
            </div>

            <div role="region" aria-label="جدول بيانات" tabIndex={0} className="max-h-[300px] overflow-auto rounded-md border border-border">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-muted text-muted-foreground">
                  <tr>
                    <th className="p-2 text-start font-medium">التاريخ</th>
                    <th className="p-2 text-start font-medium">البيان</th>
                    <th className="p-2 text-end font-medium text-success">
                      منه
                    </th>
                    <th className="p-2 text-end font-medium text-destructive">
                      معاه
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {merged.preview.map((r, i) => (
                    <tr key={`${r.txDate}-${i}`}>
                      <td className="whitespace-nowrap p-2 tabular-nums text-muted-foreground">
                        {r.txDate}
                      </td>
                      <td className="max-w-[260px] truncate p-2 text-foreground">
                        {r.notes || "غير متاح"}
                      </td>
                      <td className="p-2 text-end tabular-nums text-success">
                        {r.inAmount ? fmt(r.inAmount) : "غير متاح"}
                      </td>
                      <td className="p-2 text-end tabular-nums text-destructive">
                        {r.outAmount ? fmt(r.outAmount) : "غير متاح"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-muted-foreground">
                المعاينة تعرض أول 8 حركات من المحدد.
              </span>
              <Button
                type="button"
                disabled={busy || merged.rows.length === 0}
                onClick={() => void handleApply()}
                className="gap-1.5"
              >
                {busy ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
                استيراد {merged.rows.length.toLocaleString("ar-EG")} حركة
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
