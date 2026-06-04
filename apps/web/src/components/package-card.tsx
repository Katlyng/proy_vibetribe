import { Link } from "@tanstack/react-router";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { MapPin, Users, Calendar, Star, Package as PackageIcon } from "lucide-react";

import { Badge } from "@proy_vibetribe/ui/components/badge";

import type { Doc } from "@proy_vibetribe/backend/convex/_generated/dataModel";
import { useCurrency } from "@/components/currency-provider";

interface PackageCardProps {
  package: Doc<"travelPackages"> & { statusLabel?: string };
}

const formatDate = (timestamp: number) => {
  return format(new Date(timestamp), "MMM d", { locale: es });
};

export function PackageCard({ package: pkg }: PackageCardProps) {
  const { formatPrice } = useCurrency();
  const availableSpots = pkg.maxParticipants - pkg.currentParticipants;
  const hasImage = pkg.imageUrl && pkg.imageUrl.length > 0;

  return (
    <Link
      to="/packages/$id"
      params={{ id: pkg._id }}
      className="mb-4 flex flex-col rounded-lg border bg-card text-card-foreground shadow-sm overflow-hidden hover:ring-1 hover:ring-primary/30 transition-all cursor-pointer"
    >
      {/* Image Section */}
      {hasImage ? (
        <img
          src={pkg.imageUrl}
          alt={pkg.title}
          className="h-48 w-full object-cover bg-muted"
        />
      ) : (
        <div className="flex h-48 w-full items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
          <PackageIcon className="h-12 w-12 text-muted-foreground/30" />
        </div>
      )}

      {/* Content Section */}
      <div className="flex flex-col gap-3 p-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <h3 className="font-bold text-lg leading-tight">{pkg.title}</h3>
            <div className="mt-1 flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">{pkg.destination}</span>
            </div>
          </div>
          <Badge variant={pkg.status === "published" ? "default" : "secondary"} className="capitalize">
            {pkg.statusLabel || pkg.status}
          </Badge>
        </div>

        {/* Description */}
        <p className="text-sm text-muted-foreground line-clamp-2">
          {pkg.description}
        </p>

        {/* Tags */}
        {pkg.tags && pkg.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {pkg.tags.slice(0, 3).map((tag) => (
              <Badge key={tag} variant="outline" className="bg-primary/5 text-xs text-primary">
                {tag}
              </Badge>
            ))}
          </div>
        )}

        {/* Dates and Participants */}
        <div className="flex items-center justify-between text-xs text-muted-foreground gap-2">
          <div className="flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" />
            <span>
              {formatDate(pkg.startDate)} - {formatDate(pkg.endDate)} ({pkg.durationDays}d) 
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Users className="h-3.5 w-3.5" />
            <span>
              {pkg.currentParticipants}/{pkg.maxParticipants}
            </span>
          </div>
        </div>

        {/* Footer (Price & CTA) */}
        <div className="mt-2 flex items-center justify-between border-t pt-3">
          <div className="flex flex-col">
            <span className="text-xs text-muted-foreground">Precio por persona</span>
            <span className="text-lg font-bold text-primary">{formatPrice(pkg.price)}</span>
          </div>

          <span className="inline-flex items-center justify-center rounded-full bg-primary px-6 py-2 text-xs font-medium text-primary-foreground">
            Ver más
          </span>
        </div>
      </div>
    </Link>
  );
}
