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
    expect(result.warnings[0]).toContain("Final decision");
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
  it("rejects a second field from a single-field recording", () => {
    expect(() =>
      validateMedicalProposals(
        { proposals: [{ ...proposal, field: "history" }], warnings: [] },
        fieldInput,
      ),
    ).toThrow("scope");
  });
  it("rejects sources that were not spoken", () => {
    expect(() =>
      validateMedicalProposals(
        { proposals: [{ ...proposal, sources: ["مياه بيضاء"] }], warnings: [] },
        fieldInput,
      ),
    ).toThrow("source");
  });
  it("rejects duplicate destinations", () => {
    expect(() =>
      validateMedicalProposals(
        { proposals: [proposal, proposal], warnings: [] },
        fieldInput,
      ),
    ).toThrow("Duplicate");
  });
  it("requires a doctor statement for full-visit clinical decisions", () => {
    expect(() =>
      validateMedicalProposals(
        { proposals: [{ ...proposal, field: "diagnosis" }], warnings: [] },
        {
          kind: "conversation",
          mode: "conversation",
          transcript: fieldInput.transcript,
        },
      ),
    ).toThrow("doctor statement");
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
