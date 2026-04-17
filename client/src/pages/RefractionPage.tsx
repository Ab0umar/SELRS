import { useEffect, useMemo, useState } from "react";
import { useLocation, useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import PatientPicker from "@/components/PatientPicker";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { getTrpcErrorMessage } from "@/lib/utils";
import { useAppNavigation } from "@/hooks/useAppNavigation";
import { Eye, FileSpreadsheet, ScanSearch, UserRound } from "lucide-react";
import { usePrintMode } from "@/hooks/usePrintMode";
import PrintPreviewBanner from "@/components/PrintPreviewBanner";
import { printOrExportPdf } from "@/lib/nativePdf";
import { CYLINDER_OPTIONS, SPHERE_OPTIONS, UCVA_BCVA_OPTIONS } from "@/lib/refractionOptions";

type AutoEye = {
  bcva?: string;
  pd?: string;
  s?: string;
  c?: string;
  axis?: string;
};

type AutoData = {
  od?: AutoEye;
  os?: AutoEye;
};

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

function parseSheetAuto(content: string | null | undefined): AutoData {
  if (!content) return {};
  try {
    const parsed = JSON.parse(content) as any;
    const auto = parsed?.examData?.autorefraction;
    if (!auto || typeof auto !== "object") return {};
    return {
      od: {
        bcva: String(auto?.od?.bcva ?? "").trim(),
        pd: String(auto?.od?.pd ?? "").trim(),
        s: String(auto?.od?.s ?? "").trim(),
        c: String(auto?.od?.c ?? "").trim(),
        axis: String(auto?.od?.axis ?? "").trim(),
      },
      os: {
        bcva: String(auto?.os?.bcva ?? "").trim(),
        pd: String(auto?.os?.pd ?? "").trim(),
        s: String(auto?.os?.s ?? "").trim(),
        c: String(auto?.os?.c ?? "").trim(),
        axis: String(auto?.os?.axis ?? "").trim(),
      },
    };
  } catch {
    return {};
  }
}

function firstValue(...values: Array<string | undefined>) {
  for (const value of values) {
    const text = String(value ?? "").trim();
    if (text) return text;
  }
  return "";
}

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
  const effectiveValue = normalized || String(defaultValue ?? "");
  const hasCurrent = options.includes(effectiveValue);

  useEffect(() => {
    if (!normalized && defaultValue !== undefined) {
      onChange(defaultValue);
    }
  }, [defaultValue, normalized, onChange]);

  return (
    <select
      value={effectiveValue}
      onChange={(event) => onChange(event.target.value)}
      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs"
    >
      {allowEmpty ? <option value="">{placeholder}</option> : null}
      {!hasCurrent && effectiveValue ? <option value={effectiveValue}>{effectiveValue}</option> : null}
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
  const printMode = usePrintMode({ ready: Number.isFinite(patientId) && patientId > 0 });

  const patientQuery = trpc.patient.getPatient.useQuery(
    patientId,
    { enabled: Number.isFinite(patientId) && patientId > 0, refetchOnWindowFocus: false }
  );
  const consultantQuery = trpc.medical.getSheetEntry.useQuery(
    { patientId, sheetType: "consultant" },
    { enabled: Number.isFinite(patientId) && patientId > 0, refetchOnWindowFocus: false }
  );
  const specialistQuery = trpc.medical.getSheetEntry.useQuery(
    { patientId, sheetType: "specialist" },
    { enabled: Number.isFinite(patientId) && patientId > 0, refetchOnWindowFocus: false }
  );
  const lasikQuery = trpc.medical.getSheetEntry.useQuery(
    { patientId, sheetType: "lasik" },
    { enabled: Number.isFinite(patientId) && patientId > 0, refetchOnWindowFocus: false }
  );
  const externalQuery = trpc.medical.getSheetEntry.useQuery(
    { patientId, sheetType: "external" },
    { enabled: Number.isFinite(patientId) && patientId > 0, refetchOnWindowFocus: false }
  );

  const utils = trpc.useUtils();
  const saveSheetMutation = trpc.medical.saveSheetEntry.useMutation();
  const saveRefractionMutation = trpc.medical.saveRefractionToExamination.useMutation({
    onSuccess: () => {
      // Invalidate examination queries so patient file/summary updates
      utils.medical.getExaminationsByPatient.invalidate();
    }
  });
  const [form, setForm] = useState<RefractionForm>(EMPTY_FORM);

  const sourceAutos = useMemo(() => {
    const consultant = parseSheetAuto(consultantQuery.data);
    const specialist = parseSheetAuto(specialistQuery.data);
    const lasik = parseSheetAuto(lasikQuery.data);
    const external = parseSheetAuto(externalQuery.data);
    return { consultant, specialist, lasik, external };
  }, [consultantQuery.data, specialistQuery.data, lasikQuery.data, externalQuery.data]);

  useEffect(() => {
    if (!patientId) return;
    const next: RefractionForm = {
      bcvaOD: firstValue(
        sourceAutos.consultant.od?.bcva,
        sourceAutos.specialist.od?.bcva,
        sourceAutos.lasik.od?.bcva,
        sourceAutos.external.od?.bcva
      ),
      bcvaOS: firstValue(
        sourceAutos.consultant.os?.bcva,
        sourceAutos.specialist.os?.bcva,
        sourceAutos.lasik.os?.bcva,
        sourceAutos.external.os?.bcva
      ),
      pdOD: firstValue(
        sourceAutos.consultant.od?.pd,
        sourceAutos.specialist.od?.pd,
        sourceAutos.lasik.od?.pd,
        sourceAutos.external.od?.pd
      ),
      pdOS: firstValue(
        sourceAutos.consultant.os?.pd,
        sourceAutos.specialist.os?.pd,
        sourceAutos.lasik.os?.pd,
        sourceAutos.external.os?.pd
      ),
      sOD: firstValue(
        sourceAutos.consultant.od?.s,
        sourceAutos.specialist.od?.s,
        sourceAutos.lasik.od?.s,
        sourceAutos.external.od?.s
      ),
      cOD: firstValue(
        sourceAutos.consultant.od?.c,
        sourceAutos.specialist.od?.c,
        sourceAutos.lasik.od?.c,
        sourceAutos.external.od?.c
      ),
      aOD: firstValue(
        sourceAutos.consultant.od?.axis,
        sourceAutos.specialist.od?.axis,
        sourceAutos.lasik.od?.axis,
        sourceAutos.external.od?.axis
      ),
      addOD: "",
      sOS: firstValue(
        sourceAutos.consultant.os?.s,
        sourceAutos.specialist.os?.s,
        sourceAutos.lasik.os?.s,
        sourceAutos.external.os?.s
      ),
      cOS: firstValue(
        sourceAutos.consultant.os?.c,
        sourceAutos.specialist.os?.c,
        sourceAutos.lasik.os?.c,
        sourceAutos.external.os?.c
      ),
      aOS: firstValue(
        sourceAutos.consultant.os?.axis,
        sourceAutos.specialist.os?.axis,
        sourceAutos.lasik.os?.axis,
        sourceAutos.external.os?.axis
      ),
      addOS: "",
    };
    setForm(next);
  }, [patientId, sourceAutos]);

  const mergeAndSerialize = (content: string | null | undefined, sheetType: "consultant" | "specialist" | "lasik" | "external") => {
    const parsed = (() => {
      if (!content) return {} as any;
      try {
        return JSON.parse(content) as any;
      } catch {
        return {} as any;
      }
    })();
    const next = {
      ...parsed,
      examData: {
        ...(parsed.examData ?? {}),
        autorefraction: {
          ...(parsed.examData?.autorefraction ?? {}),
          od: {
            ...(parsed.examData?.autorefraction?.od ?? {}),
            bcva: form.bcvaOD,
            pd: form.pdOD,
            s: form.sOD,
            c: form.cOD,
            axis: form.aOD,
          },
          os: {
            ...(parsed.examData?.autorefraction?.os ?? {}),
            bcva: form.bcvaOS,
            pd: form.pdOS,
            s: form.sOS,
            c: form.cOS,
            axis: form.aOS,
          },
        },
      },
    } as any;

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

      // Build autorefraction object from form fields
      const autorefraction = {
        od: form.sOD || form.cOD || form.aOD || form.bcvaOD ? {
          s: form.sOD || undefined,
          c: form.cOD || undefined,
          axis: form.aOD || undefined,
          ucva: undefined,
          bcva: form.bcvaOD || undefined,
          iop: undefined,
        } : undefined,
        os: form.sOS || form.cOS || form.aOS || form.bcvaOS ? {
          s: form.sOS || undefined,
          c: form.cOS || undefined,
          axis: form.aOS || undefined,
          ucva: undefined,
          bcva: form.bcvaOS || undefined,
          iop: undefined,
        } : undefined,
      };

      // Extract glasses and pentacam from sheets
      const getParsedSheet = (content: string | null | undefined) => {
        if (!content) return {};
        try {
          return JSON.parse(content) as any;
        } catch {
          return {};
        }
      };

      const consultantParsed = getParsedSheet(consultantQuery.data);
      const glassesData = consultantParsed?.examData?.glasses;
      const pentacam = consultantParsed?.examData?.pentacam;

      // Also save all refraction data to examination (for patient file/summary display)
      await saveRefractionMutation.mutateAsync({
        patientId,
        autorefraction,
        glassesData,
        pentacam,
      });

      toast.success("Refraction and measurements saved for all sheets and patient file");
    } catch (error) {
      toast.error(getTrpcErrorMessage(error, "Failed to save refraction"));
    }
  };

  const handlePrint = () => {
    if (typeof window === "undefined") return;
    void printOrExportPdf(
      `${String((patientQuery.data as any)?.fullName ?? patientId ?? "refraction").trim()}.pdf`
    );
  };

  const todayLabel = new Date().toISOString().split("T")[0];

  return (
    <div data-mobile-pdf-root className={`container mx-auto ${printMode.printView ? "px-3 py-3" : "px-4 py-6"}`}>
      {printMode.printView ? (
        <PrintPreviewBanner
          title="روشتة المقاس"
          subtitle={patientQuery.data ? String((patientQuery.data as any).fullName ?? "") : undefined}
          onPrint={handlePrint}
        />
      ) : null}
      <section className={`mb-6 overflow-hidden rounded-[28px] border border-slate-200/80 bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.16),_transparent_34%),linear-gradient(135deg,_rgba(255,255,255,0.98),_rgba(248,250,252,0.96))] p-6 shadow-sm print:hidden ${printMode.printView ? "hidden" : ""}`}>
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-sky-700">
              <Eye className="h-3.5 w-3.5" />
              Refraction Desk
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-semibold tracking-tight text-slate-950">Refraction</h1>
              <p className="max-w-3xl text-sm leading-6 text-slate-600">
                شاشة أنظف لتجميع قراءات الـ refraction من الشيتات المختلفة قبل الحفظ والطباعة.
              </p>
            </div>
          </div>
          <div className="space-y-3">
            <div className="refraction-no-print">
              <PatientPicker
                onSelect={(p) => {
                  const id = Number((p as any)?.id ?? 0);
                  if (!id) return;
                  setLocation(`/refraction/${id}`);
                }}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              <div className="rounded-2xl border border-white/80 bg-white/80 px-4 py-3 shadow-sm">
                <div className="flex items-center gap-2 text-xs uppercase tracking-[0.22em] text-slate-500">
                  <FileSpreadsheet className="h-3.5 w-3.5" />
                  Code
                </div>
                <div className="mt-2 text-sm font-semibold text-slate-900">{String((patientQuery.data as any)?.patientCode ?? "-")}</div>
              </div>
              <div className="rounded-2xl border border-white/80 bg-white/80 px-4 py-3 shadow-sm">
                <div className="text-xs uppercase tracking-[0.22em] text-slate-500">Loaded Sources</div>
                <div className="mt-2 text-sm font-semibold text-slate-900">{[consultantQuery.data, specialistQuery.data, lasikQuery.data, externalQuery.data].filter(Boolean).length}</div>
              </div>
              <div className="rounded-2xl border border-white/80 bg-white/80 px-4 py-3 shadow-sm">
                <div className="flex items-center gap-2 text-xs uppercase tracking-[0.22em] text-slate-500">
                  <ScanSearch className="h-3.5 w-3.5" />
                  Status
                </div>
                <div className="mt-2 text-sm font-semibold text-slate-900">{patientId > 0 ? "Ready to save" : "Waiting for patient"}</div>
              </div>
            </div>
          </div>
        </div>
      </section>
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
            inset: 0 !important;
            display: flex !important;
            justify-content: center !important;
            align-items: center !important;
            visibility: visible !important;
          }
          .refraction-print-card {
            break-inside: avoid;
            page-break-inside: avoid;
            width: 135mm !important;
            max-width: 135mm !important;
            margin: 0 auto !important;
          }
          .refraction-print-card,
          .refraction-print-card * {
            text-align: center !important;
          }
        }
      `}</style>
      <Card className="refraction-page-card border-slate-200/80 bg-white/95 shadow-sm">
        <CardHeader className="refraction-no-print">
          <CardTitle>
            Refraction
            {patientQuery.data ? ` - ${String((patientQuery.data as any).fullName ?? "")}` : ""}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 refraction-page-content">
          {!Number.isFinite(patientId) || patientId <= 0 ? (
            <div className="space-y-3 refraction-no-print">
              <div className="text-sm text-muted-foreground">Choose patient first</div>
            </div>
          ) : null}

          <div className="flex gap-2 refraction-no-print">
            <Button type="button" onClick={handleSave} disabled={saveSheetMutation.isPending}>
              Save
            </Button>
            <Button type="button" variant="outline" onClick={handlePrint}>
              Print
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => goBack()}
            >
              Back
            </Button>
          </div>

          <div className="refraction-print-wrapper">
            <div
              className="refraction-print-card w-full bg-white text-black"
              dir="ltr"
              style={{ border: "2px solid #2ea3f2", borderTop: "0", borderRadius: 14, padding: 12, textAlign: "center" }}
            >
            <div className="grid grid-cols-2 gap-3 mb-2 text-sm font-semibold text-center">
              <div className="text-left">
                <span>Name :</span>{" "}
                <span>{String((patientQuery.data as any)?.fullName ?? "........................")}</span>
              </div>
              <div className="text-right">Date : {todayLabel}</div>
            </div>
            <div className="grid grid-cols-3 gap-3 mb-3 text-sm font-semibold text-center">
              <div className="text-left">Colour : ........................</div>
              <div>
                <span className="hidden print:inline">V.A : {form.bcvaOD || "......."} / {form.bcvaOS || "......."}</span>
                <span className="print:hidden inline-flex items-center gap-1">
                  <span>V.A :</span>
                  <div className="w-20">
                    <ComboBoxField
                      value={form.bcvaOD}
                      options={UCVA_BCVA_OPTIONS}
                      onChange={(value) => setForm((p) => ({ ...p, bcvaOD: value }))}
                    />
                  </div>
                  <span>/</span>
                  <div className="w-20">
                    <ComboBoxField
                      value={form.bcvaOS}
                      options={UCVA_BCVA_OPTIONS}
                      onChange={(value) => setForm((p) => ({ ...p, bcvaOS: value }))}
                    />
                  </div>
                </span>
              </div>
              <div className="text-right">
                <span className="hidden print:inline">P.D. : {form.pdOS || "......."}</span>
                <span className="print:hidden inline-flex items-center gap-1">
                  <span>P.D. :</span>
                  <Input
                    value={form.pdOS}
                    onChange={(e) => setForm((p) => ({ ...p, pdOS: e.target.value }))}
                    className="h-8 w-24 text-center"
                  />
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-center text-white font-bold py-1" style={{ background: "#2ea3f2", borderRadius: "8px 8px 0 0" }}>
                  RIGHT
                </div>
                <table className="w-full border-collapse text-center text-sm" style={{ tableLayout: "fixed" }}>
                  <thead>
                    <tr>
                      <th style={{ border: "2px solid #2ea3f2", padding: 6 }}></th>
                      <th style={{ border: "2px solid #2ea3f2", padding: 6 }}>Sph.</th>
                      <th style={{ border: "2px solid #2ea3f2", padding: 6 }}>Cyl.</th>
                      <th style={{ border: "2px solid #2ea3f2", padding: 6 }}>Axis</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr style={{ height: 58 }}>
                      <td style={{ border: "2px solid #2ea3f2", fontWeight: 700 }}>DIST</td>
                      <td style={{ border: "2px solid #2ea3f2" }}>
                        <span className="hidden print:inline">{form.sOD}</span>
                        <span className="print:hidden">
                          <ComboBoxField
                            value={form.sOD}
                            options={SPHERE_OPTIONS}
                            defaultValue="0.00"
                            allowEmpty={false}
                            onChange={(value) => setForm((p) => ({ ...p, sOD: value }))}
                          />
                        </span>
                      </td>
                      <td style={{ border: "2px solid #2ea3f2" }}>
                        <span className="hidden print:inline">{form.cOD}</span>
                        <span className="print:hidden">
                          <ComboBoxField
                            value={form.cOD}
                            options={CYLINDER_OPTIONS}
                            defaultValue="0.00"
                            allowEmpty={false}
                            onChange={(value) => setForm((p) => ({ ...p, cOD: value }))}
                          />
                        </span>
                      </td>
                      <td style={{ border: "2px solid #2ea3f2" }}>
                        <span className="hidden print:inline">{form.aOD}</span>
                        <span className="print:hidden">
                          <Input value={form.aOD} onChange={(e) => setForm((p) => ({ ...p, aOD: e.target.value }))} className="border-0 text-center shadow-none" />
                        </span>
                      </td>
                    </tr>
                    <tr style={{ height: 58 }}>
                      <td style={{ border: "2px solid #2ea3f2", fontWeight: 700 }}>NEAR</td>
                      <td colSpan={3} style={{ border: "2px solid #2ea3f2" }}>
                        <span className="hidden print:inline">Add {form.addOD || ""}</span>
                        <span className="print:hidden flex w-full items-center gap-2 px-2">
                          <span className="font-semibold">Add</span>
                          <div className="flex-1">
                            <ComboBoxField
                              value={form.addOD}
                              options={ADD_OPTIONS}
                              defaultValue="0.00"
                              allowEmpty={false}
                              onChange={(value) => setForm((p) => ({ ...p, addOD: value }))}
                            />
                          </div>
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div>
                <div className="text-center text-white font-bold py-1" style={{ background: "#2ea3f2", borderRadius: "8px 8px 0 0" }}>
                  LEFT
                </div>
                <table className="w-full border-collapse text-center text-sm" style={{ tableLayout: "fixed" }}>
                  <thead>
                    <tr>
                      <th style={{ border: "2px solid #2ea3f2", padding: 6 }}></th>
                      <th style={{ border: "2px solid #2ea3f2", padding: 6 }}>Sph.</th>
                      <th style={{ border: "2px solid #2ea3f2", padding: 6 }}>Cyl.</th>
                      <th style={{ border: "2px solid #2ea3f2", padding: 6 }}>Axis</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr style={{ height: 58 }}>
                      <td style={{ border: "2px solid #2ea3f2", fontWeight: 700 }}>DIST</td>
                      <td style={{ border: "2px solid #2ea3f2" }}>
                        <span className="hidden print:inline">{form.sOS}</span>
                        <span className="print:hidden">
                          <ComboBoxField
                            value={form.sOS}
                            options={SPHERE_OPTIONS}
                            defaultValue="0.00"
                            allowEmpty={false}
                            onChange={(value) => setForm((p) => ({ ...p, sOS: value }))}
                          />
                        </span>
                      </td>
                      <td style={{ border: "2px solid #2ea3f2" }}>
                        <span className="hidden print:inline">{form.cOS}</span>
                        <span className="print:hidden">
                          <ComboBoxField
                            value={form.cOS}
                            options={CYLINDER_OPTIONS}
                            defaultValue="0.00"
                            allowEmpty={false}
                            onChange={(value) => setForm((p) => ({ ...p, cOS: value }))}
                          />
                        </span>
                      </td>
                      <td style={{ border: "2px solid #2ea3f2" }}>
                        <span className="hidden print:inline">{form.aOS}</span>
                        <span className="print:hidden">
                          <Input value={form.aOS} onChange={(e) => setForm((p) => ({ ...p, aOS: e.target.value }))} className="border-0 text-center shadow-none" />
                        </span>
                      </td>
                    </tr>
                    <tr style={{ height: 58 }}>
                      <td style={{ border: "2px solid #2ea3f2", fontWeight: 700 }}>NEAR</td>
                      <td colSpan={3} style={{ border: "2px solid #2ea3f2" }}>
                        <span className="hidden print:inline">Add {form.addOS || ""}</span>
                        <span className="print:hidden flex w-full items-center gap-2 px-2">
                          <span className="font-semibold">Add</span>
                          <div className="flex-1">
                            <ComboBoxField
                              value={form.addOS}
                              options={ADD_OPTIONS}
                              defaultValue="0.00"
                              allowEmpty={false}
                              onChange={(value) => setForm((p) => ({ ...p, addOS: value }))}
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

