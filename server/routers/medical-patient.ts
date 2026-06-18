import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { eq, and, sql as drizzleSql } from "drizzle-orm";
import {
  protectedProcedure,
  adminProcedure,
  receptionProcedure,
  technicianProcedure,
} from "../_core/procedures";
import {
  getAppNotificationSettings,
  pushAppNotification,
  DEFAULT_APP_NOTIFICATION_SETTINGS,
} from "../_core/appNotifications";
import * as db from "../db";
import { upsertPatientToMssql } from "../integrations/mssqlPatients";
import { isExternalServiceType } from "../../shared/serviceType";
import {
  patientServiceEntries,
  visits,
  externalDoctors,
  externalDoctorReferrals,
} from "../../drizzle/schema";
import { broadcastToDoctorPortal } from "../_core/ws";
import {
  resolvePatientNotifTitle,
  resolveNotificationTargetRolesByUserRole,
  findExistingPatientByNameOrPhone,
  resolveServiceCodeForType,
  pushNewPatientToMssql,
  registrationPricingPayload,
  canPushToMssql,
  readDoctorNameFromStateData,
  resolveDoctorCodeById,
  resolveDoctorCodeByName,
} from "./_medical/patient-helpers";

async function autoLinkAndNotifyDoctors(
  patientCode: string,
  patientName: string,
  doctorCode: string,
): Promise<void> {
  try {
    const drizzleDb = await db.getDb();
    if (!drizzleDb) return;

    const doctors = await drizzleDb
      .select({ id: externalDoctors.id })
      .from(externalDoctors)
      .where(
        and(
          eq(externalDoctors.doctorCode, doctorCode),
          eq(externalDoctors.isActive, true),
        ),
      );

    if (doctors.length === 0) return;

    for (const doctor of doctors) {
      // Upsert referral — ignore if already exists
      await drizzleDb.execute(
        drizzleSql`INSERT IGNORE INTO external_doctor_referrals
          (external_doctor_id, patient_code, is_active)
          VALUES (${doctor.id}, ${patientCode}, 1)`,
      );

      broadcastToDoctorPortal(doctor.id, {
        type: "new-patient",
        patientCode,
        patientName,
        at: Date.now(),
      });
    }
  } catch (err) {
    console.warn("[doctor-autolink] Failed:", String((err as any)?.message ?? err));
  }
}

function resolveInsertId(result: unknown): number {
  const anyResult = result as
    | { insertId?: number; id?: number; 0?: { insertId?: number; id?: number } }
    | null
    | undefined;
  const insertId = Number(
    anyResult?.insertId ?? anyResult?.[0]?.insertId ?? anyResult?.id ?? 0,
  );
  return Number.isFinite(insertId) && insertId > 0 ? insertId : 0;
}

export const medicalPatientRoutes = {
  createPatient: protectedProcedure
    .input(
      z.object({
        patientCode: z.string().optional(),
        fullName: z.string(),
        dateOfBirth: z.string().optional(),
        age: z.number().optional(),
        gender: z.enum(["male", "female"]).optional(),
        nationalId: z.string().optional(),
        phone: z.string(),
        alternatePhone: z.string().optional(),
        address: z.string().optional(),
        occupation: z.string().optional(),
        referralSource: z.string().optional(),
        branch: z.enum(["examinations", "surgery"]).optional(),
        serviceType: z
          .enum(["consultant", "specialist", "lasik", "surgery", "external"])
          .optional(),
        locationType: z.enum(["center", "external"]).optional(),
        doctorId: z.number().optional(),
        doctorCode: z.string().optional(),
        doctorName: z.string().optional(),
        serviceCode: z.string().optional(),
        servicePrice: z.number().nonnegative().optional(),
        discountValue: z.number().nonnegative().optional(),
        lastVisit: z.string().optional(),
        skipIfExists: z.boolean().optional(),
      }),
    )
    .mutation(async (opts) => {
      const { input, ctx } = opts;
      console.log(`[createPatient] ===== START =====`);
      console.log(
        `[createPatient] Input received: doctorId=${input.doctorId}, doctorCode=${input.doctorCode}, serviceType=${input.serviceType}`,
      );

      // Check permission for creating/editing patient data
      const permissions = await db.getEffectiveUserPermissions(
        ctx.user.id,
        ctx.user.role,
      );
      const canCreatePatient =
        permissions.includes("/patient-data/edit") ||
        permissions.includes("/quick-entry") ||
        permissions.includes("/new-cases");
      if (!canCreatePatient) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message:
            "You do not have permission to create patient records. Contact admin to enable /patient-data/edit or patient intake permissions.",
        });
      }
      try {
        const { skipIfExists, ...patientInput } = input;
        const hasExplicitPatientCode = Boolean(
          String(patientInput.patientCode ?? "").trim(),
        );
        const existingByIdentity = hasExplicitPatientCode
          ? await db.getPatientByCode(String(patientInput.patientCode ?? "").trim())
          : await findExistingPatientByNameOrPhone(
              patientInput.fullName,
              patientInput.phone,
            );
        if (existingByIdentity) {
          const existingId = Number((existingByIdentity as any)?.id ?? 0);
          const existingCode = String(
            (existingByIdentity as any)?.patientCode ?? "",
          ).trim();
          let pushResult: {
            inserted: boolean;
            note?: string;
            trNo?: number | null;
          } | null = null;
          let mssqlPushError: string | null = null;
          if (existingId > 0) {
            await db
              .updatePatient(existingId, {
                lastVisit: patientInput.lastVisit
                  ? new Date(patientInput.lastVisit)
                  : new Date(),
                ...(patientInput.serviceType
                  ? { serviceType: patientInput.serviceType }
                  : {}),
                ...(patientInput.locationType
                  ? { locationType: patientInput.locationType }
                  : {}),
                ...(patientInput.doctorId
                  ? { doctorId: patientInput.doctorId }
                  : {}),
              })
              .catch(() => null);
          }
          if (!existingCode) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Existing patient has no patientCode",
            });
          }
          // Prefer explicit doctorCode, then doctorId, then doctorName.
          let doctorCode = String(patientInput.doctorCode ?? "").trim() || null;
          if (!doctorCode) {
            doctorCode =
              (await resolveDoctorCodeById(
                patientInput.doctorId ?? (existingByIdentity as any)?.doctorId,
              )) ?? null;
          }
          if (!doctorCode) {
            doctorCode =
              (await resolveDoctorCodeByName(
                patientInput.doctorName ?? null,
              )) ?? null;
          }
          const pricingPayload = registrationPricingPayload({
            servicePrice: patientInput.servicePrice,
            discountValue: patientInput.discountValue,
          });
          pushResult = await pushNewPatientToMssql({
            patientCode: existingCode,
            fullName: String(
              (existingByIdentity as any)?.fullName ??
                patientInput.fullName ??
                "",
            ).trim(),
            phone:
              String(
                (existingByIdentity as any)?.phone ?? patientInput.phone ?? "",
              ).trim() || null,
            address:
              String(
                (existingByIdentity as any)?.address ??
                  patientInput.address ??
                  "",
              ).trim() || null,
            age: Number.isFinite(Number((existingByIdentity as any)?.age))
              ? Number((existingByIdentity as any)?.age)
              : Number.isFinite(Number(patientInput.age))
                ? Number(patientInput.age)
                : null,
            gender:
              String((existingByIdentity as any)?.gender ?? "").trim() || null,
            dateOfBirth:
              (existingByIdentity as any)?.dateOfBirth ??
              patientInput.dateOfBirth ??
              null,
            branch:
              String(
                (existingByIdentity as any)?.branch ??
                  patientInput.branch ??
                  "examinations",
              ).trim() || "examinations",
            serviceType:
              patientInput.serviceType ??
              (existingByIdentity as any)?.serviceType ??
              null,
            locationType:
              (patientInput.serviceType === "external"
                ? "external"
                : patientInput.locationType) ??
              (String(
                (existingByIdentity as any)?.locationType ?? "",
              ).trim() === "external"
                ? "external"
                : "center"),
            doctorCode: doctorCode || null,
            enteredBy:
              String(
                (ctx.user as any)?.name ?? (ctx.user as any)?.username ?? "",
              ).trim() || null,
            serviceCode: patientInput.serviceCode || null,
            servicePrice: pricingPayload.servicePrice,
            discountValue: pricingPayload.discountValue,
            paValue: pricingPayload.paValue,
          }).catch((error) => {
            mssqlPushError = String(
              (error as any)?.message ?? error ?? "unknown",
            );
            console.warn("[mssql-push] createPatient(existing) failed", {
              patientCode: existingCode,
              message: mssqlPushError,
            });
            return null;
          });
          if (!pushResult?.inserted && pushResult?.note) {
            mssqlPushError = pushResult.note;
          }
          await db.logAuditEvent(
            ctx.user.id,
            "CREATE_PATIENT_RECEIPT_EXISTING",
            "patient",
            existingId,
            {
              message: `Created new receipt for existing patient (name/phone match): ${String((existingByIdentity as any)?.fullName ?? "")}`,
              patientCode: existingCode,
              mssqlPushError,
            },
          );
          const notificationSettings = await getAppNotificationSettings().catch(
            () => DEFAULT_APP_NOTIFICATION_SETTINGS,
          );
          if (notificationSettings.patients.enabled) {
            const notifTitle = resolvePatientNotifTitle(
              [patientInput.serviceCode].filter(Boolean) as string[],
            );
            const existingFullName = String(
              (existingByIdentity as any)?.fullName ??
                patientInput.fullName ??
                "",
            ).trim();
            await pushAppNotification({
              title: notifTitle,
              message:
                existingFullName || String(patientInput.fullName ?? "").trim(),
              kind: "success",
              source: "manual_patient_create",
              entityType: "patient",
              entityId: existingId || null,
              meta: {
                patientCode: existingCode,
                fullName: existingFullName || patientInput.fullName,
                reused: true,
                receiptNo: pushResult?.trNo ?? null,
                createdBy:
                  String(
                    (ctx.user as any)?.name ??
                      (ctx.user as any)?.username ??
                      "",
                  ).trim() || null,
              },
              channels: {
                inApp: notificationSettings.patients.inApp,
                push: notificationSettings.patients.push,
                local: notificationSettings.patients.local,
              },
            }).catch((error) => {
              console.warn(
                "[patient-create-existing] Failed to append app notification:",
                error,
              );
            });
          }
          // Auto-link to external doctor portal and notify
          if (existingCode && doctorCode) {
            const existingName = String(
              (existingByIdentity as any)?.fullName ?? patientInput.fullName ?? "",
            ).trim();
            void autoLinkAndNotifyDoctors(existingCode, existingName, doctorCode);
          }

          // Create today's visit if the patient isn't already checked in today
          if (existingId > 0) {
            const hasTodayVisit = await db
              .hasVisitForDate(
                existingId,
                new Date().toISOString().split("T")[0],
              )
              .catch(() => false);
            if (!hasTodayVisit) {
              await db
                .createVisit({
                  patientId: existingId,
                  visitDate: new Date(),
                  visitType: "consultation",
                  branch: String(
                    (existingByIdentity as any)?.branch ??
                      patientInput.branch ??
                      "examinations",
                  ),
                  queueStatus: "checkedIn",
                  checkedInAt: new Date(),
                })
                .catch(() => null);
            }
          }
          return {
            success: true,
            reused: true,
            patientId: existingId,
            patientCode: existingCode,
            receiptNo: pushResult?.trNo ?? null,
            mssqlLinked: Boolean(pushResult?.inserted),
            ...(mssqlPushError ? { mssqlWarning: mssqlPushError } : {}),
          };
        }
        const code =
          patientInput.patientCode && patientInput.patientCode.trim()
            ? patientInput.patientCode.trim()
            : await db.getNextPatientCode();
        const existing = await db.getPatientByCode(code);
        if (existing) {
          if (skipIfExists) {
            return {
              success: true,
              skipped: true,
              patientId: existing.id ?? 0,
              patientCode: code,
            };
          }
          throw new TRPCError({
            code: "CONFLICT",
            message: "Patient code already exists",
          });
        }
        console.log(
          `[createPatient] Saving patient with doctorId=${patientInput.doctorId}`,
        );
        await db.createPatient({
          ...patientInput,
          patientCode: code,
          branch: patientInput.branch || "examinations",
          serviceType: patientInput.serviceType || "consultant",
          locationType:
            patientInput.serviceType === "external"
              ? "external"
              : patientInput.locationType || "center",
          doctorId: patientInput.doctorId ?? null,
          // Opening date is the reference date for patient timeline/stats.
          lastVisit: patientInput.lastVisit
            ? new Date(patientInput.lastVisit)
            : new Date(),
          status: "new",
        });

        const created = await db.getPatientByCode(code);
        console.log(
          `[createPatient] Retrieved patient: doctorId=${(created as any).doctorId}`,
        );
        // Create today's visit so the patient appears in the queue immediately
        const newPatientId = Number((created as any)?.id ?? 0);
        if (newPatientId > 0) {
          await db
            .createVisit({
              patientId: newPatientId,
              visitDate: new Date(),
              visitType: "consultation",
              branch: ((created as any).branch as string) || "examinations",
              queueStatus: "checkedIn",
              checkedInAt: new Date(),
            })
            .catch(() => null);
        }
        let pushResult: {
          inserted: boolean;
          note?: string;
          trNo?: number | null;
        } | null = null;
        let mssqlPushError: string | null = null;
        if (created?.patientCode && created?.fullName) {
          // Prefer explicit doctorCode, then doctorId, then doctorName.
          let doctorCode = String(patientInput.doctorCode ?? "").trim() || null;
          if (!doctorCode) {
            doctorCode =
              (await resolveDoctorCodeById((created as any).doctorId)) ?? null;
          }
          if (!doctorCode) {
            doctorCode =
              (await resolveDoctorCodeByName(
                patientInput.doctorName ?? null,
              )) ?? null;
          }
          console.log(`[createPatient] Resolved doctorCode=${doctorCode}`);
          const pricingPayload = registrationPricingPayload({
            servicePrice: patientInput.servicePrice,
            discountValue: patientInput.discountValue,
          });
          console.log("[createPatient] Attempting MSSQL push for new patient", {
            patientCode: String(created.patientCode),
          });
          pushResult = await pushNewPatientToMssql({
            patientCode: String(created.patientCode),
            fullName: String(created.fullName),
            phone: created.phone,
            address: created.address,
            age: created.age,
            gender: (created as any).gender ?? null,
            dateOfBirth: (created as any).dateOfBirth ?? null,
            branch: (created as any).branch ?? "examinations",
            serviceType: (created as any).serviceType ?? null,
            locationType: (created as any).locationType ?? "center",
            doctorCode: doctorCode || null,
            enteredBy:
              String(
                (ctx.user as any)?.name ?? (ctx.user as any)?.username ?? "",
              ).trim() || null,
            serviceCode: patientInput.serviceCode || null,
            servicePrice: pricingPayload.servicePrice,
            discountValue: pricingPayload.discountValue,
            paValue: pricingPayload.paValue,
          }).catch((error) => {
            mssqlPushError = String(
              (error as any)?.message ?? error ?? "unknown",
            );
            console.warn("[mssql-push] createPatient failed", {
              patientCode: String(created.patientCode),
              message: mssqlPushError,
            });
            return null;
          });
        }
        await db.logAuditEvent(
          ctx.user.id,
          "CREATE_PATIENT",
          "patient",
          created?.id ?? 0,
          {
            message: `Created patient: ${input.fullName}`,
          },
        );
        const notificationSettings = await getAppNotificationSettings().catch(
          () => DEFAULT_APP_NOTIFICATION_SETTINGS,
        );
        if (notificationSettings.patients.enabled) {
          const targetRoles = resolveNotificationTargetRolesByUserRole(
            (ctx.user as any)?.role,
          );
          const notifTitle = resolvePatientNotifTitle(
            [input.serviceCode].filter(Boolean) as string[],
          );
          await pushAppNotification({
            title: notifTitle,
            message: String(input.fullName ?? "").trim(),
            kind: "success",
            targetRoles,
            source: "manual_patient_create",
            entityType: "patient",
            entityId: Number(created?.id ?? 0) || null,
            meta: {
              patientCode: code,
              fullName: input.fullName,
              createdBy:
                String(
                  (ctx.user as any)?.name ?? (ctx.user as any)?.username ?? "",
                ).trim() || null,
            },
            channels: {
              inApp: notificationSettings.patients.inApp,
              push: notificationSettings.patients.push,
              local: notificationSettings.patients.local,
            },
          }).catch((error) => {
            console.warn(
              "[patient-create] Failed to append app notification:",
              error,
            );
          });
        }

        const mssqlLinked = Boolean(pushResult?.inserted);
        if (!mssqlLinked && (mssqlPushError || pushResult?.note)) {
          await db.logAuditEvent(
            ctx.user.id,
            "CREATE_PATIENT",
            "patient",
            created?.id ?? 0,
            {
              message: `Created patient: ${input.fullName}`,
              mssqlWarning:
                mssqlPushError || pushResult?.note || "MSSQL sync failed",
            },
          );
        }

        // Auto-link to external doctor portal and notify
        if (created?.patientCode && created?.fullName) {
          let resolvedCode = String(patientInput.doctorCode ?? "").trim() || null;
          if (!resolvedCode) {
            resolvedCode =
              (await resolveDoctorCodeById((created as any).doctorId)) ?? null;
          }
          if (!resolvedCode) {
            resolvedCode =
              (await resolveDoctorCodeByName(patientInput.doctorName ?? null)) ??
              null;
          }
          if (resolvedCode) {
            void autoLinkAndNotifyDoctors(
              String(created.patientCode),
              String(created.fullName),
              resolvedCode,
            );
          }
        }

        return {
          success: true,
          patientId: created?.id ?? 0,
          patientCode: code,
          receiptNo: pushResult?.trNo ?? null,
          mssqlLinked,
          mssqlNote: !mssqlLinked
            ? mssqlPushError || pushResult?.note
            : undefined,
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new Error(`Failed to create patient: ${error}`);
      }
    }),

  stagePatientsImport: adminProcedure
    .input(
      z.object({
        rows: z.array(
          z.object({
            rowNumber: z.number().int().positive(),
            patientCode: z.string().optional(),
            fullName: z.string().optional(),
            dateOfBirth: z.string().optional(),
            gender: z.enum(["male", "female", ""]).optional(),
            phone: z.string().optional(),
            address: z.string().optional(),
            branch: z.enum(["examinations", "surgery", ""]).optional(),
            serviceType: z
              .enum([
                "consultant",
                "specialist",
                "lasik",
                "surgery",
                "external",
                "",
              ])
              .optional(),
            locationType: z.enum(["center", "external", ""]).optional(),
            doctorCode: z.string().optional(),
            doctorName: z.string().optional(),
          }),
        ),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const batchId = `imp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const summary = await db.stagePatientImportRows(batchId, input.rows);
      await db.logAuditEvent(
        ctx.user.id,
        "STAGE_PATIENT_IMPORT",
        "patient_import_staging",
        0,
        {
          batchId,
          total: summary.total,
          valid: summary.valid,
          invalid: summary.invalid,
        },
      );
      return summary;
    }),

  applyPatientsImport: adminProcedure
    .input(z.object({ batchId: z.string().min(1) }))
    .mutation(async ({ input, ctx }) => {
      const result = await db.applyPatientImportBatch(input.batchId);
      await db.logAuditEvent(
        ctx.user.id,
        "APPLY_PATIENT_IMPORT",
        "patient_import_staging",
        0,
        {
          batchId: input.batchId,
          inserted: result.inserted,
          updated: result.updated,
          failed: result.failed,
        },
      );
      if (result.inserted > 0) {
        const notificationSettings = await getAppNotificationSettings().catch(
          () => DEFAULT_APP_NOTIFICATION_SETTINGS,
        );
        if (notificationSettings.patients.enabled) {
          const sheetServiceCode = result.firstInserted
            ? await resolveServiceCodeForType(
                result.firstInserted.serviceType,
              ).catch(() => "")
            : "";
          const sheetTitle = resolvePatientNotifTitle(
            sheetServiceCode ? [sheetServiceCode] : [],
          );
          const sheetMessage = result.firstInserted
            ? result.inserted > 1
              ? `${result.firstInserted.fullName} (و ${result.inserted - 1} آخرين)`
              : result.firstInserted.fullName
            : `${result.inserted} مريض جديد`;
          await pushAppNotification({
            title: sheetTitle,
            message: sheetMessage,
            kind: "success",
            source: "sheet_patient_import",
            entityType: "patient",
            meta: {
              batchId: input.batchId,
              inserted: result.inserted,
              updated: result.updated,
            },
            channels: {
              inApp: notificationSettings.patients.inApp,
              push: notificationSettings.patients.push,
              local: notificationSettings.patients.local,
            },
          }).catch((error) => {
            console.warn(
              "[sheet-import] Failed to append app notification:",
              error,
            );
          });
        }
      }
      return result;
    }),

  getPatientImportErrors: adminProcedure
    .input(z.object({ batchId: z.string().min(1) }))
    .query(async ({ input }) => {
      return await db.getPatientImportErrors(input.batchId);
    }),

  getPatientImportPreview: adminProcedure
    .input(
      z.object({
        batchId: z.string().min(1),
        limit: z.number().int().min(1).max(500).optional(),
      }),
    )
    .query(async ({ input }) => {
      return await db.getPatientImportPreview(
        input.batchId,
        input.limit ?? 100,
      );
    }),

  createPatientFromExamination: protectedProcedure
    .input(
      z.object({
        patientCode: z.string().optional(),
        fullName: z.string(),
        dateOfBirth: z.string().optional(),
        age: z.number().optional(),
        phone: z.string().optional(),
        address: z.string().optional(),
        occupation: z.string().optional(),
        serviceType: z
          .enum(["consultant", "specialist", "lasik", "surgery", "external"])
          .optional(),
        locationType: z.enum(["center", "external"]).default("center"),
        doctorId: z.number().optional(),
        doctorCode: z.string().optional(),
        doctorName: z.string().optional(),
        serviceCode: z.string().optional(),
        servicePrice: z.number().optional(),
        serviceQty: z.number().optional(),
        discountValue: z.number().optional(),
        services: z
          .array(
            z.object({
              code: z.string(),
              qty: z.union([z.string(), z.number()]),
              price: z.number(),
              discount: z.number(),
            }),
          )
          .optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const existingByIdentity = await findExistingPatientByNameOrPhone(
          input.fullName,
          input.phone ?? "",
        );

        // Resolve doctor code
        let doctorCode = String(input.doctorCode ?? "").trim() || null;
        if (!doctorCode) {
          doctorCode =
            (await resolveDoctorCodeById(
              input.doctorId ?? (existingByIdentity as any)?.doctorId,
            )) ?? null;
        }
        if (!doctorCode) {
          doctorCode =
            (await resolveDoctorCodeByName(input.doctorName ?? null)) ?? null;
        }

        const processServices =
          input.services && input.services.length > 0
            ? input.services
            : input.serviceCode
              ? [
                  {
                    code: input.serviceCode,
                    qty: input.serviceQty ?? 1,
                    price: input.servicePrice ?? 0,
                    discount: input.discountValue ?? 0,
                  },
                ]
              : [];

        if (existingByIdentity) {
          const existingId = Number((existingByIdentity as any)?.id ?? 0);
          const existingCode = String(
            (existingByIdentity as any)?.patientCode ?? "",
          ).trim();

          if (existingId > 0) {
            await db
              .updatePatient(existingId, {
                lastVisit: new Date(),
                ...(input.serviceType
                  ? { serviceType: input.serviceType }
                  : {}),
                ...(input.locationType
                  ? { locationType: input.locationType }
                  : {}),
                ...(input.doctorId ? { doctorId: input.doctorId } : {}),
              })
              .catch(() => null);
          }

          if (!existingCode) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Existing patient has no patientCode",
            });
          }

          let firstTrNo: number | null = null;

          // If no services provided, still push existing patient to MSSQL
          if (processServices.length === 0) {
            const pushResult = await pushNewPatientToMssql({
              patientCode: existingCode,
              fullName: String(
                (existingByIdentity as any)?.fullName ?? input.fullName ?? "",
              ).trim(),
              phone:
                String(
                  (existingByIdentity as any)?.phone ?? input.phone ?? "",
                ).trim() || null,
              address:
                String(
                  (existingByIdentity as any)?.address ?? input.address ?? "",
                ).trim() || null,
              age: Number.isFinite(Number((existingByIdentity as any)?.age))
                ? Number((existingByIdentity as any)?.age)
                : Number.isFinite(Number(input.age))
                  ? Number(input.age)
                  : null,
              gender:
                String((existingByIdentity as any)?.gender ?? "").trim() ||
                null,
              dateOfBirth:
                (existingByIdentity as any)?.dateOfBirth ??
                input.dateOfBirth ??
                null,
              branch:
                String(
                  (existingByIdentity as any)?.branch ?? "examinations",
                ).trim() || "examinations",
              serviceType:
                input.serviceType ??
                (existingByIdentity as any)?.serviceType ??
                null,
              locationType:
                (input.serviceType === "external"
                  ? "external"
                  : input.locationType) ??
                (String(
                  (existingByIdentity as any)?.locationType ?? "",
                ).trim() === "external"
                  ? "external"
                  : "center"),
              doctorCode: doctorCode || null,
              enteredBy:
                String(
                  (ctx.user as any)?.name ?? (ctx.user as any)?.username ?? "",
                ).trim() || null,
              serviceCode: null,
            });
            firstTrNo = pushResult?.trNo ?? null;
          }

          // Push all services
          for (let i = 0; i < processServices.length; i++) {
            const srv = processServices[i];
            const pricingPayload = registrationPricingPayload({
              servicePrice: srv.price,
              serviceQty: Number(srv.qty) || 1,
              discountValue: srv.discount,
            });

            const pushResult = await pushNewPatientToMssql({
              patientCode: existingCode,
              fullName: String(
                (existingByIdentity as any)?.fullName ?? input.fullName ?? "",
              ).trim(),
              phone:
                String(
                  (existingByIdentity as any)?.phone ?? input.phone ?? "",
                ).trim() || null,
              address:
                String(
                  (existingByIdentity as any)?.address ?? input.address ?? "",
                ).trim() || null,
              age: Number.isFinite(Number((existingByIdentity as any)?.age))
                ? Number((existingByIdentity as any)?.age)
                : Number.isFinite(Number(input.age))
                  ? Number(input.age)
                  : null,
              gender:
                String((existingByIdentity as any)?.gender ?? "").trim() ||
                null,
              dateOfBirth:
                (existingByIdentity as any)?.dateOfBirth ??
                input.dateOfBirth ??
                null,
              branch:
                String(
                  (existingByIdentity as any)?.branch ?? "examinations",
                ).trim() || "examinations",
              serviceType:
                input.serviceType ??
                (existingByIdentity as any)?.serviceType ??
                null,
              locationType:
                (input.serviceType === "external"
                  ? "external"
                  : input.locationType) ??
                (String(
                  (existingByIdentity as any)?.locationType ?? "",
                ).trim() === "external"
                  ? "external"
                  : "center"),
              doctorCode: doctorCode || null,
              enteredBy:
                String(
                  (ctx.user as any)?.name ?? (ctx.user as any)?.username ?? "",
                ).trim() || null,
              serviceCode: srv.code,
              servicePrice:
                "servicePrice" in pricingPayload
                  ? (pricingPayload.servicePrice ?? null)
                  : null,
              serviceQty:
                "serviceQty" in pricingPayload
                  ? (pricingPayload.serviceQty ?? null)
                  : null,
              discountValue:
                "discountValue" in pricingPayload
                  ? (pricingPayload.discountValue ?? null)
                  : null,
              paValue:
                "paValue" in pricingPayload
                  ? (pricingPayload.paValue ?? null)
                  : null,
            });

            if (i === 0) firstTrNo = pushResult?.trNo ?? null;
          }

          await db.logAuditEvent(
            ctx.user.id,
            "CREATE_PATIENT_RECEIPT_EXISTING_MULTI",
            "patient",
            existingId,
            {
              message: `Created ${processServices.length} receipts for existing patient`,
              patientCode: existingCode,
            },
          );

          return {
            id: existingId,
            patientCode: existingCode,
            fullName: String(
              (existingByIdentity as any)?.fullName ?? input.fullName ?? "",
            ),
            receiptNo: firstTrNo,
          };
        }

        const code =
          input.patientCode && input.patientCode.trim()
            ? input.patientCode.trim()
            : await db.getNextPatientCode();

        const existing = await db.getPatientByCode(code);
        if (existing) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "Patient code already exists",
          });
        }

        await db.createPatient({
          patientCode: code,
          fullName: input.fullName,
          dateOfBirth: input.dateOfBirth || null,
          age: input.age ?? null,
          phone: input.phone || "",
          address: input.address || "",
          occupation: input.occupation || "",
          gender: null,
          branch: "examinations",
          serviceType: input.serviceType || "consultant",
          locationType: input.locationType || "center",
          doctorId: input.doctorId || null,
        });

        const newPatient = await db.getPatientByCode(code);
        if (!newPatient) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to create patient record",
          });
        }

        let firstTrNo: number | null = null;

        // If no services provided, still push patient to MSSQL
        if (processServices.length === 0) {
          const pushResult = await pushNewPatientToMssql({
            patientCode: code,
            fullName: input.fullName,
            phone: input.phone || null,
            address: input.address || null,
            age: input.age ?? null,
            dateOfBirth: input.dateOfBirth || null,
            branch: "examinations",
            serviceType: input.serviceType || "consultant",
            locationType: input.locationType,
            doctorCode: doctorCode || null,
            enteredBy:
              String(
                (ctx.user as any)?.name ?? (ctx.user as any)?.username ?? "",
              ).trim() || null,
            serviceCode: null,
          });
          firstTrNo = pushResult?.trNo ?? null;
        }

        for (let i = 0; i < processServices.length; i++) {
          const srv = processServices[i];
          const pricingPayload = registrationPricingPayload({
            servicePrice: srv.price,
            serviceQty: Number(srv.qty) || 1,
            discountValue: srv.discount,
          });

          const pushResult = await pushNewPatientToMssql({
            patientCode: code,
            fullName: input.fullName,
            phone: input.phone || null,
            address: input.address || null,
            age: input.age ?? null,
            dateOfBirth: input.dateOfBirth || null,
            branch: "examinations",
            serviceType: input.serviceType || "consultant",
            locationType: input.locationType,
            doctorCode: doctorCode || null,
            enteredBy:
              String(
                (ctx.user as any)?.name ?? (ctx.user as any)?.username ?? "",
              ).trim() || null,
            serviceCode: srv.code,
            servicePrice:
              "servicePrice" in pricingPayload
                ? (pricingPayload.servicePrice ?? null)
                : null,
            serviceQty:
              "serviceQty" in pricingPayload
                ? (pricingPayload.serviceQty ?? null)
                : null,
            discountValue:
              "discountValue" in pricingPayload
                ? (pricingPayload.discountValue ?? null)
                : null,
            paValue:
              "paValue" in pricingPayload
                ? (pricingPayload.paValue ?? null)
                : null,
          });
          if (i === 0) firstTrNo = pushResult?.trNo ?? null;
        }

        await db.logAuditEvent(
          ctx.user.id,
          "CREATE_PATIENT_MULTI_SRV",
          "patient",
          Number(newPatient.id),
          {
            message: `Registered new patient with ${processServices.length} services`,
            patientCode: code,
          },
        ).catch(() => null);

        const notifSettings = await getAppNotificationSettings().catch(
          () => DEFAULT_APP_NOTIFICATION_SETTINGS,
        );
        if (notifSettings.patients.enabled) {
          const targetRoles = resolveNotificationTargetRolesByUserRole(
            (ctx.user as any)?.role,
          );
          const serviceCodes = processServices.map((s) => s.code).filter(Boolean) as string[];
          const notifTitle = resolvePatientNotifTitle(serviceCodes);
          await pushAppNotification({
            title: notifTitle,
            message: String(input.fullName ?? "").trim(),
            kind: "success",
            targetRoles,
            source: "manual_patient_create",
            entityType: "patient",
            entityId: Number(newPatient.id),
            meta: {
              patientCode: code,
              fullName: input.fullName,
              createdBy: String(
                (ctx.user as any)?.name ?? (ctx.user as any)?.username ?? "",
              ).trim() || null,
            },
            channels: {
              inApp: notifSettings.patients.inApp,
              push: notifSettings.patients.push,
              local: notifSettings.patients.local,
            },
          }).catch((e) => console.warn("[createPatientFromExamination] notif failed:", e));
        }

        return {
          id: Number(newPatient.id),
          patientCode: code,
          fullName: input.fullName,
          receiptNo: firstTrNo,
        };
      } catch (error: any) {
        console.error("[medical:createPatientFromExamination]", error);
        throw new TRPCError({
          code: error.code || "INTERNAL_SERVER_ERROR",
          message: error.message || "Failed to create patient and receipts",
        });
      }
    }),

  getPatientServiceEntries: protectedProcedure
    .input(z.object({ patientId: z.number() }))
    .query(async ({ input }) => {
      return await db.getPatientServiceEntriesByPatient(input.patientId);
    }),

  createPatientServiceEntry: receptionProcedure
    .input(
      z.object({
        patientId: z.number(),
        serviceCode: z.string().min(1),
        serviceName: z.string().optional().nullable(),
        sourceRef: z.string().min(1),
        serviceDate: z.string().optional().nullable(),
      }),
    )
    .mutation(async ({ input }) => {
      const conn = await db.getDb();
      if (!conn) throw new Error("Database not available");
      const result = await conn.insert(patientServiceEntries).values({
        patientId: input.patientId,
        serviceCode: input.serviceCode,
        serviceName: input.serviceName ?? null,
        source: "manual",
        sourceRef: input.sourceRef,
        serviceDate: input.serviceDate
          ? new Date(`${input.serviceDate.slice(0, 10)}T00:00:00`)
          : null,
      });
      let id = resolveInsertId(result);
      if (!id) {
        const [row] = await conn
          .select({ id: patientServiceEntries.id })
          .from(patientServiceEntries)
          .where(eq(patientServiceEntries.sourceRef, input.sourceRef))
          .limit(1);
        id = Number(row?.id ?? 0);
      }
      return { id };
    }),

  updatePatientServiceEntry: receptionProcedure
    .input(
      z.object({
        id: z.number(),
        serviceCode: z.string().optional(),
        serviceName: z.string().optional().nullable(),
        serviceDate: z.string().optional().nullable(),
      }),
    )
    .mutation(async ({ input }) => {
      const conn = await db.getDb();
      if (!conn) throw new Error("Database not available");
      await conn
        .update(patientServiceEntries)
        .set({
          ...(input.serviceCode !== undefined
            ? { serviceCode: input.serviceCode }
            : {}),
          ...(input.serviceName !== undefined
            ? { serviceName: input.serviceName }
            : {}),
          ...(input.serviceDate !== undefined
            ? {
                serviceDate: input.serviceDate
                  ? new Date(`${input.serviceDate.slice(0, 10)}T00:00:00`)
                  : null,
              }
            : {}),
          updatedAt: new Date(),
        })
        .where(eq(patientServiceEntries.id, input.id));
      return { success: true };
    }),

  deletePatientServiceEntry: receptionProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const conn = await db.getDb();
      if (!conn) throw new Error("Database not available");
      await conn
        .delete(patientServiceEntries)
        .where(eq(patientServiceEntries.id, input.id));
      return { success: true };
    }),

  setPatientStatus: receptionProcedure
    .input(
      z.object({
        patientId: z.number(),
        status: z.enum(["new", "followup", "archived"]),
      }),
    )
    .mutation(async ({ input }) => {
      await db.updatePatient(input.patientId, { status: input.status });
      return { success: true };
    }),

  setPatientQueue: receptionProcedure
    .input(
      z.object({
        patientId: z.number(),
        queueStatus: z.enum(["checkedIn", "next", "clinic", "treated"]),
      }),
    )
    .mutation(async ({ input }) => {
      const visitsRows = await db.getVisitsByPatient(input.patientId);
      const latest = visitsRows[0];
      if (!latest) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Patient has no visits",
        });
      }
      await db.updateVisitQueueStatus(Number(latest.id), input.queueStatus);
      return { success: true };
    }),

  searchPatients: protectedProcedure
    .input(
      z.object({
        searchTerm: z.string(),
        sheetType: z
          .enum(["consultant", "specialist", "lasik", "external", "pentacam"])
          .optional(),
        locationType: z.enum(["center", "external"]).optional(),
      }),
    )
    .query(async ({ input }) => {
      return await db.searchPatients(
        input.searchTerm,
        input.sheetType,
        input.locationType,
      );
    }),

  getAllPatients: protectedProcedure
    .input(
      z.object({
        branch: z.enum(["examinations", "surgery"]).optional(),
        searchTerm: z.string().optional(),
        dateFrom: z.string().optional(),
        dateTo: z.string().optional(),
        doctorName: z.string().optional(),
        serviceType: z
          .enum([
            "consultant",
            "specialist",
            "lasik",
            "surgery",
            "external",
            "pentacam_c",
            "pentacam_ex",
            "pentacam_ex_c",
            "surgery_external",
            "surgery_center",
            "pentacam_center",
            "pentacam_external",
          ])
          .optional(),
        locationType: z.enum(["center", "external"]).optional(),
        limit: z.number().int().min(1).max(500).optional(),
        cursor: z
          .object({
            codeNum: z.number(),
            patientCode: z.string(),
            id: z.number().int().positive(),
          })
          .optional(),
      }),
    )
    .query(async ({ input }) => {
      return await db.getAllPatients(input);
    }),

  getPatientStats: adminProcedure
    .input(
      z.object({
        year: z.number().int().min(1900).max(3000),
        month: z.number().int().min(1).max(12).optional(),
        searchTerm: z.string().optional(),
        doctorName: z.string().optional(),
        serviceType: z
          .enum(["consultant", "specialist", "lasik", "surgery", "external"])
          .optional(),
        locationType: z.enum(["center", "external"]).optional(),
        dateFrom: z.string().optional(),
        dateTo: z.string().optional(),
      }),
    )
    .query(async ({ input }) => {
      return await db.getPatientStats(input.year, input.month, {
        searchTerm: input.searchTerm,
        doctorName: input.doctorName,
        serviceType: input.serviceType,
        locationType: input.locationType,
        dateFrom: input.dateFrom,
        dateTo: input.dateTo,
      });
    }),

  getPatientStatsBundle: adminProcedure
    .input(
      z.object({
        year: z.number().int().min(1900).max(3000),
        month: z.number().int().min(1).max(12),
        searchTerm: z.string().optional(),
        doctorName: z.string().optional(),
        serviceType: z
          .enum(["consultant", "specialist", "lasik", "surgery", "external"])
          .optional(),
        locationType: z.enum(["center", "external"]).optional(),
        dateFrom: z.string().optional(),
        dateTo: z.string().optional(),
      }),
    )
    .query(async ({ input }) => {
      const filters = {
        searchTerm: input.searchTerm,
        doctorName: input.doctorName,
        serviceType: input.serviceType,
        locationType: input.locationType,
        dateFrom: input.dateFrom,
        dateTo: input.dateTo,
      };

      let previousYear = input.year;
      let previousMonth = input.month - 1;
      if (previousMonth < 1) {
        previousMonth = 12;
        previousYear -= 1;
      }

      const [currentMonth, previousMonthStats, yearly] = await Promise.all([
        db.getPatientStats(input.year, input.month, filters),
        db.getPatientStats(previousYear, previousMonth, filters),
        db.getPatientStats(input.year, undefined, filters),
      ]);

      return {
        currentMonth,
        previousMonth: previousMonthStats,
        yearly,
      };
    }),

  getTodayPatientsBySheet: protectedProcedure
    .input(z.object({ date: z.string().optional() }).optional())
    .query(async ({ input }) => {
      return await db.getTodayPatientsBySheet(input?.date);
    }),

  updatePatient: receptionProcedure
    .input(
      z.object({
        patientId: z.number(),
        updates: z.record(z.string(), z.any()),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const nextUpdates = { ...input.updates } as Record<string, any>;
        const beforePatient = await db.getPatientById(input.patientId);
        if (Object.prototype.hasOwnProperty.call(nextUpdates, "dateOfBirth")) {
          const rawDob = nextUpdates.dateOfBirth;
          if (rawDob == null || String(rawDob).trim() === "") {
            nextUpdates.dateOfBirth = null;
          } else {
            const raw = String(rawDob).trim();
            const ymd = raw.match(/(\d{4})-(\d{2})-(\d{2})/);
            if (ymd) {
              nextUpdates.dateOfBirth = `${ymd[1]}-${ymd[2]}-${ymd[3]}`;
            } else {
              const parsed = new Date(raw.replace(/\bGM\b/g, "GMT"));
              if (Number.isNaN(parsed.valueOf())) {
                delete nextUpdates.dateOfBirth;
              } else {
                nextUpdates.dateOfBirth = parsed.toISOString().slice(0, 10);
              }
            }
          }
        }
        if (
          Object.prototype.hasOwnProperty.call(nextUpdates, "serviceType")
        ) {
          nextUpdates.locationType = isExternalServiceType(
            nextUpdates.serviceType,
          )
            ? "external"
            : "center";
        }
        await db.updatePatient(input.patientId, nextUpdates);
        const updated = await db.getPatientById(input.patientId);

        // Push patient details only to MSSQL (no service linking from update flow).
        if (
          updated?.patientCode &&
          updated?.fullName &&
          (await canPushToMssql(ctx.user))
        ) {
          await upsertPatientToMssql({
            patientCode: String(updated.patientCode),
            fullName: String(updated.fullName),
            phone: String((updated as any).phone ?? "").trim() || null,
            address: String((updated as any).address ?? "").trim() || null,
            age: Number.isFinite(Number((updated as any).age))
              ? Number((updated as any).age)
              : null,
            gender: String((updated as any).gender ?? "").trim() || null,
            dateOfBirth: (updated as any).dateOfBirth ?? null,
            branch: String((updated as any).branch ?? "").trim() || null,
            locationType:
              String((updated as any).locationType ?? "").trim() || null,
            enteredBy:
              String(
                (ctx.user as any)?.name ?? (ctx.user as any)?.username ?? "",
              ).trim() || null,
          }).catch((error) => {
            console.warn("[mssql-push] updatePatient upsert failed", {
              patientCode: String(updated.patientCode),
              message: String((error as any)?.message ?? error ?? "unknown"),
            });
          });
        }

        await db.logAuditEvent(
          ctx.user.id,
          "UPDATE_PATIENT",
          "patient",
          input.patientId,
          { message: `Updated patient data` },
        );

        return { success: true };
      } catch (error) {
        throw new Error(`Failed to update patient: ${error}`);
      }
    }),

  bulkAssignDoctorToPatients: adminProcedure
    .input(
      z.object({
        patientIds: z.array(z.number()).min(1),
        doctorCode: z.string().min(1),
        doctorName: z.string().min(1),
        doctorLocationType: z.enum(["center", "external"]),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const uniqueIds = Array.from(
        new Set(input.patientIds.filter((id) => Number.isFinite(id))),
      );
      const nextDoctorCode = input.doctorCode.trim();
      const nextDoctorName = input.doctorName.trim();
      const nextLocationType = input.doctorLocationType;
      const snapshots: Array<{
        patientId: number;
        serviceType: string | null;
        locationType: string | null;
        doctorName: string;
      }> = [];

      for (const patientId of uniqueIds) {
        const patient = await db.getPatientById(patientId);
        if (!patient) continue;
        const previousDoctorName = String(
          (patient as any).treatingDoctor ?? "",
        ).trim();
        snapshots.push({
          patientId,
          serviceType: (patient as any).serviceType ?? null,
          locationType: (patient as any).locationType ?? null,
          doctorName: previousDoctorName,
        });

        const nextUpdates: Record<string, any> = {
          doctorCode: nextDoctorCode || null,
          doctorId: null,
          treatingDoctor: nextDoctorName || null,
          locationType: nextLocationType,
        };
        if (nextLocationType === "external") {
          nextUpdates.serviceType = "external";
        }
        await db.updatePatient(patientId, nextUpdates);
      }

      await db.logAuditEvent(ctx.user.id, "BULK_ASSIGN_DOCTOR", "patient", 0, {
        count: snapshots.length,
        fromLocationCounts: snapshots.reduce<Record<string, number>>(
          (acc, item) => {
            const key = String(item.locationType ?? "unknown");
            acc[key] = (acc[key] ?? 0) + 1;
            return acc;
          },
          {},
        ),
        fromDoctorSamples: Array.from(
          new Set(snapshots.map((s) => s.doctorName).filter(Boolean)),
        ).slice(0, 10),
        toDoctor: nextDoctorName,
        doctorCode: nextDoctorCode,
        doctorName: nextDoctorName,
        doctorLocationType: nextLocationType,
        patientIds: uniqueIds.slice(0, 200),
      });

      return { success: true, updatedCount: snapshots.length, snapshots };
    }),

  bulkAssignSheetTypeToPatients: adminProcedure
    .input(
      z.object({
        patientIds: z.array(z.number()).min(1),
        sheetType: z.enum([
          "consultant",
          "specialist",
          "lasik",
          "external",
          "surgery",
          "pentacam_c",
          "pentacam_ex",
          "pentacam_ex_c",
          "surgery_external",
          "surgery_center",
          "pentacam_center",
          "pentacam_external",
        ]),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const uniqueIds = Array.from(
        new Set(input.patientIds.filter((id) => Number.isFinite(id))),
      );
      const nextSheetType = input.sheetType;
      const isExternalSheetType = isExternalServiceType(nextSheetType);
      const snapshots: Array<{
        patientId: number;
        serviceType: string | null;
        locationType: string | null;
        doctorName: string;
      }> = [];

      for (const patientId of uniqueIds) {
        const patient = await db.getPatientById(patientId);
        if (!patient) continue;
        const existingState = await db.getPatientPageState(
          patientId,
          "examination",
        );
        const existingData =
          existingState &&
          typeof (existingState as any).data === "object" &&
          (existingState as any).data
            ? ((existingState as any).data as Record<string, any>)
            : {};
        snapshots.push({
          patientId,
          serviceType: (patient as any).serviceType ?? null,
          locationType: (patient as any).locationType ?? null,
          doctorName: readDoctorNameFromStateData(existingData),
        });

        await db.updatePatient(patientId, {
          serviceType: nextSheetType,
          locationType: isExternalSheetType ? "external" : "center",
        });
        // Mark manually locked so this assignment isn't overridden by
        // service-code-derived classification or MSSQL sync.
        await db.upsertPatientPageState(patientId, "examination", {
          ...existingData,
          syncLockManual: true,
          manualEditedAt: new Date().toISOString(),
        });
      }

      await db.logAuditEvent(
        ctx.user.id,
        "BULK_ASSIGN_SHEET_TYPE",
        "patient",
        0,
        {
          count: snapshots.length,
          fromServiceTypeCounts: snapshots.reduce<Record<string, number>>(
            (acc, item) => {
              const key = String(item.serviceType ?? "unknown");
              acc[key] = (acc[key] ?? 0) + 1;
              return acc;
            },
            {},
          ),
          fromLocationCounts: snapshots.reduce<Record<string, number>>(
            (acc, item) => {
              const key = String(item.locationType ?? "unknown");
              acc[key] = (acc[key] ?? 0) + 1;
              return acc;
            },
            {},
          ),
          toSheetType: nextSheetType,
          sheetType: nextSheetType,
          patientIds: uniqueIds.slice(0, 200),
        },
      );

      return { success: true, updatedCount: snapshots.length, snapshots };
    }),

  bulkRestorePatients: adminProcedure
    .input(
      z.object({
        snapshots: z.array(
          z.object({
            patientId: z.number(),
            serviceType: z.string().nullable().optional(),
            locationType: z.string().nullable().optional(),
            doctorName: z.string().optional(),
          }),
        ),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const snapshots = input.snapshots.filter((item) =>
        Number.isFinite(item.patientId),
      );
      let restoredCount = 0;
      for (const snapshot of snapshots) {
        const nextUpdates: Record<string, any> = {};
        if (snapshot.serviceType)
          nextUpdates.serviceType = snapshot.serviceType;
        if (snapshot.locationType)
          nextUpdates.locationType = snapshot.locationType;
        if (Object.keys(nextUpdates).length > 0) {
          await db.updatePatient(snapshot.patientId, nextUpdates);
        }

        restoredCount += 1;
      }

      await db.logAuditEvent(
        ctx.user.id,
        "BULK_RESTORE_PATIENTS",
        "patient",
        0,
        {
          count: restoredCount,
          patientIds: snapshots.map((s) => s.patientId).slice(0, 200),
        },
      );
      return { success: true, restoredCount };
    }),

  createAppointment: receptionProcedure
    .input(
      z.object({
        patientId: z.number(),
        doctorId: z.number().optional(),
        appointmentDate: z.string(),
        appointmentType: z.enum(["examination", "surgery", "followup"]),
        branch: z.enum(["examinations", "surgery"]),
        notes: z.string().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const result = await db.createAppointment({
          ...input,
          appointmentDate: new Date(input.appointmentDate),
          status: "scheduled",
        });

        let appointmentId = (result as any)?.insertId as number | undefined;
        if (!appointmentId) {
          const createdMs = new Date(input.appointmentDate).getTime();
          const patientAppointments = await db.getAppointmentsByPatient(
            input.patientId,
          );
          const candidates = patientAppointments
            .filter(
              (row: any) =>
                String(row?.appointmentType ?? "") === input.appointmentType,
            )
            .filter((row: any) => String(row?.branch ?? "") === input.branch)
            .map((row: any) => {
              const rowMs =
                row?.appointmentDate instanceof Date
                  ? row.appointmentDate.getTime()
                  : new Date(String(row?.appointmentDate ?? "")).getTime();
              const delta = Number.isFinite(rowMs)
                ? Math.abs(rowMs - createdMs)
                : Number.MAX_SAFE_INTEGER;
              return { row, delta };
            })
            .filter((item: any) => item.delta <= 2 * 60 * 1000)
            .sort((a: any, b: any) => {
              if (a.delta !== b.delta) return a.delta - b.delta;
              return Number(b?.row?.id ?? 0) - Number(a?.row?.id ?? 0);
            });
          const matched = candidates[0]?.row;
          if (matched?.id && Number(matched.id) > 0) {
            appointmentId = Number(matched.id);
          }
        }
        if (!appointmentId) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message:
              "Failed to create appointment - no ID returned from database",
          });
        }

        await db.logAuditEvent(
          ctx.user.id,
          "CREATE_APPOINTMENT",
          "appointment",
          appointmentId,
          { message: `Created appointment for patient ${input.patientId}` },
        );

        return { success: true, appointmentId };
      } catch (error) {
        throw new Error(`Failed to create appointment: ${error}`);
      }
    }),

  createPentacamResult: technicianProcedure
    .input(
      z.object({
        visitId: z.number(),
        patientId: z.number(),
        ltK1: z.number().optional(),
        ltK2: z.number().optional(),
        ltAX: z.number().optional(),
        ltThinnestPoint: z.number().optional(),
        rtK1: z.number().optional(),
        rtK2: z.number().optional(),
        rtAX: z.number().optional(),
        rtThinnestPoint: z.number().optional(),
        techniciansNotes: z.string().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      try {
        await db.createPentacamResult({
          ...input,
          recordedBy: ctx.user.id,
        });

        await db.logAuditEvent(
          ctx.user.id,
          "CREATE_PENTACAM",
          "pentacamResult",
          0,
          {
            message: `Recorded Pentacam results for patient ${input.patientId}`,
          },
        );

        return { success: true };
      } catch (error) {
        throw new Error(`Failed to create pentacam result: ${error}`);
      }
    }),
};
