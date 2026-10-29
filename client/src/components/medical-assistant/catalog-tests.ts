import { normalizeTemplateName } from "./prescription-template";
type Test = {
  id: number | string;
  name: string;
  type?: string;
  isActive?: boolean;
};
export function resolveTestNames(
  text: string,
  catalog: Test[],
  field?: string,
) {
  const names = text
    .split("\n")
    .map((name) => name.trim())
    .filter(Boolean);
  if (!names.length) return [];
  return names.map((name) => {
    const matches = catalog.filter(
      (item) =>
        item.isActive !== false &&
        (!field ||
          (field === "labs"
            ? item.type === "lab"
            : ["imaging", "examination"].includes(item.type ?? ""))) &&
        normalizeTemplateName(item.name) === normalizeTemplateName(name),
    );
    if (
      matches.length !== 1 ||
      !Number.isSafeInteger(Number(matches[0].id)) ||
      Number(matches[0].id) <= 0
    )
      throw new Error(
        "اسم فحص غير مطابق بشكل وحيد للكتالوج؛ يلزم اختيار الطبيب.",
      );
    return Number(matches[0].id);
  });
}
