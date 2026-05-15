import { describe, expect, it } from "vitest";

import { getUserRiskActionCopy } from "./admin-users-actions";

describe("admin user risky action copy", () => {
  it("names the affected user and consequence when deleting", () => {
    expect(
      getUserRiskActionCopy({ action: "delete", displayName: "د. سامي" }),
    ).toMatchObject({
      title: "حذف د. سامي؟",
      confirmLabel: "حذف المستخدم",
      tone: "danger",
    });
  });

  it("explains that resetting permissions returns the user to role defaults", () => {
    expect(
      getUserRiskActionCopy({
        action: "reset-permissions",
        displayName: "منى",
      }),
    ).toMatchObject({
      title: "استعادة صلاحيات الدور لمنى؟",
      confirmLabel: "استعادة الافتراضيات",
      tone: "warning",
    });
  });

  it("uses active-state-specific copy for status changes", () => {
    expect(
      getUserRiskActionCopy({
        action: "toggle-active",
        displayName: "admin",
        isActive: true,
      }),
    ).toMatchObject({
      title: "إيقاف admin؟",
      confirmLabel: "إيقاف الحساب",
      tone: "warning",
    });
    expect(
      getUserRiskActionCopy({
        action: "toggle-active",
        displayName: "admin",
        isActive: false,
      }),
    ).toMatchObject({
      title: "تفعيل admin؟",
      confirmLabel: "تفعيل الحساب",
      tone: "default",
    });
  });
});
