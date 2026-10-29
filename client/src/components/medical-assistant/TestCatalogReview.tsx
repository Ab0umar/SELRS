import { useEffect, useRef, useState } from "react";
import { useAssistantForm } from "./AssistantFields";
import { resolveTestNames, testNameCandidates } from "./catalog-tests";
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
  const ownedManual = useRef(new Map<string, string>());
  const [chosen, setChosen] = useState<Record<number, number>>({});
  const [confirmed, setConfirmed] = useState<Record<number, boolean>>({});
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
    setConfirmed({});
    const ids = Object.values(selected);
    const staleIds = [...owned.current].filter((id) => !ids.includes(id));
    if (staleIds.length) binding.remove(staleIds);
    for (const id of staleIds) owned.current.delete(id);
    for (const [name, snapshot] of ownedManual.current) {
      if (!names.includes(name)) {
        if (
          snapshot ===
          JSON.stringify(
            binding.manualItems?.find((item) => item.testName === name),
          )
        )
          binding.removeManual?.(name);
        ownedManual.current.delete(name);
      }
    }
    for (const id of ids) if (!binding.ids.includes(id)) owned.current.add(id);
    if (ids.some((id) => !binding.ids.includes(id))) binding.append(ids);
  }, [binding, text, field]);
  if (!binding || !form) return null;
  const catalog = binding.catalog.filter((item) => item.isActive !== false);
  const optionsFor = (name: string) => {
    const candidates = testNameCandidates(name, catalog);
    const candidateIds = new Set(candidates.map((item) => item.id));
    return [
      ...candidates,
      ...catalog.filter((item) => !candidateIds.has(item.id)),
    ];
  };
  return (
    <section aria-label="اختيارات الفحوصات" className="space-y-2">
      {names.map((name, index) => (
        <div key={`${index}:${name}`} className="block">
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
              if (confirmed[index]) {
                if (
                  ownedManual.current.get(name) ===
                  JSON.stringify(
                    current.manualItems?.find((item) => item.testName === name),
                  )
                )
                  current.removeManual?.(name);
                ownedManual.current.delete(name);
                setConfirmed((previous) => ({ ...previous, [index]: false }));
              }
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
            {optionsFor(name).map((item) => (
              <option key={item.id} value={item.id}>
                {item.name} ({item.type})
              </option>
            ))}
          </select>
          {!chosen[index] && !confirmed[index] && binding.appendManual && (
            <Button
              className="h-auto max-w-full whitespace-normal text-start"
              type="button"
              variant="outline"
              disabled={binding.disabled || form.disabled}
              onClick={() => {
                const current = form.getTests?.();
                if (!current || current.disabled || form.disabled) return;
                if (
                  !current.manualItems?.some((item) => item.testName === name)
                ) {
                  const item = {
                    testName: name,
                    catalogConfirmed: true as const,
                    testType:
                      field === "labs"
                        ? ("lab" as const)
                        : ("imaging" as const),
                  };
                  current.appendManual?.(item);
                  ownedManual.current.set(name, JSON.stringify(item));
                }
                setConfirmed((previous) => ({ ...previous, [index]: true }));
              }}
            >
              تأكيد «{name}» وإضافته للطلب بدون إضافته للكتالوج
            </Button>
          )}
          {confirmed[index] && (
            <span className="block text-sm">
              أُضيف الاسم المؤكد لمسودة الطلب.
            </span>
          )}
        </div>
      ))}
      {names.some((_, index) => !chosen[index] && !confirmed[index]) && (
        <p role="status">
          بعض الأسماء تحتاج اختيار النوع المناسب أو تأكيد الاسم كما قيل؛ لم تُضف
          تلقائيًا.
        </p>
      )}
      {(owned.current.size > 0 || ownedManual.current.size > 0) && (
        <Button
          type="button"
          variant="outline"
          disabled={binding.disabled || form.disabled}
          onClick={() => {
            const current = form.getTests?.();
            if (!current || current.disabled) return;
            const ids = [...owned.current];
            current.remove(ids);
            for (const [name, snapshot] of ownedManual.current) {
              if (
                JSON.stringify(
                  current.manualItems?.find((item) => item.testName === name),
                ) === snapshot
              )
                current.removeManual?.(name);
            }
            ownedManual.current.clear();
            setConfirmed({});
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
