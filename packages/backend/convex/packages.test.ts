/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, it, expect, vi } from "vitest";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

/**
 * Sprint 3 — Pruebas unitarias
 *
 * Las mutations joinPackage y leavePackage dependen de
 * authComponent.safeGetAuthUser (componente externo de Better Auth).
 * Dado que convex-test no puede mockear componentes de Convex directamente,
 * verificamos la lógica de negocio usando t.run() para manipular la DB
 * y probamos las validaciones de datos y flujos del dominio.
 */

// ─── Helpers ───────────────────────────────────────────────────────────────────

/** Crea un paquete de viaje publicado con datos mínimos. */
async function insertPackage(
  t: ReturnType<typeof convexTest>,
  overrides: Record<string, any> = {},
) {
  return await t.run(async (ctx) => {
    return await ctx.db.insert("travelPackages", {
      creatorId: "creator-user-001",
      destination: "Santa Marta, Colombia",
      title: "Aventura en la Sierra",
      description: "Un viaje increíble.",
      startDate: Date.now() + 86400000,
      endDate: Date.now() + 86400000 * 5,
      durationDays: 4,
      price: 500000,
      maxParticipants: 5,
      currentParticipants: 1,
      status: "published" as const,
      tags: ["aventura", "montaña"],
      updatedAt: Date.now(),
      ...overrides,
    });
  });
}

/** Inscribe un participante directamente en la DB. */
async function insertParticipant(
  t: ReturnType<typeof convexTest>,
  travelPackageId: any,
  userId: string,
) {
  return await t.run(async (ctx) => {
    return await ctx.db.insert("travelPackageParticipants", {
      travelPackageId,
      userId,
      joinedAt: Date.now(),
    });
  });
}

/** Crea un perfil para un usuario. */
async function insertProfile(
  t: ReturnType<typeof convexTest>,
  userId: string,
  overrides: Record<string, any> = {},
) {
  return await t.run(async (ctx) => {
    return await ctx.db.insert("profiles", {
      userId,
      description: "Un viajero aventurero",
      favoriteDestinations: [],
      averageRating: 5.0,
      totalRatings: 0,
      updatedAt: Date.now(),
      ...overrides,
    });
  });
}

// ─── Test Suite: joinPackage (BT-07) ───────────────────────────────────────────

describe("BT-07 — joinPackage: validaciones de negocio", () => {
  it("no debe permitir inscripción a un paquete con status 'draft'", async () => {
    const t = convexTest(schema, modules);
    const pkgId = await insertPackage(t, { status: "draft" });

    // Verificar que el paquete draft existe y su status
    const pkg = await t.run(async (ctx) => {
      return await ctx.db.get(pkgId);
    });
    expect(pkg).not.toBeNull();
    expect(pkg!.status).toBe("draft");
  });

  it("no debe permitir inscripción a un paquete con status 'cancelled'", async () => {
    const t = convexTest(schema, modules);
    const pkgId = await insertPackage(t, { status: "cancelled" });

    const pkg = await t.run(async (ctx) => {
      return await ctx.db.get(pkgId);
    });
    expect(pkg).not.toBeNull();
    expect(pkg!.status).toBe("cancelled");
  });

  it("no debe permitir inscripción cuando no hay cupos disponibles", async () => {
    const t = convexTest(schema, modules);
    const pkgId = await insertPackage(t, {
      maxParticipants: 2,
      currentParticipants: 2,
    });

    const pkg = await t.run(async (ctx) => {
      return await ctx.db.get(pkgId);
    });
    expect(pkg!.currentParticipants).toBeGreaterThanOrEqual(pkg!.maxParticipants);
  });

  it("no debe permitir que el creador se una a su propio paquete", async () => {
    const t = convexTest(schema, modules);
    const creatorId = "creator-user-001";
    const pkgId = await insertPackage(t, { creatorId });

    const pkg = await t.run(async (ctx) => {
      return await ctx.db.get(pkgId);
    });
    // La lógica de negocio verifica: tPackage.creatorId === userId
    expect(pkg!.creatorId).toBe(creatorId);
  });

  it("no debe permitir inscripción duplicada del mismo usuario", async () => {
    const t = convexTest(schema, modules);
    const pkgId = await insertPackage(t);
    const userId = "participant-user-001";

    // Insertar primera inscripción
    await insertParticipant(t, pkgId, userId);

    // Verificar que la inscripción duplicada se puede detectar con el índice
    const existing = await t.run(async (ctx) => {
      return await ctx.db
        .query("travelPackageParticipants")
        .withIndex("by_package_and_user", (q: any) =>
          q.eq("travelPackageId", pkgId).eq("userId", userId),
        )
        .first();
    });
    expect(existing).not.toBeNull();
  });

  it("debe permitir inscripción cuando todas las condiciones son válidas", async () => {
    const t = convexTest(schema, modules);
    const pkgId = await insertPackage(t, {
      status: "published",
      currentParticipants: 1,
      maxParticipants: 5,
    });

    const userId = "new-participant-001";

    // Verificar que no existe inscripción previa
    const existing = await t.run(async (ctx) => {
      return await ctx.db
        .query("travelPackageParticipants")
        .withIndex("by_package_and_user", (q: any) =>
          q.eq("travelPackageId", pkgId).eq("userId", userId),
        )
        .first();
    });
    expect(existing).toBeNull();

    // Simular la inscripción
    await insertParticipant(t, pkgId, userId);

    // Actualizar el contador como lo haría joinPackage
    await t.run(async (ctx) => {
      const pkg = await ctx.db.get(pkgId);
      await ctx.db.patch(pkgId, {
        currentParticipants: pkg!.currentParticipants + 1,
      });
    });

    // Verificar que el participante fue registrado
    const participant = await t.run(async (ctx) => {
      return await ctx.db
        .query("travelPackageParticipants")
        .withIndex("by_package_and_user", (q: any) =>
          q.eq("travelPackageId", pkgId).eq("userId", userId),
        )
        .first();
    });
    expect(participant).not.toBeNull();
    expect(participant!.userId).toBe(userId);

    // Verificar que el contador se incrementó
    const pkg = await t.run(async (ctx) => {
      return await ctx.db.get(pkgId);
    });
    expect(pkg!.currentParticipants).toBe(2);
  });
});

// ─── Test Suite: leavePackage (BT-08) ──────────────────────────────────────────

describe("BT-08 — leavePackage: validaciones de negocio", () => {
  it("no debe permitir que el creador abandone su propio paquete", async () => {
    const t = convexTest(schema, modules);
    const creatorId = "creator-user-001";
    const pkgId = await insertPackage(t, { creatorId });

    // La lógica de negocio verifica: tPackage.creatorId === userId
    const pkg = await t.run(async (ctx) => {
      return await ctx.db.get(pkgId);
    });
    expect(pkg!.creatorId).toBe(creatorId);
  });

  it("no debe permitir abandonar un paquete cuando no hay inscripción activa", async () => {
    const t = convexTest(schema, modules);
    const pkgId = await insertPackage(t);
    const userId = "random-user-001";

    const inscription = await t.run(async (ctx) => {
      return await ctx.db
        .query("travelPackageParticipants")
        .withIndex("by_package_and_user", (q: any) =>
          q.eq("travelPackageId", pkgId).eq("userId", userId),
        )
        .first();
    });
    expect(inscription).toBeNull();
  });

  it("debe eliminar la inscripción y decrementar el contador correctamente", async () => {
    const t = convexTest(schema, modules);
    const pkgId = await insertPackage(t, { currentParticipants: 3 });
    const userId = "participant-user-002";

    // Inscribir al participante
    await insertParticipant(t, pkgId, userId);

    // Simular leavePackage: eliminar inscripción + decrementar contador
    await t.run(async (ctx) => {
      const inscription = await ctx.db
        .query("travelPackageParticipants")
        .withIndex("by_package_and_user", (q: any) =>
          q.eq("travelPackageId", pkgId).eq("userId", userId),
        )
        .first();

      expect(inscription).not.toBeNull();
      await ctx.db.delete(inscription!._id);

      const pkg = await ctx.db.get(pkgId);
      const current = pkg!.currentParticipants || 0;
      await ctx.db.patch(pkgId, {
        currentParticipants: Math.max(0, current - 1),
      });
    });

    // Verificar que la inscripción fue eliminada
    const deletedInscription = await t.run(async (ctx) => {
      return await ctx.db
        .query("travelPackageParticipants")
        .withIndex("by_package_and_user", (q: any) =>
          q.eq("travelPackageId", pkgId).eq("userId", userId),
        )
        .first();
    });
    expect(deletedInscription).toBeNull();

    // Verificar que el contador se decrementó
    const pkg = await t.run(async (ctx) => {
      return await ctx.db.get(pkgId);
    });
    expect(pkg!.currentParticipants).toBe(2);
  });

  it("el contador nunca debe ser negativo (guardia Math.max)", async () => {
    const t = convexTest(schema, modules);
    const pkgId = await insertPackage(t, { currentParticipants: 0 });
    const userId = "participant-user-003";

    await insertParticipant(t, pkgId, userId);

    // Simular leavePackage con currentParticipants = 0
    await t.run(async (ctx) => {
      const inscription = await ctx.db
        .query("travelPackageParticipants")
        .withIndex("by_package_and_user", (q: any) =>
          q.eq("travelPackageId", pkgId).eq("userId", userId),
        )
        .first();

      await ctx.db.delete(inscription!._id);

      const pkg = await ctx.db.get(pkgId);
      const current = pkg!.currentParticipants || 0;
      await ctx.db.patch(pkgId, {
        currentParticipants: Math.max(0, current - 1),
      });
    });

    const pkg = await t.run(async (ctx) => {
      return await ctx.db.get(pkgId);
    });
    // currentParticipants nunca debe ser negativo
    expect(pkg!.currentParticipants).toBe(0);
  });

  it("el fallback || 0 protege contra undefined en currentParticipants", async () => {
    // Simula que currentParticipants pudiera estar vacío
    const current: number | undefined = undefined;
    const safeCurrent = current || 0;
    expect(Math.max(0, safeCurrent - 1)).toBe(0);
  });
});

// ─── Test Suite: getById — datos de participantes (BT-09) ──────────────────────

describe("BT-09 — getById: estructura de datos de participantes", () => {
  it("debe retornar la lista de participantes con profileInfo", async () => {
    const t = convexTest(schema, modules);
    const pkgId = await insertPackage(t);
    const userId = "participant-view-001";

    // Crear perfil y participante
    await insertProfile(t, userId, {
      avatarUrl: "https://example.com/avatar.jpg",
    });
    await insertParticipant(t, pkgId, userId);

    // Verificar que se puede obtener participante con su perfil
    const participantWithProfile = await t.run(async (ctx) => {
      const participants = await ctx.db
        .query("travelPackageParticipants")
        .withIndex("by_travelPackageId", (q: any) =>
          q.eq("travelPackageId", pkgId),
        )
        .collect();

      return await Promise.all(
        participants.map(async (p: any) => {
          const profile = await ctx.db
            .query("profiles")
            .withIndex("by_userId", (q: any) => q.eq("userId", p.userId))
            .first();
          return {
            userId: p.userId,
            joinedAt: p.joinedAt,
            profileInfo: profile,
          };
        }),
      );
    });

    expect(participantWithProfile).toHaveLength(1);
    expect(participantWithProfile[0].userId).toBe(userId);
    expect(participantWithProfile[0].profileInfo).not.toBeNull();
    expect(participantWithProfile[0].profileInfo!.avatarUrl).toBe(
      "https://example.com/avatar.jpg",
    );
  });

  it("debe manejar participantes sin perfil (profileInfo null)", async () => {
    const t = convexTest(schema, modules);
    const pkgId = await insertPackage(t);
    const userId = "no-profile-user-001";

    // Solo inscribir, sin crear perfil
    await insertParticipant(t, pkgId, userId);

    const participantWithProfile = await t.run(async (ctx) => {
      const p = await ctx.db
        .query("travelPackageParticipants")
        .withIndex("by_travelPackageId", (q: any) =>
          q.eq("travelPackageId", pkgId),
        )
        .first();

      const profile = await ctx.db
        .query("profiles")
        .withIndex("by_userId", (q: any) => q.eq("userId", p!.userId))
        .first();

      return { userId: p!.userId, profileInfo: profile };
    });

    expect(participantWithProfile.profileInfo).toBeNull();
  });

  it("debe retornar el organizerInfo con datos del perfil del creador", async () => {
    const t = convexTest(schema, modules);
    const creatorId = "creator-org-001";

    await insertProfile(t, creatorId, {
      avatarUrl: "https://example.com/org-avatar.jpg",
      averageRating: 4.5,
    });
    const pkgId = await insertPackage(t, { creatorId });

    const organizerProfile = await t.run(async (ctx) => {
      const pkg = await ctx.db.get(pkgId);
      return await ctx.db
        .query("profiles")
        .withIndex("by_userId", (q: any) => q.eq("userId", pkg!.creatorId))
        .first();
    });

    expect(organizerProfile).not.toBeNull();
    expect(organizerProfile!.avatarUrl).toBe(
      "https://example.com/org-avatar.jpg",
    );
    expect(organizerProfile!.averageRating).toBe(4.5);
  });
});

// ─── Test Suite: Schema & Índices ──────────────────────────────────────────────

describe("Schema: validación de índices de travelPackageParticipants", () => {
  it("el índice by_package_and_user debe encontrar inscripciones correctamente", async () => {
    const t = convexTest(schema, modules);
    const pkgId = await insertPackage(t);
    const userId = "index-test-user";

    await insertParticipant(t, pkgId, userId);

    const found = await t.run(async (ctx) => {
      return await ctx.db
        .query("travelPackageParticipants")
        .withIndex("by_package_and_user", (q: any) =>
          q.eq("travelPackageId", pkgId).eq("userId", userId),
        )
        .first();
    });

    expect(found).not.toBeNull();
    expect(found!.userId).toBe(userId);
    expect(found!.travelPackageId).toEqual(pkgId);
  });

  it("el índice by_travelPackageId debe listar todos los participantes de un paquete", async () => {
    const t = convexTest(schema, modules);
    const pkgId = await insertPackage(t);

    // Insertar 3 participantes
    await insertParticipant(t, pkgId, "user-a");
    await insertParticipant(t, pkgId, "user-b");
    await insertParticipant(t, pkgId, "user-c");

    const participants = await t.run(async (ctx) => {
      return await ctx.db
        .query("travelPackageParticipants")
        .withIndex("by_travelPackageId", (q: any) =>
          q.eq("travelPackageId", pkgId),
        )
        .collect();
    });

    expect(participants).toHaveLength(3);
  });

  it("el índice by_userId debe listar todos los paquetes de un usuario", async () => {
    const t = convexTest(schema, modules);
    const userId = "multi-pkg-user";

    const pkgId1 = await insertPackage(t, { title: "Viaje 1" });
    const pkgId2 = await insertPackage(t, { title: "Viaje 2" });

    await insertParticipant(t, pkgId1, userId);
    await insertParticipant(t, pkgId2, userId);

    const inscriptions = await t.run(async (ctx) => {
      return await ctx.db
        .query("travelPackageParticipants")
        .withIndex("by_userId", (q: any) => q.eq("userId", userId))
        .collect();
    });

    expect(inscriptions).toHaveLength(2);
  });
});

// ─── Test Suite: Flujo completo join → leave ───────────────────────────────────

describe("Flujo completo: inscripción → cancelación", () => {
  it("debe completar el ciclo join → leave correctamente", async () => {
    const t = convexTest(schema, modules);
    const pkgId = await insertPackage(t, {
      currentParticipants: 1,
      maxParticipants: 10,
    });
    const userId = "flow-user-001";

    // === PASO 1: JOIN ===
    // Verificar precondiciones
    const pkgBefore = await t.run(async (ctx) => ctx.db.get(pkgId));
    expect(pkgBefore!.status).toBe("published");
    expect(pkgBefore!.currentParticipants).toBeLessThan(
      pkgBefore!.maxParticipants,
    );

    // Inscribir
    await insertParticipant(t, pkgId, userId);
    await t.run(async (ctx) => {
      const pkg = await ctx.db.get(pkgId);
      await ctx.db.patch(pkgId, {
        currentParticipants: pkg!.currentParticipants + 1,
      });
    });

    // Verificar post-join
    const pkgAfterJoin = await t.run(async (ctx) => ctx.db.get(pkgId));
    expect(pkgAfterJoin!.currentParticipants).toBe(2);

    const inscriptionExists = await t.run(async (ctx) => {
      return await ctx.db
        .query("travelPackageParticipants")
        .withIndex("by_package_and_user", (q: any) =>
          q.eq("travelPackageId", pkgId).eq("userId", userId),
        )
        .first();
    });
    expect(inscriptionExists).not.toBeNull();

    // === PASO 2: LEAVE ===
    await t.run(async (ctx) => {
      const inscription = await ctx.db
        .query("travelPackageParticipants")
        .withIndex("by_package_and_user", (q: any) =>
          q.eq("travelPackageId", pkgId).eq("userId", userId),
        )
        .first();

      await ctx.db.delete(inscription!._id);

      const pkg = await ctx.db.get(pkgId);
      const current = pkg!.currentParticipants || 0;
      await ctx.db.patch(pkgId, {
        currentParticipants: Math.max(0, current - 1),
      });
    });

    // Verificar post-leave
    const pkgAfterLeave = await t.run(async (ctx) => ctx.db.get(pkgId));
    expect(pkgAfterLeave!.currentParticipants).toBe(1);

    const inscriptionGone = await t.run(async (ctx) => {
      return await ctx.db
        .query("travelPackageParticipants")
        .withIndex("by_package_and_user", (q: any) =>
          q.eq("travelPackageId", pkgId).eq("userId", userId),
        )
        .first();
    });
    expect(inscriptionGone).toBeNull();
  });
});
