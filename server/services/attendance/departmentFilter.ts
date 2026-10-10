/** Stored attendance department values have Arabic and legacy English variants. */
export function getAttendanceDepartmentValues(filter: string): string[] {
  const normalized = filter.trim().toLocaleLowerCase();
  if (["center", "centre", "مركز", "المركز", "الفحوصات"].includes(normalized)) {
    return ["مركز", "المركز", "center", "centre", "المركز والعيادة"];
  }
  if (["clinic", "عيادة", "العيادة"].includes(normalized)) {
    return ["عيادة", "العيادة", "clinic", "المركز والعيادة"];
  }
  if (["both", "all", "الكل"].includes(normalized)) {
    return [
      "مركز",
      "المركز",
      "center",
      "centre",
      "عيادة",
      "العيادة",
      "clinic",
      "المركز والعيادة",
    ];
  }
  if (normalized === "المركز والعيادة") return ["المركز والعيادة"];
  return [filter];
}
