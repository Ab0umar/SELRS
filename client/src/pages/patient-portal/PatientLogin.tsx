import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { usePatientAuth } from "@/hooks/usePatientAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

type Step = "phone" | "otp";

export default function PatientLogin() {
  const [, navigate] = useLocation();
  const { login, isLoggedIn } = usePatientAuth();
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");

  if (isLoggedIn) {
    navigate("/my/file");
    return null;
  }

  const sendOtp = trpc.patientPortal.sendOtp.useMutation({
    onSuccess: () => {
      setStep("otp");
      toast.success("تم إرسال الكود على واتساب");
    },
    onError: (e) => toast.error(e.message),
  });

  const verifyOtp = trpc.patientPortal.verifyOtp.useMutation({
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
          <p className="text-sm text-gray-500">
            {step === "phone" ? "أدخل رقم موبايلك المسجل" : `أدخل الكود المرسل على ${phone}`}
          </p>
        </div>

        {step === "phone" ? (
          <div className="space-y-4">
            <Input
              type="tel"
              placeholder="01XXXXXXXXX"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="text-center text-lg tracking-widest"
              dir="ltr"
            />
            <Button
              className="w-full"
              onClick={() => sendOtp.mutate({ phone })}
              disabled={phone.length < 8 || sendOtp.isPending}
            >
              {sendOtp.isPending ? "جاري الإرسال..." : "إرسال الكود"}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <Input
              type="text"
              inputMode="numeric"
              placeholder="000000"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              className="text-center text-2xl tracking-[0.5em] font-mono"
              dir="ltr"
            />
            <Button
              className="w-full"
              onClick={() => verifyOtp.mutate({ phone, code })}
              disabled={code.length !== 6 || verifyOtp.isPending}
            >
              {verifyOtp.isPending ? "جاري التحقق..." : "دخول"}
            </Button>
            <button
              className="w-full text-sm text-gray-500 underline"
              onClick={() => { setStep("phone"); setCode(""); }}
            >
              تغيير رقم الموبايل
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
