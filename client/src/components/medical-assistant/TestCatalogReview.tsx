import { useEffect, useRef, useState } from "react";
import { useAssistantForm } from "./AssistantFields";
import { resolveTestNames } from "./catalog-tests";
import { Button } from "@/components/ui/button";

export default function TestCatalogReview({
  text,
  field,
}: {
  text: string;
  field: "imaging" | "labs";
}) {
  const form = useAssistantForm();
  const initialized = useRef("");
  const owned = useRef(new Set<number>());
  const [chosen, setChosen] = useState<Record<number, number>>({});
  const names = text
    .split("\n")
    .map((value) => value.trim())
    .filter(Boolean);
  const binding = form?.getTests?.();
  useEffect(() => {
    if (!binding || binding.disabled || initialized.current === text) return;
    initialized.current = text;
    const selected: Record<number, number> = {};
    for (const [index, name] of names.entries()) {
      try {
        selected[index] = resolveTestNames(name, binding.catalog, field)[0];
      } catch {
        /* Requires a catalog choice below. */
      }
    }
    setChosen(selected);
    const ids = Object.values(selected);
    for (const id of ids) if (!binding.ids.includes(id)) owned.current.add(id);
    if (ids.some((id) => !binding.ids.includes(id))) binding.append(ids);
  }, [binding, text, field]);
  if (!binding || !form) return null;
  const catalog = binding.catalog.filter(
    (item) =>
      item.isActive !== false &&
      (field === "labs"
        ? item.type === "lab"
        : ["imaging", "examination"].includes(item.type ?? "")),
  );
  return (
    <section aria-label="اختيارات الفحوصات" className="space-y-2">
      {names.map((name, index) => (
        <label key={`${index}:${name}`} className="block">
          <span className="block text-sm">{name}</span>
          <select
            aria-label={`اختيار فحص: ${name}`}
            className="w-full rounded border p-2"
            disabled={binding.disabled || form.disabled}
            value={chosen[index] ?? ""}
            onChange={(event) => {
              const id = Number(event.target.value);
              const current = form.getTests?.();
              if (
                !current ||
                current.disabled ||
                !catalog.some((item) => Number(item.id) === id)
              )
                return;
              const previousId = chosen[index];
              if (
                previousId &&
                previousId !== id &&
                owned.current.has(previousId) &&
                Object.values(chosen).filter((value) => value === previousId)
                  .length === 1
              ) {
                current.remove([previousId]);
                owned.current.delete(previousId);
              }
              if (!current.ids.includes(id)) owned.current.add(id);
              current.append([id]);
              setChosen((previous) => ({ ...previous, [index]: id }));
            }}
          >
            <option value="" disabled>
              اختَر الفحص من الكتالوج
            </option>
            {catalog.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
      ))}
      {names.some((_, index) => !chosen[index]) && (
        <p role="status">
          بعض الفحوصات لم تُضف؛ اختَر المطابقة الصحيحة من الكتالوج قبل الحفظ.
        </p>
      )}
      {owned.current.size > 0 && (
        <Button
          type="button"
          variant="outline"
          disabled={binding.disabled || form.disabled}
          onClick={() => {
            const current = form.getTests?.();
            if (!current || current.disabled) return;
            const ids = [...owned.current];
            current.remove(ids);
            setChosen((previous) =>
              Object.fromEntries(
                Object.entries(previous).filter(([, id]) => !ids.includes(id)),
              ),
            );
            owned.current.clear();
          }}
        >
          تراجع عن فحوصات هذا المقترح
        </Button>
      )}
    </section>
  );
}
