import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import {
  coerceSheetDesignerConfig,
  saveSheetDesignerConfig,
} from "@/lib/sheetDesigner";

const groups = [
  { id: "consultant", label: "شيت الاستشاري", section: "layout" },
  { id: "specialist", label: "شيت الأخصائي", section: "layout" },
  { id: "lasik", label: "شيت الليزك", section: "layout" },
  { id: "external", label: "الشيت الخارجي", section: "layout" },
  { id: "pentacam", label: "شيت البنتاكام", section: "layout" },
  {
    id: "followupConsultant",
    label: "متابعة الاستشاري",
    section: "followupConsultant",
  },
  { id: "followupLasik", label: "متابعة الليزك", section: "followupLasik" },
  { id: "refractionPrint", label: "كارت النظارة", section: "refractionPrint" },
] as const;
const fields = [
  ["offsetXmm", "الإزاحة الأفقية (مم)"],
  ["offsetYmm", "الإزاحة الرأسية (مم)"],
  ["scale", "المقياس"],
] as const;
const refractionFields = [
  ["metaFontSizePx", "حجم خط البيانات"],
  ["titleFontSizePx", "حجم خط العنوان"],
  ["tableFontSizePx", "حجم خط الجدول"],
  ["rowLabelFontSizePx", "حجم خط تسميات الصفوف"],
  ["rowHeightPx", "ارتفاع الصف"],
  ["cardWidthMm", "عرض الكارت (مم)"],
  ["topOffsetMm", "الإزاحة العلوية (مم)"],
] as const;
const settingKey = "sheet_designer_config";

export default function SheetPrintLayoutSettings() {
  const query = trpc.medical.getSystemSetting.useQuery({ key: settingKey });
  const update = trpc.medical.updateSystemSetting.useMutation();
  const utils = trpc.useUtils();
  const [changes, setChanges] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const config = coerceSheetDesignerConfig(query.data?.value);
  const invalid = Object.entries(changes).some(([path, raw]) => {
    const value = Number(raw);
    return (
      !raw.trim() ||
      !Number.isFinite(value) ||
      (path.endsWith(".scale") && value <= 0) ||
      (path.endsWith(".tableGapMm") && value < 0) ||
      (path.startsWith("refractionPrint.") &&
        !path.endsWith(".topOffsetMm") &&
        value <= 0)
    );
  });
  const save = async () => {
    if (invalid || !Object.keys(changes).length) return;
    setSaving(true);
    try {
      const latest = await utils.client.medical.getSystemSetting.query({
        key: settingKey,
      });
      const merged = coerceSheetDesignerConfig(latest?.value);
      for (const [path, raw] of Object.entries(changes)) {
        const parts = path.split(".");
        let target: Record<string, unknown> = { ...merged };
        for (const part of parts.slice(0, -1))
          target = target[part] as Record<string, unknown>;
        target[parts[parts.length - 1]] = Number(raw);
      }
      await update.mutateAsync({ key: settingKey, value: merged });
      saveSheetDesignerConfig(merged);
      setChanges({});
      await utils.medical.getSystemSetting.invalidate({ key: settingKey });
      toast.success("تم حفظ ضبط الشيتات للطباعة");
    } catch {
      toast.error("تعذر حفظ ضبط الشيتات للطباعة");
    } finally {
      setSaving(false);
    }
  };
  return (
    <details className="rounded-lg border border-border p-4">
      <summary className="cursor-pointer font-medium">
        ضبط الشيتات للطباعة — إعدادات متقدمة
      </summary>
      <p className="my-3 text-sm text-muted-foreground">
        ضبط محتوى الشيت داخل الورقة. احفظ التعديلات ثم أعد فتح معاينة المستند
        لتجربتها.
      </p>
      {query.isLoading ? (
        <p role="status">جارٍ تحميل إعدادات الشيتات…</p>
      ) : query.isError ? (
        <div role="alert">
          تعذر تحميل إعدادات الشيتات.{" "}
          <Button variant="outline" onClick={() => query.refetch()}>
            إعادة المحاولة
          </Button>
        </div>
      ) : (
        <fieldset disabled={saving} className="space-y-4">
          {groups.map((group) => {
            const values =
              group.section === "layout"
                ? config.layout[group.id as keyof typeof config.layout]
                : config[group.section];
            const entries: ReadonlyArray<readonly [string, string]> =
              group.section === "refractionPrint"
                ? refractionFields
                : group.section === "layout"
                  ? fields
                  : [...fields, ["tableGapMm", "المسافة بين الجداول (مم)"]];
            return (
              <section key={group.id} className="space-y-2">
                <h3 className="font-medium">{group.label}</h3>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {entries.map(([key, label]) => {
                    const path =
                      group.section === "layout"
                        ? `layout.${group.id}.${key}`
                        : `${group.section}.${key}`;
                    return (
                      <label key={path} className="space-y-1 text-sm">
                        <span>{label}</span>
                        <Input
                          type="number"
                          step="any"
                          value={
                            changes[path] ??
                            String((values as Record<string, unknown>)[key])
                          }
                          onChange={(event) =>
                            setChanges((current) => ({
                              ...current,
                              [path]: event.target.value,
                            }))
                          }
                        />
                      </label>
                    );
                  })}
                </div>
              </section>
            );
          })}
          {invalid && (
            <p role="alert" className="text-destructive">
              أدخل أرقامًا صحيحة؛ المقياس والأحجام أكبر من صفر، والمسافة بين
              الجداول لا تقل عن صفر.
            </p>
          )}
          <Button
            disabled={invalid || !Object.keys(changes).length}
            onClick={save}
          >
            {saving ? "جارٍ الحفظ…" : "حفظ ضبط الشيتات"}
          </Button>
        </fieldset>
      )}
    </details>
  );
}
