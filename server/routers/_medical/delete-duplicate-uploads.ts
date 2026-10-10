export type DuplicateUploadPair = { id: number; dup_id: number };

export async function deleteDuplicateUploadRecords(
  ids: number[],
  dependencies: {
    findDuplicates: () => Promise<DuplicateUploadPair[]>;
    deleteRecords: (ids: number[]) => Promise<number>;
  },
): Promise<{ deleted: number; s3Deleted: number }> {
  const selected = new Set(ids);
  if (!selected.size) return { deleted: 0, s3Deleted: 0 };
  const pairs = await dependencies.findDuplicates();
  const eligible = new Set(
    pairs.filter((pair) => !selected.has(pair.id)).map((pair) => pair.dup_id),
  );
  if ([...selected].some((id) => !eligible.has(id))) {
    throw new Error(
      "يمكن حذف السجلات المكررة فقط مع الاحتفاظ بسجل الأصل. حدّث القائمة ثم حاول مرة أخرى.",
    );
  }
  // Duplicate records reference the original's object; never remove that object.
  const deleted = await dependencies.deleteRecords([...selected]);
  return { deleted, s3Deleted: 0 };
}
