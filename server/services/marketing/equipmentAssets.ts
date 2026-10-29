import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { getDb, getSystemSetting, updateSystemSettings } from "../../db";
import { marketingReferenceDesigns } from "../../../drizzle/schema";
import { medicalVisualDirection } from "./medicalVisuals";
export const equipmentInput = z.object({
  pageRole: z.enum(["center", "doctor"]),
  kind: z.enum(["pentacam", "slit-lamp"]),
  referenceId: z.number().int().positive().nullable(),
});
const assignments = z
  .object({
    pentacam: z.number().int().positive().nullable().default(null),
    "slit-lamp": z.number().int().positive().nullable().default(null),
  })
  .strict();
export async function readEquipmentAssignments(pageRole: "center" | "doctor") {
  const entries = await Promise.all(
    (["pentacam", "slit-lamp"] as const).map(async (kind) => {
      const row = await getSystemSetting(
        `marketing_equipment_${pageRole}_${kind}`,
      );
      return [
        kind,
        row
          ? z
              .number()
              .int()
              .positive()
              .nullable()
              .parse(JSON.parse(row.value ?? ""))
          : null,
      ] as const;
    }),
  );
  return assignments.parse(Object.fromEntries(entries));
}
async function reference(pageRole: "center" | "doctor", id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const [asset] = await db
    .select({
      id: marketingReferenceDesigns.id,
      fileUrl: marketingReferenceDesigns.fileUrl,
    })
    .from(marketingReferenceDesigns)
    .where(
      and(
        eq(marketingReferenceDesigns.id, id),
        eq(marketingReferenceDesigns.pageRole, pageRole),
      ),
    )
    .limit(1);
  if (!asset)
    throw new Error("صورة الجهاز المحددة غير موجودة في مكتبة هذه الصفحة");
  return asset;
}
export async function saveEquipmentAssignment(
  raw: z.infer<typeof equipmentInput>,
) {
  const input = equipmentInput.parse(raw);
  if (input.referenceId) await reference(input.pageRole, input.referenceId);
  await updateSystemSettings(
    `marketing_equipment_${input.pageRole}_${input.kind}`,
    input.referenceId,
  );
  return readEquipmentAssignments(input.pageRole);
}
export async function readEquipmentPhoto(
  pageRole: "center" | "doctor",
  topic: string,
) {
  const kind = medicalVisualDirection(topic).equipmentKind;
  if (!kind) return null;
  const selected = (await readEquipmentAssignments(pageRole))[kind];
  return selected ? reference(pageRole, selected) : null;
}
