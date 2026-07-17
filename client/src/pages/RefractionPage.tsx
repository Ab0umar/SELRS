import { useEffect, useState } from "react";
import { useLocation, useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import PatientPicker from "@/components/PatientPicker";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { getTrpcErrorMessage } from "@/lib/utils";
import { useAppNavigation } from "@/hooks/useAppNavigation";
import { usePrintMode } from "@/hooks/usePrintMode";
import PrintPreviewBanner from "@/components/PrintPreviewBanner";
import { printOrExportPdf } from "@/lib/nativePdf";
import {
  CYLINDER_OPTIONS,
  EMPTY_SELECT_VALUE,
  SPHERE_OPTIONS,
  UCVA_BCVA_OPTIONS,
} from "@/lib/refractionOptions";

type RefractionForm = {
  bcvaOD: string;
  bcvaOS: string;
  pdOD: string;
  pdOS: string;
  sOD: string;
  cOD: string;
  aOD: string;
  addOD: string;
  sOS: string;
  cOS: string;
  aOS: string;
  addOS: string;
};

const EMPTY_FORM: RefractionForm = {
  bcvaOD: "",
  bcvaOS: "",
  pdOD: "",
  pdOS: "",
  sOD: "",
  cOD: "",
  aOD: "",
  addOD: "",
  sOS: "",
  cOS: "",
  aOS: "",
  addOS: "",
};

const ADD_OPTIONS = Array.from({ length: 25 }, (_, i) => {
  const value = (i * 0.25).toFixed(2);
  return i === 0 ? value : `+${value}`;
});

type ComboBoxFieldProps = {
  value: string;
  options: string[];
  onChange: (value: string) => void;
  placeholder?: string;
  defaultValue?: string;
  allowEmpty?: boolean;
};

function ComboBoxField({
  value,
  options,
  onChange,
  placeholder = "",
  defaultValue,
  allowEmpty = true,
}: ComboBoxFieldProps) {
  const normalized = String(value ?? "");
  const effectiveValue = normalized || EMPTY_SELECT_VALUE;
  const hasCurrent = options.includes(effectiveValue);

  return (
    <select
      value={effectiveValue}
      onChange={(event) => onChange(event.target.value)}
      className="flex h-8 w-full max-w-full rounded-md border border-input bg-background px-1 py-0.5 text-center text-xs shadow-xs sm:h-9 sm:px-2 sm:text-sm"
    >
      <option value={EMPTY_SELECT_VALUE}>{placeholder}</option>
      {!hasCurrent && effectiveValue ? (
        <option value={effectiveValue}>{effectiveValue}</option>
      ) : null}
      {options.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
  );
}

export default function RefractionPage() {
  const [, setLocation] = useLocation();
  const { goBack } = useAppNavigation();
  const [, params] = useRoute("/refraction/:id");
  const patientId = Number(params?.id ?? 0);
  const patientIdValid = Number.isFinite(patientId) && patientId > 0;

  const patientQuery = trpc.patient.getPatient.useQuery(patientId, {
    enabled: patientIdValid,
    refetchOnWindowFocus: false,
  });
  const consultantQuery = trpc.medical.getSheetEntry.useQuery(
    { patientId, sheetType: "consultant" },
    {
      enabled: patientIdValid,
      refetchOnWindowFocus: false,
    },
  );
  const specialistQuery = trpc.medical.getSheetEntry.useQuery(
    { patientId, sheetType: "specialist" },
    {
      enabled: patientIdValid,
      refetchOnWindowFocus: false,
    },
  );
  const lasikQuery = trpc.medical.getSheetEntry.useQuery(
    { patientId, sheetType: "lasik" },
    {
      enabled: patientIdValid,
      refetchOnWindowFocus: false,
    },
  );
  const externalQuery = trpc.medical.getSheetEntry.useQuery(
    { patientId, sheetType: "external" },
    {
      enabled: patientIdValid,
      refetchOnWindowFocus: false,
    },
  );
  const glassesQuery = trpc.medical.getGlassesRecordsByPatient.useQuery(
    { patientId },
    { enabled: patientIdValid, refetchOnWindowFocus: false },
  );

  const dataReady =
    !patientIdValid ||
    (!patientQuery.isLoading &&
      !consultantQuery.isLoading &&
      !specialistQuery.isLoading &&
      !lasikQuery.isLoading &&
      !externalQuery.isLoading &&
      !glassesQuery.isLoading);
  const printMode = usePrintMode({ ready: patientIdValid && dataReady });

  const utils = trpc.useUtils();
  const saveSheetMutation = trpc.medical.saveSheetEntry.useMutation();
  const saveRefractionMutation =
    trpc.medical.saveRefractionToExamination.useMutation({
      onSuccess: () => {
        // Invalidate examination queries so patient file/summary updates
        utils.medical.getExaminationsByPatient.invalidate();
      },
    });
  const [form, setForm] = useState<RefractionForm>(EMPTY_FORM);
  const [locationTypeFilter, setLocationTypeFilter] = useState<
    "all" | "center" | "external"
  >("all");

  useEffect(() => {
    if (!patientId) return;
    const latest = ((glassesQuery.data as any[]) ?? [])[0];
    if (!latest) {
      setForm(EMPTY_FORM);
      return;
    }
    const next: RefractionForm = {
      bcvaOD: String(latest.bcvaOD ?? ""),
      bcvaOS: String(latest.bcvaOS ?? ""),
      pdOD: String(latest.pdOD ?? ""),
      pdOS: String(latest.pdOS ?? ""),
      sOD: String(latest.sOD ?? ""),
      cOD: String(latest.cOD ?? ""),
      aOD: String(latest.axisOD ?? ""),
      addOD: String(latest.addOD ?? ""),
      sOS: String(latest.sOS ?? ""),
      cOS: String(latest.cOS ?? ""),
      aOS: String(latest.axisOS ?? ""),
      addOS: String(latest.addOS ?? ""),
    };
    setForm(next);
  }, [patientId, glassesQuery.data]);

  const mergeAndSerialize = (
    content: string | null | undefined,
    sheetType: "consultant" | "specialist" | "lasik" | "external",
  ) => {
    const parsed = (() => {
      if (!content) return {} as any;
      try {
        return JSON.parse(content) as any;
      } catch {
        return {} as any;
      }
    })();
    const next = { ...parsed } as any;

    if (sheetType === "consultant" || sheetType === "specialist") {
      next.formData = {
        ...(parsed.formData ?? {}),
        bcvaOD: form.bcvaOD,
        bcvaOS: form.bcvaOS,
        pdOD: form.pdOD,
        pdOS: form.pdOS,
        refractionOD: {
          ...(parsed.formData?.refractionOD ?? {}),
          s: form.sOD,
          c: form.cOD,
          a: form.aOD,
        },
        refractionOS: {
          ...(parsed.formData?.refractionOS ?? {}),
          s: form.sOS,
          c: form.cOS,
          a: form.aOS,
        },
      };
    }

    return JSON.stringify(next);
  };

  const handleSave = async () => {
    if (!patientId) return;
    try {
      // Save to sheets (for review and printing)
      await Promise.all([
        saveSheetMutation.mutateAsync({
          patientId,
          sheetType: "consultant",
          content: mergeAndSerialize(consultantQuery.data, "consultant"),
        }),
        saveSheetMutation.mutateAsync({
          patientId,
          sheetType: "specialist",
          content: mergeAndSerialize(specialistQuery.data, "specialist"),
        }),
        saveSheetMutation.mutateAsync({
          patientId,
          sheetType: "lasik",
          content: mergeAndSerialize(lasikQuery.data, "lasik"),
        }),
        saveSheetMutation.mutateAsync({
          patientId,
          sheetType: "external",
          content: mergeAndSerialize(externalQuery.data, "external"),
        }),
      ]);

      // The glasses prescription belongs exclusively to glassesrecords.
      const getParsedSheet = (content: string | null | undefined) => {
        if (!content) return {};
        try {
          return JSON.parse(content) as any;
        } catch {
          return {};
        }
      };

      const consultantParsed = getParsedSheet(consultantQuery.data);
      const pentacam = consultantParsed?.examData?.pentacam;
      const glassesData = {
        od: {
          s: form.sOD || undefined,
          c: form.cOD || undefined,
          axis: form.aOD || undefined,
          pd: form.pdOD || undefined,
          add: form.addOD || undefined,
          bcva: form.bcvaOD || undefined,
        },
        os: {
          s: form.sOS || undefined,
          c: form.cOS || undefined,
          axis: form.aOS || undefined,
          pd: form.pdOS || undefined,
          add: form.addOS || undefined,
          bcva: form.bcvaOS || undefined,
        },
      };

      // Also save all refraction data to examination (for patient file/summary display)
      await saveRefractionMutation.mutateAsync({
        patientId,
        glassesData,
        pentacam,
      });

      toast.success(
        "Refraction and measurements saved for all sheets and patient file",
      );
    } catch (error) {
      toast.error(getTrpcErrorMessage(error, "Failed to save refraction"));
    }
  };

  const handlePrint = () => {
    if (typeof window === "undefined") return;
    void printOrExportPdf(
      `${String((patientQuery.data as any)?.fullName ?? patientId ?? "refraction").trim()}.pdf`,
    );
  };

  const todayLabel = new Date().toISOString().split("T")[0];
  const patient = (patientQuery.data as any) ?? {};
  const patientName = String(patient.fullName ?? "");
  const patientCode = String(patient.patientCode ?? patientId ?? "");

  return (
    <div
      data-mobile-pdf-root
      className={`container mx-auto ${printMode.printView ? "px-3 py-3" : "px-4 py-6"}`}
    >
      {printMode.printView ? (
        <PrintPreviewBanner
          title="روشتة المقاس"
          subtitle={
            patientQuery.data
              ? String((patientQuery.data as any).fullName ?? "")
              : undefined
          }
          onPrint={handlePrint}
        />
      ) : null}
      <div
        className={`mb-4 refraction-no-print ${printMode.printView ? "hidden" : ""}`}
      >
        <div className="mb-2">
          <Select
            value={locationTypeFilter}
            onValueChange={(v) => setLocationTypeFilter(v as any)}
          >
            <SelectTrigger className="h-9 rounded-lg text-sm">
              <SelectValue placeholder="مكان الخدمة" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">الكل</SelectItem>
              <SelectItem value="center">مركز</SelectItem>
              <SelectItem value="external">خارجي</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <PatientPicker
          onSelect={(p) => {
            const id = Number((p as any)?.id ?? 0);
            if (!id) return;
            setLocation(`/refraction/${id}`);
          }}
          locationType={
            locationTypeFilter === "all" ? undefined : locationTypeFilter
          }
        />
      </div>
      <style>{`
        @media print {
          @page {
            size: A5 portrait;
            margin: 0;
          }
          html, body {
            height: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .container {
            max-width: none !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .refraction-no-print { display: none !important; }
          .refraction-page-card {
            visibility: hidden !important;
            border: 0 !important;
            box-shadow: none !important;
            background: transparent !important;
          }
          .refraction-page-content {
            padding: 0 !important;
            margin: 0 !important;
          }
          .refraction-print-wrapper {
            position: fixed !important;
            inset: auto auto auto auto !important;
            top: 53mm !important;
            left: 50% !important;
            transform: translateX(-50%) !important;
            display: block !important;
            width: 132mm !important;
            max-width: 132mm !important;
            visibility: visible !important;
          }
          .refraction-print-card {
            width: 132mm !important;
            max-width: 132mm !important;
            border: 0 !important;
            border-radius: 0 !important;
            padding: 0 !important;
            background: #fff !important;
          }
          .refraction-live-header-row,
          .refraction-live-summary-row,
          .refraction-live-eye-grid {
            border: 1px solid #e5e5e5 !important;
          }
          .refraction-live-header-row {
            grid-template-columns: 1.4fr 1fr 0.8fr !important;
            direction: rtl !important;
            padding: 2.4mm 2.8mm !important;
            margin-bottom: 3mm !important;
          }
          .refraction-live-summary-row {
            grid-template-columns: 1fr 1fr 1fr !important;
            direction: ltr !important;
            border-bottom: 0 !important;
            margin-bottom: 0 !important;
            padding: 2.3mm 3mm !important;
          }
          .refraction-live-eye-grid {
            display: grid !important;
            grid-template-columns: 66mm 66mm !important;
            gap: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
            border-top: 0 !important;
          }
          .refraction-live-eye-column {
            display: block !important;
            width: 66mm !important;
            max-width: 66mm !important;
            min-width: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .refraction-live-eye-column table {
            width: 66mm !important;
            max-width: 66mm !important;
            table-layout: fixed !important;
            border-collapse: collapse !important;
            font-size: 9pt !important;
            line-height: 1.2 !important;
          }
          .refraction-live-eye-column > div {
            display: none !important;
          }
          .refraction-live-eye-table {
            display: table !important;
            width: 66mm !important;
            min-width: 66mm !important;
            max-width: 66mm !important;
          }
          .refraction-live-eye-title {
            font-weight: 800 !important;
            background: #fff !important;
            color: #000 !important;
          }
          .refraction-live-eye-column th,
          .refraction-live-eye-column td {
            border: 1px solid #000 !important;
            padding: 1.65mm 1mm !important;
            text-align: center !important;
            vertical-align: middle !important;
          }
        }
      `}</style>
      <Card className="refraction-page-card border-border/80 bg-background/95 shadow-sm">
        <CardHeader className="refraction-no-print">
          <CardTitle>
            Refraction
            {patientQuery.data
              ? ` - ${String((patientQuery.data as any).fullName ?? "")}`
              : ""}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 refraction-page-content">
          {!Number.isFinite(patientId) || patientId <= 0 ? (
            <div className="space-y-3 refraction-no-print">
              <div className="text-sm text-muted-foreground">
                Choose patient first
              </div>
            </div>
          ) : null}

          <div className="flex gap-2 refraction-no-print">
            <Button
              type="button"
              onClick={handleSave}
              disabled={saveSheetMutation.isPending}
            >
              Save
            </Button>
            <Button type="button" variant="outline" onClick={handlePrint}>
              Print
            </Button>
            <Button type="button" variant="outline" onClick={() => goBack()}>
              Back
            </Button>
          </div>

          <div className="refraction-print-wrapper">
            <div
              className="refraction-print-card w-full max-w-full overflow-x-auto bg-background text-black print:overflow-visible"
              dir="ltr"
              style={{
                border: "2px solid var(--primary)",
                borderTop: "0",
                borderRadius: 14,
                padding: 12,
                textAlign: "center",
                background: "var(--background)",
              }}
            >
              <div className="refraction-live-header-row mb-2 grid grid-cols-1 gap-2 text-xs font-semibold sm:grid-cols-3 sm:gap-3 sm:text-sm">
                <div className="text-center sm:text-right" dir="rtl">
                  <span className="break-words">الاسم: {patientName}</span>
                </div>
                <div className="text-center">التاريخ : {todayLabel}</div>
                <div className="text-center sm:text-left">
                  الكود : {patientCode}
                </div>
              </div>
              <div className="refraction-live-summary-row mb-3 grid grid-cols-1 gap-2 text-xs font-semibold sm:grid-cols-3 sm:gap-3 sm:text-sm">
                <div className="min-w-0">
                  <span className="hidden print:inline">
                    V.A : {form.bcvaOD || ""} / {form.bcvaOS || ""}
                  </span>
                  <span className="print:hidden flex flex-wrap items-center justify-center gap-1 sm:inline-flex sm:justify-center">
                    <span>V.A :</span>
                    <div className="min-w-0 flex-1 sm:w-20 sm:flex-none">
                      <ComboBoxField
                        value={form.bcvaOD}
                        options={UCVA_BCVA_OPTIONS}
                        onChange={(value) =>
                          setForm((p) => ({ ...p, bcvaOD: value }))
                        }
                      />
                    </div>
                    <span>/</span>
                    <div className="min-w-0 flex-1 sm:w-20 sm:flex-none">
                      <ComboBoxField
                        value={form.bcvaOS}
                        options={UCVA_BCVA_OPTIONS}
                        onChange={(value) =>
                          setForm((p) => ({ ...p, bcvaOS: value }))
                        }
                      />
                    </div>
                  </span>
                </div>
                <div className="text-center">
                  <span className="hidden print:inline">
                    PD : {form.pdOS || ""}
                  </span>
                  <span className="print:hidden inline-flex flex-wrap items-center justify-center gap-1">
                    <span>PD :</span>
                    <Input
                      value={form.pdOS}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, pdOS: e.target.value }))
                      }
                      className="h-8 w-full max-w-[6.5rem] text-center sm:w-24"
                    />
                  </span>
                </div>
                <div className="text-center sm:text-right">Colour :</div>
              </div>

              <div className="refraction-live-eye-grid grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="refraction-live-eye-column">
                  <table
                    className="refraction-live-eye-table w-full border-collapse text-center text-sm"
                    style={{ tableLayout: "fixed" }}
                  >
                    <thead>
                      <tr className="hidden print:table-row">
                        <th
                          colSpan={4}
                          className="refraction-live-eye-title"
                          style={{
                            border: "2px solid var(--primary)",
                            padding: 6,
                          }}
                        >
                          RIGHT
                        </th>
                      </tr>
                      <tr>
                        <th
                          style={{
                            border: "2px solid var(--primary)",
                            padding: 6,
                          }}
                        ></th>
                        <th
                          style={{
                            border: "2px solid var(--primary)",
                            padding: 6,
                          }}
                        >
                          Sph.
                        </th>
                        <th
                          style={{
                            border: "2px solid var(--primary)",
                            padding: 6,
                          }}
                        >
                          Cyl.
                        </th>
                        <th
                          style={{
                            border: "2px solid var(--primary)",
                            padding: 6,
                          }}
                        >
                          Axis
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr style={{ height: 58 }}>
                        <td
                          style={{
                            border: "2px solid var(--primary)",
                            fontWeight: 700,
                          }}
                        >
                          DIST
                        </td>
                        <td style={{ border: "2px solid var(--primary)" }}>
                          <span className="hidden print:inline">
                            {form.sOD}
                          </span>
                          <span className="print:hidden">
                            <ComboBoxField
                              value={form.sOD}
                              options={SPHERE_OPTIONS}
                              onChange={(value) =>
                                setForm((p) => ({ ...p, sOD: value }))
                              }
                            />
                          </span>
                        </td>
                        <td style={{ border: "2px solid var(--primary)" }}>
                          <span className="hidden print:inline">
                            {form.cOD}
                          </span>
                          <span className="print:hidden">
                            <ComboBoxField
                              value={form.cOD}
                              options={CYLINDER_OPTIONS}
                              onChange={(value) =>
                                setForm((p) => ({ ...p, cOD: value }))
                              }
                            />
                          </span>
                        </td>
                        <td style={{ border: "2px solid var(--primary)" }}>
                          <span className="hidden print:inline">
                            {form.aOD}
                          </span>
                          <span className="print:hidden">
                            <Input
                              value={form.aOD}
                              onChange={(e) =>
                                setForm((p) => ({ ...p, aOD: e.target.value }))
                              }
                              className="border-0 text-center shadow-none"
                            />
                          </span>
                        </td>
                      </tr>
                      <tr style={{ height: 58 }}>
                        <td
                          style={{
                            border: "2px solid var(--primary)",
                            fontWeight: 700,
                          }}
                        >
                          NEAR
                        </td>
                        <td
                          colSpan={3}
                          style={{ border: "2px solid var(--primary)" }}
                        >
                          <span className="hidden print:inline">
                            Add {form.addOD || ""}
                          </span>
                          <span className="print:hidden flex w-full items-center gap-2 px-2">
                            <span className="font-semibold">Add</span>
                            <div className="flex-1">
                              <ComboBoxField
                                value={form.addOD}
                                options={ADD_OPTIONS}
                                onChange={(value) =>
                                  setForm((p) => ({ ...p, addOD: value }))
                                }
                              />
                            </div>
                          </span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="refraction-live-eye-column">
                  <table
                    className="refraction-live-eye-table w-full border-collapse text-center text-sm"
                    style={{ tableLayout: "fixed" }}
                  >
                    <thead>
                      <tr className="hidden print:table-row">
                        <th
                          colSpan={4}
                          className="refraction-live-eye-title"
                          style={{
                            border: "2px solid var(--primary)",
                            padding: 6,
                          }}
                        >
                          LEFT
                        </th>
                      </tr>
                      <tr>
                        <th
                          style={{
                            border: "2px solid var(--primary)",
                            padding: 6,
                          }}
                        ></th>
                        <th
                          style={{
                            border: "2px solid var(--primary)",
                            padding: 6,
                          }}
                        >
                          Sph.
                        </th>
                        <th
                          style={{
                            border: "2px solid var(--primary)",
                            padding: 6,
                          }}
                        >
                          Cyl.
                        </th>
                        <th
                          style={{
                            border: "2px solid var(--primary)",
                            padding: 6,
                          }}
                        >
                          Axis
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr style={{ height: 58 }}>
                        <td
                          style={{
                            border: "2px solid var(--primary)",
                            fontWeight: 700,
                          }}
                        >
                          DIST
                        </td>
                        <td style={{ border: "2px solid var(--primary)" }}>
                          <span className="hidden print:inline">
                            {form.sOS}
                          </span>
                          <span className="print:hidden">
                            <ComboBoxField
                              value={form.sOS}
                              options={SPHERE_OPTIONS}
                              onChange={(value) =>
                                setForm((p) => ({ ...p, sOS: value }))
                              }
                            />
                          </span>
                        </td>
                        <td style={{ border: "2px solid var(--primary)" }}>
                          <span className="hidden print:inline">
                            {form.cOS}
                          </span>
                          <span className="print:hidden">
                            <ComboBoxField
                              value={form.cOS}
                              options={CYLINDER_OPTIONS}
                              onChange={(value) =>
                                setForm((p) => ({ ...p, cOS: value }))
                              }
                            />
                          </span>
                        </td>
                        <td style={{ border: "2px solid var(--primary)" }}>
                          <span className="hidden print:inline">
                            {form.aOS}
                          </span>
                          <span className="print:hidden">
                            <Input
                              value={form.aOS}
                              onChange={(e) =>
                                setForm((p) => ({ ...p, aOS: e.target.value }))
                              }
                              className="border-0 text-center shadow-none"
                            />
                          </span>
                        </td>
                      </tr>
                      <tr style={{ height: 58 }}>
                        <td
                          style={{
                            border: "2px solid var(--primary)",
                            fontWeight: 700,
                          }}
                        >
                          NEAR
                        </td>
                        <td
                          colSpan={3}
                          style={{ border: "2px solid var(--primary)" }}
                        >
                          <span className="hidden print:inline">
                            Add {form.addOS || ""}
                          </span>
                          <span className="print:hidden flex w-full items-center gap-2 px-2">
                            <span className="font-semibold">Add</span>
                            <div className="flex-1">
                              <ComboBoxField
                                value={form.addOS}
                                options={ADD_OPTIONS}
                                onChange={(value) =>
                                  setForm((p) => ({ ...p, addOS: value }))
                                }
                              />
                            </div>
                          </span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
