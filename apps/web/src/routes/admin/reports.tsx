import { api } from "@proy_vibetribe/backend/convex/_generated/api";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  Ban,
  CheckCircle2,
  ChevronRight,
  ExternalLink,
  Flag,
  Loader2,
  Shield,
  ShieldAlert,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Avatar, AvatarFallback, AvatarImage } from "@proy_vibetribe/ui/components/avatar";
import { Badge } from "@proy_vibetribe/ui/components/badge";
import { Button } from "@proy_vibetribe/ui/components/button";
import { Skeleton } from "@proy_vibetribe/ui/components/skeleton";
import { PageHeader } from "@/components/page-header";
import { BanUserDialog } from "@/components/admin/ban-user-dialog";

export const Route = createFileRoute("/admin/reports")({
  component: AdminReportsScreen,
});

const REASON_LABELS: Record<string, string> = {
  harassment: "Acoso o comportamiento agresivo",
  offensive_language: "Lenguaje ofensivo o discriminatorio",
  spam: "Spam o publicidad",
  fraud: "Fraude o estafa",
  rule_violation: "Incumplimiento de las reglas del viaje",
  other: "Otro",
};

const STATUS_FILTERS = [
  { value: "pending", label: "Pendientes" },
  { value: "reviewed", label: "Revisados" },
  { value: "dismissed", label: "Descartados" },
] as const;

type StatusFilter = (typeof STATUS_FILTERS)[number]["value"];

function AdminReportsScreen() {
  const adminStatus = useQuery(api.admin.getMyAdminStatus);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("pending");
  const reports = useQuery(api.admin.getAllReports, { status: statusFilter });
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [banDialogOpen, setBanDialogOpen] = useState(false);

  if (adminStatus === undefined) {
    return <AdminReportsSkeleton />;
  }

  if (!adminStatus.isAdmin) {
    return (
      <div className="flex-1 w-full max-w-md mx-auto md:max-w-2xl bg-muted/20 border-x min-h-screen pb-20">
        <PageHeader title="Panel de Administración" />
        <div className="flex h-[60vh] flex-col items-center justify-center gap-4 text-center p-6">
          <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center">
            <ShieldAlert className="h-8 w-8 text-destructive" />
          </div>
          <h2 className="text-2xl font-bold">Acceso restringido</h2>
          <p className="text-muted-foreground">
            Esta sección solo está disponible para administradores.
          </p>
          <Link
            to="/"
            className="inline-flex h-10 items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            Volver al inicio
          </Link>
        </div>
      </div>
    );
  }

  const selectedReport = reports?.find((r) => r._id === selectedReportId);

  return (
    <div className="flex-1 w-full max-w-md mx-auto md:max-w-4xl bg-muted/20 border-x min-h-screen pb-20">
      <PageHeader
        title="Panel de Administración"
        actions={
          <Badge variant="secondary" className="gap-1">
            <ShieldCheck className="h-3 w-3" />
            Admin
          </Badge>
        }
      />

      <div className="px-5 py-6 flex flex-col gap-6">
        <header className="flex flex-col gap-1">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Shield className="h-3.5 w-3.5" />
            {adminStatus.email}
          </div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Flag className="h-6 w-6 text-primary" />
            Reportes de la comunidad
          </h1>
          <p className="text-sm text-muted-foreground">
            Revisa los reportes enviados por los usuarios y decide las acciones
            a tomar.
          </p>
        </header>

        <div className="flex gap-1 rounded-full border bg-card p-1 self-start">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => {
                setStatusFilter(f.value);
                setSelectedReportId(null);
              }}
              className={`px-4 py-1.5 text-xs font-semibold rounded-full transition-colors ${
                statusFilter === f.value
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="md:col-span-2 flex flex-col gap-2">
            <h2 className="text-sm font-semibold text-muted-foreground px-1">
              {reports?.length ?? 0} reporte(s)
            </h2>
            {reports === undefined ? (
              <div className="flex flex-col gap-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-24 w-full rounded-xl" />
                ))}
              </div>
            ) : reports.length === 0 ? (
              <div className="bg-card border rounded-xl p-6 text-center text-sm text-muted-foreground">
                No hay reportes en este estado.
              </div>
            ) : (
              <ul className="flex flex-col gap-2">
                {reports.map((r) => (
                  <li key={r._id}>
                    <button
                      type="button"
                      onClick={() => setSelectedReportId(r._id)}
                      className={`w-full text-left bg-card border rounded-xl p-3 transition-colors ${
                        selectedReportId === r._id
                          ? "border-primary bg-primary/5"
                          : "hover:bg-muted/40"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <Avatar className="h-10 w-10 shrink-0">
                          <AvatarImage
                            src={r.reported.avatarUrl || undefined}
                            alt={r.reported.name}
                          />
                          <AvatarFallback className="text-sm font-semibold">
                            {r.reported.name[0]?.toUpperCase() || "U"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className="font-semibold text-sm truncate">
                              {r.reported.name}
                            </p>
                            <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-1">
                            {REASON_LABELS[r.reason] || r.reason}
                          </p>
                          <div className="flex items-center gap-2 mt-1.5 text-[10px] text-muted-foreground">
                            <span>
                              {format(new Date(r.createdAt), "d MMM HH:mm", {
                                locale: es,
                              })}
                            </span>
                            {r.reported.totalReports > 1 && (
                              <>
                                <span>•</span>
                                <span className="font-semibold text-destructive">
                                  {r.reported.totalReports} reporte(s) en total
                                </span>
                              </>
                            )}
                            {r.reported.isBanned && (
                              <>
                                <span>•</span>
                                <span className="font-semibold text-destructive">
                                  BANEADO
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="md:col-span-3">
            {selectedReport ? (
              <ReportDetail
                report={selectedReport}
                onBanClick={() => setBanDialogOpen(true)}
                onClear={() => setSelectedReportId(null)}
              />
            ) : (
              <div className="bg-card border rounded-xl p-8 text-center text-sm text-muted-foreground min-h-[200px] flex flex-col items-center justify-center gap-2">
                <Flag className="h-8 w-8 opacity-40" />
                <p>Selecciona un reporte para revisarlo.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {selectedReport && (
        <BanUserDialog
          open={banDialogOpen}
          onOpenChange={setBanDialogOpen}
          reportedUserId={selectedReport.reported.userId}
          reportedUserName={selectedReport.reported.name}
          reportId={selectedReport._id}
          onBanned={() => {
            setSelectedReportId(null);
          }}
        />
      )}
    </div>
  );
}

function ReportDetail({
  report,
  onBanClick,
  onClear,
}: {
  report: any;
  onBanClick: () => void;
  onClear: () => void;
}) {
  const reviewReport = useMutation(api.admin.reviewReport);
  const [busyAction, setBusyAction] = useState<"dismiss" | "no_action" | null>(
    null
  );

  const handleDismiss = async () => {
    if (
      !confirm(
        "¿Descartar este reporte? El usuario reportado no será sancionado."
      )
    )
      return;
    setBusyAction("dismiss");
    try {
      await reviewReport({ reportId: report._id, action: "dismiss" });
      toast.success("Reporte descartado");
      onClear();
    } catch (e: any) {
      toast.error(e?.message ?? "Error al descartar");
    } finally {
      setBusyAction(null);
    }
  };

  const handleNoAction = async () => {
    setBusyAction("no_action");
    try {
      await reviewReport({ reportId: report._id, action: "no_action" });
      toast.success("Reporte marcado como revisado");
      onClear();
    } catch (e: any) {
      toast.error(e?.message ?? "Error");
    } finally {
      setBusyAction(null);
    }
  };

  return (
    <article className="bg-card border rounded-2xl p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <Badge
          variant={
            report.status === "pending"
              ? "default"
              : report.status === "reviewed"
              ? "secondary"
              : "outline"
          }
          className="uppercase"
        >
          {report.status === "pending"
            ? "Pendiente"
            : report.status === "reviewed"
            ? "Revisado"
            : "Descartado"}
        </Badge>
        <span className="text-xs text-muted-foreground">
          {format(new Date(report.createdAt), "PPPp", { locale: es })}
        </span>
      </div>

      <section className="flex flex-col gap-2 p-3 bg-muted/30 rounded-xl">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Motivo
        </p>
        <p className="font-semibold">
          {REASON_LABELS[report.reason] || report.reason}
        </p>
        {report.details && (
          <div className="mt-2 pt-2 border-t">
            <p className="text-xs text-muted-foreground mb-1">Detalles:</p>
            <p className="text-sm whitespace-pre-wrap">{report.details}</p>
          </div>
        )}
      </section>

      <PersonBlock
        label="Reportado por"
        user={report.reporter}
        isAccused={false}
      />
      <PersonBlock
        label="Usuario reportado"
        user={report.reported}
        isAccused={true}
        reportCount={report.reported.totalReports}
        isBanned={report.reported.isBanned}
      />

      {report.status === "pending" && !report.reported.isBanned && (
        <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t">
          <Button
            variant="outline"
            className="flex-1"
            onClick={handleNoAction}
            disabled={busyAction !== null}
          >
            {busyAction === "no_action" ? (
              <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
            ) : (
              <CheckCircle2 className="h-4 w-4 mr-1.5" />
            )}
            Solo marcar revisado
          </Button>
          <Button
            variant="outline"
            className="flex-1"
            onClick={handleDismiss}
            disabled={busyAction !== null}
          >
            {busyAction === "dismiss" ? (
              <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
            ) : (
              <XCircle className="h-4 w-4 mr-1.5" />
            )}
            Descartar reporte
          </Button>
          <Button
            variant="destructive"
            className="flex-1"
            onClick={onBanClick}
            disabled={busyAction !== null}
          >
            <Ban className="h-4 w-4 mr-1.5" />
            Banear usuario
          </Button>
        </div>
      )}
    </article>
  );
}

function PersonBlock({
  label,
  user,
  isAccused,
  reportCount,
  isBanned,
}: {
  label: string;
  user: { userId: string; name: string; avatarUrl?: string };
  isAccused: boolean;
  reportCount?: number;
  isBanned?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 p-3 bg-card border rounded-xl">
      <Avatar className="h-12 w-12 shrink-0">
        <AvatarImage src={user.avatarUrl || undefined} alt={user.name} />
        <AvatarFallback className="font-semibold">
          {user.name[0]?.toUpperCase() || "U"}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">
          {label}
        </p>
        <p className="font-semibold truncate">{user.name}</p>
        <div className="flex items-center gap-2 mt-0.5">
          {isAccused && typeof reportCount === "number" && reportCount > 1 && (
            <span className="text-[10px] text-destructive font-semibold">
              {reportCount} reportes
            </span>
          )}
          {isAccused && isBanned && (
            <span className="text-[10px] text-destructive font-semibold">
              BANEADO
            </span>
          )}
        </div>
      </div>
      <Link
        to="/users/$userId"
        params={{ userId: user.userId }}
        target="_blank"
        rel="noreferrer"
        className="p-2 rounded-md hover:bg-muted inline-flex items-center justify-center"
        aria-label="Ver perfil"
      >
        <ExternalLink className="h-4 w-4" />
      </Link>
    </div>
  );
}

function AdminReportsSkeleton() {
  return (
    <div className="flex-1 w-full max-w-md mx-auto md:max-w-4xl bg-muted/20 border-x min-h-screen pb-20">
      <div className="px-5 py-8 flex flex-col gap-4 animate-pulse">
        <Skeleton className="h-8 w-1/2" />
        <Skeleton className="h-4 w-3/4" />
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mt-4">
          <div className="md:col-span-2 flex flex-col gap-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24 w-full rounded-xl" />
            ))}
          </div>
          <div className="md:col-span-3">
            <Skeleton className="h-64 w-full rounded-2xl" />
          </div>
        </div>
      </div>
    </div>
  );
}
