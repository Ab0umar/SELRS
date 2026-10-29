export function clinicalDate(value: unknown): string {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value ?? "").slice(0, 10);
}

export function canonicalVisitRecords<
  T extends { id: number; visitId: number },
>(records: T[]): T[] {
  const latest = new Map<number, T>();
  for (const record of records) {
    if (
      !latest.has(record.visitId) ||
      Number(latest.get(record.visitId)!.id) < Number(record.id)
    )
      latest.set(record.visitId, record);
  }
  return [...latest.values()].sort(
    (left, right) => Number(right.id) - Number(left.id),
  );
}

export function correctedVision(
  glasses: Record<string, unknown> | undefined,
  legacy: Record<string, unknown> | undefined,
  eye: "OD" | "OS",
): string | null {
  return glasses
    ? glasses[`bcva${eye}`] == null
      ? null
      : String(glasses[`bcva${eye}`])
    : legacy?.[`bcva${eye}`] == null
      ? null
      : String(legacy[`bcva${eye}`]);
}

export function selectClinicalVisit<
  T extends { id: number; patientId?: number; visitDate: unknown },
>(
  rows: T[],
  patientId: number,
  visitId?: number,
  date?: string,
): T | undefined {
  const candidates = rows.filter(
    (row) => row.patientId === undefined || Number(row.patientId) === patientId,
  );
  if (visitId) {
    const visit = candidates.find((row) => Number(row.id) === visitId);
    if (!visit)
      throw new Error("The selected visit does not belong to this patient");
    return visit;
  }
  const matches = candidates.filter(
    (row) => clinicalDate(row.visitDate) === date,
  );
  if (matches.length > 1)
    throw new Error(
      "Multiple visits exist on this date. Select the visit explicitly.",
    );
  return matches[0];
}

/** A present canonical record owns empty/null values as well as populated ones. */
export function clinicalValue(
  record: Record<string, unknown> | undefined,
  key: string,
  legacy: unknown = "",
): unknown {
  return record ? (record[key] ?? "") : (legacy ?? "");
}

export function clinicalArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  try {
    const parsed = JSON.parse(String(value ?? ""));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function fundusRecord(value: unknown) {
  const empty = {
    discStatus: "",
    cupDiscRatio: "",
    macuaStatus: "",
    vesselStatus: "",
    otherFindings: "",
  };
  if (!value) return empty;
  try {
    const parsed: unknown =
      typeof value === "string" ? JSON.parse(value) : value;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      const record = parsed as Record<string, unknown>;
      return {
        discStatus: String(record.discStatus ?? ""),
        cupDiscRatio: String(record.cupDiscRatio ?? ""),
        macuaStatus: String(record.macuaStatus ?? ""),
        vesselStatus: String(record.vesselStatus ?? ""),
        otherFindings: String(record.otherFindings ?? ""),
      };
    }
  } catch {}
  return { ...empty, otherFindings: String(value) };
}
