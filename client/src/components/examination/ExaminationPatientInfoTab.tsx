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
    sheetSelection,
    setSheetSelection,
    serviceCode,
    setServiceCode,
    serviceQty,
    setServiceQty,
    locationType,
    setLocationType,
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

  const selectedService = useMemo(
    () => mysqlServices.find((s) => String(s.code).trim() === String(serviceCode).trim()),
    [mysqlServices, serviceCode]
  );

  const { serviceTotalPrice, serviceTotal, patientShare } = useMemo(() => {
    const price = selectedService && selectedService.price ? Number(selectedService.price) : 0;
    const total = price * (Number(serviceQty) || 1);
    return {
      serviceTotalPrice: price,
      serviceTotal: total,
      patientShare: Math.max(0, total - discountValue),
    };
  }, [selectedService, serviceQty, discountValue]);

  const serviceOptions = useMemo(
    () => [
      { value: "none", label: "— اختر الخدمة" },
      ...mysqlServices.map((opt) => ({
        value: opt.code,
        label: `${opt.code} - ${opt.name}`,
        keywords: `${opt.code} ${opt.name}`,
      })),
    ],
    [mysqlServices]
  );

  return (
    <TabsContent value="patient-info" className="w-full">
      <Card className="border-0 shadow-none">
        <CardContent className="pt-6 space-y-4 px-6" dir="rtl">
          {/* Top: Visit Date + Followup */}
          <div className="flex gap-4 items-center justify-between bg-white p-4 rounded-lg border" dir="rtl">
            <div className="flex items-center gap-2">
              <Checkbox
                checked={isFollowup}
                onCheckedChange={(checked) => setIsFollowup(Boolean(checked))}
                id="followup-main"
              />
              <Label htmlFor="followup-main" className="font-semibold cursor-pointer text-sm">متابعة</Label>
            </div>
            <div className="flex items-center gap-3 ml-auto">
              <Input
                type="date"
                value={visitDate}
                onChange={(e) => setVisitDate(e.target.value)}
                className="text-sm border rounded h-9 px-3 w-32"
              />
              <Label className="font-semibold whitespace-nowrap text-sm">تاريخ الزيارة</Label>
            </div>
          </div>

          {/* Patient Search */}
          <div className="mb-4 flex gap-3 items-center p-3 bg-white rounded-lg border" dir="rtl">
            <PatientPicker onSelect={handleSelectPatient} />
          </div>

          {/* Patient Info Table */}
          <div className="overflow-x-auto border rounded-lg bg-white">
            <table className="w-full text-xs text-right border-collapse">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="p-2 font-semibold text-right">الاسم</th>
                  <th className="p-2 font-semibold text-right border-l">تاريخ الميلاد</th>
                  <th className="p-2 font-semibold text-right border-l">السن</th>
                  <th className="p-2 font-semibold text-right border-l">الموبايل</th>
                  <th className="p-2 font-semibold text-right border-l">كود العميل</th>
                  <th className="p-2 font-semibold text-right border-l">العنوان</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b hover:bg-gray-50">
                  <td className="p-2">
                    <Input
                      value={patientInfo.name}
                      onChange={(e) => setPatientInfo((prev) => ({ ...prev, name: e.target.value }))}
                      readOnly={!canEditPatientData}
                      className="text-xs border h-8 px-2 text-right"
                      placeholder="—"
                    />
                  </td>
                  <td className="p-2 border-l">
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
                      className="text-xs border h-8 px-2"
                    />
                  </td>
                  <td className="p-2 border-l">
                    <Input
                      value={patientDetails.age}
                      onChange={(e) => setPatientDetails((prev) => ({ ...prev, age: digitsOnly(e.target.value) }))}
                      readOnly={!canEditPatientData}
                      className="text-xs border h-8 px-2 text-right"
                      placeholder="—"
                    />
                  </td>
                  <td className="p-2 border-l">
                    <Input
                      value={patientDetails.phone}
                      onChange={(e) => setPatientDetails((prev) => ({ ...prev, phone: digitsOnly(e.target.value) }))}
                      readOnly={!canEditPatientData}
                      className="text-xs border h-8 px-2 text-right"
                      placeholder="—"
                    />
                  </td>
                  <td className="p-2 border-l">
                    <Input
                      value={patientInfo.code || "تلقائي"}
                      readOnly
                      className="text-xs border h-8 px-2 bg-gray-100 text-right"
                    />
                  </td>
                  <td className="p-2 border-l">
                    <Input
                      value={patientDetails.address}
                      onChange={(e) => setPatientDetails((prev) => ({ ...prev, address: e.target.value }))}
                      readOnly={!canEditPatientData}
                      className="text-xs border h-8 px-2 text-right"
                      placeholder="—"
                    />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Doctor Selector */}
          <div className="flex gap-3 items-center p-4 bg-white rounded-lg border text-sm" dir="rtl">
            <Select
              value={doctorName || ""}
              onValueChange={(name) => setDoctorName(name)}
            >
              <SelectTrigger className="w-72 h-8 text-sm text-right">
                <SelectValue placeholder="اختر الطبيب">
                  {selectedDoctorEntry
                    ? `${(selectedDoctorEntry as any).doctorType || "—"} - ${(selectedDoctorEntry as any).code || ""}`
                    : "اختر الطبيب"}
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
            <Label className="font-semibold whitespace-nowrap text-sm">الطبيب</Label>
          </div>

          {/* Services Table */}
          <div className="border-t pt-4">
            <div className="bg-blue-900 text-white font-bold p-2 rounded-t text-sm text-right">خدمات الزيارة</div>
            <div className="overflow-x-auto border border-t-0 rounded-b bg-white">
              <table className="w-full text-xs text-right border-collapse">
                <thead className="bg-blue-900 text-white border-b">
                  <tr>
                    <th className="p-2 font-bold">كود الخدمة</th>
                    <th className="p-2 font-bold border-l">اسم الخدمة</th>
                    <th className="p-2 font-bold border-l">الكمية</th>
                    <th className="p-2 font-bold border-l">التاريخ</th>
                    <th className="p-2 font-bold border-l">الوقت</th>
                    <th className="p-2 font-bold border-l">السعر</th>
                    <th className="p-2 font-bold border-l">الخصم</th>
                    <th className="p-2 font-bold border-l">ما يخص المريض</th>
                    <th className="p-2 font-bold border-l">إجمالي الجهة</th>
                    <th className="p-2 font-bold border-l">كود الطبيب</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b hover:bg-gray-50">
                    <td className="p-2 text-center">
                      <SearchableCombobox
                        value={serviceCode || ""}
                        onChange={(value) => {
                          if (value && value !== "none") {
                            setServiceCode(value);
                            const svc = mysqlServices.find((s) => s.code === value);
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
                        className="w-20"
                      />
                    </td>
                    <td className="p-2 border-l">
                      {selectedService?.name || "—"}
                    </td>
                    <td className="p-2 text-center border-l">
                      <Input
                        type="number"
                        value={serviceQty || "1"}
                        onChange={(e) => setServiceQty(e.target.value)}
                        className="w-12 h-6 text-xs text-center border p-0"
                        min="1"
                      />
                    </td>
                    <td className="p-2 text-center border-l">
                      <Input
                        type="date"
                        value={visitDate}
                        onChange={(e) => setVisitDate(e.target.value)}
                        className="w-20 h-6 text-xs border p-0"
                      />
                    </td>
                    <td className="p-2 text-center border-l">
                      <span className="text-gray-400">—</span>
                    </td>
                    <td className="p-2 text-center font-semibold border-l">
                      {serviceTotalPrice.toFixed(2)}
                    </td>
                    <td className="p-2 text-center border-l">
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={discountValue}
                        onChange={(e) => {
                          const value = Math.max(0, Number(e.target.value) || 0);
                          setDiscountValue(Math.min(value, serviceTotal));
                        }}
                        className="w-16 h-6 text-xs text-center border p-0"
                        placeholder="0"
                      />
                    </td>
                    <td className="p-2 text-center font-semibold border-l">
                      {patientShare.toFixed(2)}
                    </td>
                    <td className="p-2 text-center border-l">0</td>
                    <td className="p-2 text-center border-l">
                      {selectedDoctorEntry ? String((selectedDoctorEntry as any)?.code ?? "") : "—"}
                    </td>
                  </tr>
                  <tr className="bg-gray-100 font-bold text-xs border-t-2 border-gray-300">
                    <td colSpan={2} className="p-2 text-right">الإجمالي</td>
                    <td className="p-2 border-l">1</td>
                    <td className="p-2 border-l"></td>
                    <td className="p-2 border-l"></td>
                    <td className="p-2 text-center border-l">
                      {serviceTotal.toFixed(2)}
                    </td>
                    <td className="p-2 text-center border-l">
                      {discountValue.toFixed(2)}
                    </td>
                    <td className="p-2 text-center border-l">
                      {patientShare.toFixed(2)}
                    </td>
                    <td className="p-2 text-center border-l">0</td>
                    <td className="p-2 text-center border-l">
                      {selectedDoctorEntry ? String((selectedDoctorEntry as any)?.code ?? "") : "—"}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Sheet Type Checkboxes */}
          <div className="flex flex-wrap gap-4 justify-end pt-3 text-sm">
            {[
              { type: "consultant", label: "استشاري" },
              { type: "specialist", label: "اخصائي" },
              { type: "lasik", label: "فحوصات الليزك" },
              { type: "external", label: "خارجي" },
            ].map((sheet) => (
              <label key={sheet.type} className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={sheetSelection === sheet.type}
                  onCheckedChange={(checked) => {
                    if (checked) setSheetSelection(sheet.type);
                  }}
                />
                <span>{sheet.label}</span>
              </label>
            ))}
          </div>

          {/* Location & Followup Checkboxes */}
          <div className="flex flex-wrap gap-6 justify-end text-sm">
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={locationType === "center"}
                onCheckedChange={(checked) => {
                  if (checked) setLocationType("center");
                }}
              />
              <span>مركز</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={locationType === "external"}
                onCheckedChange={(checked) => {
                  if (checked) setLocationType("external");
                }}
              />
              <span>خارجي</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={isFollowup}
                onCheckedChange={(checked) => setIsFollowup(Boolean(checked))}
              />
              <span>متابعة</span>
            </label>
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
