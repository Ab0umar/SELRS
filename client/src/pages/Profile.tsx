import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { persistSessionUser } from "@/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { getTrpcErrorMessage } from "@/lib/utils";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { KeyRound } from "lucide-react";

export default function Profile() {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    setName(String((user as any)?.name ?? ""));
    setEmail(String((user as any)?.email ?? ""));
    setUsername(String((user as any)?.username ?? ""));
  }, [user]);

  const updateProfileMutation = trpc.auth.updateProfile.useMutation({
    onSuccess: async () => {
      toast.success("Profile updated");
      await utils.auth.me.invalidate();
    },
  });

  const changeUsernameMutation = trpc.auth.changeUsername.useMutation({
    onSuccess: async () => {
      toast.success("Username updated");
      await utils.auth.me.invalidate();
    },
  });

  const changePasswordMutation = trpc.auth.changePassword.useMutation({
    onSuccess: async () => {
      toast.success("Password updated");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      await utils.auth.me.invalidate();
    },
  });

  const onSaveProfile = async () => {
    try {
      const currentUser = (user as any) ?? {};
      await updateProfileMutation.mutateAsync({
        email: email.trim(),
      });
      const nextUserAfterEmail = {
        ...currentUser,
        email: email.trim(),
      };
      utils.auth.me.setData(undefined, nextUserAfterEmail);
      persistSessionUser(nextUserAfterEmail);
      const currentUsername = String((user as any)?.username ?? "").trim();
      const nextUsername = username.trim();
      if (nextUsername && nextUsername !== currentUsername) {
        await changeUsernameMutation.mutateAsync({ username: nextUsername });
        const nextUserAfterUsername = {
          ...nextUserAfterEmail,
          username: nextUsername,
        };
        utils.auth.me.setData(undefined, nextUserAfterUsername);
        persistSessionUser(nextUserAfterUsername);
      }
    } catch (error) {
      toast.error(getTrpcErrorMessage(error, "Failed to save profile"));
    }
  };

  const onChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error("All password fields are required");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("New password confirmation does not match");
      return;
    }
    try {
      await changePasswordMutation.mutateAsync({
        currentPassword,
        newPassword,
      });
    } catch (error) {
      toast.error(getTrpcErrorMessage(error, "Failed to change password"));
    }
  };

  const saving = updateProfileMutation.isPending || changeUsernameMutation.isPending;

  return (
    <div className="container mx-auto max-w-4xl space-y-6 p-4" dir="rtl">
      <Card className="border-slate-200/80 bg-white/95 shadow-sm">
        <CardHeader>
          <CardTitle>حسابي</CardTitle>
          <CardDescription>تعديل بيانات المستخدم</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-[120px_1fr] items-center gap-2">
            <Label>الاسم</Label>
            <Input value={name} readOnly />
          </div>
          <div className="grid grid-cols-[120px_1fr] items-center gap-2">
            <Label>الإيميل</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="grid grid-cols-[120px_1fr] items-center gap-2">
            <Label>اسم المستخدم</Label>
            <Input value={username} onChange={(e) => setUsername(e.target.value)} />
          </div>
          <div className="flex justify-end">
            <Button onClick={onSaveProfile} disabled={saving}>
              {saving ? "Saving..." : "حفظ البيانات"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-slate-200/80 bg-white/95 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-slate-500" />
            تغيير كلمة المرور
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-[170px_1fr] items-center gap-2">
            <Label>كلمة المرور الحالية</Label>
            <Input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
          </div>
          <div className="grid grid-cols-[170px_1fr] items-center gap-2">
            <Label>كلمة المرور الجديدة</Label>
            <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
          </div>
          <div className="grid grid-cols-[170px_1fr] items-center gap-2">
            <Label>تأكيد كلمة المرور</Label>
            <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
          </div>
          <div className="flex justify-end">
            <Button onClick={onChangePassword} disabled={changePasswordMutation.isPending}>
              {changePasswordMutation.isPending ? "Saving..." : "تغيير كلمة المرور"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
