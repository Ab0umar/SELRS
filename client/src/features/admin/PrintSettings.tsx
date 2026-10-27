import { useCallback, useEffect, useRef, useState } from "react";
import { Download, Minus, Plus, RotateCcw, RotateCw, Save } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  PRINT_SETTINGS_KEY,
  readClinicalPrintSettings,
  printProfileSchema,
  type ClinicalPrintSettings,
  type PrintProfile,
  type PrintProfileId,
} from "../../../../shared/printSettings";
import {
  PRINT_DOCUMENTS,
  getPrintProfile,
  setClinicalPrintSettings,
  resolvePrintDocument,
} from "@/lib/clinicalPrintSettings";
import { exportElementToPdf } from "@/lib/nativePdf";
import "./print-settings.css";
import ActualPrintPreview, { printPreviewRoutes } from "./ActualPrintPreview";
import SheetPrintLayoutSettings from "./SheetPrintLayoutSettings";

type DimensionKey =
  "widthMm" | "heightMm" | "topMm" | "bottomMm" | "leftMm" | "rightMm";
const dimensions: { key: DimensionKey; label: string; max: number }[] = [
  { key: "widthMm", label: "عرض الورقة", max: 420 },
  { key: "heightMm", label: "ارتفاع الورقة", max: 600 },
  { key: "topMm", label: "الهامش العلوي", max: 120 },
  { key: "bottomMm", label: "الهامش السفلي", max: 120 },
  { key: "rightMm", label: "الهامش الأيمن", max: 120 },
  { key: "leftMm", label: "الهامش الأيسر", max: 120 },
];

export default function PrintSettings() {
  const query = trpc.medical.getSystemSetting.useQuery({
    key: PRINT_SETTINGS_KEY,
  });
  const update = trpc.medical.updateSystemSetting.useMutation();
  const utils = trpc.useUtils();
  const [id, setId] = useState<PrintProfileId>("prescription");
  const [draft, setDraft] = useState<ClinicalPrintSettings>(() =>
    readClinicalPrintSettings(null),
  );
  const [panel, setPanel] = useState("settings");
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const loaded = useRef(false);
  const paper = useRef<HTMLDivElement>(null);
  const actualPaper = useRef<HTMLElement | null>(null);
  const bindPaper = useCallback((node: HTMLElement | null) => {
    actualPaper.current = node;
  }, []);
  const [sourcePath, setSourcePath] = useState(printPreviewRoutes.prescription);
  const [sourceInput, setSourceInput] = useState(
    printPreviewRoutes.prescription,
  );
  useEffect(() => {
    setSourcePath(printPreviewRoutes[id]);
    setSourceInput(printPreviewRoutes[id]);
  }, [id]);
  const previewHost = useRef<HTMLDivElement>(null);
  const [previewWidth, setPreviewWidth] = useState(400);
  const [paperHeight, setPaperHeight] = useState(0);
  useEffect(() => {
    if (!loaded.current && query.isSuccess) {
      loaded.current = true;
      setDraft(readClinicalPrintSettings(query.data?.value));
    }
  }, [query.isSuccess, query.data]);
  useEffect(() => {
    if (!previewHost.current) return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry.contentRect.width > 0) setPreviewWidth(entry.contentRect.width);
    });
    observer.observe(previewHost.current);
    return () => observer.disconnect();
  }, [query.isSuccess]);
  useEffect(() => {
    if (!paper.current) return;
    const observer = new ResizeObserver(() => {
      if (paper.current && paper.current.scrollHeight > 0)
        setPaperHeight(paper.current.scrollHeight);
    });
    observer.observe(paper.current);
    return () => observer.disconnect();
  }, [query.isSuccess]);
  const profile = getPrintProfile(draft, id);
  const validation = printProfileSchema.safeParse(profile);
  const safe = validation.success
    ? validation.data
    : getPrintProfile(readClinicalPrintSettings(null), id);
  const scale = Math.min(
    1,
    Math.max(0.1, (previewWidth - 32) / ((safe.widthMm * 96) / 25.4)),
  );
  const change = (patch: Partial<PrintProfile>) =>
    setDraft((current) => ({
      ...current,
      profiles: {
        ...current.profiles,
        [id]: { ...getPrintProfile(current, id), ...patch },
      },
    }));
  const save = async () => {
    if (!validation.success) return;
    setSaving(true);
    try {
      const latest = await utils.client.medical.getSystemSetting.query({
        key: PRINT_SETTINGS_KEY,
      });
      const config = readClinicalPrintSettings(latest?.value);
      config.profiles[id] = validation.data;
      await update.mutateAsync({ key: PRINT_SETTINGS_KEY, value: config });
      setClinicalPrintSettings(config);
      await utils.medical.getSystemSetting.invalidate({
        key: PRINT_SETTINGS_KEY,
      });
      toast.success("تم حفظ إعدادات الطباعة");
    } catch {
      toast.error("تعذر حفظ إعدادات الطباعة");
    } finally {
      setSaving(false);
    }
  };
  const download = async () => {
    if (!validation.success || !actualPaper.current) {
      toast.error("انتظر تحميل المستند أولاً");
      return;
    }
    setExporting(true);
    try {
      const ok = await exportElementToPdf({
        fileName: `print-preview-${id}.pdf`,
        element: actualPaper.current,
        printProfile: { ...safe, enabled: true },
      });
      if (!ok) toast.error("تعذر إنشاء ملف التجربة");
    } catch {
      toast.error("تعذر إنشاء ملف التجربة");
    } finally {
      setExporting(false);
    }
  };
  if (query.isLoading)
    return (
      <div role="status" className="p-6">
        جارٍ تحميل إعدادات الطباعة…
      </div>
    );
  if (query.error)
    return (
      <div role="alert" className="p-6">
        <p>تعذر تحميل إعدادات الطباعة</p>
        <Button onClick={() => query.refetch()}>إعادة المحاولة</Button>
      </div>
    );
  return (
    <main className="print-settings" data-panel={panel} dir="rtl">
      <header className="print-settings-heading">
        <h1>إعدادات الطباعة</h1>
        <Select
          value={id}
          onValueChange={(value) => setId(value as PrintProfileId)}
        >
          <SelectTrigger aria-label="نوع المستند">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PRINT_DOCUMENTS.map((item) => (
              <SelectItem key={item.id} value={item.id}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </header>
      <div
        className="print-settings-mobile-tabs"
        role="group"
        aria-label="عرض إعدادات الطباعة"
      >
        {[
          ["settings", "الإعدادات"],
          ["preview", "المعاينة"],
        ].map(([value, label]) => (
          <Button
            key={value}
            variant={panel === value ? "default" : "outline"}
            aria-pressed={panel === value}
            onClick={() => setPanel(value)}
          >
            {label}
          </Button>
        ))}
      </div>
      <div className="print-settings-layout">
        <section
          className="print-settings-controls"
          aria-label="إعدادات المستند"
        >
          <label className="print-settings-enable">
            <span>تطبيق إعدادات مخصصة</span>
            <Switch
              aria-label="تطبيق إعدادات مخصصة"
              checked={profile.enabled}
              onCheckedChange={(enabled) => change({ enabled })}
            />
          </label>
          <div className="print-settings-presets">
            <Select
              value={
                safe.widthMm === 210 && safe.heightMm === 297
                  ? "a4"
                  : safe.widthMm === 148 && safe.heightMm === 210
                    ? "a5"
                    : safe.widthMm === 215.9 && safe.heightMm === 279.4
                      ? "letter"
                      : "custom"
              }
              onValueChange={(value) => {
                if (value === "a4") change({ widthMm: 210, heightMm: 297 });
                if (value === "a5") change({ widthMm: 148, heightMm: 210 });
                if (value === "letter")
                  change({ widthMm: 215.9, heightMm: 279.4 });
              }}
            >
              <SelectTrigger aria-label="مقاس الورق">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="a4">A4</SelectItem>
                <SelectItem value="a5">A5</SelectItem>
                <SelectItem value="letter">Letter</SelectItem>
                <SelectItem value="custom">مخصص</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              title="تدوير الورقة"
              aria-label="تدوير الورقة"
              onClick={() =>
                change({ widthMm: profile.heightMm, heightMm: profile.widthMm })
              }
            >
              <RotateCw size={18} />
            </Button>
          </div>
          <div className="print-settings-dimensions">
            {dimensions.map(({ key, label, max }) => (
              <div key={key} className="print-dimension" data-dimension={key}>
                <label htmlFor={`print-${key}`}>
                  {label} <span>سم</span>
                </label>
                <Input
                  id={`print-${key}`}
                  type="number"
                  min={key === "widthMm" || key === "heightMm" ? 7 : 0}
                  max={max / 10}
                  step="0.1"
                  value={profile[key] / 10}
                  onChange={(event) =>
                    change({
                      [key]: Math.round(Number(event.target.value) * 100) / 10,
                    })
                  }
                />
                <div className="print-dimension-slider">
                  <Button
                    variant="ghost"
                    aria-label={`تقليل ${label}`}
                    title={`تقليل ${label}`}
                    onClick={() =>
                      change({
                        [key]: Math.max(
                          key === "widthMm" || key === "heightMm" ? 70 : 0,
                          profile[key] - 1,
                        ),
                      })
                    }
                  >
                    <Minus size={16} />
                  </Button>
                  <input
                    type="range"
                    aria-label={`${label} بالشريط`}
                    min={key === "widthMm" || key === "heightMm" ? 70 : 0}
                    max={max}
                    step={1}
                    value={profile[key]}
                    onChange={(event) =>
                      change({ [key]: Number(event.target.value) })
                    }
                  />
                  <Button
                    variant="ghost"
                    aria-label={`زيادة ${label}`}
                    title={`زيادة ${label}`}
                    onClick={() =>
                      change({ [key]: Math.min(max, profile[key] + 1) })
                    }
                  >
                    <Plus size={16} />
                  </Button>
                </div>
              </div>
            ))}
          </div>
          <label className="print-settings-text">
            نص إضافي أعلى المستند
            <Textarea
              value={profile.header}
              maxLength={1000}
              onChange={(event) => change({ header: event.target.value })}
            />
          </label>
          <label className="print-settings-text">
            نص إضافي أسفل المستند
            <Textarea
              value={profile.footer}
              maxLength={1000}
              onChange={(event) => change({ footer: event.target.value })}
            />
          </label>
          <SheetPrintLayoutSettings />
          {!validation.success ? (
            <p role="alert" className="text-destructive">
              {validation.error.issues[0]?.message}
            </p>
          ) : null}
        </section>
        <section
          className="print-settings-preview"
          aria-label="معاينة المقاس والهوامش"
          ref={previewHost}
        >
          <div className="print-settings-preview-heading">
            <strong>
              {safe.widthMm / 10} × {safe.heightMm / 10} سم
            </strong>
            <span>معاينة المستند الفعلي</span>
            {!profile.enabled ? <span>التخصيص غير مفعّل</span> : null}
          </div>
          <form
            className="print-preview-address"
            onSubmit={(event) => {
              event.preventDefault();
              try {
                const url = new URL(sourceInput, window.location.origin);
                const expected = new URL(
                  printPreviewRoutes[id],
                  window.location.origin,
                ).pathname;
                if (
                  url.origin !== window.location.origin ||
                  !(
                    url.pathname === expected ||
                    url.pathname.startsWith(`${expected}/`) ||
                    resolvePrintDocument(url.pathname)?.id === id
                  )
                )
                  throw new Error();
                setSourcePath(`${url.pathname}${url.search}`);
              } catch {
                toast.error("اختر رابطًا من نفس نوع المستند داخل النظام");
              }
            }}
          >
            <Input
              aria-label="رابط صفحة المستند"
              value={sourceInput}
              onChange={(event) => setSourceInput(event.target.value)}
              dir="ltr"
            />
            <Button type="submit" variant="outline">
              عرض
            </Button>
          </form>
          <div
            className="print-settings-paper-space"
            style={{
              height:
                Math.max((safe.heightMm * 96) / 25.4, paperHeight) * scale + 24,
            }}
          >
            <div
              ref={paper}
              className="print-settings-paper"
              style={{
                width: `${safe.widthMm}mm`,
                minHeight: `${safe.heightMm}mm`,
                padding: 0,
                transform: `scale(${scale})`,
              }}
            >
              <ActualPrintPreview
                key={`${id}:${sourcePath}`}
                id={id}
                profile={safe}
                sourcePath={sourcePath}
                onPaper={bindPaper}
              />
            </div>
            <div
              aria-hidden
              className="print-settings-margin-guide"
              style={{
                width: `${((safe.widthMm * 96) / 25.4) * scale}px`,
                height: `${((safe.heightMm * 96) / 25.4) * scale}px`,
                padding: `${((safe.topMm * 96) / 25.4) * scale}px ${((safe.rightMm * 96) / 25.4) * scale}px ${((safe.bottomMm * 96) / 25.4) * scale}px ${((safe.leftMm * 96) / 25.4) * scale}px`,
              }}
            >
              <div />
            </div>
          </div>
        </section>
      </div>
      <footer className="print-settings-save">
        <Button disabled={saving || !validation.success} onClick={save}>
          <Save size={18} />
          {saving ? "جارٍ الحفظ…" : "حفظ إعدادات المستند"}
        </Button>
        <Button
          variant="outline"
          disabled={exporting || !validation.success}
          onClick={download}
        >
          <Download size={18} />
          تجربة PDF
        </Button>
        <Button
          variant="ghost"
          title="استعادة التصميم الأصلي لهذا المستند"
          disabled={saving}
          onClick={() =>
            change(getPrintProfile(readClinicalPrintSettings(null), id))
          }
        >
          <RotateCcw size={18} />
          التصميم الأصلي
        </Button>
      </footer>
    </main>
  );
}
