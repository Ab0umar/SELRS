export type UserRiskAction = "delete" | "reset-permissions" | "toggle-active";

export type UserRiskActionTone = "default" | "danger" | "warning";

export type UserRiskActionCopyInput = {
  action: UserRiskAction;
  displayName: string;
  isActive?: boolean;
};

export type UserRiskActionCopy = {
  title: string;
  description: string;
  confirmLabel: string;
  tone: UserRiskActionTone;
};

export function getUserRiskActionCopy({
  action,
  displayName,
  isActive,
}: UserRiskActionCopyInput): UserRiskActionCopy {
  if (action === "delete") {
    return {
      title: `حذف ${displayName}؟`,
      description:
        "سيتم إلغاء حساب المستخدم ومنع الدخول إلى النظام. لا تستخدم هذا الإجراء إلا عند التأكد من عدم حاجة الحساب.",
      confirmLabel: "حذف المستخدم",
      tone: "danger",
    };
  }

  if (action === "reset-permissions") {
    return {
      title: `استعادة صلاحيات الدور ل${displayName}؟`,
      description:
        "سيتم حذف الاستثناءات الخاصة بهذا المستخدم والرجوع إلى صلاحيات الدور الافتراضية فوراً.",
      confirmLabel: "استعادة الافتراضيات",
      tone: "warning",
    };
  }

  if (isActive) {
    return {
      title: `إيقاف ${displayName}؟`,
      description:
        "لن يتمكن هذا المستخدم من تسجيل الدخول حتى يتم تفعيل الحساب مرة أخرى.",
      confirmLabel: "إيقاف الحساب",
      tone: "warning",
    };
  }

  return {
    title: `تفعيل ${displayName}؟`,
    description: "سيتمكن هذا المستخدم من تسجيل الدخول حسب صلاحياته الحالية.",
    confirmLabel: "تفعيل الحساب",
    tone: "default",
  };
}
