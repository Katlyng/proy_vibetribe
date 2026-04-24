import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  profiles: defineTable({
    userId: v.string(), // Links to Better Auth user ID
    description: v.string(),
    favoriteDestinations: v.array(v.string()),
    avatarUrl: v.optional(v.string()),
    averageRating: v.number(), // 1.0 to 5.0
    totalRatings: v.number(),
    updatedAt: v.number(),
  }).index("by_userId", ["userId"]),

  travelPackages: defineTable({
    creatorId: v.string(), // Links to Better Auth user ID
    destination: v.string(),
    title: v.string(),
    description: v.string(),
    imageUrl: v.optional(v.string()), // Image of the destination
    startDate: v.number(), // Timestamp
    endDate: v.number(), // Timestamp
    durationDays: v.number(),
    price: v.number(), // Stored as float/number
    maxParticipants: v.number(),
    currentParticipants: v.number(),
    accommodation: v.optional(v.string()),
    accommodationDetails: v.optional(
      v.object({
        name: v.string(),
        rating: v.number(),
        amenities: v.array(v.string()),
      })
    ),
    status: v.union(
      v.literal("draft"),
      v.literal("published"),
      v.literal("cancelled")
    ),
    tags: v.array(v.string()),
    updatedAt: v.number(),
  })
    .index("by_creatorId", ["creatorId"])
    .index("by_status", ["status"])
    .index("by_destination", ["destination"]),

  travelPackageParticipants: defineTable({
    travelPackageId: v.id("travelPackages"),
    userId: v.string(),
    joinedAt: v.number(),
  })
    .index("by_travelPackageId", ["travelPackageId"])
    .index("by_userId", ["userId"])
    .index("by_package_and_user", ["travelPackageId", "userId"]),

  travelPackageActivities: defineTable({
    travelPackageId: v.id("travelPackages"),
    title: v.string(),
    description: v.string(),
    date: v.number(),
    location: v.string(),
    duration: v.string(),
    isIncluded: v.boolean(),
    cost: v.optional(v.number()),
  }).index("by_travelPackageId", ["travelPackageId"]),

  todos: defineTable({
    text: v.string(),
    completed: v.boolean(),
  }),
});
