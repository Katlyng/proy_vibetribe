import { useQuery } from "convex/react";
import { Star, MessageSquareQuote, CalendarRange } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { format } from "date-fns";
import { es } from "date-fns/locale";

import { api } from "@proy_vibetribe/backend/convex/_generated/api";
import { Id } from "@proy_vibetribe/backend/convex/_generated/dataModel";
import { Avatar, AvatarFallback, AvatarImage } from "@proy_vibetribe/ui/components/avatar";
import { Skeleton } from "@proy_vibetribe/ui/components/skeleton";

interface ReceivedRatingsListProps {
  userId: string;
}

function StarRow({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-0.5" aria-label={`${value} de 5 estrellas`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`h-4 w-4 ${
            i <= value
              ? "text-amber-500 fill-amber-500"
              : "text-muted-foreground/30"
          }`}
        />
      ))}
    </div>
  );
}

export function ReceivedRatingsList({ userId }: ReceivedRatingsListProps) {
  const ratings = useQuery(api.ratings.getRatingsReceivedByUser, { userId });

  if (ratings === undefined) {
    return (
      <section className="bg-card border rounded-2xl p-5 shadow-sm">
        <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
          <Star className="h-5 w-5 text-amber-500 fill-amber-500" />
          Calificaciones recibidas
        </h2>
        <div className="flex flex-col gap-3 animate-pulse">
          {[1, 2, 3].map((n) => (
            <div key={n} className="flex flex-col gap-2 p-3 rounded-xl border">
              <div className="flex items-center gap-2">
                <Skeleton className="h-8 w-8 rounded-full" />
                <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-2/3" />
            </div>
          ))}
        </div>
      </section>
    );
  }

  const totalRatings = ratings.length;
  const withComment = ratings.filter((r) => r.comment && r.comment.trim().length > 0);
  const average =
    totalRatings > 0
      ? ratings.reduce((sum, r) => sum + r.rating, 0) / totalRatings
      : 0;

  return (
    <section className="bg-card border rounded-2xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4 gap-3">
        <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
          <Star className="h-5 w-5 text-amber-500 fill-amber-500" />
          Calificaciones recibidas
        </h2>
        {totalRatings > 0 && (
          <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-full">
            <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
            <span className="font-bold text-amber-700 dark:text-amber-400">
              {average.toFixed(1)}
            </span>
            <span className="text-xs text-amber-700/80 dark:text-amber-400/80">
              ({totalRatings})
            </span>
          </div>
        )}
      </div>

      {totalRatings === 0 ? (
        <div className="flex flex-col items-center justify-center text-center py-8 text-muted-foreground">
          <MessageSquareQuote className="h-10 w-10 mb-2 opacity-40" />
          <p className="text-sm">
            Aún no has recibido calificaciones en tus viajes.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {withComment.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Tienes {totalRatings} calificación{totalRatings === 1 ? "" : "es"}
              {" "}sin comentarios todavía.
            </p>
          ) : (
            withComment.map((r) => {
              const initial = r.rater.name[0]?.toUpperCase() ?? "?";
              const packageId = r.travelPackageId as Id<"travelPackages">;
              return (
                <article
                  key={r._id}
                  className="flex flex-col gap-3 p-4 rounded-xl border bg-muted/30"
                >
                  <header className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <Avatar className="h-9 w-9 shrink-0">
                        <AvatarImage src={r.rater.avatarUrl} alt={r.rater.name} />
                        <AvatarFallback className="text-sm font-semibold bg-primary/10 text-primary">
                          {initial}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <Link
                          to="/users/$userId"
                          params={{ userId: r.rater.userId }}
                          className="text-sm font-semibold text-foreground hover:text-primary transition-colors truncate block"
                        >
                          {r.rater.name}
                        </Link>
                        <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                          <CalendarRange className="h-3 w-3" />
                          {format(new Date(r.createdAt), "d 'de' MMMM, yyyy", {
                            locale: es,
                          })}
                        </span>
                      </div>
                    </div>
                    <StarRow value={r.rating} />
                  </header>

                  <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">
                    {r.comment}
                  </p>

                  <Link
                    to="/packages/$id"
                    params={{ id: packageId }}
                    className="text-xs text-muted-foreground hover:text-primary transition-colors self-start"
                  >
                    Sobre el viaje: <span className="font-medium">{r.travelPackageTitle}</span>
                  </Link>
                </article>
              );
            })
          )}
        </div>
      )}
    </section>
  );
}
