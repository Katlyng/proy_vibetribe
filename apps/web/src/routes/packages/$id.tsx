import { api } from "@proy_vibetribe/backend/convex/_generated/api";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import { ArrowLeft, Calendar, MapPin, Users, Coins, Pencil, Star } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";

import { Button } from "@proy_vibetribe/ui/components/button";
import { Badge } from "@proy_vibetribe/ui/components/badge";
import { Skeleton } from "@proy_vibetribe/ui/components/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@proy_vibetribe/ui/components/avatar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@proy_vibetribe/ui/components/alert-dialog";
import { PageHeader } from "@/components/page-header";
import { ParticipantsList } from "@/components/participants-list";

export const Route = createFileRoute("/packages/$id")({
  component: PackageDetailsScreen,
});

function PackageDetailsScreen() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const pkg = useQuery(api.packages.getById, { id: id as any });
  const profile = useQuery(api.profiles.getMine);
  const joinMutation = useMutation(api.packages.joinPackage);
  const leaveMutation = useMutation(api.packages.leavePackage);

  const [isJoining, setIsJoining] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);

  if (pkg === undefined || profile === undefined) {
    return <PackageDetailsSkeleton />;
  }

  if (pkg === null) {
    return (
      <div className="flex-1 w-full max-w-md mx-auto bg-background min-h-screen">
        <PageHeader title="Detalle del Viaje" backTo="/dashboard" />
        <div className="flex h-[60vh] flex-col items-center justify-center gap-4 text-center p-6">
          <h2 className="text-2xl font-bold">Paquete no encontrado</h2>
          <p className="text-muted-foreground">El viaje que buscas no existe o ha sido eliminado.</p>
          <Button onClick={() => navigate({ to: "/dashboard" })}>Volver al Dashboard</Button>
        </div>
      </div>
    );
  }

  const isCreator = profile?.userId === pkg.creatorId;
  const isParticipant = pkg.participants?.some((p: any) => p.userId === profile?.userId);
  const canJoin = !isCreator && !isParticipant && pkg.currentParticipants < pkg.maxParticipants && pkg.status === "published";

  const handleJoin = async () => {
    setIsJoining(true);
    try {
      await joinMutation({ travelPackageId: pkg._id as any });
      toast.success("¡Te has unido al viaje!");
    } catch (error: any) {
      if (error.message?.includes("Ya estás")) {
        toast.info("Ya estás inscrito en este viaje");
      } else {
        toast.error(error.message || "Error al unirse al paquete");
      }
    } finally {
      setIsJoining(false);
    }
  };

  const handleLeave = async () => {
    setIsLeaving(true);
    try {
      await leaveMutation({ travelPackageId: pkg._id as any });
      toast.success("Inscripción cancelada");
    } catch (error: any) {
      toast.error(error.message || "Error al cancelar la inscripción");
    } finally {
      setIsLeaving(false);
      setShowCancelDialog(false);
    }
  };

  return (
    <div className="flex-1 w-full max-w-md mx-auto bg-background min-h-screen pb-24">
      <PageHeader
        title=""
        backTo="/dashboard"
        actions={
          <>
            {isCreator && (
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full"
                onClick={() => navigate({ to: "/packages/$id/edit", params: { id } })}
              >
                <Pencil className="h-5 w-5" />
              </Button>
            )}
            <Badge variant="secondary" className="capitalize">
              {pkg.statusLabel || pkg.status}
            </Badge>
          </>
        }
      />

      <div className="px-5 py-6 flex flex-col gap-6">
        {/* Image */}
        <div className="h-48 rounded-xl overflow-hidden bg-muted">
          {pkg.imageUrl ? (
            <img src={pkg.imageUrl} alt={pkg.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/5" />
          )}
        </div>

        {/* Title */}
        <div>
          <h1 className="text-2xl font-bold">{pkg.title}</h1>
          <div className="flex items-center text-muted-foreground mt-1 gap-1">
            <MapPin className="h-4 w-4" />
            <span>{pkg.destination}</span>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-3">
          <StatCard icon={<Calendar className="h-5 w-5" />} label="Duración" value={`${pkg.durationDays} días`} />
          <StatCard icon={<Coins className="h-5 w-5" />} label="Precio" value={`$${pkg.price?.toLocaleString("es-CO") || 0}`} />
          <StatCard icon={<Users className="h-5 w-5" />} label="Cupos" value={`${pkg.currentParticipants}/${pkg.maxParticipants}`} />
          <StatCard icon={<Star className="h-5 w-5" />} label="Rating" value={pkg.organizerInfo?.averageRating?.toFixed(1) || "N/A"} />
        </div>

        {/* Description */}
        <section>
          <h2 className="text-lg font-bold mb-2">Acerca de esta aventura</h2>
          <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
            {pkg.description}
          </p>
        </section>

        {/* Tags */}
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

        {/* Dates */}
        <section className="bg-card border rounded-xl p-4">
          <div className="flex items-center gap-2 font-semibold mb-3">
            <Calendar className="h-5 w-5 text-primary" />
            <h3>Fechas del Viaje</h3>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-xs text-muted-foreground">IDA</span>
              <span className="block font-medium text-sm">
                {format(new Date(pkg.startDate), "MMM d, yyyy", { locale: es })}
              </span>
            </div>
            <div>
              <span className="text-xs text-muted-foreground">VUELTA</span>
              <span className="block font-medium text-sm">
                {format(new Date(pkg.endDate), "MMM d, yyyy", { locale: es })}
              </span>
            </div>
          </div>
        </section>

        {/* Accommodation */}
        {pkg.accommodation && (
          <section className="bg-card border rounded-xl p-4">
            <h3 className="font-semibold mb-2">Alojamiento</h3>
            <p className="text-sm text-muted-foreground">{pkg.accommodation}</p>
          </section>
        )}

        {/* Activities */}
        {pkg.activities && pkg.activities.length > 0 && (
          <section className="bg-card border rounded-xl p-4">
            <h3 className="font-semibold mb-3">Actividades</h3>
            <div className="space-y-2">
              {pkg.activities.map((activity: any, idx: number) => (
                <div key={activity._id || idx} className="flex items-center justify-between p-2 bg-muted/50 rounded-lg">
                  <span className="text-sm font-medium">{activity.title}</span>
                  <Badge variant="outline" className="text-xs">
                    {activity.isIncluded ? "Incluido" : `$${activity.cost}`}
                  </Badge>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Organizer */}
        {pkg.organizerInfo && (
          <section className="bg-card border rounded-xl p-4">
            <h3 className="font-semibold mb-3">Organizador</h3>
            <div className="flex items-center gap-3">
              <Avatar className="h-12 w-12">
                <AvatarImage src={pkg.organizerInfo.avatarUrl} />
                <AvatarFallback>{(pkg.organizerInfo.name || "O")[0]}</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">{pkg.organizerInfo.name || "Organizador"}</p>
                <div className="flex items-center gap-1 mt-1">
                  <Star className="h-3 w-3 text-amber-500 fill-amber-500" />
                  <span className="text-xs">{pkg.organizerInfo.averageRating?.toFixed(1) || "5.0"}</span>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Participants */}
        <ParticipantsList participants={pkg.participants ?? []} />
      </div>

      {/* Bottom Action */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/80 backdrop-blur-xl border-t flex items-center justify-between gap-4">
        <div>
          <span className="text-xs text-muted-foreground">Precio Total</span>
          <p className="text-xl font-bold">${pkg.price?.toLocaleString("es-CO")}</p>
        </div>

        {isCreator ? (
          <Button variant="secondary" className="rounded-full" disabled>
            Eres el creador
          </Button>
        ) : isParticipant ? (
          <Button
            variant="destructive"
            className="rounded-full"
            onClick={() => setShowCancelDialog(true)}
            disabled={isLeaving}
          >
            {isLeaving ? "Cancelando..." : "Cancelar inscripción"}
          </Button>
        ) : canJoin ? (
          <Button
            className="rounded-full shadow-md"
            onClick={handleJoin}
            disabled={isJoining}
          >
            {isJoining ? "Uniéndose..." : "Unirme al Viaje"}
          </Button>
        ) : (
          <Button variant="outline" className="rounded-full bg-muted" disabled>
            No disponible
          </Button>
        )}

        {/* AlertDialog de confirmación para cancelar inscripción */}
        <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Cancelar inscripción?</AlertDialogTitle>
              <AlertDialogDescription>
                Estás a punto de abandonar el viaje{" "}
                <strong>{pkg.title}</strong>. Si hay cupos limitados, perderás
                tu lugar y puede que no puedas volver a inscribirte.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Volver</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleLeave}
                disabled={isLeaving}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isLeaving ? "Cancelando..." : "Sí, cancelar inscripción"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center p-3 bg-card border rounded-xl text-center gap-1">
      <div className="text-primary mb-1">{icon}</div>
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="font-bold text-sm">{value}</span>
    </div>
  );
}

function PackageDetailsSkeleton() {
  return (
    <div className="flex-1 w-full max-w-md mx-auto bg-background min-h-screen animate-pulse pb-24">
      <div className="p-4 border-b">
        <div className="h-10 w-10 bg-muted rounded-full" />
      </div>
      <div className="p-5 flex flex-col gap-6">
        <div className="h-48 bg-muted rounded-xl" />
        <div className="h-8 w-48 bg-muted rounded" />
        <div className="grid grid-cols-2 gap-3">
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
        </div>
        <Skeleton className="h-32 w-full" />
      </div>
    </div>
  );
}