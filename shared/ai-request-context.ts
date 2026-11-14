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
          provider: z.literal("grok"),
          model: z
            .string()
            .regex(/^grok-(?!imagine-image)[a-z0-9.-]+$/)
            .max(100),
          imageModel: z
            .string()
            .regex(/^grok-imagine-image[a-z0-9.-]*$/)
            .max(100),
        })
        .strict(),
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
    // lasik, cataract and exam are the offers from before they became
    // editable; they stay valid so requests already in flight still resolve.
    kind: z.enum(["reminder", "offer", "lasik", "cataract", "exam"]),
    offerId: z.string().min(1).max(64).optional(),
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
    if ((value.kind === "offer") !== Boolean(value.offerId))
      ctx.addIssue({
        code: "custom",
        message: "An offer id is required only for offer messages",
      });
  });
