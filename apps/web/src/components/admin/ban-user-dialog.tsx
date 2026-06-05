import { useEffect, useState } from "react";
import { useMutation } from "convex/react";
import { Ban, Loader2, ShieldAlert } from "lucide-react";
import { toast } from "sonner";

import { api } from "@proy_vibetribe/backend/convex/_generated/api";
import { Id } from "@proy_vibetribe/backend/convex/_generated/dataModel";
import { Button } from "@proy_vibetribe/ui/components/button";
import { Label } from "@proy_vibetribe/ui/components/label";
import { Textarea } from "@proy_vibetribe/ui/components/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@proy_vibetribe/ui/components/dialog";

const MAX_REASON_LENGTH = 500;

interface BanUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reportedUserId: string;
  reportedUserName: string;
  reportId: Id<"userReports">;
  onBanned?: () => void;
}

export function BanUserDialog({
  open,
  onOpenChange,
  reportedUserId,
  reportedUserName,
  reportId,
  onBanned,
}: BanUserDialogProps) {
  const reviewReport = useMutation(api.admin.reviewReport);
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!open) {
      setReason("");
      setIsSubmitting(false);
    }
  }, [open]);

  const handleConfirm = async () => {
    setIsSubmitting(true);
    try {
      await reviewReport({
        reportId,
        action: "ban",
        banReason: reason.trim() || undefined,
      });
      toast.success(`${reportedUserName} ha sido baneado`);
      onBanned?.();
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.message ?? "Error al banear al usuario");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md gap-0 p-0 max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader className="p-6 pb-3 shrink-0">
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <Ban className="h-5 w-5" />
            Banear a {reportedUserName}
          </DialogTitle>
          <DialogDescription>
            Esta acción suspenderá la cuenta del usuario. No podrá iniciar
            sesión ni usar la plataforma.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-2">
          <div className="flex flex-col gap-4 pb-2">
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="ban-reason">
                  Motivo del baneo (opcional)
                </Label>
                <span className="text-xs text-muted-foreground">
                  {reason.length}/{MAX_REASON_LENGTH}
                </span>
              </div>
              <Textarea
                id="ban-reason"
                placeholder="Describe brevemente por qué se tomó esta decisión…"
                value={reason}
                onChange={(e) =>
                  setReason(e.target.value.slice(0, MAX_REASON_LENGTH))
                }
                disabled={isSubmitting}
                rows={4}
              />
            </div>

            <div className="flex items-start gap-2 text-xs text-muted-foreground bg-destructive/5 border border-destructive/20 rounded-lg p-3">
              <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5 text-destructive" />
              <span>
                Esta decisión es definitiva hasta que un administrador la
                revoque manualmente. El usuario no será notificado del motivo
                específico.
              </span>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0 p-6 pt-4 shrink-0 border-t">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
            ) : (
              <Ban className="h-4 w-4 mr-1.5" />
            )}
            Confirmar baneo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
