import { describe, expect, it } from "vitest";
import {
  medicalTranscriptSchema,
  medicalProposalRequestSchema,
  validateMedicalProposals,
} from "@shared/medical-assistant";

const fieldInput = {
  kind: "field",
  label: "Complaints",
  transcript: "صداع من أسبوعين",
} as const;
const proposal = {
  field: "field",
  text: "صداع لمدة أسبوعين",
  sources: ["صداع من أسبوعين"],
  speaker: "patient",
};
describe("medical AI proposal boundary", () => {
  it("requires explicit consent before submitting to the provider", () => {
    expect(
      medicalProposalRequestSchema.safeParse({
        recording: fieldInput,
        consentConfirmed: false,
      }).success,
    ).toBe(false);
    expect(
      medicalProposalRequestSchema.safeParse({ recording: fieldInput }).success,
    ).toBe(false);
    expect(
      medicalProposalRequestSchema.safeParse({
        recording: fieldInput,
        consentConfirmed: true,
      }).success,
    ).toBe(true);
  });
  it("drops a full-visit proposal that copies most of the conversation and warns", () => {
    const visit = {
      kind: "conversation",
      mode: "conversation",
      transcript:
        "عندي صداع جامد من أسبوعين وعيني اليمين بتنبض. الدكتور قال لازم نظارة وهنعمل أشعة عيون ونشوف بعدها لو محتاجين عملية. ".repeat(3),
    } as const;
    const result = validateMedicalProposals(
      {
        proposals: [
          { field: "complaints", text: "صداع جامد من أسبوعين", sources: ["عندي صداع جامد من أسبوعين"], speaker: "patient" },
          { field: "decision", text: visit.transcript, sources: ["لازم نظارة"], speaker: "doctor" },
        ],
        warnings: [],
      },
      visit,
    );
    expect(result.proposals.map((item) => item.field)).toEqual(["complaints"]);
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]).toContain("القرار النهائي");
  });
  const history =
    "يا دكتور أنا عندي سكر من عشر سنين وباخد أنسولين الصبح وبالليل، وعملت عملية مياه بيضاء في العين اليمين من سنتين، وعندي ضغط بقاله خمس سنين وباخد كونكور، ومفيش عندي حساسية من أي دوا، وأبويا الله يرحمه كان عنده مياه زرقاء.";
  it("keeps a long reworded summary that does not copy the conversation", () => {
    const summary =
      "سكري منذ 10 سنوات على الأنسولين صباحًا ومساءً، وارتفاع ضغط منذ 5 سنوات على كونكور. جراحة مياه بيضاء بالعين اليمنى منذ عامين. لا حساسية دوائية. تاريخ عائلي للمياه الزرقاء (الأب).";
    expect(summary.length).toBeGreaterThan(history.length * 0.6);
    const result = validateMedicalProposals(
      {
        proposals: [{ field: "history", text: summary, sources: ["عندي سكر من عشر سنين"], speaker: "patient" }],
        warnings: [],
      },
      { kind: "conversation", mode: "conversation", transcript: history },
    );
    expect(result.proposals).toHaveLength(1);
    expect(result.warnings).toEqual([]);
  });
  it("keeps a dictated field even when it is the whole transcript", () => {
    const result = validateMedicalProposals(
      {
        proposals: [{ field: "history", text: history, sources: ["عندي سكر من عشر سنين"], speaker: "doctor" }],
        warnings: [],
      },
      { kind: "conversation", mode: "dictation", transcript: history },
    );
    expect(result.proposals).toHaveLength(1);
    expect(result.warnings).toEqual([]);
  });
  it("accepts a cited selected-field proposal", () => {
    expect(
      validateMedicalProposals(
        { proposals: [proposal], warnings: [] },
        fieldInput,
      ).proposals,
    ).toHaveLength(1);
  });
  it("files a single field-dictation proposal under the field even when the model names a clinical field", () => {
    const result = validateMedicalProposals(
      {
        proposals: [
          {
            ...proposal,
            field: "treatment",
            speaker: "doctor",
            medications: [
              { name: "Vigamox", source: "صداع", dosage: "", frequency: "", duration: "", instructions: "" },
            ],
          },
        ],
        warnings: [],
      },
      fieldInput,
    );
    expect(result.proposals).toEqual([
      { field: "field", text: proposal.text, sources: proposal.sources, speaker: "doctor" },
    ]);
    expect(
      validateMedicalProposals(
        { proposals: [{ ...proposal, medications: [] }], warnings: [] },
        fieldInput,
      ).proposals[0],
    ).not.toHaveProperty("medications");
  });
  it("rejects more than one proposal from a single-field recording", () => {
    expect(() =>
      validateMedicalProposals(
        { proposals: [proposal, { ...proposal, field: "history" }], warnings: [] },
        fieldInput,
      ),
    ).toThrow("scope");
  });
  it("rejects a selected-field proposal from a full-visit recording", () => {
    expect(() =>
      validateMedicalProposals(
        { proposals: [proposal], warnings: [] },
        { kind: "conversation", mode: "conversation", transcript: fieldInput.transcript },
      ),
    ).toThrow("scope");
  });
  it("drops only the sources that were not spoken", () => {
    const result = validateMedicalProposals(
      { proposals: [{ ...proposal, sources: ["مياه بيضاء", "صداع من أسبوعين"] }], warnings: [] },
      fieldInput,
    );
    expect(result.proposals[0].sources).toEqual(["صداع من أسبوعين"]);
    expect(result.warnings).toEqual([]);
  });
  it("drops a proposal with no spoken source and warns", () => {
    const result = validateMedicalProposals(
      { proposals: [{ ...proposal, sources: ["مياه بيضاء"] }], warnings: [] },
      fieldInput,
    );
    expect(result.proposals).toEqual([]);
    expect(result.warnings).toEqual([
      "حُذف اقتراح «Complaints» لأن اقتباساته لا تطابق نص التسجيل. راجع هذا الحقل يدويًا.",
    ]);
  });
  it("rejects duplicate destinations", () => {
    expect(() =>
      validateMedicalProposals(
        { proposals: [proposal, proposal], warnings: [] },
        fieldInput,
      ),
    ).toThrow("Duplicate");
  });
  const visit = {
    kind: "conversation",
    mode: "conversation",
    transcript: "صداع من أسبوعين. هكتبلك Vigamox. متابعة بعد شهر",
  } as const;
  const medicine = (name: string, source: string) => ({
    name, source, dosage: "", frequency: "", duration: "", instructions: "",
  });
  it("drops a clinical decision the doctor did not state and keeps the rest", () => {
    const result = validateMedicalProposals(
      {
        proposals: [
          { ...proposal, field: "complaints" },
          { field: "diagnosis", text: "Migraine", sources: ["صداع من أسبوعين"], speaker: "patient" },
        ],
        warnings: ["تحذير من النموذج"],
      },
      visit,
    );
    expect(result.proposals.map((item) => item.field)).toEqual(["complaints"]);
    expect(result.warnings).toEqual([
      "حُذف اقتراح «التشخيص» لأنه غير منسوب صراحةً إلى الطبيب. راجع هذا الحقل يدويًا.",
      "تحذير من النموذج",
    ]);
  });
  it("drops only an unspoken medicine and strips medicines outside treatment", () => {
    const result = validateMedicalProposals(
      {
        proposals: [
          {
            field: "treatment", text: "Vigamox\nTobrex", sources: ["هكتبلك Vigamox"], speaker: "doctor",
            medications: [medicine("Vigamox", "Vigamox"), medicine("Tobrex", "Tobrex")],
          },
          {
            field: "decision", text: "متابعة بعد شهر", sources: ["متابعة بعد شهر"], speaker: "doctor",
            medications: [medicine("Vigamox", "Vigamox")],
          },
        ],
        warnings: [],
      },
      visit,
    );
    expect(result.proposals[0].medications?.map((item) => item.name)).toEqual(["Vigamox"]);
    expect(result.proposals[1]).not.toHaveProperty("medications");
    expect(result.warnings).toEqual([
      "حُذف الدواء «Tobrex» لأن مصدره غير موجود في نص التسجيل. راجعه يدويًا.",
      "حُذفت الأدوية من اقتراح «القرار النهائي» لأنها تخص العلاج فقط. راجعها يدويًا.",
    ]);
  });
  it("returns its own output unchanged when validated again", () => {
    const first = validateMedicalProposals(
      {
        proposals: [
          { ...proposal, field: "complaints", sources: ["صداع من أسبوعين", "غير موجود"] },
          { field: "diagnosis", text: "Migraine", sources: ["صداع"], speaker: "uncertain" },
          { field: "treatment", text: "Vigamox", sources: ["Vigamox"], speaker: "doctor", medications: [medicine("Tobrex", "Tobrex")] },
        ],
        warnings: [],
      },
      visit,
    );
    expect(validateMedicalProposals(first, visit)).toEqual(first);
    const field = validateMedicalProposals(
      { proposals: [{ ...proposal, field: "diagnosis" }], warnings: [] },
      fieldInput,
    );
    expect(validateMedicalProposals(field, fieldInput)).toEqual(field);
  });
  it("accepts full-visit supported fields and an explicit doctor decision", () => {
    const input = {
      kind: "conversation",
      mode: "dictation",
      transcript: "صداع من أسبوعين. متابعة بعد شهر",
    } as const;
    expect(
      validateMedicalProposals(
        {
          proposals: [
            { ...proposal, field: "complaints" },
            {
              field: "decision",
              text: "متابعة بعد شهر",
              sources: ["متابعة بعد شهر"],
              speaker: "doctor",
            },
          ],
          warnings: [],
        },
        input,
      ).proposals,
    ).toHaveLength(2);
  });
  it("rejects extra output instructions and blank input", () => {
    expect(() =>
      validateMedicalProposals(
        { proposals: [], warnings: [], save: true },
        fieldInput,
      ),
    ).toThrow();
    expect(
      medicalTranscriptSchema.safeParse({ ...fieldInput, transcript: " " })
        .success,
    ).toBe(false);
  });
});
