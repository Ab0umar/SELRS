import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { getTrpcErrorMessage } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { KeyRound, ShieldAlert, UserRound } from "lucide-react";
import type { User } from "@shared/types";

export default function ForcePasswordChange() {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const [, setLocation] = useLocation();
  const [username, setUsername] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const changeUsernameMutation = trpc.auth.changeUsername.useMutation({
    onSuccess: async () => {
      toast.success("تم تحديث اسم المستخدم");
      await utils.auth.me.invalidate();
    },
  });

  const changePasswordMutation = trpc.auth.changePassword.useMutation({
    onSuccess: async () => {
      toast.success("تم تحديث كلمة المرور");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      await utils.auth.me.invalidate();
      setLocation("/dashboard");
    },
  });

  useEffect(() => {
    setUsername(String((user as User | null)?.username ?? ""));
  }, [user]);

  useEffect(() => {
    if (!user) return;
    if (!(user as (User & { mustChangePassword?: boolean })).mustChangePassword) {
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

  const submitPassword = async () => {
    const current = currentPassword.trim();
    const next = newPassword.trim();
    const confirm = confirmPassword.trim();
    if (!current || !next || !confirm) {
      toast.error("يرجى ملء جميع حقول كلمة المرور");
      return;
    }
    if (next.length < 6) {
      toast.error("كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل");
      return;
    }
    if (next !== confirm) {
      toast.error("تأكيد كلمة المرور غير متطابق");
      return;
    }
    if (next === current) {
      toast.error("كلمة المرور الجديدة يجب أن تكون مختلفة");
      return;
    }
    try {
      await changePasswordMutation.mutateAsync({
        currentPassword: current,
        newPassword: next,
      });
    } catch (error) {
      toast.error(getTrpcErrorMessage(error, "فشل تحديث كلمة المرور"));
    }
  };

  return (
    <div
      dir="rtl"
      className="relative flex min-h-screen items-center justify-center overflow-hidden selrs-login-bg p-4"
    >
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute right-[-5rem] top-[-4rem] h-56 w-56 rounded-full bg-[color-mix(in_srgb,var(--selrs-navy)_12%,transparent)] blur-3xl" />
        <div className="absolute bottom-[-3rem] left-[-4rem] h-64 w-64 rounded-full bg-[color-mix(in_srgb,var(--selrs-orange)_18%,transparent)] blur-3xl" />
      </div>
      <Card className="selrs-glass-card relative w-full max-w-xl overflow-hidden border-white/80 bg-background/90 shadow-[0_24px_60px_rgba(15,23,42,0.12)] backdrop-blur">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary to-secondary" aria-hidden />
        <CardHeader className="relative">
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-warning/50 bg-warning/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-warning/90">
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
              <Input id="fullNameReadonly" value={String((user as User | null)?.name ?? "")} readOnly />
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

          <div className="space-y-3 border-t pt-4">
            <div className="space-y-2">
              <Label htmlFor="currentPasswordRequired">كلمة المرور الحالية</Label>
              <Input
                id="currentPasswordRequired"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newPasswordRequired">كلمة المرور الجديدة</Label>
              <Input
                id="newPasswordRequired"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPasswordRequired">تأكيد كلمة المرور الجديدة</Label>
              <Input
                id="confirmPasswordRequired"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !changePasswordMutation.isPending) {
                    void submitPassword();
                  }
                }}
              />
            </div>
            <Button
              type="button"
              className="w-full"
              onClick={submitPassword}
              disabled={changePasswordMutation.isPending}
            >
              {changePasswordMutation.isPending ? "جاري الحفظ..." : (
                <span className="inline-flex items-center gap-2">
                  <KeyRound className="h-4 w-4" />
                  تحديث كلمة المرور
                </span>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
