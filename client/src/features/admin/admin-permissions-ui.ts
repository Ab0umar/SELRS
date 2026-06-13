export type PermissionAccessLevel = "none" | "r" | "rw";

type AccessLevelCopy = {
  label: string;
  detail: string;
};

const ACCESS_LEVEL_COPY: Record<PermissionAccessLevel, AccessLevelCopy> = {
  none: {
    label: "لا وصول",
    detail: "لن يظهر هذا المسار لهذا الدور.",
  },
  r: {
    label: "عرض فقط",
    detail: "يمكن فتح الصفحة ومراجعة البيانات دون تعديل.",
  },
  rw: {
    label: "عرض وتعديل كامل",
    detail: "يشمل الإنشاء والتعديل والحذف عندما تدعم الصفحة ذلك.",
  },
};

export function getAccessLevelCopy(
  level: PermissionAccessLevel,
): AccessLevelCopy {
  return ACCESS_LEVEL_COPY[level];
}

export function getWriteAccessColumns(): string[] {
  return ["تعديل كامل"];
}
