import {
  getAllExaminations,
  getPentacamResultsByVisit,
  createPentacamResult,
} from "../server/db";

/**
 * Migrate pentacam data from examinations.radiologyLabsNotes to pentacamResults table
 * Safe migration that:
 * - Extracts pentacam data from examination.radiologyLabsNotes JSON field
 * - Only creates records that don't already exist
 * - Preserves all existing data
 */
async function migratePentacamData() {
  console.log("Starting pentacam data migration from examinations to pentacamResults...");

  try {
    // Get all examinations
    const exams = await getAllExaminations();
    console.log(`Found ${exams.length} total examinations`);

    let migratedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    let examsWithPentacam = 0;
    let examsWithRealData = 0;

    for (let i = 0; i < exams.length; i++) {
      const exam = exams[i];

      if ((i + 1) % 100 === 0) {
        console.log(`  Processing exam ${i + 1}/${exams.length}...`);
      }

      try {
        // Try to extract pentacam data from radiologyLabsNotes
        let pentacamData: any = null;

        if (exam.radiologyLabsNotes) {
          try {
            const radObj = JSON.parse(exam.radiologyLabsNotes);
            if (radObj?.pentacam) {
              pentacamData = radObj.pentacam;
              examsWithPentacam++;
            }
          } catch (e) {
            // Skip invalid JSON
          }
        }

        // Process if we found pentacam data
        if (pentacamData) {
          try {
            const existingResults = await getPentacamResultsByVisit(exam.visitId);

            if (existingResults.length > 0) {
              // Skip - already has pentacamResult
              skippedCount++;
              continue;
            }

            // Map pentacam JSON fields to createPentacamResult parameters
            const pentacamResult = {
              visitId: exam.visitId,
              patientId: exam.patientId,
              // Right eye (OD) data
              rtK1: pentacamData.od?.k1,
              rtK2: pentacamData.od?.k2,
              rtAX: pentacamData.od?.axis || pentacamData.od?.ax1 || pentacamData.od?.ax2,
              rtThinnestPoint: pentacamData.od?.thinnest,
              rtApex: pentacamData.od?.apex,
              rtResidual: pentacamData.od?.residual || pentacamData.od?.residualStroma,
              rtTTT: pentacamData.od?.ttt,
              rtAblation: pentacamData.od?.ablation,
              // Left eye (OS) data
              ltK1: pentacamData.os?.k1,
              ltK2: pentacamData.os?.k2,
              ltAX: pentacamData.os?.axis || pentacamData.os?.ax1 || pentacamData.os?.ax2,
              ltThinnestPoint: pentacamData.os?.thinnest,
              ltApex: pentacamData.os?.apex,
              ltResidual: pentacamData.os?.residual || pentacamData.os?.residualStroma,
              ltTTT: pentacamData.os?.ttt,
              ltAblation: pentacamData.os?.ablation,
            };

            // Only save if there's at least some real data (not empty or single "1" placeholder)
            const pentacamFields = [
              pentacamResult.rtK1, pentacamResult.rtK2, pentacamResult.rtAX,
              pentacamResult.rtThinnestPoint, pentacamResult.rtApex, pentacamResult.rtResidual,
              pentacamResult.rtTTT, pentacamResult.rtAblation,
              pentacamResult.ltK1, pentacamResult.ltK2, pentacamResult.ltAX,
              pentacamResult.ltThinnestPoint, pentacamResult.ltApex, pentacamResult.ltResidual,
              pentacamResult.ltTTT, pentacamResult.ltAblation,
            ];
            const hasAnyData = pentacamFields.some(v => v && v !== "" && v !== "1");

            if (hasAnyData) {
              examsWithRealData++;
              // Create new result
              await createPentacamResult(pentacamResult);
              migratedCount++;
              console.log(`    ✓ Created pentacam data for exam ${exam.id} (visit ${exam.visitId}): k1OD="${pentacamResult.rtK1}" k1OS="${pentacamResult.ltK1}"`);
            } else {
              // Data was all empty/placeholder values
              skippedCount++;
            }
          } catch (examError) {
            errorCount++;
            console.error(`    ✗ Error migrating exam ${exam.id}:`, examError);
          }
        }
      } catch (error) {
        errorCount++;
        console.error(`✗ Error processing exam ${exam.id}:`, error);
      }
    }

    console.log("\n=== Migration Summary ===");
    console.log(`Total examinations: ${exams.length}`);
    console.log(`Exams with pentacam field: ${examsWithPentacam}`);
    console.log(`Exams with real pentacam data: ${examsWithRealData}`);
    console.log(`Total migrated: ${migratedCount}`);
    console.log(`Skipped (empty/existing): ${skippedCount}`);
    console.log(`Errors: ${errorCount}`);
    console.log("✓ Migration complete!");
    process.exit(0);

  } catch (error) {
    console.error("Fatal error during migration:", error);
    process.exit(1);
  }
}

migratePentacamData();
