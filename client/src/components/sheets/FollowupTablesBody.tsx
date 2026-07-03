import type { Dispatch, SetStateAction } from "react";
import { Input } from "@/components/ui/input";
import { DateInput } from "@/components/ui/date-input";
import SheetCenterHeader from "@/components/SheetCenterHeader";
import { BRAND_NAME_AR, BRAND_NAME_EN } from "@/lib/brand";

export type FollowupItem = {
  id: number | string;
  date: string;
  type: string;
  [key: string]: unknown;
};

export type FollowupLabelsShape = {
  operationDateLabel?: string;
  operationTypeLabel?: string;
  followupDateLabel?: string;
  vaLabel?: string;
  refractionLabel?: string;
  flapLabel?: string;
  iopLabel?: string;
  treatmentLabel?: string;
  receptionLabel?: string;
  nurseLabel?: string;
  doctorLabel?: string;
};

/**
 * Shared follow-up sheet body — used by the dedicated follow-up pages
 * (ConsultantFollowupPage/LasikFollowupPage) AND embedded as print-page-2
 * inside the main sheets (ConsultantSheet/LasikExamSheet), so both contexts
 * always render the exact same layout.
 */
export default function FollowupTablesBody<T extends FollowupItem>({
  titleEn,
  titleAr,
  patientName,
  patientDOB,
  operationType,
  setOperationType,
  operationEyes,
  setOperationEyes,
  operationDateRight,
  setOperationDateRight,
  followups,
  setFollowups,
  followupLabels,
  signatures,
  readOnly = false,
}: {
  titleEn: string;
  titleAr: string;
  patientName: string;
  patientDOB: string;
  operationType: string;
  setOperationType: Dispatch<SetStateAction<string>>;
  operationEyes: { right: boolean; left: boolean; [key: string]: unknown };
  setOperationEyes: Dispatch<SetStateAction<any>>;
  operationDateRight: string;
  setOperationDateRight: Dispatch<SetStateAction<string>>;
  followups: T[];
  setFollowups: Dispatch<SetStateAction<T[]>>;
  followupLabels: FollowupLabelsShape;
  signatures: { doctor: string };
  readOnly?: boolean;
}) {
  const today = new Date().toLocaleDateString("en-GB");

  return (
    <div className="sheet-followup-body bg-white border border-[#c3c6d6] shadow-md rounded-lg p-6 w-[210mm] max-w-full mx-auto flex flex-col gap-4" dir="ltr">

      {/* ── HEADER ── */}
      <header className="flex items-start justify-between border-b-2 border-[#003d9b] pb-3">
        <div className="flex-1">
          <div className="text-xl font-extrabold text-[#003d9b] leading-tight">{BRAND_NAME_EN}</div>
          <div className="text-sm text-[#434654]">Laser &amp; Vision Correction</div>
          <div className="text-xs text-[#737685] mt-0.5">Ophthalmic Excellence Center</div>
        </div>
        <div className="text-center px-4">
          <div className="text-base font-bold text-[#003d9b]">{titleEn}</div>
          <div className="text-sm text-[#434654]">{titleAr}</div>
          <div className="text-xs text-[#737685] mt-0.5">{today}</div>
        </div>
        <div className="text-left text-xs text-[#434654] space-y-0.5">
          {patientName && <div className="font-bold text-sm text-[#191c1e]">{patientName}</div>}
          {patientDOB && <div className="text-[#737685]">DOB: {patientDOB}</div>}
        </div>
      </header>

      {/* ── OPERATION SUMMARY BAND ── */}
      <div className="bg-[#f3f4f6] border border-[#c3c6d6] rounded-lg p-3" dir="rtl">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-xs font-semibold text-[#434654] mb-1">{followupLabels.operationDateLabel ?? "تاريخ العملية"}</p>
            <DateInput
              value={operationDateRight}
              onChange={(e) => setOperationDateRight(e.target.value)}
              className="h-7 text-sm border-[#c3c6d6] w-full"
              disabled={readOnly}
            />
          </div>
          <div className="col-span-2">
            <p className="text-xs font-semibold text-[#434654] mb-1">{followupLabels.operationTypeLabel ?? "نوع العملية"}</p>
            <Input
              value={operationType}
              onChange={(e) => setOperationType(e.target.value)}
              className="h-7 text-sm text-[#003d9b] border-[#c3c6d6] font-semibold"
              disabled={readOnly}
            />
          </div>
          <div>
            <p className="text-xs font-semibold text-[#434654] mb-1">Eye</p>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={readOnly}
                className={`flex-1 py-1.5 rounded-md border text-xs font-bold transition-all ${operationEyes.right ? "border-[#003d9b] bg-[#003d9b] text-white" : "border-[#c3c6d6] text-[#737685] hover:border-[#003d9b]"}`}
                onClick={() => setOperationEyes((prev: typeof operationEyes) => ({ ...prev, right: !prev.right }))}
              >OD</button>
              <button
                type="button"
                disabled={readOnly}
                className={`flex-1 py-1.5 rounded-md border text-xs font-bold transition-all ${operationEyes.left ? "border-[#526069] bg-[#526069] text-white" : "border-[#c3c6d6] text-[#737685] hover:border-[#526069]"}`}
                onClick={() => setOperationEyes((prev: typeof operationEyes) => ({ ...prev, left: !prev.left }))}
              >OS</button>
            </div>
          </div>
        </div>
      </div>

      {/* ── LEGEND (screen only) ── */}
      <div className="print:hidden flex items-center justify-between text-xs text-[#434654]" dir="ltr">
        <h2 className="font-bold text-[#191c1e]">
          Post-Op Follow-up
        </h2>
        <div className="flex gap-2">
          <span className="px-2 py-1 bg-[#e7e8ea] rounded">V.A = Visual Acuity</span>
          <span className="px-2 py-1 bg-[#e7e8ea] rounded">IOP = Intraocular Pressure</span>
        </div>
      </div>

      {/* ── FOLLOWUP CARDS ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {followups.map((f, idx) => (
          <section
            key={f.id}
            className={`border rounded-lg overflow-hidden shadow-sm ${idx === 0 ? "border-[#003d9b]/40" : "border-[#c3c6d6]"}`}
          >
            {/* Card Header */}
            <div className={`px-3 py-2 flex items-center justify-between ${idx === 0 ? "bg-[#003d9b]" : "bg-[#e7e8ea]"}`}>
              <div className="flex items-center gap-2">
                <span className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold ${idx === 0 ? "bg-white text-[#003d9b]" : "bg-[#003d9b] text-white"}`}>{idx + 1}</span>
                <Input
                  value={f.type}
                  onChange={(e) => setFollowups((prev) => prev.map((x) => x.id === f.id ? { ...x, type: e.target.value } : x))}
                  className={`h-6 text-sm border-0 bg-transparent focus:bg-white/20 w-44 font-semibold ${idx === 0 ? "text-white placeholder:text-white/60" : "text-[#191c1e]"}`}
                  disabled={readOnly}
                />
              </div>
              <div className="flex items-center gap-1.5">
                <label className={`text-[10px] uppercase font-semibold ${idx === 0 ? "text-white/80" : "text-[#434654]"}`}>
                  {followupLabels.followupDateLabel ?? "Date"}:
                </label>
                <DateInput
                  value={f.date}
                  onChange={(e) => setFollowups((prev) => prev.map((x) => x.id === f.id ? { ...x, date: e.target.value } : x))}
                  className={`h-6 w-32 text-xs ${idx === 0 ? "bg-white/10 border-white/30 text-white" : "border-[#c3c6d6]"}`}
                  disabled={readOnly}
                />
              </div>
            </div>

            {/* Exam Table */}
            <table className="w-full text-left border-collapse text-xs" dir="ltr">
              <thead>
                <tr className="bg-[#f3f4f6] border-b border-[#c3c6d6] text-[#434654] uppercase tracking-wide">
                  <th className="px-2 py-1.5 w-10">Eye</th>
                  <th className="px-2 py-1.5">{followupLabels.vaLabel ?? "V.A"}</th>
                  <th className="px-2 py-1.5">{followupLabels.refractionLabel ?? "Refraction"}</th>
                  <th className="px-2 py-1.5">{followupLabels.flapLabel ?? "Flap"}</th>
                  <th className="px-2 py-1.5">{followupLabels.iopLabel ?? "IOP"}</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-[#c3c6d6] bg-[#003d9b]/4">
                  <td className="px-2 py-2 font-bold text-[#003d9b] text-xs">OD</td>
                  <td className="px-2 py-2"><input className="w-full bg-transparent border-0 border-b border-[#c3c6d6] outline-none text-xs focus:border-[#003d9b]" disabled={readOnly} /></td>
                  <td className="px-2 py-2"><input className="w-full bg-transparent border-0 border-b border-[#c3c6d6] outline-none text-xs focus:border-[#003d9b]" disabled={readOnly} /></td>
                  <td className="px-2 py-2"><input className="w-full bg-transparent border-0 border-b border-[#c3c6d6] outline-none text-xs focus:border-[#003d9b]" disabled={readOnly} /></td>
                  <td className="px-2 py-2"><input className="w-full bg-transparent border-0 border-b border-[#c3c6d6] outline-none text-xs focus:border-[#003d9b]" disabled={readOnly} /></td>
                </tr>
                <tr className="bg-[#f8f9fb]">
                  <td className="px-2 py-2 font-bold text-[#526069] text-xs">OS</td>
                  <td className="px-2 py-2"><input className="w-full bg-transparent border-0 border-b border-[#c3c6d6] outline-none text-xs focus:border-[#003d9b]" disabled={readOnly} /></td>
                  <td className="px-2 py-2"><input className="w-full bg-transparent border-0 border-b border-[#c3c6d6] outline-none text-xs focus:border-[#003d9b]" disabled={readOnly} /></td>
                  <td className="px-2 py-2"><input className="w-full bg-transparent border-0 border-b border-[#c3c6d6] outline-none text-xs focus:border-[#003d9b]" disabled={readOnly} /></td>
                  <td className="px-2 py-2"><input className="w-full bg-transparent border-0 border-b border-[#c3c6d6] outline-none text-xs focus:border-[#003d9b]" disabled={readOnly} /></td>
                </tr>
              </tbody>
            </table>

            {/* Treatment + Signatures */}
            <div className="p-3 grid grid-cols-2 gap-3 bg-white border-t border-[#c3c6d6]">
              <div>
                <label className="text-[10px] uppercase font-semibold text-[#434654] block mb-1">{followupLabels.treatmentLabel ?? "Treatment Plan"}</label>
                <textarea
                  className="w-full border border-[#c3c6d6] rounded focus:ring-1 focus:ring-[#003d9b] focus:outline-none text-xs p-1.5 resize-none h-14"
                  disabled={readOnly}
                />
              </div>
              <div className="grid grid-cols-3 gap-2 items-end">
                {[
                  { label: followupLabels.receptionLabel ?? "Reception", val: "" },
                  { label: followupLabels.nurseLabel ?? "Nurse", val: "" },
                  { label: followupLabels.doctorLabel ?? "Doctor", val: signatures.doctor, isDoctor: true },
                ].map(({ label, val, isDoctor }, si) => (
                  <div key={si} className="text-center">
                    <div className={`h-8 border-b flex items-end justify-center pb-0.5 ${isDoctor ? "border-[#003d9b]" : "border-[#c3c6d6]"}`}>
                      {val && <span className={`text-[9px] italic ${isDoctor ? "text-[#003d9b] font-semibold" : "text-[#737685]"}`}>{val}</span>}
                    </div>
                    <p className={`text-[9px] uppercase font-semibold mt-0.5 ${isDoctor ? "text-[#003d9b]" : "text-[#434654]"}`}>{label}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        ))}
      </div>

      {/* ── FOOTER ── */}
      <footer className="pt-3 border-t border-[#c3c6d6] flex justify-between items-center text-[10px] uppercase tracking-widest text-[#737685]" dir="ltr">
        <div>Ref: OP-FUP-V3.0</div>
        <div>Page 1 of 1</div>
        <div>Ophthalmic Management System</div>
      </footer>
    </div>
  );
}
