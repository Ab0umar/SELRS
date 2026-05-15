import { describe, expect, it } from "vitest";

import {
  getAccessLevelCopy,
  getWriteAccessColumns,
} from "./admin-permissions-ui";

describe("admin permissions UI copy", () => {
  it("describes the stored none/r/rw permission levels without implying independent write actions", () => {
    expect(getAccessLevelCopy("none")).toEqual({
      label: "لا وصول",
      detail: "لن يظهر هذا المسار لهذا الدور.",
    });
    expect(getAccessLevelCopy("r")).toEqual({
      label: "عرض فقط",
      detail: "يمكن فتح الصفحة ومراجعة البيانات دون تعديل.",
    });
    expect(getAccessLevelCopy("rw")).toEqual({
      label: "عرض وتعديل كامل",
      detail: "يشمل الإنشاء والتعديل والحذف عندما تدعم الصفحة ذلك.",
    });
  });

  it("uses one write-control label because create/edit/delete share the same rw value", () => {
    expect(getWriteAccessColumns()).toEqual(["تعديل كامل"]);
  });
});
