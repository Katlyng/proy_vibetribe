import { v } from "convex/values";
import { action, internalAction, internalMutation, internalQuery, query } from "./_generated/server";
import { internal } from "./_generated/api";

// Fuente de la tasa de cambio en vivo.
// exchangerate-api.com (plan gratuito, sin API key).
// Devuelve: { base: "COP", rates: { USD: 0.000251, ... } } donde rates.USD = 1 COP en USD.
// Invertimos: 1 / rates.USD = cuántos COP vale 1 USD.
export const EXCHANGE_RATE_API_URL =
  "https://api.exchangerate-api.com/v4/latest/COP";

export const EXCHANGE_RATE_API_SOURCE = "exchangerate-api.com";

// Fallback usado SOLO cuando:
//   - la tabla currencyRates está vacía (primer deploy, cron aún no corrió)
//   - la API externa falló en el último fetch
// La app nunca debería mostrar este valor en producción, solo en emergencias.
const FALLBACK_COP_PER_USD = 4000;

const STALE_THRESHOLD_MS = 6 * 60 * 60 * 1000;

export const _storeRate = internalMutation({
  args: {
    base: v.string(),
    target: v.string(),
    copPerUsd: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("currencyRates")
      .withIndex("by_base_and_target", (q) =>
        q.eq("base", args.base).eq("target", args.target)
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        copPerUsd: args.copPerUsd,
        updatedAt: Date.now(),
      });
    } else {
      await ctx.db.insert("currencyRates", {
        base: args.base,
        target: args.target,
        copPerUsd: args.copPerUsd,
        updatedAt: Date.now(),
      });
    }

    return null;
  },
});

async function fetchCopPerUsdFromApi(): Promise<number | null> {
  try {
    const res = await fetch(EXCHANGE_RATE_API_URL, {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) {
      console.error(`[currency] API responded with HTTP ${res.status}`);
      return null;
    }
    const data: any = await res.json();
    const usdRate = data?.rates?.USD;
    if (typeof usdRate !== "number" || !Number.isFinite(usdRate) || usdRate <= 0) {
      console.error("[currency] Invalid USD rate in API response", data);
      return null;
    }
    const copPerUsd = 1 / usdRate;
    if (!Number.isFinite(copPerUsd) || copPerUsd <= 0) {
      return null;
    }
    return copPerUsd;
  } catch (e) {
    console.error("[currency] Failed to fetch exchange rate:", e);
    return null;
  }
}

export const refreshExchangeRate = internalAction({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const copPerUsd = await fetchCopPerUsdFromApi();
    if (copPerUsd !== null) {
      await ctx.runMutation(internal.currency._storeRate, {
        base: "COP",
        target: "USD",
        copPerUsd,
      });
    }
    return null;
  },
});

export const refreshExchangeRatePublic = action({
  args: {},
  returns: v.object({
    refreshed: v.boolean(),
    copPerUsd: v.number(),
    source: v.string(),
  }),
  handler: async (ctx): Promise<{
    refreshed: boolean;
    copPerUsd: number;
    source: string;
  }> => {
    const copPerUsd = await fetchCopPerUsdFromApi();
    if (copPerUsd !== null) {
      await ctx.runMutation(internal.currency._storeRate, {
        base: "COP",
        target: "USD",
        copPerUsd,
      });
      return { refreshed: true, copPerUsd, source: EXCHANGE_RATE_API_SOURCE };
    }
    const current: number = await ctx.runQuery(
      internal.currency._getCopPerUsdInternal
    );
    return { refreshed: false, copPerUsd: current, source: "fallback" };
  },
});

export const _getCopPerUsdInternal = internalQuery({
  args: {},
  returns: v.number(),
  handler: async (ctx) => {
    const rate = await ctx.db
      .query("currencyRates")
      .withIndex("by_base_and_target", (q) =>
        q.eq("base", "COP").eq("target", "USD")
      )
      .first();
    return rate?.copPerUsd ?? FALLBACK_COP_PER_USD;
  },
});

export const getExchangeRate = query({
  args: {},
  returns: v.object({
    copPerUsd: v.number(),
    updatedAt: v.number(),
    isStale: v.boolean(),
    isFallback: v.boolean(),
    source: v.string(),
  }),
  handler: async (ctx) => {
    const rate = await ctx.db
      .query("currencyRates")
      .withIndex("by_base_and_target", (q) =>
        q.eq("base", "COP").eq("target", "USD")
      )
      .first();

    if (!rate) {
      return {
        copPerUsd: FALLBACK_COP_PER_USD,
        updatedAt: 0,
        isStale: true,
        isFallback: true,
        source: "fallback",
      };
    }

    const age = Date.now() - rate.updatedAt;
    return {
      copPerUsd: rate.copPerUsd,
      updatedAt: rate.updatedAt,
      isStale: age > STALE_THRESHOLD_MS,
      isFallback: false,
      source: EXCHANGE_RATE_API_SOURCE,
    };
  },
});
