import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("../_core/env", () => ({ ENV: { manusApiKey: "test-key" } }));
import {
  createManusTask,
  readManusTask,
  downloadManusFile,
  manusPostSchema,
  validateManusDownloadUrl,
} from "../services/marketing/manusClient";

afterEach(() => vi.unstubAllGlobals());
describe("Manus API contract", () => {
  it("creates a private task with connectors explicitly disabled", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ ok: true, task_id: "task-1" })),
      );
    vi.stubGlobal("fetch", fetchMock);
    expect(await createManusTask("Write one draft")).toEqual({
      task_id: "task-1",
    });
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.share_visibility).toBe("private");
    expect(body.message.connectors).toEqual([]);
    expect(body.message.content).toBe("Write one draft");
  });
  it("keeps background completion unknown when Manus omits the flag", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({ ok: true, task: { status: "stopped" } }),
          ),
        )
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ ok: true, messages: [] })),
        ),
    );
    expect(
      (await readManusTask("task-1")).has_running_background_jobs,
    ).toBeUndefined();
  });
  it("returns result attachments rather than opening/progress attachments", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({
              ok: true,
              task: { status: "stopped", has_running_background_jobs: false },
            }),
          ),
        )
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({
              ok: true,
              messages: [
                {
                  assistant_message: {
                    delivery_kind: "progress",
                    attachments: [
                      {
                        filename: "old.png",
                        url: "https://manuscdn.com/old.png",
                      },
                    ],
                  },
                },
                {
                  assistant_message: {
                    delivery_kind: "result",
                    attachments: [
                      {
                        filename: "post.json",
                        url: "https://manuscdn.com/post.json",
                      },
                    ],
                  },
                },
              ],
            }),
          ),
        ),
    );
    expect((await readManusTask("task-1")).attachments[0].filename).toBe(
      "post.json",
    );
  });
  it("does not expose provider error messages or credentials", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          new Response(
            JSON.stringify({
              ok: false,
              error: {
                code: "unauthenticated",
                message: "sensitive provider payload",
              },
            }),
            { status: 401 },
          ),
        ),
    );
    await expect(createManusTask("test")).rejects.toThrow(
      "401 (unauthenticated)",
    );
  });
  it.each([
    "http://manuscdn.com/a",
    "https://127.0.0.1/a",
    "https://manuscdn.com.attacker.test/a",
    "https://user:pass@manuscdn.com/a",
    "https://manuscdn.com:8080/a",
  ])("rejects unsafe download URL %s", (value) => {
    expect(() => validateManusDownloadUrl(value)).toThrow();
  });
  it("rejects redirects outside trusted Manus hosts", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          new Response(null, {
            status: 302,
            headers: { location: "http://127.0.0.1/private" },
          }),
        ),
    );
    await expect(
      downloadManusFile("https://private-us-east-1.manuscdn.com/image.png"),
    ).rejects.toThrow();
  });
  it("bounds downloaded file size", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("oversized")),
    );
    await expect(
      downloadManusFile("https://manuscdn.com/post.json", 2),
    ).rejects.toThrow("أكبر");
  });
  it("validates real post field types and database length limits", () => {
    const good = { title: "بوست", content: "نص", cta: "", hashtags: "" };
    expect(manusPostSchema.parse(good).idea).toBe("");
    expect(manusPostSchema.safeParse({ ...good, content: {} }).success).toBe(
      false,
    );
    expect(
      manusPostSchema.safeParse({ ...good, cta: "a".repeat(501) }).success,
    ).toBe(false);
  });
});
