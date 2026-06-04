import { createContext, useContext, type ReactNode } from "react";
import { useQuery, Authenticated, Unauthenticated } from "convex/react";

import { api } from "@proy_vibetribe/backend/convex/_generated/api";
import {
  DEFAULT_CURRENCY,
  formatPrice as formatPriceUtil,
  formatPriceCompact as formatPriceCompactUtil,
  type Currency,
} from "@/lib/currency";

interface CurrencyContextValue {
  currency: Currency;
  formatPrice: (amountInCop: number) => string;
  formatPriceCompact: (amountInCop: number) => string;
  isLoading: boolean;
}

const CurrencyContext = createContext<CurrencyContextValue | null>(null);

const fallbackValue: CurrencyContextValue = {
  currency: DEFAULT_CURRENCY,
  formatPrice: (amountInCop) => formatPriceUtil(amountInCop, DEFAULT_CURRENCY),
  formatPriceCompact: (amountInCop) =>
    formatPriceCompactUtil(amountInCop, DEFAULT_CURRENCY),
  isLoading: false,
};

function AuthenticatedCurrencyProvider({ children }: { children: ReactNode }) {
  const myProfile = useQuery(api.profiles.getMine);
  const currency: Currency =
    (myProfile as any)?.preferredCurrency ?? DEFAULT_CURRENCY;

  const value: CurrencyContextValue = {
    currency,
    formatPrice: (amountInCop: number) => formatPriceUtil(amountInCop, currency),
    formatPriceCompact: (amountInCop: number) =>
      formatPriceCompactUtil(amountInCop, currency),
    isLoading: myProfile === undefined,
  };

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
        <CurrencyContext.Provider value={fallbackValue}>
          {children}
        </CurrencyContext.Provider>
      </Unauthenticated>
    </>
  );
}

export function useCurrency(): CurrencyContextValue {
  const ctx = useContext(CurrencyContext);
  if (!ctx) return fallbackValue;
  return ctx;
}
