export type Currency = "COP" | "USD";

export const DEFAULT_CURRENCY: Currency = "COP";

export const CURRENCY_OPTIONS: { value: Currency; label: string; symbol: string }[] = [
  { value: "COP", label: "Pesos colombianos (COP)", symbol: "$" },
  { value: "USD", label: "Dólares estadounidenses (USD)", symbol: "US$" },
];

export const FALLBACK_COP_PER_USD = 4000;

export function convertFromCop(
  amountInCop: number,
  targetCurrency: Currency,
  copPerUsd: number
): number {
  if (!Number.isFinite(amountInCop)) return 0;
  if (targetCurrency === "COP") return amountInCop;
  const rate = copPerUsd > 0 ? copPerUsd : FALLBACK_COP_PER_USD;
  return amountInCop / rate;
}

export function convertToCop(
  amount: number,
  fromCurrency: Currency,
  copPerUsd: number
): number {
  if (!Number.isFinite(amount)) return 0;
  if (fromCurrency === "COP") return amount;
  const rate = copPerUsd > 0 ? copPerUsd : FALLBACK_COP_PER_USD;
  return amount * rate;
}

export function formatPrice(
  amountInCop: number,
  currency: Currency = DEFAULT_CURRENCY,
  copPerUsd: number = FALLBACK_COP_PER_USD
): string {
  const value = convertFromCop(amountInCop, currency, copPerUsd);
  if (currency === "COP") {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      maximumFractionDigits: 0,
    }).format(Math.round(value));
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatPriceCompact(
  amountInCop: number,
  currency: Currency = DEFAULT_CURRENCY,
  copPerUsd: number = FALLBACK_COP_PER_USD
): string {
  const value = convertFromCop(amountInCop, currency, copPerUsd);
  if (currency === "COP") {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      maximumFractionDigits: 0,
    }).format(Math.round(value));
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}
