import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { stockItems, stockTransactions } from "../../drizzle/schema";
import { getLatestStockUnitPrices } from "../db";
import { cleanupTables, getTestDb } from "./setup";

describe.sequential("getLatestStockUnitPrices", () => {
  const tables = ["stock_transactions", "stock_items"];
  beforeEach(async () => cleanupTables(await getTestDb(), ...tables));
  afterEach(async () => cleanupTables(await getTestDb(), ...tables));

  it("returns the newest non-null price per item,", async () => {
    const db = await getTestDb();
    await db.insert(stockItems).values([
      { name: "A", quantity: 0, status: "نفذ المخزون" },
      { name: "B", quantity: 0, status: "نفذ المخزون" },
    ] as any);
    const items = await db.select().from(stockItems);
    const a = items.find((i: any) => i.name === "A")!.id;
    const b = items.find((i: any) => i.name === "B")!.id;
    const base = { type: "add", quantity: 1, totalValue: "0", transactionDate: "2026-01-01" } as any;
    await db.insert(stockTransactions).values([
      { ...base, itemId: a, unitPrice: "10.00" },
      { ...base, itemId: a, unitPrice: "12.50" },
      { ...base, itemId: a, unitPrice: null },
      { ...base, itemId: b, unitPrice: null },
    ]);
    const prices = await getLatestStockUnitPrices();
    expect(prices.get(a)).toBe("12.50");
    expect(prices.has(b)).toBe(false);
  });
});
