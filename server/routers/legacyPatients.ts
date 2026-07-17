/**
 * Read-only lookup across the legacy year databases (selrs23/24/25) plus the
 * live database (selrs26, via the normal shared pool) — powers the "Legacy
 * Patients" admin page's year combo box. Each legacy year opens its own raw
 * MySQL connection (cached per process, mirrors createMssqlPool's health-check
 * pattern) — this never touches the main app's write path.
 */
import { z } from "zod";
import mysql from "mysql2/promise";
import { TRPCError } from "@trpc/server";
import { inArray, like, or } from "drizzle-orm";
import { router, protectedProcedure } from "../_core/procedures";
import { getDb, getEffectiveUserPermissions } from "../db";
import {
  patients,
  patientServiceEntries,
  doctorsLookup,
  services as servicesTable,
} from "../../drizzle/schema";

const PAGE_PATH = "/admin/legacy-patients";

const LEGACY_YEAR_DB: Record<string, string> = {
  "2023": "selrs23",
  "2024": "selrs24",
  "2025": "selrs25",
};

const yearConnections = new Map<string, mysql.Connection>();

async function getYearConnection(dbName: string): Promise<mysql.Connection> {
  const existing = yearConnections.get(dbName);
  if (existing) {
    try {
      await existing.ping();
      return existing;
    } catch {
      yearConnections.delete(dbName);
    }
  }
  const base = new URL(String(process.env.DATABASE_URL ?? ""));
  if (!base.href) throw new Error("DATABASE_URL is missing");
  base.pathname = `/${dbName}`;
  const conn = await mysql.createConnection(base.toString());
  yearConnections.set(dbName, conn);
  return conn;
}

// Doctor/service names live only in the main (26) database's reference
// tables — the code catalog is shared across years, so resolve names there
// regardless of which year's patients are being viewed.
export async function loadNameMaps(): Promise<{
  doctorNames: Map<string, string>;
  serviceNames: Map<string, string>;
}> {
  const db = await getDb();
  if (!db) return { doctorNames: new Map(), serviceNames: new Map() };
  const [doctorRows, serviceRows] = await Promise.all([
    db
      .select({ code: doctorsLookup.code, name: doctorsLookup.name })
      .from(doctorsLookup),
    db
      .select({ code: servicesTable.code, name: servicesTable.name })
      .from(servicesTable),
  ]);
  const doctorNames = new Map<string, string>();
  for (const row of doctorRows) {
    if (row.code && row.name) doctorNames.set(row.code, row.name);
  }
  const serviceNames = new Map<string, string>();
  for (const row of serviceRows) {
    if (row.code && row.name) serviceNames.set(row.code, row.name);
  }
  return { doctorNames, serviceNames };
}

function withServiceNames(
  entries: Array<{ serviceCode: string | null }>,
  serviceNames: Map<string, string>,
) {
  return entries.map((entry) => ({
    ...entry,
    serviceName: entry.serviceCode
      ? (serviceNames.get(entry.serviceCode) ?? null)
      : null,
  }));
}

const searchInputSchema = z.object({
  year: z.enum(["2023", "2024", "2025", "2026"]),
  query: z.string().trim().max(255).optional(),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(200).default(25),
});

export const legacyPatientsRouter = router({
  search: protectedProcedure
    .input(searchInputSchema)
    .query(async ({ input, ctx }) => {
      if (ctx.user.role !== "admin") {
        const permissions = await getEffectiveUserPermissions(
          ctx.user.id,
          ctx.user.role,
        );
        const allowed = permissions.some((p) => {
          const clean = String(p ?? "")
            .trim()
            .replace(/:r[w]?$/, "");
          return clean === PAGE_PATH;
        });
        if (!allowed) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Legacy patients access required",
          });
        }
      }
      const { year, query, page, pageSize } = input;
      const offset = (page - 1) * pageSize;
      const { doctorNames, serviceNames } = await loadNameMaps();

      if (year === "2026") {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        const baseQuery = db.select().from(patients);
        const rows = query
          ? await baseQuery
              .where(
                or(
                  like(patients.fullName, `%${query}%`),
                  like(patients.patientCode, `%${query}%`),
                ),
              )
              .limit(pageSize)
              .offset(offset)
          : await baseQuery.limit(pageSize).offset(offset);
        const ids = rows.map((r: { id: number }) => r.id);
        const serviceEntries = ids.length
          ? await db
              .select()
              .from(patientServiceEntries)
              .where(inArray(patientServiceEntries.patientId, ids))
          : [];
        return {
          patients: rows.map(
            (r: { id: number; doctorCode: string | null }) => ({
              ...r,
              doctorName: r.doctorCode
                ? (doctorNames.get(r.doctorCode) ?? null)
                : null,
              services: withServiceNames(
                serviceEntries.filter(
                  (s: { patientId: number }) => s.patientId === r.id,
                ),
                serviceNames,
              ),
            }),
          ),
          page,
          pageSize,
        };
      }

      const dbName = LEGACY_YEAR_DB[year];
      const conn = await getYearConnection(dbName);

      const searchClause = query
        ? `WHERE patientCode LIKE ? OR fullName LIKE ?`
        : "";
      const searchParams = query ? [`%${query}%`, `%${query}%`] : [];
      const [rows] = await conn.query(
        `SELECT * FROM patients ${searchClause} ORDER BY id DESC LIMIT ? OFFSET ?`,
        [...searchParams, pageSize, offset],
      );
      const patientRows = rows as any[];

      const ids = patientRows.map((r) => r.id);
      let serviceEntries: any[] = [];
      if (ids.length) {
        const placeholders = ids.map(() => "?").join(",");
        const [svcRows] = await conn.query(
          `SELECT * FROM patientServiceEntries WHERE patientId IN (${placeholders})`,
          ids,
        );
        serviceEntries = svcRows as any[];
      }

      return {
        patients: patientRows.map((r) => ({
          ...r,
          doctorName: r.doctorCode
            ? (doctorNames.get(r.doctorCode) ?? null)
            : null,
          services: withServiceNames(
            serviceEntries.filter((s) => s.patientId === r.id),
            serviceNames,
          ),
        })),
        page,
        pageSize,
      };
    }),
});
