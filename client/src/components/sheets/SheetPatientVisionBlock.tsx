import type { ChangeEvent } from "react";
import { DateInput } from "@/components/ui/date-input";
import { displaySheetDate } from "@/lib/sheetDates";

export type EyeSC = { s: string; c: string; a: string };

/**
 * Shared "patient info + visual acuity/tear film + clinical refraction" block —
 * used by ConsultantSheet (via LasikExamSheet) and SpecialistSheet so both
 * render the exact same layout instead of drifting apart over time.
 */
export default function SheetPatientVisionBlock({
  patientName,
  onPatientNameChange,
  age,
  onAgeChange,
  dateOfBirth,
  address,
  onAddressChange,
  phone,
  onPhoneChange,
  patientCode,
  onPatientCodeChange,
  examinationDate,
  onExaminationDateChange,
  job,
  onJobChange,
  extraPatientField,
  ucvaOD,
  onUcvaODChange,
  ucvaOS,
  onUcvaOSChange,
  bcvaOD,
  onBcvaODChange,
  bcvaOS,
  onBcvaOSChange,
  iopOD,
  onIopODChange,
  iopOS,
  onIopOSChange,
  refractionOD,
  onRefractionODChange,
  refractionOS,
  onRefractionOSChange,
  readingValue,
  onReadingValueChange,
  compactEyeTable,
}: {
  patientName: string;
  onPatientNameChange: (v: string) => void;
  age: string;
  onAgeChange: (v: string) => void;
  dateOfBirth: string;
  address: string;
  onAddressChange: (v: string) => void;
  phone: string;
  onPhoneChange: (v: string) => void;
  patientCode: string;
  onPatientCodeChange: (v: string) => void;
  examinationDate: string;
  onExaminationDateChange: (v: string) => void;
  job: string;
  onJobChange: (v: string) => void;
  /** Optional extra field rendered at the end of the patient-info row (e.g. "الطبيب:" on the specialist sheet). */
  extraPatientField?: React.ReactNode;
  ucvaOD: string;
  onUcvaODChange: (v: string) => void;
  ucvaOS: string;
  onUcvaOSChange: (v: string) => void;
  bcvaOD: string;
  onBcvaODChange: (v: string) => void;
  bcvaOS: string;
  onBcvaOSChange: (v: string) => void;
  iopOD: string;
  onIopODChange: (v: string) => void;
  iopOS: string;
  onIopOSChange: (v: string) => void;
  refractionOD: EyeSC;
  onRefractionODChange: (v: EyeSC) => void;
  refractionOS: EyeSC;
  onRefractionOSChange: (v: EyeSC) => void;
  readingValue: string;
  onReadingValueChange: (v: string) => void;
  /** Render Eye/UCVA/IOP table minimized on the left with Clinical Refraction beside it (Specialist sheet layout). */
  compactEyeTable?: boolean;
}) {
  const inp =
    "w-full text-center bg-transparent border-0 border-b border-solid border-[#737685] focus:outline-none focus:border-[#003d9b] py-1 text-sm";
  const ctd = "p-1 border border-[#c3c6d6]";

  const onText =
    (setter: (v: string) => void) => (e: ChangeEvent<HTMLInputElement>) =>
      setter(e.target.value);

  return (
    <>
      {/* Patient Info */}
      <section
        className="print-sheet-patient-grid p-4 bg-[#f3f4f6] rounded-xl border border-[#c3c6d6] flex flex-col gap-2 text-sm"
        dir="rtl"
      >
        <div className="patient-row-bold flex flex-wrap items-center justify-between gap-x-4 gap-y-2 text-xs font-bold">
          <label className="inline-flex items-center gap-1 whitespace-nowrap">
            <span className="text-[#434654]">الاسم:</span>
            <input
              size={patientName.length || 12}
              className="text-[#003d9b] bg-transparent border-0 border-b border-[#c3c6d6] focus:outline-none text-right font-bold text-xs"
              dir="rtl"
              value={patientName}
              onChange={onText(onPatientNameChange)}
            />
          </label>
          <span className="inline-flex items-center gap-1 whitespace-nowrap">
            <span className="text-[#434654]">تاريخ الميلاد:</span>
            <span className="px-1 border-b border-[#c3c6d6] text-right">
              {displaySheetDate(dateOfBirth)}
            </span>
          </span>
          <label className="inline-flex items-center gap-1 whitespace-nowrap">
            <span className="text-[#434654]">السن:</span>
            <input
              size={age.length || 3}
              className="bg-transparent border-0 border-b border-[#c3c6d6] focus:outline-none text-right font-bold text-xs"
              dir="rtl"
              value={age}
              onChange={onText(onAgeChange)}
            />
          </label>
          <label className="inline-flex items-center gap-1 whitespace-nowrap">
            <span className="text-[#434654]">المهنة:</span>
            <input
              size={job.length || 8}
              className="bg-transparent border-0 border-b border-[#c3c6d6] focus:outline-none text-right font-bold text-xs"
              dir="rtl"
              value={job}
              onChange={onText(onJobChange)}
            />
          </label>
        </div>
        <div className="patient-row-normal flex flex-nowrap items-center justify-center gap-x-2 gap-y-2 text-xs font-normal">
          <label className="inline-flex items-center gap-1 whitespace-nowrap min-w-0 shrink">
            <span className="text-[#434654] shrink-0">العنوان:</span>
            <input
              className="w-16 min-w-0 font-normal text-xs bg-transparent border-0 border-b border-[#c3c6d6] focus:outline-none text-right"
              dir="rtl"
              value={address}
              onChange={onText(onAddressChange)}
            />
          </label>
          <label className="inline-flex items-center gap-1 whitespace-nowrap min-w-0 shrink">
            <span className="text-[#434654] shrink-0">التليفون:</span>
            <input
              className="w-16 min-w-0 font-normal text-xs bg-transparent border-0 border-b border-[#c3c6d6] focus:outline-none text-right"
              dir="rtl"
              value={phone}
              onChange={onText(onPhoneChange)}
            />
          </label>
          <label className="inline-flex items-center gap-1 whitespace-nowrap min-w-0 shrink">
            <span className="text-[#434654] shrink-0">كود العميل:</span>
            <input
              className="w-14 min-w-0 font-normal text-xs text-[#526069] bg-transparent border-0 border-b border-[#c3c6d6] focus:outline-none text-right"
              dir="rtl"
              value={patientCode}
              onChange={onText(onPatientCodeChange)}
            />
          </label>
          <label className="inline-flex items-center gap-1 whitespace-nowrap min-w-0 shrink">
            <span className="text-[#434654] shrink-0">تاريخ الفحص:</span>
            <DateInput
              className="h-6 w-16 min-w-0 font-normal text-xs bg-transparent border-0 border-b border-[#c3c6d6] rounded-none px-0.5 text-right"
              value={examinationDate}
              onChange={(e) => onExaminationDateChange(e.target.value)}
            />
          </label>
          {extraPatientField}
        </div>
      </section>

      {(() => {
        const compactInp =
          "w-14 text-center bg-transparent border-0 border-b border-solid border-[#737685] focus:outline-none focus:border-[#003d9b] py-1 text-sm";
        const eyeTable = (
          <div className="flex flex-col gap-2">
            <table className="text-center border-collapse w-auto">
              <thead className="bg-[#e7e8ea] text-xs font-bold uppercase">
                <tr>
                  <th className={`${ctd} w-auto`}>Eye</th>
                  <th className={`${ctd} w-auto`}>UCVA</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className={`${ctd} text-[#003d9b] bg-[#003d9b]/5`}>OD</td>
                  <td className={ctd}><input className={compactInp} value={ucvaOD} onChange={onText(onUcvaODChange)} /></td>
                </tr>
                <tr>
                  <td className={`${ctd} text-[#526069] bg-[#f3f4f6]`}>OS</td>
                  <td className={ctd}><input className={compactInp} value={ucvaOS} onChange={onText(onUcvaOSChange)} /></td>
                </tr>
              </tbody>
            </table>
            <table className="text-center border-collapse w-auto">
              <thead className="bg-[#e7e8ea] text-xs font-bold uppercase">
                <tr>
                  <th className={`${ctd} w-auto`}>Eye</th>
                  <th className={`${ctd} w-auto`}>IOP</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className={`${ctd} text-[#003d9b] bg-[#003d9b]/5`}>OD</td>
                  <td className={ctd}><input className={compactInp} value={iopOD} onChange={onText(onIopODChange)} /></td>
                </tr>
                <tr>
                  <td className={`${ctd} text-[#526069] bg-[#f3f4f6]`}>OS</td>
                  <td className={ctd}><input className={compactInp} value={iopOS} onChange={onText(onIopOSChange)} /></td>
                </tr>
              </tbody>
            </table>
          </div>
        );

        const refractionTable = (
          <table className="w-full text-center border-collapse">
            <thead className="bg-[#e7e8ea] text-xs uppercase font-bold">
              <tr>
                <th className={`${ctd} w-48`} rowSpan={2}>Clinical Refraction</th>
                <th className={`${ctd} text-[#003d9b]`} colSpan={4}>OD (Right)</th>
                <th className={`${ctd} text-[#526069]`} colSpan={4}>OS (Left)</th>
              </tr>
              <tr>
                <th className={ctd}>BCVA</th><th className={ctd}>S</th><th className={ctd}>C</th><th className={ctd}>A</th>
                <th className={ctd}>BCVA</th><th className={ctd}>S</th><th className={ctd}>C</th><th className={ctd}>A</th>
              </tr>
            </thead>
            <tbody className="font-mono">
              <tr>
                <td className={`${ctd} text-left bg-[#f3f4f6]`}>Refraction</td>
                <td className={ctd}><input className={inp} value={bcvaOD} onChange={onText(onBcvaODChange)} /></td>
                <td className={ctd}><input className={inp} value={refractionOD.s} onChange={(e) => onRefractionODChange({ ...refractionOD, s: e.target.value })} /></td>
                <td className={ctd}><input className={inp} value={refractionOD.c} onChange={(e) => onRefractionODChange({ ...refractionOD, c: e.target.value })} /></td>
                <td className={ctd}><input className={inp} value={refractionOD.a} onChange={(e) => onRefractionODChange({ ...refractionOD, a: e.target.value })} /></td>
                <td className={ctd}><input className={inp} value={bcvaOS} onChange={onText(onBcvaOSChange)} /></td>
                <td className={ctd}><input className={inp} value={refractionOS.s} onChange={(e) => onRefractionOSChange({ ...refractionOS, s: e.target.value })} /></td>
                <td className={ctd}><input className={inp} value={refractionOS.c} onChange={(e) => onRefractionOSChange({ ...refractionOS, c: e.target.value })} /></td>
                <td className={ctd}><input className={inp} value={refractionOS.a} onChange={(e) => onRefractionOSChange({ ...refractionOS, a: e.target.value })} /></td>
              </tr>
              <tr>
                <td className={`${ctd} text-left bg-[#f3f4f6]`}>Reading</td>
                <td className={ctd} colSpan={8}><input className={inp} value={readingValue} onChange={onText(onReadingValueChange)} /></td>
              </tr>
              <tr>
                <td className={`${ctd} text-left bg-[#f3f4f6]`}>Fundus</td>
                <td className={ctd} colSpan={4}><input className={inp} /></td>
                <td className={ctd} colSpan={4}><input className={inp} /></td>
              </tr>
            </tbody>
          </table>
        );

        if (compactEyeTable) {
          return (
            <section className="print-sheet-visual-grid flex flex-nowrap items-start gap-3" dir="ltr">
              <div className="w-auto shrink-0" dir="ltr">{eyeTable}</div>
              <div className="flex-1 min-w-0">{refractionTable}</div>
            </section>
          );
        }

        return (
          <>
            <section className="print-sheet-visual-grid">{eyeTable}</section>
            <section>{refractionTable}</section>
          </>
        );
      })()}
    </>
  );
}
