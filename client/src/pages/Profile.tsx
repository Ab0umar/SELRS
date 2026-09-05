import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useAuth, persistSessionUser } from "@/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { getTrpcErrorMessage, cn } from "@/lib/utils";
import React, { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import {
  Building,
  CheckCircle2,
  Clock,
  KeyRound,
  Moon,
  Server,
  Shield,
  Sun,
  UserCog,
  Check,
  Lock,
  Mail,
  User as UserIcon,
} from "lucide-react";
import type { User } from "@shared/types";
import { useTheme, type ThemePref } from "@/contexts/ThemeContext";
import { canSwitchServer, openServerSwitcher } from "@/lib/nativeServerSwitcher";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const ROLE_LABELS: Record<string, string> = {
  admin: "مدير النظام (Admin)",
  doctor: "طبيب استشاري / أخصائي",
  nurse: "تمريض",
  technician: "فني بصريات / أجهزة",
  reception: "موظف استقبال",
  manager: "مدير إداري",
  accountant: "محاسب مالي",
  worker: "خدمات مساندة",
  supervisor: "مشرف عام",
};

const BRANCH_LABELS: Record<string, string> = {
  examinations: "عيادات الفحص",
  surgery: "قسم العمليات",
  both: "العيادات والعمليات",
};

export default function Profile({
  embeddedInHub = false,
}: { embeddedInHub?: boolean } = {}) {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const { pref, setPref } = useTheme();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const userObj = user as User | null;
  const userRole = String(userObj?.role ?? "").toLowerCase();
  const userBranch = String(userObj?.branch ?? "");
  const userShift = userObj?.shift ?? 1;

  useEffect(() => {
    setName(String(userObj?.name ?? ""));
    setEmail(String(userObj?.email ?? ""));
    setUsername(String(userObj?.username ?? ""));
  }, [userObj]);

  const initials = useMemo(() => {
    const raw = (name || username || "U").trim();
    const parts = raw.split(" ").filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return raw.slice(0, 2).toUpperCase();
  }, [name, username]);

  const updateProfileMutation = trpc.auth.updateProfile.useMutation({
    onSuccess: async () => {
      toast.success("تم تحديث البريد الإلكتروني بنجاح");
      await utils.auth.me.invalidate();
    },
  });

  const changeUsernameMutation = trpc.auth.changeUsername.useMutation({
    onSuccess: async () => {
      toast.success("تم تحديث اسم المستخدم بنجاح");
      await utils.auth.me.invalidate();
    },
  });

  const changePasswordMutation = trpc.auth.changePassword.useMutation({
    onSuccess: async () => {
      toast.success("تم تغيير كلمة المرور بنجاح");
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

      const currentUsername = String(userObj?.username ?? "").trim();
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
      toast.error(getTrpcErrorMessage(error, "فشل حفظ البيانات"));
    }
  };

  const onChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error("جميع حقول كلمة المرور مطلوبة");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("تأكيد كلمة المرور الجديدة غير متطابق");
      return;
    }
    if (newPassword.length < 4) {
      toast.error("كلمة المرور الجديدة يجب أن تكون 4 أحرف على الأقل");
      return;
    }
    try {
      await changePasswordMutation.mutateAsync({
        currentPassword,
        newPassword,
      });
    } catch (error) {
      toast.error(getTrpcErrorMessage(error, "فشل تغيير كلمة المرور"));
    }
  };

  const saving =
    updateProfileMutation.isPending || changeUsernameMutation.isPending;

  return (
    <div
      className={cn(
        "text-[#10234f]",
        embeddedInHub ? "w-full" : "min-h-screen bg-[#f7faff] pb-16",
      )}
      dir="rtl"
    >
      <main
        className={cn(
          "w-full space-y-6",
          embeddedInHub
            ? "px-0 py-0"
            : "mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8",
        )}
      >
        {!embeddedInHub && (
          <>
            {/* Header & Account Identity Capsule */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-5 border-b border-[#dfe7f2]">
              <div>
                <div className="mb-1.5 text-[10px] font-black tracking-[0.16em] text-[#c2781c]">
                  USER ACCOUNT & PROFILE
                </div>
                <h2 className="text-2xl sm:text-3xl font-black text-[#10265d] tracking-tight">
                  الحساب والملف الشخصي
                </h2>
                <p className="text-xs sm:text-sm font-bold text-slate-400 mt-1">
                  إدارة بيانات الدخول، الأمان وكلمة المرور، مظهر النظام، وإعدادات الاتصال بالسيرفر
                </p>
              </div>

              {/* Identity Capsules */}
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-[#dfe7f2] bg-white text-xs font-bold text-slate-700 shadow-2xs">
                  <Shield className="size-3.5 text-blue-600" />
                  <span>{ROLE_LABELS[userRole] || userRole || "مستخدم"}</span>
                </div>
                <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-[#dfe7f2] bg-white text-xs font-bold text-slate-700 shadow-2xs">
                  <Building className="size-3.5 text-emerald-600" />
                  <span>
                    {BRANCH_LABELS[userBranch] || userBranch || "المركز الرئيسي"}
                  </span>
                </div>
                <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-[#dfe7f2] bg-white text-xs font-bold text-slate-700 shadow-2xs">
                  <Clock className="size-3.5 text-amber-600" />
                  <span>وردية {userShift}</span>
                </div>
              </div>
            </div>

            {/* Hero Profile Overview Card */}
            <div className="rounded-2xl border border-[#dfe7f2] bg-white p-5 sm:p-6 shadow-[0_6px_20px_rgba(42,79,154,0.05)]">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="flex size-14 sm:size-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#2a4f9a] to-[#1a3670] text-xl sm:text-2xl font-black text-white shadow-md shadow-blue-900/15">
                    {initials}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-lg sm:text-xl font-black text-[#10265d]">
                        {name || username || "المستخدم"}
                      </h3>
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-[#2a4f9a] border border-blue-100">
                        @{username}
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm font-semibold text-slate-400 mt-1">
                      {email || "لا يوجد بريد إلكتروني مسجل"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold">
                    <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                    الحساب نشط
                  </span>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Tabs for Info, Security, Preferences */}
        <Tabs defaultValue="info" className="w-full space-y-4" dir="rtl">
          <div className="overflow-x-auto pb-1 scrollbar-none">
            <TabsList
              className="inline-flex h-11 w-full min-w-max justify-start gap-1.5 rounded-xl border border-[#dfe7f2] bg-white p-1 shadow-2xs"
              dir="rtl"
            >
              <TabsTrigger
                value="info"
                className="gap-2 px-4 py-2 text-xs font-bold rounded-lg data-[state=active]:bg-[#2a4f9a] data-[state=active]:text-white data-[state=active]:shadow-sm transition sm:text-sm"
              >
                <UserCog className="h-4 w-4 shrink-0" />
                <span>البيانات الشخصية</span>
              </TabsTrigger>

              <TabsTrigger
                value="password"
                className="gap-2 px-4 py-2 text-xs font-bold rounded-lg data-[state=active]:bg-[#2a4f9a] data-[state=active]:text-white data-[state=active]:shadow-sm transition sm:text-sm"
              >
                <KeyRound className="h-4 w-4 shrink-0" />
                <span>كلمة المرور والأمان</span>
              </TabsTrigger>

              <TabsTrigger
                value="preferences"
                className="gap-2 px-4 py-2 text-xs font-bold rounded-lg data-[state=active]:bg-[#2a4f9a] data-[state=active]:text-white data-[state=active]:shadow-sm transition sm:text-sm"
              >
                <Sun className="h-4 w-4 shrink-0" />
                <span>المظهر والسيرفر</span>
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Tab 1: Personal Information */}
          <TabsContent value="info" className="mt-0 space-y-4">
            <div className="rounded-2xl border border-[#dfe7f2] bg-white p-5 sm:p-7 shadow-[0_6px_20px_rgba(42,79,154,0.05)] space-y-5">
              <div className="border-b border-[#dfe7f2] pb-3">
                <h4 className="text-sm font-black text-[#10265d]">
                  المعلومات الأساسية
                </h4>
                <p className="text-xs font-semibold text-slate-400 mt-0.5">
                  بيانات الحساب الشخصية المسجلة في قاعدة بيانات المنظومة
                </p>
              </div>

              <div className="space-y-4 max-w-xl">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold text-slate-700">
                      الاسم الكامل
                    </Label>
                    <span className="text-[10px] font-bold text-slate-400">
                      يُحدد بواسطة إدارة النظام
                    </span>
                  </div>
                  <div className="relative">
                    <UserIcon className="size-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                    <Input
                      value={name}
                      readOnly
                      className="pr-9 bg-slate-50 border-[#dfe7f2] text-slate-600 rounded-xl text-xs sm:text-sm h-10"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700">
                    اسم المستخدم (تسجيل الدخول)
                  </Label>
                  <div className="relative">
                    <span className="size-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 font-bold text-xs">
                      @
                    </span>
                    <Input
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="اسم المستخدم..."
                      className="pr-9 rounded-xl border-[#dfe7f2] text-xs sm:text-sm h-10 focus:border-[#2a4f9a] focus:ring-2 focus:ring-blue-100 transition shadow-2xs"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700">
                    البريد الإلكتروني
                  </Label>
                  <div className="relative">
                    <Mail className="size-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="example@selrs.cc"
                      className="pr-9 rounded-xl border-[#dfe7f2] text-xs sm:text-sm h-10 focus:border-[#2a4f9a] focus:ring-2 focus:ring-blue-100 transition shadow-2xs"
                    />
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <Button
                    onClick={onSaveProfile}
                    disabled={saving}
                    className="h-10 px-5 rounded-xl font-bold bg-[#2a4f9a] hover:bg-[#203e7a] text-white shadow-md shadow-blue-900/10 text-xs gap-1.5"
                  >
                    {saving ? "...جاري الحفظ" : "حفظ التعديلات"}
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Tab 2: Password & Security */}
          <TabsContent value="password" className="mt-0 space-y-4">
            <div className="rounded-2xl border border-[#dfe7f2] bg-white p-5 sm:p-7 shadow-[0_6px_20px_rgba(42,79,154,0.05)] space-y-5">
              <div className="border-b border-[#dfe7f2] pb-3">
                <h4 className="text-sm font-black text-[#10265d]">
                  تغيير كلمة المرور
                </h4>
                <p className="text-xs font-semibold text-slate-400 mt-0.5">
                  احرص على استخدام كلمة مرور قوية وغير مكررة لحماية حسابك
                </p>
              </div>

              <div className="space-y-4 max-w-xl">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700">
                    كلمة المرور الحالية
                  </Label>
                  <div className="relative">
                    <Lock className="size-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                    <Input
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="••••••••"
                      className="pr-9 rounded-xl border-[#dfe7f2] text-xs sm:text-sm h-10 focus:border-[#2a4f9a] focus:ring-2 focus:ring-blue-100 transition shadow-2xs"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700">
                    كلمة المرور الجديدة
                  </Label>
                  <div className="relative">
                    <KeyRound className="size-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                    <Input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="••••••••"
                      className="pr-9 rounded-xl border-[#dfe7f2] text-xs sm:text-sm h-10 focus:border-[#2a4f9a] focus:ring-2 focus:ring-blue-100 transition shadow-2xs"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700">
                    تأكيد كلمة المرور الجديدة
                  </Label>
                  <div className="relative">
                    <CheckCircle2 className="size-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                    <Input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="pr-9 rounded-xl border-[#dfe7f2] text-xs sm:text-sm h-10 focus:border-[#2a4f9a] focus:ring-2 focus:ring-blue-100 transition shadow-2xs"
                    />
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <Button
                    onClick={onChangePassword}
                    disabled={changePasswordMutation.isPending}
                    className="h-10 px-5 rounded-xl font-bold bg-[#2a4f9a] hover:bg-[#203e7a] text-white shadow-md shadow-blue-900/10 text-xs gap-1.5"
                  >
                    {changePasswordMutation.isPending
                      ? "...جاري التحديث"
                      : "تغيير كلمة المرور"}
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Tab 3: Appearance & Server */}
          <TabsContent value="preferences" className="mt-0 space-y-4">
            <div className="rounded-2xl border border-[#dfe7f2] bg-white p-5 sm:p-7 shadow-[0_6px_20px_rgba(42,79,154,0.05)] space-y-6">
              <div className="border-b border-[#dfe7f2] pb-3">
                <h4 className="text-sm font-black text-[#10265d]">
                  مظهر المنظومة
                </h4>
                <p className="text-xs font-semibold text-slate-400 mt-0.5">
                  اختر المظهر المريح لعينيك أثناء استخدام التطبيق
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl">
                {(["light", "dark"] as ThemePref[]).map((option) => {
                  const isSelected = pref === option;
                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setPref(option)}
                      className={cn(
                        "flex items-center gap-3 p-4 rounded-xl border transition-all text-right cursor-pointer",
                        isSelected
                          ? "border-[#2a4f9a] bg-blue-50/50 shadow-sm"
                          : "border-[#dfe7f2] bg-white hover:bg-slate-50",
                      )}
                    >
                      <span
                        className={cn(
                          "flex size-10 items-center justify-center rounded-xl",
                          option === "light"
                            ? "bg-amber-100 text-amber-700"
                            : "bg-slate-900 text-slate-100",
                        )}
                      >
                        {option === "light" ? (
                          <Sun className="size-5" />
                        ) : (
                          <Moon className="size-5" />
                        )}
                      </span>
                      <div className="flex-1">
                        <div className="text-xs font-bold text-[#10265d]">
                          {option === "light" ? "المظهر الفاتح" : "المظهر الداكن"}
                        </div>
                        <div className="text-[10px] text-slate-400 font-semibold mt-0.5">
                          {option === "light"
                            ? "مناسب للإضاءة الطبيعية والنهار"
                            : "مريح للعين في الإضاءة الخافتة"}
                        </div>
                      </div>
                      {isSelected && (
                        <Check className="size-4 text-[#2a4f9a]" />
                      )}
                    </button>
                  );
                })}
              </div>

              {canSwitchServer() && (
                <div className="pt-5 border-t border-[#dfe7f2] space-y-3">
                  <div>
                    <h4 className="text-sm font-black text-[#10265d]">
                      السيرفر والاتصال المحلي
                    </h4>
                    <p className="text-xs font-semibold text-slate-400 mt-0.5">
                      إمكانية التبديل بين السيرفر المحلي والشبكة المركزية
                    </p>
                  </div>

                  <div>
                    <Button
                      variant="outline"
                      onClick={() => openServerSwitcher()}
                      className="h-10 px-4 rounded-xl text-xs font-bold gap-2 border-[#dfe7f2] bg-white text-[#10265d] hover:bg-slate-50"
                    >
                      <Server className="size-4 text-[#2a4f9a]" />
                      <span>تبديل السيرفر النشط</span>
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
