import { Link } from "@tanstack/react-router";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { MapPin, Users, Calendar, Star, Package as PackageIcon } from "lucide-react";

import { Badge } from "@proy_vibetribe/ui/components/badge";
import { Button } from "@proy_vibetribe/ui/components/button";

import type { Doc } from "@proy_vibetribe/backend/convex/_generated/dataModel";

interface PackageCardProps {
  package: Doc<"travelPackages">;
  imageUrl?: string; // We can optional use this if we add images later
}

const formatPrice = (price: number) => {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
  }).format(price);
};

const formatDate = (timestamp: number) => {
  return format(new Date(timestamp), "MMM d", { locale: es });
};

export function PackageCard({ package: pkg, imageUrl }: PackageCardProps) {
  const availableSpots = pkg.maxParticipants - pkg.currentParticipants;

  return (
    <div className="mb-4 flex flex-col rounded-lg border bg-card text-card-foreground shadow-sm overflow-hidden">
      {/* Image Section */}
      {imageUrl ? (
        <img 
          src={imageUrl} 
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
          {/* Status Badge instead of rating since standard pkg schema doesn't have rating */}
          <Badge variant={pkg.status === "published" ? "default" : "secondary"} className="capitalize">
            {pkg.status}
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
          
          <Button asChild size="sm" className="px-6 rounded-full">
            {/* The link to a detail page, we can assume /packages/$id */}
            <Link to="/packages/$id" params={{ id: pkg._id }}>
              Ver más
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
