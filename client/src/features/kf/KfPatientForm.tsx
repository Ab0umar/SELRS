import { useState, useEffect } from "react";
import { useLocation, useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { ChevronRight, Save, Link2, Check, AlertCircle, Loader2 } from "lucide-react";
import { DateInput } from "@/components/ui/date-input";

type FormState = {
  fullName: string;
  dateOfBirth: string;
  age: string;
  gender: "male" | "female" | "";
  nationalId: string;
  phone: string;
  alternatePhone: string;
  address: string;
  occupation: string;
  medicalHistory: string;
  allergies: string;
  notes: string;
  selrsPatientCode: string;
};

const initialFormState: FormState = {
  fullName: "",
  dateOfBirth: "",
  age: "",
  gender: "",
  nationalId: "",
  phone: "",
  alternatePhone: "",
  address: "",
  occupation: "",
  medicalHistory: "",
  allergies: "",
  notes: "",
  selrsPatientCode: "",
};

export default function KfPatientForm() {
  const [, setLocation] = useLocation();
  const [matchEdit, editParams] = useRoute("/kf/patients/:kfPatientId/edit");
  const kfPatientId = matchEdit && editParams?.kfPatientId ? Number(editParams.kfPatientId) : null;
  const isEditMode = !!kfPatientId;

  // Form State
  const [form, setForm] = useState<FormState>(initialFormState);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [selrsQueryCode, setSelrsQueryCode] = useState("");
  const [isVerifyingSelrs, setIsVerifyingSelrs] = useState(false);
  const [verifiedSelrsName, setVerifiedSelrsName] = useState<string | null>(null);

  // Queries & Mutations
  const { data: patientData, isLoading: loadingPatient } = trpc.kf.getPatient.useQuery(
    { kfId: kfPatientId ?? 0 },
    { enabled: isEditMode }
  );

  // Lookup SELRS patient bridge
  const lookupSelrsQuery = trpc.kf.bridgeLookupSelrsPatient.useQuery(
    { code: selrsQueryCode },
    { enabled: !!selrsQueryCode }
  );

  const createMutation = trpc.kf.createPatient.useMutation();
  const updateMutation = trpc.kf.updatePatient.useMutation();

  // Populate form in edit mode
  useEffect(() => {
    if (isEditMode && patientData) {
      setForm({
        fullName: patientData.fullName,
        dateOfBirth: patientData.dateOfBirth ? String(patientData.dateOfBirth).split("T")[0] : "",
        age: patientData.age !== null && patientData.age !== undefined ? String(patientData.age) : "",
        gender: patientData.gender ?? "",
        nationalId: patientData.nationalId ?? "",
        phone: patientData.phone ?? "",
        alternatePhone: patientData.alternatePhone ?? "",
        address: patientData.address ?? "",
        occupation: patientData.occupation ?? "",
        medicalHistory: patientData.medicalHistory ?? "",
        allergies: patientData.allergies ?? "",
        notes: patientData.notes ?? "",
        selrsPatientCode: patientData.selrsPatientCode ?? "",
      });
      if (patientData.selrsPatientCode) {
        setSelrsQueryCode(patientData.selrsPatientCode);
      }
    }
  }, [isEditMode, patientData]);

  // Track verified SELRS name when query returns
  useEffect(() => {
    if (selrsQueryCode && lookupSelrsQuery.data) {
      setVerifiedSelrsName(lookupSelrsQuery.data.fullName);
    } else if (selrsQueryCode && lookupSelrsQuery.data === null) {
      setVerifiedSelrsName(""); // Not found
    }
    setIsVerifyingSelrs(false);
  }, [lookupSelrsQuery.data, selrsQueryCode]);

  const handleChange = (key: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) {
      setErrors((prev) => {
        const copy = { ...prev };
        delete copy[key];
        return copy;
      });
    }
  };

  const handleVerifySelrs = () => {
    if (!form.selrsPatientCode.trim()) {
      toast.error("يرجى إدخال كود المريض أولاً");
      return;
    }
    setIsVerifyingSelrs(true);
    setSelrsQueryCode(form.selrsPatientCode.trim());
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!form.fullName.trim()) {
      newErrors.fullName = "الاسم بالكامل مطلوب";
    }
    if (form.age && (isNaN(Number(form.age)) || Number(form.age) < 0)) {
      newErrors.age = "السن يجب أن يكون رقماً صحيحاً موجباً";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) {
      toast.error("يرجى مراجعة الحقول المطلوبة");
      return;
    }

    const payload = {
      fullName: form.fullName.trim(),
      dateOfBirth: form.dateOfBirth || null,
      age: form.age ? Number(form.age) : null,
      gender: form.gender ? form.gender : null,
      nationalId: form.nationalId.trim() || null,
      phone: form.phone.trim() || null,
      alternatePhone: form.alternatePhone.trim() || null,
      address: form.address.trim() || null,
      occupation: form.occupation.trim() || null,
      medicalHistory: form.medicalHistory.trim() || null,
      allergies: form.allergies.trim() || null,
      notes: form.notes.trim() || null,
      selrsPatientCode: form.selrsPatientCode.trim() || null,
    };

    try {
      if (isEditMode && kfPatientId) {
        await updateMutation.mutateAsync({
          kfId: kfPatientId,
          ...payload,
        });
        toast.success("تم تعديل بيانات المريض بنجاح");
        setLocation(`/kf/patients/${kfPatientId}`);
      } else {
        const result = await createMutation.mutateAsync(payload);
        toast.success(`تم تسجيل المريض بنجاح بكود ${result.kfCode}`);
        setLocation(`/kf/patients/${result.kfId}`);
      }
    } catch (err: any) {
      toast.error(err.message || "حدث خطأ أثناء حفظ البيانات");
    }
  };

  if (isEditMode && loadingPatient) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground text-sm">جاري تحميل بيانات المريض...</p>
      </div>
    );
  }

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <section dir="rtl" className="space-y-4 max-w-4xl mx-auto">
      {/* Header and Back navigation */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Button variant="ghost" size="sm" onClick={() => setLocation(isEditMode ? `/kf/patients/${kfPatientId}` : "/kf/patients")} className="gap-1 cursor-pointer">
          <ChevronRight className="h-4 w-4" />
          <span>الرجوع</span>
        </Button>
      </div>

      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold tracking-tight">
          {isEditMode ? "تعديل بيانات المريض" : "تسجيل مريض جديد"}
        </h1>
        <p className="text-muted-foreground text-sm">
          {isEditMode ? `تعديل الملف الطبي للمريض ${patientData?.kfCode}` : "تسجيل ملف طبي مستقل جديد في وحدة KF"}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Personal Data */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">البيانات الشخصية والأساسية</CardTitle>
            <CardDescription>أدخل الاسم والمعلومات الديموغرافية الأساسية</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="fullName" className="after:content-['*'] after:text-destructive after:mr-1">
                  الاسم بالكامل
                </Label>
                <Input
                  id="fullName"
                  type="text"
                  placeholder="مثال: محمد أحمد علي"
                  value={form.fullName}
                  onChange={(e) => handleChange("fullName", e.target.value)}
                  className={errors.fullName ? "border-destructive" : ""}
                />
                {errors.fullName && <p className="text-xs text-destructive">{errors.fullName}</p>}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-2">
                  <Label htmlFor="age">السن</Label>
                  <Input
                    id="age"
                    type="number"
                    min="0"
                    placeholder="مثال: 45"
                    value={form.age}
                    onChange={(e) => handleChange("age", e.target.value)}
                  />
                  {errors.age && <p className="text-xs text-destructive">{errors.age}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="gender">النوع</Label>
                  <Select
                    value={form.gender}
                    onValueChange={(val: "male" | "female") => handleChange("gender", val)}
                  >
                    <SelectTrigger id="gender">
                      <SelectValue placeholder="اختر..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">ذكر</SelectItem>
                      <SelectItem value="female">أنثى</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="dateOfBirth">تاريخ الميلاد</Label>
                <DateInput
                  id="dateOfBirth"
                  value={form.dateOfBirth}
                  onChange={(e) => handleChange("dateOfBirth", e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="nationalId">الرقم القومي</Label>
                <Input
                  id="nationalId"
                  type="text"
                  maxLength={20}
                  placeholder="14 رقماً"
                  value={form.nationalId}
                  onChange={(e) => handleChange("nationalId", e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="occupation">المهنة</Label>
                <Input
                  id="occupation"
                  type="text"
                  placeholder="مثال: مهندس"
                  value={form.occupation}
                  onChange={(e) => handleChange("occupation", e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Section 2: Contact Information */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">معلومات الاتصال والعنوان</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="phone">رقم الموبايل</Label>
                <Input
                  id="phone"
                  type="text"
                  placeholder="01xxxxxxxxx"
                  value={form.phone}
                  onChange={(e) => handleChange("phone", e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="alternatePhone">رقم هاتف بديل</Label>
                <Input
                  id="alternatePhone"
                  type="text"
                  placeholder="01xxxxxxxxx"
                  value={form.alternatePhone}
                  onChange={(e) => handleChange("alternatePhone", e.target.value)}
                />
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="address">العنوان</Label>
                <Textarea
                  id="address"
                  rows={2}
                  placeholder="العنوان التفصيلي للمريض"
                  value={form.address}
                  onChange={(e) => handleChange("address", e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Section 3: Medical Notes */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">السجل والتاريخ المرضي</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="medicalHistory">التاريخ المرضي العام</Label>
                <Textarea
                  id="medicalHistory"
                  rows={3}
                  placeholder="مثال: يعاني من ضغط الدم المرتفع..."
                  value={form.medicalHistory}
                  onChange={(e) => handleChange("medicalHistory", e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="allergies">الحساسية</Label>
                <Textarea
                  id="allergies"
                  rows={3}
                  placeholder="أي حساسيات يعاني منها المريض (مثل البنسلين)"
                  value={form.allergies}
                  onChange={(e) => handleChange("allergies", e.target.value)}
                />
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="notes">ملاحظات عامة</Label>
                <Textarea
                  id="notes"
                  rows={2}
                  placeholder="أي تفاصيل أو ملاحظات أخرى"
                  value={form.notes}
                  onChange={(e) => handleChange("notes", e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Section 4: Read-Only Bridge to SELRS */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Link2 className="h-5 w-5 text-primary" />
              <span>الربط مع مركز المريض الأساسي (اختياري)</span>
            </CardTitle>
            <CardDescription>ربط هذا الملف بملف المريض الحالي في Saadany Eye Center باستخدام كود المريض</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3 items-end max-w-xl">
              <div className="space-y-2 flex-1">
                <Label htmlFor="selrsPatientCode">كود المريض في SELRS (مثال: P-0001)</Label>
                <Input
                  id="selrsPatientCode"
                  type="text"
                  placeholder="مثال: P-1234"
                  value={form.selrsPatientCode}
                  onChange={(e) => {
                    handleChange("selrsPatientCode", e.target.value);
                    setVerifiedSelrsName(null);
                  }}
                />
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={handleVerifySelrs}
                disabled={isVerifyingSelrs || lookupSelrsQuery.isFetching}
                className="cursor-pointer shrink-0"
              >
                {isVerifyingSelrs || lookupSelrsQuery.isFetching ? (
                  <Loader2 className="h-4 w-4 animate-spin ml-1" />
                ) : null}
                تحقق من الكود
              </Button>
            </div>

            {/* Verification Result message */}
            {verifiedSelrsName !== null && (
              <div className={`flex items-center gap-2 p-3 rounded-lg border text-sm max-w-xl ${
                verifiedSelrsName 
                  ? "bg-success/5 border-success/20 text-success"
                  : "bg-warning/5 border-warning/20 text-warning"
              }`}>
                {verifiedSelrsName ? (
                  <>
                    <Check className="h-4 w-4 shrink-0 text-success" />
                    <p>تم العثور على المريض: <strong>{verifiedSelrsName}</strong></p>
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-4 w-4 shrink-0 text-warning" />
                    <p>لم يتم العثور على مريض بهذا الكود في SELRS. يمكنك الحفظ على أي حال.</p>
                  </>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => setLocation(isEditMode ? `/kf/patients/${kfPatientId}` : "/kf/patients")}
            disabled={isSaving}
            className="cursor-pointer"
          >
            إلغاء
          </Button>
          <Button type="submit" disabled={isSaving} className="gap-2 cursor-pointer">
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            <span>{isEditMode ? "حفظ التعديلات" : "تسجيل المريض"}</span>
          </Button>
        </div>
      </form>
    </section>
  );
}
