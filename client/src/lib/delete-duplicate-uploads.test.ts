import { describe, expect, it, vi } from "vitest";
import { deleteDuplicateUploadRecords } from "../../../server/routers/_medical/delete-duplicate-uploads";

describe("duplicate upload deletion", () => {
  const findDuplicates = async () => [
    { id: 24, dup_id: 2027 },
    { id: 24, dup_id: 4027 },
  ];
  it("removes extra records once and never reports deleting the shared image", async () => {
    const deleteRecords = vi.fn(async (ids: number[]) => ids.length);
    expect(
      await deleteDuplicateUploadRecords([2027, 2027, 4027], {
        findDuplicates,
        deleteRecords,
      }),
    ).toEqual({ deleted: 2, s3Deleted: 0 });
    expect(deleteRecords).toHaveBeenCalledExactlyOnceWith([2027, 4027]);
  });
  it.each([[24], [24, 2027], [9999]])(
    "rejects originals, stale selections and unrelated images: %j",
    async (...ids) => {
      const deleteRecords = vi.fn();
      await expect(
        deleteDuplicateUploadRecords(ids, { findDuplicates, deleteRecords }),
      ).rejects.toThrow("الاحتفاظ بسجل الأصل");
      expect(deleteRecords).not.toHaveBeenCalled();
    },
  );
});
