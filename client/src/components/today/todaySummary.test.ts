import { describe, expect, it } from "vitest";
import { formatCount, summarizeToday } from "./todaySummary";

describe("today summary helper", () => {
  it("should_return_all_zeros_and_no_nan_for_an_empty_queue", () => {
    expect(summarizeToday([], undefined)).toEqual({
      total: 0,
      treated: 0,
      waiting: 0,
      completionRate: 0,
      opsCount: 0,
    });
  });

  it("should_count_treated_and_waiting_from_mixed_queue_statuses", () => {
    const queue = [
      { queueStatus: "treated" },
      { queueStatus: "treated" },
      { queueStatus: "clinic1" },
      { queueStatus: "pentacam" },
      { queueStatus: undefined },
    ];
    const summary = summarizeToday(queue, undefined);
    expect(summary.total).toBe(5);
    expect(summary.treated).toBe(2);
    expect(summary.waiting).toBe(3);
    expect(summary.completionRate).toBe(40);
  });

  it("should_round_completion_rate_without_ever_producing_nan", () => {
    expect(summarizeToday([{ queueStatus: "clinic1" }], undefined).completionRate).toBe(0);
    expect(
      summarizeToday(
        [
          { queueStatus: "treated" },
          { queueStatus: "clinic1" },
          { queueStatus: "clinic1" },
        ],
        undefined,
      ).completionRate,
    ).toBe(33);
    expect(
      summarizeToday(
        [
          { queueStatus: "treated" },
          { queueStatus: "treated" },
          { queueStatus: "clinic1" },
        ],
        undefined,
      ).completionRate,
    ).toBe(67);
    expect(
      summarizeToday(
        [
          { queueStatus: "treated" },
          { queueStatus: "treated" },
          { queueStatus: "clinic1" },
          { queueStatus: "clinic1" },
        ],
        undefined,
      ).completionRate,
    ).toBe(50);
  });

  it("should_sum_items_across_lists_for_ops_count", () => {
    const lists = [
      { items: [{ id: 1 }, { id: 2 }] },
      { items: [{ id: 3 }] },
      {},
      { items: undefined },
    ];
    expect(summarizeToday([], lists).opsCount).toBe(3);
  });

  it("should_return_ops_count_zero_for_undefined_or_non_array_lists", () => {
    expect(summarizeToday([], undefined).opsCount).toBe(0);
    expect(
      summarizeToday([], {} as unknown as { items?: unknown[][] }).opsCount,
    ).toBe(0);
  });

  it("should_tolerate_a_non_array_queue_like_a_failed_query_payload", () => {
    const summary = summarizeToday(
      undefined,
      [{ items: [{ id: 1 }] }],
    );
    expect(summary.total).toBe(0);
    expect(summary.waiting).toBe(0);
    expect(summary.opsCount).toBe(1);
  });

  it("should_format_counts_with_arabic_indic_digits", () => {
    expect(formatCount(0)).toBe("٠");
    expect(formatCount(1234)).toBe("١٬٢٣٤");
  });
});
