import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAssistantForm } from "./AssistantFields";
import {
  appendPrescriptionTemplate,
  normalizeTemplateName,
  type PrescriptionTemplate,
  type PrescriptionDraft,
} from "./prescription-template";
export default function PrescriptionTemplateReview({ text }: { text: string }) {
  const form = useAssistantForm();
  const [search, setSearch] = useState(text);
  const [matches, setMatches] = useState<PrescriptionTemplate[]>([]);
  const [selected, setSelected] = useState<PrescriptionTemplate>();
  const [message, setMessage] = useState("");
  const [receipt, setReceipt] = useState<{
    key: symbol;
    before: PrescriptionDraft;
    after: PrescriptionDraft;
  }>();
  const active = () => {
    const entries = Array.from(
      form?.prescriptions.current.entries() ?? [],
    ).filter(
      ([, entry]) =>
        entry.element.isConnected && entry.element.getClientRects().length > 0,
    );
    if (form?.disabled || entries.length !== 1)
      throw new Error(
        "افتح قسم الروشتة أولًا. لا توجد روشتة واحدة قابلة للتعديل.",
      );
    const [key, entry] = entries[0];
    const binding = entry.get();
    if (binding.disabled)
      throw new Error("الروشتة غير قابلة للتعديل أو ما زالت قيد التحميل.");
    return { key, binding };
  };
  return (
    <section
      className="space-y-2 rounded border p-3"
      aria-label="Prescription template review"
    >
      <p>
        ابحث عن قالب روشتة بالاسم وراجع تعليماته المحفوظة قبل الإضافة. الأدوية
        الموجودة تبقى كما هي.
      </p>
      <Input
        aria-label="Prescription template name"
        value={search}
        disabled={Boolean(receipt)}
        onChange={(event) => {
          setSearch(event.target.value);
          setMatches([]);
          setSelected(undefined);
        }}
        dir="auto"
      />
      <Button
        type="button"
        variant="outline"
        disabled={Boolean(receipt)}
        onClick={() => {
          try {
            const { binding } = active();
            const query = normalizeTemplateName(search);
            const exact = binding.templates.filter(
              (template) => normalizeTemplateName(template.name) === query,
            );
            const found = exact.length
              ? exact
              : binding.templates.filter((template) => {
                  const name = normalizeTemplateName(template.name);
                  return (
                    name &&
                    (` ${query} `.includes(` ${name} `) ||
                      (query.length >= 3 && name.includes(query)))
                  );
                });
            setMatches(found);
            setSelected(undefined);
            setMessage(
              found.length
                ? "اختر قالبًا وراجعه."
                : "لا يوجد قالب مطابق. لم يتم إنشاء أي محتوى بديل.",
            );
          } catch (error) {
            setMessage(
              error instanceof Error
                ? error.message
                : "تعذّر البحث عن القوالب.",
            );
          }
        }}
      >
        بحث عن القوالب
      </Button>
      {matches.map((template) => (
        <Button
          key={template.id}
          type="button"
          variant="outline"
          disabled={Boolean(receipt)}
          onClick={() => setSelected(template)}
        >
          {template.name}
        </Button>
      ))}
      {selected && (
        <>
          <p dir="auto">{selected.name}</p>
          {selected.items.map((item, index) => (
            <p key={index} dir="auto">
              {[
                item.medicationName,
                item.dosage,
                item.frequency,
                item.duration,
                item.instructions,
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
          ))}
          <Button
            type="button"
            disabled={Boolean(receipt)}
            onClick={() => {
              try {
                const { key, binding } = active();
                const current = binding.templates.find(
                  (template) => template.id === selected.id,
                );
                if (
                  !current ||
                  JSON.stringify(current) !== JSON.stringify(selected)
                )
                  throw new Error(
                    "تغيّر القالب. ابحث عنه وراجعه مرة أخرى.",
                  );
                const after = appendPrescriptionTemplate(binding, current);
                if (after.ids.length === binding.draft.ids.length) {
                  setMessage(
                    "كل الأدوية موجودة بالفعل. لم تتغير تعليماتها.",
                  );
                  return;
                }
                const before = binding.draft;
                binding.change(after);
                setReceipt({ key, before, after });
                setMessage(
                  "أُضيف إلى المسودة فقط. راجع واحفظ من النموذج.",
                );
              } catch (error) {
                setMessage(
                  error instanceof Error
                    ? error.message
                    : "تعذّرت إضافة القالب.",
                );
              }
            }}
          >
            تأكيد وإضافة القالب
          </Button>
        </>
      )}
      {receipt && (
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            try {
              const { key, binding } = active();
              if (
                key !== receipt.key ||
                JSON.stringify(binding.draft) !== JSON.stringify(receipt.after)
              )
                throw new Error(
                  "تغيّرت الروشتة أو أُغلقت. لا يمكن للتراجع استبدال التعديلات الأحدث.",
                );
              binding.change(receipt.before);
              setReceipt(undefined);
              setMessage("تم التراجع عن الإضافة إلى المسودة.");
            } catch (error) {
              setMessage(
                error instanceof Error ? error.message : "تعذّر التراجع.",
              );
            }
          }}
        >
          تراجع عن إضافة القالب
        </Button>
      )}
      {message && <p role="status">{message}</p>}
    </section>
  );
}
