import { beforeEach, describe, expect, it, vi } from "vitest";
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
  processManusGenerationJobs,
  startManusGeneration,
} from "../services/marketing/manusGeneration.service";

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
});
describe("durable Manus generation", () => {
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
    expect(updates).toEqual([]);
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
});
