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
  alternatePhone,
  onAlternatePhoneChange,
  patientCode,
  onPatientCodeChange,
  examinationDate,
  onExaminationDateChange,
  job,
  onJobChange,
  doctorName,
  onDoctorNameChange,
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
  alternatePhone: string;
  onAlternatePhoneChange: (v: string) => void;
  patientCode: string;
  onPatientCodeChange: (v: string) => void;
  examinationDate: string;
  onExaminationDateChange: (v: string) => void;
  job: string;
  onJobChange: (v: string) => void;
  doctorName: string;
  onDoctorNameChange: (v: string) => void;
  /** Optional extra field rendered at the end of the patient-info grid. */
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
  /** Render IOP above a separate Eye/UCVA/BCVA table beside Clinical Refraction (Specialist sheet layout). */
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
        <div className="patient-info-grid-3x3 grid grid-cols-3 gap-x-4 gap-y-2 text-xs">
          <label className="inline-flex items-center gap-1 whitespace-nowrap font-bold">
            <span className="text-[#434654]">الاسم:</span>
            <input
              size={(patientName || "").length || 12}
              className="patient-detail-emphasis text-[#003d9b] bg-transparent border-0 border-b border-[#c3c6d6] focus:outline-none text-right text-sm font-bold"
              dir="rtl"
              value={patientName}
              onChange={onText(onPatientNameChange)}
            />
          </label>
          <span className="inline-flex items-center gap-1 whitespace-nowrap font-bold">
            <span className="text-[#434654]">تاريخ الميلاد:</span>
            <span className="px-1 border-b border-[#c3c6d6] text-right">
              {displaySheetDate(dateOfBirth)}
            </span>
          </span>
          <label className="inline-flex items-center gap-1 whitespace-nowrap font-bold">
            <span className="text-[#434654]">السن:</span>
            <input
              size={(age || "").length || 3}
              className="patient-detail-emphasis bg-transparent border-0 border-b border-[#c3c6d6] focus:outline-none text-right text-sm font-bold"
              dir="rtl"
              value={age}
              onChange={onText(onAgeChange)}
            />
          </label>
          <label className="inline-flex items-center gap-1 whitespace-nowrap">
            <span className="text-[#434654]">المهنة:</span>
            <input
              size={(job || "").length || 8}
              className="patient-detail-emphasis bg-transparent border-0 border-b border-[#c3c6d6] focus:outline-none text-right text-sm font-bold"
              dir="rtl"
              value={job}
              onChange={onText(onJobChange)}
            />
          </label>
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
            <span className="text-[#434654] shrink-0">موبايل 2:</span>
            <input
              className="w-16 min-w-0 font-normal text-xs bg-transparent border-0 border-b border-[#c3c6d6] focus:outline-none text-right"
              dir="rtl"
              value={alternatePhone}
              onChange={onText(onAlternatePhoneChange)}
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
              className="h-6 font-normal text-xs bg-transparent border-0 border-b border-[#c3c6d6] rounded-none px-0.5 text-right"
              value={examinationDate}
              onChange={(e) => onExaminationDateChange(e.target.value)}
            />
          </label>
          <label className="inline-flex items-center gap-1 whitespace-nowrap min-w-0 shrink">
            <span className="text-[#434654] shrink-0">الطبيب:</span>
            <input
              size={(doctorName || "").length || 10}
              className="min-w-0 font-normal text-xs bg-transparent border-0 border-b border-[#c3c6d6] focus:outline-none text-right"
              dir="rtl"
              value={doctorName}
              onChange={onText(onDoctorNameChange)}
            />
          </label>
          {extraPatientField}
        </div>
      </section>

      {(() => {
        const compactInp =
          "w-14 text-center bg-transparent border-0 border-b border-solid border-[#737685] focus:outline-none focus:border-[#003d9b] py-1 text-sm";
        const iopTable = (
          <table className="text-center border-collapse w-auto">
            <thead className="bg-[#e7e8ea] text-xs font-bold uppercase">
              <tr>
                <th className={`${ctd} w-auto`}>IOP</th>
                <th className={`${ctd} w-auto text-[#003d9b]`}>OD</th>
                <th className={`${ctd} w-auto text-[#526069]`}>OS</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className={`${ctd} bg-[#f3f4f6] text-[#434654]`}>mmHg</td>
                <td className={ctd}>
                  <input
                    className={compactInp}
                    value={iopOD}
                    onChange={onText(onIopODChange)}
                  />
                </td>
                <td className={ctd}>
                  <input
                    className={compactInp}
                    value={iopOS}
                    onChange={onText(onIopOSChange)}
                  />
                </td>
              </tr>
            </tbody>
          </table>
        );

        const acuityTable = (
          <table className="text-center border-collapse w-auto">
            <thead className="bg-[#e7e8ea] text-xs font-bold uppercase">
              <tr>
                <th className={`${ctd} w-auto`}>Eye</th>
                <th className={`${ctd} w-auto`}>UCVA</th>
                <th className={`${ctd} w-auto`}>BCVA</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className={`${ctd} text-[#003d9b] bg-[#003d9b]/5`}>OD</td>
                <td className={ctd}>
                  <input
                    className={compactInp}
                    value={ucvaOD}
                    onChange={onText(onUcvaODChange)}
                  />
                </td>
                <td className={ctd}>
                  <input
                    className={compactInp}
                    value={bcvaOD}
                    onChange={onText(onBcvaODChange)}
                  />
                </td>
              </tr>
              <tr>
                <td className={`${ctd} text-[#526069] bg-[#f3f4f6]`}>OS</td>
                <td className={ctd}>
                  <input
                    className={compactInp}
                    value={ucvaOS}
                    onChange={onText(onUcvaOSChange)}
                  />
                </td>
                <td className={ctd}>
                  <input
                    className={compactInp}
                    value={bcvaOS}
                    onChange={onText(onBcvaOSChange)}
                  />
                </td>
              </tr>
            </tbody>
          </table>
        );

        const refractionTable = (
          <table className="w-full text-center border-collapse">
            <thead className="bg-[#e7e8ea] text-xs uppercase font-bold">
              <tr>
                <th className={`${ctd} w-48`}>Refraction</th>
                <th className={`${ctd} text-[#003d9b]`} colSpan={3}>
                  OD (Right)
                </th>
                <th className={`${ctd} text-[#526069]`} colSpan={3}>
                  OS (Left)
                </th>
              </tr>
              <tr>
                <th className={ctd}>Distance</th>
                <th className={ctd}>S</th>
                <th className={ctd}>C</th>
                <th className={ctd}>A</th>
                <th className={ctd}>S</th>
                <th className={ctd}>C</th>
                <th className={ctd}>A</th>
              </tr>
            </thead>
            <tbody className="font-mono">
              <tr>
                <td className={`${ctd} bg-[#f3f4f6]`}>&nbsp;</td>
                <td className={ctd}>
                  <input
                    className={inp}
                    value={refractionOD.s}
                    onChange={(e) =>
                      onRefractionODChange({
                        ...refractionOD,
                        s: e.target.value,
                      })
                    }
                  />
                </td>
                <td className={ctd}>
                  <input
                    className={inp}
                    value={refractionOD.c}
                    onChange={(e) =>
                      onRefractionODChange({
                        ...refractionOD,
                        c: e.target.value,
                      })
                    }
                  />
                </td>
                <td className={ctd}>
                  <input
                    className={inp}
                    value={refractionOD.a}
                    onChange={(e) =>
                      onRefractionODChange({
                        ...refractionOD,
                        a: e.target.value,
                      })
                    }
                  />
                </td>
                <td className={ctd}>
                  <input
                    className={inp}
                    value={refractionOS.s}
                    onChange={(e) =>
                      onRefractionOSChange({
                        ...refractionOS,
                        s: e.target.value,
                      })
                    }
                  />
                </td>
                <td className={ctd}>
                  <input
                    className={inp}
                    value={refractionOS.c}
                    onChange={(e) =>
                      onRefractionOSChange({
                        ...refractionOS,
                        c: e.target.value,
                      })
                    }
                  />
                </td>
                <td className={ctd}>
                  <input
                    className={inp}
                    value={refractionOS.a}
                    onChange={(e) =>
                      onRefractionOSChange({
                        ...refractionOS,
                        a: e.target.value,
                      })
                    }
                  />
                </td>
              </tr>
              <tr>
                <td className={`${ctd} bg-[#f3f4f6] font-bold text-[#003d9b]`}>
                  Reading
                </td>
                <td className={ctd} colSpan={6}>
                  <div className="flex items-center justify-center gap-2">
                    <span className="whitespace-nowrap font-bold">Add +</span>
                    <input
                      className={`${inp} max-w-24`}
                      value={readingValue}
                      onChange={onText(onReadingValueChange)}
                    />
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        );

        if (compactEyeTable) {
          return (
            <section
              className="print-sheet-visual-grid flex flex-nowrap items-start gap-3"
              dir="ltr"
            >
              <div className="flex w-auto shrink-0 flex-col gap-2" dir="ltr">
                {iopTable}
                {acuityTable}
              </div>
              <div className="flex-1 min-w-0">{refractionTable}</div>
            </section>
          );
        }

        return (
          <>
            <section className="print-sheet-visual-grid flex flex-col gap-2">
              {iopTable}
              {acuityTable}
            </section>
            <section>{refractionTable}</section>
          </>
        );
      })()}
    </>
  );
}
