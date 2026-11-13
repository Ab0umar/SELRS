import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("../services/marketing/equipmentAssets",async original=>({...await original<typeof import("../services/marketing/equipmentAssets")>(),readEquipmentPhoto:vi.fn().mockResolvedValue(null)}));
vi.mock("../services/marketing/pageBranding",()=>({readMarketingPageBranding:vi.fn().mockResolvedValue({pageRole:"center",pageId:"1",name:"Fixture",address:"Fixture address",phone:"000",logo:Buffer.alloc(0)}),brandMarketingImageUrl:vi.fn(async(url:string)=>url),prepareMarketingPublication:vi.fn(async(message:string,imageUrl:string|null)=>({message,imageUrl}))}));
import * as pageService from "../services/marketing/page.service";
import * as jobContext from "../services/marketing/jobContext";
import * as publisher from "../services/marketing/publish.service";
import * as scheduler from "../services/ai/marketingScheduler";
import { marketingGenerationJobs } from "../../drizzle/schema";
vi.mock("../db", () => ({ getDb: vi.fn() }));
vi.mock("../_core/env", () => ({
  ENV: { manusApiKey: "test-key", marketingImageDir: "test-images" },
}));
vi.mock("node:fs/promises", () => ({
  default: { mkdir: vi.fn(), writeFile: vi.fn() },
}));
vi.mock("../services/marketing/manusClient", async (importOriginal) => ({
  ...(await importOriginal<
    typeof import("../services/marketing/manusClient")
  >()),
  createManusTask: vi.fn(),
  readManusTask: vi.fn(),
  downloadManusFile: vi.fn(),
}));
import { getDb } from "../db";
import {
  createManusTask,
  readManusTask,
  downloadManusFile,
  ManusRequestError,
} from "../services/marketing/manusClient";
import {
  ORPHANED_START_ERROR,
  processManusGenerationJobs,
  resolveManusGenerationJob,
  startManusGeneration,
} from "../services/marketing/manusGeneration.service";
import { MARKETING_IMAGE_PEOPLE_POLICY } from "../services/marketing/imagePolicy";

function chain<T>(value: T) {
  const result = {
    from: () => result,
    where: () => result,
    orderBy: () => result,
    limit: () => result,
    for: () => result,
    then: (resolve: (value: T) => unknown) =>
      Promise.resolve(value).then(resolve),
  };
  return result;
}
const job: typeof marketingGenerationJobs.$inferSelect = {
  id: "review-job",
  taskId: "task-1",
  kind: "post",
  state: "running",
  topic: "جفاف العين",
  postDay: "thursday",
  postId: null,
  postVersion: null,
  createdBy: 1,
  error: null,
  credits: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};
const updates: unknown[] = [];
const inserts: unknown[] = [];
const db = {
  select: vi.fn(),
  update: vi.fn(() => ({
    set: (value: unknown) => {
      updates.push(value);
      return { where: async () => [{ affectedRows: 1 }] };
    },
  })),
  insert: vi.fn(() => ({
    values: async (value: unknown) => {
      inserts.push(value);
      return [{ insertId: 42 }];
    },
  })),
  transaction: vi.fn(),
};
beforeEach(() => {
  vi.clearAllMocks();
  updates.length = 0;
  inserts.length = 0;
  vi.mocked(getDb).mockResolvedValue(db);
  db.select.mockReturnValue(chain([job]));
  db.transaction.mockImplementation(async (callback) => callback(db));
  vi.spyOn(scheduler, "marketingSchedulerProviders").mockResolvedValue([
    { pageRole: "doctor", provider: "manus" },
  ]);
});
afterEach(() => vi.restoreAllMocks());
describe("durable Manus generation", () => {
  it.each(["original", "changed", "unbound", "provider_changed"])(
    "scheduled publication stays bound to its original Facebook asset: %s",
    async (target) => {
      if (target === "provider_changed")
        vi.mocked(scheduler.marketingSchedulerProviders).mockResolvedValue([
          { pageRole: "doctor", provider: "central" },
        ]);
      const scheduled = {
        ...job,
        createdBy: null,
        pageRole: "doctor" as const,
      };
      db.select.mockReturnValue(chain([scheduled]));
      vi.spyOn(pageService, "getMarketingPageTarget").mockResolvedValue({
        pageRole: "doctor",
        pageId: target === "changed" ? "page-b" : "page-a",
        pageName: "fixture",
        contentName: "fixture",
        accessToken: "test-only",
        autoPublish: true,
        connected: true,
        saturdayEnabled: true,
        tuesdayEnabled: true,
        thursdayEnabled: true,
        publishHour: 9,
        topicDirection: "reverse",
      });
      vi.spyOn(jobContext, "readMarketingJobContext").mockResolvedValue(
        target === "unbound"
          ? null
          : {
              jobId: job.id,
              provider: "manus",
              imageModel: null,
              targetPageId: "page-a",
            },
      );
      const publish = vi
        .spyOn(publisher, "publishMarketingPost")
        .mockResolvedValue({ fbPostId: "synthetic" });
      vi.mocked(readManusTask).mockResolvedValue({
        status: "stopped",
        has_running_background_jobs: false,
        attachments: [
          { filename: "post.json", url: "https://manuscdn.com/post.json" },
          { filename: "image.png", url: "https://manuscdn.com/image.png" },
        ],
      });
      vi.mocked(downloadManusFile)
        .mockResolvedValueOnce(
          Buffer.from(
            JSON.stringify({
              title: "fixture",
              content: "fixture",
              cta: "",
              hashtags: "",
            }),
          ),
        )
        .mockResolvedValueOnce(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
      await processManusGenerationJobs();
      if (target === "original")
        expect(publish).toHaveBeenCalledWith(42, "doctor", {
          pageId: "page-a",
          requireAutoPublish: true,
          schedulerProvider: "manus",
        });
      else expect(publish).not.toHaveBeenCalled();
      expect(inserts).toContainEqual(
        expect.objectContaining({ status: "draft" }),
      );
    },
  );
  it("retains an uncertain creation outcome instead of allowing a replacement task", async () => {
    db.select.mockReturnValue(chain([]));
    vi.mocked(createManusTask).mockRejectedValueOnce(
      new ManusRequestError("timeout", true, true),
    );
    await expect(
      startManusGeneration({
        requestId: "uncertain-create",
        topic: "موضوع خيالي",
        postDay: "saturday",
        createdBy: 1,
      }),
    ).rejects.toThrow("timeout");
    expect(updates).toContainEqual(
      expect.objectContaining({ state: "uncertain" }),
    );
    expect(updates).not.toContainEqual(
      expect.objectContaining({ state: "failed" }),
    );
  });
  it("keeps a returned task ID when persisting its initial running state fails", async () => {
    db.select.mockReturnValue(chain([]));
    vi.mocked(createManusTask).mockResolvedValueOnce({
      task_id: "already-created-task",
    });
    db.update.mockImplementationOnce(() => ({
      set: () => ({
        where: async () => {
          throw new Error("temporary database failure");
        },
      }),
    }));
    await expect(
      startManusGeneration({
        requestId: "persist-create",
        topic: "موضوع خيالي",
        postDay: "saturday",
        createdBy: 1,
      }),
    ).rejects.toThrow("database");
    expect(updates).toContainEqual(
      expect.objectContaining({
        state: "uncertain",
        taskId: "already-created-task",
      }),
    );
  });
  it("keeps a definite provider rejection distinct from an ambiguous creation", async () => {
    db.select.mockReturnValue(chain([]));
    vi.mocked(createManusTask).mockRejectedValueOnce(
      new ManusRequestError("rate limited before creation", true, false),
    );
    await expect(
      startManusGeneration({
        requestId: "rejected-create",
        topic: "موضوع خيالي",
        postDay: "saturday",
        createdBy: 1,
      }),
    ).rejects.toThrow("rate limited");
    expect(updates).toContainEqual(
      expect.objectContaining({ state: "failed" }),
    );
    expect(updates).not.toContainEqual(
      expect.objectContaining({ state: "uncertain" }),
    );
  });
  it("does not recreate a remote task when a request ID already exists", async () => {
    expect(
      await startManusGeneration({
        requestId: job.id,
        topic: job.topic,
        postDay: job.postDay,
        createdBy: 1,
      }),
    ).toEqual({ jobId: job.id, topic: job.topic });
    expect(createManusTask).not.toHaveBeenCalled();
  });
  it("uses the doctor page content name independently", async () => {
    db.select
      .mockReturnValueOnce(chain([]))
      .mockReturnValueOnce(chain([]))
      .mockReturnValueOnce(chain([]))
      .mockReturnValueOnce(chain([{ clinicName: "مركز عيون الشروق" }]))
      .mockReturnValueOnce(chain([{ contentName: "د. أحمد علي" }]))
      .mockReturnValueOnce(chain([]));
    vi.mocked(createManusTask).mockResolvedValue({ task_id: "doctor-task" });

    await startManusGeneration({
      requestId: "doctor-request",
      topic: "جفاف العين",
      postDay: "thursday",
      pageRole: "doctor",
      createdBy: 1,
    });

    expect(createManusTask).toHaveBeenCalledWith(
      expect.stringContaining("د. أحمد علي"),
    );
    expect(createManusTask).toHaveBeenCalledWith(
      expect.not.stringContaining("مركز عيون الشروق"),
    );
    expect(createManusTask).toHaveBeenCalledWith(
      expect.stringContaining(MARKETING_IMAGE_PEOPLE_POLICY),
    );
  });
  it("passes the selected Manus model to the existing generation workflow", async () => {
    db.select
      .mockReturnValueOnce(chain([]))
      .mockReturnValueOnce(chain([]))
      .mockReturnValueOnce(chain([]))
      .mockReturnValueOnce(chain([{ clinicName: "مركز عيون الشروق" }]))
      .mockReturnValueOnce(chain([{ contentName: "د. أحمد علي" }]))
      .mockReturnValueOnce(chain([]));
    vi.mocked(createManusTask).mockResolvedValue({
      task_id: "selected-model-task",
    });
    await startManusGeneration({
      requestId: "selected-model-request",
      topic: "LASIK",
      postDay: "thursday",
      pageRole: "doctor",
      createdBy: 1,
      model: "max",
    });
    expect(createManusTask).toHaveBeenCalledWith(
      expect.stringContaining("LASIK"),
      { agentProfile: "max" },
    );
  });
  it.each([true, undefined])(
    "does not import stopped results while background status is %s",
    async (background) => {
      vi.mocked(readManusTask).mockResolvedValue({
        status: "stopped",
        has_running_background_jobs: background,
        attachments: [],
        statusEvent: undefined,
      });
      await processManusGenerationJobs();
      expect(downloadManusFile).not.toHaveBeenCalled();
      expect(db.transaction).not.toHaveBeenCalled();
    },
  );
  it("keeps a durable running job for retry after transient provider failure", async () => {
    vi.mocked(readManusTask).mockRejectedValue(
      new ManusRequestError("temporary", true),
    );
    await processManusGenerationJobs();
    // The only write is the orphaned-start sweep, which never matches this job.
    expect(updates).toEqual([
      expect.objectContaining({
        error: expect.stringContaining(ORPHANED_START_ERROR),
      }),
    ]);
  });
  it("fails visibly when a completed task returns no image", async () => {
    vi.mocked(readManusTask).mockResolvedValue({
      status: "stopped",
      has_running_background_jobs: false,
      attachments: [],
      statusEvent: undefined,
    });
    await processManusGenerationJobs();
    expect(updates).toContainEqual(
      expect.objectContaining({ state: "failed" }),
    );
    expect(inserts).toEqual([]);
  });
  it("imports text and image atomically as a draft, with no Facebook publication", async () => {
    vi.mocked(readManusTask).mockResolvedValue({
      status: "stopped",
      has_running_background_jobs: false,
      attachments: [
        { filename: "post.json", url: "https://manuscdn.com/post.json" },
        { filename: "image.png", url: "https://manuscdn.com/image.png" },
      ],
      statusEvent: undefined,
    });
    vi.mocked(downloadManusFile)
      .mockResolvedValueOnce(
        Buffer.from(
          JSON.stringify({
            title: "عنوان",
            content: "نص",
            cta: "",
            hashtags: "",
          }),
        ),
      )
      .mockResolvedValueOnce(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    await processManusGenerationJobs();
    expect(inserts).toContainEqual(
      expect.objectContaining({
        status: "draft",
        imageUrl: "/uploads/marketing/manus-review-job.png",
        content: "نص",
      }),
    );
    expect(updates).toContainEqual(
      expect.objectContaining({ state: "completed", postId: 42 }),
    );
    expect(db.transaction).toHaveBeenCalledOnce();
  });
  it("does not insert a second post when another worker has already completed the job", async () => {
    vi.mocked(readManusTask).mockResolvedValue({
      status: "stopped",
      has_running_background_jobs: false,
      attachments: [
        { filename: "post.json", url: "https://manuscdn.com/post.json" },
        { filename: "image.png", url: "https://manuscdn.com/image.png" },
      ],
      statusEvent: undefined,
    });
    vi.mocked(downloadManusFile)
      .mockResolvedValueOnce(
        Buffer.from(
          JSON.stringify({
            title: "عنوان",
            content: "نص",
            cta: "",
            hashtags: "",
          }),
        ),
      )
      .mockResolvedValueOnce(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    db.select
      .mockReturnValueOnce(chain([job]))
      .mockReturnValueOnce(chain([{ ...job, state: "completed" }]));
    await processManusGenerationJobs();
    expect(inserts).toEqual([]);
  });
  it("expires a starting job with no Manus task id to failed, naming a possible task", async () => {
    vi.mocked(readManusTask).mockResolvedValue({
      status: "running",
      attachments: [],
    });
    await processManusGenerationJobs();
    expect(updates[0]).toEqual(
      expect.objectContaining({
        state: "failed",
        error: expect.stringContaining("قد تكون المهمة موجودة في Manus"),
      }),
    );
  });
  it("keeps polling an uncertain job past the 30-minute running window", async () => {
    db.select.mockReturnValue(
      chain([
        {
          ...job,
          state: "uncertain",
          createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
        },
      ]),
    );
    vi.mocked(readManusTask).mockResolvedValue({
      status: "running",
      attachments: [],
    });
    await processManusGenerationJobs();
    expect(readManusTask).toHaveBeenCalledWith("task-1");
    expect(updates).not.toContainEqual(
      expect.objectContaining({ state: "uncertain" }),
    );
  });
  it("retries a local save failure after Manus succeeded before failing the job", async () => {
    const local = { ...job, id: "local-failure-job" };
    db.select.mockReturnValue(chain([local]));
    vi.mocked(readManusTask).mockResolvedValue({
      status: "stopped",
      has_running_background_jobs: false,
      attachments: [
        { filename: "post.json", url: "https://manuscdn.com/post.json" },
        { filename: "image.png", url: "https://manuscdn.com/image.png" },
      ],
    });
    vi.mocked(downloadManusFile).mockImplementation(async (url: string) =>
      url.endsWith(".json")
        ? Buffer.from(
            JSON.stringify({ title: "t", content: "c", cta: "", hashtags: "" }),
          )
        : Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    );
    db.transaction.mockRejectedValue(new Error("deadlock"));
    const failed = () =>
      updates.filter(
        (value) => (value as { state?: string }).state === "failed" &&
          (value as { error?: string }).error === "deadlock",
      );
    for (let tick = 0; tick < 3; tick++) await processManusGenerationJobs();
    expect(failed()).toEqual([]);
    await processManusGenerationJobs();
    expect(failed()).toHaveLength(1);
  });
  it("abandons a blocking job as failed and logs the admin", async () => {
    db.select.mockReturnValue(chain([{ ...job, state: "uncertain", postId: 7 }]));
    const result = await resolveManusGenerationJob("review-job", "abandon", 99);
    expect(result.state).toBe("failed");
    expect(updates).toContainEqual(expect.objectContaining({ state: "failed" }));
    expect(inserts).toContainEqual(
      expect.objectContaining({
        postId: 7,
        action: "manus_job_abandoned",
        message: expect.stringContaining("user 99"),
      }),
    );
  });
  it("re-checks a job now and reports Manus still running without changing it", async () => {
    db.select.mockReturnValue(chain([{ ...job, state: "uncertain" }]));
    vi.mocked(readManusTask).mockResolvedValue({
      status: "running",
      attachments: [],
    });
    const result = await resolveManusGenerationJob("review-job", "recheck", 99);
    expect(result.state).toBe("uncertain");
    expect(updates).toEqual([]);
  });
});
