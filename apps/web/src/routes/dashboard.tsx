import { api } from "@proy_vibetribe/backend/convex/_generated/api";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Authenticated, AuthLoading, Unauthenticated, useQuery } from "convex/react";
import { useState, useMemo } from "react";
import { Plus } from "lucide-react";

import SignInForm from "@/components/sign-in-form";
import SignUpForm from "@/components/sign-up-form";
import UserMenu from "@/components/user-menu";
import { PackageCard } from "@/components/package-card";
import { PackageFilters } from "@/components/package-filters";
import { Button } from "@proy_vibetribe/ui/components/button";

import { z } from "zod";

export const Route = createFileRoute("/dashboard")({
  validateSearch: z.object({
    login: z.string().optional(),
  }),
  component: RouteComponent,
});

function PrivateDashboardContent() {
  const profile = useQuery(api.profiles.getMine);
  const packages = useQuery(api.packages.list, {});

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 500000]);

  const filteredPackages = useMemo(() => {
    if (!packages) return [];
    return packages.filter((pkg) => {
      const matchesSearch =
        pkg.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        pkg.destination.toLowerCase().includes(searchQuery.toLowerCase()) ||
        pkg.description.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesTag = !selectedTag || (pkg.tags && pkg.tags.includes(selectedTag));
      const matchesPrice = pkg.price >= priceRange[0] && pkg.price <= priceRange[1];

      return matchesSearch && matchesTag && matchesPrice;
    });
  }, [packages, searchQuery, selectedTag, priceRange]);

  return (
    <div className="flex-1 w-full max-w-md mx-auto md:max-w-xl lg:max-w-2xl bg-muted/20 border-x min-h-screen pb-20">
      <div className="px-5 py-6 flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <UserMenu />
            <div>
              <h1 className="text-xl font-bold leading-none">
                {profile ? `Hola, ${profile.name || 'Explorador'}` : 'VibeTribe'}
              </h1>
              <p className="text-sm text-muted-foreground">Descubre tu próxima aventura</p>
            </div>
          </div>
          <Link to="/packages/create">
            <Button size="sm" className="gap-1 flex rounded-full">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Crear viaje</span>
            </Button>
          </Link>
        </div>

        {/* Filters */}
        <PackageFilters
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          selectedTag={selectedTag}
          onTagSelect={setSelectedTag}
          priceRange={priceRange}
          onPriceRangeChange={setPriceRange}
        />

        {/* Recommended list */}
        <div className="flex flex-col gap-3">
          <h2 className="text-lg font-bold text-foreground">Paquetes Disponibles</h2>
          
          {packages === undefined ? (
            <div className="animate-pulse space-y-4">
              {[1, 2, 3].map((n) => (
                <div key={n} className="h-48 w-full bg-muted rounded-xl" />
              ))}
            </div>
          ) : filteredPackages.length > 0 ? (
            <div className="flex flex-col gap-4">
              {filteredPackages.map(pkg => (
                <PackageCard key={pkg._id} package={pkg} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 rounded-lg border border-dashed text-center">
              <p className="text-muted-foreground font-medium">No encontramos paquetes que coincidan.</p>
              <p className="text-xs text-muted-foreground mt-1">Intenta ajustar los filtros.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function RouteComponent() {
  const search = Route.useSearch();
  const [showSignIn, setShowSignIn] = useState(search.login === "true");

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Authenticated>
        <PrivateDashboardContent />
      </Authenticated>
      <Unauthenticated>
        <div className="flex-1 flex flex-col justify-center items-center py-10 w-full px-4">
          {showSignIn ? (
            <SignInForm onSwitchToSignUp={() => setShowSignIn(false)} />
          ) : (
            <SignUpForm onSwitchToSignIn={() => setShowSignIn(true)} />
          )}
        </div>
      </Unauthenticated>
      <AuthLoading>
        <div className="min-h-screen flex items-center justify-center">Cargando...</div>
      </AuthLoading>
    </div>
  );
}
