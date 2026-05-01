import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { operationTypeLabel } from "@/lib/operationsPricing";
import { type ListData } from "@/hooks/operations/operationsShared";

type OperationsTableProps = {
  canManageList: boolean;
  currentList: ListData[];
  exportDateLabel: string;
  exportDoctorLabel: string;
  exportTimeLabel: string;
  onDeleteRow: (id: number) => void;
  onUpdateRow: (id: number, field: keyof ListData | string, value: any) => void;
  operationOptions: string[];
  operationType: string;
};

export function OperationsTable({
  canManageList,
  currentList,
  exportDateLabel,
  exportDoctorLabel,
  exportTimeLabel,
  onDeleteRow,
  onUpdateRow,
  operationOptions,
  operationType,
}: OperationsTableProps) {
  const hasCataract = operationType === "Cataract" || currentList.some((row) => row.operation === "Cataract");

  return (
    <div className="mb-6" dir="rtl">
      <div className="ops-screen-table overflow-x-auto">
        <div className="mb-1 text-sm font-bold">قائمة العمليات</div>
        <div className="mb-2 text-xs text-muted-foreground">
          التاريخ: {exportDateLabel} | الساعة: {exportTimeLabel} | الطبيب: {exportDoctorLabel}
        </div>
        <table className="w-full table-fixed border-collapse border border-gray-500 text-center text-xs" dir="rtl">
          <thead>
            <tr className="bg-gray-200">
              <th className="w-6 border border-gray-500 p-1 text-center font-bold">#</th>
              <th className="w-16 border border-gray-500 p-1 text-center font-bold">رقم الإيصال</th>
              <th className="w-36 border border-gray-500 p-1 text-center font-bold">اسم المريض</th>
              <th className="w-24 border border-gray-500 p-1 text-center font-bold">الهاتف</th>
              <th className="w-20 border border-gray-500 p-2 text-center font-bold">الطبيب</th>
              <th className="w-12 border border-gray-500 p-1 text-center font-bold">العملية</th>
              <th className="w-14 border border-gray-500 p-1 text-center font-bold">العين</th>
              {hasCataract && <th className="w-16 border border-gray-500 p-1 text-center font-bold">المستشفى</th>}
              <th className="w-6 border border-gray-500 p-1 text-center font-bold">مركز</th>
              <th className="w-12 border border-gray-500 p-1 text-center font-bold">دفع</th>
              <th className="w-12 border border-gray-500 p-1 text-center font-bold">الكود</th>
              <th className="w-12 border border-gray-500 p-1 text-center font-bold">حذف</th>
            </tr>
          </thead>
          <tbody>
            {currentList.map((appointment, index) => (
              <tr key={appointment.id} className="border border-gray-500">
                <td className="w-6 border border-gray-500 p-1 text-center font-bold">{index + 1}</td>
                <td className="w-16 border border-gray-500 p-1">
                  <Input dir="ltr" value={appointment.number} onChange={(event) => onUpdateRow(appointment.id, "number", event.target.value)} readOnly={!canManageList} className="h-6 w-full text-center text-[11px]" />
                </td>
                <td className="w-36 border border-gray-500 p-1">
                  <Input dir="rtl" value={appointment.name} onChange={(event) => onUpdateRow(appointment.id, "name", event.target.value)} readOnly={!canManageList} className="h-6 w-full !max-w-none text-center text-[11px]" />
                </td>
                <td className="w-24 border border-gray-500 p-1">
                  <Input dir="rtl" value={appointment.phone} onChange={(event) => onUpdateRow(appointment.id, "phone", event.target.value)} readOnly={!canManageList} className="h-6 w-full text-center text-[11px]" />
                </td>
                <td className="w-20 border border-gray-500 p-1">
                  <Input dir="rtl" value={appointment.doctor} onChange={(event) => onUpdateRow(appointment.id, "doctor", event.target.value)} readOnly={!canManageList} className="h-6 w-full text-center text-[11px]" />
                </td>
                <td className="w-12 border border-gray-500 p-1 text-center">
                  <select value={appointment.operation || ""} onChange={(event) => onUpdateRow(appointment.id, "operation", event.target.value)} disabled={!canManageList} className="h-6 w-full border-0 bg-transparent text-center text-[11px]">
                    <option value="">-</option>
                    {operationOptions.map((option) => (
                      <option key={option} value={option}>
                        {operationTypeLabel(option)}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="w-14 border border-gray-500 p-1 text-center">
                  <select value={appointment.eye || ""} onChange={(event) => onUpdateRow(appointment.id, "eye", event.target.value)} disabled={!canManageList} className="h-6 w-full border-0 bg-transparent text-center text-[11px]">
                    <option value="">-</option>
                    <option value="OD">OD</option>
                    <option value="OS">OS</option>
                    <option value="OU">OU</option>
                  </select>
                </td>
                {hasCataract && (
                  <td className="w-16 border border-gray-500 p-1 text-center">
                    <select value={appointment.hospital || ""} onChange={(event) => onUpdateRow(appointment.id, "hospital", event.target.value)} disabled={!canManageList} className="h-6 w-full border-0 bg-transparent text-center text-[11px]">
                      <option value="">-</option>
                      <option value="الشروق">الشروق</option>
                      <option value="الأمل">الأمل</option>
                    </select>
                  </td>
                )}
                <td className="w-6 border border-gray-500 p-1 text-center">
                  <input type="checkbox" checked={appointment.center} onChange={(event) => onUpdateRow(appointment.id, "center", event.target.checked)} disabled={!canManageList} />
                </td>
                <td className="w-12 border border-gray-500 p-1">
                  <Input value={appointment.payment} onChange={(event) => onUpdateRow(appointment.id, "payment", event.target.value)} readOnly={!canManageList} className="h-6 w-full text-center text-[11px]" />
                </td>
                <td className="w-12 border border-gray-500 p-1">
                  <Input dir="rtl" value={appointment.code} onChange={(event) => onUpdateRow(appointment.id, "code", event.target.value)} readOnly={!canManageList} className="h-6 w-full text-center text-[11px]" />
                </td>
                <td className="w-12 border border-gray-500 p-1 text-center">
                  <Button variant="destructive" size="sm" onClick={() => onDeleteRow(appointment.id)} disabled={!canManageList}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </td>
              </tr>
            ))}
            {currentList.length === 0 && (
              <tr>
                <td colSpan={hasCataract ? 12 : 11} className="p-4 text-gray-500">
                  لا توجد حالات في القائمة الحالية.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
