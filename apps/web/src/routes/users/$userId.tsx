import { api } from "@proy_vibetribe/backend/convex/_generated/api";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { MapPin, Star, Luggage, Map, Calendar } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

import { Avatar, AvatarFallback, AvatarImage } from "@proy_vibetribe/ui/components/avatar";
import { Badge } from "@proy_vibetribe/ui/components/badge";
import { Skeleton } from "@proy_vibetribe/ui/components/skeleton";
import { PageHeader } from "@/components/page-header";

export const Route = createFileRoute("/users/$userId")({
  component: UserProfileScreen,
});

function UserProfileScreen() {
  const { userId } = Route.useParams();
  const navigate = useNavigate();
  const profile = useQuery(api.profiles.getUserProfile, { userId });

  if (profile === undefined) {
    return <UserProfileSkeleton />;
  }

  if (profile === null) {
    return (
      <div className="flex-1 w-full max-w-md mx-auto bg-background min-h-screen">
        <PageHeader title="Perfil de Usuario" />
        <div className="flex h-[60vh] flex-col items-center justify-center gap-4 text-center p-6">
          <h2 className="text-2xl font-bold">Usuario no encontrado</h2>
          <p className="text-muted-foreground">El perfil que buscas no existe.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 w-full max-w-md mx-auto md:max-w-2xl bg-muted/20 border-x min-h-screen pb-20">
      <PageHeader title="Perfil de Viajero" />
      <div className="px-5 py-6 flex flex-col gap-6">
        
        {/* Header Profile */}
        <section className="flex flex-col items-center justify-center p-6 bg-card border rounded-2xl shadow-sm text-center">
          <Avatar className="h-24 w-24 border-4 border-background shadow-md mb-4">
            <AvatarImage src={profile.avatarUrl || undefined} alt={profile.name || "Explorer"} />
            <AvatarFallback className="text-3xl bg-secondary text-secondary-foreground font-bold">
              {(profile.name || "E")[0].toUpperCase()}
            </AvatarFallback>
          </Avatar>
          
          <h1 className="text-2xl font-bold text-foreground">
            {profile.name || "Viajero"}
          </h1>
          <p className="text-muted-foreground text-sm flex items-center justify-center gap-1 mt-1">
            <MapPin className="h-4 w-4" />
            {profile.description || "Amante de las aventuras y la naturaleza"}
          </p>

          <div className="flex items-center gap-4 mt-6 w-full justify-center divide-x">
            <div className="flex flex-col items-center px-4">
              <span className="text-sm text-muted-foreground">Calificación</span>
              <div className="flex items-center text-amber-500 font-bold mt-1 gap-1">
                {profile.averageRating?.toFixed(1) || "5.0"}
                <Star className="h-4 w-4 fill-amber-500" />
              </div>
            </div>
            
            <div className="flex flex-col items-center px-4">
              <span className="text-sm text-muted-foreground">Viajes</span>
              <div className="flex items-center font-bold mt-1 gap-1 text-foreground">
                {(profile.createdPackages?.length || 0) + (profile.joinedPackages?.length || 0)}
                <Luggage className="h-4 w-4 text-primary" />
              </div>
            </div>
          </div>
        </section>

        {/* Favorite Destinations */}
        {profile.favoriteDestinations && profile.favoriteDestinations.length > 0 && (
          <section className="bg-card border rounded-2xl p-5 shadow-sm">
            <h2 className="text-lg font-bold text-foreground mb-3 flex items-center gap-2">
              <Map className="h-5 w-5 text-primary" />
              Destinos Favoritos
            </h2>
            <div className="flex flex-wrap gap-2">
              {profile.favoriteDestinations.map((dest, idx) => (
                <Badge key={idx} variant="secondary" className="px-3 py-1">
                  {dest}
                </Badge>
              ))}
            </div>
          </section>
        )}

        {/* Created Packages */}
        {profile.createdPackages && profile.createdPackages.length > 0 && (
          <section className="flex flex-col gap-3">
            <h2 className="text-lg font-bold text-foreground px-1">Viajes Organizados</h2>
            <div className="flex flex-col gap-3">
              {profile.createdPackages.map((pkg) => (
                <PackageCard key={pkg._id} pkg={pkg} onClick={() => navigate({ to: "/packages/$id", params: { id: pkg._id } })} />
              ))}
            </div>
          </section>
        )}

        {/* Joined Packages */}
        {profile.joinedPackages && profile.joinedPackages.length > 0 && (
          <section className="flex flex-col gap-3">
            <h2 className="text-lg font-bold text-foreground px-1">Viajes en los que Participa</h2>
            <div className="flex flex-col gap-3">
              {profile.joinedPackages.map((pkg) => (
                <PackageCard key={pkg._id} pkg={pkg} onClick={() => navigate({ to: "/packages/$id", params: { id: pkg._id } })} />
              ))}
            </div>
          </section>
        )}

      </div>
    </div>
  );
}

function PackageCard({ pkg, onClick }: { pkg: any; onClick: () => void }) {
  return (
    <div 
      onClick={onClick}
      className="flex flex-col sm:flex-row gap-4 bg-card border rounded-2xl p-3 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
    >
      <div className="h-24 sm:w-24 shrink-0 rounded-xl overflow-hidden bg-muted">
        {pkg.imageUrl ? (
          <img src={pkg.imageUrl} alt={pkg.title} className="h-full w-full object-cover" />
        ) : (
          <div className="h-full w-full bg-primary/10 flex items-center justify-center">
            <Luggage className="h-8 w-8 text-primary/40" />
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0 py-1 flex flex-col justify-between">
        <div>
          <h3 className="font-bold text-base line-clamp-1">{pkg.title}</h3>
          <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{pkg.destination}</span>
          </p>
        </div>
        <div className="flex items-center justify-between mt-2 pt-2 border-t">
          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <Calendar className="h-3.5 w-3.5" />
            <span>{format(new Date(pkg.startDate), "MMM d", { locale: es })} - {format(new Date(pkg.endDate), "MMM d", { locale: es })}</span>
          </div>
          <Badge variant="secondary" className="text-[10px] uppercase">
            {pkg.statusLabel || pkg.status}
          </Badge>
        </div>
      </div>
    </div>
  );
}

function UserProfileSkeleton() {
  return (
    <div className="flex-1 w-full max-w-md mx-auto md:max-w-2xl bg-muted/20 border-x min-h-screen pb-20">
      <div className="px-5 py-8 flex flex-col gap-6 animate-pulse">
        <Skeleton className="h-56 w-full rounded-2xl" />
        <Skeleton className="h-32 w-full rounded-2xl mt-4" />
        <Skeleton className="h-32 w-full rounded-2xl mt-4" />
      </div>
    </div>
  );
}
