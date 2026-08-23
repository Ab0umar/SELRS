import { useMemo, useState, type CSSProperties, type ReactNode } from "react";
import PatientPicker from "@/components/PatientPicker";
import SearchableCombobox from "@/components/SearchableCombobox";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TabsContent } from "@/components/ui/tabs";
import { cn, localISODate } from "@/lib/utils";
import { ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";
import type { UseExaminationFormResult } from "@/hooks/examination/useExaminationForm";
import { DateInput } from "@/components/ui/date-input";
import { MedicalHistoryTab } from "@/components/patient-details/MedicalHistoryTab";
import { useIsMobile } from "@/hooks/useMobile";

function MobileCollapsibleSection({
  title,
  summary,
  children,
}: {
  title: string;
  summary?: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="mobile-collapsible-section">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        className="mobile-collapsible-toggle flex w-full items-center justify-between gap-2 rounded-xl border border-border bg-muted/30 px-3 py-2.5 text-right"
      >
        <span className="flex min-w-0 items-center gap-2">
          <span className="truncate text-sm font-bold text-foreground">
            {title}
          </span>
          {summary ? (
            <span className="shrink-0 text-xs font-medium text-muted-foreground">
              {summary}
            </span>
          ) : null}
        </span>
        {open ? (
          <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
        ) : (
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
        )}
      </button>
      {open ? <div className="mt-2">{children}</div> : null}
    </div>
  );
}

interface ExaminationPatientInfoTabProps {
  form: UseExaminationFormResult;
  showMedicalHistory?: boolean;
}

export default function ExaminationPatientInfoTab({
  form,
  showMedicalHistory = false,
}: ExaminationPatientInfoTabProps) {
  const {
    handleSelectPatient,
    patientInfo,
    setPatientInfo,
    patientDetails,
    setPatientDetails,
    canEditPatientData,
    digitsOnly,
    doctorName,
    setDoctorName,
    shiftNumber,
    setShiftNumber,
    services,
    addService,
    removeService,
    updateService,
    patientShare,
    receptionSignature,
    setReceptionSignature,
    medicalChecklist,
    setMedicalChecklist,
    setPatientMedicalHistory,
    visitDate,
    setVisitDate,
    doctorsCatalogQuery,
    servicesCatalogQuery,
  } = form;

  const isMobile = useIsMobile();

  // Inline styles, not CSS classes — this device's WebView was found to
  // silently ignore certain @media/!important CSS rules for reasons that
  // couldn't be pinned down even after the CSS was verified byte-correct on
  // the server. Inline styles bypass the cascade entirely, so pairing these
  // fields side by side is guaranteed to render regardless of that bug.
  const fieldRowStyle: CSSProperties = isMobile
    ? { display: "flex", flexWrap: "wrap", gap: "0.45rem" }
    : {};
  const fieldFull: CSSProperties = isMobile
    ? { flex: "1 1 100%", minWidth: 0 }
    : {};
  const fieldTwoThirds: CSSProperties = isMobile
    ? { flex: "1 1 calc(66.666% - 0.3rem)", minWidth: 0 }
    : {};
  const fieldOneThird: CSSProperties = isMobile
    ? { flex: "1 1 calc(33.333% - 0.3rem)", minWidth: 0 }
    : {};
  const fieldHalf: CSSProperties = isMobile
    ? { flex: "1 1 calc(50% - 0.225rem)", minWidth: 0 }
    : {};

  const mysqlServices = useMemo(
    () => (servicesCatalogQuery?.data ?? []) as any[],
    [servicesCatalogQuery?.data],
  );
  const mysqlDoctors = useMemo(
    () => (doctorsCatalogQuery?.data ?? []) as any[],
    [doctorsCatalogQuery?.data],
  );

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
    [sortedServices],
  );

  const doctorOptions = useMemo(
    () => [
      { value: "none", label: "— اختر الطبيب" },
      ...mysqlDoctors.map((doctor) => {
        const code = String((doctor as any)?.code ?? "").trim();
        const name = String((doctor as any)?.name ?? "").trim();
        return {
          value: name,
          label: code ? `${code} - ${name}` : name,
          keywords: `${code} ${name}`,
        };
      }),
    ],
    [mysqlDoctors],
  );

  return (
    <TabsContent value="patient-info" className="examination-patient-info w-full">
      <Card className="border-0 shadow-none">
        <CardContent className="examination-patient-content pt-2 space-y-4 px-4" dir="rtl">
          <div className="patient-picker-strip flex justify-center rounded-xl border border-dashed bg-muted/20 p-3">
            <div className="flex w-full flex-col items-end justify-center gap-3 sm:flex-row">
              <div className="w-full sm:w-[28rem]">
                <PatientPicker onSelect={handleSelectPatient} />
              </div>
              <div className="flex w-full items-end gap-3 sm:w-auto">
                <div className="min-w-0 flex-1 sm:w-32 sm:flex-none">
                  <Label className="mb-1 block text-[10px] font-semibold text-muted-foreground">
                    الكود
                  </Label>
                  <Input
                    value={patientInfo.code || "—"}
                    readOnly
                    className="h-8 bg-muted/50 px-2 text-center font-mono text-xs"
                  />
                </div>
                <div className="min-w-0 flex-1 sm:w-44 sm:flex-none">
                  <Label className="mb-1 block text-[10px] font-semibold text-muted-foreground">
                    تاريخ الزيارة
                  </Label>
                  <DateInput
                    value={visitDate}
                    onChange={(e) => setVisitDate(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
            {/* Column 1: Patient Information */}
            <div className="patient-personal-card space-y-4 border border-slate-200/80 rounded-2xl p-4 bg-white shadow-xs">
              <h3 className="font-bold text-slate-800 text-sm border-b border-slate-100 pb-2">
                👤 البيانات الشخصية للمريض:
              </h3>
              <div className="patient-details-fields space-y-3">
                {/* Row 1: الاسم - تاريخ الميلاد - السن */}
                <div
                  className="patient-identity-grid grid grid-cols-1 sm:grid-cols-12 gap-2.5"
                  style={fieldRowStyle}
                >
                  <div className="patient-name-field sm:col-span-6" style={fieldFull}>
                    <Label className="font-semibold text-[11px] mb-1 block text-muted-foreground">
                      الاسم بالكامل
                    </Label>
                    <Input
                      value={patientInfo.name}
                      onChange={(e) =>
                        setPatientInfo((prev) => ({
                          ...prev,
                          name: e.target.value,
                        }))
                      }
                      readOnly={!canEditPatientData}
                      className="text-xs border h-8 px-2.5 font-medium bg-background rounded-lg"
                      placeholder="اسم المريض..."
                    />
                  </div>
                  <div className="patient-dob-field sm:col-span-4" style={fieldTwoThirds}>
                    <Label className="font-semibold text-[11px] mb-1 block text-muted-foreground">
                      تاريخ الميلاد
                    </Label>
                    <DateInput
                      value={(() => {
                        const dob = patientDetails.dateOfBirth;
                        if (!dob) return "";
                        if (dob.match(/^\d{4}-\d{2}-\d{2}$/)) return dob;
                        const date = new Date(dob);
                        if (isNaN(date.getTime())) return "";
                        return localISODate(date);
                      })()}
                      onChange={(e) =>
                        setPatientDetails((prev) => ({
                          ...prev,
                          dateOfBirth: e.target.value,
                        }))
                      }
                      readOnly={!canEditPatientData}
                      className="text-xs border h-8 px-2 bg-background rounded-lg"
                    />
                  </div>
                  <div className="patient-age-field sm:col-span-2" style={fieldOneThird}>
                    <Label className="font-semibold text-[11px] mb-1 block text-muted-foreground">
                      السن
                    </Label>
                    <Input
                      value={patientDetails.age}
                      onChange={(e) =>
                        setPatientDetails((prev) => ({
                          ...prev,
                          age: digitsOnly(e.target.value),
                        }))
                      }
                      readOnly={!canEditPatientData}
                      className="text-xs border h-8 px-2 text-center font-bold bg-background rounded-lg"
                    />
                  </div>
                </div>

                {/* Row 2: رقم الموبايل - رقم موبايل 2 */}
                <div
                  className="patient-phone-grid grid grid-cols-1 sm:grid-cols-2 gap-2.5"
                  style={fieldRowStyle}
                >
                  <div style={fieldHalf}>
                    <Label className="font-semibold text-[11px] mb-1 block text-muted-foreground">
                      رقم الموبايل
                    </Label>
                    <Input
                      value={patientDetails.phone}
                      onChange={(e) =>
                        setPatientDetails((prev) => ({
                          ...prev,
                          phone: digitsOnly(e.target.value),
                        }))
                      }
                      readOnly={!canEditPatientData}
                      className="text-xs border h-8 px-2.5 tracking-wider bg-background rounded-lg"
                      placeholder="01xxxxxxxxx"
                      dir="ltr"
                    />
                  </div>
                  <div style={fieldHalf}>
                    <Label className="font-semibold text-[11px] mb-1 block text-muted-foreground">
                      رقم موبايل بديل
                    </Label>
                    <Input
                      value={patientDetails.alternatePhone}
                      onChange={(e) =>
                        setPatientDetails((prev) => ({
                          ...prev,
                          alternatePhone: digitsOnly(e.target.value),
                        }))
                      }
                      readOnly={!canEditPatientData}
                      className="text-xs border h-8 px-2.5 tracking-wider bg-background rounded-lg"
                      placeholder="01xxxxxxxxx (اختياري)"
                      dir="ltr"
                    />
                  </div>
                </div>

                {/* Row 3: العنوان - الوظيفة - الجنس */}
                <div
                  className="patient-demographics-grid grid grid-cols-1 sm:grid-cols-12 gap-2.5"
                  style={fieldRowStyle}
                >
                  <div className="patient-address-field sm:col-span-5" style={fieldFull}>
                    <Label className="font-semibold text-[11px] mb-1 block text-muted-foreground">
                      العنوان
                    </Label>
                    <Input
                      value={patientDetails.address}
                      onChange={(e) =>
                        setPatientDetails((prev) => ({
                          ...prev,
                          address: e.target.value,
                        }))
                      }
                      readOnly={!canEditPatientData}
                      className="text-xs border h-8 px-2.5 bg-background rounded-lg"
                      placeholder="العنوان..."
                    />
                  </div>
                  <div className="patient-job-field sm:col-span-4" style={fieldTwoThirds}>
                    <Label className="font-semibold text-[11px] mb-1 block text-muted-foreground">
                      الوظيفة
                    </Label>
                    <Input
                      value={patientDetails.job}
                      onChange={(e) =>
                        setPatientDetails((prev) => ({
                          ...prev,
                          job: e.target.value,
                        }))
                      }
                      readOnly={!canEditPatientData}
                      className="text-xs border h-8 px-2.5 bg-background rounded-lg"
                      placeholder="الوظيفة..."
                    />
                  </div>
                  <div className="patient-gender-field sm:col-span-3" style={fieldOneThird}>
                    <Label className="font-semibold text-[11px] mb-1 block text-muted-foreground">
                      الجنس
                    </Label>
                    <Select
                      value={patientDetails.gender || ""}
                      onValueChange={(gender) =>
                        setPatientDetails((prev) => ({
                          ...prev,
                          gender: gender as "male" | "female",
                        }))
                      }
                      disabled={!canEditPatientData}
                    >
                      <SelectTrigger className="h-8 bg-background text-xs rounded-lg">
                        <SelectValue placeholder="اختر الجنس" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">ذكر</SelectItem>
                        <SelectItem value="female">أنثى</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>

            {/* Column 2: Doctor & Services, with Medical History stacked below */}
            <div className="min-w-0">
            <MobileCollapsibleSection
              title="💳 الخدمة"
              summary={`${patientShare.toFixed(2)} EGP`}
            >
          <div className="patient-services-panel min-w-0 space-y-3 h-full flex flex-col border border-slate-200/80 rounded-2xl p-4 bg-white shadow-xs">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] sm:items-end">
              <div className="space-y-1">
                <Label className="font-semibold text-[11px] text-muted-foreground">
                  الطبيب
                </Label>
                <SearchableCombobox
                  value={doctorName || ""}
                  onChange={(value) =>
                    setDoctorName(value === "none" ? "" : value)
                  }
                  options={doctorOptions}
                  placeholder="ابحث باسم الطبيب أو الكود"
                  searchPlaceholder="ابحث بالاسم أو الكود..."
                  className="h-11 text-sm sm:h-9 bg-background border-ring/30 sm:text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="font-semibold text-[11px] text-muted-foreground">
                  الخدمة
                </Label>
                <SearchableCombobox
                  value={services[0]?.code || ""}
                  onChange={(value) => {
                    if (value && value !== "none") {
                      const svc = sortedServices.find((s) => s.code === value);
                      if (svc) {
                        updateService(0, {
                          code: value,
                          price: Number(svc.price || 0),
                          discount: 0,
                          qty: services[0]?.qty || "1",
                        });
                      }
                    } else {
                      updateService(0, { code: "", price: 0, discount: 0, qty: "" });
                    }
                  }}
                  options={serviceOptions}
                  placeholder="اختر الخدمة"
                  searchPlaceholder="ابحث بالاسم أو الكود..."
                  className="h-11 text-sm sm:h-9 bg-background border-ring/30 sm:text-xs"
                />
              </div>

              <div className="flex items-end gap-2 sm:col-span-2">
                <div className="flex-1 space-y-1">
                  <Label className="font-semibold text-[11px] text-muted-foreground">
                    الوردية
                  </Label>
                  <Select
                    value={shiftNumber ? String(shiftNumber) : ""}
                    onValueChange={(v) =>
                      setShiftNumber(v ? (Number(v) as 1 | 2) : undefined)
                    }
                  >
                    <SelectTrigger className="h-11 text-sm sm:h-9 bg-background border-ring/30 sm:text-xs">
                      <SelectValue placeholder="اختر الوردية" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1" className="text-xs">
                        الوردية الأولى
                      </SelectItem>
                      <SelectItem value="2" className="text-xs">
                        الوردية الثانية
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-11 w-11 sm:h-9 sm:w-9 shrink-0"
                  aria-label="إضافة خدمة"
                  onClick={addService}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="patient-services-list space-y-2 max-h-[220px] overflow-y-auto pr-1">
              <div className="grid grid-cols-[minmax(0,1fr)_4.5rem_4.5rem_4.5rem_auto] gap-2 px-1 text-[9px] font-bold text-muted-foreground">
                <span>الخدمة</span>
                <span className="text-center">الكمية</span>
                <span className="text-center">السعر</span>
                <span className="text-center">الخصم</span>
                <span></span>
              </div>

              <div className="space-y-1.5">
                {services.map((srv, idx) => (
                  <div
                    key={idx}
                    className="grid grid-cols-[minmax(0,1fr)_4.5rem_4.5rem_4.5rem_auto] items-center gap-2 rounded-lg border border-slate-200/80 bg-background p-1.5"
                  >
                    <span className="h-8 min-w-0 flex items-center truncate px-1 text-xs font-semibold text-foreground">
                      {sortedServices.find((s) => s.code === srv.code)?.name ||
                        srv.code ||
                        "—"}
                    </span>
                    <Input
                      type="number"
                      value={srv.qty || "1"}
                      onChange={(e) =>
                        updateService(idx, { qty: e.target.value })
                      }
                      className="h-8 border-slate-200/80 text-center font-bold text-[11px]"
                      min="1"
                    />
                    <Input
                      type="number"
                      min="0"
                      value={srv.price}
                      onChange={(e) =>
                        updateService(idx, {
                          price: Math.max(0, Number(e.target.value) || 0),
                        })
                      }
                      className="h-8 border-slate-200/80 text-center font-bold text-[11px]"
                    />
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={srv.discount}
                      onChange={(e) => {
                        const value = Math.max(0, Number(e.target.value) || 0);
                        const total = srv.price * (Number(srv.qty) || 1);
                        updateService(idx, {
                          discount: Math.min(value, total),
                        });
                      }}
                      className="h-8 border-slate-200/80 text-center font-bold text-[11px] text-destructive"
                    />
                    {services.length > 1 ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0 text-destructive/60 hover:text-destructive bg-destructive/10 hover:bg-destructive hover:text-destructive-foreground"
                        aria-label="حذف الخدمة"
                        onClick={() => removeService(idx)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    ) : (
                      <span className="w-8" />
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-auto pt-3 border-t border-slate-100 flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="font-bold text-[11px] text-foreground block">
                  المطلوب تحصيله
                </Label>
                <div className="text-2xl font-black text-success tabular-nums">
                  <span className="text-[10px] font-normal opacity-60 ml-1">
                    EGP
                  </span>
                  {patientShare.toFixed(2)}
                </div>
              </div>
              <div className="text-left space-y-1">
                <Label className="font-bold text-[10px] text-muted-foreground block">
                  توقيع الاستقبال
                </Label>
                <Input
                  value={receptionSignature}
                  onChange={(e) => setReceptionSignature(e.target.value)}
                  className="text-xs border-0 border-b border-muted rounded-none h-7 p-0 bg-transparent text-left w-32 focus-visible:ring-0"
                  placeholder="..."
                />
              </div>
            </div>
          </div>
          </MobileCollapsibleSection>

          {/* Medical History (stacked under the services column) */}
          {showMedicalHistory ? (
            <div className="patient-medical-history min-w-0 mt-4">
              <MobileCollapsibleSection title="🩺 التاريخ المرضي">
                <MedicalHistoryTab
                  patientId={patientInfo.id ? Number(patientInfo.id) : undefined}
                  symptoms={[]}
                  onChange={setPatientMedicalHistory}
                />
              </MobileCollapsibleSection>
            </div>
          ) : null}
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
