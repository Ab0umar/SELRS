export const OPERATION_COLUMNS = [
  {
    id: "laser",
    label: "PRK + LASIK",
    matches: (operation: string) =>
      operation.includes("prk") ||
      operation.includes("lasik") ||
      operation.includes("ليزك"),
  },
  {
    id: "femto",
    label: "F.S + F.L",
    matches: (operation: string) =>
      ["fs", "fl"].includes(operation.replace(/[.\s_-]/g, "")) ||
      operation.includes("femto") ||
      operation.includes("فيمتو") ||
      operation.includes("فمتو") ||
      operation.includes("سمايل"),
  },
  {
    id: "surgery",
    label: "المياه البيضاء والزرقاء والحول والياج والعدسات",
    matches: (operation: string) =>
      [
        "cataract",
        "كتاراكت",
        "كاتاراكت",
        "مياه بيضاء",
        "glaucoma",
        "زرقاء",
        "squint",
        "حول",
        "yag",
        "ياج",
        "iol",
        "icl",
      ].some((term) => operation.includes(term)),
  },
  { id: "other", label: "عمليات أخرى", matches: () => true },
] as const;

export function getOperationColumnId(operation: string) {
  const normalized = operation.toLowerCase().trim();
  return (
    (
      OPERATION_COLUMNS.find(
        (column) => column.id === "femto" && column.matches(normalized),
      ) ?? OPERATION_COLUMNS.find((column) => column.matches(normalized))
    )?.id ?? "other"
  );
}
