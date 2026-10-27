/**
 * Walks rows in ascending id order by keyset (`id > lastId`) instead of OFFSET.
 * OFFSET skips rows when the handler removes rows from the filtered set (for
 * example linking an upload so it no longer matches `patient_id IS NULL`).
 */
export async function walkByKeyset<T extends { id: number }>(
  fetchBatch: (afterId: number, limit: number) => Promise<T[]>,
  batchSize: number,
  handleBatch: (rows: T[]) => Promise<void>,
) {
  let afterId = 0;
  for (;;) {
    const rows = await fetchBatch(afterId, batchSize);
    if (!rows || rows.length === 0) return;
    await handleBatch(rows);
    afterId = rows[rows.length - 1].id;
    if (rows.length < batchSize) return;
  }
}
