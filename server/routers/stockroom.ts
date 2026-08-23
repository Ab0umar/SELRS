import { z } from "zod";
import {
  router,
  makeStockroomProcedure,
  makeStockroomWriteProcedure,
} from "../_core/procedures";
import * as db from "../db";
import { TRPCError } from "@trpc/server";
import { matchEgyptianDrugReference } from "../services/egyptianDrugReference";
import type { StockItem } from "../../drizzle/schema";

export const stockroomRouter = router({
  matchEyeDropsWithEgyptianReference: makeStockroomProcedure(
    "/stockroom",
  ).query(async () => {
    const [items, transactions] = await Promise.all([
      db.getStockItems("قطرات العين"),
      db.getStockTransactions(10_000),
    ]);
    const matches = await matchEgyptianDrugReference(
      items.map((item: StockItem) => item.name),
      ["drops", "ointment"],
    );
    const latestPriceByItem = new Map<number, string>();
    for (const transaction of transactions) {
      if (
        transaction.unitPrice != null &&
        !latestPriceByItem.has(transaction.itemId)
      ) {
        latestPriceByItem.set(transaction.itemId, transaction.unitPrice);
      }
    }

    const matchedItems = items.flatMap((item: StockItem, index: number) => {
      const result = matches[index];
      if (!result?.match) return [];
      return [
        {
          itemId: item.id,
          currentName: item.name,
          currentSupplier: item.supplier ?? "",
          currentPrice: latestPriceByItem.get(item.id) ?? null,
          confidence: result.confidence,
          reference: result.match,
        },
      ];
    });

    return {
      items: matchedItems,
      totalExisting: items.length,
      unmatched: items.length - matchedItems.length,
    };
  }),

  syncEyeDropsWithEgyptianReference: makeStockroomWriteProcedure("/stockroom")
    .input(
      z.object({
        itemIds: z.array(z.number().int().positive()).min(1).max(10_000),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const selectedIds = new Set(input.itemIds);
      const items = (await db.getStockItems("قطرات العين")).filter(
        (item: StockItem) => selectedIds.has(item.id),
      );
      const matches = await matchEgyptianDrugReference(
        items.map((item: StockItem) => item.name),
        ["drops", "ointment"],
      );
      let updated = 0;

      for (let index = 0; index < items.length; index += 1) {
        const item = items[index];
        const drug = matches[index]?.match;
        if (!drug) continue;

        await db.updateStockItem(item.id, {
          name: drug.commercialNameEn,
          supplier: drug.manufacturer || item.supplier || null,
        });
        if (drug.priceEgp != null) {
          await db.insertStockTransaction({
            itemId: item.id,
            type: "add",
            quantity: 0,
            unitPrice: String(drug.priceEgp),
            totalValue: "0",
            employeeName: "تحديث من مرجع الأدوية المصرية",
            destination: "تعديل سعر",
            transactionDate: new Date().toISOString().slice(0, 10) as any,
            performedBy: ctx.user?.username || "system",
          });
        }
        updated += 1;
      }

      return { updated, skipped: input.itemIds.length - updated };
    }),

  getItems: makeStockroomProcedure("/stockroom")
    .input(z.object({ category: z.string().optional() }))
    .query(async ({ input }) => {
      const [items, transactions] = await Promise.all([
        db.getStockItems(input.category),
        db.getStockTransactions(10_000),
      ]);
      const latestPriceByItem = new Map<number, string>();
      for (const transaction of transactions) {
        if (
          transaction.unitPrice != null &&
          !latestPriceByItem.has(transaction.itemId)
        ) {
          latestPriceByItem.set(transaction.itemId, transaction.unitPrice);
        }
      }

      return items.map((item: StockItem) => ({
        ...item,
        unitPrice: latestPriceByItem.get(item.id) ?? null,
      }));
    }),

  createItem: makeStockroomWriteProcedure("/stockroom")
    .input(
      z.object({
        itemCode: z.string().optional(),
        name: z.string(),
        category: z.string().optional(),
        supplier: z.string().optional(),
        expiryDate: z.string().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      if (input.itemCode) {
        const existing = await db.getStockItemByCode(input.itemCode);
        if (existing) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "كود الصنف موجود بالفعل",
          });
        }
      }

      return await db.insertStockItem({
        ...input,
        expiryDate: input.expiryDate ? new Date(input.expiryDate) : null,
        quantity: 0,
        status: "نفذ المخزون",
      });
    }),

  receiveStock: makeStockroomWriteProcedure("/stockroom")
    .input(
      z.object({
        itemId: z.number().optional(),
        isNewItem: z.boolean().default(false),
        newItem: z
          .object({
            name: z.string(),
            itemCode: z.string().optional(),
            supplier: z.string().optional(),
            category: z.string().optional(),
            expiryDate: z.string().optional(),
          })
          .optional(),
        quantity: z.number(),
        unitPrice: z.number().optional(),
        totalValue: z.number().optional(),
        transactionDate: z.string().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      let resolvedItemId = input.itemId;

      if (input.isNewItem && input.newItem) {
        const res = await db.insertStockItem({
          name: input.newItem.name,
          itemCode: input.newItem.itemCode,
          supplier: input.newItem.supplier,
          category: input.newItem.category,
          expiryDate: input.newItem.expiryDate
            ? new Date(input.newItem.expiryDate)
            : undefined,
          quantity: 0,
          status: "متوفر",
        });
        resolvedItemId = res.insertId;
      }

      if (!resolvedItemId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Item ID is required",
        });
      }

      return await db.insertStockTransaction({
        itemId: resolvedItemId,
        type: "add",
        quantity: input.quantity,
        unitPrice: input.unitPrice ? String(input.unitPrice) : null,
        totalValue: input.totalValue ? String(input.totalValue) : null,
        transactionDate: input.transactionDate
          ? (input.transactionDate as any)
          : null,
        performedBy: ctx.user?.username || "system",
      });
    }),

  dispenseStock: makeStockroomWriteProcedure("/stockroom")
    .input(
      z.object({
        itemId: z.number(),
        quantity: z.number(),
        employeeName: z.string().optional(),
        destination: z.enum(["بيع", "عمليات", "عيادات"]),
        transactionDate: z.string().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const item = await db.getStockItemById(input.itemId);
      if (!item)
        throw new TRPCError({ code: "NOT_FOUND", message: "الصنف غير موجود" });

      if (item.quantity < input.quantity) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `الكمية المتاحة (${item.quantity}) أقل من الكمية المطلوبة`,
        });
      }

      return await db.insertStockTransaction({
        itemId: input.itemId,
        type: "dispense",
        quantity: input.quantity,
        employeeName: input.employeeName,
        destination: input.destination,
        transactionDate: input.transactionDate
          ? (input.transactionDate as any)
          : null,
        performedBy: ctx.user?.username || "system",
      });
    }),

  updateItem: makeStockroomWriteProcedure("/stockroom")
    .input(
      z.object({
        id: z.number(),
        name: z.string().optional(),
        itemCode: z.string().optional(),
        supplier: z.string().optional(),
        expiryDate: z.string().nullable().optional(),
        unitPrice: z.number().min(0).optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const { id, expiryDate, unitPrice, ...rest } = input;
      const updates: Record<string, any> = { ...rest };
      if (expiryDate !== undefined)
        updates.expiryDate = expiryDate ? new Date(expiryDate) : null;
      await db.updateStockItem(id, updates);

      if (unitPrice !== undefined) {
        await db.insertStockTransaction({
          itemId: id,
          type: "add",
          quantity: 0,
          unitPrice: String(unitPrice),
          totalValue: "0",
          employeeName: "تعديل سعر الصنف",
          destination: "تعديل سعر",
          transactionDate: new Date().toISOString().slice(0, 10) as any,
          performedBy: ctx.user?.username || "system",
        });
      }

      return { success: true };
    }),

  deleteItem: makeStockroomWriteProcedure("/stockroom")
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await db.deleteStockItem(input.id);
      return { success: true };
    }),

  updateTransaction: makeStockroomWriteProcedure("/stockroom/reports")
    .input(
      z.object({
        id: z.number(),
        quantity: z.number().optional(),
        unitPrice: z.number().optional(),
        totalValue: z.number().optional(),
        employeeName: z.string().optional(),
        destination: z.string().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const { id, unitPrice, totalValue, ...rest } = input;
      await db.updateStockTransaction(id, {
        ...rest,
        ...(unitPrice !== undefined ? { unitPrice: String(unitPrice) } : {}),
        ...(totalValue !== undefined ? { totalValue: String(totalValue) } : {}),
      });
      return { success: true };
    }),

  deleteTransaction: makeStockroomWriteProcedure("/stockroom/reports")
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await db.deleteStockTransaction(input.id);
      return { success: true };
    }),

  getReports: makeStockroomProcedure("/stockroom/reports")
    .input(z.object({ limit: z.number().optional() }))
    .query(async ({ input }) => {
      const transactions = await db.getStockTransactions(input.limit);
      const inventory = await db.getStockItems();
      return { transactions, inventory };
    }),
});
