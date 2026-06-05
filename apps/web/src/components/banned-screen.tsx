import { Ban, Loader2, LogOut, ShieldAlert } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { format } from "date-fns";
import { es } from "date-fns/locale";

import { Button } from "@proy_vibetribe/ui/components/button";
import { authClient } from "@/lib/auth-client";

interface BannedScreenProps {
  bannedAt?: number;
  banReason?: string;
  email?: string;
}

export function BannedScreen({
  bannedAt,
  banReason,
  email,
}: BannedScreenProps) {
  const navigate = useNavigate();

  const handleSignOut = () => {
    authClient.signOut({
      fetchOptions: {
        onSuccess: () => {
          navigate({ to: "/" });
        },
      },
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-card border-2 border-destructive/30 rounded-2xl p-8 shadow-xl flex flex-col items-center text-center gap-5">
        <div className="h-20 w-20 rounded-full bg-destructive/10 flex items-center justify-center">
          <Ban className="h-10 w-10 text-destructive" />
        </div>

        <div>
          <h1 className="text-2xl font-bold text-destructive">
            Cuenta suspendida
          </h1>
          <p className="text-sm text-muted-foreground mt-2">
            Tu cuenta ha sido suspendida y no puedes acceder a VibeTribe.
          </p>
        </div>

        {(banReason || bannedAt) && (
          <div className="w-full bg-muted/40 border rounded-lg p-3 text-left text-sm">
            {banReason && (
              <div className="mb-2 last:mb-0">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Motivo
                </p>
                <p className="mt-1 whitespace-pre-wrap">{banReason}</p>
              </div>
            )}
            {bannedAt && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Fecha de suspensión
                </p>
                <p className="mt-1">
                  {format(new Date(bannedAt), "PPPp", { locale: es })}
                </p>
              </div>
            )}
          </div>
        )}

        <div className="w-full flex items-start gap-2 text-xs text-muted-foreground bg-muted/30 border rounded-lg p-3 text-left">
          <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
          <span>
            Si crees que esto es un error, contacta al equipo de soporte en
            {email ? " la dirección " : " "}
            {email && (
              <a
                className="font-semibold text-foreground underline"
                href={`mailto:${email}`}
              >
                {email}
              </a>
            )}
            . Tu cuenta no será reactivada automáticamente.
          </span>
        </div>

        <Button
          variant="outline"
          className="w-full"
          onClick={handleSignOut}
        >
          <LogOut className="h-4 w-4 mr-2" />
          Cerrar sesión
        </Button>
      </div>
    </div>
  );
}

export function BannedLoadingScreen() {
  return (
    <div className="fixed inset-0 z-50 bg-background flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );
}
