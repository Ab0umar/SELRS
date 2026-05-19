/**
 * Attendance Cache Service
 * In-memory caching with TTL for frequently accessed data
 */

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

class CacheService {
  private cache = new Map<string, CacheEntry<any>>();
  private defaultTTL = 60000; // 60 seconds

  set<T>(key: string, value: T, ttlMs?: number): void {
    const expiresAt = Date.now() + (ttlMs ?? this.defaultTTL);
    this.cache.set(key, { data: value, expiresAt });
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  // Clear expired entries (run periodically)
  prune(): number {
    const now = Date.now();
    let pruned = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
        pruned++;
      }
    }

    return pruned;
  }

  // Get cache statistics
  getStats() {
    return {
      size: this.cache.size,
      defaultTTL: this.defaultTTL,
    };
  }

  // Pattern-based invalidation
  invalidatePattern(pattern: string | RegExp): number {
    const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;
    let invalidated = 0;

    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
        invalidated++;
      }
    }

    return invalidated;
  }
}

export const attendanceCache = new CacheService();

// Periodically clean up expired entries (every 5 minutes)
setInterval(() => {
  const pruned = attendanceCache.prune();
  if (pruned > 0) {
    console.log(`[Cache] Pruned ${pruned} expired entries`);
  }
}, 5 * 60 * 1000);

// Cache key builders
export const cacheKeys = {
  dashboardSummary: () => 'attendance:dashboard:summary',
  employeeList: () => 'attendance:employees:list',
  shiftById: (shiftId: number) => `attendance:shift:${shiftId}`,
  dailyByDate: (date: string) => `attendance:daily:${date}`,
  dailyByEmployee: (empCd: string, fromDate: string, toDate: string) =>
    `attendance:daily:${empCd}:${fromDate}:${toDate}`,
  monthlyReport: (year: number, month: number) =>
    `attendance:monthly:${year}-${month}`,
  deviceStatus: () => 'attendance:device:status',
};
