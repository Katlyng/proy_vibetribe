import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  Camera,
  ChevronLeft,
  ChevronRight,
  ImageIcon,
  Loader2,
  MapPin,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { api } from "@proy_vibetribe/backend/convex/_generated/api";
import { Button } from "@proy_vibetribe/ui/components/button";
import { Skeleton } from "@proy_vibetribe/ui/components/skeleton";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@proy_vibetribe/ui/components/dialog";

interface TripPhoto {
  _id: any;
  _creationTime: number;
  userId: string;
  travelPackageId: any;
  storageId: any;
  caption?: string;
  uploadedAt: number;
  url: string | null;
}

interface TripPhotosGridProps {
  userId: string;
  isOwner: boolean;
  title?: string;
  onUploadClick?: () => void;
  showEmptyState?: boolean;
}

export function TripPhotosGrid({
  userId,
  isOwner,
  title = "Fotos de viajes",
  onUploadClick,
  showEmptyState = true,
}: TripPhotosGridProps) {
  const photos = useQuery(api.photos.getPhotosByUser, { userId });
  const deleteTripPhoto = useMutation(api.photos.deleteTripPhoto);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (photo: TripPhoto, e: React.MouseEvent) => {
    e.stopPropagation();
    if (deletingId) return;
    if (!confirm("¿Eliminar esta foto? Esta acción no se puede deshacer."))
      return;
    setDeletingId(photo._id);
    try {
      await deleteTripPhoto({ photoId: photo._id });
      toast.success("Foto eliminada");
      if (selectedIndex !== null) setSelectedIndex(null);
    } catch (e: any) {
      toast.error(e?.message ?? "No se pudo eliminar la foto");
    } finally {
      setDeletingId(null);
    }
  };

  if (photos === undefined) {
    return (
      <section className="bg-card border rounded-2xl p-5 shadow-sm">
        <h2 className="text-lg font-bold text-foreground mb-3 flex items-center gap-2">
          <Camera className="h-5 w-5 text-primary" />
          {title}
        </h2>
        <div className="grid grid-cols-3 gap-2">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="aspect-square rounded-lg" />
          ))}
        </div>
      </section>
    );
  }

  if (photos.length === 0) {
    if (!showEmptyState) return null;
    return (
      <section className="bg-card border rounded-2xl p-5 shadow-sm">
        <h2 className="text-lg font-bold text-foreground mb-3 flex items-center gap-2">
          <Camera className="h-5 w-5 text-primary" />
          {title}
        </h2>
        {isOwner ? (
          <div className="flex flex-col items-center justify-center gap-3 py-8 text-center">
            <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center">
              <ImageIcon className="h-7 w-7 text-muted-foreground" />
            </div>
            <div>
              <p className="font-medium">Aún no has subido fotos</p>
              <p className="text-sm text-muted-foreground mt-1">
                Comparte los recuerdos de los viajes que ya finalizaron.
              </p>
            </div>
            {onUploadClick && (
              <Button onClick={onUploadClick} variant="outline" size="sm">
                <Camera className="h-4 w-4 mr-2" />
                Subir fotos
              </Button>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-6">
            Este viajero aún no ha compartido fotos.
          </p>
        )}
      </section>
    );
  }

  return (
    <section className="bg-card border rounded-2xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
          <Camera className="h-5 w-5 text-primary" />
          {title}
          <span className="text-sm font-normal text-muted-foreground">
            ({photos.length})
          </span>
        </h2>
        {isOwner && onUploadClick && (
          <Button onClick={onUploadClick} variant="outline" size="sm">
            <Camera className="h-4 w-4 mr-1.5" />
            Subir
          </Button>
        )}
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
        {photos.map((photo, idx) => (
          <button
            key={photo._id}
            type="button"
            onClick={() => setSelectedIndex(idx)}
            className="relative aspect-square rounded-lg overflow-hidden bg-muted group focus:outline-none focus:ring-2 focus:ring-primary"
            aria-label={photo.caption ?? "Foto"}
          >
            {photo.url ? (
              <img
                src={photo.url}
                alt={photo.caption ?? "Foto del viaje"}
                loading="lazy"
                className="h-full w-full object-cover transition-transform group-hover:scale-105"
              />
            ) : (
              <div className="h-full w-full flex items-center justify-center">
                <ImageIcon className="h-6 w-6 text-muted-foreground" />
              </div>
            )}
            {photo.caption && (
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <p className="text-[10px] text-white line-clamp-1">
                  {photo.caption}
                </p>
              </div>
            )}
          </button>
        ))}
      </div>

      <PhotoLightbox
        photos={photos}
        index={selectedIndex}
        onClose={() => setSelectedIndex(null)}
        onChange={setSelectedIndex}
        onDelete={isOwner ? handleDelete : undefined}
        deletingId={deletingId}
      />
    </section>
  );
}

function PhotoLightbox({
  photos,
  index,
  onClose,
  onChange,
  onDelete,
  deletingId,
}: {
  photos: TripPhoto[];
  index: number | null;
  onClose: () => void;
  onChange: (idx: number) => void;
  onDelete?: (photo: TripPhoto, e: React.MouseEvent) => void;
  deletingId: string | null;
}) {
  if (index === null || !photos[index]) return null;
  const photo = photos[index];
  const hasPrev = index > 0;
  const hasNext = index < photos.length - 1;

  return (
    <Dialog
      open={index !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent
        className="sm:max-w-3xl gap-0 p-0 max-h-[95vh] flex flex-col overflow-hidden bg-black/95 border-none [&_[data-state=open]_svg]:text-white [&>button]:text-white/80 [&>button]:hover:text-white"
      >
        <DialogTitle className="sr-only">
          {photo.caption ?? "Foto del viaje"}
        </DialogTitle>
        <div className="relative flex-1 min-h-0 flex items-center justify-center">
          {photo.url && (
            <img
              src={photo.url}
              alt={photo.caption ?? "Foto del viaje"}
              className="max-h-[80vh] w-full object-contain"
            />
          )}

          {photos.length > 1 && (
            <>
              {hasPrev && (
                <button
                  type="button"
                  onClick={() => onChange(index - 1)}
                  className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
                  aria-label="Foto anterior"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
              )}
              {hasNext && (
                <button
                  type="button"
                  onClick={() => onChange(index + 1)}
                  className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
                  aria-label="Foto siguiente"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              )}
            </>
          )}
        </div>

        <div className="shrink-0 p-4 flex items-center justify-between gap-3 text-white">
          <div className="flex-1 min-w-0">
            {photo.caption && (
              <p className="text-sm line-clamp-2">{photo.caption}</p>
            )}
            <p className="text-xs text-white/60 flex items-center gap-1 mt-1">
              <MapPin className="h-3 w-3" />
              <span>Subida {format(new Date(photo.uploadedAt), "d MMM yyyy", { locale: es })}</span>
              <span className="text-white/30">•</span>
              <span>
                {index + 1} de {photos.length}
              </span>
            </p>
          </div>
          {onDelete && (
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => onDelete(photo, e)}
              disabled={deletingId === photo._id}
              className="text-white hover:bg-white/10 hover:text-white shrink-0"
              aria-label="Eliminar foto"
            >
              {deletingId === photo._id ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
