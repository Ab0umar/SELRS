import { normalizeTemplateName } from "./prescription-template";
type Test = {
  id: number | string;
  name: string;
  type?: string;
  isActive?: boolean;
};
export function testNameCandidates(name: string, catalog: Test[]) {
  const query = normalizeTemplateName(name);
  if (!query) return [];
  return catalog.filter(
    (item) =>
      item.isActive !== false &&
      ` ${normalizeTemplateName(item.name)} `.includes(` ${query} `),
  );
}
export function resolveTestNames(
  text: string,
  catalog: Test[],
  _field?: string,
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
