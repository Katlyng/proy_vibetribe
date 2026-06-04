import { v, ConvexError } from "convex/values";
import { mutation, query } from "./_generated/server";
import { authComponent } from "./auth";

const MAX_PHOTO_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
const MAX_PHOTOS_PER_TRIP = 20;
const MAX_CAPTION_LENGTH = 200;

export const photoValidator = v.object({
  _id: v.id("tripPhotos"),
  _creationTime: v.number(),
  userId: v.string(),
  travelPackageId: v.id("travelPackages"),
  storageId: v.id("_storage"),
  caption: v.optional(v.string()),
  uploadedAt: v.number(),
  url: v.union(v.string(), v.null()),
});

export const generateUploadUrl = mutation({
  args: {},
  returns: v.string(),
  handler: async (ctx) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) throw new ConvexError("No autorizado");
    return await ctx.storage.generateUploadUrl();
  },
});

export const addTripPhoto = mutation({
  args: {
    travelPackageId: v.id("travelPackages"),
    storageId: v.id("_storage"),
    caption: v.optional(v.string()),
  },
  returns: v.id("tripPhotos"),
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) throw new ConvexError("No autorizado");
    const userId: string = user._id;

    const storageMeta = await ctx.db.system.get("_storage", args.storageId);
    if (!storageMeta) {
      throw new ConvexError("El archivo subido no se pudo encontrar. Asegúrate de subir la foto antes de agregarla al viaje.");
    }
    if (
      !storageMeta.contentType ||
      !(ALLOWED_MIME_TYPES as readonly string[]).includes(
        storageMeta.contentType
      )
    ) {
      await ctx.storage.delete(args.storageId);
      throw new ConvexError(
        "Formato no permitido. Solo se aceptan imágenes JPEG, PNG o WebP"
      );
    }
    if (storageMeta.size > MAX_PHOTO_SIZE_BYTES) {
      await ctx.storage.delete(args.storageId);
      throw new ConvexError(
        `La imagen supera el tamaño máximo de ${
          MAX_PHOTO_SIZE_BYTES / 1024 / 1024
        } MB`
      );
    }

    if (
      args.caption !== undefined &&
      args.caption.trim().length > MAX_CAPTION_LENGTH
    ) {
      await ctx.storage.delete(args.storageId);
      throw new ConvexError(
        `La descripción no puede superar los ${MAX_CAPTION_LENGTH} caracteres`
      );
    }

    const tPackage = await ctx.db.get(args.travelPackageId);
    if (!tPackage) {
      await ctx.storage.delete(args.storageId);
      throw new ConvexError("Viaje no encontrado");
    }

    if (tPackage.endDate > Date.now()) {
      await ctx.storage.delete(args.storageId);
      throw new ConvexError(
        "Solo puedes agregar fotos a viajes que ya finalizaron"
      );
    }

    const isCreator = tPackage.creatorId === userId;

    if (!isCreator) {
      const participation = await ctx.db
        .query("travelPackageParticipants")
        .withIndex("by_package_and_user", (q) =>
          q
            .eq("travelPackageId", args.travelPackageId)
            .eq("userId", userId)
        )
        .first();
      if (!participation) {
        await ctx.storage.delete(args.storageId);
        throw new ConvexError(
          "Solo los participantes del viaje pueden subir fotos"
        );
      }
    }

    const existing = await ctx.db
      .query("tripPhotos")
      .withIndex("by_userId_and_package", (q) =>
        q
          .eq("userId", userId)
          .eq("travelPackageId", args.travelPackageId)
      )
      .collect();

    if (existing.length >= MAX_PHOTOS_PER_TRIP) {
      await ctx.storage.delete(args.storageId);
      throw new ConvexError(
        `Has alcanzado el máximo de ${MAX_PHOTOS_PER_TRIP} fotos para este viaje`
      );
    }

    const photoId = await ctx.db.insert("tripPhotos", {
      userId,
      travelPackageId: args.travelPackageId,
      storageId: args.storageId,
      caption: args.caption?.trim() || undefined,
      uploadedAt: Date.now(),
    });

    return photoId;
  },
});

export const deleteTripPhoto = mutation({
  args: { photoId: v.id("tripPhotos") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) throw new ConvexError("No autorizado");

    const photo = await ctx.db.get(args.photoId);
    if (!photo) return null;

    if (photo.userId !== user._id) {
      throw new ConvexError("No tienes permiso para eliminar esta foto");
    }

    await ctx.storage.delete(photo.storageId);
    await ctx.db.delete(args.photoId);
    return null;
  },
});

export const getMyPhotos = query({
  args: {},
  returns: v.array(photoValidator),
  handler: async (ctx) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) return [];

    const photos = await ctx.db
      .query("tripPhotos")
      .withIndex("by_userId_uploadedAt", (q) => q.eq("userId", user._id))
      .order("desc")
      .collect();

    return await Promise.all(
      photos.map(async (p) => ({
        ...p,
        url: await ctx.storage.getUrl(p.storageId),
      }))
    );
  },
});

export const getPhotosByUser = query({
  args: { userId: v.string() },
  returns: v.array(photoValidator),
  handler: async (ctx, args) => {
    const photos = await ctx.db
      .query("tripPhotos")
      .withIndex("by_userId_uploadedAt", (q) => q.eq("userId", args.userId))
      .order("desc")
      .collect();

    return await Promise.all(
      photos.map(async (p) => ({
        ...p,
        url: await ctx.storage.getUrl(p.storageId),
      }))
    );
  },
});

export const getMyPhotosInPackage = query({
  args: { travelPackageId: v.id("travelPackages") },
  returns: v.array(photoValidator),
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) return [];

    const photos = await ctx.db
      .query("tripPhotos")
      .withIndex("by_userId_and_package", (q) =>
        q
          .eq("userId", user._id)
          .eq("travelPackageId", args.travelPackageId)
      )
      .order("desc")
      .collect();

    return await Promise.all(
      photos.map(async (p) => ({
        ...p,
        url: await ctx.storage.getUrl(p.storageId),
      }))
    );
  },
});

const completedPackageValidator = v.object({
  _id: v.id("travelPackages"),
  title: v.string(),
  destination: v.string(),
  endDate: v.number(),
  startDate: v.number(),
  imageUrl: v.optional(v.string()),
  role: v.union(v.literal("creator"), v.literal("participant")),
  photoCount: v.number(),
});

export const getMyCompletedPackages = query({
  args: {},
  returns: v.array(completedPackageValidator),
  handler: async (ctx) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) return [];

    const userId: string = user._id;
    const now = Date.now();

    const created = await ctx.db
      .query("travelPackages")
      .withIndex("by_creatorId", (q) => q.eq("creatorId", userId))
      .collect();

    const participations = await ctx.db
      .query("travelPackageParticipants")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();

    const joinedIds = participations.map((p) => p.travelPackageId);
    const joinedPackages = (
      await Promise.all(joinedIds.map((id) => ctx.db.get(id)))
    ).filter((p): p is NonNullable<typeof p> => p !== null);

    const all = new Map<string, (typeof created)[number]>();
    for (const pkg of created) all.set(pkg._id, pkg);
    for (const pkg of joinedPackages) {
      if (!all.has(pkg._id)) all.set(pkg._id, pkg);
    }

    const completed = Array.from(all.values()).filter(
      (pkg) => pkg.endDate <= now && pkg.status !== "cancelled"
    );

    completed.sort((a, b) => b.endDate - a.endDate);

    return await Promise.all(
      completed.map(async (pkg) => {
        const photoRows = await ctx.db
          .query("tripPhotos")
          .withIndex("by_userId_and_package", (q) =>
            q.eq("userId", userId).eq("travelPackageId", pkg._id)
          )
          .collect();

        return {
          _id: pkg._id,
          title: pkg.title,
          destination: pkg.destination,
          endDate: pkg.endDate,
          startDate: pkg.startDate,
          imageUrl: pkg.imageUrl,
          role: pkg.creatorId === userId
            ? ("creator" as const)
            : ("participant" as const),
          photoCount: photoRows.length,
        };
      })
    );
  },
});
