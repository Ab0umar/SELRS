export type CardUsageEntry = {
  count: number;
  updatedAt: number;
};

export type CardUsageMap = Record<string, CardUsageEntry>;

export type CardUsageScope = "home" | "admin";

const STORAGE_PREFIX = "selrs:bento-usage";
export const CARD_USAGE_UPDATED_EVENT = "selrs-card-usage-updated";

let lastRecordedSignature = "";
let lastRecordedAt = 0;

export function getCardUsageStorageKey(
  scope: CardUsageScope,
  userId?: string | number | null,
): string {
  return `${STORAGE_PREFIX}:${scope}:${userId ?? "anon"}`;
}

export function getCardUsageMap(
  scope: CardUsageScope,
  userId?: string | number | null,
): CardUsageMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(
      getCardUsageStorageKey(scope, userId),
    );
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (!parsed || typeof parsed !== "object") return {};
    const result: CardUsageMap = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (
        value &&
        typeof value === "object" &&
        typeof (value as CardUsageEntry).count === "number" &&
        (value as CardUsageEntry).count > 0
      ) {
        result[key] = {
          count: (value as CardUsageEntry).count,
          updatedAt:
            typeof (value as CardUsageEntry).updatedAt === "number"
              ? (value as CardUsageEntry).updatedAt
              : 0,
        };
      }
    }
    return result;
  } catch {
    return {};
  }
}

export function recordCardUsage(
  scope: CardUsageScope,
  cardKey: string,
  userId?: string | number | null,
): void {
  if (typeof window === "undefined" || !cardKey) return;
  const now = Date.now();
  const signature = `${scope}:${userId ?? "anon"}:${cardKey}`;
  if (signature === lastRecordedSignature && now - lastRecordedAt < 250) {
    return;
  }
  lastRecordedSignature = signature;
  lastRecordedAt = now;

  try {
    const storageKey = getCardUsageStorageKey(scope, userId);
    const current = getCardUsageMap(scope, userId);
    const existing = current[cardKey];
    current[cardKey] = {
      count: (existing?.count ?? 0) + 1,
      updatedAt: now,
    };
    window.localStorage.setItem(storageKey, JSON.stringify(current));
    window.dispatchEvent(
      new CustomEvent(CARD_USAGE_UPDATED_EVENT, {
        detail: { scope, cardKey, userId },
      }),
    );
  } catch {
    // Ignore storage errors in restricted environments.
  }
}

export function pickDynamicBentoCards<T>(
  cards: readonly T[],
  getKey: (card: T) => string,
  usageMap: CardUsageMap,
  defaultPriorityKeys: readonly string[],
): {
  heroCard: T | null;
  featuredCards: T[];
  restCards: T[];
} {
  if (cards.length === 0) {
    return { heroCard: null, featuredCards: [], restCards: [] };
  }

  const priorityIndexMap = new Map<string, number>();
  defaultPriorityKeys.forEach((key, idx) => {
    if (!priorityIndexMap.has(key)) {
      priorityIndexMap.set(key, idx);
    }
  });

  const indexed = cards.map((card, originalIndex) => {
    const key = getKey(card);
    const usage = usageMap[key];
    return {
      card,
      key,
      originalIndex,
      count: usage?.count ?? 0,
      updatedAt: usage?.updatedAt ?? 0,
      priorityIndex: priorityIndexMap.get(key) ?? Number.MAX_SAFE_INTEGER,
    };
  });

  const rankedForTopSlots = [...indexed].sort((a, b) => {
    if (a.count !== b.count) {
      return b.count - a.count;
    }
    if (a.count > 0 && a.updatedAt !== b.updatedAt) {
      return b.updatedAt - a.updatedAt;
    }
    if (a.priorityIndex !== b.priorityIndex) {
      return a.priorityIndex - b.priorityIndex;
    }
    return a.originalIndex - b.originalIndex;
  });

  const topSlots = rankedForTopSlots.slice(0, 4);
  const heroCard = topSlots[0]?.card ?? null;
  const featuredCards = topSlots.slice(1, 4).map((item) => item.card);
  const promotedKeys = new Set(topSlots.map((item) => item.key));
  const restCards = cards.filter((card) => !promotedKeys.has(getKey(card)));

  return { heroCard, featuredCards, restCards };
}
