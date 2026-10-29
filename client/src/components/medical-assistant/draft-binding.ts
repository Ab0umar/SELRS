export type DraftBinding = {
  values: Record<string, string>;
  destinations: Partial<Record<string, string>>;
  accept?: (field: string, text: string) => boolean;
  change: (values: Record<string, string>) => void;
};
export function prepareDraftAdditions(
  binding: DraftBinding,
  proposals: Array<{ field: string; text: string }>,
) {
  const before: Record<string, string> = {};
  const after: Record<string, string> = {};
  const skipped: string[] = [];
  for (const proposal of proposals) {
    const destination = binding.destinations[proposal.field];
    if (
      !destination ||
      !(destination in binding.values) ||
      binding.accept?.(proposal.field, proposal.text) === false
    ) {
      skipped.push(proposal.field);
      continue;
    }
    before[destination] ??= binding.values[destination];
    const current = after[destination] ?? binding.values[destination];
    const text = proposal.text.trim();
    if (text && !current.split("\n").includes(text))
      after[destination] = [current, text].filter(Boolean).join("\n");
  }
  return { before, after, skipped };
}
export function assertDraftUndo(
  binding: DraftBinding,
  after: Record<string, string>,
) {
  if (
    Object.entries(after).some(([key, value]) => binding.values[key] !== value)
  )
    throw new Error(
      "المسودة اتعدّلت بعد التعبئة. التراجع لن يمسح تعديلات الطبيب.",
    );
}
