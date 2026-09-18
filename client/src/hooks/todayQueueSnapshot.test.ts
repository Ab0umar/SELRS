import { beforeEach, describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
const useQuery = vi.hoisted(() => vi.fn());
vi.mock("@/lib/trpc", () => ({ trpc: { medical: { getTodayPatientsByQueueStatus: { useQuery } } } }));
import {
  buildTodayQueueSnapshot,
  useTodayQueuePatientsMerged,
  type TodayQueuePatient,
} from "./useTodayQueuePatientsMerged";
import { QueueLoadStatus } from "@/components/today/QueueLoadStatus";

describe("queue query and failure presentation", () => {
  beforeEach(() => vi.clearAllMocks());
  function renderQueue(data: TodayQueuePatient[] | undefined, isError: boolean) {
    const refetch = vi.fn().mockResolvedValue(undefined);
    useQuery.mockReturnValue({ data, isError, isLoading: false, isFetching: false, dataUpdatedAt: data ? 1 : 0, refetch });
    let result!: ReturnType<typeof useTodayQueuePatientsMerged>;
    function Harness() {
      result = useTodayQueuePatientsMerged("2026-09-11");
      return createElement(QueueLoadStatus, result);
    }
    const html = renderToStaticMarkup(createElement(Harness));
    return { result, html };
  }

  it("makes one unfiltered date query and retains a ten-second refresh", () => {
    renderQueue([], false);
    expect(useQuery).toHaveBeenCalledExactlyOnceWith({ date: "2026-09-11" }, expect.objectContaining({ staleTime: 10000, refetchInterval: 10000 }));
  });

  it("shows an initial error rather than claiming an empty successful queue", () => {
    const { result, html } = renderQueue(undefined, true);
    expect(result.hasData).toBe(false);
    expect(html).toContain('role="alert"');
    expect(html).toContain("تعذر تحميل قائمة المرضى");
    expect(html).toContain("إعادة المحاولة");
  });

  it("keeps cached rows and labels them stale when a refresh fails", () => {
    const { result, html } = renderQueue([{ id: 7, queueStatus: "pentacam" }], true);
    expect(result.merged).toHaveLength(1);
    expect(result.hasData).toBe(true);
    expect(html).toContain("آخر بيانات محفوظة");
    expect(html).toContain("آخر تحديث");
  });

  it("distinguishes a cached empty result from never having loaded data", () => {
    expect(renderQueue([], true).result.hasData).toBe(true);
    expect(renderQueue([], false).html).toBe("");
  });

  it("disables retry while a refresh is in flight", () => {
    const html = renderToStaticMarkup(createElement(QueueLoadStatus, {
      isError: true, hasData: false, isFetching: true, dataUpdatedAt: 0, refetch: vi.fn(),
    }));
    expect(html).toContain('disabled=""');
    expect(html).toContain("جارٍ إعادة المحاولة");
  });
});

describe("daily queue snapshot presentation", () => {
  it("keeps stage membership but counts each patient once using existing priority", () => {
    const rows: TodayQueuePatient[] = [
      { id: 1, queueStatus: "checkedIn" },
      { id: 1, queueStatus: "treated" },
      { id: 2, queueStatus: "pentacam" },
      { id: 3, queueStatus: "clinic1" },
    ];
    const snapshot = buildTodayQueueSnapshot(rows);
    expect(snapshot.merged).toHaveLength(3);
    expect(snapshot.merged.find((row) => row.id === 1)?.queueStatus).toBe(
      "treated",
    );
    expect(snapshot.byStatus.checkedIn).toHaveLength(1);
    expect(snapshot.byStatus.clinic).toHaveLength(2);
  });

  it("filters external patients consistently from totals and stage lists", () => {
    const rows: TodayQueuePatient[] = [
      { id: 1, queueStatus: "checkedIn", locationType: "external" },
      { id: 2, queueStatus: "pentacam", serviceType: "pentacam_external" },
      { id: 3, queueStatus: "clinic1", locationType: "center" },
    ];
    expect(buildTodayQueueSnapshot(rows).merged.map((row) => row.id)).toEqual([
      3,
    ]);
    expect(buildTodayQueueSnapshot(rows).byStatus.pentacam).toEqual([]);
    expect(buildTodayQueueSnapshot(rows, true).merged).toHaveLength(3);
  });

  it("returns empty totals and groups for a successful empty response", () => {
    const snapshot = buildTodayQueueSnapshot([]);
    expect(snapshot.merged).toEqual([]);
    expect(
      Object.values(snapshot.byStatus).every((rows) => rows.length === 0),
    ).toBe(true);
  });
});
