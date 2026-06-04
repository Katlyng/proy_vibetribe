import { v, ConvexError } from "convex/values";
import { mutation, query } from "./_generated/server";
import { authComponent } from "./auth";

export const REPORT_REASONS = [
  { value: "harassment", label: "Acoso o comportamiento agresivo" },
  { value: "offensive_language", label: "Lenguaje ofensivo o discriminatorio" },
  { value: "spam", label: "Spam o publicidad" },
  { value: "fraud", label: "Fraude o estafa" },
  { value: "rule_violation", label: "Incumplimiento de las reglas del viaje" },
  { value: "other", label: "Otro" },
] as const;

const MAX_DETAILS_LENGTH = 500;

const reportReasonValidator = v.union(
  v.literal("harassment"),
  v.literal("offensive_language"),
  v.literal("spam"),
  v.literal("fraud"),
  v.literal("rule_violation"),
  v.literal("other")
);

const reportValidator = v.object({
  _id: v.id("userReports"),
  _creationTime: v.number(),
  reporterId: v.string(),
  reportedUserId: v.string(),
  reason: reportReasonValidator,
  details: v.optional(v.string()),
  status: v.union(
    v.literal("pending"),
    v.literal("reviewed"),
    v.literal("dismissed")
  ),
  createdAt: v.number(),
});

export const reportUser = mutation({
  args: {
    reportedUserId: v.string(),
    reason: reportReasonValidator,
    details: v.optional(v.string()),
  },
  returns: v.id("userReports"),
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) throw new ConvexError("No autorizado");
    const reporterId = user._id;

    if (reporterId === args.reportedUserId) {
      throw new ConvexError("No puedes reportarte a ti mismo");
    }

    if (args.reportedUserId.trim().length === 0) {
      throw new ConvexError("Usuario inválido");
    }

    if (
      args.details !== undefined &&
      args.details.trim().length > MAX_DETAILS_LENGTH
    ) {
      throw new ConvexError(
        `Los detalles no pueden superar los ${MAX_DETAILS_LENGTH} caracteres`
      );
    }

    let reportedUserExists = false;
    try {
      const reported = await authComponent.getAnyUserById(
        ctx,
        args.reportedUserId
      );
      reportedUserExists = !!reported;
    } catch {
      reportedUserExists = false;
    }

    if (!reportedUserExists) {
      throw new ConvexError("El usuario reportado no existe");
    }

    return await ctx.db.insert("userReports", {
      reporterId,
      reportedUserId: args.reportedUserId,
      reason: args.reason,
      details: args.details?.trim() || undefined,
      status: "pending",
      createdAt: Date.now(),
    });
  },
});

export const getMyReports = query({
  args: {},
  returns: v.array(reportValidator),
  handler: async (ctx) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) return [];

    return await ctx.db
      .query("userReports")
      .withIndex("by_reporterId", (q) => q.eq("reporterId", user._id))
      .order("desc")
      .collect();
  },
});
