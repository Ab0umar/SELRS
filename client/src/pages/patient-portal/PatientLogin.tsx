import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { usePatientAuth } from "@/hooks/usePatientAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export default function PatientLogin() {
  const [, navigate] = useLocation();
  const { login, isLoggedIn } = usePatientAuth();
  const [phone, setPhone] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");

  if (isLoggedIn) {
    navigate("/my/file");
    return null;
  }

  const loginMutation = trpc.patientPortal.login.useMutation({
    onSuccess: (data) => {
      login(data.token, data.patient);
      navigate("/my/file");
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4" dir="rtl">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-md p-8 space-y-6">
        <div className="text-center space-y-1">
          <h1 className="text-xl font-bold text-gray-900">بوابة المرضى</h1>
          <p className="text-sm text-gray-500">أدخل بياناتك للدخول على ملفك</p>
        </div>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700">رقم الموبايل</label>
            <Input
              type="tel"
              placeholder="01XXXXXXXXX"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              dir="ltr"
              className="text-left"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700">تاريخ الميلاد</label>
            <Input
              type="date"
              value={dateOfBirth}
              onChange={(e) => setDateOfBirth(e.target.value)}
              dir="ltr"
            />
          </div>

          <Button
            className="w-full h-11"
            onClick={() => loginMutation.mutate({ phone, dateOfBirth })}
            disabled={phone.length < 8 || !dateOfBirth || loginMutation.isPending}
          >
            {loginMutation.isPending ? "جاري التحقق..." : "دخول"}
          </Button>
        </div>

        <p className="text-center text-xs text-gray-400">
          البيانات غير مسجلة؟{" "}
          <span className="text-blue-600 font-medium">تواصل مع الاستقبال</span>
        </p>
      </div>
    </div>
  );
}
