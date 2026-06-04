import { useState } from "react";
import { useMutation } from "convex/react";
import { Star } from "lucide-react";
import { toast } from "sonner";

import { api } from "@proy_vibetribe/backend/convex/_generated/api";
import { Id } from "@proy_vibetribe/backend/convex/_generated/dataModel";
import { Button } from "@proy_vibetribe/ui/components/button";
import { Textarea } from "@proy_vibetribe/ui/components/textarea";
import { Label } from "@proy_vibetribe/ui/components/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@proy_vibetribe/ui/components/dialog";

const MAX_COMMENT_LENGTH = 500;

interface RateParticipantDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  travelPackageId: Id<"travelPackages">;
  ratedUserId: string;
  ratedUserName: string;
}

export function RateParticipantDialog({
  open,
  onOpenChange,
  travelPackageId,
  ratedUserId,
  ratedUserName,
}: RateParticipantDialogProps) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const rateParticipant = useMutation(api.ratings.rateParticipant);

  const resetState = () => {
    setRating(0);
    setHoverRating(0);
    setComment("");
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      resetState();
    }
    onOpenChange(nextOpen);
  };

  const handleSubmit = async () => {
    if (rating < 1 || rating > 5) {
      toast.error("Selecciona una calificación de 1 a 5 estrellas");
      return;
    }

    setIsSubmitting(true);
    try {
      await rateParticipant({
        travelPackageId,
        ratedUserId,
        rating,
        comment: comment.trim() || undefined,
      });
      toast.success(`¡Has calificado a ${ratedUserName}!`);
      handleOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || "Error al enviar la calificación");
    } finally {
      setIsSubmitting(false);
    }
  };

  const displayRating = hoverRating || rating;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Calificar a {ratedUserName}</DialogTitle>
          <DialogDescription>
            Comparte tu experiencia con este participante del viaje.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-5 py-2">
          <div className="flex flex-col items-center gap-2">
            <Label className="text-sm text-muted-foreground">
              Tu calificación
            </Label>
            <div
              className="flex items-center gap-1"
              onMouseLeave={() => setHoverRating(0)}
            >
              {[1, 2, 3, 4, 5].map((value) => {
                const isActive = value <= displayRating;
                return (
                  <button
                    key={value}
                    type="button"
                    aria-label={`${value} ${value === 1 ? "estrella" : "estrellas"}`}
                    className="p-1 rounded-md transition-transform hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    onMouseEnter={() => setHoverRating(value)}
                    onClick={() => setRating(value)}
                    disabled={isSubmitting}
                  >
                    <Star
                      className={`h-8 w-8 transition-colors ${
                        isActive
                          ? "text-amber-500 fill-amber-500"
                          : "text-muted-foreground/40"
                      }`}
                    />
                  </button>
                );
              })}
            </div>
            <span className="text-xs text-muted-foreground h-4">
              {displayRating > 0
                ? `${displayRating} de 5 estrellas`
                : "Selecciona una calificación"}
            </span>
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="rating-comment">Comentario (opcional)</Label>
              <span className="text-xs text-muted-foreground">
                {comment.length}/{MAX_COMMENT_LENGTH}
              </span>
            </div>
            <Textarea
              id="rating-comment"
              placeholder="¿Qué te pareció viajar con esta persona?"
              value={comment}
              onChange={(e) =>
                setComment(e.target.value.slice(0, MAX_COMMENT_LENGTH))
              }
              disabled={isSubmitting}
              rows={4}
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || rating < 1}
          >
            {isSubmitting ? "Enviando..." : "Enviar calificación"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
