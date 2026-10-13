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
        "Open the prescription section first. No unique editable prescription is available.",
      );
    const [key, entry] = entries[0];
    const binding = entry.get();
    if (binding.disabled)
      throw new Error("The prescription is not editable or is still loading.");
    return { key, binding };
  };
  return (
    <section
      className="space-y-2 rounded border p-3"
      aria-label="Prescription template review"
    >
      <p>
        Find a named prescription template. Review its saved instructions before
        adding. Existing medicines are kept unchanged.
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
                ? "Choose and review a template."
                : "No matching template found. No replacement content was generated.",
            );
          } catch (error) {
            setMessage(
              error instanceof Error
                ? error.message
                : "Could not find templates.",
            );
          }
        }}
      >
        Find templates
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
                    "The template changed. Find and review it again.",
                  );
                const after = appendPrescriptionTemplate(binding, current);
                if (after.ids.length === binding.draft.ids.length) {
                  setMessage(
                    "All medicines already exist. Their instructions were left unchanged.",
                  );
                  return;
                }
                const before = binding.draft;
                binding.change(after);
                setReceipt({ key, before, after });
                setMessage(
                  "Added to the draft only. Review and save using the form.",
                );
              } catch (error) {
                setMessage(
                  error instanceof Error
                    ? error.message
                    : "Could not add the template.",
                );
              }
            }}
          >
            Confirm and add template
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
                  "The prescription changed or closed. Undo cannot overwrite newer edits.",
                );
              binding.change(receipt.before);
              setReceipt(undefined);
              setMessage("Draft addition undone.");
            } catch (error) {
              setMessage(
                error instanceof Error ? error.message : "Could not undo.",
              );
            }
          }}
        >
          Undo template addition
        </Button>
      )}
      {message && <p role="status">{message}</p>}
    </section>
  );
}
