import { z } from "zod";

export const marketingGenerationInput = z.object({
  requestId: z.string().uuid(),
  pageRole: z.enum(["center", "doctor"]).default("center"),
  postDay: z.enum(["saturday", "tuesday", "thursday"]),
  topic: z.string().trim().min(1).max(255).optional(),
  assistant: z
    .discriminatedUnion("provider", [
      z
        .object({
          provider: z.literal("manus"),
          model: z.enum(["standard", "lite", "max"]),
        })
        .strict(),
      z
        .object({
          provider: z.literal("gemini"),
          model: z
            .string()
            .regex(/^gemini-[a-z0-9.-]+$/)
            .max(100)
            .optional(),
          imageModel: z
            .string()
            .regex(/^gemini-[a-z0-9.-]+$/)
            .max(100)
            .optional(),
        })
        .strict(),
    ])
    .optional(),
});
export const whatsappRequestContext = z
  .object({
    requestId: z.string().uuid(),
    kind: z.enum(["reminder", "lasik", "cataract", "exam"]),
    days: z
      .array(z.enum(["الأحد", "الثلاثاء", "الخميس"]))
      .min(1)
      .max(3)
      .optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    if ((value.kind === "exam") !== Boolean(value.days?.length))
      ctx.addIssue({
        code: "custom",
        message: "Examination days are required only for examination offers",
      });
  });
