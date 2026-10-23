import { useEffect, useRef, useState, type FormEvent } from "react";
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
import { useAuth } from "@/hooks/useAuth";
import { AlertCircle, KeyRound, ShieldAlert, UserRound } from "lucide-react";
import type { User } from "@shared/types";

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
  const [passwordForm, setPasswordForm] =
    useState<ChangePasswordFormValues>(EMPTY_PASSWORD_FORM);
  const [passwordErrors, setPasswordErrors] =
    useState<ChangePasswordFieldErrors>({});
  const [passwordFormError, setPasswordFormError] = useState<
    string | undefined
  >(undefined);
  const currentPasswordRef = useRef<HTMLInputElement>(null);
  const newPasswordRef = useRef<HTMLInputElement>(null);
  const confirmPasswordRef = useRef<HTMLInputElement>(null);

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
      setPasswordFormError(undefined);
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

  const submitUsername = async () => {
    const next = username.trim();
    if (!next) {
      toast.error("اسم المستخدم مطلوب");
      return;
    }
    if (next.length < 3) {
      toast.error("اسم المستخدم يجب أن يكون 3 أحرف على الأقل");
      return;
    }
    try {
      await changeUsernameMutation.mutateAsync({ username: next });
    } catch (error) {
      toast.error(getTrpcErrorMessage(error, "فشل تحديث اسم المستخدم"));
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
    setPasswordFormError(undefined);
  };

  const handlePasswordSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (changePasswordMutation.isPending) return;
    setPasswordFormError(undefined);
    const validationErrors = validateChangePasswordForm(passwordForm);
    if (Object.keys(validationErrors).length > 0) {
      setPasswordErrors(validationErrors);
      if (validationErrors.currentPassword) {
        currentPasswordRef.current?.focus();
      } else if (validationErrors.newPassword) {
        newPasswordRef.current?.focus();
      } else if (validationErrors.confirmPassword) {
        confirmPasswordRef.current?.focus();
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
      if (message === CURRENT_PASSWORD_INCORRECT_MESSAGE) {
        setPasswordErrors({ currentPassword: message });
        currentPasswordRef.current?.focus();
        return;
      }
      setPasswordFormError(message);
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
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="fullNameReadonly">الاسم الكامل</Label>
              <Input
                id="fullNameReadonly"
                value={String((user as User | null)?.name ?? "")}
                readOnly
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="usernameEditable">اسم المستخدم</Label>
              <div className="flex gap-2">
                <Input
                  id="usernameEditable"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
                <Button
                  type="button"
                  onClick={submitUsername}
                  disabled={changeUsernameMutation.isPending}
                >
                  <UserRound className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          <form
            noValidate
            onSubmit={handlePasswordSubmit}
            className="space-y-3 border-t pt-4"
          >
            {/* The saved username (not the editable draft) so password managers
                pair the credential with the account. Hidden from the
                accessibility tree and the tab order. */}
            <input
              type="text"
              name="username"
              autoComplete="username"
              value={String((user as User | null)?.username ?? "")}
              readOnly
              tabIndex={-1}
              aria-hidden="true"
              className="sr-only"
            />
            <FormField
              label="كلمة المرور الحالية"
              required
              error={passwordErrors.currentPassword}
            >
              <Input
                id="currentPasswordRequired"
                name="currentPassword"
                type="password"
                autoComplete="current-password"
                ref={currentPasswordRef}
                value={passwordForm.currentPassword}
                onChange={(e) =>
                  handlePasswordFieldChange("currentPassword", e.target.value)
                }
              />
            </FormField>
            <FormField
              label="كلمة المرور الجديدة"
              required
              error={passwordErrors.newPassword}
              helperText={CHANGE_PASSWORD_RULES_HINT}
            >
              <Input
                id="newPasswordRequired"
                name="newPassword"
                type="password"
                autoComplete="new-password"
                ref={newPasswordRef}
                value={passwordForm.newPassword}
                onChange={(e) =>
                  handlePasswordFieldChange("newPassword", e.target.value)
                }
              />
            </FormField>
            <FormField
              label="تأكيد كلمة المرور الجديدة"
              required
              error={passwordErrors.confirmPassword}
            >
              <Input
                id="confirmPasswordRequired"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                ref={confirmPasswordRef}
                value={passwordForm.confirmPassword}
                onChange={(e) =>
                  handlePasswordFieldChange("confirmPassword", e.target.value)
                }
              />
            </FormField>
            {passwordFormError && (
              <p
                role="alert"
                className="flex items-center gap-1 text-sm text-destructive"
              >
                <AlertCircle aria-hidden="true" className="h-4 w-4" />
                <span>{passwordFormError}</span>
              </p>
            )}
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
