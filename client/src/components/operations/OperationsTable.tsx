import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { operationTypeLabel } from "@/lib/operationsPricing";
import { type ListData } from "@/hooks/operations/operationsShared";

const tableInputClass = "h-11 w-full text-center text-sm md:h-9 md:text-xs";
const tableSelectClass =
  "h-11 w-full rounded-md border border-border/60 bg-background text-center text-sm md:h-9 md:border-0 md:bg-transparent md:text-xs";

type OperationsTableProps = {
  canManageList: boolean;
  currentList: ListData[];
  emptyMessage?: string;
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
  emptyMessage = "لا توجد حالات في القائمة الحالية.",
  exportDateLabel,
  exportDoctorLabel,
  exportTimeLabel,
  onDeleteRow,
  onUpdateRow,
  operationOptions,
  operationType,
}: OperationsTableProps) {
  const hasCataract =
    operationType === "Cataract" ||
    currentList.some((row) => row.operation === "Cataract");
  const rowLabel = (appointment: ListData, index: number, field: string) =>
    `${field} للحالة ${index + 1}${appointment.name ? `، ${appointment.name}` : ""}`;

  return (
    <div className="mb-6" dir="rtl">
      <div className="ops-screen-table">
        <div className="mb-1 text-sm font-bold">قائمة العمليات</div>
        <div className="mb-2 text-xs text-muted-foreground">
          التاريخ: {exportDateLabel} | الساعة: {exportTimeLabel} | الطبيب:{" "}
          {exportDoctorLabel}
        </div>

        <div className="space-y-3 md:hidden">
          {currentList.map((appointment, index) => (
            <div
              key={`mobile-${appointment.id}`}
              className="rounded-lg border border-border bg-background p-3"
            >
              <div className="mb-3 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-foreground">
                    حالة {index + 1}
                  </div>
                  <div className="truncate text-[11px] text-muted-foreground">
                    {appointment.name || "بدون اسم"}
                  </div>
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  className="h-11 w-11 px-0"
                  onClick={() => onDeleteRow(appointment.id)}
                  disabled={!canManageList}
                  aria-label={rowLabel(appointment, index, "حذف")}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              <div className="grid grid-cols-1 gap-2">
                <Input
                  dir="rtl"
                  value={appointment.name}
                  onChange={(event) =>
                    onUpdateRow(appointment.id, "name", event.target.value)
                  }
                  readOnly={!canManageList}
                  className={tableInputClass}
                  aria-label={rowLabel(appointment, index, "اسم المريض")}
                  placeholder="اسم المريض"
                />
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    dir="rtl"
                    value={appointment.phone}
                    onChange={(event) =>
                      onUpdateRow(appointment.id, "phone", event.target.value)
                    }
                    readOnly={!canManageList}
                    className={tableInputClass}
                    aria-label={rowLabel(appointment, index, "الهاتف")}
                    placeholder="الهاتف"
                  />
                  <Input
                    dir="rtl"
                    value={appointment.doctor}
                    onChange={(event) =>
                      onUpdateRow(appointment.id, "doctor", event.target.value)
                    }
                    readOnly={!canManageList}
                    className={tableInputClass}
                    aria-label={rowLabel(appointment, index, "الطبيب")}
                    placeholder="الطبيب"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={appointment.operation || ""}
                    onChange={(event) =>
                      onUpdateRow(
                        appointment.id,
                        "operation",
                        event.target.value,
                      )
                    }
                    disabled={!canManageList}
                    className={tableSelectClass}
                    aria-label={rowLabel(appointment, index, "نوع العملية")}
                  >
                    <option value="">العملية</option>
                    {operationOptions.map((option) => (
                      <option key={option} value={option}>
                        {operationTypeLabel(option)}
                      </option>
                    ))}
                  </select>
                  <select
                    value={appointment.eye || ""}
                    onChange={(event) =>
                      onUpdateRow(appointment.id, "eye", event.target.value)
                    }
                    disabled={!canManageList}
                    className={tableSelectClass}
                    aria-label={rowLabel(appointment, index, "العين")}
                  >
                    <option value="">العين</option>
                    <option value="OD">OD</option>
                    <option value="OS">OS</option>
                    <option value="OU">OU</option>
                  </select>
                </div>
                {hasCataract && (
                  <select
                    value={appointment.hospital || ""}
                    onChange={(event) =>
                      onUpdateRow(
                        appointment.id,
                        "hospital",
                        event.target.value,
                      )
                    }
                    disabled={!canManageList}
                    className={tableSelectClass}
                    aria-label={rowLabel(appointment, index, "المستشفى")}
                  >
                    <option value="">المستشفى</option>
                    <option value="الشروق">الشروق</option>
                    <option value="الأمل">الأمل</option>
                  </select>
                )}
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    value={appointment.payment}
                    onChange={(event) =>
                      onUpdateRow(appointment.id, "payment", event.target.value)
                    }
                    readOnly={!canManageList}
                    className={tableInputClass}
                    aria-label={rowLabel(appointment, index, "الدفع")}
                    placeholder="دفع"
                  />
                  <Input
                    dir="rtl"
                    value={appointment.code}
                    onChange={(event) =>
                      onUpdateRow(appointment.id, "code", event.target.value)
                    }
                    readOnly={!canManageList}
                    className={tableInputClass}
                    aria-label={rowLabel(appointment, index, "الكود")}
                    placeholder="الكود"
                  />
                </div>
                <Input
                  dir="rtl"
                  value={appointment.notes ?? ""}
                  onChange={(event) =>
                    onUpdateRow(appointment.id, "notes", event.target.value)
                  }
                  readOnly={!canManageList}
                  className={tableInputClass}
                  aria-label={rowLabel(appointment, index, "الملاحظات")}
                  placeholder="ملاحظات"
                />
                <label className="flex min-h-11 items-center justify-between rounded-md border border-border/60 px-3 text-sm">
                  <span className="text-muted-foreground">مركز</span>
                  <input
                    type="checkbox"
                    checked={appointment.center}
                    onChange={(event) =>
                      onUpdateRow(
                        appointment.id,
                        "center",
                        event.target.checked,
                      )
                    }
                    disabled={!canManageList}
                    className="h-5 w-5"
                    aria-label={rowLabel(appointment, index, "مركز")}
                  />
                </label>
              </div>
            </div>
          ))}
          {currentList.length === 0 && (
            <div className="rounded-lg border border-border bg-muted/20 p-4 text-center text-sm text-muted-foreground">
              {emptyMessage}
            </div>
          )}
        </div>

        <div className="hidden overflow-x-auto md:block">
          <table
            className="w-full table-fixed border-collapse border border-border text-center text-xs"
            dir="rtl"
          >
            <thead>
              <tr className="bg-muted/50">
                <th className="w-6 border border-border p-1 text-center font-bold">
                  #
                </th>
                <th className="w-36 border border-border p-1 text-center font-bold">
                  اسم المريض
                </th>
                <th className="w-24 border border-border p-1 text-center font-bold">
                  الهاتف
                </th>
                <th className="w-20 border border-border p-2 text-center font-bold">
                  الطبيب
                </th>
                <th className="w-12 border border-border p-1 text-center font-bold">
                  العملية
                </th>
                <th className="w-14 border border-border p-1 text-center font-bold">
                  العين
                </th>
                {hasCataract && (
                  <th className="w-16 border border-border p-1 text-center font-bold">
                    المستشفى
                  </th>
                )}
                <th className="w-6 border border-border p-1 text-center font-bold">
                  مركز
                </th>
                <th className="w-12 border border-border p-1 text-center font-bold">
                  دفع
                </th>
                <th className="w-12 border border-border p-1 text-center font-bold">
                  الكود
                </th>
                <th className="w-24 border border-border p-1 text-center font-bold">
                  ملاحظات
                </th>
                <th className="w-12 border border-border p-1 text-center font-bold">
                  حذف
                </th>
              </tr>
            </thead>
            <tbody>
              {currentList.map((appointment, index) => (
                <tr key={appointment.id} className="border border-border">
                  <td className="w-6 border border-border p-1 text-center font-bold">
                    {index + 1}
                  </td>
                  <td className="w-36 border border-border p-1">
                    <Input
                      dir="rtl"
                      value={appointment.name}
                      onChange={(event) =>
                        onUpdateRow(appointment.id, "name", event.target.value)
                      }
                      readOnly={!canManageList}
                      className={`${tableInputClass} !max-w-none`}
                      aria-label={rowLabel(appointment, index, "اسم المريض")}
                    />
                  </td>
                  <td className="w-24 border border-border p-1">
                    <Input
                      dir="rtl"
                      value={appointment.phone}
                      onChange={(event) =>
                        onUpdateRow(appointment.id, "phone", event.target.value)
                      }
                      readOnly={!canManageList}
                      className={tableInputClass}
                      aria-label={rowLabel(appointment, index, "الهاتف")}
                    />
                  </td>
                  <td className="w-20 border border-border p-1">
                    <Input
                      dir="rtl"
                      value={appointment.doctor}
                      onChange={(event) =>
                        onUpdateRow(
                          appointment.id,
                          "doctor",
                          event.target.value,
                        )
                      }
                      readOnly={!canManageList}
                      className={tableInputClass}
                      aria-label={rowLabel(appointment, index, "الطبيب")}
                    />
                  </td>
                  <td className="w-12 border border-border p-1 text-center">
                    <select
                      value={appointment.operation || ""}
                      onChange={(event) =>
                        onUpdateRow(
                          appointment.id,
                          "operation",
                          event.target.value,
                        )
                      }
                      disabled={!canManageList}
                      className={tableSelectClass}
                      aria-label={rowLabel(appointment, index, "نوع العملية")}
                    >
                      <option value="">-</option>
                      {operationOptions.map((option) => (
                        <option key={option} value={option}>
                          {operationTypeLabel(option)}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="w-14 border border-border p-1 text-center">
                    <select
                      value={appointment.eye || ""}
                      onChange={(event) =>
                        onUpdateRow(appointment.id, "eye", event.target.value)
                      }
                      disabled={!canManageList}
                      className={tableSelectClass}
                      aria-label={rowLabel(appointment, index, "العين")}
                    >
                      <option value="">-</option>
                      <option value="OD">OD</option>
                      <option value="OS">OS</option>
                      <option value="OU">OU</option>
                    </select>
                  </td>
                  {hasCataract && (
                    <td className="w-16 border border-border p-1 text-center">
                      <select
                        value={appointment.hospital || ""}
                        onChange={(event) =>
                          onUpdateRow(
                            appointment.id,
                            "hospital",
                            event.target.value,
                          )
                        }
                        disabled={!canManageList}
                        className={tableSelectClass}
                        aria-label={rowLabel(appointment, index, "المستشفى")}
                      >
                        <option value="">-</option>
                        <option value="الشروق">الشروق</option>
                        <option value="الأمل">الأمل</option>
                      </select>
                    </td>
                  )}
                  <td className="w-6 border border-border p-1 text-center">
                    <label className="inline-flex h-9 w-9 items-center justify-center">
                      <input
                        type="checkbox"
                        checked={appointment.center}
                        onChange={(event) =>
                          onUpdateRow(
                            appointment.id,
                            "center",
                            event.target.checked,
                          )
                        }
                        disabled={!canManageList}
                        className="h-4 w-4"
                        aria-label={rowLabel(appointment, index, "مركز")}
                      />
                    </label>
                  </td>
                  <td className="w-12 border border-border p-1">
                    <Input
                      value={appointment.payment}
                      onChange={(event) =>
                        onUpdateRow(
                          appointment.id,
                          "payment",
                          event.target.value,
                        )
                      }
                      readOnly={!canManageList}
                      className={tableInputClass}
                      aria-label={rowLabel(appointment, index, "الدفع")}
                    />
                  </td>
                  <td className="w-12 border border-border p-1">
                    <Input
                      dir="rtl"
                      value={appointment.code}
                      onChange={(event) =>
                        onUpdateRow(appointment.id, "code", event.target.value)
                      }
                      readOnly={!canManageList}
                      className={tableInputClass}
                      aria-label={rowLabel(appointment, index, "الكود")}
                    />
                  </td>
                  <td className="w-24 border border-border p-1">
                    <Input
                      dir="rtl"
                      value={appointment.notes ?? ""}
                      onChange={(event) =>
                        onUpdateRow(appointment.id, "notes", event.target.value)
                      }
                      readOnly={!canManageList}
                      className={tableInputClass}
                      aria-label={rowLabel(appointment, index, "الملاحظات")}
                    />
                  </td>
                  <td className="w-12 border border-border p-1 text-center">
                    <Button
                      variant="destructive"
                      size="sm"
                      className="h-9 w-9 px-0"
                      onClick={() => onDeleteRow(appointment.id)}
                      disabled={!canManageList}
                      aria-label={rowLabel(appointment, index, "حذف")}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
              {currentList.length === 0 && (
                <tr>
                  <td
                    colSpan={hasCataract ? 12 : 11}
                    className="p-4 text-muted-foreground"
                  >
                    {emptyMessage}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
