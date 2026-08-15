import type { Dispatch, SetStateAction } from "react";
import { DateInput } from "@/components/ui/date-input";
import { Input } from "@/components/ui/input";
import SheetPrintHeader from "@/components/sheets/SheetPrintHeader";
import SheetWatermark from "@/components/sheets/SheetWatermark";

export type FollowupItem = {
  id: number | string;
  date: string;
  type: string;
  treatment?: string;
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
  flapLabel?: string;
  edgesLabel?: string;
  bedLabel?: string;
  iopLabel?: string;
  treatmentLabel?: string;
  receptionLabel?: string;
  nurseLabel?: string;
  doctorLabel?: string;
};

type Props<T extends FollowupItem> = {
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
}: Props<T>) {
  const sheetTypeLabel = "متابعة";

  const updateFollowup = (id: T["id"], patch: Partial<T>) => {
    setFollowups((previous) =>
      previous.map((item) =>
        item.id === id ? ({ ...item, ...patch } as T) : item,
      ),
    );
  };

  const field = (followup: T, key: string, label: string, className = "") => (
    <input
      aria-label={label}
      value={(followup[key] as string) ?? ""}
      onChange={(event) =>
        updateFollowup(followup.id, {
          [key]: event.target.value,
        } as Partial<T>)
      }
      disabled={readOnly}
      className={`h-full min-h-7 w-full border-0 bg-transparent px-1 text-center text-[12px] font-semibold text-[#172033] outline-none focus:bg-[#dbeafe]/50 disabled:opacity-100 ${className}`}
    />
  );

  return (
    <div
      className="sheet-followup-body relative overflow-hidden border border-[#d5dbe5] bg-white p-6 shadow-sm"
      dir="rtl"
    >
      <style>{`
        .sheet-followup-body .followup-record-title,
        .sheet-followup-body .followup-record-title input,
        .sheet-followup-body .followup-record-title label,
        .sheet-followup-body .followup-record-table th,
        .sheet-followup-body .followup-record-table td,
        .sheet-followup-body .followup-record-table input,
        .sheet-followup-body .followup-record-section > div:last-child,
        .sheet-followup-body .followup-record-section > div:last-child > div {
          text-align: center !important;
          vertical-align: middle !important;
        }
      `}</style>
      <SheetWatermark />
      <div className="sheet-followup-content relative z-10 flex min-h-0 flex-col gap-3">
        <SheetPrintHeader sheetType={sheetTypeLabel} />

        <section className="followup-record-head overflow-hidden border border-[#b9c4d4] bg-white">
          <div className="grid grid-cols-[1.25fr_0.75fr_1fr_1.2fr] divide-x divide-x-reverse divide-[#d5dbe5] text-[12px]">
            <div className="px-3 py-2">
              <span className="block text-[10px] font-bold text-[#667085]">
                اسم المريض
              </span>
              <strong className="block truncate text-[18px] font-extrabold text-[#123b72]">
                {patientName || "-"}
              </strong>
            </div>
            <div className="px-3 py-2">
              <span className="block text-[10px] font-bold text-[#667085]">
                تاريخ الميلاد
              </span>
              <strong className="block text-[13px] text-[#172033]" dir="ltr">
                {patientDOB || "-"}
              </strong>
            </div>
            <label className="px-3 py-1.5">
              <span className="block text-[10px] font-bold text-[#667085]">
                {followupLabels.operationDateLabel ?? "تاريخ العملية"}
              </span>
              <DateInput
                value={operationDateRight}
                onChange={(event) => setOperationDateRight(event.target.value)}
                disabled={readOnly}
                className="mt-1 h-8 w-full border-[#d5dbe5] text-[12px]"
                inputClassName="min-w-0 w-full"
              />
            </label>
            <label className="px-3 py-1.5">
              <span className="block text-[10px] font-bold text-[#667085]">
                {followupLabels.operationTypeLabel ?? "نوع العملية"}
              </span>
              <Input
                value={operationType}
                onChange={(event) => setOperationType(event.target.value)}
                disabled={readOnly}
                className="mt-1 h-8 border-[#d5dbe5] text-center text-[12px] font-bold"
              />
            </label>
          </div>
          <div className="flex items-center justify-end gap-2 border-t border-[#d5dbe5] bg-[#f7f9fc] px-3 py-1.5 text-[11px] font-bold text-[#475467]">
            <span>العين التي تم إجراء العملية بها</span>
            {(["right", "left"] as const).map((eye) => {
              const active = Boolean(operationEyes[eye]);
              const label =
                eye === "right"
                  ? (followupLabels.rtLabel ?? "RT")
                  : (followupLabels.ltLabel ?? "LT");
              return (
                <button
                  key={eye}
                  type="button"
                  disabled={readOnly}
                  onClick={() =>
                    setOperationEyes((previous: typeof operationEyes) => ({
                      ...previous,
                      [eye]: !previous[eye],
                    }))
                  }
                  className={`h-7 min-w-12 border px-2 text-[11px] font-bold ${active ? "border-[#1e5a96] bg-[#1e5a96] text-white" : "border-[#b9c4d4] bg-white text-[#475467]"}`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </section>

        <div className="followup-record-list grid flex-1 grid-rows-4 gap-2.5">
          {followups.slice(0, 4).map((followup, index) => (
            <section
              key={followup.id}
              className="followup-record-section overflow-hidden border border-[#9eabbc] bg-white"
            >
              <div className="followup-record-title grid grid-cols-[minmax(0,1fr)_210px_210px] items-center border-b border-[#9eabbc] bg-[#eef4fb]">
                <Input
                  value={followup.type}
                  onChange={(event) =>
                    updateFollowup(followup.id, {
                      type: event.target.value,
                    } as Partial<T>)
                  }
                  disabled={readOnly}
                  className="h-8 border-0 bg-transparent px-3 text-center text-[13px] font-bold text-[#123b72]"
                />
                <label className="grid h-8 min-w-0 grid-cols-[auto_minmax(0,1fr)] items-center justify-center gap-2 overflow-hidden border-r border-[#c5cfdb] px-2 text-center text-[10px] font-bold text-[#475467]">
                  <span className="followup-date-label whitespace-nowrap text-[9px] leading-none">
                    {followupLabels.followupDateLabel ?? "تاريخ المتابعة"}
                  </span>
                  <DateInput
                    value={followup.date}
                    onChange={(event) =>
                      updateFollowup(followup.id, {
                        date: event.target.value,
                      } as Partial<T>)
                    }
                    disabled={readOnly}
                    className="h-6 min-w-0 w-full overflow-hidden border-0 bg-white px-1 text-[10px]"
                    inputClassName="min-w-0 w-full px-1 text-[10px]"
                  />
                </label>
                <div className="flex h-8 min-w-0 items-center justify-center gap-2 overflow-hidden border-r border-[#c5cfdb] px-2 text-center text-[10px] font-bold text-[#475467]">
                  <span className="whitespace-nowrap">
                    {followupLabels.nextFollowupLabel ?? "المتابعة القادمة"}
                  </span>
                  <span className="h-4 flex-1 border-b border-dashed border-[#98a2b3]" />
                </div>
              </div>

              <table
                className="followup-record-table w-full table-fixed border-collapse text-center"
                dir="ltr"
              >
                <colgroup>
                  <col className="w-[16%]" />
                  <col className="w-[12%]" />
                  <col />
                  <col />
                </colgroup>
                <thead>
                  <tr className="h-5 bg-[#f8fafc] text-[9px] font-bold text-[#344054]">
                    <th className="border-r border-[#c5cfdb]" colSpan={2}>
                      Clinical Item
                    </th>
                    <th className="border-r border-[#c5cfdb] text-[#174f87]">
                      OD
                    </th>
                    <th className="border-r border-[#c5cfdb] text-[#174f87]">
                      OS
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="h-6 border-t border-[#d5dbe5]">
                    <th
                      className="border-r border-[#c5cfdb] bg-[#f8fafc] text-[10px] font-bold"
                      colSpan={2}
                    >
                      {followupLabels.vaLabel ?? "V.A"}
                    </th>
                    <td className="border-r border-[#c5cfdb]">
                      {field(followup, "odVa", `OD VA visit ${index + 1}`)}
                    </td>
                    <td className="border-r border-[#c5cfdb]">
                      {field(followup, "osVa", `OS VA visit ${index + 1}`)}
                    </td>
                  </tr>
                  <tr className="followup-comment-row h-8 border-t border-[#d5dbe5]">
                    <th
                      className="border-r border-[#c5cfdb] bg-[#f8fafc] text-[10px] font-bold"
                      colSpan={2}
                    >
                      {followupLabels.refractionLabel ?? "Refraction"}
                    </th>
                    {(["od", "os"] as const).map((eye) => (
                      <td key={eye} className="border-r border-[#c5cfdb] p-0">
                        <div className="grid h-full grid-cols-3 place-items-stretch divide-x divide-[#d5dbe5] text-center">
                          {(["S", "C", "Axis"] as const).map((part) => (
                            <label
                              key={part}
                              className="grid grid-rows-[12px_1fr] place-items-center text-center"
                            >
                              <span className="flex h-full w-full items-center justify-center bg-[#f8fafc] text-center text-[7px] font-bold text-[#667085]">
                                {part === "Axis" ? "A" : part}
                              </span>
                              {field(
                                followup,
                                `${eye}${part}`,
                                `${eye.toUpperCase()} ${part} visit ${index + 1}`,
                              )}
                            </label>
                          ))}
                        </div>
                      </td>
                    ))}
                  </tr>
                  <tr className="h-6 border-t border-[#d5dbe5]">
                    <th
                      className="border-r border-[#c5cfdb] bg-[#f8fafc] text-[10px] font-bold"
                      colSpan={2}
                    >
                      {followupLabels.iopLabel ?? "I.O.P"}
                    </th>
                    <td className="border-r border-[#c5cfdb]">
                      {field(followup, "odIop", `OD IOP visit ${index + 1}`)}
                    </td>
                    <td className="border-r border-[#c5cfdb]">
                      {field(followup, "osIop", `OS IOP visit ${index + 1}`)}
                    </td>
                  </tr>
                  <tr className="h-8 border-t border-[#9eabbc]">
                    <th
                      className="border-r border-[#c5cfdb] bg-[#fff7ed] text-[10px] font-bold text-[#9a4a08]"
                      colSpan={2}
                    >
                      {followupLabels.treatmentLabel ?? "Treatment"}
                    </th>
                    <td className="border-r border-[#c5cfdb]" colSpan={2}>
                      {field(
                        followup,
                        "treatment",
                        `Treatment visit ${index + 1}`,
                        "px-2",
                      )}
                    </td>
                  </tr>
                  <tr className="h-8 border-t border-[#d5dbe5]">
                    <th
                      className="border-r border-[#c5cfdb] bg-[#f8fafc] text-[10px] font-bold"
                      colSpan={2}
                    >
                      Comment
                    </th>
                    <td className="border-r border-[#c5cfdb]" colSpan={2}>
                      {field(
                        followup,
                        "notes",
                        `Comment visit ${index + 1}`,
                        "px-2",
                      )}
                    </td>
                  </tr>
                </tbody>
              </table>

              <div className="grid h-6 grid-cols-3 border-t border-[#9eabbc] bg-[#fbfcfe] text-center text-[8px] font-bold text-[#475467]">
                <div className="flex items-center justify-center gap-1 px-2">
                  الاستقبال
                  <span className="flex-1 border-b border-dotted border-[#98a2b3]" />
                </div>
                <div className="flex items-center justify-center gap-1 border-r border-[#d5dbe5] px-2">
                  التمريض
                  <span className="flex-1 border-b border-dotted border-[#98a2b3]" />
                </div>
                <div className="flex items-center justify-center gap-1 border-r border-[#d5dbe5] px-2">
                  الطبيب
                  <span className="min-w-0 flex-1 truncate text-center text-[#123b72]">
                    {signatures.doctor}
                  </span>
                </div>
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
