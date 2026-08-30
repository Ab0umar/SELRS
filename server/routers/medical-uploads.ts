import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { sql } from "drizzle-orm";
import {
  router,
  makePageProcedure,
  makePageWriteProcedure,
} from "../_core/procedures";
import { getDb } from "../db";
import { uploadToS3 } from "../_core/s3";

const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/bmp",
];

const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024; // 20 MB

function normalizeRows(rows: unknown): any[] {
  if (!Array.isArray(rows)) return [];
  if (Array.isArray(rows[0])) return rows[0] as any[];
  return rows as any[];
}

export const medicalUploadsRoutes = {
  getPatientDiagnosisUploads: makePageProcedure("/patient-file")
    .input(z.object({ patientId: z.number().int().positive() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "DB unavailable",
        });

      const rows = (await db.execute(
        sql`SELECT id, file_name, mime_type, created_at
            FROM srv100_uploads
            WHERE patient_id = ${input.patientId}
              AND source_printer = 'diagnosis-upload'
            ORDER BY id DESC
            LIMIT 50`,
      )) as any;

      return normalizeRows(rows).map((row) => ({
        id: Number(row.id),
        fileName: String(row.file_name ?? ""),
        mimeType: String(row.mime_type ?? "image/jpeg"),
        createdAt: row.created_at
          ? new Date(row.created_at).toISOString()
          : "",
        viewUrl: `/api/srv100/uploads/${row.id}`,
      }));
    }),

  uploadDiagnosisImage: makePageWriteProcedure("/patient-file")
    .input(
      z.object({
        patientId: z.number().int().positive(),
        fileName: z.string().min(1).max(255),
        mimeType: z.string().refine((m) => ALLOWED_MIME_TYPES.includes(m), {
          message: "نوع الملف غير مدعوم. يُسمح فقط بصور JPG/PNG/WEBP.",
        }),
        fileDataBase64: z.string().min(1),
      }),
    )
    .mutation(async ({ input }) => {
      const fileBuffer = Buffer.from(input.fileDataBase64, "base64");

      if (fileBuffer.byteLength > MAX_FILE_SIZE_BYTES) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "حجم الصورة يتجاوز الحد المسموح (20 ميغابايت).",
        });
      }

      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "DB unavailable",
        });

      const safeFileName = input.fileName.slice(0, 255);
      const ts = Date.now();
      const documentId = `diagnosis-${input.patientId}-${ts}`;
      const s3Key = `diagnosis/${input.patientId}/${ts}_${safeFileName}`;

      let uploadedS3Key: string | null = null;
      try {
        await uploadToS3(s3Key, fileBuffer, input.mimeType);
        uploadedS3Key = s3Key;
      } catch {
        // S3 not configured or failed — fall back to storing blob in DB
      }

      const result = (await db.execute(
        sql`INSERT INTO srv100_uploads
            (patient_id, document_id, file_name, mime_type, file_data, s3_key, source_printer)
            VALUES (
              ${input.patientId},
              ${documentId},
              ${safeFileName},
              ${input.mimeType},
              ${uploadedS3Key ? null : fileBuffer},
              ${uploadedS3Key},
              'diagnosis-upload'
            )`,
      )) as any;

      const insertId = Number(
        result?.insertId ?? result?.[0]?.insertId ?? 0,
      );

      return {
        id: insertId,
        viewUrl: `/api/srv100/uploads/${insertId}`,
      };
    }),
};

export const medicalUploadsRouter = router(medicalUploadsRoutes);
