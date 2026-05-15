import { useMemo } from "react";
import PatientPicker from "@/components/PatientPicker";
import SearchableCombobox from "@/components/SearchableCombobox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { Trash2 } from "lucide-react";
import type { UseExaminationFormResult } from "@/hooks/examination/useExaminationForm";

interface ExaminationPatientInfoTabProps {
  form: UseExaminationFormResult;
}

export default function ExaminationPatientInfoTab({ form }: ExaminationPatientInfoTabProps) {
  const {
    handleSelectPatient,
    patientInfo,
    setPatientInfo,
    patientDetails,
    setPatientDetails,
    canEditPatientData,
    digitsOnly,
    selectedDoctorEntry,
    doctorName,
    setDoctorName,
    services,
    addService,
    removeService,
    updateService,
    patientShare,
    isFollowup,
    setIsFollowup,
    receptionSignature,
    setReceptionSignature,
    medicalChecklist,
    setMedicalChecklist,
    visitDate,
    setVisitDate,
    doctorsCatalogQuery,
    servicesCatalogQuery,
  } = form;

  const mysqlServices = useMemo(() => (servicesCatalogQuery?.data ?? []) as any[], [servicesCatalogQuery?.data]);
  const mysqlDoctors = useMemo(() => (doctorsCatalogQuery?.data ?? []) as any[], [doctorsCatalogQuery?.data]);
  
  const sortedServices = useMemo(() => {
    const items = [...mysqlServices];
    const codeNum = (value: unknown) => {
      const s = String(value ?? "").trim();
      const n = Number.parseInt(s, 10);
      return Number.isFinite(n) ? n : Number.POSITIVE_INFINITY;
    };
    items.sort((a, b) => {
      const aCode = String((a as any)?.code ?? "").trim();
      const bCode = String((b as any)?.code ?? "").trim();
      const diff = codeNum(aCode) - codeNum(bCode);
      if (diff !== 0) return diff;
      return aCode.localeCompare(bCode, "ar");
    });
    return items;
  }, [mysqlServices]);

  const serviceOptions = useMemo(
    () => [
      { value: "none", label: "— اختر الخدمة" },
      ...sortedServices.map((opt) => ({
        value: opt.code,
        label: `${opt.code} - ${opt.name}`,
        keywords: `${opt.code} ${opt.name}`,
      })),
    ],
    [sortedServices]
  );

  return (
    <TabsContent value="patient-info" className="w-full">
      <Card className="border-0 shadow-none">
        <CardContent className="pt-2 space-y-4 px-4" dir="rtl">
          {/* Top Bar: Mode & Search & Timing combined */}
          <div className="flex flex-col lg:flex-row items-start lg:items-center gap-4 bg-muted/20 p-3 rounded-xl border border-dashed">
            <div className="flex items-center gap-3 shrink-0">
              <Badge variant={!patientInfo.id ? "warning" : "default"} className="px-2 py-0.5 text-[10px] uppercase font-bold">
                {!patientInfo.id ? "تسجيل جديد" : "ملف حالي"}
              </Badge>
              <h2 className={cn("text-lg font-bold whitespace-nowrap", !patientInfo.id ? "text-orange-600" : "text-blue-600")}>
                {!patientInfo.id ? "مريض جديد" : patientInfo.name}
              </h2>
            </div>
            
            <div className="flex-1 w-full flex flex-col sm:flex-row items-center gap-3">
              <div className="flex-1 w-full min-w-[200px]">
                <PatientPicker onSelect={handleSelectPatient} />
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Input
                  type="date"
                  value={visitDate}
                  onChange={(e) => setVisitDate(e.target.value)}
                  className="text-xs border h-8 px-2 w-32"
                />
                <label className="flex items-center gap-2 cursor-pointer rounded-md border border-amber-200 bg-amber-50/30 px-3 py-1.5 h-8">
                  <Checkbox
                    checked={isFollowup}
                    onCheckedChange={(checked) => setIsFollowup(Boolean(checked))}
                    id="followup-main"
                    className="h-4 w-4 border-amber-600 data-[state=checked]:bg-amber-600"
                  />
                  <span className="text-[11px] font-bold text-amber-900">متابعة</span>
                </label>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            {/* Right Column: Patient Information (Now first in RTL) */}
            <div className="space-y-4 order-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <Label className="font-semibold text-[11px] mb-1 block text-muted-foreground">الاسم بالكامل</Label>
                  <Input
                    value={patientInfo.name}
                    onChange={(e) => setPatientInfo((prev) => ({ ...prev, name: e.target.value }))}
                    readOnly={!canEditPatientData}
                    className="text-sm border h-9 px-3 font-medium bg-white"
                    placeholder="اسم المريض..."
                  />
                </div>
                <div>
                  <Label className="font-semibold text-[11px] mb-1 block text-muted-foreground">رقم الموبايل</Label>
                  <Input
                    value={patientDetails.phone}
                    onChange={(e) => setPatientDetails((prev) => ({ ...prev, phone: digitsOnly(e.target.value) }))}
                    readOnly={!canEditPatientData}
                    className="text-sm border h-9 px-3 tracking-widest bg-white"
                    placeholder="01xxxxxxxxx"
                    dir="ltr"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="font-semibold text-[11px] mb-1 block text-muted-foreground">السن</Label>
                    <Input
                      value={patientDetails.age}
                      onChange={(e) => setPatientDetails((prev) => ({ ...prev, age: digitsOnly(e.target.value) }))}
                      readOnly={!canEditPatientData}
                      className="text-sm border h-9 px-2 text-center font-bold bg-white"
                    />
                  </div>
                  <div>
                    <Label className="font-semibold text-[11px] mb-1 block text-muted-foreground">الكود</Label>
                    <Input value={patientInfo.code || "—"} readOnly className="text-sm border h-9 px-2 bg-muted/50 font-mono text-center" />
                  </div>
                </div>
                <div className="sm:col-span-2 grid grid-cols-2 gap-3">
                   <div>
                    <Label className="font-semibold text-[11px] mb-1 block text-muted-foreground">تاريخ الميلاد</Label>
                    <Input
                      type="date"
                      value={(() => {
                        const dob = patientDetails.dateOfBirth;
                        if (!dob) return "";
                        if (dob.match(/^\d{4}-\d{2}-\d{2}$/)) return dob;
                        const date = new Date(dob);
                        if (isNaN(date.getTime())) return "";
                        return date.toISOString().split("T")[0];
                      })()}
                      onChange={(e) => setPatientDetails((prev) => ({ ...prev, dateOfBirth: e.target.value }))}
                      readOnly={!canEditPatientData}
                      className="text-sm border h-9 px-2 bg-white"
                    />
                  </div>
                  <div>
                    <Label className="font-semibold text-[11px] mb-1 block text-muted-foreground">الوظيفة</Label>
                    <Input
                      value={patientDetails.job}
                      onChange={(e) => setPatientDetails((prev) => ({ ...prev, job: e.target.value }))}
                      readOnly={!canEditPatientData}
                      className="text-sm border h-9 px-3 bg-white"
                    />
                  </div>
                </div>
                <div className="sm:col-span-2">
                  <Label className="font-semibold text-[11px] mb-1 block text-muted-foreground">العنوان</Label>
                  <Input
                    value={patientDetails.address}
                    onChange={(e) => setPatientDetails((prev) => ({ ...prev, address: e.target.value }))}
                    readOnly={!canEditPatientData}
                    className="text-sm border h-9 px-3 bg-white"
                  />
                </div>
              </div>
            </div>

            {/* Left Column: Visit Assignment & Financials (Now second in RTL) */}
            <div className="bg-blue-50/40 p-4 rounded-xl border border-blue-100 space-y-3 order-2 h-full flex flex-col">
              <div className="space-y-1">
                <Label className="font-bold text-[11px] text-blue-900">الطبيب المعالج</Label>
                <Select value={doctorName || ""} onValueChange={(name) => setDoctorName(name)}>
                  <SelectTrigger className="h-9 bg-white border-blue-200 text-xs">
                    <SelectValue placeholder="اختر الطبيب" />
                  </SelectTrigger>
                  <SelectContent>
                    {mysqlDoctors.map((doc) => (
                      <SelectItem key={`${(doc as any).id}`} value={String((doc as any)?.name ?? "")} className="text-xs">
                        {String((doc as any)?.name ?? "")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                <div className="flex items-center justify-between sticky top-0 bg-blue-50/40 z-10 py-1">
                   <Label className="font-bold text-[11px] text-blue-900">الخدمات المطلوبة</Label>
                   <Button 
                    type="button" 
                    variant="ghost" 
                    size="sm" 
                    className="h-6 text-[10px] text-blue-700 hover:text-blue-800 hover:bg-blue-100/50"
                    onClick={addService}
                   >
                     + إضافة خدمة
                   </Button>
                </div>

                <div className="space-y-2">
                  {services.map((srv, idx) => (
                    <div key={idx} className="bg-white p-2 rounded-lg border border-blue-100 shadow-sm space-y-1.5 relative group">
                      <div className="flex items-start gap-2">
                        <div className="flex-1 min-w-0">
                          <SearchableCombobox
                            value={srv.code || ""}
                            onChange={(value) => {
                              if (value && value !== "none") {
                                const svc = sortedServices.find((s) => s.code === value);
                                if (svc) {
                                  updateService(idx, {
                                    code: value,
                                    price: Number(svc.price || 0),
                                    discount: 0,
                                    qty: "1"
                                  });
                                }
                              } else {
                                updateService(idx, { code: "", price: 0, discount: 0, qty: "" });
                              }
                            }}
                            options={serviceOptions}
                            className="h-8 text-xs"
                          />
                        </div>
                        {services.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-400 hover:text-red-600 hover:bg-red-50 shrink-0"
                            onClick={() => removeService(idx)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <Label className="text-[9px] mb-0.5 block text-muted-foreground">الكمية</Label>
                          <Input
                            type="number"
                            value={srv.qty || "1"}
                            onChange={(e) => updateService(idx, { qty: e.target.value })}
                            className="h-7 border-blue-100 text-center font-bold text-[11px]"
                            min="1"
                          />
                        </div>
                        <div>
                          <Label className="text-[9px] mb-0.5 block text-muted-foreground">السعر</Label>
                          <Input
                            type="number"
                            min="0"
                            value={srv.price}
                            onChange={(e) => updateService(idx, { price: Math.max(0, Number(e.target.value) || 0) })}
                            className="h-7 border-blue-100 text-center font-bold text-[11px]"
                          />
                        </div>
                        <div>
                          <Label className="text-[9px] mb-0.5 block text-muted-foreground">الخصم</Label>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={srv.discount}
                            onChange={(e) => {
                              const value = Math.max(0, Number(e.target.value) || 0);
                              const total = srv.price * (Number(srv.qty) || 1);
                              updateService(idx, { discount: Math.min(value, total) });
                            }}
                            className="h-7 border-blue-100 text-center font-bold text-[11px] text-red-600"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-auto pt-3 border-t border-blue-100 flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="font-bold text-[11px] text-emerald-900 block">المطلوب تحصيله</Label>
                  <div className="text-2xl font-black text-emerald-600 tabular-nums">
                    <span className="text-[10px] font-normal opacity-60 ml-1">EGP</span>
                    {patientShare.toFixed(2)}
                  </div>
                </div>
                <div className="text-left space-y-1">
                  <Label className="font-bold text-[10px] text-muted-foreground block">توقيع الاستقبال</Label>
                  <Input
                    value={receptionSignature}
                    onChange={(e) => setReceptionSignature(e.target.value)}
                    className="text-xs border-0 border-b border-muted rounded-none h-7 p-0 bg-transparent text-left w-32 focus-visible:ring-0"
                    placeholder="..."
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Medical Checklist (hidden) */}
          <div className="hidden">
            {Object.entries(medicalChecklist).map(([key, value]) => (
              <input key={key} type="hidden" value={String(value)} />
            ))}
          </div>
        </CardContent>
      </Card>
    </TabsContent>
  );
}
