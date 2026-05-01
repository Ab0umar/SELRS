import {
  getAllPatients,
  getSheetEntry,
  getExaminationsByPatient,
  updateExamination,
} from "../server/db";

/**
 * Migrate existing refraction data from sheets to ALL examinations
 * Safe migration that:
 * - Copies sheet data to ALL exams for each patient that don't have data
 * - Only copies data that doesn't already exist in examinations
 * - Preserves existing exam IDs and sequences
 */
async function migrateRefractionData() {
  console.log("Starting refraction data migration from sheets to all examinations...");

  try {
    // Get all patients with pagination
    let allPatients: any[] = [];
    let cursor: any = undefined;

    while (true) {
      const result = await getAllPatients({ limit: 500, cursor });
      allPatients = allPatients.concat(result.rows);
      if (!result.hasMore) break;
      cursor = result.nextCursor;
    }

    console.log(`Found ${allPatients.length} patients`);

    let migratedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const patient of allPatients) {
      try {
        // Get sheet data for this patient (from all sheet types)
        const sheetTypes = ["consultant", "specialist", "lasik", "external"];
        let refractionsToMigrate: any = null;

        for (const sheetType of sheetTypes) {
          const sheetContent = await getSheetEntry(patient.id, sheetType);

          if (sheetContent) {
            try {
              const sheetObj = JSON.parse(sheetContent);
              const examData = sheetObj?.examData;
              if (examData?.glasses || examData?.pentacam || examData?.autorefraction) {
                refractionsToMigrate = examData;
                console.log(`  Found refraction data in ${sheetType} sheet for patient ${patient.id}`);
                break; // Use first sheet with data
              }
            } catch (e) {
              // Skip invalid JSON
            }
          }
        }

        if (!refractionsToMigrate) {
          skippedCount++;
          continue;
        }

        // Get ALL examinations for this patient
        const exams = await getExaminationsByPatient(patient.id);

        if (exams.length === 0) {
          console.log(`  No examinations found for patient ${patient.id}, skipping`);
          skippedCount++;
          continue;
        }

        console.log(`  Found ${exams.length} examinations for patient ${patient.id}`);

        // Migrate to ALL exams that don't have refraction data
        let migratedForPatient = 0;
        for (const exam of exams) {
          try {
            // Skip if exam already has refraction data
            if (exam.glassesData || exam.pentacam || exam.sphereOD || exam.sphereOS) {
              console.log(`    Exam ${exam.id} already has refraction data, skipping`);
              continue;
            }

            // Copy glasses data
            const updateData: any = {};

            if (refractionsToMigrate.glasses) {
              updateData.glassesData = JSON.stringify(refractionsToMigrate.glasses);
            }

            if (refractionsToMigrate.pentacam) {
              updateData.pentacam = JSON.stringify(refractionsToMigrate.pentacam);
            }

            if (refractionsToMigrate.autorefraction?.od) {
              updateData.sphereOD = refractionsToMigrate.autorefraction.od.s;
              updateData.cylinderOD = refractionsToMigrate.autorefraction.od.c;
              updateData.axisOD = refractionsToMigrate.autorefraction.od.axis;
              updateData.ucvaOD = refractionsToMigrate.autorefraction.od.ucva;
              updateData.bcvaOD = refractionsToMigrate.autorefraction.od.bcva;
              updateData.iopOD = refractionsToMigrate.autorefraction.od.iop;
            }

            if (refractionsToMigrate.autorefraction?.os) {
              updateData.sphereOS = refractionsToMigrate.autorefraction.os.s;
              updateData.cylinderOS = refractionsToMigrate.autorefraction.os.c;
              updateData.axisOS = refractionsToMigrate.autorefraction.os.axis;
              updateData.ucvaOS = refractionsToMigrate.autorefraction.os.ucva;
              updateData.bcvaOS = refractionsToMigrate.autorefraction.os.bcva;
              updateData.iopOS = refractionsToMigrate.autorefraction.os.iop;
            }

            if (Object.keys(updateData).length > 0) {
              await updateExamination(exam.id, updateData);
              migratedForPatient++;
              console.log(`    ✓ Migrated refraction data to exam ${exam.id}`);
            }
          } catch (examError) {
            errorCount++;
            console.error(`    ✗ Error migrating exam ${exam.id}:`, examError);
          }
        }

        if (migratedForPatient > 0) {
          migratedCount += migratedForPatient;
          console.log(`  Total migrated for patient: ${migratedForPatient}`);
        }
      } catch (error) {
        errorCount++;
        console.error(`✗ Error migrating patient ${patient.id}:`, error);
      }
    }

    console.log("\n=== Migration Summary ===");
    console.log(`Total migrated: ${migratedCount}`);
    console.log(`Skipped: ${skippedCount}`);
    console.log(`Errors: ${errorCount}`);
    console.log("Migration complete!");
    process.exit(0);

  } catch (error) {
    console.error("Fatal error during migration:", error);
    process.exit(1);
  }
}

migrateRefractionData();
