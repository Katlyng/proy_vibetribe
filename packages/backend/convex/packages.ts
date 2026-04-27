import { v, ConvexError } from "convex/values";
import { mutation, query } from "./_generated/server";
import { authComponent } from "./auth";

const STATUS_LABELS: Record<string, string> = {
  draft: "Borrador",
  published: "Publicado",
  cancelled: "Cancelado",
};

export const create = mutation({
  args: {
    destination: v.string(),
    title: v.string(),
    description: v.string(),
    imageUrl: v.optional(v.string()),
    startDate: v.number(),
    endDate: v.number(),
    price: v.number(),
    maxParticipants: v.number(),
    accommodation: v.optional(v.string()),
    accommodationDetails: v.optional(
      v.object({
        name: v.string(),
        rating: v.number(),
        amenities: v.array(v.string()),
      })
    ),
    tags: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) {
      throw new Error("Unauthorized");
    }

    if (args.startDate >= args.endDate) {
      throw new Error("End date must be after start date");
    }

    const durationDays = Math.ceil(
      (args.endDate - args.startDate) / (1000 * 60 * 60 * 24)
    );

    const packageId = await ctx.db.insert("travelPackages", {
      creatorId: user._id,
      destination: args.destination,
      title: args.title,
      description: args.description,
      imageUrl: args.imageUrl,
      startDate: args.startDate,
      endDate: args.endDate,
      durationDays,
      price: args.price,
      maxParticipants: args.maxParticipants,
      currentParticipants: 1, // the creator automatically counts as one
      accommodation: args.accommodation,
      accommodationDetails: args.accommodationDetails,
      status: "published",
      tags: args.tags ?? [],
      updatedAt: Date.now(),
    });

    // Add creator as first participant
    await ctx.db.insert("travelPackageParticipants", {
      travelPackageId: packageId,
      userId: user._id,
      joinedAt: Date.now(),
    });

    return { id: packageId };
  },
});

export const seedMockPackages = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) throw new Error("Unauthorized");

    // Creating some mock packages with mock image URLs from unsplash
    const mockPackages = [
      {
        title: "Aventura Mágica en Cusco",
        destination: "Cusco, Perú",
        description: "Explora las maravillas del imperio inca, camina por Machu Picchu y admira la arquitectura colonial.",
        imageUrl: "https://images.unsplash.com/photo-1587595431973-160d0d94add1?w=800&q=80",
        startDate: Date.now() + 1000 * 60 * 60 * 24 * 7, // in 7 days
        endDate: Date.now() + 1000 * 60 * 60 * 24 * 14, // in 14 days
        durationDays: 7,
        price: 800,
        maxParticipants: 10,
        currentParticipants: 1,
        status: "published" as "published",
        tags: ["Aventura", "Historia", "Naturaleza"],
      },
      {
        title: "Relajación Total en las Playas de Tulum",
        destination: "Tulum, México",
        description: "Refúgiate de la rutina en el mar Caribe. Disfruta de la brisa marina, los cenotes y las ruinas mayas.",
        imageUrl: "https://images.unsplash.com/photo-1510414842594-a61c69b5ae57?w=800&q=80",
        startDate: Date.now() + 1000 * 60 * 60 * 24 * 15,
        endDate: Date.now() + 1000 * 60 * 60 * 24 * 20,
        durationDays: 5,
        price: 1200,
        maxParticipants: 5,
        currentParticipants: 1,
        status: "published" as "published",
        tags: ["Playa", "Relax", "Amigos"],
      },
      {
        title: "Expedición a la Patagonia",
        destination: "Patagonia, Argentina",
        description: "Adéntrate en el fin del mundo. Senderismo en glaciares y paisajes de ensueño.",
        imageUrl: "https://images.unsplash.com/photo-1517411032315-54ef2cb783bb?w=800&q=80",
        startDate: Date.now() + 1000 * 60 * 60 * 24 * 30,
        endDate: Date.now() + 1000 * 60 * 60 * 24 * 40,
        durationDays: 10,
        price: 2500,
        maxParticipants: 8,
        currentParticipants: 1,
        status: "published" as "published",
        tags: ["Naturaleza", "Frío", "Aventura Extrema"],
      },
    ];

    for (const pkg of mockPackages) {
      const packageId = await ctx.db.insert("travelPackages", {
        creatorId: user._id,
        updatedAt: Date.now(),
        ...pkg,
      });
      await ctx.db.insert("travelPackageParticipants", {
        travelPackageId: packageId,
        userId: user._id,
        joinedAt: Date.now(),
      });
    }

    return "Mock packages created successfully";
  }
});

export const addActivity = mutation({
  args: {
    travelPackageId: v.id("travelPackages"),
    activity: v.object({
      title: v.string(),
      description: v.string(),
      date: v.number(),
      location: v.string(),
      duration: v.string(),
      isIncluded: v.boolean(),
      cost: v.optional(v.number()),
    }),
  },
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) {
      throw new Error("Unauthorized");
    }

    const tPackage = await ctx.db.get(args.travelPackageId);
    if (!tPackage) throw new Error("Package not found");

    if (tPackage.creatorId !== user._id) {
      throw new Error("Only the creator can add activities");
    }

    return await ctx.db.insert("travelPackageActivities", {
      travelPackageId: args.travelPackageId,
      title: args.activity.title,
      description: args.activity.description,
      date: args.activity.date,
      location: args.activity.location,
      duration: args.activity.duration,
      isIncluded: args.activity.isIncluded,
      cost: args.activity.cost,
    });
  },
});

export const list = query({
  args: {
    searchTerm: v.optional(v.string()), // To search by destination or title
    status: v.optional(v.union(v.literal("draft"), v.literal("published"), v.literal("cancelled"))),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
    minDuration: v.optional(v.number()),
    maxDuration: v.optional(v.number()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let limit = args.limit ?? 50;

    let results;

    if (args.status) {
      results = await ctx.db.query("travelPackages")
        .withIndex("by_status", (idx) => idx.eq("status", args.status!))
        .take(1000);
    } else {
      results = await ctx.db.query("travelPackages").take(1000);
    }

    // Application-level filtering for advanced combinations (real-time filtering simulation)
    if (args.searchTerm) {
      const term = args.searchTerm.toLowerCase();
      results = results.filter(
        (pkg) =>
          pkg.destination.toLowerCase().includes(term) ||
          pkg.title.toLowerCase().includes(term)
      );
    }

    if (args.startDate) {
      results = results.filter((pkg) => pkg.startDate >= args.startDate!);
    }

    if (args.endDate) {
      results = results.filter((pkg) => pkg.endDate <= args.endDate!);
    }

    if (args.minDuration) {
      results = results.filter((pkg) => pkg.durationDays >= args.minDuration!);
    }

    if (args.maxDuration) {
      results = results.filter((pkg) => pkg.durationDays <= args.maxDuration!);
    }

    // Getting the creator profiles
    const mappedResults = await Promise.all(
      results.slice(0, limit).map(async (pkg) => {
        const creatorProfile = await ctx.db
          .query("profiles")
          .withIndex("by_userId", (q) => q.eq("userId", pkg.creatorId))
          .first();
        return {
          ...pkg,
          creatorInfo: creatorProfile,
          statusLabel: STATUS_LABELS[pkg.status] || pkg.status,
        };
      })
    );

    return mappedResults;
  },
});

export const getMine = query({
  args: {},
  handler: async (ctx) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) throw new Error("Unauthorized");

    const results = await ctx.db
      .query("travelPackages")
      .withIndex("by_creatorId", (q) => q.eq("creatorId", user._id))
      .collect();

    return results.map((pkg) => ({
      ...pkg,
      statusLabel: STATUS_LABELS[pkg.status] || pkg.status,
    }));
  },
});

export const remove = mutation({
  args: { id: v.id("travelPackages") },
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) throw new Error("Unauthorized");

    const tPackage = await ctx.db.get(args.id);
    if (!tPackage) throw new Error("Package not found");

    if (tPackage.creatorId !== user._id) {
      throw new Error("Only the creator can delete this package");
    }

    // Optional: Delete participants and activities too or keep as cancelled
    await ctx.db.delete(args.id);
    return true;
  },
});

export const update = mutation({
  args: {
    id: v.id("travelPackages"),
    destination: v.optional(v.string()),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
    price: v.optional(v.number()),
    maxParticipants: v.optional(v.number()),
    status: v.optional(v.union(v.literal("draft"), v.literal("published"), v.literal("cancelled"))),
  },
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) throw new Error("Unauthorized");

    const tPackage = await ctx.db.get(args.id);
    if (!tPackage) throw new Error("Package not found");

    if (tPackage.creatorId !== user._id) {
      throw new Error("Only the creator can edit this package");
    }

    const start = args.startDate ?? tPackage.startDate;
    const end = args.endDate ?? tPackage.endDate;
    
    if (start >= end) {
      throw new Error("End date must be after start date");
    }
    const durationDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24));

    await ctx.db.patch(args.id, {
      destination: args.destination ?? tPackage.destination,
      title: args.title ?? tPackage.title,
      description: args.description ?? tPackage.description,
      imageUrl: args.imageUrl !== undefined ? args.imageUrl : tPackage.imageUrl,
      startDate: start,
      endDate: end,
      durationDays,
      price: args.price ?? tPackage.price,
      maxParticipants: args.maxParticipants ?? tPackage.maxParticipants,
      status: args.status ?? tPackage.status,
      updatedAt: Date.now(),
    });

    return true;
  },
});

export const getById = query({
  args: { id: v.id("travelPackages") },
  handler: async (ctx, args) => {
    const tPackage = await ctx.db.get(args.id);
    if (!tPackage) return null;

    const activities = await ctx.db
      .query("travelPackageActivities")
      .withIndex("by_travelPackageId", (q) => q.eq("travelPackageId", args.id))
      .collect();

    const rawParticipants = await ctx.db
      .query("travelPackageParticipants")
      .withIndex("by_travelPackageId", (q) => q.eq("travelPackageId", args.id))
      .collect();

    // BT-09: retorna perfil de cada participante desde la tabla `profiles`.
    // avatarUrl ✅ disponible via profileInfo.avatarUrl
    // name ⚠️ NO está en la tabla profiles (vive en el componente interno de
    //   betterAuth). No es accesible desde una query de Convex sin hacer
    //   un lookup por usuario autenticado. El componente de UI usa fallback
    //   de iniciales cuando profileInfo no tiene name.
    const participants = await Promise.all(
      rawParticipants.map(async (p) => {
        const profile = await ctx.db
          .query("profiles")
          .withIndex("by_userId", (q) => q.eq("userId", p.userId))
          .first();
        return {
          userId: p.userId,
          joinedAt: p.joinedAt,
          profileInfo: profile, // contiene avatarUrl, description, averageRating
        };
      })
    );

    const organizerProfile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", tPackage.creatorId))
      .first();

    return {
      ...tPackage,
      activities,
      participants,
      organizerInfo: organizerProfile,
      statusLabel: STATUS_LABELS[tPackage.status] || tPackage.status,
    };
  },
});

export const joinPackage = mutation({
  args: { travelPackageId: v.id("travelPackages") },
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) throw new ConvexError("No autorizado");
    const userId = user._id;

    const tPackage = await ctx.db.get(args.travelPackageId);
    if (!tPackage) throw new ConvexError("Paquete no encontrado");

    if (tPackage.creatorId === userId) {
      throw new ConvexError("No puedes unirte a tu propio paquete de viaje");
    }

    if (tPackage.status !== "published") {
      throw new ConvexError("Este paquete no está disponible para inscripciones");
    }

    if (tPackage.currentParticipants >= tPackage.maxParticipants) {
      throw new ConvexError("Este paquete ya no tiene cupos disponibles");
    }

    const existingParticipant = await ctx.db
      .query("travelPackageParticipants")
      .withIndex("by_package_and_user", (q) =>
        q.eq("travelPackageId", args.travelPackageId).eq("userId", userId)
      )
      .first();

    if (existingParticipant) {
      throw new ConvexError("Ya estás inscrito en este viaje");
    }

    await ctx.db.insert("travelPackageParticipants", {
      travelPackageId: args.travelPackageId,
      userId,
      joinedAt: Date.now(),
    });

    await ctx.db.patch(args.travelPackageId, {
      currentParticipants: tPackage.currentParticipants + 1,
    });

    return true;
  },
});

export const leavePackage = mutation({
  args: { travelPackageId: v.id("travelPackages") },
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) throw new ConvexError("No autorizado");
    const userId = user._id;

    const tPackage = await ctx.db.get(args.travelPackageId);
    if (!tPackage) throw new ConvexError("Paquete no encontrado");

    // El creador no puede abandonar su propio paquete
    if (tPackage.creatorId === userId) {
      throw new ConvexError("El creador no puede abandonar su propio paquete");
    }

    // Buscar la inscripción activa del usuario
    const inscription = await ctx.db
      .query("travelPackageParticipants")
      .withIndex("by_package_and_user", (q) =>
        q.eq("travelPackageId", args.travelPackageId).eq("userId", userId)
      )
      .first();

    if (!inscription) {
      throw new ConvexError("No estás inscrito en este paquete");
    }

    // Eliminar la inscripción
    await ctx.db.delete(inscription._id);

    // IMPORTANTE: decrementar el contador explícitamente.
    // La reactividad de Convex actualiza las queries, pero NO los contadores
    // desnormalizados como currentParticipants.
    await ctx.db.patch(args.travelPackageId, {
      currentParticipants: Math.max(0, tPackage.currentParticipants - 1),
    });

    return true;
  },
});