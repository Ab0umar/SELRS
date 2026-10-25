import fs from "node:fs/promises";
import path from "node:path";
import { and, desc, eq, inArray, lte, or, isNull } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "../../db";
import { ENV } from "../../_core/env";
import { marketingReferenceDesigns } from "../../../drizzle/schema";

export async function marketingReferences(pageRole: "center" | "doctor") {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const rows = await db
    .select({
      id: marketingReferenceDesigns.id,
      filePath: marketingReferenceDesigns.filePath,
      mimeType: marketingReferenceDesigns.mimeType,
    })
    .from(marketingReferenceDesigns)
    .where(
      and(
        eq(marketingReferenceDesigns.pageRole, pageRole),
        eq(marketingReferenceDesigns.analysisStatus, "analyzed"),
        inArray(marketingReferenceDesigns.mimeType, [
          "image/png",
          "image/jpeg",
          "image/webp",
        ]),
        or(
          lte(marketingReferenceDesigns.fileSize, 2 * 1024 * 1024),
          isNull(marketingReferenceDesigns.fileSize),
        ),
      ),
    )
    .orderBy(desc(marketingReferenceDesigns.createdAt))
    .limit(2);
  const images: Array<{
    bytes: Buffer;
    mimeType: "image/png" | "image/jpeg" | "image/webp";
  }> = [];
  const ids: number[] = [];
  if (!rows.length) return { images, ids };
  const directory = await fs.realpath(
    path.join(
      ENV.marketingImageDir || path.join(process.cwd(), "uploads", "marketing"),
      "reference-designs",
    ),
  );
  for (const row of rows) {
    const filename = await fs.realpath(row.filePath);
    const relative = path.relative(directory, filename);
    if (relative.startsWith("..") || path.isAbsolute(relative))
      throw new Error("Reference path is outside the brand library");
    const stat = await fs.stat(filename);
    if (!stat.isFile() || stat.size > 2 * 1024 * 1024)
      throw new Error("Reference image exceeds safe input limit");
    images.push({
      bytes: await fs.readFile(filename),
      mimeType: z
        .enum(["image/png", "image/jpeg", "image/webp"])
        .parse(row.mimeType),
    });
    ids.push(row.id);
  }
  return { images, ids };
}
