import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
export default function EquipmentReferenceSettings({
  pageRole,
  designs,
}: {
  pageRole: "center" | "doctor";
  designs: { id: number; originalName: string; fileUrl: string }[];
}) {
  const [kind, setKind] = useState<"pentacam" | "slit-lamp">("pentacam");
  const [draft, setDraft] = useState<string>();
  const [message, setMessage] = useState("");
  const query = trpc.marketing.equipmentReferences.useQuery(
    { pageRole },
    { retry: false },
  );
  const save = trpc.marketing.setEquipmentReference.useMutation({
    retry: false,
  });
  const selected = draft ?? String(query.data?.[kind] ?? "");
  const image = designs.find((design) => String(design.id) === selected);
  return (
    <section
      dir="rtl"
      aria-label="صور الأجهزة الحقيقية"
      className="min-w-0 space-y-3 rounded-xl border border-border bg-card p-4"
    >
      <h2 className="font-semibold">صور الأجهزة الحقيقية</h2>
      <p className="text-sm text-muted-foreground">
        اختر صورة أصلية للجهاز وحده من مكتبة هذه الصفحة، بدون أشخاص أو بيانات
        مرضى، وليست شعارًا أو إعلانًا. تُستخدم الصورة نفسها مع اللوجو دون إعادة
        رسم الجهاز. بدون صورة محددة، يُستخدم رسم طبي توضيحي.
      </p>
      {query.error && <p role="alert">تعذر تحميل الصور المحددة للأجهزة.</p>}
      <label className="grid gap-2 text-sm">
        الجهاز
        <select
          className="min-h-11 min-w-0 w-full rounded-md border bg-background px-3"
          value={kind}
          disabled={save.isPending}
          onChange={(event) => {
            setKind(event.target.value as typeof kind);
            setDraft(undefined);
            setMessage("");
          }}
        >
          <option value="pentacam">البنتاكام وفحوصات ما قبل الليزك</option>
          <option value="slit-lamp">المصباح الشقي والكشف الدوري</option>
        </select>
      </label>
      <label className="grid gap-2 text-sm">
        الصورة الأصلية
        <select
          className="min-h-11 min-w-0 w-full rounded-md border bg-background px-3"
          value={selected}
          disabled={!query.data || save.isPending}
          onChange={(event) => {
            setDraft(event.target.value);
            setMessage("");
          }}
        >
          <option value="">رسم طبي توضيحي</option>
          {designs.map((design) => (
            <option key={design.id} value={design.id}>
              {design.originalName}
            </option>
          ))}
        </select>
      </label>
      {image && (
        <img
          src={image.fileUrl}
          alt="صورة الجهاز المحددة"
          className="h-40 max-w-full rounded-md object-contain"
        />
      )}
      <Button
        disabled={
          !query.data ||
          save.isPending ||
          selected === String(query.data[kind] ?? "")
        }
        onClick={async () => {
          try {
            await save.mutateAsync({
              pageRole,
              kind,
              referenceId: selected ? Number(selected) : null,
            });
            await query.refetch();
            setDraft(undefined);
            setMessage("تم حفظ صورة الجهاز لهذه الصفحة.");
          } catch {
            setMessage("تعذر حفظ الصورة؛ راجع اختيارك ثم أعد المحاولة.");
          }
        }}
      >
        {save.isPending ? "جارٍ الحفظ…" : "حفظ صورة الجهاز"}
      </Button>
      {message && <p role="status">{message}</p>}
    </section>
  );
}
