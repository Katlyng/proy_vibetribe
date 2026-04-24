import { api } from "@proy_vibetribe/backend/convex/_generated/api";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import { ArrowLeft, Calendar, MapPin, Users, Coins, Heart, Hand } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";

import { Button } from "@proy_vibetribe/ui/components/button";
import { Badge } from "@proy_vibetribe/ui/components/badge";
import { Skeleton } from "@proy_vibetribe/ui/components/skeleton";

export const Route = createFileRoute("/packages/$id")({
  component: PackageDetailsScreen,
});

function PackageDetailsScreen() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  // Call convex queries
  const pkg = useQuery(api.packages.get, { id: id as any });
  const profile = useQuery(api.profiles.getMine);
  const joinMutation = useMutation(api.packages.joinPackage);

  const [isJoining, setIsJoining] = useState(false);

  if (pkg === undefined || profile === undefined) {
    return <PackageDetailsSkeleton />;
  }

  if (pkg === null) {
    return (
      <div className="flex h-[80vh] flex-col items-center justify-center gap-4 text-center">
        <h2 className="text-2xl font-bold text-foreground">Paquete no encontrado</h2>
        <p className="text-muted-foreground">El viaje que buscas no existe o ha sido eliminado.</p>
        <Button onClick={() => navigate({ to: "/dashboard" })}>Volver al Dashboard</Button>
      </div>
    );
  }

  const isCreator = profile?._id === pkg.creatorId;
  const isParticipant = false; // We can evaluate this with travelPackageParticipants
  const canJoin = !isCreator && !isParticipant && pkg.currentParticipants < pkg.maxParticipants && pkg.status === "published";

  const handleJoin = async () => {
    setIsJoining(true);
    try {
      await joinMutation({ packageId: pkg._id });
      toast.success("¡Te has unido al viaje!");
    } catch (error: any) {
      toast.error(error.message || "Error al unirse al paquete");
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-3xl pb-24 md:pb-12 bg-background min-h-screen">
      {/* Header Image Area */}
      <div className="relative h-64 w-full bg-muted md:rounded-b-3xl overflow-hidden">
        {/* Decorative background since we don't have images in DB by default */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/30 to-background/5" />
        
        {/* Top Navbar */}
        <div className="absolute top-0 left-0 right-0 flex items-center justify-between p-4 bg-gradient-to-b from-black/50 to-transparent">
          <Button 
            variant="ghost" 
            size="icon" 
            className="rounded-full bg-background/20 text-white hover:bg-background/40 backdrop-blur-md"
            onClick={() => window.history.back()}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex gap-2">
            <Badge variant="secondary" className="backdrop-blur-md bg-background/50 border-none text-white">
              {pkg.status}
            </Badge>
          </div>
        </div>

        {/* Title overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-background to-transparent">
          <h1 className="text-3xl font-bold text-foreground drop-shadow-md">{pkg.title}</h1>
          <div className="flex items-center text-muted-foreground mt-2 gap-1 font-medium">
            <MapPin className="h-4 w-4" />
            <span>{pkg.destination}</span>
          </div>
        </div>
      </div>

      <div className="px-5 py-6 flex flex-col gap-6">
        {/* Quick Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard icon={<Calendar className="h-5 w-5" />} label="Duración" value={`${pkg.durationDays} días`} />
          <StatCard icon={<Coins className="h-5 w-5" />} label="Precio" value={`$${pkg.price.toLocaleString("es-CO")}`} />
          <StatCard icon={<Users className="h-5 w-5" />} label="Cupos" value={`${pkg.currentParticipants}/${pkg.maxParticipants}`} />
          <StatCard icon={<Heart className="h-5 w-5" />} label="Rating" value={"N/A"} />
        </div>

        {/* Description */}
        <section>
          <h2 className="text-xl font-bold mb-3">Acerca de esta aventura</h2>
          <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
            {pkg.description}
          </p>
        </section>

        {/* Categories / Tags */}
        {pkg.tags && pkg.tags.length > 0 && (
          <section>
            <h3 className="text-sm font-semibold text-muted-foreground mb-2 uppercase tracking-wider">Categorías</h3>
            <div className="flex flex-wrap gap-2">
              {pkg.tags.map((tag) => (
                <Badge key={tag} variant="outline" className="capitalize px-3 py-1">
                  {tag}
                </Badge>
              ))}
            </div>
          </section>
        )}

        {/* Date Details */}
        <section className="bg-card border rounded-xl p-4 flex flex-col gap-3 shadow-sm">
          <div className="flex items-center gap-2 text-foreground font-semibold">
            <Calendar className="h-5 w-5 text-primary" />
            <h3>Fechas del Viaje</h3>
          </div>
          <div className="grid grid-cols-2 gap-4 divide-x">
            <div className="flex flex-col gap-1 pr-4">
              <span className="text-xs text-muted-foreground">IDA</span>
              <span className="font-medium text-sm">
                {format(new Date(pkg.startDate), "EEEE, d 'de' MMMM yyyy", { locale: es })}
              </span>
            </div>
            <div className="flex flex-col gap-1 pl-4">
              <span className="text-xs text-muted-foreground">VUELTA</span>
              <span className="font-medium text-sm">
                {format(new Date(pkg.endDate), "EEEE, d 'de' MMMM yyyy", { locale: es })}
              </span>
            </div>
          </div>
        </section>

        {/* Accommodation */}
        {pkg.accommodation && (
          <section className="bg-card border rounded-xl p-4 shadow-sm">
            <h3 className="font-semibold mb-2">Alojamiento Incluido</h3>
            <p className="text-sm text-muted-foreground">{pkg.accommodation}</p>
            {pkg.accommodationDetails && (
              <div className="mt-3 text-sm">
                <span className="font-medium">{pkg.accommodationDetails.name}</span>
                <span className="block text-xs text-muted-foreground mt-1">
                  ⭐ {pkg.accommodationDetails.rating}/5
                </span>
                <div className="flex gap-2 flex-wrap mt-2">
                  {pkg.accommodationDetails.amenities?.map((am: string) => (
                    <Badge variant="secondary" key={am} className="text-xs">{am}</Badge>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

      </div>

      {/* Fixed Bottom Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/80 backdrop-blur-xl border-t z-10 flex items-center justify-between gap-4 md:relative md:bg-transparent md:border-none md:mt-4 md:p-5">
        <div className="flex flex-col">
          <span className="text-xs text-muted-foreground font-medium">Precio Total</span>
          <span className="text-xl font-bold text-foreground">${pkg.price.toLocaleString("es-CO")}</span>
        </div>
        
        {isCreator ? (
          <Button variant="secondary" className="px-8 rounded-full" disabled>
            Eres el creador
          </Button>
        ) : canJoin ? (
          <Button 
            className="px-8 rounded-full shadow-lg hover:shadow-xl transition-all" 
            onClick={handleJoin}
            disabled={isJoining}
          >
            {isJoining ? "Uniéndose..." : "Unirme al Viaje"}
          </Button>
        ) : (
          <Button variant="outline" className="px-8 rounded-full bg-muted" disabled>
            No disponible
          </Button>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode, label: string, value: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center p-3 bg-card border rounded-xl shadow-sm text-center gap-1">
      <div className="text-primary mb-1">{icon}</div>
      <span className="text-xs text-muted-foreground font-medium">{label}</span>
      <span className="font-bold text-sm">{value}</span>
    </div>
  );
}

function PackageDetailsSkeleton() {
  return (
    <div className="mx-auto w-full max-w-3xl animate-pulse pb-24 h-screen">
      <Skeleton className="h-64 w-full md:rounded-b-3xl" />
      <div className="px-5 py-6 flex flex-col gap-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
        </div>
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full rounded-xl" />
      </div>
    </div>
  );
}