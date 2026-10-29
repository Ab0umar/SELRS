import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { useAssistantForm } from "./AssistantFields";
import {
  appendPrescriptionTemplate,
  normalizeTemplateName,
  type PrescriptionDraft,
} from "./prescription-template";
import type { MedicalProposals } from "@shared/medical-assistant";

type Medicine = NonNullable<
  MedicalProposals["proposals"][number]["medications"]
>[number];
export default function MedicationCatalogReview({
  medicines,
}: {
  medicines: Medicine[];
}) {
  const form = useAssistantForm();
  const [message, setMessage] = useState("");
  const [added, setAdded] = useState<Record<number, boolean>>({});
  const receipts = useRef<
    Array<{
      before: PrescriptionDraft;
      after: PrescriptionDraft;
      addedBefore: Record<number, boolean>;
    }>
  >([]);
  const initialized = useRef(false);
  const binding = () => {
    const value = form?.getPrescription?.();
    if (form?.disabled || !value || value.disabled)
      throw new Error("كتالوج الأدوية أو مسودة الروشتة غير متاحين حاليًا.");
    return value;
  };
  const matches = (name: string) => {
    const catalog = form?.getPrescription?.()?.medications ?? [];
    const query = normalizeTemplateName(name);
    if (!query) return [];
    const exact = catalog.filter(
      (item) => normalizeTemplateName(item.name) === query,
    );
    return exact.length
      ? exact
      : catalog.filter(
          (item) =>
            query.length >= 3 &&
            ` ${normalizeTemplateName(item.name)} `.includes(` ${query} `),
        );
  };
  const add = (index: number, name: string, manual = false) => {
    try {
      const current = binding();
      const { name: _, source: __, ...instructions } = medicines[index];
      const after: PrescriptionDraft = manual
        ? {
            ...current.draft,
            manualItems: (current.draft.manualItems ?? []).some(
              (item) =>
                normalizeTemplateName(item.medicationName) ===
                normalizeTemplateName(name),
            )
              ? current.draft.manualItems
              : [
                  ...(current.draft.manualItems ?? []),
                  {
                    medicationName: name,
                    catalogConfirmed: true,
                    ...instructions,
                  },
                ],
          }
        : appendPrescriptionTemplate(current, {
            id: "catalog",
            name: "catalog",
            items: [{ medicationName: name, ...instructions }],
          });
      receipts.current.push({
        before: current.draft,
        after,
        addedBefore: added,
      });
      current.change(after);
      setAdded((previous) => ({ ...previous, [index]: true }));
      setMessage("أُضيف الدواء لمسودة الروشتة فقط. راجعها ثم احفظ الكشف.");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "تعذرت إضافة الدواء.",
      );
    }
  };
  useEffect(() => {
    if (initialized.current || form?.disabled) return;
    const current = form?.getPrescription?.();
    if (!current || current.disabled) return;
    initialized.current = true;
    let draft = current.draft;
    const nextAdded: Record<number, boolean> = {};
    for (const [index, medicine] of medicines.entries()) {
      const found = matches(medicine.name);
      if (
        found.length !== 1 ||
        normalizeTemplateName(found[0].name) !==
          normalizeTemplateName(medicine.name)
      )
        continue;
      try {
        const { name: _, source: __, ...instructions } = medicine;
        draft = appendPrescriptionTemplate(
          { ...current, draft },
          {
            id: "catalog",
            name: "catalog",
            items: [{ medicationName: found[0].name, ...instructions }],
          },
        );
        nextAdded[index] = true;
      } catch {
        /* Unsupported reference catalog IDs remain for explicit review. */
      }
    }
    if (Object.keys(nextAdded).length) {
      receipts.current.push({
        before: current.draft,
        after: draft,
        addedBefore: {},
      });
      current.change(draft);
      setAdded(nextAdded);
      setMessage(
        "الأسماء المطابقة بشكل وحيد أُضيفت لمسودة الروشتة؛ راجع الجرعات قبل الحفظ.",
      );
    }
  });
  return (
    <section className="space-y-2" aria-label="Medication catalog review">
      <p>
        البحث باسم الدواء فقط في كتالوج الأدوية، وليس في الوصفات الجاهزة.
        التفاصيل الناقصة تظل فارغة.
      </p>
      {medicines.map((medicine, index) => (
        <div key={index} className="rounded border p-2">
          <p dir="auto">{medicine.name}</p>
          <p dir="auto">
            {[
              medicine.dosage,
              medicine.frequency,
              medicine.duration,
              medicine.instructions,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
          {added[index] ? (
            <p>موجود في المسودة؛ تفاصيل الدواء الموجود سابقًا لم تُستبدل.</p>
          ) : (
            <>
              {matches(medicine.name).map((item) => (
                <Button
                  type="button"
                  variant="outline"
                  key={item.id}
                  onClick={() => add(index, item.name)}
                >
                  اختيار {item.name}
                </Button>
              ))}
              {!matches(medicine.name).length && (
                <p>
                  لا توجد مطابقة آمنة لهذا الاسم. راجع الاسم قبل إضافته كنص.
                </p>
              )}
              <Button
                className="h-auto max-w-full whitespace-normal text-start"
                type="button"
                variant="outline"
                disabled={form?.disabled || form?.getPrescription?.()?.disabled}
                onClick={() => add(index, medicine.name, true)}
              >
                تأكيد «{medicine.name}» وإضافته للروشتة بدون إضافته للكتالوج
              </Button>
            </>
          )}
        </div>
      ))}
      {Object.keys(added).length > 0 && (
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            try {
              const current = binding();
              const last = receipts.current.at(-1);
              if (
                !last ||
                JSON.stringify(last.after) !== JSON.stringify(current.draft)
              )
                throw new Error(
                  "الروشتة اتعدّلت؛ التراجع لن يمسح تعديلات الطبيب.",
                );
              current.change(last.before);
              receipts.current.pop();
              setAdded(last.addedBefore);
              setMessage("تم التراجع عن آخر إضافة فقط.");
            } catch (error) {
              setMessage(
                error instanceof Error ? error.message : "تعذّر التراجع.",
              );
            }
          }}
        >
          تراجع عن إضافة الأدوية
        </Button>
      )}
      {message && <p role="status">{message}</p>}
    </section>
  );
}
