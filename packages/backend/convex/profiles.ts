import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { authComponent } from "./auth";

export const getMine = query({
  args: {},
  handler: async (ctx) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) {
      throw new Error("Unauthorized");
    }

    // Check if profile exists
    // The profile has `userId` referencing the text `id` of BetterAuth user
    let profile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .first();

    if (!profile) {
      // Return a default profile if not created yet
      return {
        userId: user._id,
        name: user.name,
        email: user.email,
        avatarUrl: user.image,
        description: "",
        favoriteDestinations: [],
        averageRating: 5.0,
        totalRatings: 0,
        preferredCurrency: "COP",
        updatedAt: Date.now(),
      };
    }

    return {
      ...profile,
      name: user.name,
      email: user.email,
      // If we have an avatarUrl from the profile, we use it, otherwise fallback to Auth's image
      avatarUrl: profile.avatarUrl || user.image,
    };
  },
});

export const updateMine = mutation({
  args: {
    description: v.optional(v.string()),
    favoriteDestinations: v.optional(v.array(v.string())),
    avatarUrl: v.optional(v.string()),
    preferredCurrency: v.optional(v.union(v.literal("COP"), v.literal("USD"))),
  },
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) {
      throw new Error("Unauthorized");
    }

    const userId = user._id;
    let profile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();

    // Remove duplicates from destinations if provided
    let favDests = args.favoriteDestinations;
    if (favDests) {
      favDests = Array.from(new Set(favDests.map((d) => d.trim())));
    }

    if (profile) {
      await ctx.db.patch(profile._id, {
        description: args.description ?? profile.description,
        favoriteDestinations: favDests ?? profile.favoriteDestinations,
        avatarUrl: args.avatarUrl ?? profile.avatarUrl,
        preferredCurrency: args.preferredCurrency ?? profile.preferredCurrency,
        updatedAt: Date.now(),
      });
    } else {
      await ctx.db.insert("profiles", {
        userId,
        description: args.description ?? "",
        favoriteDestinations: favDests ?? [],
        avatarUrl: args.avatarUrl,
        averageRating: 5.0,
        totalRatings: 0,
        preferredCurrency: args.preferredCurrency ?? "COP",
        updatedAt: Date.now(),
      });
    }
  },
});

export const getUserProfile = query({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    // 1. Fetch profile
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first();

    // 2. Fetch Better Auth info (if we have a way, or fallback to profile info)
    // Here we use getAnyUserById to get the name and image
    let name = "Viajero";
    let avatarUrl = profile?.avatarUrl;
    try {
      const authUser = await authComponent.getAnyUserById(ctx, args.userId);
      if (authUser) {
        if (authUser.name) name = authUser.name;
        if (!avatarUrl && authUser.image) avatarUrl = authUser.image;
      }
    } catch (e) {
      // Ignore if auth fails
    }

    // 3. Fetch created packages
    const createdPackagesRaw = await ctx.db
      .query("travelPackages")
      .withIndex("by_creatorId", (q) => q.eq("creatorId", args.userId))
      .collect();
    
    // Remove cancelled packages from view and map statusLabel
    const STATUS_LABELS: Record<string, string> = { draft: "Borrador", published: "Publicado", cancelled: "Cancelado" };
    const createdPackages = createdPackagesRaw
      .filter((pkg) => pkg.status !== "cancelled" && pkg.status !== "draft") // only show published ones to public
      .map((pkg) => ({
        ...pkg,
        statusLabel: STATUS_LABELS[pkg.status] || pkg.status,
      }));

    // 4. Fetch packages they participate in
    const participations = await ctx.db
      .query("travelPackageParticipants")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .collect();

    const joinedPackagesRaw = [];
    for (const p of participations) {
      const pkg = await ctx.db.get(p.travelPackageId);
      if (pkg && pkg.creatorId !== args.userId && pkg.status === "published") { // exclude their own packages to avoid duplication
        joinedPackagesRaw.push(pkg);
      }
    }
    
    const joinedPackages = joinedPackagesRaw.map((pkg) => ({
      ...pkg,
      statusLabel: STATUS_LABELS[pkg.status] || pkg.status,
    }));

    return {
      userId: args.userId,
      name,
      avatarUrl,
      description: profile?.description || "",
      favoriteDestinations: profile?.favoriteDestinations || [],
      averageRating: profile?.averageRating || 5.0,
      totalRatings: profile?.totalRatings || 0,
      createdPackages,
      joinedPackages,
    };
  },
});