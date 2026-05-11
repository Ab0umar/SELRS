import { useMemo } from "react";
import PatientPicker from "@/components/PatientPicker";
import SearchableCombobox from "@/components/SearchableCombobox";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TabsContent } from "@/components/ui/tabs";
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
    serviceCode,
    setServiceCode,
    serviceQty,
    setServiceQty,
    isFollowup,
    setIsFollowup,
    receptionSignature,
    setReceptionSignature,
    medicalChecklist,
    setMedicalChecklist,
    servicePrice,
    setServicePrice,
    discountValue,
    setDiscountValue,
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

  const selectedService = useMemo(
    () => sortedServices.find((s) => String(s.code).trim() === String(serviceCode).trim()),
    [sortedServices, serviceCode]
  );

  const { serviceTotalPrice, serviceTotal, patientShare } = useMemo(() => {
    const selectedPrice = selectedService && selectedService.price ? Number(selectedService.price) : 0;
    const price = servicePrice > 0 ? servicePrice : selectedPrice;
    const total = price * (Number(serviceQty) || 1);
    return {
      serviceTotalPrice: price,
      serviceTotal: total,
      patientShare: Math.max(0, total - discountValue),
    };
  }, [selectedService, servicePrice, serviceQty, discountValue]);

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
        <CardContent className="pt-6 space-y-4 px-6" dir="rtl">
          <div className="bg-white rounded-lg border divide-y" dir="rtl">
            <div className="p-4 flex flex-col lg:flex-row gap-3 lg:items-center">
              <div className="flex-1">
                <PatientPicker onSelect={handleSelectPatient} />
              </div>
              <div className="flex items-center gap-2">
                <Input
                  type="date"
                  value={visitDate}
                  onChange={(e) => setVisitDate(e.target.value)}
                  className="text-sm border rounded h-9 px-3 w-40"
                />
                <Label className="font-semibold whitespace-nowrap text-sm">تاريخ الزيارة</Label>
              </div>
              <label className="flex items-center gap-3 cursor-pointer rounded-md border-2 border-amber-300 bg-amber-50 px-3 py-2 shadow-sm">
                <Checkbox
                  checked={isFollowup}
                  onCheckedChange={(checked) => setIsFollowup(Boolean(checked))}
                  id="followup-main"
                  className="h-5 w-5 border-2 border-amber-600 data-[state=checked]:bg-amber-600 data-[state=checked]:text-white"
                />
                <Label htmlFor="followup-main" className="cursor-pointer text-base font-extrabold text-amber-900">متابعة</Label>
              </label>
            </div>

            <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <Label className="font-semibold whitespace-nowrap text-sm mb-2 block">الاسم</Label>
                <Input
                  value={patientInfo.name}
                  onChange={(e) => setPatientInfo((prev) => ({ ...prev, name: e.target.value }))}
                  readOnly={!canEditPatientData}
                  className="text-sm border h-9 px-3 text-right"
                  placeholder="—"
                />
              </div>
              <div>
                <Label className="font-semibold whitespace-nowrap text-sm mb-2 block">تاريخ الميلاد</Label>
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
                  disabled={!canEditPatientData}
                  className="text-sm border h-9 px-3"
                />
              </div>
              <div>
                <Label className="font-semibold whitespace-nowrap text-sm mb-2 block">السن</Label>
                <Input
                  value={patientDetails.age}
                  onChange={(e) => setPatientDetails((prev) => ({ ...prev, age: digitsOnly(e.target.value) }))}
                  readOnly={!canEditPatientData}
                  className="text-sm border h-9 px-3 text-right"
                  placeholder="—"
                />
              </div>
            </div>

            <div className="p-4 grid grid-cols-1 md:grid-cols-4 gap-3">
              <div>
                <Label className="font-semibold whitespace-nowrap text-sm mb-2 block">العنوان</Label>
                <Input
                  value={patientDetails.address}
                  onChange={(e) => setPatientDetails((prev) => ({ ...prev, address: e.target.value }))}
                  readOnly={!canEditPatientData}
                  className="text-sm border h-9 px-3 text-right"
                  placeholder="—"
                />
              </div>
              <div>
                <Label className="font-semibold whitespace-nowrap text-sm mb-2 block">الموبايل</Label>
                <Input
                  value={patientDetails.phone}
                  onChange={(e) => setPatientDetails((prev) => ({ ...prev, phone: digitsOnly(e.target.value) }))}
                  readOnly={!canEditPatientData}
                  className="text-sm border h-9 px-3 text-right"
                  placeholder="—"
                />
              </div>
              <div>
                <Label className="font-semibold whitespace-nowrap text-sm mb-2 block">الكود</Label>
                <Input
                  value={patientInfo.code || "تلقائي"}
                  readOnly
                  className="text-sm border h-9 px-3 bg-gray-100 text-right"
                />
              </div>
              <div>
                <Label className="font-semibold whitespace-nowrap text-sm mb-2 block">الوظيفة</Label>
                <Input
                  value={patientDetails.job}
                  onChange={(e) => setPatientDetails((prev) => ({ ...prev, job: e.target.value }))}
                  readOnly={!canEditPatientData}
                  className="text-sm border h-9 px-3 text-right"
                  placeholder="—"
                />
              </div>
            </div>

            <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label className="font-semibold whitespace-nowrap text-sm mb-2 block">الطبيب</Label>
                <Select value={doctorName || ""} onValueChange={(name) => setDoctorName(name)}>
                  <SelectTrigger className="h-9 text-sm text-right">
                    <SelectValue placeholder="اختر الطبيب">
                      {selectedDoctorEntry ? (
                        <span className="inline-flex items-center gap-1.5">
                          <span>{String((selectedDoctorEntry as any).name ?? "").trim() || "طبيب غير محدد"}</span>
                          {String((selectedDoctorEntry as any).code ?? "").trim() ? (
                            <span className="text-xs text-muted-foreground" dir="ltr">
                              ({String((selectedDoctorEntry as any).code ?? "").trim()})
                            </span>
                          ) : null}
                        </span>
                      ) : (
                        "اختر الطبيب"
                      )}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {mysqlDoctors.map((doc) => (
                      <SelectItem key={`${(doc as any).id}`} value={String((doc as any)?.name ?? "")}>
                        {`${String((doc as any)?.name ?? "")} (${String((doc as any)?.code ?? "")})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="font-semibold whitespace-nowrap text-sm mb-2 block">الخدمة</Label>
                <SearchableCombobox
                  value={serviceCode || ""}
                  onChange={(value) => {
                    if (value && value !== "none") {
                      setServiceCode(value);
                      const svc = sortedServices.find((s) => s.code === value);
                      if (svc) {
                        setServicePrice(Number(svc.price || 0));
                        setDiscountValue(0);
                        setServiceQty("1");
                      }
                    } else if (value === "none" || !value) {
                      setServiceCode("");
                      setServicePrice(0);
                      setDiscountValue(0);
                      setServiceQty("");
                    }
                  }}
                  options={serviceOptions}
                  placeholder="ابحث"
                  searchPlaceholder="ابحث عن خدمة..."
                  className="w-full"
                />
              </div>
            </div>

            <div className="p-4 grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
              <div>
                <Label className="font-semibold whitespace-nowrap text-sm mb-2 block">الكمية</Label>
                <Input
                  type="number"
                  value={serviceQty || "1"}
                  onChange={(e) => setServiceQty(e.target.value)}
                  className="h-9 text-sm text-right"
                  min="1"
                />
              </div>
              <div>
                <Label className="font-semibold whitespace-nowrap text-sm mb-2 block">السعر</Label>
                <Input
                  type="number"
                  min="0"
                  value={serviceTotalPrice}
                  onChange={(e) => setServicePrice(Math.max(0, Number(e.target.value) || 0))}
                  className="h-9 text-sm text-right"
                />
              </div>
              <div>
                <Label className="font-semibold whitespace-nowrap text-sm mb-2 block">الخصم</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={discountValue}
                  onChange={(e) => {
                    const value = Math.max(0, Number(e.target.value) || 0);
                    setDiscountValue(Math.min(value, serviceTotal));
                  }}
                  className="h-9 text-sm text-right"
                  placeholder="0"
                />
              </div>
              <div>
                <Label className="font-semibold whitespace-nowrap text-sm mb-2 block">ما يخص المريض</Label>
                <div className="h-9 px-3 border rounded-md flex items-center font-bold text-sm">
                  {patientShare.toFixed(2)}
                </div>
              </div>
            </div>
          </div>

          {/* Reception Signature */}
          <div className="border-t pt-3 text-sm">
            <Label className="block font-semibold text-right mb-2">توقيع الاستقبال</Label>
            <Input
              value={receptionSignature}
              onChange={(e) => setReceptionSignature(e.target.value)}
              className="text-xs border h-8 p-2 w-full text-right"
              placeholder="توقيع الاستقبال"
            />
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
