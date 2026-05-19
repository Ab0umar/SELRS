
import { z } from "zod";
import { router, protectedProcedure } from "../_core/procedures";
import * as db from "../db";
import { TRPCError } from "@trpc/server";

export const stockroomRouter = router({
  // Get all items in a category
  getItems: protectedProcedure
    .input(z.object({ category: z.string().optional() }))
    .query(async ({ input }) => {
      return await db.getStockItems(input.category);
    }),

  // Define a new item type
  createItem: protectedProcedure
    .input(z.object({
      itemCode: z.string().optional(),
      name: z.string(),
      category: z.string().optional(),
      supplier: z.string().optional(),
      expiryDate: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      // Check if code already exists
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

  // Add stock (Receive)
  receiveStock: protectedProcedure
    .input(z.object({
      itemId: z.number().optional(), // Existing item
      // Or new item details
      isNewItem: z.boolean().default(false),
      newItem: z.object({
        name: z.string(),
        itemCode: z.string().optional(),
        supplier: z.string().optional(),
        category: z.string().optional(),
      }).optional(),
      quantity: z.number(),
      unitPrice: z.number().optional(),
      totalValue: z.number().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      let resolvedItemId = input.itemId;

      // 1. If it's a new item, create it first
      if (input.isNewItem && input.newItem) {
        const res = await db.insertStockItem({
          name: input.newItem.name,
          itemCode: input.newItem.itemCode,
          supplier: input.newItem.supplier,
          category: input.newItem.category,
          quantity: 0,
          status: "متوفر",
        });
        resolvedItemId = res.insertId;
      }

      if (!resolvedItemId) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Item ID is required" });
      }

      // 2. Log transaction and update quantity
      return await db.insertStockTransaction({
        itemId: resolvedItemId,
        type: "add",
        quantity: input.quantity,
        unitPrice: input.unitPrice ? String(input.unitPrice) : null,
        totalValue: input.totalValue ? String(input.totalValue) : null,
        performedBy: ctx.user?.username || "system",
      });
    }),

  // Dispense stock
  dispenseStock: protectedProcedure
    .input(z.object({
      itemId: z.number(),
      quantity: z.number(),
      employeeName: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const item = await db.getStockItemById(input.itemId);
      if (!item) throw new TRPCError({ code: "NOT_FOUND", message: "الصنف غير موجود" });
      
      if (item.quantity < input.quantity) {
        throw new TRPCError({ 
          code: "BAD_REQUEST", 
          message: `الكمية المتاحة (${item.quantity}) أقل من الكمية المطلوبة` 
        });
      }

      return await db.insertStockTransaction({
        itemId: input.itemId,
        type: "dispense",
        quantity: input.quantity,
        employeeName: input.employeeName,
        performedBy: ctx.user?.username || "system",
      });
    }),

  // Get transactions for reports
  getReports: protectedProcedure
    .input(z.object({ limit: z.number().optional() }))
    .query(async ({ input }) => {
      const transactions = await db.getStockTransactions(input.limit);
      const inventory = await db.getStockItems();
      return { transactions, inventory };
    }),
});
