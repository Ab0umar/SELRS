import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useLocation } from "wouter";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/FormField";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { getTrpcErrorMessage } from "@/lib/utils";
import {
  CHANGE_PASSWORD_RULES_HINT,
  CURRENT_PASSWORD_INCORRECT_MESSAGE,
  validateChangePasswordForm,
} from "@/lib/change-password-validation";
import type {
  ChangePasswordFieldErrors,
  ChangePasswordFormValues,
} from "@/lib/change-password-validation";
import {
  mapUsernameServerError,
  validateUsername,
} from "@/lib/username-validation";
import { useAuth } from "@/hooks/useAuth";
import { KeyRound, Loader2, ShieldAlert, UserRound } from "lucide-react";
import type { User } from "@shared/types";
import { validateUsernameField } from "@/lib/force-password-change-validation";

const PASSWORD_FIELD_IDS: Record<keyof ChangePasswordFieldErrors, string> = {
  currentPassword: "currentPasswordRequired",
  newPassword: "newPasswordRequired",
  confirmPassword: "confirmPasswordRequired",
};

const EMPTY_PASSWORD_FORM: ChangePasswordFormValues = {
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
};

export default function ForcePasswordChange() {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const [, setLocation] = useLocation();
  const [username, setUsername] = useState("");
  const [usernameError, setUsernameError] = useState<string | undefined>(
    undefined,
  );
  const [passwordForm, setPasswordForm] =
    useState<ChangePasswordFormValues>(EMPTY_PASSWORD_FORM);
  const [passwordErrors, setPasswordErrors] =
    useState<ChangePasswordFieldErrors>({});

  const changeUsernameMutation = trpc.auth.changeUsername.useMutation({
    onSuccess: async () => {
      toast.success("تم تحديث اسم المستخدم");
      await utils.auth.me.invalidate();
    },
  });

  const changePasswordMutation = trpc.auth.changePassword.useMutation({
    onSuccess: async () => {
      toast.success("تم تحديث كلمة المرور");
      setPasswordForm(EMPTY_PASSWORD_FORM);
      setPasswordErrors({});
      await utils.auth.me.invalidate();
      setLocation("/dashboard");
    },
  });

  useEffect(() => {
    setUsername(String((user as User | null)?.username ?? ""));
  }, [user]);

  useEffect(() => {
    if (!user) return;
    if (!(user as User & { mustChangePassword?: boolean }).mustChangePassword) {
      setLocation("/dashboard");
    }
  }, [setLocation, user]);

  const handleUsernameChange = (value: string) => {
    setUsername(value);
    // Live re-validation only after a failed submit so the error never shows early.
    if (usernameError) {
      setUsernameError(validateUsernameField(value));
    }
  };

  const submitUsername = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (changeUsernameMutation.isPending) return;

    const validationError = validateUsernameField(username);
    if (validationError) {
      setUsernameError(validationError);
      document.getElementById("usernameEditable")?.focus();
      return;
    }
    setUsernameError(undefined);
    try {
      await changeUsernameMutation.mutateAsync({ username: username.trim() });
    } catch (error) {
      // Field-specific: render under the input instead of a transient toast.
      setUsernameError(getTrpcErrorMessage(error, "فشل تحديث اسم المستخدم"));
    }
  };

  const handlePasswordFieldChange = (
    field: keyof ChangePasswordFormValues,
    value: string,
  ) => {
    const nextForm = { ...passwordForm, [field]: value };
    setPasswordForm(nextForm);
    // Live re-validation only after a failed submit so errors never show early.
    if (Object.keys(passwordErrors).length > 0) {
      setPasswordErrors(validateChangePasswordForm(nextForm));
    }
  };

  const submitPassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (changePasswordMutation.isPending) return;

    const validationErrors = validateChangePasswordForm(passwordForm);
    if (Object.keys(validationErrors).length > 0) {
      setPasswordErrors(validationErrors);
      const firstInvalidField = (
        ["currentPassword", "newPassword", "confirmPassword"] as const
      ).find((field) => validationErrors[field]);
      if (firstInvalidField) {
        document
          .getElementById(PASSWORD_FIELD_IDS[firstInvalidField])
          ?.focus();
      }
      return;
    }
    setPasswordErrors({});
    try {
      await changePasswordMutation.mutateAsync({
        currentPassword: passwordForm.currentPassword.trim(),
        newPassword: passwordForm.newPassword.trim(),
      });
    } catch (error) {
      const message = getTrpcErrorMessage(error, "فشل تحديث كلمة المرور");
      if (message === "كلمة المرور الحالية غير صحيحة") {
        setPasswordErrors({ currentPassword: message });
        return;
      }
      toast.error(message);
    }
  };

  return (
    <div
      dir="rtl"
      className="relative flex min-h-screen items-center justify-center overflow-hidden selrs-login-bg p-4"
    >
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute start-[-5rem] top-[-4rem] h-56 w-56 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute bottom-[-3rem] end-[-4rem] h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
      </div>
      <Card className="selrs-glass-card relative w-full max-w-xl overflow-hidden border-white/80 bg-background/90 shadow-[0_24px_60px_rgba(15,23,42,0.12)] backdrop-blur">
        <div
          className="absolute inset-x-0 top-0 h-1 bg-primary"
          aria-hidden
        />
        <CardHeader className="relative">
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-warning/50 bg-warning/10 px-3 py-1 text-[13px] font-semibold uppercase text-warning-text/90">
            <ShieldAlert className="h-3.5 w-3.5" />
            Security Step
          </div>
          <CardTitle>إعداد أمني مطلوب</CardTitle>
          <CardDescription>
            يجب تغيير كلمة المرور للمتابعة. الاسم الكامل للعرض فقط.
          </CardDescription>
        </CardHeader>
        <CardContent className="relative space-y-6">
          <div className="space-y-2">
            <Label htmlFor="fullNameReadonly">الاسم الكامل</Label>
            <Input
              id="fullNameReadonly"
              value={String((user as User | null)?.name ?? "")}
              readOnly
            />
          </div>

          <form onSubmit={submitUsername} noValidate className="space-y-2">
            <div className="space-y-2">
              <Label htmlFor="usernameEditable">اسم المستخدم</Label>
              <div className="flex gap-2">
                <Input
                  id="usernameEditable"
                  autoComplete="username"
                  aria-invalid={Boolean(usernameError)}
                  aria-describedby={
                    usernameError ? "usernameEditable-error" : undefined
                  }
                  value={username}
                  onChange={(e) => handleUsernameChange(e.target.value)}
                />
                <Button
                  type="submit"
                  aria-label="حفظ اسم المستخدم"
                  disabled={changeUsernameMutation.isPending}
                  aria-busy={changeUsernameMutation.isPending}
                  title="حفظ اسم المستخدم"
                >
                  <UserRound aria-hidden className="h-4 w-4" />
                </Button>
              </div>
              {usernameError ? (
                <p
                  id="usernameEditable-error"
                  role="alert"
                  className="text-sm text-destructive"
                >
                  {usernameError}
                </p>
              ) : null}
            </div>
          </form>

          <form
            onSubmit={submitPassword}
            noValidate
            className="space-y-3 border-t pt-4"
          >
            <div className="space-y-2">
              <Label htmlFor="currentPasswordRequired">
                كلمة المرور الحالية
              </Label>
              <Input
                id="currentPasswordRequired"
                name="currentPassword"
                type="password"
                autoComplete="current-password"
                aria-invalid={Boolean(passwordErrors.currentPassword)}
                aria-describedby={
                  passwordErrors.currentPassword
                    ? "currentPasswordRequired-error"
                    : undefined
                }
                value={passwordForm.currentPassword}
                onChange={(e) =>
                  handlePasswordFieldChange("currentPassword", e.target.value)
                }
              />
              {passwordErrors.currentPassword ? (
                <p
                  id="currentPasswordRequired-error"
                  role="alert"
                  className="text-sm text-destructive"
                >
                  {passwordErrors.currentPassword}
                </p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="newPasswordRequired">كلمة المرور الجديدة</Label>
              <Input
                id="newPasswordRequired"
                name="newPassword"
                type="password"
                autoComplete="new-password"
                aria-invalid={Boolean(passwordErrors.newPassword)}
                aria-describedby={
                  passwordErrors.newPassword
                    ? "newPasswordRequired-rules newPasswordRequired-error"
                    : "newPasswordRequired-rules"
                }
                value={passwordForm.newPassword}
                onChange={(e) =>
                  handlePasswordFieldChange("newPassword", e.target.value)
                }
              />
              <p
                id="newPasswordRequired-rules"
                className="text-xs text-muted-foreground"
              >
                {CHANGE_PASSWORD_RULES_HINT}
              </p>
              {passwordErrors.newPassword ? (
                <p
                  id="newPasswordRequired-error"
                  role="alert"
                  className="text-sm text-destructive"
                >
                  {passwordErrors.newPassword}
                </p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPasswordRequired">
                تأكيد كلمة المرور الجديدة
              </Label>
              <Input
                id="confirmPasswordRequired"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                aria-invalid={Boolean(passwordErrors.confirmPassword)}
                aria-describedby={
                  passwordErrors.confirmPassword
                    ? "confirmPasswordRequired-error"
                    : undefined
                }
                value={passwordForm.confirmPassword}
                onChange={(e) =>
                  handlePasswordFieldChange("confirmPassword", e.target.value)
                }
              />
              {passwordErrors.confirmPassword ? (
                <p
                  id="confirmPasswordRequired-error"
                  role="alert"
                  className="text-sm text-destructive"
                >
                  {passwordErrors.confirmPassword}
                </p>
              ) : null}
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={changePasswordMutation.isPending}
            >
              {changePasswordMutation.isPending ? (
                "جاري الحفظ…"
              ) : (
                <span className="inline-flex items-center gap-2">
                  <KeyRound className="h-4 w-4" />
                  تحديث كلمة المرور
                </span>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
