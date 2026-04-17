/**
 * Sync doctors and services from systemSettings to database tables with correct location types
 * Fixes mismatches where external doctors have center services and vice versa
 */
import { config } from "dotenv";
import { eq, sql } from "drizzle-orm";
import { getDb, getSystemSetting, updateSystemSettings } from "../db";

// Load environment variables
config();

interface DoctorEntry {
  id: string;
  code: string;
  name: string;
  isActive?: boolean;
  locationType?: string;
  doctorType?: string;
}

interface ServiceEntry {
  id: string;
  code: string;
  name: string;
  category?: string;
  serviceType: string;
  srvTyp?: string; // "1" = center, "2" = external
  defaultSheet?: string;
  isActive?: boolean;
}

async function syncDoctorsAndServices() {
  try {
    const db = await getDb();
    if (!db) {
      throw new Error("Database connection failed");
    }

    // Lazy load schema tables only at runtime, not during build
    const { doctors, services } = await import("../../drizzle/schema");

    console.log("[SyncScript] Starting doctor and service location sync...\n");

    // 1. Get doctors from systemSettings
    console.log("[SyncScript] Reading doctors from systemSettings...");
    let systemDoctors: DoctorEntry[] = [];
    try {
      const row = await getSystemSetting("doctor_directory");
      if (row?.value) {
        systemDoctors = JSON.parse(row.value);
        console.log(`[SyncScript] Found ${systemDoctors.length} doctors in systemSettings`);
      }
    } catch (err) {
      console.warn("[SyncScript] Could not read doctor_directory from systemSettings", err);
    }

    // 2. Get services from systemSettings
    console.log("[SyncScript] Reading services from systemSettings...");
    let systemServices: ServiceEntry[] = [];
    try {
      const row = await getSystemSetting("service_directory");
      if (row?.value) {
        systemServices = JSON.parse(row.value);
        console.log(`[SyncScript] Found ${systemServices.length} services in systemSettings`);
      }
    } catch (err) {
      console.warn("[SyncScript] Could not read service_directory from systemSettings", err);
    }

    // 3. Sync doctors to table
    console.log("\n[SyncScript] Syncing doctors to database...");
    let doctorSyncCount = 0;
    for (const doc of systemDoctors) {
      const locationType = doc.locationType || "center";

      try {
        const existing = await db.select().from(doctors).where(eq(doctors.code, doc.code)).limit(1);

        if (existing.length > 0) {
          // Update existing
          await db.update(doctors)
            .set({
              code: doc.code,
              name: doc.name,
              isActive: doc.isActive !== false,
              locationType: locationType,
              doctorType: doc.doctorType || "consultant",
              updatedAt: new Date(),
            })
            .where(eq(doctors.code, doc.code));
          console.log(`[SyncScript] Updated doctor: ${doc.code} (${doc.name}) - locationType: ${locationType}`);
        } else {
          // Insert new
          await db.insert(doctors).values({
            id: doc.id,
            code: doc.code,
            name: doc.name,
            isActive: doc.isActive !== false,
            locationType: locationType,
            doctorType: doc.doctorType || "consultant",
          });
          console.log(`[SyncScript] Inserted doctor: ${doc.code} (${doc.name}) - locationType: ${locationType}`);
        }
        doctorSyncCount++;
      } catch (err) {
        console.error(`[SyncScript] Error syncing doctor ${doc.code}:`, err);
      }
    }
    console.log(`[SyncScript] ✓ Synced ${doctorSyncCount} doctors\n`);

    // 4. Sync services to table
    console.log("[SyncScript] Syncing services to database...");
    let serviceSyncCount = 0;
    for (const svc of systemServices) {
      // Map srvTyp to locationType: "1" = center, "2" = external
      let locationType = "center";
      if (svc.srvTyp === "2") locationType = "external";
      else if (svc.locationType) locationType = svc.locationType;

      try {
        const existing = await db.select().from(services).where(eq(services.code, svc.code)).limit(1);

        if (existing.length > 0) {
          // Update existing
          await db.update(services)
            .set({
              code: svc.code,
              name: svc.name,
              category: svc.category,
              serviceType: svc.serviceType,
              defaultSheet: svc.defaultSheet,
              srvTyp: svc.srvTyp,
              locationType: locationType,
              isActive: svc.isActive !== false,
              updatedAt: new Date(),
            })
            .where(eq(services.code, svc.code));
          console.log(`[SyncScript] Updated service: ${svc.code} (${svc.name}) - locationType: ${locationType}`);
        } else {
          // Insert new
          await db.insert(services).values({
            id: svc.id,
            code: svc.code,
            name: svc.name,
            category: svc.category,
            serviceType: svc.serviceType,
            defaultSheet: svc.defaultSheet,
            srvTyp: svc.srvTyp,
            locationType: locationType,
            isActive: svc.isActive !== false,
          });
          console.log(`[SyncScript] Inserted service: ${svc.code} (${svc.name}) - locationType: ${locationType}`);
        }
        serviceSyncCount++;
      } catch (err) {
        console.error(`[SyncScript] Error syncing service ${svc.code}:`, err);
      }
    }
    console.log(`[SyncScript] ✓ Synced ${serviceSyncCount} services\n`);

    // 5. Identify mismatches
    console.log("[SyncScript] Checking for location mismatches...");
    const allDoctors = await db.select().from(doctors).where(eq(doctors.isActive, true));
    const allServices = await db.select().from(services).where(eq(services.isActive, true));

    const centerDoctors = allDoctors.filter((d) => d.locationType === "center");
    const externalDoctors = allDoctors.filter((d) => d.locationType === "external");
    const centerServices = allServices.filter((s) => s.locationType === "center");
    const externalServices = allServices.filter((s) => s.locationType === "external");

    console.log(`[SyncScript] Summary:`);
    console.log(`  - Center doctors: ${centerDoctors.length}`);
    console.log(`  - External doctors: ${externalDoctors.length}`);
    console.log(`  - Center services: ${centerServices.length}`);
    console.log(`  - External services: ${externalServices.length}`);

    console.log("\n[SyncScript] ✓ Sync complete!");
    console.log("\nNext steps:");
    console.log("1. Database migration required to add locationType column to services table");
    console.log("2. Run this script after migration is applied");
    console.log("3. Verify UI pages are querying from doctors/services tables with location filters");

  } catch (err) {
    console.error("[SyncScript] Fatal error:", err);
    process.exit(1);
  }
}

// Run if executed directly
syncDoctorsAndServices().then(() => process.exit(0)).catch(() => process.exit(1));

export { syncDoctorsAndServices };
