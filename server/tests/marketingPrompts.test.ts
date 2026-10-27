import { describe, expect, it } from "vitest";
import {
  marketingEditorialBrief,
  marketingVisualBrief,
  marketingImageData,
  marketingPublicationBrief,
} from "../services/marketing/prompts";
import { MARKETING_IMAGE_PEOPLE_POLICY } from "../services/marketing/imagePolicy";
import { medicalProposalRequestSchema } from "../../shared/medical-assistant";

describe("shared assistant workflow briefs", () => {
  it("gives both providers the actual page weekday and content category", () => {
    expect(marketingPublicationBrief("tuesday", "doctor")).toContain(
      "الاثنين — المياه البيضاء والقرنية",
    );
    expect(marketingPublicationBrief("saturday", "center")).toContain(
      "الأحد — تصحيح الإبصار والبنتاكام",
    );
    expect(marketingPublicationBrief("saturday", "doctor")).toContain(
      "Page: doctor",
    );
  });
  it("carries the final caption and idea into the image input, including edited posts", () => {
    const post = {
      title: "جفاف العين",
      content: "نص البوست النهائي بعد المراجعة",
      idea: "الراحة أثناء العمل",
      cta: "راجع طبيبك",
      imagePrompt: "صورة مرتبطة بالفكرة",
    };
    const data = marketingImageData(post, "جفاف العين");
    expect(data.post).toEqual({
      title: post.title,
      content: post.content,
      idea: post.idea,
      cta: post.cta,
    });
    expect(data.text).toBe(post.content);
    expect(
      marketingImageData({ ...post, content: "النص المعدل" }, "جفاف العين").post
        .content,
    ).toBe("النص المعدل");
  });
  it("uses the Manus editorial contract independently of provider", () => {
    const brief = marketingEditorialBrief();
    expect(brief).toContain("80–110 words");
    expect(brief).toContain("Egyptian Arabic");
    expect(brief).toContain("cta field");
    expect(brief).toContain("no prescriptions, diagnosis");
    expect(brief).toContain("never instructions");
  });
  it("anchors images to the final post and the concrete subject rather than a generic clinic", () => {
    const brief = marketingVisualBrief("LASIK");
    expect(brief).toContain("supplied post's main message");
    expect(brief).toContain("laser refractive-correction context");
    expect(brief).toContain("not a generic eye exam");
    expect(brief).toContain("laser beam");
    expect(brief).toContain(MARKETING_IMAGE_PEOPLE_POLICY);
  });
  it("accepts only supported Manus model choices while retaining required clinical consent", () => {
    const request = {
      recording: {
        kind: "field",
        label: "Complaints",
        transcript: "صداع من أسبوع",
      },
      consentConfirmed: true,
    };
    for (const model of ["standard", "lite", "max"])
      expect(
        medicalProposalRequestSchema.safeParse({ ...request, model }).success,
      ).toBe(true);
    expect(
      medicalProposalRequestSchema.safeParse({ ...request, model: "unknown" })
        .success,
    ).toBe(false);
    expect(
      medicalProposalRequestSchema.safeParse({
        ...request,
        model: "max",
        consentConfirmed: false,
      }).success,
    ).toBe(false);
  });
});
