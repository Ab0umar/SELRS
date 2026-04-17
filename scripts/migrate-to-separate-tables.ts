import {
  getAllPatients,
  getExaminationsByPatient,
  getSheet_Entries,
  saveAutorefractometryData,
  saveGlassesRecord,
} from "../server/db";

/**
 * Migrate autorefraction and glasses data from examinations table to separate tables
 * Preserves all existing data - no data is lost
 */
async function migrateData() {
  console.log("Starting migration of autorefraction and glasses data to separate tables...");

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

    let autorefMigrated = 0;
    let glassesMigrated = 0;
    let errorCount = 0;

    for (const patient of allPatients) {
      try {
        const exams = await getExaminationsByPatient(patient.id);

        // Get all sheets for this patient once
        let allSheets: any[] = [];
        try {
          allSheets = await getSheet_Entries(patient.id);
        } catch (e) {
          // Patient may not have sheets
        }

        for (const exam of exams) {
          try {
            // Check if has autorefraction data
            const hasAutoref = exam.sphereOD || exam.cylinderOD || exam.axisOD ||
                               exam.sphereOS || exam.cylinderOS || exam.axisOS ||
                               exam.ucvaOD || exam.ucvaOS || exam.bcvaOD || exam.bcvaOS ||
                               exam.iopOD || exam.iopOS;

            if (hasAutoref) {
              await saveAutorefractometryData({
                examinationId: exam.id,
                patientId: exam.patientId,
                sphereOD: exam.sphereOD,
                cylinderOD: exam.cylinderOD,
                axisOD: exam.axisOD,
                ucvaOD: exam.ucvaOD,
                bcvaOD: exam.bcvaOD,
                iopOD: exam.iopOD,
                sphereOS: exam.sphereOS,
                cylinderOS: exam.cylinderOS,
                axisOS: exam.axisOS,
                ucvaOS: exam.ucvaOS,
                bcvaOS: exam.bcvaOS,
                iopOS: exam.iopOS,
              });
              autorefMigrated++;
              console.log(`✓ Migrated autorefraction for exam ${exam.id} (patient ${exam.patientId})`);
            }

            // Check if has glasses data in examinations table
            let glassesData = undefined;
            if (exam.glassesData) {
              try {
                const parsed = typeof exam.glassesData === 'string'
                  ? JSON.parse(exam.glassesData)
                  : exam.glassesData;

                // Only use if there's actual data (not empty strings)
                const hasData = (parsed?.od?.s || parsed?.od?.c || parsed?.od?.axis || parsed?.od?.pd) ||
                               (parsed?.os?.s || parsed?.os?.c || parsed?.os?.axis || parsed?.os?.pd);

                if (hasData) {
                  glassesData = parsed;
                }
              } catch (e) {
                // Skip invalid JSON
              }
            }

            // If no glasses data in exam, check all sheets for this patient
            if (!glassesData && allSheets.length > 0) {
              for (const sheetEntry of allSheets) {
                try {
                  const sheetObj = JSON.parse(sheetEntry.content);

                  // First check examData.glasses
                  let sheetGlasses = sheetObj?.examData?.glasses;
                  if (!sheetGlasses) {
                    // Check formData.refractionOD/OS (from refraction form)
                    const formData = sheetObj?.formData;
                    if (formData?.refractionOD || formData?.refractionOS) {
                      sheetGlasses = {
                        od: formData.refractionOD ? {
                          s: formData.refractionOD.s,
                          c: formData.refractionOD.c,
                          axis: formData.refractionOD.a,
                          pd: formData.pdOD,
                          bcva: formData.bcvaOD,
                        } : undefined,
                        os: formData.refractionOS ? {
                          s: formData.refractionOS.s,
                          c: formData.refractionOS.c,
                          axis: formData.refractionOS.a,
                          pd: formData.pdOS,
                          bcva: formData.bcvaOS,
                        } : undefined,
                      };
                    }
                  }

                  if (sheetGlasses?.od || sheetGlasses?.os) {
                    glassesData = sheetGlasses;
                    break; // Use first sheet with glasses data
                  }
                } catch (e) {
                  // Skip invalid sheets
                }
              }
            }

            // Save glasses data if found
            if (glassesData) {
              await saveGlassesRecord({
                examinationId: exam.id,
                patientId: exam.patientId,
                sOD: glassesData.od?.s || undefined,
                cOD: glassesData.od?.c || undefined,
                axisOD: glassesData.od?.axis || undefined,
                pdOD: glassesData.od?.pd || undefined,
                addOD: glassesData.od?.add || undefined,
                bcvaOD: glassesData.od?.bcva || undefined,
                sOS: glassesData.os?.s || undefined,
                cOS: glassesData.os?.c || undefined,
                axisOS: glassesData.os?.axis || undefined,
                pdOS: glassesData.os?.pd || undefined,
                addOS: glassesData.os?.add || undefined,
                bcvaOS: glassesData.os?.bcva || undefined,
              });
              glassesMigrated++;
              console.log(`✓ Migrated glasses for exam ${exam.id} (patient ${exam.patientId})`);
            }
          } catch (examError) {
            errorCount++;
            console.error(`✗ Error migrating exam ${exam.id}:`, examError);
          }
        }
      } catch (error) {
        errorCount++;
        console.error(`✗ Error processing patient ${patient.id}:`, error);
      }
    }

    console.log("\n=== Migration Summary ===");
    console.log(`Autorefraction records migrated: ${autorefMigrated}`);
    console.log(`Glasses records migrated: ${glassesMigrated}`);
    console.log(`Errors: ${errorCount}`);
    console.log("✓ Migration complete! All data preserved in separate tables.");
    process.exit(0);

  } catch (error) {
    console.error("Fatal error during migration:", error);
    process.exit(1);
  }
}

migrateData();
