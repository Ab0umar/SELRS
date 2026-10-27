import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { stockItems, stockTransactions } from "../../drizzle/schema";
import * as db from "../db";
import { cleanupTables, getTestDb } from "./setup";

async function reset() {
  await cleanupTables(await getTestDb(), "stock_transactions", "stock_items");
}

async function seedItem(quantity: number) {
  const testDb = await getTestDb();
  const res: any = await testDb
    .insert(stockItems)
    .values({ name: "Test item", quantity, status: "متوفر" } as any);
  return Number(res?.[0]?.insertId ?? res?.insertId);
}

async function quantityOf(id: number) {
  return (await db.getStockItemById(id))!.quantity;
}

describe.sequential("stock movements", () => {
  beforeEach(reset);
  afterEach(reset);

  it("never oversells when dispenses race on the same item", async () => {
    const id = await seedItem(10);
    const results = await Promise.allSettled(
      Array.from({ length: 20 }, () =>
        db.insertStockTransaction({
          itemId: id,
          type: "dispense",
          quantity: 1,
          performedBy: "t",
        } as any),
      ),
    );
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(10);
    expect(await quantityOf(id)).toBe(0);
    const testDb = await getTestDb();
    expect(await testDb.select().from(stockTransactions)).toHaveLength(10);
  });

  it("keeps the balance exact when receives race", async () => {
    const id = await seedItem(0);
    await Promise.all(
      Array.from({ length: 15 }, () =>
        db.insertStockTransaction({
          itemId: id,
          type: "add",
          quantity: 2,
          performedBy: "t",
        } as any),
      ),
    );
    expect(await quantityOf(id)).toBe(30);
  });

  it("rejects negative, zero and fractional quantities", async () => {
    const id = await seedItem(5);
    for (const quantity of [-50, 0, 2.5]) {
      await expect(
        db.insertStockTransaction({
          itemId: id,
          type: "dispense",
          quantity,
          performedBy: "t",
        } as any),
      ).rejects.toThrow(/positive integer/);
    }
    expect(await quantityOf(id)).toBe(5);
  });

  it("rejects a negative quantity edit", async () => {
    const id = await seedItem(5);
    const { txId } = await db.insertStockTransaction({
      itemId: id,
      type: "dispense",
      quantity: 1,
      performedBy: "t",
    } as any);
    await expect(
      db.updateStockTransaction(txId, { quantity: -3 }),
    ).rejects.toThrow(/positive integer/);
    expect(await quantityOf(id)).toBe(4);
  });
});
