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
      "افتح قسم النموذج المطابق أولًا؛ لا يوجد حقل وحيد لهذا الاقتراح هنا.",
    );
  const element = candidates[0];
  if (!element.isConnected || element.disabled || element.readOnly)
    throw new Error("هذا الحقل غير قابل للتعديل.");
  if (!text.trim()) throw new Error("الاقتراح فارغ.");
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
      "تغيّر الحقل أو أُغلق. التراجع لن يمسح التعديلات الأحدث.",
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
