import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Save } from "lucide-react";

export interface MedicalHistoryDraft {
  diabetes: boolean;
  hypertension: boolean;
  heartDisease: boolean;
  asthma: boolean;
  allergies: boolean;
  thyroid: boolean;
  autoimmune: boolean;
  familyKeratoconus: boolean;
  glaucoma: boolean;
  previousSurgeries: string;
  medications: string;
  familyHistory: string;
}

export const EMPTY_MEDICAL_HISTORY: MedicalHistoryDraft = {
  diabetes: false,
  hypertension: false,
  heartDisease: false,
  asthma: false,
  allergies: false,
  thyroid: false,
  autoimmune: false,
  familyKeratoconus: false,
  glaucoma: false,
  previousSurgeries: "",
  medications: "",
  familyHistory: "",
};

interface MedicalHistoryTabProps {
  patientId?: number;
  history?: string;
  symptoms: string[];
  onRefresh?: () => void;
  onChange?: (value: MedicalHistoryDraft) => void;
}

export const MedicalHistoryTab: React.FC<MedicalHistoryTabProps> = ({
  patientId,
  history,
  symptoms,
  onRefresh,
  onChange,
}) => {
  const [diabetes, setDiabetes] = useState(false);
  const [hypertension, setHypertension] = useState(false);
  const [heartDisease, setHeartDisease] = useState(false);
  const [asthma, setAsthma] = useState(false);
  const [allergies, setAllergies] = useState(false);
  const [thyroid, setThyroid] = useState(false);
  const [autoimmune, setAutoimmune] = useState(false);
  const [familyKeratoconus, setFamilyKeratoconus] = useState(false);
  const [glaucoma, setGlaucoma] = useState(false);
  const [previousSurgeries, setPreviousSurgeries] = useState("");
  const [medications, setMedications] = useState("");
  const [familyHistory, setFamilyHistory] = useState("");

  const historyQuery = trpc.medical.getMedicalHistoryByPatient.useQuery(
    { patientId: patientId ?? 0 },
    { enabled: Boolean(patientId), staleTime: 0 },
  );

  const saveMutation = trpc.medical.upsertMedicalHistory.useMutation({
    onSuccess: () => {
      toast.success("تم حفظ التاريخ المرضي بنجاح");
      historyQuery.refetch();
      onRefresh?.();
    },
    onError: (err) => {
      toast.error(`حدث خطأ أثناء الحفظ: ${err.message}`);
    },
  });

  useEffect(() => {
    if (historyQuery.data && historyQuery.data.length > 0) {
      const rec = historyQuery.data[0];
      setDiabetes(Boolean(rec.diabetes));
      setHypertension(Boolean(rec.hypertension));
      setHeartDisease(Boolean(rec.heartDisease));
      setAsthma(Boolean(rec.asthma));
      setAllergies(Boolean(rec.allergies));
      setThyroid(Boolean(rec.thyroid));
      setAutoimmune(Boolean(rec.autoimmune));
      setFamilyKeratoconus(Boolean(rec.familyKeratoconus));
      setGlaucoma(Boolean(rec.glaucoma));
      setPreviousSurgeries(rec.previousSurgeries ?? "");
      setMedications(rec.medications ?? "");
      setFamilyHistory(rec.familyHistory ?? "");
    }
  }, [historyQuery.data]);

  useEffect(() => {
    onChange?.({
      diabetes,
      hypertension,
      heartDisease,
      asthma,
      allergies,
      thyroid,
      autoimmune,
      familyKeratoconus,
      glaucoma,
      previousSurgeries,
      medications,
      familyHistory,
    });
  }, [
    allergies,
    asthma,
    autoimmune,
    diabetes,
    familyHistory,
    familyKeratoconus,
    glaucoma,
    heartDisease,
    hypertension,
    medications,
    onChange,
    previousSurgeries,
    thyroid,
  ]);

  const handleSave = () => {
    if (!patientId) {
      toast.error("تعذر التعرف على المريض");
      return;
    }
    saveMutation.mutate({
      patientId,
      diabetes,
      hypertension,
      heartDisease,
      asthma,
      allergies,
      thyroid,
      autoimmune,
      familyKeratoconus,
      glaucoma,
      previousSurgeries,
      medications,
      familyHistory,
    });
  };

  return (
    <div className="w-full" dir="rtl">
      <Card className="patient-medical-history-card border-slate-200/80 bg-white shadow-xs w-full rounded-2xl overflow-hidden">
        <CardContent className="patient-medical-history-content p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-start">
            {/* Right Side: Chronic Diseases Cards */}
            <div>
              <div className="flex items-center justify-between mb-2 h-5">
                <Label className="text-xs font-bold text-slate-800 flex items-center">
                  🩺 التاريخ المرضي العام (Medical History):
                </Label>
                {patientId && (
                  <Button
                    size="sm"
                    onClick={handleSave}
                    disabled={saveMutation.isPending}
                    className="bg-blue-600 text-white hover:bg-blue-700 font-bold h-7 px-3 rounded-lg gap-1 text-[11px] shadow-2xs"
                  >
                    <Save className="h-3 w-3" />
                    {saveMutation.isPending ? "جاري الحفظ..." : "حفظ التعديلات"}
                  </Button>
                )}
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[
                  {
                    label: "مرض السكري",
                    state: diabetes,
                    setter: setDiabetes,
                    icon: "🩸",
                  },
                  {
                    label: "ضغط الدم",
                    state: hypertension,
                    setter: setHypertension,
                    icon: "🫀",
                  },
                  {
                    label: "أمراض القلب",
                    state: heartDisease,
                    setter: setHeartDisease,
                    icon: "❤️",
                  },
                  {
                    label: "الربو الشعبية",
                    state: asthma,
                    setter: setAsthma,
                    icon: "🫁",
                  },
                  {
                    label: "حساسية عامة",
                    state: allergies,
                    setter: setAllergies,
                    icon: "🤧",
                  },
                  {
                    label: "الغدة الدرقية",
                    state: thyroid,
                    setter: setThyroid,
                    icon: "🦋",
                  },
                  {
                    label: "أمراض مناعية",
                    state: autoimmune,
                    setter: setAutoimmune,
                    icon: "🛡️",
                  },
                  {
                    label: "ماء زرقاء (جلوكوما)",
                    state: glaucoma,
                    setter: setGlaucoma,
                    icon: "💧",
                  },
                  {
                    label: "قرنية مخروطية بالعائلة",
                    state: familyKeratoconus,
                    setter: setFamilyKeratoconus,
                    icon: "👁️",
                  },
                ].map((item) => (
                  <label
                    key={item.label}
                    className={`flex items-center gap-1.5 p-2 rounded-xl border transition-all cursor-pointer ${
                      item.state
                        ? "border-blue-300 bg-blue-50/60 text-blue-900 font-bold shadow-2xs"
                        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <Checkbox
                      checked={item.state}
                      onCheckedChange={(checked) =>
                        item.setter(Boolean(checked))
                      }
                    />
                    <span className="text-[11px] font-medium leading-tight">
                      {item.icon} {item.label}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Left Side: Text Inputs Stacked Vertically */}
            <div className="flex flex-col gap-2">
              <div>
                <Label className="text-xs font-bold text-slate-700 mb-2 block flex items-center h-5">
                  العمليات الجراحية السابقة:
                </Label>
                <Input
                  value={previousSurgeries}
                  onChange={(e) => setPreviousSurgeries(e.target.value)}
                  placeholder="مثال: مياه بيضاء، ليزك سابق..."
                  className="h-8 text-xs rounded-lg"
                />
              </div>
              <div>
                <Label className="text-xs font-bold text-slate-700 mb-1 block">
                  الأدوية والعلاجات الحالية:
                </Label>
                <Input
                  value={medications}
                  onChange={(e) => setMedications(e.target.value)}
                  placeholder="مثال: أتروبين، قطرات ضغط العين..."
                  className="h-8 text-xs rounded-lg"
                />
              </div>
              <div>
                <Label className="text-xs font-bold text-slate-700 mb-1 block">
                  التاريخ المرضي العائلي:
                </Label>
                <Input
                  value={familyHistory}
                  onChange={(e) => setFamilyHistory(e.target.value)}
                  placeholder="مثال: جلوكوما، قرنية مخروطية..."
                  className="h-8 text-xs rounded-lg"
                />
              </div>
            </div>
          </div>

          {history && (
            <div className="mt-3 rounded-lg border border-slate-200 p-3 bg-slate-50 text-xs text-slate-700 whitespace-pre-wrap">
              <span className="font-bold block mb-1 text-slate-800">
                ملاحظات تاريخية سابقة:
              </span>
              {history}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
