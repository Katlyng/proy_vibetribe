import { v, ConvexError } from "convex/values";
import { mutation, query } from "./_generated/server";
import { authComponent } from "./auth";

const ADMIN_EMAIL = "camilo.arias@uptc.edu.co";

async function requireAdmin(ctx: any) {
  const user = await authComponent.safeGetAuthUser(ctx);
  if (!user) throw new ConvexError("No autorizado");
  const email = (user as any).email as string | undefined;
  if (!email || email.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
    throw new ConvexError("Acceso restringido a administradores");
  }
  return user;
}

async function getCurrentUserSafe(ctx: any) {
  return await authComponent.safeGetAuthUser(ctx);
}

export const getMyAdminStatus = query({
  args: {},
  returns: v.object({
    isAdmin: v.boolean(),
    email: v.optional(v.string()),
  }),
  handler: async (ctx) => {
    const user = await getCurrentUserSafe(ctx);
    if (!user) return { isAdmin: false, email: undefined };
    const email = (user as any).email as string | undefined;
    return {
      isAdmin:
        !!email && email.toLowerCase() === ADMIN_EMAIL.toLowerCase(),
      email,
    };
  },
});

export const getMyModerationStatus = query({
  args: {},
  returns: v.object({
    isBanned: v.boolean(),
    bannedAt: v.optional(v.number()),
    banReason: v.optional(v.string()),
  }),
  handler: async (ctx) => {
    const user = await getCurrentUserSafe(ctx);
    if (!user) {
      return { isBanned: false, bannedAt: undefined, banReason: undefined };
    }
    const mod = await ctx.db
      .query("userModeration")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .first();
    if (!mod || !mod.isBanned) {
      return { isBanned: false, bannedAt: undefined, banReason: undefined };
    }
    return {
      isBanned: true,
      bannedAt: mod.bannedAt,
      banReason: mod.banReason,
    };
  },
});

const reportStatusEnum = v.union(
  v.literal("pending"),
  v.literal("reviewed"),
  v.literal("dismissed")
);

const adminReportValidator = v.object({
  _id: v.id("userReports"),
  _creationTime: v.number(),
  status: reportStatusEnum,
  reason: v.string(),
  details: v.optional(v.string()),
  createdAt: v.number(),
  reporter: v.object({
    userId: v.string(),
    name: v.string(),
    avatarUrl: v.optional(v.string()),
  }),
  reported: v.object({
    userId: v.string(),
    name: v.string(),
    avatarUrl: v.optional(v.string()),
    isBanned: v.boolean(),
    totalReports: v.number(),
  }),
});

export const getPendingReports = query({
  args: {},
  returns: v.array(adminReportValidator),
  handler: async (ctx) => {
    await requireAdmin(ctx);

    const reports = await ctx.db
      .query("userReports")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .order("desc")
      .collect();

    return await enrichReports(ctx, reports);
  },
});

export const getAllReports = query({
  args: { status: v.optional(reportStatusEnum) },
  returns: v.array(adminReportValidator),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const status = args.status ?? "pending";
    const reports = await ctx.db
      .query("userReports")
      .withIndex("by_status", (q) => q.eq("status", status))
      .order("desc")
      .collect();

    return await enrichReports(ctx, reports);
  },
});

export const getReportHistoryForUser = query({
  args: { userId: v.string() },
  returns: v.array(adminReportValidator),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const reports = await ctx.db
      .query("userReports")
      .withIndex("by_reportedUserId", (q) =>
        q.eq("reportedUserId", args.userId)
      )
      .order("desc")
      .collect();

    return await enrichReports(ctx, reports);
  },
});

async function enrichReports(
  ctx: any,
  reports: Array<{
    _id: any;
    _creationTime: number;
    status: "pending" | "reviewed" | "dismissed";
    reason: string;
    details?: string;
    createdAt: number;
    reporterId: string;
    reportedUserId: string;
  }>
) {
  return await Promise.all(
    reports.map(async (r) => {
      const [reporterProfile, reporterName, reportedProfile, reportedName, mod, allReportsForUser] =
        await Promise.all([
          ctx.db
            .query("profiles")
            .withIndex("by_userId", (q: any) => q.eq("userId", r.reporterId))
            .first(),
          getUserName(ctx, r.reporterId),
          ctx.db
            .query("profiles")
            .withIndex("by_userId", (q: any) => q.eq("userId", r.reportedUserId))
            .first(),
          getUserName(ctx, r.reportedUserId),
          ctx.db
            .query("userModeration")
            .withIndex("by_userId", (q: any) =>
              q.eq("userId", r.reportedUserId)
            )
            .first(),
          ctx.db
            .query("userReports")
            .withIndex("by_reportedUserId", (q: any) =>
              q.eq("reportedUserId", r.reportedUserId)
            )
            .collect(),
        ]);

      return {
        _id: r._id,
        _creationTime: r._creationTime,
        status: r.status,
        reason: r.reason,
        details: r.details,
        createdAt: r.createdAt,
        reporter: {
          userId: r.reporterId,
          name: reporterName,
          avatarUrl: reporterProfile?.avatarUrl ?? undefined,
        },
        reported: {
          userId: r.reportedUserId,
          name: reportedName,
          avatarUrl: reportedProfile?.avatarUrl ?? undefined,
          isBanned: !!mod?.isBanned,
          totalReports: allReportsForUser.length,
        },
      };
    })
  );
}

async function getUserName(ctx: any, userId: string): Promise<string> {
  try {
    const u = await authComponent.getAnyUserById(ctx, userId);
    if (u && (u as any).name) return (u as any).name as string;
  } catch {
    // ignore
  }
  return "Usuario";
}

const REVIEW_ACTIONS = ["dismissed", "reviewed_ban", "reviewed_no_action"] as const;
type ReviewAction = (typeof REVIEW_ACTIONS)[number];

export const reviewReport = mutation({
  args: {
    reportId: v.id("userReports"),
    action: v.union(
      v.literal("dismiss"),
      v.literal("ban"),
      v.literal("no_action")
    ),
    banReason: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);

    const report = await ctx.db.get(args.reportId);
    if (!report) throw new ConvexError("Reporte no encontrado");

    if (report.status !== "pending") {
      throw new ConvexError("Este reporte ya fue revisado");
    }

    if (args.action === "ban") {
      const existing = await ctx.db
        .query("userModeration")
        .withIndex("by_userId", (q) => q.eq("userId", report.reportedUserId))
        .first();

      const now = Date.now();
      const reason = args.banReason?.trim() || "Violación de las reglas de la comunidad";

      if (existing) {
        await ctx.db.patch(existing._id, {
          isBanned: true,
          bannedAt: now,
          bannedBy: admin._id,
          banReason: reason,
          updatedAt: now,
        });
      } else {
        await ctx.db.insert("userModeration", {
          userId: report.reportedUserId,
          isBanned: true,
          bannedAt: now,
          bannedBy: admin._id,
          banReason: reason,
          updatedAt: now,
        });
      }
      await ctx.db.patch(report._id, { status: "reviewed" });
    } else if (args.action === "dismiss") {
      await ctx.db.patch(report._id, { status: "dismissed" });
    } else {
      await ctx.db.patch(report._id, { status: "reviewed" });
    }

    return null;
  },
});

export const unbanUser = mutation({
  args: { userId: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const mod = await ctx.db
      .query("userModeration")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first();
    if (!mod) return null;
    await ctx.db.patch(mod._id, {
      isBanned: false,
      bannedAt: undefined,
      bannedBy: undefined,
      banReason: undefined,
      updatedAt: Date.now(),
    });
    return null;
  },
});

export const getBannedUsers = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("userModeration"),
      userId: v.string(),
      bannedAt: v.optional(v.number()),
      banReason: v.optional(v.string()),
      name: v.string(),
      avatarUrl: v.optional(v.string()),
    })
  ),
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const banned = await ctx.db
      .query("userModeration")
      .withIndex("by_banned", (q) => q.eq("isBanned", true))
      .collect();

    return await Promise.all(
      banned.map(async (b) => {
        const profile = await ctx.db
          .query("profiles")
          .withIndex("by_userId", (q) => q.eq("userId", b.userId))
          .first();
        const name = await getUserName(ctx, b.userId);
        return {
          _id: b._id,
          userId: b.userId,
          bannedAt: b.bannedAt,
          banReason: b.banReason,
          name,
          avatarUrl: profile?.avatarUrl ?? undefined,
        };
      })
    );
  },
});
