import { Avatar, AvatarFallback, AvatarImage } from "@proy_vibetribe/ui/components/avatar";
import { Skeleton } from "@proy_vibetribe/ui/components/skeleton";
import { Users } from "lucide-react";
import { Link } from "@tanstack/react-router";

interface Participant {
  userId: string;
  joinedAt: number;
  profileInfo?: {
    avatarUrl?: string | null;
    description?: string;
    averageRating?: number;
    name?: string;
  } | null;
}

interface ParticipantsListProps {
  participants: Participant[];
  isLoading?: boolean;
}

export function ParticipantsList({
  participants,
  isLoading = false,
}: ParticipantsListProps) {
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

  return (
    <section className="bg-card border rounded-xl p-4">
      <h3 className="font-semibold mb-3 flex items-center gap-2 text-sm">
        <Users className="h-4 w-4" />
        Participantes ({participants.length})
      </h3>

      <div className="flex gap-4 overflow-x-auto pb-2">
        {participants.map((participant, idx) => {
          const avatarUrl = participant.profileInfo?.avatarUrl ?? undefined;
          const name = participant.profileInfo?.name || "Viajero";
          const fallbackInitial = name[0].toUpperCase();
          const description = participant.profileInfo?.description || "Amante de las aventuras y la naturaleza.";
          const averageRating = participant.profileInfo?.averageRating?.toFixed(1) || "5.0";

          return (
            <Link 
              key={participant.userId || idx} 
              to="/users/$userId" 
              params={{ userId: participant.userId }}
              className="flex flex-col items-center gap-1.5 min-w-[60px] flex-shrink-0 cursor-pointer group"
            >
              <Avatar className="h-14 w-14 border-2 border-background shadow-sm transition-transform group-hover:scale-105">
                <AvatarImage src={avatarUrl} alt={name} />
                <AvatarFallback className="text-base font-semibold bg-primary/10 text-primary">
                  {fallbackInitial}
                </AvatarFallback>
              </Avatar>
              <span className="text-xs text-muted-foreground text-center truncate w-full max-w-[60px] group-hover:text-foreground transition-colors">
                {name.split(' ')[0]}
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
