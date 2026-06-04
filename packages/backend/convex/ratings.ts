import { v, ConvexError } from "convex/values";
import { mutation, query } from "./_generated/server";
import { authComponent } from "./auth";

const MIN_RATING = 1;
const MAX_RATING = 5;
const MAX_COMMENT_LENGTH = 500;

export const rateParticipant = mutation({
  args: {
    travelPackageId: v.id("travelPackages"),
    ratedUserId: v.string(),
    rating: v.number(),
    comment: v.optional(v.string()),
  },
  returns: v.id("packageRatings"),
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) throw new ConvexError("No autorizado");
    const raterId = user._id;

    if (raterId === args.ratedUserId) {
      throw new ConvexError("No puedes calificarte a ti mismo");
    }

    if (
      !Number.isInteger(args.rating) ||
      args.rating < MIN_RATING ||
      args.rating > MAX_RATING
    ) {
      throw new ConvexError(
        `La calificación debe ser un número entero entre ${MIN_RATING} y ${MAX_RATING}`
      );
    }

    if (
      args.comment !== undefined &&
      args.comment.trim().length > MAX_COMMENT_LENGTH
    ) {
      throw new ConvexError(
        `El comentario no puede superar los ${MAX_COMMENT_LENGTH} caracteres`
      );
    }

    const tPackage = await ctx.db.get(args.travelPackageId);
    if (!tPackage) throw new ConvexError("Paquete no encontrado");

    if (tPackage.endDate > Date.now()) {
      throw new ConvexError(
        "Solo puedes calificar cuando el viaje haya finalizado"
      );
    }

    const raterParticipation = await ctx.db
      .query("travelPackageParticipants")
      .withIndex("by_package_and_user", (q) =>
        q.eq("travelPackageId", args.travelPackageId).eq("userId", raterId)
      )
      .first();

    const isRaterCreator = tPackage.creatorId === raterId;

    if (!raterParticipation && !isRaterCreator) {
      throw new ConvexError(
        "Solo los participantes del viaje pueden calificar"
      );
    }

    const ratedParticipation = await ctx.db
      .query("travelPackageParticipants")
      .withIndex("by_package_and_user", (q) =>
        q.eq("travelPackageId", args.travelPackageId).eq("userId", args.ratedUserId)
      )
      .first();

    const isRatedCreator = tPackage.creatorId === args.ratedUserId;

    if (!ratedParticipation && !isRatedCreator) {
      throw new ConvexError(
        "Solo puedes calificar a otros participantes del viaje"
      );
    }

    const existingRating = await ctx.db
      .query("packageRatings")
      .withIndex("by_package_rater_and_rated", (q) =>
        q
          .eq("travelPackageId", args.travelPackageId)
          .eq("raterId", raterId)
          .eq("ratedUserId", args.ratedUserId)
      )
      .first();

    if (existingRating) {
      throw new ConvexError(
        "Ya has calificado a este participante en este viaje"
      );
    }

    const ratingId = await ctx.db.insert("packageRatings", {
      travelPackageId: args.travelPackageId,
      raterId,
      ratedUserId: args.ratedUserId,
      rating: args.rating,
      comment: args.comment?.trim() || undefined,
      createdAt: Date.now(),
    });

    const allRatings = await ctx.db
      .query("packageRatings")
      .withIndex("by_ratedUserId", (q) => q.eq("ratedUserId", args.ratedUserId))
      .collect();

    const totalRatings = allRatings.length;
    const sumRatings = allRatings.reduce((sum, r) => sum + r.rating, 0);
    const newAverage = totalRatings > 0 ? sumRatings / totalRatings : 5.0;

    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", args.ratedUserId))
      .first();

    if (profile) {
      await ctx.db.patch(profile._id, {
        averageRating: newAverage,
        totalRatings,
        updatedAt: Date.now(),
      });
    } else {
      await ctx.db.insert("profiles", {
        userId: args.ratedUserId,
        description: "",
        favoriteDestinations: [],
        averageRating: newAverage,
        totalRatings,
        updatedAt: Date.now(),
      });
    }

    return ratingId;
  },
});

export const getMyRatingForUserInPackage = query({
  args: {
    travelPackageId: v.id("travelPackages"),
    ratedUserId: v.string(),
  },
  returns: v.union(
    v.null(),
    v.object({
      _id: v.id("packageRatings"),
      _creationTime: v.number(),
      travelPackageId: v.id("travelPackages"),
      raterId: v.string(),
      ratedUserId: v.string(),
      rating: v.number(),
      comment: v.optional(v.string()),
      createdAt: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) return null;

    return await ctx.db
      .query("packageRatings")
      .withIndex("by_package_rater_and_rated", (q) =>
        q
          .eq("travelPackageId", args.travelPackageId)
          .eq("raterId", user._id)
          .eq("ratedUserId", args.ratedUserId)
      )
      .first();
  },
});

export const getMyRatingsInPackage = query({
  args: { travelPackageId: v.id("travelPackages") },
  returns: v.array(
    v.object({
      _id: v.id("packageRatings"),
      _creationTime: v.number(),
      travelPackageId: v.id("travelPackages"),
      raterId: v.string(),
      ratedUserId: v.string(),
      rating: v.number(),
      comment: v.optional(v.string()),
      createdAt: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) return [];

    return await ctx.db
      .query("packageRatings")
      .withIndex("by_package_and_rater", (q) =>
        q.eq("travelPackageId", args.travelPackageId).eq("raterId", user._id)
      )
      .collect();
  },
});

export const getRatingsForPackage = query({
  args: { travelPackageId: v.id("travelPackages") },
  returns: v.array(
    v.object({
      _id: v.id("packageRatings"),
      _creationTime: v.number(),
      travelPackageId: v.id("travelPackages"),
      raterId: v.string(),
      ratedUserId: v.string(),
      rating: v.number(),
      comment: v.optional(v.string()),
      createdAt: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("packageRatings")
      .withIndex("by_travelPackageId", (q) =>
        q.eq("travelPackageId", args.travelPackageId)
      )
      .collect();
  },
});

export const getRatingsReceivedByUserInPackage = query({
  args: {
    travelPackageId: v.id("travelPackages"),
    userId: v.string(),
  },
  returns: v.array(
    v.object({
      _id: v.id("packageRatings"),
      _creationTime: v.number(),
      travelPackageId: v.id("travelPackages"),
      raterId: v.string(),
      ratedUserId: v.string(),
      rating: v.number(),
      comment: v.optional(v.string()),
      createdAt: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("packageRatings")
      .withIndex("by_package_and_rated", (q) =>
        q
          .eq("travelPackageId", args.travelPackageId)
          .eq("ratedUserId", args.userId)
      )
      .collect();
  },
});

const ratingReceivedValidator = v.object({
  _id: v.id("packageRatings"),
  _creationTime: v.number(),
  travelPackageId: v.id("travelPackages"),
  travelPackageTitle: v.string(),
  rating: v.number(),
  comment: v.optional(v.string()),
  createdAt: v.number(),
  rater: v.object({
    userId: v.string(),
    name: v.string(),
    avatarUrl: v.optional(v.string()),
  }),
});

export const getRatingsReceivedByUser = query({
  args: { userId: v.string() },
  returns: v.array(ratingReceivedValidator),
  handler: async (ctx, args) => {
    const ratings = await ctx.db
      .query("packageRatings")
      .withIndex("by_ratedUserId", (q) => q.eq("ratedUserId", args.userId))
      .order("desc")
      .collect();

    return await Promise.all(
      ratings.map(async (r) => {
        const tPackage = await ctx.db.get(r.travelPackageId);
        const raterProfile = await ctx.db
          .query("profiles")
          .withIndex("by_userId", (q) => q.eq("userId", r.raterId))
          .first();

        let raterName = "Viajero";
        try {
          const authUser = await authComponent.getAnyUserById(ctx, r.raterId);
          if (authUser && authUser.name) {
            raterName = authUser.name;
          }
        } catch {
          // Fallback silencioso a "Viajero"
        }

        return {
          _id: r._id,
          _creationTime: r._creationTime,
          travelPackageId: r.travelPackageId,
          travelPackageTitle: tPackage?.title || "Viaje",
          rating: r.rating,
          comment: r.comment,
          createdAt: r.createdAt,
          rater: {
            userId: r.raterId,
            name: raterName,
            avatarUrl: raterProfile?.avatarUrl ?? undefined,
          },
        };
      })
    );
  },
});
