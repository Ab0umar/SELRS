import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type EyeValues = Record<string, ReactNode>;

export interface RefractionField {
  key: string;
  label: string;
}

interface UnifiedRefractionTableProps {
  title: string;
  fields: RefractionField[];
  od: EyeValues;
  os: EyeValues;
  rowLabel?: string;
  trailing?: Array<{ label: string; value: ReactNode }>;
  reading?: ReactNode;
  date?: ReactNode;
  className?: string;
  emptyText?: string;
}

const displayValue = (value: ReactNode) =>
  value === null || value === undefined || value === "" ? "—" : value;

export function UnifiedRefractionTable({
  title,
  fields,
  od,
  os,
  rowLabel = "Distance",
  trailing = [],
  reading,
  date,
  className,
  emptyText,
}: UnifiedRefractionTableProps) {
  const hasValues = [...fields, ...trailing].some((field) => {
    const values =
      "key" in field ? [od[field.key], os[field.key]] : [field.value];
    return values.some(
      (value) => value !== null && value !== undefined && value !== "",
    );
  });

  if (!hasValues && emptyText) {
    return <p className="text-sm text-muted-foreground">{emptyText}</p>;
  }

  return (
    <div className={cn("overflow-x-auto", className)} dir="ltr">
      {date ? (
        <div className="mb-2 flex items-center justify-center gap-3 text-xs font-semibold text-muted-foreground">
          <span className="h-px flex-1 bg-border" />
          <span className="tabular-nums">{date}</span>
          <span className="h-px flex-1 bg-border" />
        </div>
      ) : null}
      <div className="min-w-[560px] overflow-hidden rounded-md border border-[#c3c6d6] bg-background">
        <table className="w-full table-fixed border-collapse text-center text-xs">
          <thead className="font-semibold text-foreground">
            <tr className="bg-[#e7e8ea]">
              <th className="w-[18%] border border-[#c3c6d6] px-2 py-2">
                {title}
              </th>
              <th
                colSpan={fields.length}
                className="border border-[#c3c6d6] px-2 py-2 text-center"
              >
                OD
              </th>
              <th
                colSpan={fields.length}
                className="border border-[#c3c6d6] px-2 py-2 text-center"
              >
                OS
              </th>
              {trailing.map((field) => (
                <th
                  key={field.label}
                  className="border border-[#c3c6d6] px-2 py-2"
                />
              ))}
            </tr>
            <tr className="bg-[#e7e8ea]">
              <th className="border border-[#c3c6d6] px-2 py-2">{rowLabel}</th>
              {fields.map((field) => (
                <th
                  key={`od-${field.key}`}
                  className="border border-[#c3c6d6] px-2 py-2"
                >
                  {field.label}
                </th>
              ))}
              {fields.map((field) => (
                <th
                  key={`os-${field.key}`}
                  className="border border-[#c3c6d6] px-2 py-2"
                >
                  {field.label}
                </th>
              ))}
              {trailing.map((field) => (
                <th
                  key={field.label}
                  className="border border-[#c3c6d6] px-2 py-2"
                >
                  {field.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr className="bg-primary/[0.04] font-mono tabular-nums">
              <td className="border border-[#c3c6d6] px-2 py-2">&nbsp;</td>
              {fields.map((field) => (
                <td
                  key={`od-value-${field.key}`}
                  className="border border-[#c3c6d6] px-2 py-2"
                >
                  {displayValue(od[field.key])}
                </td>
              ))}
              {fields.map((field) => (
                <td
                  key={`os-value-${field.key}`}
                  className="border border-[#c3c6d6] px-2 py-2"
                >
                  {displayValue(os[field.key])}
                </td>
              ))}
              {trailing.map((field) => (
                <td
                  key={`value-${field.label}`}
                  className="border border-[#c3c6d6] px-2 py-2"
                >
                  {displayValue(field.value)}
                </td>
              ))}
            </tr>
            {reading !== undefined ? (
              <tr>
                <td className="border border-[#c3c6d6] px-2 py-2 font-bold text-primary">
                  Reading
                </td>
                <td
                  colSpan={fields.length * 2 + trailing.length}
                  className="border border-[#c3c6d6] px-4 py-2"
                >
                  <div className="flex items-center justify-center gap-2">
                    <span className="whitespace-nowrap font-bold">Add +</span>
                    <span className="min-w-24 text-center font-bold">
                      {displayValue(reading) === "—" ? " " : reading}
                    </span>
                  </div>
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
