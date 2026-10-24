/**
 * A pool connection dedicated to one advisory lock. MySQL GET_LOCK is
 * session-scoped, so the lock lives on this exact connection: it must stay
 * checked out until RELEASE_LOCK succeeds, and be destroyed if the release
 * fails so the pool never receives a lock-owning session.
 */
export interface MysqlLockConnection {
  query(sql: string, values?: unknown[]): Promise<[unknown, unknown?]>;
  release(): void;
  destroy?(): void;
}

/** Minimal transaction surface needed to run work under the lock. */
export interface TransactionalDatabase {
  transaction<T>(work: (transaction: any) => Promise<T>): Promise<T>;
}

/**
 * Single global lock name for all daily materialization (and the manual punch
 * mutations that share its transaction). Not per-employee: a scoped recompute
 * still queues behind a full rebuild. See docs/ATTENDANCE_SYNC.md,
 * "Concurrency and locking".
 */
export const MATERIALIZER_LOCK_NAME = "attendance_daily_materializer";

/**
 * Run `work` in one transaction while holding the materializer advisory lock.
 *
 * Order is fixed: GET_LOCK on the dedicated connection, then db.transaction,
 * then afterCommit with the lock still held. afterCommit therefore runs after
 * the commit (daily rows visible to other readers, no interleaving), and an
 * error it throws propagates to the caller without rolling the committed
 * transaction back.
 *
 * The 120s wait is deliberate: long rebuilds hold the lock well past a
 * default short wait, and user mutations should queue rather than fail.
 *
 * @param connection Dedicated connection from getDbConnection(); held for the
 *   whole call and always released or destroyed in the finally block.
 * @param db Handle used only to open the transaction; the lock does not live
 *   on it.
 * @param work Transaction body; receives the transaction handle.
 * @param afterCommit Optional callback, runs inside the lock after commit.
 * @returns Whatever `work` resolved to.
 * @throws Error "Attendance materialization is already running" when the lock
 *   is not acquired within 120 seconds.
 */
export async function withMaterializerTransaction<T>(
  connection: MysqlLockConnection,
  db: TransactionalDatabase,
  work: (transaction: any) => Promise<T>,
  afterCommit?: (result: T) => Promise<void>,
): Promise<T> {
  return withMysqlAdvisoryLock(
    connection,
    MATERIALIZER_LOCK_NAME,
    // Long ranges (e.g. 90-day rebuilds) can hold the lock for a while; user
    // mutations should queue behind them rather than fail after 30s.
    120,
    async () => {
      const result = await db.transaction(work);
      await afterCommit?.(result);
      return result;
    },
  );
}

/**
 * Acquire a named MySQL session-level advisory lock on `connection`, run
 * `work`, then release the lock. Generic helper, not materializer-specific.
 * `waitSeconds` is in seconds, passed straight to GET_LOCK. On a failed
 * RELEASE_LOCK the connection is destroyed instead of pooled, since a pooled
 * session may still own the lock.
 *
 * @param connection Dedicated connection; held for the whole call.
 * @param lockName Lock identifier shared by GET_LOCK and RELEASE_LOCK.
 * @param waitSeconds Seconds to wait for acquisition before giving up.
 * @param work Body to run while holding the lock.
 * @returns Whatever `work` resolved to.
 * @throws Error when the lock cannot be acquired within `waitSeconds`.
 */
export async function withMysqlAdvisoryLock<T>(
  connection: MysqlLockConnection,
  lockName: string,
  waitSeconds: number,
  work: () => Promise<T>,
): Promise<T> {
  let acquired = false;
  try {
    const [rows] = await connection.query(
      "SELECT GET_LOCK(?, ?) AS lockAcquired",
      [lockName, waitSeconds],
    );
    acquired =
      Number((rows as Array<{ lockAcquired?: number }>)[0]?.lockAcquired) === 1;
    if (!acquired)
      throw new Error("Attendance materialization is already running");
    return await work();
  } finally {
    let destroyed = false;
    if (acquired) {
      try {
        await connection.query("SELECT RELEASE_LOCK(?)", [lockName]);
      } catch (error) {
        // Never return a session that may still own the advisory lock to pool.
        console.error("Failed to release attendance materializer lock:", error);
        if (connection.destroy) {
          connection.destroy();
          destroyed = true;
        }
      }
    }
    if (!destroyed) connection.release();
  }
}
