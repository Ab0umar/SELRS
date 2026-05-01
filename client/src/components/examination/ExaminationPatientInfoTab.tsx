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
    setDoctorName,
    availableDoctors,
    normalizeDoctorTypeToSheet,
    setSheetSelection,
    serviceCode,
    setServiceCode,
    serviceOptions,
    isPentacamService,
    serviceQty,
    setServiceQty,
    sheetSelection,
    locationType,
    setLocationType,
    isFollowup,
    setIsFollowup,
    receptionSignature,
    setReceptionSignature,
    medicalChecklist,
    setMedicalChecklist,
  } = form;

  return (
            <TabsContent value="patient-info">
              <Card>
                {/* no header */}
                <CardContent>
                  <div className="mb-4 flex justify-end">
                    <PatientPicker onSelect={handleSelectPatient} />
                  </div>
                  <div className="space-y-3 text-xs" dir="rtl" style={{ textAlign: "center" }}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 w-full">
                      <div className="flex items-center gap-2 min-w-0">
                        <Label htmlFor="patient-name" className="font-bold">الاسم</Label>
                        <Input
                          name="patient-name"
                          id="patient-name"
                          value={patientInfo.name}
                          onChange={(e) =>
                            setPatientInfo((prev) => ({ ...prev, name: e.target.value }))
                          }
                          readOnly={!canEditPatientData}
                          className="text-xs border-0 flex-1 min-w-0"
                          style={{ textAlign: "right" }}
                        />
                      </div>
                      <div className="flex items-center gap-2 min-w-0">
                        <Label htmlFor="patient-dob" className="font-bold">تاريخ الميلاد</Label>
                        <Input
                          name="patient-dob"
                          id="patient-dob"
                          type="date"
                          value={(() => {
                            const dob = patientDetails.dateOfBirth;
                            if (!dob) return "";
                            // Convert to yyyy-MM-dd format if not already
                            if (dob.match(/^\d{4}-\d{2}-\d{2}$/)) return dob;
                            const date = new Date(dob);
                            if (isNaN(date.getTime())) return "";
                            return date.toISOString().split("T")[0];
                          })()}
                          onChange={(e) =>
                            setPatientDetails((prev) => ({ ...prev, dateOfBirth: e.target.value }))
                          }
                          readOnly={!canEditPatientData}
                          disabled={!canEditPatientData}
                          className="text-xs border-0 flex-1 min-w-0"
                          style={{ textAlign: "right" }}
                        />
                      </div>
                      <div className="flex items-center gap-2 min-w-0">
                        <Label htmlFor="patient-age" className="font-bold">السن</Label>
                        <Input
                          name="patient-age"
                          id="patient-age"
                          value={patientDetails.age}
                          onChange={(e) =>
                            setPatientDetails((prev) => ({ ...prev, age: digitsOnly(e.target.value) }))
                          }
                          readOnly={!canEditPatientData}
                          className="text-xs border-0 flex-1 min-w-0"
                          style={{ textAlign: "right" }}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 w-full">
                      <div className="flex items-center gap-2 min-w-0">
                        <Label htmlFor="patient-address" className="font-bold">العنوان</Label>
                        <Input
                          name="patient-address"
                          id="patient-address"
                          value={patientDetails.address}
                          onChange={(e) =>
                            setPatientDetails((prev) => ({ ...prev, address: e.target.value }))
                          }
                          readOnly={!canEditPatientData}
                          className="text-xs border-0 flex-1 min-w-0"
                          style={{ textAlign: "right" }}
                        />
                      </div>
                      <div className="flex items-center gap-2 min-w-0">
                        <Label htmlFor="patient-phone" className="font-bold">الموبايل</Label>
                        <Input
                          name="patient-phone"
                          id="patient-phone"
                          value={patientDetails.phone}
                          onChange={(e) =>
                            setPatientDetails((prev) => ({ ...prev, phone: digitsOnly(e.target.value) }))
                          }
                          readOnly={!canEditPatientData}
                          className="text-xs border-0 flex-1 min-w-0"
                          style={{ textAlign: "right" }}
                        />
                      </div>
                      <div className="flex items-center gap-2 min-w-0">
                        <Label htmlFor="patient-code" className="font-bold">كود العميل</Label>
                        <Input
                          name="patient-code"
                          id="patient-code"
                          value={patientInfo.code}
                          readOnly
                          disabled
                          className="text-xs border-0 flex-1 min-w-0"
                          style={{ textAlign: "right" }}
                        />
                      </div>
                      <div className="flex items-center gap-2 min-w-0">
                        <Label htmlFor="patient-job" className="font-bold">الوظيفة</Label>
                        <Input
                          name="patient-job"
                          id="patient-job"
                          placeholder=""
                          value={patientDetails.job}
                          onChange={(e) =>
                            setPatientDetails((prev) => ({ ...prev, job: e.target.value }))
                          }
                          readOnly={!canEditPatientData}
                          className="text-xs border-0 flex-1 min-w-0"
                          style={{ textAlign: "right" }}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-bold text-sm">الطبيب</span>
                        <SearchableCombobox
                          value={String((selectedDoctorEntry as any)?.code ?? "")}
                          onChange={(value) => {
                            if (!value) {
                              setDoctorName("");
                              return;
                            }
                            const doctor = availableDoctors.find((item) => String(item.code ?? "").trim() === value);
                            setDoctorName(String(doctor?.name ?? ""));
                            const defaultSheet = normalizeDoctorTypeToSheet(doctor?.doctorType ?? "");
                            if (defaultSheet) setSheetSelection(defaultSheet);
                          }}
                          options={[
                            { value: "", label: "—" },
                            ...availableDoctors.map((doctor) => ({
                              value: String(doctor.code ?? "").trim(),
                              label: `${doctor.name}${doctor.code ? ` (${doctor.code})` : ""}`,
                              keywords: `${doctor.name} ${doctor.username ?? ""} ${doctor.code ?? ""}`,
                            })),
                          ]}
                          placeholder="اختر الطبيب"
                          searchPlaceholder="ابحث عن طبيب..."
                          className="border-0 w-full sm:w-48 min-w-0"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
                      <div className="flex items-center gap-2 min-w-0">
                        <Label htmlFor="srv-code" className="font-bold">الخدمة</Label>
                        <SearchableCombobox
                          value={serviceCode}
                          onChange={(value) => setServiceCode(value)}
                          options={[
                            { value: "", label: "—" },
                            ...serviceOptions.map((opt) => ({
                              value: opt.code,
                              label: `${opt.code} - ${opt.name}`,
                              keywords: `${opt.code} ${opt.name}`,
                            })),
                          ]}
                          placeholder="اختر الخدمة"
                          searchPlaceholder="ابحث عن خدمة..."
                          emptyText="لا توجد خدمات مطابقة للطبيب"
                          className="border-0 w-full sm:w-64 min-w-0"
                        />
                      </div>
                      {isPentacamService ? (
                        <div className="flex items-center gap-2 min-w-0">
                          <Label htmlFor="srv-qty" className="font-bold">الكمية</Label>
                          <Select
                            value={serviceQty || "2"}
                            onValueChange={(value) => setServiceQty(value)}
                          >
                            <SelectTrigger id="srv-qty" className="text-xs border-0 w-full sm:w-32 min-w-0">
                              <SelectValue placeholder="الكمية" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="1">1</SelectItem>
                              <SelectItem value="2">2</SelectItem>
                              <SelectItem value="3">3</SelectItem>
                              <SelectItem value="4">4</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      ) : null}
                    </div>
                  </div>
                  <div className="mt-4 flex items-center justify-between gap-4 flex-wrap w-full">
                    {[
                      { type: "external", label: "خارجي" },
                      { type: "lasik", label: "فحوصات الليزك" },
                      { type: "specialist", label: "اخصائي" },
                      { type: "consultant", label: "استشاري", isFirst: true },
                    ].map((sheet) => (
                      <label key={sheet.type} className="flex items-center gap-2 cursor-pointer">
                        <Checkbox
                          checked={sheetSelection === sheet.type}
                          onCheckedChange={(checked) => {
                            if (!checked) return;
                            setSheetSelection(sheet.type);
                          }}
                        />
                        <span>{sheet.label}</span>
                      </label>
                    ))}
                  </div>
                  <div className="mt-3 flex items-center gap-6 flex-wrap w-full">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <Checkbox
                        checked={locationType === "center"}
                        disabled={!canEditPatientData}
                        onCheckedChange={(checked) => {
                          if (!checked) return;
                          setLocationType("center");
                        }}
                      />
                      <span>مركز</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <Checkbox
                        checked={locationType === "external"}
                        disabled={!canEditPatientData}
                        onCheckedChange={(checked) => {
                          if (!checked) return;
                          setLocationType("external");
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
                  
                  <div className="mt-6">
                    <div className="space-y-1 pr-6 flex flex-col items-end w-full">
                      <Label htmlFor="reception-signature" className="font-bold text-right">توقيع الاستقبال</Label>
                      <Input
                        id="reception-signature"
                        name="reception-signature"
                        value={receptionSignature}
                        onChange={(e) => setReceptionSignature(e.target.value)}
                        className="text-right w-full max-w-sm ms-auto"
                      />
                    </div>
                </div>

              </CardContent>
            </Card>
            {sheetSelection === "lasik" && (
            <Card className="mt-4" dir="rtl">
              <CardContent className="pt-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2 border-b pb-1" dir="rtl">
                      <span className="text-right flex-1">هل سمعت عن مرض القرنية المخروطية في أحد أفراد العائلة؟</span>
                      <Checkbox
                        checked={medicalChecklist.familyKeratoconus}
                        onCheckedChange={(checked) =>
                          setMedicalChecklist((prev) => ({ ...prev, familyKeratoconus: Boolean(checked) }))
                        }
                        className="border-2 border-gray-700"
                      />
                    </div>
                    <div className="flex items-center justify-between gap-2 border-b pb-1" dir="rtl">
                      <span className="text-right flex-1">هل تستخدم بديل دموع / زيادة في إفراز الدموع / إحساس بالرمل؟</span>
                      <Checkbox
                        checked={medicalChecklist.usesTearSubstituteOrExcessTearsOrSandySensation}
                        onCheckedChange={(checked) =>
                          setMedicalChecklist((prev) => ({ ...prev, usesTearSubstituteOrExcessTearsOrSandySensation: Boolean(checked) }))
                        }
                        className="border-2 border-gray-700"
                      />
                    </div>
                    <div className="flex items-center justify-between gap-2 border-b pb-1" dir="rtl">
                      <span className="text-right flex-1">هل تزيد هذه الأعراض عند وجود هواء أو تكييف؟</span>
                      <Checkbox
                        checked={medicalChecklist.symptomsWorseWithAirOrAC}
                        onCheckedChange={(checked) =>
                          setMedicalChecklist((prev) => ({ ...prev, symptomsWorseWithAirOrAC: Boolean(checked) }))
                        }
                        className="border-2 border-gray-700"
                      />
                    </div>
                    <div className="flex items-center justify-between gap-2" dir="rtl">
                      <span className="text-right flex-1">هل تعالج من ماء زرقاء؟</span>
                      <Checkbox
                        checked={medicalChecklist.glaucomaTreatment}
                        onCheckedChange={(checked) =>
                          setMedicalChecklist((prev) => ({ ...prev, glaucomaTreatment: Boolean(checked) }))
                        }
                        className="border-2 border-gray-700"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2 border-b pb-1" dir="rtl">
                      <span className="text-right flex-1">أمراض عامة؟ (ضغط / سكر / غدة)</span>
                      <Checkbox
                        checked={medicalChecklist.generalDiseases}
                        onCheckedChange={(checked) =>
                          setMedicalChecklist((prev) => ({ ...prev, generalDiseases: Boolean(checked) }))
                        }
                        className="border-2 border-gray-700"
                      />
                    </div>
                    <div className="flex items-center justify-between gap-2 border-b pb-1" dir="rtl">
                      <span className="text-right flex-1">حمل أو رضاعة؟</span>
                      <Checkbox
                        checked={medicalChecklist.pregnancyOrLactation}
                        onCheckedChange={(checked) =>
                          setMedicalChecklist((prev) => ({ ...prev, pregnancyOrLactation: Boolean(checked) }))
                        }
                        className="border-2 border-gray-700"
                      />
                    </div>
                    <div className="flex items-center justify-between gap-2 border-b pb-1" dir="rtl">
                      <span className="text-right flex-1">هل تستخدم مضادات حساسية أو مكملات غذائية/كورتيزون/أدوية ضغط؟</span>
                      <Checkbox
                        checked={medicalChecklist.usesAllergySupplementsSteroidsOrPressureMeds}
                        onCheckedChange={(checked) =>
                          setMedicalChecklist((prev) => ({ ...prev, usesAllergySupplementsSteroidsOrPressureMeds: Boolean(checked) }))
                        }
                        className="border-2 border-gray-700"
                      />
                    </div>
                    <div className="flex items-center justify-between gap-2" dir="rtl">
                      <span className="text-right flex-1">هل تستخدم علاج لحب الشباب؟ (اسم العلاج)</span>
                      <Checkbox
                        checked={medicalChecklist.acneTreatment}
                        onCheckedChange={(checked) =>
                          setMedicalChecklist((prev) => ({ ...prev, acneTreatment: Boolean(checked) }))
                        }
                        className="border-2 border-gray-700"
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            )}
            </TabsContent>
  );
}

