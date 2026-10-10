export interface LivePunch {
  empCd: string;
  timestamp: Date;
  direction: "in" | "out" | "unknown";
  deviceId: string;
}

export function liveBoardReconnectDelay(attempt: number): number {
  return Math.min(30_000, 1_000 * 2 ** Math.max(0, attempt));
}

export function shouldReconnectLiveBoard(closeCode: number): boolean {
  // A policy close means the server explicitly rejected the subscription.
  return closeCode !== 1008;
}

export function mergeLivePunches(
  current: LivePunch[],
  incoming: LivePunch[],
): LivePunch[] {
  const byPunch = new Map<string, LivePunch>();
  for (const punch of [...current, ...incoming]) {
    const timestamp = new Date(punch.timestamp).getTime();
    if (!Number.isFinite(timestamp)) continue;
    const key = `${punch.empCd.trim()}|${timestamp}`;
    if (!byPunch.has(key)) {
      byPunch.set(key, { ...punch, timestamp: new Date(timestamp) });
    }
  }
  return [...byPunch.values()]
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    .slice(0, 100);
}
