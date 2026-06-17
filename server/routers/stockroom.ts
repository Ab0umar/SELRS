import { z } from "zod";
import { router, makeStockroomProcedure, makeStockroomWriteProcedure } from "../_core/procedures";
import * as db from "../db";
import { TRPCError } from "@trpc/server";

export const stockroomRouter = router({
  getItems: makeStockroomProcedure("/stockroom")
    .input(z.object({ category: z.string().optional() }))
    .query(async ({ input }) => {
      return await db.getStockItems(input.category);
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
          expiryDate: input.newItem.expiryDate ? new Date(input.newItem.expiryDate) : undefined,
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
        transactionDate: input.transactionDate ? (input.transactionDate as any) : null,
        performedBy: ctx.user?.username || "system",
      });
    }),

  dispenseStock: makeStockroomWriteProcedure("/stockroom")
    .input(
      z.object({
        itemId: z.number(),
        quantity: z.number(),
        employeeName: z.string().optional(),
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
        transactionDate: input.transactionDate ? (input.transactionDate as any) : null,
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
      }),
    )
    .mutation(async ({ input }) => {
      const { id, expiryDate, ...rest } = input;
      const updates: Record<string, any> = { ...rest };
      if (expiryDate !== undefined)
        updates.expiryDate = expiryDate ? new Date(expiryDate) : null;
      await db.updateStockItem(id, updates);
      return { success: true };
    }),

  deleteItem: makeStockroomWriteProcedure("/stockroom")
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await db.deleteStockItem(input.id);
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
