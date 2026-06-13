import { desc, eq } from "drizzle-orm";
import { attendanceEmployees, kfPatients } from "../../../drizzle/schema";
import type { getTestDb } from "../setup";

type TestDb = Awaited<ReturnType<typeof getTestDb>>;

export async function seedEmployee(
  db: TestDb,
  overrides: Record<string, any> = {},
) {
  const empCd = String(overrides.empCd ?? "TEST-EMP-001");
  await db
    .insert(attendanceEmployees)
    .values({
      empCd,
      fullName: overrides.fullName ?? "Test Employee",
      department: overrides.department ?? "testing",
      salaryType: overrides.salaryType ?? "monthly",
      attendanceCommissionRate: overrides.attendanceCommissionRate ?? null,
      attendanceLeaveMultiplier: overrides.attendanceLeaveMultiplier ?? null,
      defaultShiftId: overrides.defaultShiftId ?? null,
      active: overrides.active ?? true,
      commAttendance: overrides.commAttendance ?? true,
      commExam: overrides.commExam ?? true,
      commPentacam: overrides.commPentacam ?? true,
      commDay10: overrides.commDay10 ?? true,
      sourceHash: overrides.sourceHash ?? null,
    })
    .onDuplicateKeyUpdate({
      set: {
        fullName: overrides.fullName ?? "Test Employee",
      },
    });
  return { empCd };
}

export async function seedKfPatient(
  db: TestDb,
  overrides: Record<string, any> = {},
) {
  const fullName = String(overrides.fullName ?? "Test KF Patient");
  const kfCode = String(overrides.kfCode ?? "KF-TEST-001");
  const result = await db.insert(kfPatients).values({
    kfCode,
    fullName,
    dateOfBirth: overrides.dateOfBirth ?? null,
    age: overrides.age ?? null,
    gender: overrides.gender ?? null,
    nationalId: overrides.nationalId ?? null,
    phone: overrides.phone ?? null,
    alternatePhone: overrides.alternatePhone ?? null,
    address: overrides.address ?? null,
    occupation: overrides.occupation ?? null,
    medicalHistory: overrides.medicalHistory ?? null,
    allergies: overrides.allergies ?? null,
    notes: overrides.notes ?? null,
    selrsPatientCode: overrides.selrsPatientCode ?? null,
    createdByUserId: overrides.createdByUserId ?? null,
  });
  const insertedId = Number((result as any)?.insertId ?? 0);
  if (Number.isFinite(insertedId) && insertedId > 0) {
    return { kfId: insertedId, kfCode };
  }
  const [row] = await db
    .select({ kfId: kfPatients.kfId, kfCode: kfPatients.kfCode })
    .from(kfPatients)
    .where(eq(kfPatients.kfCode, kfCode))
    .orderBy(desc(kfPatients.kfId))
    .limit(1);
  return { kfId: row?.kfId ?? 0, kfCode: row?.kfCode ?? kfCode };
}
