import { useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { Star, Check, Star as StarIcon } from "lucide-react";
import { Link } from "@tanstack/react-router";

import { api } from "@proy_vibetribe/backend/convex/_generated/api";
import { Id } from "@proy_vibetribe/backend/convex/_generated/dataModel";
import { Avatar, AvatarFallback, AvatarImage } from "@proy_vibetribe/ui/components/avatar";
import { Skeleton } from "@proy_vibetribe/ui/components/skeleton";
import { Button } from "@proy_vibetribe/ui/components/button";
import { Users } from "lucide-react";

import { RateParticipantDialog } from "./rate-participant-dialog";

interface Participant {
  userId: string;
  joinedAt: number;
  profileInfo?: {
    avatarUrl?: string | null;
    description?: string;
    averageRating?: number;
    name?: string;
  } | null;
  packageRating?: {
    average: number;
    count: number;
  } | null;
}

interface ParticipantsListProps {
  participants: Participant[];
  isLoading?: boolean;
  travelPackageId?: Id<"travelPackages">;
  currentUserId?: string;
  isFinished?: boolean;
}

export function ParticipantsList({
  participants,
  isLoading = false,
  travelPackageId,
  currentUserId,
  isFinished = false,
}: ParticipantsListProps) {
  const [ratingTarget, setRatingTarget] = useState<{
    userId: string;
    name: string;
  } | null>(null);

  const isCurrentUserParticipant = Boolean(
    currentUserId && participants.some((p) => p.userId === currentUserId)
  );

  const canRate = Boolean(
    isFinished && travelPackageId && currentUserId && isCurrentUserParticipant
  );

  const myRatings = useQuery(
    api.ratings.getMyRatingsInPackage,
    canRate && travelPackageId ? { travelPackageId } : "skip"
  );

  const ratedUserIds = useMemo(() => {
    return new Set((myRatings ?? []).map((r) => r.ratedUserId));
  }, [myRatings]);

  if (isLoading) {
    return (
      <section className="bg-card border rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Skeleton className="h-4 w-4 rounded" />
          <Skeleton className="h-4 w-28" />
        </div>
        <div className="flex gap-4 overflow-x-auto pb-2">
          {[1, 2, 3].map((n) => (
            <div key={n} className="flex flex-col items-center gap-2 min-w-[60px]">
              <Skeleton className="h-14 w-14 rounded-full" />
              <Skeleton className="h-3 w-10" />
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (participants.length === 0) return null;

  const showRatingHint = canRate && isFinished;

  return (
    <>
      <section className="bg-card border rounded-xl p-4">
        <h3 className="font-semibold mb-3 flex items-center gap-2 text-sm">
          <Users className="h-4 w-4" />
          Participantes ({participants.length})
        </h3>

        {showRatingHint && (
          <div className="mb-3 flex items-center gap-2 rounded-lg bg-primary/5 border border-primary/20 px-3 py-2 text-xs text-foreground/80">
            <StarIcon className="h-3.5 w-3.5 text-amber-500 fill-amber-500 shrink-0" />
            <span>
              El viaje finalizó. ¡Califica a tus compañeros de aventura!
            </span>
          </div>
        )}

        <div className="flex gap-4 overflow-x-auto pb-2">
          {participants.map((participant, idx) => {
            const avatarUrl = participant.profileInfo?.avatarUrl ?? undefined;
            const name = participant.profileInfo?.name || "Viajero";
            const fallbackInitial = name[0].toUpperCase();
            const averageRating =
              participant.profileInfo?.averageRating?.toFixed(1) || "5.0";
            const isSelf = participant.userId === currentUserId;
            const alreadyRated = ratedUserIds.has(participant.userId);
            const canRateThisParticipant =
              canRate && !isSelf;

            return (
              <div
                key={participant.userId || idx}
                className="flex flex-col items-center gap-1.5 min-w-[68px] flex-shrink-0"
              >
                <Link
                  to="/users/$userId"
                  params={{ userId: participant.userId }}
                  className="flex flex-col items-center gap-1.5 group"
                >
                  <Avatar className="h-14 w-14 border-2 border-background shadow-sm transition-transform group-hover:scale-105">
                    <AvatarImage src={avatarUrl} alt={name} />
                    <AvatarFallback className="text-base font-semibold bg-primary/10 text-primary">
                      {fallbackInitial}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-xs text-muted-foreground text-center truncate w-full max-w-[68px] group-hover:text-foreground transition-colors">
                    {isSelf ? "Tú" : name.split(" ")[0]}
                  </span>
                  {participant.packageRating ? (
                    <div className="flex items-center gap-0.5 text-[10px] text-amber-600">
                      <Star className="h-2.5 w-2.5 fill-amber-500 text-amber-500" />
                      <span>
                        {participant.packageRating.average.toFixed(1)} (
                        {participant.packageRating.count})
                      </span>
                    </div>
                  ) : (
                    <span className="text-[10px] text-muted-foreground/70">
                      ★ {averageRating}
                    </span>
                  )}
                </Link>

                {canRateThisParticipant && (
                  <Button
                    type="button"
                    size="sm"
                    variant={alreadyRated ? "outline" : "default"}
                    className="h-6 px-2 text-[10px] rounded-full"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (!alreadyRated) {
                        setRatingTarget({
                          userId: participant.userId,
                          name: name.split(" ")[0],
                        });
                      }
                    }}
                    disabled={alreadyRated}
                    aria-label={
                      alreadyRated
                        ? `Ya calificaste a ${name}`
                        : `Calificar a ${name}`
                    }
                  >
                    {alreadyRated ? (
                      <>
                        <Check className="h-3 w-3 mr-0.5" />
                        Calificado
                      </>
                    ) : (
                      <>
                        <Star className="h-3 w-3 mr-0.5" />
                        Calificar
                      </>
                    )}
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {ratingTarget && travelPackageId && (
        <RateParticipantDialog
          open={!!ratingTarget}
          onOpenChange={(open) => {
            if (!open) setRatingTarget(null);
          }}
          travelPackageId={travelPackageId}
          ratedUserId={ratingTarget.userId}
          ratedUserName={ratingTarget.name}
        />
      )}
    </>
  );
}
