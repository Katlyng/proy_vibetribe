import {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useRef,
  type ReactNode,
} from "react";
import {
  useQuery,
  useAction,
  Authenticated,
  Unauthenticated,
} from "convex/react";

import { api } from "@proy_vibetribe/backend/convex/_generated/api";
import {
  DEFAULT_CURRENCY,
  FALLBACK_COP_PER_USD,
  formatPrice as formatPriceUtil,
  formatPriceCompact as formatPriceCompactUtil,
  type Currency,
} from "@/lib/currency";

interface CurrencyContextValue {
  currency: Currency;
  copPerUsd: number;
  isStale: boolean;
  isFallback: boolean;
  isLoading: boolean;
  source: string;
  updatedAt: number;
  formatPrice: (amountInCop: number) => string;
  formatPriceCompact: (amountInCop: number) => string;
  refreshRate: () => Promise<void>;
}

const CurrencyContext = createContext<CurrencyContextValue | null>(null);

const unauthenticatedValue: CurrencyContextValue = {
  currency: DEFAULT_CURRENCY,
  copPerUsd: FALLBACK_COP_PER_USD,
  isStale: true,
  isFallback: true,
  isLoading: false,
  source: "fallback",
  updatedAt: 0,
  formatPrice: (amountInCop) =>
    formatPriceUtil(amountInCop, DEFAULT_CURRENCY, FALLBACK_COP_PER_USD),
  formatPriceCompact: (amountInCop) =>
    formatPriceCompactUtil(amountInCop, DEFAULT_CURRENCY, FALLBACK_COP_PER_USD),
  refreshRate: async () => {},
};

function buildValue(args: {
  copPerUsd: number;
  isStale: boolean;
  isFallback: boolean;
  isLoading: boolean;
  source: string;
  updatedAt: number;
  currency: Currency;
  refreshRate: () => Promise<void>;
}): CurrencyContextValue {
  return {
    ...args,
    formatPrice: (amountInCop: number) =>
      formatPriceUtil(amountInCop, args.currency, args.copPerUsd),
    formatPriceCompact: (amountInCop: number) =>
      formatPriceCompactUtil(amountInCop, args.currency, args.copPerUsd),
  };
}

function AuthenticatedCurrencyProvider({ children }: { children: ReactNode }) {
  const myProfile = useQuery(api.profiles.getMine);
  const rateInfo = useQuery(api.currency.getExchangeRate, {});
  const refreshRateAction = useAction(api.currency.refreshExchangeRatePublic);

  const refreshRate = useCallback(async () => {
    try {
      await refreshRateAction({});
    } catch (e) {
      console.error("Failed to refresh exchange rate:", e);
    }
  }, [refreshRateAction]);

  const currency: Currency =
    (myProfile as any)?.preferredCurrency ?? DEFAULT_CURRENCY;

  const copPerUsd = rateInfo?.copPerUsd ?? FALLBACK_COP_PER_USD;
  const isStale = rateInfo?.isStale ?? true;
  const isFallback = rateInfo?.isFallback ?? true;
  const source = rateInfo?.source ?? "fallback";
  const updatedAt = rateInfo?.updatedAt ?? 0;
  const isLoading = myProfile === undefined || rateInfo === undefined;

  const hasTriggeredInitialRefresh = useRef(false);
  useEffect(() => {
    if (rateInfo === undefined) return;
    if (hasTriggeredInitialRefresh.current) return;
    if (rateInfo.isFallback || rateInfo.isStale) {
      hasTriggeredInitialRefresh.current = true;
      refreshRate();
    } else {
      hasTriggeredInitialRefresh.current = true;
    }
  }, [rateInfo, refreshRate]);

  const value = buildValue({
    copPerUsd,
    isStale,
    isFallback,
    isLoading,
    source,
    updatedAt,
    currency,
    refreshRate,
  });

  return (
    <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>
  );
}

export function CurrencyProvider({ children }: { children: ReactNode }) {
  return (
    <>
      <Authenticated>
        <AuthenticatedCurrencyProvider>{children}</AuthenticatedCurrencyProvider>
      </Authenticated>
      <Unauthenticated>
        <CurrencyContext.Provider value={unauthenticatedValue}>
          {children}
        </CurrencyContext.Provider>
      </Unauthenticated>
    </>
  );
}

export function useCurrency(): CurrencyContextValue {
  const ctx = useContext(CurrencyContext);
  if (!ctx) return unauthenticatedValue;
  return ctx;
}
