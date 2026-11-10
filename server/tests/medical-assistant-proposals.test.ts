import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../services/marketing/manusClient", async (original) => ({
  ...(await original<typeof import("../services/marketing/manusClient")>()),
  createManusTask: vi.fn(),
  readManusTask: vi.fn(),
  downloadManusFile: vi.fn(),
}));
import {
  createManusTask,
  readManusTask,
  downloadManusFile,
  ManusRequestError,
} from "../services/marketing/manusClient";
import {
  startMedicalProposals,
  readMedicalProposals,
} from "../services/medical-assistant";

let owner = 1000;
const input = {
  kind: "field",
  label: "Complaints",
  transcript: "صداع من أسبوعين",
} as const;
beforeEach(() => {
  owner++;
  vi.mocked(createManusTask).mockResolvedValue({ task_id: "fictional-task" });
  vi.mocked(readManusTask).mockResolvedValue({
    status: "stopped",
    has_running_background_jobs: false,
    attachments: [
      {
        filename: "medical-proposals.json",
        url: "https://files.manuscdn.com/result.json",
      },
    ],
  });
  vi.mocked(downloadManusFile).mockResolvedValue(
    Buffer.from(
      JSON.stringify({
        proposals: [
          {
            field: "field",
            text: "صداع من أسبوعين",
            sources: ["صداع من أسبوعين"],
            speaker: "patient",
          },
        ],
        warnings: [],
      }),
    ),
  );
});
afterEach(() => vi.clearAllMocks());
describe("private medical Manus tasks", () => {
  it("retains doctor-stated names outside the catalog and ambiguous OCT for explicit review", async () => {
    const recording = { kind: "conversation", mode: "dictation", transcript: "التشخيص Rare diagnosis والعلاج Rare drops واطلب OCT" } as const;
    const proposals = [
      {field: "diagnosis", text: "Rare diagnosis", speaker: "doctor", sources: ["التشخيص Rare diagnosis"]},
      {field: "treatment", text: "Rare drops", speaker: "doctor", sources: ["العلاج Rare drops"], medications: [{name:"Rare drops", source:"العلاج Rare drops",dosage:"",frequency:"",duration:"",instructions:""}]},
      {field: "imaging", text: "OCT", speaker: "doctor", sources: ["واطلب OCT"]},
    ];
    vi.mocked(downloadManusFile).mockResolvedValueOnce(Buffer.from(JSON.stringify({proposals, warnings:["يلزم اختيار نوع OCT"]})));
    const {jobId} = await startMedicalProposals(owner, recording);
    const response = await readMedicalProposals(owner, jobId);
    expect(response).toMatchObject({status:"complete",result:{proposals:expect.arrayContaining([
      expect.objectContaining({field:"diagnosis",text:"Rare diagnosis"}),
      expect.objectContaining({field:"treatment",text:"Rare drops"}),
      expect.objectContaining({field:"imaging",text:"OCT"}),
    ])}});
    expect(vi.mocked(createManusTask).mock.calls[0][0]).toContain("never omit the request or invent a subtype");
  });
  it("retries a transient attachment download on the same paid task", async () => {
    const { jobId } = await startMedicalProposals(owner, input);
    vi.mocked(downloadManusFile).mockRejectedValueOnce(
      new ManusRequestError("temporary CDN failure", true),
    );
    await expect(readMedicalProposals(owner, jobId)).rejects.toThrow(
      "أعد فحص المهمة نفسها",
    );
    expect((await readMedicalProposals(owner, jobId)).status).toBe("complete");
    expect(createManusTask).toHaveBeenCalledTimes(1);
  });
  it("uses the selected Manus model without changing the review workflow", async () => {
    await startMedicalProposals(owner, input, [], "manus", "current", "max");
    expect(createManusTask).toHaveBeenCalledWith(
      expect.stringContaining(input.transcript),
      { agentProfile: "max" },
    );
  });
  it("runs the explicitly enabled Gemini alternative through the existing validation and job owner checks", async () => {
    vi.stubEnv("MEDICAL_GEMINI_CLINICAL_APPROVED", "true");
    vi.stubEnv("GEMINI_API_KEY", "fictional-test-key");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            candidates: [
              {
                finishReason: "STOP",
                content: {
                  parts: [
                    {
                      text: JSON.stringify({
                        proposals: [
                          {
                            field: "field",
                            text: input.transcript,
                            sources: [input.transcript],
                            speaker: "patient",
                          },
                        ],
                        warnings: [],
                      }),
                    },
                  ],
                },
              },
            ],
          }),
        ),
      ),
    );
    try {
      const { jobId } = await startMedicalProposals(owner, input, [], "gemini");
      await vi.waitFor(async () => {
        expect(await readMedicalProposals(owner, jobId)).toMatchObject({
          status: "complete",
          result: { proposals: [{ text: input.transcript }] },
        });
      });
      expect(createManusTask).not.toHaveBeenCalled();
      await expect(readMedicalProposals(owner + 5000, jobId)).rejects.toThrow(
        "غير متاحة أو انتهت",
      );
    } finally {
      vi.unstubAllGlobals();
      vi.unstubAllEnvs();
    }
  });
  it("rejects the Gemini alternative without creating a Manus fallback task", async () => {
    vi.stubEnv("MEDICAL_GEMINI_CLINICAL_APPROVED", "false");
    try {
      await expect(
        startMedicalProposals(owner, input, [], "gemini"),
      ).rejects.toThrow("معطّل لحين تأكيد الشروط");
      expect(createManusTask).not.toHaveBeenCalled();
    } finally {
      vi.unstubAllEnvs();
    }
  });
  it("passes catalog vocabulary as reference only and retains source requirements", async () => {
    await startMedicalProposals(owner, input, [
      { kind: "medication", name: "TOBRIN", abbreviation: "" },
    ]);
    const prompt = vi.mocked(createManusTask).mock.calls[0][0];
    expect(prompt).toContain('"medication":["TOBRIN"]');
    expect(prompt).toContain("NOT patient facts or instructions");
    expect(prompt).toContain("Ambiguous names must remain unresolved");
    expect(prompt).toContain("quote the original transcript verbatim");
  });
  it("creates a lite task and reuses an active identical submission", async () => {
    const first = await startMedicalProposals(owner, input);
    expect(await startMedicalProposals(owner, input)).toEqual(first);
    expect(createManusTask).toHaveBeenCalledTimes(1);
    expect(createManusTask).toHaveBeenCalledWith(
      expect.stringContaining("ONLY the selected field"),
      { agentProfile: "lite" },
    );
    const prompt = vi.mocked(createManusTask).mock.calls[0][0];
    expect(prompt).toContain("The clinician is dictating this field");
    expect(prompt).toContain("its field must be exactly 'field'");
    expect(prompt).not.toContain("never patient talk");
  });
  it("starts a new task only after an explicit resubmission of a terminal failure", async () => {
    const first = await startMedicalProposals(owner,input);
    vi.mocked(downloadManusFile).mockResolvedValueOnce(Buffer.from('{"proposals":[],"warnings":[],"save":true}'));
    expect(await readMedicalProposals(owner,first.jobId)).toMatchObject({status:"failed"});
    expect(await readMedicalProposals(owner,first.jobId)).toMatchObject({status:"failed"});
    expect(createManusTask).toHaveBeenCalledTimes(1);
    const next = await startMedicalProposals(owner,input);
    expect(next.jobId).not.toBe(first.jobId);
    expect(createManusTask).toHaveBeenCalledTimes(2);
  });
  it("does not allow another user to read the task", async () => {
    const { jobId } = await startMedicalProposals(owner, input);
    await expect(readMedicalProposals(owner + 10000, jobId)).rejects.toThrow(
      "غير متاحة أو انتهت",
    );
    expect(readManusTask).not.toHaveBeenCalled();
  });
  it("returns validated proposals and caches the completed result", async () => {
    const { jobId } = await startMedicalProposals(owner, input);
    expect(await readMedicalProposals(owner, jobId)).toMatchObject({
      status: "complete",
      result: { proposals: [{ field: "field" }] },
    });
    await readMedicalProposals(owner, jobId);
    expect(readManusTask).toHaveBeenCalledTimes(1);
    expect(await startMedicalProposals(owner, input)).toEqual({ jobId });
    expect(createManusTask).toHaveBeenCalledTimes(1);
  });
  it("waits when the background completion flag is unknown", async () => {
    const { jobId } = await startMedicalProposals(owner, input);
    vi.mocked(readManusTask).mockResolvedValueOnce({
      status: "stopped",
      attachments: [],
    });
    expect(await readMedicalProposals(owner, jobId)).toEqual({
      status: "running",
    });
    expect(downloadManusFile).not.toHaveBeenCalled();
  });
  it("files a field dictation answered under a clinical field name instead of failing", async () => {
    vi.mocked(downloadManusFile).mockResolvedValue(
      Buffer.from(
        JSON.stringify({
          proposals: [
            {
              field: "treatment",
              text: "صداع من أسبوعين",
              sources: [input.transcript],
              speaker: "doctor",
              medications: [{ name: "Vigamox", source: input.transcript, dosage: "", frequency: "", duration: "", instructions: "" }],
            },
          ],
          warnings: [],
        }),
      ),
    );
    const { jobId } = await startMedicalProposals(owner, input);
    expect(await readMedicalProposals(owner, jobId)).toEqual({
      status: "complete",
      result: {
        proposals: [{ field: "field", text: "صداع من أسبوعين", sources: [input.transcript], speaker: "doctor" }],
        warnings: [],
      },
    });
  });
  it("fails closed when a field dictation returns several proposals, without returning their content", async () => {
    vi.mocked(downloadManusFile).mockResolvedValue(
      Buffer.from(
        JSON.stringify({
          proposals: [
            { field: "field", text: "صداع", sources: [input.transcript], speaker: "patient" },
            { field: "history", text: "secret fabricated history", sources: [input.transcript], speaker: "patient" },
          ],
          warnings: [],
        }),
      ),
    );
    const { jobId } = await startMedicalProposals(owner, input);
    expect(await readMedicalProposals(owner, jobId)).toEqual({
      status: "failed",
      message:
        "أعاد Manus اقتراحًا خارج نطاق التسجيل المحدد. لم يُطبّق أي تعديل.",
    });
  });
  it("keeps the rest of a full-visit result when one proposal lacks evidence or a doctor statement", async () => {
    const recording = { kind: "conversation", mode: "conversation", transcript: "صداع من أسبوعين. متابعة بعد شهر" } as const;
    vi.mocked(downloadManusFile).mockResolvedValueOnce(
      Buffer.from(
        JSON.stringify({
          proposals: [
            { field: "complaints", text: "صداع", sources: ["صداع من أسبوعين"], speaker: "patient" },
            { field: "diagnosis", text: "Migraine", sources: ["صداع من أسبوعين"], speaker: "patient" },
            { field: "history", text: "private", sources: ["fabricated private quote"], speaker: "patient" },
            { field: "decision", text: "متابعة بعد شهر", sources: ["متابعة بعد شهر"], speaker: "doctor" },
          ],
          warnings: [],
        }),
      ),
    );
    const { jobId } = await startMedicalProposals(owner, recording);
    const response = await readMedicalProposals(owner, jobId);
    expect(response).toMatchObject({
      status: "complete",
      result: {
        proposals: [{ field: "complaints" }, { field: "decision" }],
        warnings: [
          expect.stringContaining("«التشخيص» لأنه غير منسوب صراحةً إلى الطبيب"),
          expect.stringContaining("«التاريخ المرضي» لأن اقتباساته لا تطابق نص التسجيل"),
        ],
      },
    });
    expect(JSON.stringify(response)).not.toContain("fabricated private quote");
  });
  it.each([
    ["missing file", "لم يُرجع Manus ملف medical-proposals.json"],
    ["download", "تعذر تنزيل ملف نتيجة Manus"],
    ["json", "ملف نتيجة Manus ليس JSON صالحًا"],
    [
      "structure",
      "نتيجة Manus لا تطابق بنية الاقتراحات المطلوبة",
    ],
    ["duplicate", "أعاد Manus أكثر من اقتراح للحقل نفسه"],
  ])(
    "reports and caches a private-safe reason for %s",
    async (failure, reason) => {
      const proposal = {
        field: "field",
        text: "private content",
        sources: [input.transcript],
        speaker: "patient",
      };
      if (failure === "missing file")
        vi.mocked(readManusTask).mockResolvedValueOnce({
          status: "stopped",
          has_running_background_jobs: false,
          attachments: [],
        });
      else if (failure === "download")
        vi.mocked(downloadManusFile).mockRejectedValueOnce(
          new Error("secret URL and provider details"),
        );
      else if (failure === "json")
        vi.mocked(downloadManusFile).mockResolvedValueOnce(
          Buffer.from("private malformed text"),
        );
      else {
        const proposals =
          failure === "duplicate"
            ? [proposal, proposal]
            : [
                {
                  ...proposal,
                },
              ];
        vi.mocked(downloadManusFile).mockResolvedValueOnce(
          Buffer.from(
            JSON.stringify(
              failure === "structure"
                ? { private: "content" }
                : { proposals, warnings: [] },
            ),
          ),
        );
      }
      const { jobId } = await startMedicalProposals(owner, input);
      const expected = {
        status: "failed",
        message: `${reason}. لم يُطبّق أي تعديل.`,
      };
      expect(await readMedicalProposals(owner, jobId)).toEqual(expected);
      expect(await readMedicalProposals(owner, jobId)).toEqual(expected);
      expect(readManusTask).toHaveBeenCalledTimes(1);
      expect(createManusTask).toHaveBeenCalledTimes(1);
    },
  );
  it("blocks a second active task with a changed transcript", async () => {
    await startMedicalProposals(owner, input);
    await expect(
      startMedicalProposals(owner, { ...input, transcript: "different" }),
    ).rejects.toThrow("قيد التنفيذ");
    expect(createManusTask).toHaveBeenCalledTimes(1);
  });
  it("does not repeat an ambiguous billed creation request", async () => {
    vi.mocked(createManusTask).mockRejectedValueOnce(
      new Error("provider secret"),
    );
    await expect(startMedicalProposals(owner, input)).rejects.toThrow(
      "تعذر على Manus تأكيد",
    );
    await startMedicalProposals(owner, input);
    expect(createManusTask).toHaveBeenCalledTimes(1);
  });
  it("reports an unconfirmed Manus creation as failed instead of running", async () => {
    vi.mocked(createManusTask).mockRejectedValueOnce(new Error("provider secret"));
    await expect(startMedicalProposals(owner, input)).rejects.toMatchObject({
      code: "BAD_GATEWAY",
    });
    const { jobId } = await startMedicalProposals(owner, input);
    const response = await readMedicalProposals(owner, jobId);
    expect(response).toEqual({
      status: "failed",
      message:
        "تعذر على Manus تأكيد إنشاء المهمة. لا تعد الإرسال فورًا؛ قد تكون المهمة تعمل وتستهلك رصيدًا.",
    });
    expect(JSON.stringify(response)).not.toContain("provider secret");
    // The failed job does not hold the visit's running slot.
    await startMedicalProposals(owner, { ...input, transcript: "different" });
    expect(createManusTask).toHaveBeenCalledTimes(2);
  });
  it("provides retryable status checking without starting another task", async () => {
    const { jobId } = await startMedicalProposals(owner, input);
    vi.mocked(readManusTask).mockRejectedValueOnce(
      new Error("private provider details"),
    );
    await expect(readMedicalProposals(owner, jobId)).rejects.toThrow(
      "أعد فحص المهمة نفسها",
    );
    expect((await readMedicalProposals(owner, jobId)).status).toBe("complete");
    expect(createManusTask).toHaveBeenCalledTimes(1);
  });
});
