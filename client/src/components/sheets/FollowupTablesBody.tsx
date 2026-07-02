import type { Dispatch, SetStateAction } from "react";
import { Input } from "@/components/ui/input";
import { DateInput } from "@/components/ui/date-input";
import SheetCenterHeader from "@/components/SheetCenterHeader";

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
  return (
    <div className="sheet-followup-body space-y-5" dir="ltr">
      <SheetCenterHeader titleEn={titleEn} titleAr={titleAr} />
      <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-sm px-1" dir="rtl">
        <p className="inline-flex items-center gap-1 whitespace-nowrap"><span>الاسم:</span> <span className="min-w-[120px] px-1">{patientName}</span></p>
        <p className="inline-flex items-center gap-1 whitespace-nowrap"><span>تاريخ الميلاد:</span> <span className="min-w-[70px] px-1">{patientDOB}</span></p>
      </div>

      {/* Operation header */}
      <div className="bg-white border border-[#c3c6d6] rounded-lg p-4 shadow-sm flex flex-col md:flex-row justify-between gap-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 flex-1">
          <div>
            <p className="text-xs uppercase tracking-wider text-[#434654] mb-1">{followupLabels.operationDateLabel ?? "Operation Date"}</p>
            <DateInput value={operationDateRight} onChange={(e) => setOperationDateRight(e.target.value)} className="h-7 text-sm border-[#c3c6d6]" disabled={readOnly} />
          </div>
          <div className="col-span-2">
            <p className="text-xs uppercase tracking-wider text-[#434654] mb-1">{followupLabels.operationTypeLabel ?? "Operation Type"}</p>
            <Input
              value={operationType}
              onChange={(e) => setOperationType(e.target.value)}
              className="h-7 text-sm text-[#003d9b] border-[#c3c6d6]"
              disabled={readOnly}
            />
          </div>
          <div className="flex gap-2 items-end">
            <button
              type="button"
              disabled={readOnly}
              className={`text-center p-2 rounded border flex-1 text-xs transition-all ${operationEyes.right ? "border-[#003d9b] bg-[#dae2ff]/30 text-[#003d9b]" : "border-[#c3c6d6] text-[#737685]"}`}
              onClick={() => setOperationEyes((prev: typeof operationEyes) => ({ ...prev, right: !prev.right }))}
            >OD</button>
            <button
              type="button"
              disabled={readOnly}
              className={`text-center p-2 rounded border flex-1 text-xs transition-all ${operationEyes.left ? "border-[#003d9b] bg-[#dae2ff]/30 text-[#003d9b]" : "border-[#c3c6d6] text-[#737685]"}`}
              onClick={() => setOperationEyes((prev: typeof operationEyes) => ({ ...prev, left: !prev.left }))}
            >OS</button>
          </div>
        </div>
        <div className="flex items-center justify-center">
          <div className="px-4 py-2 bg-[#ffdad6] text-[#93000a] rounded text-xs uppercase border border-[#ba1a1a] tracking-widest">
            Post-Op Day 1
          </div>
        </div>
      </div>

      {/* Page title */}
      <div className="print:hidden flex items-center justify-between">
        <h2 className="text-lg text-[#191c1e]">
          متابعة ما بعد العمليات <span className="text-[#737685]">/ Post-Op Follow-up</span>
        </h2>
        <div className="flex gap-2">
          <span className="px-2 py-1 bg-[#e7e8ea] rounded text-xs text-[#434654]">V.A: Visual Acuity</span>
          <span className="px-2 py-1 bg-[#e7e8ea] rounded text-xs text-[#434654]">IOP: Intraocular Pressure</span>
        </div>
      </div>

      {/* Followup sections */}
      <div className="space-y-5">
        {followups.map((f, idx) => (
          <section key={f.id} className="bg-white border border-[#c3c6d6] overflow-hidden rounded-lg shadow-sm">
            <div className={`px-4 py-2 border-b border-[#c3c6d6] flex justify-between items-center ${idx === 0 ? "bg-[#d3e2ed]/30" : "bg-[#edeef0]"}`}>
              <div className="flex items-center gap-3">
                <span className={`w-8 h-8 flex items-center justify-center rounded-full text-white text-sm ${idx === 0 ? "bg-[#003d9b]" : "bg-[#737685]"}`}>{idx + 1}</span>
                <Input
                  value={f.type}
                  onChange={(e) => setFollowups((prev) => prev.map((x) => x.id === f.id ? { ...x, type: e.target.value } : x))}
                  className="h-7 text-base border-0 bg-transparent focus:bg-white focus:border-[#003d9b] w-56"
                  disabled={readOnly}
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs uppercase text-[#434654]">{followupLabels.followupDateLabel ?? "Date"}:</label>
                <DateInput
                  value={f.date}
                  onChange={(e) => setFollowups((prev) => prev.map((x) => x.id === f.id ? { ...x, date: e.target.value } : x))}
                  className="h-7 w-36 text-sm"
                  disabled={readOnly}
                />
              </div>
            </div>

            <table className="w-full text-left border-collapse" dir="ltr">
              <thead>
                <tr className="bg-[#f3f4f6] text-xs uppercase tracking-wider text-[#434654] border-b border-[#c3c6d6]">
                  <th className="px-3 py-2 w-14">Eye</th>
                  <th className="px-3 py-2">{followupLabels.vaLabel ?? "V.A (UCVA/BCVA)"}</th>
                  <th className="px-3 py-2">{followupLabels.refractionLabel ?? "Refraction (S/C/A)"}</th>
                  <th className="px-3 py-2">{followupLabels.flapLabel ?? "Flap Status"}</th>
                  <th className="px-3 py-2">{followupLabels.iopLabel ?? "IOP (mmHg)"}</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-[#c3c6d6]" style={{ backgroundColor: "rgba(0,61,155,0.03)" }}>
                  <td className="px-3 py-2.5 text-[#003d9b] text-sm">OD</td>
                  <td className="px-3 py-2.5"><input className="w-full bg-transparent border-0 outline-none p-0 text-sm" disabled={readOnly} /></td>
                  <td className="px-3 py-2.5"><input className="w-full bg-transparent border-0 outline-none p-0 text-sm" disabled={readOnly} /></td>
                  <td className="px-3 py-2.5"><input className="w-full bg-transparent border-0 outline-none p-0 text-sm" disabled={readOnly} /></td>
                  <td className="px-3 py-2.5"><input className="w-full bg-transparent border-0 outline-none p-0 text-sm" disabled={readOnly} /></td>
                </tr>
                <tr className="bg-white">
                  <td className="px-3 py-2.5 text-[#526069] text-sm">OS</td>
                  <td className="px-3 py-2.5"><input className="w-full bg-transparent border-0 outline-none p-0 text-sm" disabled={readOnly} /></td>
                  <td className="px-3 py-2.5"><input className="w-full bg-transparent border-0 outline-none p-0 text-sm" disabled={readOnly} /></td>
                  <td className="px-3 py-2.5"><input className="w-full bg-transparent border-0 outline-none p-0 text-sm" disabled={readOnly} /></td>
                  <td className="px-3 py-2.5"><input className="w-full bg-transparent border-0 outline-none p-0 text-sm" disabled={readOnly} /></td>
                </tr>
              </tbody>
            </table>

            <div className="grid grid-cols-1 md:grid-cols-2 p-4 gap-4">
              <div>
                <label className="text-xs uppercase tracking-wider text-[#434654] block mb-1">{followupLabels.treatmentLabel ?? "Treatment Plan"}</label>
                <textarea className="w-full border border-[#c3c6d6] rounded-lg focus:ring-1 focus:ring-[#003d9b] focus:outline-none text-sm p-2 resize-none h-16" disabled={readOnly} />
              </div>
              <div className="grid grid-cols-3 gap-4 items-end">
                <div className="text-center">
                  <div className="h-10 mb-1" />
                  <p className="text-[10px] uppercase text-[#434654] opacity-60">{followupLabels.receptionLabel ?? "Receptionist"}</p>
                </div>
                <div className="text-center">
                  <div className="h-10 mb-1" />
                  <p className="text-[10px] uppercase text-[#434654] opacity-60">{followupLabels.nurseLabel ?? "Nurse"}</p>
                </div>
                <div className="text-center">
                  <div className="h-10 mb-1 flex items-end justify-center">
                    <span className="text-[10px] text-[#003d9b] italic">{signatures.doctor}</span>
                  </div>
                  <p className="text-[10px] uppercase text-[#003d9b]">{followupLabels.doctorLabel ?? "Doctor"}</p>
                </div>
              </div>
            </div>
          </section>
        ))}
      </div>

      <footer className="pt-4 border-t border-[#c3c6d6] flex justify-between items-center text-xs uppercase tracking-widest text-[#434654] opacity-50">
        <div>Ref: OP-FUP-V2.1</div>
        <div>Page 1 of 1</div>
        <div>Ophthalmic Management System</div>
      </footer>
    </div>
  );
}
