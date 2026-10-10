export interface MysqlLockConnection {
  query(sql: string, values?: unknown[]): Promise<[unknown, unknown?]>;
  release(): void;
  destroy?(): void;
}

export interface TransactionalDatabase {
  transaction<T>(work: (transaction: any) => Promise<T>): Promise<T>;
}

export const MATERIALIZER_LOCK_NAME = "attendance_daily_materializer";

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

/** Run one materialization while holding a MySQL session-level advisory lock. */
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
