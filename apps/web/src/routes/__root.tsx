import { Toaster } from "@proy_vibetribe/ui/components/sonner";
import {
  HeadContent,
  Outlet,
  createRootRouteWithContext,
} from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { Authenticated, Unauthenticated, useQuery } from "convex/react";

import { ThemeProvider } from "@/components/theme-provider";
import { CurrencyProvider } from "@/components/currency-provider";
import { BannedScreen, BannedLoadingScreen } from "@/components/banned-screen";

import { api } from "@proy_vibetribe/backend/convex/_generated/api";

import "../index.css";

export interface RouterAppContext {}

export const Route = createRootRouteWithContext<RouterAppContext>()({
  component: RootComponent,
  head: () => ({
    meta: [
      {
        title: "VibeTribe",
      },
      {
        name: "description",
        content:
          "Conecta con personas y disfruta de experiencias únicas juntos.",
      },
    ],
    links: [
      {
        rel: "icon",
        href: "/favicon.ico",
      },
    ],
  }),
});

function RootComponent() {
  return (
    <>
      <HeadContent />
      <ThemeProvider
        attribute="class"
        defaultTheme="dark"
        disableTransitionOnChange
        storageKey="vite-ui-theme"
      >
        <CurrencyProvider>
          <Authenticated>
            <BannedGate>
              <Outlet />
              <Toaster richColors />
            </BannedGate>
          </Authenticated>
          <Unauthenticated>
            <Outlet />
            <Toaster richColors />
          </Unauthenticated>
        </CurrencyProvider>
      </ThemeProvider>
      <TanStackRouterDevtools position="bottom-left" />
    </>
  );
}

function BannedGate({ children }: { children: React.ReactNode }) {
  const status = useQuery(api.admin.getMyModerationStatus, {});

  if (status === undefined) {
    return <BannedLoadingScreen />;
  }

  if (status.isBanned) {
    return (
      <BannedScreen
        bannedAt={status.bannedAt}
        banReason={status.banReason}
      />
    );
  }

  return <>{children}</>;
}
