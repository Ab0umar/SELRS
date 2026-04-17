import { getDb } from "../server/db";
import { sheetEntries, examinations, visits } from "../drizzle/schema";
import { eq, desc } from "drizzle-orm";

async function main() {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const entries = await db.select().from(sheetEntries).orderBy(desc(sheetEntries.updatedAt));
  console.log(`Found ${entries.length} sheet entries`);

  for (const entry of entries) {
    // skip if an examination row already references the same JSON blob
    const existing = await db
      .select()
      .from(examinations)
      .where(eq(examinations.radiologyLabsNotes, entry.content))
      .limit(1);
    if (existing.length > 0) {
      continue;
    }

    const content = entry.content ? JSON.parse(entry.content) : {};
    const examData = content.examData ?? content;
    const visitDate = entry.updatedAt ?? entry.createdAt ?? new Date();

    const visitResult = await db.insert(visits).values({
      patientId: entry.patientId,
      visitDate,
      visitType: "examination",
      branch: "examinations",
    });
    const visitId = (visitResult as any)?.insertId ?? 0;

    const payload: Record<string, any> = {
      patientId: entry.patientId,
      visitId,
      radiologyLabsNotes: JSON.stringify(examData),
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt,
    };

    const autorefOd = examData.autorefraction?.od ?? examData["autoref-od"];
    const autorefOs = examData.autorefraction?.os ?? examData["autoref-os"];
    if (autorefOd) {
      payload.sphereOD = autorefOd.s;
      payload.cylinderOD = autorefOd.c;
      payload.axisOD = autorefOd.axis;
      payload.ucvaOD = autorefOd.ucva;
      payload.bcvaOD = autorefOd.bcva;
      payload.iopOD = autorefOd.iop ?? autorefOd.airPuff1;
    }
    if (autorefOs) {
      payload.sphereOS = autorefOs.s;
      payload.cylinderOS = autorefOs.c;
      payload.axisOS = autorefOs.axis;
      payload.ucvaOS = autorefOs.ucva;
      payload.bcvaOS = autorefOs.bcva;
      payload.iopOS = autorefOs.iop ?? autorefOs.airPuff1;
    }

    const glassesPayload = examData.glasses;
    if (glassesPayload && (glassesPayload.od || glassesPayload.os)) {
      payload.glassesData = JSON.stringify(glassesPayload);
    }

    const anteriorSegment = examData.anteriorSegment;
    if (anteriorSegment) {
      payload.anteriorSegmentOD = JSON.stringify(anteriorSegment.od ?? {});
      payload.anteriorSegmentOS = JSON.stringify(anteriorSegment.os ?? {});
    }

    const posteriorSegment = examData.posteriorSegment;
    if (posteriorSegment) {
      payload.posteriorSegmentOD = JSON.stringify(posteriorSegment.od ?? {});
      payload.posteriorSegmentOS = JSON.stringify(posteriorSegment.os ?? {});
    }

    payload.radiologyLabsNotes = JSON.stringify(examData);

    if (entry.createdAt) {
      payload.createdAt = entry.createdAt;
    }
    if (entry.updatedAt) {
      payload.updatedAt = entry.updatedAt;
    }

    await db.insert(examinations).values(payload);
    console.log(`Migrated sheet entry ${entry.id} -> visit ${visitId}`);
  }

  console.log("Sheet entry migration complete.");
}

main()
  .catch((error) => {
    console.error("Migration failed:", error);
    process.exit(1);
  })
  .finally(() => process.exit(0));
