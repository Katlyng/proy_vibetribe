import { useEffect, useRef, useState } from "react";
import { Loader } from "@googlemaps/js-api-loader";
import { MapPin, Navigation } from "lucide-react";

export interface GoogleMapProps {
  apiKey: string;
  center?: { lat: number; lng: number };
  zoom?: number;
  destinations?: Array<{
    id: string;
    title: string;
    location: { lat: number; lng: number };
    description?: string;
  }>;
  onMarkerClick?: (id: string) => void;
  className?: string;
}

export function GoogleMap({
  apiKey,
  center = { lat: 4.711, lng: -74.0721 },
  zoom = 12,
  destinations = [],
  onMarkerClick,
  className = "w-full h-64",
}: GoogleMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!apiKey || apiKey === "YOUR_API_KEY_HERE") {
      setError("AGREGA_TU_GOOGLE_MAPS_API_KEY");
      return;
    }

    const loader = new Loader({
      apiKey,
      version: "weekly",
      libraries: ["places", "marker"],
    });

    loader
      .load()
      .then(() => {
        if (!mapRef.current) return;

        const google = (window as any).google;
        const map = new google.maps.Map(mapRef.current, {
          center,
          zoom,
          disableDefaultUI: true,
          zoomControl: true,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
        });

        if (destinations.length > 0) {
          destinations.forEach((dest) => {
            const marker = new google.maps.Marker({
              position: dest.location,
              map,
              title: dest.title,
            });

            if (onMarkerClick) {
              marker.addListener("click", () => onMarkerClick(dest.id));
            }

            const infoWindow = new google.maps.InfoWindow({
              content: `
                <div style="padding: 8px; max-width: 200px;">
                  <h3 style="margin: 0 0 4px; font-weight: 600;">${dest.title}</h3>
                  ${
                    dest.description
                      ? `<p style="margin: 0; font-size: 12px; color: #666;">${dest.description}</p>`
                      : ""
                  }
                </div>
              `,
            });

            marker.addListener("click", () => {
              infoWindow.open(map, marker);
            });
          });
        }

        setIsLoaded(true);
      })
      .catch(() => {
        setError("Error al cargar Google Maps");
      });
  }, [apiKey, center, zoom, destinations, onMarkerClick]);

  if (error) {
    return (
      <div
        className={`${className} flex flex-col items-center justify-center bg-muted/50 rounded-lg border-2 border-dashed border-muted-foreground/25`}
      >
        <Navigation className="h-10 w-10 text-muted-foreground/50 mb-3" />
        <p className="text-sm font-medium text-muted-foreground">
          {error === "AGREGA_TU_GOOGLE_MAPS_API_KEY"
            ? "📍 Google Maps"
            : error}
        </p>
        <p className="text-xs text-muted-foreground/70 mt-1">
          {error === "AGREGA_TU_GOOGLE_MAPS_API_KEY"
            ? "Agrega tu API Key de Google Maps"
            : "Intenta nuevamente más tarde"}
        </p>
      </div>
    );
  }

  return (
    <div className={`${className} relative rounded-lg overflow-hidden`}>
      <div ref={mapRef} className="w-full h-full" />
      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted/80">
          <div className="flex flex-col items-center gap-2">
            <MapPin className="h-6 w-6 text-muted-foreground animate-pulse" />
            <p className="text-sm text-muted-foreground">Cargando mapa...</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default GoogleMap;