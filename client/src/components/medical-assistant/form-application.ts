export type AppliedText = {
  element: HTMLTextAreaElement;
  before: string;
  after: string;
};

export function applyProposal(
  root: HTMLElement,
  field: string,
  text: string,
): AppliedText {
  const candidates = Array.from(
    root.querySelectorAll<HTMLTextAreaElement>(
      "textarea[data-medical-proposals]",
    ),
  ).filter(
    (element) =>
      element.dataset.medicalProposals?.split(" ").includes(field) &&
      element.getClientRects().length > 0,
  );
  if (candidates.length !== 1)
    throw new Error(
      "Open the matching form section first. This proposal has no unique destination here.",
    );
  const element = candidates[0];
  if (!element.isConnected || element.disabled || element.readOnly)
    throw new Error("This field is not editable.");
  if (!text.trim()) throw new Error("The proposal is empty.");
  const before = element.value;
  const after = before ? `${before}\n${text.trim()}` : text.trim();
  write(element, after);
  return { element, before, after };
}

export function undoProposal(root: HTMLElement, applied: AppliedText) {
  const { element, before, after } = applied;
  if (
    !root.contains(element) ||
    !element.isConnected ||
    element.disabled ||
    element.readOnly ||
    element.value !== after
  )
    throw new Error(
      "The field changed or closed. Undo cannot overwrite newer edits.",
    );
  write(element, before);
}

function write(element: HTMLTextAreaElement, text: string) {
  Object.getOwnPropertyDescriptor(
    HTMLTextAreaElement.prototype,
    "value",
  )!.set!.call(element, text);
  element.dispatchEvent(new Event("input", { bubbles: true }));
}
