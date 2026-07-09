import type { Dispatch, SetStateAction } from "react";
import { DateInput } from "@/components/ui/date-input";
import { Input } from "@/components/ui/input";
import SheetPrintHeader from "@/components/sheets/SheetPrintHeader";
import SheetWatermark from "@/components/sheets/SheetWatermark";

export type FollowupItem = {
  id: number | string;
  date: string;
  type: string;
  notes?: string;
  [key: string]: unknown;
};

export type FollowupLabelsShape = {
  rtLabel?: string;
  ltLabel?: string;
  operationDateLabel?: string;
  operationTypeLabel?: string;
  followupDateLabel?: string;
  nextFollowupLabel?: string;
  vaLabel?: string;
  refractionLabel?: string;
  iopLabel?: string;
  treatmentLabel?: string;
  receptionLabel?: string;
  nurseLabel?: string;
  doctorLabel?: string;
};

export default function FollowupTablesBody<T extends FollowupItem>({
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
  const sheetTypeLabel = titleAr.includes("الاستشاري")
    ? "متابعة استشاري"
    : titleAr.includes("الليزك")
      ? "متابعة ليزك"
      : titleAr;

  const updateFollowup = (id: T["id"], patch: Partial<T>) => {
    setFollowups((prev) =>
      prev.map((item) =>
        item.id === id ? ({ ...item, ...patch } as T) : item,
      ),
    );
  };

  const eyeFieldKey = (
    eye: "OD" | "OS",
    suffix: "Va" | "S" | "C" | "Axis" | "Iop",
  ) => `${eye === "OD" ? "od" : "os"}${suffix}`;

  const inputClass =
    "h-full w-full border-0 bg-transparent px-1 text-center text-[11px] font-semibold text-[#191c1e] outline-none focus:bg-[#dae2ff]/25";

  return (
    <div
      className="sheet-followup-body relative overflow-hidden border border-[#c3c6d6] bg-white p-6 shadow-sm"
      dir="ltr"
    >
      <SheetWatermark />
      <div className="sheet-followup-content relative z-10 flex min-h-0 flex-col gap-4">
        <SheetPrintHeader sheetType={sheetTypeLabel} />

        <section className="followup-record-head grid grid-cols-4 gap-0 border border-[#c3c6d6] bg-[#f8f9fb] text-[11px]">
          <div className="border-l border-[#c3c6d6] px-3 py-2" dir="rtl">
            <span className="block text-[9px] font-bold uppercase text-[#526069]">
              الاسم / Patient
            </span>
            <span className="block truncate font-bold text-[#003d9b]">
              {patientName}
            </span>
          </div>
          <div className="border-l border-[#c3c6d6] px-3 py-2" dir="rtl">
            <span className="block text-[9px] font-bold uppercase text-[#526069]">
              تاريخ الميلاد / DOB
            </span>
            <span className="block font-bold text-[#191c1e]">{patientDOB}</span>
          </div>
          <div
            className="col-span-2 grid grid-cols-[1fr_1.15fr_0.75fr_0.75fr] items-end gap-2 px-3 py-2"
            dir="rtl"
          >
            <label className="min-w-0">
              <span className="mb-1 block text-[10px] font-bold text-[#737685]">
                {followupLabels.operationDateLabel ?? "تاريخ العملية"}
              </span>
              <DateInput
                value={operationDateRight}
                onChange={(event) => setOperationDateRight(event.target.value)}
                className="h-8 border-[#c3c6d6] bg-white text-[12px]"
                disabled={readOnly}
              />
            </label>
            <label className="min-w-0">
              <span className="mb-1 block text-[10px] font-bold text-[#737685]">
                {followupLabels.operationTypeLabel ?? "نوع العملية"}
              </span>
              <Input
                value={operationType}
                onChange={(event) => setOperationType(event.target.value)}
                className="h-8 border-[#c3c6d6] bg-white text-center text-[12px] font-bold text-[#003d9b]"
                disabled={readOnly}
              />
            </label>
            <button
              type="button"
              disabled={readOnly}
              onClick={() =>
                setOperationEyes((prev: typeof operationEyes) => ({
                  ...prev,
                  right: !prev.right,
                }))
              }
              className={`h-8 border text-[11px] font-bold ${
                operationEyes.right
                  ? "border-[#003d9b] bg-[#dae2ff]/45 text-[#003d9b]"
                  : "border-[#c3c6d6] bg-white text-[#526069]"
              }`}
            >
              {followupLabels.rtLabel ?? "RT"} Power
            </button>
            <button
              type="button"
              disabled={readOnly}
              onClick={() =>
                setOperationEyes((prev: typeof operationEyes) => ({
                  ...prev,
                  left: !prev.left,
                }))
              }
              className={`h-8 border text-[11px] font-bold ${
                operationEyes.left
                  ? "border-[#003d9b] bg-[#dae2ff]/45 text-[#003d9b]"
                  : "border-[#c3c6d6] bg-white text-[#526069]"
              }`}
            >
              {followupLabels.ltLabel ?? "LT"} Power
            </button>
          </div>
        </section>

        <div className="followup-record-list flex flex-1 min-h-0 flex-col gap-3">
          {followups.slice(0, 4).map((followup, index) => (
            <section
              key={followup.id}
              className="followup-record-section overflow-hidden border border-[#c3c6d6] bg-white"
            >
              <div
                className="followup-record-title grid grid-cols-[auto_1fr] items-center gap-4 border-b border-[#c3c6d6] bg-[#edeef0] px-3 py-1.5"
                dir="rtl"
              >
                <Input
                  value={followup.type}
                  onChange={(event) =>
                    updateFollowup(followup.id, {
                      type: event.target.value,
                    } as Partial<T>)
                  }
                  className="h-7 w-56 border-0 bg-transparent text-right text-[14px] font-bold text-[#191c1e] focus:border-[#003d9b] focus:bg-white"
                  disabled={readOnly}
                  dir="rtl"
                />
                <div
                  className="flex items-center justify-self-start gap-4 text-[10px] font-bold text-[#526069]"
                  dir="rtl"
                >
                  <span>
                    {followupLabels.followupDateLabel ?? "تاريخ المتابعة"}:
                  </span>
                  <DateInput
                    value={followup.date}
                    onChange={(event) =>
                      updateFollowup(followup.id, {
                        date: event.target.value,
                      } as Partial<T>)
                    }
                    className="h-7 w-28 border-[#c3c6d6] bg-white text-[11px]"
                    disabled={readOnly}
                  />
                  <span className="text-[#c3c6d6]">|</span>
                  <span>{followupLabels.nextFollowupLabel ?? "القادمة"}:</span>
                  <span className="inline-block min-w-20 border-b border-dotted border-[#737685]" />
                </div>
              </div>

              <div className="followup-clinical-grid flex min-h-0">
                <table
                  className="followup-record-table min-w-0 flex-1 border-collapse text-center"
                  dir="ltr"
                >
                  <thead>
                    <tr className="bg-[#eef2f8] text-[9px] font-bold uppercase tracking-[0.01em] text-[#003d9b]">
                      <th className="w-[7%] border-r border-[#c3c6d6] px-1 py-1">
                        Eye
                      </th>
                      <th className="w-[12%] border-r border-[#c3c6d6] px-1 py-1">
                        {followupLabels.vaLabel ?? "V.A"}
                      </th>
                      <th className="w-[10%] border-r border-[#c3c6d6] px-1 py-1">
                        S
                      </th>
                      <th className="w-[10%] border-r border-[#c3c6d6] px-1 py-1">
                        C
                      </th>
                      <th className="w-[10%] border-r border-[#c3c6d6] px-1 py-1">
                        Ax
                      </th>
                      <th className="w-[10%] border-r border-[#c3c6d6] px-1 py-1">
                        {followupLabels.iopLabel ?? "I.O.P"}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {(["OD", "OS"] as const).map((eye, eyeIndex) => (
                      <tr
                        key={eye}
                        className={`${eyeIndex === 0 ? "border-b border-[#c3c6d6]" : ""}`}
                      >
                        <td
                          className={`border-r border-[#c3c6d6] bg-[#f3f4f6] text-[12px] font-bold ${eye === "OD" ? "text-[#003d9b]" : "text-[#526069]"}`}
                        >
                          {eye}
                        </td>
                        <td className="border-r border-[#c3c6d6] p-0">
                          <input
                            aria-label={`${eye} visual acuity`}
                            className={inputClass}
                            value={(followup[eyeFieldKey(eye, "Va")] as string) ?? ""}
                            onChange={(event) =>
                              updateFollowup(followup.id, {
                                [eyeFieldKey(eye, "Va")]: event.target.value,
                              } as Partial<T>)
                            }
                            disabled={readOnly}
                          />
                        </td>
                        <td className="border-r border-[#c3c6d6] p-0">
                          <input
                            aria-label={`${eye} sphere`}
                            className={inputClass}
                            value={(followup[eyeFieldKey(eye, "S")] as string) ?? ""}
                            onChange={(event) =>
                              updateFollowup(followup.id, {
                                [eyeFieldKey(eye, "S")]: event.target.value,
                              } as Partial<T>)
                            }
                            disabled={readOnly}
                          />
                        </td>
                        <td className="border-r border-[#c3c6d6] p-0">
                          <input
                            aria-label={`${eye} cylinder`}
                            className={inputClass}
                            value={(followup[eyeFieldKey(eye, "C")] as string) ?? ""}
                            onChange={(event) =>
                              updateFollowup(followup.id, {
                                [eyeFieldKey(eye, "C")]: event.target.value,
                              } as Partial<T>)
                            }
                            disabled={readOnly}
                          />
                        </td>
                        <td className="border-r border-[#c3c6d6] p-0">
                          <input
                            aria-label={`${eye} axis`}
                            className={inputClass}
                            value={(followup[eyeFieldKey(eye, "Axis")] as string) ?? ""}
                            onChange={(event) =>
                              updateFollowup(followup.id, {
                                [eyeFieldKey(eye, "Axis")]: event.target.value,
                              } as Partial<T>)
                            }
                            disabled={readOnly}
                          />
                        </td>
                        <td className="border-r border-[#c3c6d6] p-0">
                          <input
                            aria-label={`${eye} IOP`}
                            className={inputClass}
                            value={(followup[eyeFieldKey(eye, "Iop")] as string) ?? ""}
                            onChange={(event) =>
                              updateFollowup(followup.id, {
                                [eyeFieldKey(eye, "Iop")]: event.target.value,
                              } as Partial<T>)
                            }
                            disabled={readOnly}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="followup-section-bottom grid grid-cols-[1fr_48mm] border-t border-[#c3c6d6] bg-white">
                <label className="grid grid-rows-[auto_1fr] border-r border-[#c3c6d6]">
                  <span className="bg-[#f3f4f6] px-2 py-0.5 text-[8px] font-bold uppercase tracking-[0.01em] text-[#526069]">
                    Clinical Notes / Findings
                  </span>
                  <textarea
                    aria-label={`${followup.type} clinical notes`}
                    className="min-h-0 w-full resize-none border-0 bg-transparent px-2 py-1 text-left text-[10px] outline-none focus:bg-[#dae2ff]/20"
                    value={(followup.notes as string) ?? ""}
                    onChange={(event) =>
                      updateFollowup(followup.id, {
                        notes: event.target.value,
                      } as Partial<T>)
                    }
                    disabled={readOnly}
                    dir="ltr"
                  />
                </label>
                <div className="grid grid-rows-[auto_1fr] bg-[#f8f9fb]">
                  <span className="bg-[#eef2f8] px-2 py-0.5 text-[8px] font-bold uppercase tracking-[0.01em] text-[#003d9b]">
                    {index < 3 ? "Compliance" : "Status"}
                  </span>
                  <div className="grid grid-cols-3 items-center gap-1 px-2 text-[8px] font-bold uppercase text-[#526069]">
                    {(index < 3
                      ? ["Antibiotic", "Steroid", "Lubricant"]
                      : ["Stable Ref.", "PRN Lub.", "Routine"]
                    ).map((label) => (
                      <label key={label} className="flex items-center gap-1">
                        <input
                          type="checkbox"
                          className="h-2.5 w-2.5 rounded-none border-[#737685] text-[#003d9b]"
                          disabled={readOnly}
                        />
                        {label}
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          ))}
        </div>

        <footer
          className="followup-signature-row grid grid-cols-3 gap-6 border-t border-[#c3c6d6] pt-4 text-[11px] font-bold text-[#526069]"
          dir="rtl"
        >
          <div className="text-right">
            {followupLabels.doctorLabel ?? "توقيع الطبيب"}:{" "}
            <span className="inline-block min-w-32 border-b border-dotted border-[#526069] text-center text-[#003d9b]">
              {signatures.doctor}
            </span>
          </div>
          <div className="text-center">
            {followupLabels.nurseLabel ?? "التمريض"}:{" "}
            <span className="inline-block min-w-32 border-b border-dotted border-[#526069]" />
          </div>
          <div className="text-left" dir="ltr">
            STAMP:
          </div>
        </footer>
      </div>
    </div>
  );
}
