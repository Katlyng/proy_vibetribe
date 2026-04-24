import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const getAll = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("todos").collect();
  },
});

export const create = mutation({
  args: { text: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db.insert("todos", { text: args.text, completed: false });
  },
});

export const toggle = mutation({
  args: { id: v.id("todos"), completed: v.boolean() },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { completed: args.completed });
  },
});

export const remove = mutation({
  args: { id: v.id("todos") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});