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
      "Retry checking",
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
        "unavailable or expired",
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
      ).rejects.toThrow("disabled pending confirmation");
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
  });
  it("starts a new task only after an explicit resubmission of a terminal failure", async () => {
    const first = await startMedicalProposals(owner,input);
    vi.mocked(downloadManusFile).mockResolvedValueOnce(Buffer.from('{"proposals":[{"field":"diagnosis","text":"Unsupported","sources":["unrelated"],"speaker":"doctor"}],"warnings":[]}'));
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
      "unavailable",
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
  it("fails closed on an out-of-scope result without returning its content", async () => {
    vi.mocked(downloadManusFile).mockResolvedValue(
      Buffer.from(
        JSON.stringify({
          proposals: [
            {
              field: "history",
              text: "secret fabricated history",
              sources: [input.transcript],
              speaker: "patient",
            },
          ],
          warnings: [],
        }),
      ),
    );
    const { jobId } = await startMedicalProposals(owner, input);
    expect(await readMedicalProposals(owner, jobId)).toEqual({
      status: "failed",
      message:
        "Manus returned a proposal outside the selected recording scope. No correction applied.",
    });
  });
  it.each([
    ["missing file", "Manus did not return medical-proposals.json"],
    ["download", "The Manus result file could not be downloaded"],
    ["json", "The Manus result file is not valid JSON"],
    [
      "structure",
      "The Manus result does not match the required proposal structure",
    ],
    [
      "source",
      "A Manus supporting quote does not exactly match the transcript",
    ],
    ["duplicate", "Manus returned more than one proposal for the same field"],
    ["speaker", "A Manus clinical decision is not attributed to the doctor"],
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
                  ...(failure === "source"
                    ? { sources: ["fabricated private quote"] }
                    : {}),
                  ...(failure === "speaker" ? { field: "diagnosis" } : {}),
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
      const recording =
        failure === "speaker"
          ? ({
              kind: "conversation",
              mode: "conversation",
              transcript: input.transcript,
            } as const)
          : input;
      const { jobId } = await startMedicalProposals(owner, recording);
      const expected = {
        status: "failed",
        message: `${reason}. No correction applied.`,
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
    ).rejects.toThrow("already running");
    expect(createManusTask).toHaveBeenCalledTimes(1);
  });
  it("does not repeat an ambiguous billed creation request", async () => {
    vi.mocked(createManusTask).mockRejectedValueOnce(
      new Error("provider secret"),
    );
    await expect(startMedicalProposals(owner, input)).rejects.toThrow(
      "could not confirm",
    );
    await startMedicalProposals(owner, input);
    expect(createManusTask).toHaveBeenCalledTimes(1);
  });
  it("provides retryable status checking without starting another task", async () => {
    const { jobId } = await startMedicalProposals(owner, input);
    vi.mocked(readManusTask).mockRejectedValueOnce(
      new Error("private provider details"),
    );
    await expect(readMedicalProposals(owner, jobId)).rejects.toThrow(
      "Retry checking",
    );
    expect((await readMedicalProposals(owner, jobId)).status).toBe("complete");
    expect(createManusTask).toHaveBeenCalledTimes(1);
  });
});
