import { useState } from "react";
import { useMutation } from "convex/react";
import { Flag, ShieldAlert } from "lucide-react";
import { toast } from "sonner";

import { api } from "@proy_vibetribe/backend/convex/_generated/api";
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

const REPORT_REASONS = [
  { value: "harassment", label: "Acoso o comportamiento agresivo" },
  {
    value: "offensive_language",
    label: "Lenguaje ofensivo o discriminatorio",
  },
  { value: "spam", label: "Spam o publicidad" },
  { value: "fraud", label: "Fraude o estafa" },
  {
    value: "rule_violation",
    label: "Incumplimiento de las reglas del viaje",
  },
  { value: "other", label: "Otro" },
] as const;

const MAX_DETAILS_LENGTH = 500;

type ReportReason = (typeof REPORT_REASONS)[number]["value"];

interface ReportUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reportedUserId: string;
  reportedUserName: string;
}

export function ReportUserDialog({
  open,
  onOpenChange,
  reportedUserId,
  reportedUserName,
}: ReportUserDialogProps) {
  const [reason, setReason] = useState<ReportReason | "">("");
  const [details, setDetails] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const reportUser = useMutation(api.reports.reportUser);

  const resetState = () => {
    setReason("");
    setDetails("");
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      resetState();
    }
    onOpenChange(nextOpen);
  };

  const handleSubmit = async () => {
    if (!reason) {
      toast.error("Selecciona un motivo para el reporte");
      return;
    }

    setIsSubmitting(true);
    try {
      await reportUser({
        reportedUserId,
        reason,
        details: details.trim() || undefined,
      });
      toast.success(
        "Reporte enviado. Nuestro equipo lo revisará en breve."
      );
      handleOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || "Error al enviar el reporte");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md gap-0 p-0 max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader className="p-6 pb-3 shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Flag className="h-5 w-5 text-destructive" />
            Reportar a {reportedUserName}
          </DialogTitle>
          <DialogDescription>
            Cuéntanos qué ocurrió. Tu reporte es confidencial y será revisado
            por un administrador.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-2">
          <div className="flex flex-col gap-5 pb-2">
            <div className="flex flex-col gap-2">
              <Label>Motivo del reporte</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {REPORT_REASONS.map((r) => {
                  const selected = reason === r.value;
                  return (
                    <label
                      key={r.value}
                      className={`flex items-center gap-2.5 p-2.5 rounded-lg border cursor-pointer transition-colors ${
                        selected
                          ? "border-primary bg-primary/5"
                          : "border-border hover:bg-muted/50"
                      }`}
                    >
                      <input
                        type="radio"
                        name="report-reason"
                        value={r.value}
                        checked={selected}
                        onChange={() => setReason(r.value)}
                        disabled={isSubmitting}
                        className="h-4 w-4 text-primary accent-primary shrink-0"
                      />
                      <span className="text-sm font-medium leading-tight">
                        {r.label}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="report-details">Detalles (opcional)</Label>
                <span className="text-xs text-muted-foreground">
                  {details.length}/{MAX_DETAILS_LENGTH}
                </span>
              </div>
              <Textarea
                id="report-details"
                placeholder="Describe brevemente lo sucedido para ayudar a nuestro equipo en la revisión."
                value={details}
                onChange={(e) =>
                  setDetails(e.target.value.slice(0, MAX_DETAILS_LENGTH))
                }
                disabled={isSubmitting}
                rows={3}
              />
            </div>

            <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/40 border rounded-lg p-3">
              <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5 text-muted-foreground" />
              <span>
                Por tu seguridad y la del resto de la comunidad, la persona
                reportada no será notificada sobre este reporte.
              </span>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0 p-6 pt-4 shrink-0 border-t">
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={handleSubmit}
            disabled={isSubmitting || !reason}
          >
            {isSubmitting ? "Enviando..." : "Enviar reporte"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
