let xlsxPromise: Promise<typeof import("xlsx")> | null = null;

export function loadXlsx() {
  if (!xlsxPromise) {
    xlsxPromise = import("xlsx");
  }
  return xlsxPromise;
}
