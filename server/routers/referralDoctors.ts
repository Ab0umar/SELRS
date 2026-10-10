import { eq, asc } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { referralDoctors } from "../../drizzle/schema";
import {
  referralDoctorInput,
  type ReferralDoctorDetails,
} from "../../shared/referral-doctors";
import { getDb } from "../db";
import {
  adminProcedure,
  medicalStaffProcedure,
  router,
} from "../_core/procedures";

async function database() {
  const db = await getDb();
  if (!db)
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "قاعدة البيانات غير متاحة",
    });
  return db;
}

export const referralDoctorsRouter = router({
  list: medicalStaffProcedure.query(
    async (): Promise<ReferralDoctorDetails[]> => {
      const db = await database();
      return db
        .select()
        .from(referralDoctors)
        .orderBy(asc(referralDoctors.name));
    },
  ),
  save: adminProcedure
    .input(
      referralDoctorInput.extend({
        id: z.number().int().positive().optional(),
      }),
    )
    .mutation(async ({ input }): Promise<{ id: number }> => {
      const db = await database();
      const { id, ...details } = input;
      if (id) {
        const existing = await db
          .select({ id: referralDoctors.id })
          .from(referralDoctors)
          .where(eq(referralDoctors.id, id))
          .limit(1);
        if (!existing.length)
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "الدكتور غير موجود",
          });
        await db
          .update(referralDoctors)
          .set(details)
          .where(eq(referralDoctors.id, id));
        return { id };
      }
      const [result] = await db.insert(referralDoctors).values(details);
      return { id: Number(result.insertId) };
    }),
});
