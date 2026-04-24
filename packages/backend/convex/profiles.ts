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
        updatedAt: Date.now(),
      });
    }
  },
});