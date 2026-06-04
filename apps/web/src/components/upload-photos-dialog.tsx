import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  Camera,
  HardDrive,
  ImagePlus,
  Loader2,
  MapPin,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { api } from "@proy_vibetribe/backend/convex/_generated/api";
import { Id } from "@proy_vibetribe/backend/convex/_generated/dataModel";
import { Button } from "@proy_vibetribe/ui/components/button";
import { Label } from "@proy_vibetribe/ui/components/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@proy_vibetribe/ui/components/dialog";

const MAX_PHOTO_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_CAPTION_LENGTH = 200;
const MAX_FILES_PER_BATCH = 20;

function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

type UploadStatus = "pending" | "uploading" | "saving" | "done" | "error";

interface PendingFile {
  id: string;
  file: File;
  previewUrl: string;
  caption: string;
  status: UploadStatus;
  errorMessage?: string;
}

interface UploadPhotosDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUploaded?: () => void;
}

export function UploadPhotosDialog({
  open,
  onOpenChange,
  onUploaded,
}: UploadPhotosDialogProps) {
  const completedPackages = useQuery(api.photos.getMyCompletedPackages, {});
  const generateUploadUrl = useMutation(api.photos.generateUploadUrl);
  const addTripPhoto = useMutation(api.photos.addTripPhoto);

  const [selectedPackageId, setSelectedPackageId] = useState<
    Id<"travelPackages"> | ""
  >("");
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingFilesRef = useRef<PendingFile[]>([]);

  useEffect(() => {
    pendingFilesRef.current = pendingFiles;
  }, [pendingFiles]);

  useEffect(() => {
    return () => {
      pendingFilesRef.current.forEach((f) =>
        URL.revokeObjectURL(f.previewUrl)
      );
    };
  }, []);

  useEffect(() => {
    if (!open) {
      pendingFiles.forEach((f) => URL.revokeObjectURL(f.previewUrl));
      setSelectedPackageId("");
      setPendingFiles([]);
      setIsSubmitting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }, [open]);

  const handlePackageChange = (value: string) => {
    setSelectedPackageId(value as Id<"travelPackages"> | "");
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;

    if (pendingFiles.length + files.length > MAX_FILES_PER_BATCH) {
      toast.error(
        `Solo puedes subir hasta ${MAX_FILES_PER_BATCH} fotos a la vez`
      );
      return;
    }

    const newPending: PendingFile[] = files.map((file) => {
      const id = `${file.name}-${file.size}-${file.lastModified}-${Math.random()
        .toString(36)
        .slice(2, 8)}`;
      const isAllowedType = ALLOWED_MIME_TYPES.includes(file.type);
      const isAllowedSize = file.size <= MAX_PHOTO_SIZE_BYTES;
      const previewUrl = URL.createObjectURL(file);
      const status: UploadStatus =
        !isAllowedType || !isAllowedSize ? "error" : "pending";
      const errorMessage = !isAllowedType
        ? "Formato no permitido (solo JPEG, PNG o WebP)"
        : !isAllowedSize
        ? `Supera el máximo de 5 MB (${(file.size / 1024 / 1024).toFixed(1)} MB)`
        : undefined;
      return {
        id,
        file,
        previewUrl,
        caption: "",
        status,
        errorMessage,
      };
    });

    setPendingFiles((prev) => [...prev, ...newPending]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const updateFileCaption = (id: string, caption: string) => {
    setPendingFiles((prev) =>
      prev.map((f) =>
        f.id === id ? { ...f, caption: caption.slice(0, MAX_CAPTION_LENGTH) } : f
      )
    );
  };

  const removeFile = (id: string) => {
    setPendingFiles((prev) => {
      const target = prev.find((f) => f.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((f) => f.id !== id);
    });
  };

  const uploadOne = async (
    pending: PendingFile,
    travelPackageId: Id<"travelPackages">
  ): Promise<boolean> => {
    try {
      setPendingFiles((prev) =>
        prev.map((f) =>
          f.id === pending.id ? { ...f, status: "uploading", errorMessage: undefined } : f
        )
      );
      const uploadUrl = await generateUploadUrl({});
      const result = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": pending.file.type },
        body: pending.file,
      });
      if (!result.ok) {
        throw new Error(`Error al subir (${result.status})`);
      }
      const { storageId } = await result.json();
      setPendingFiles((prev) =>
        prev.map((f) =>
          f.id === pending.id ? { ...f, status: "saving" } : f
        )
      );
      await addTripPhoto({
        travelPackageId,
        storageId,
        caption: pending.caption.trim() || undefined,
      });
      setPendingFiles((prev) =>
        prev.map((f) =>
          f.id === pending.id ? { ...f, status: "done" } : f
        )
      );
      return true;
    } catch (e: any) {
      setPendingFiles((prev) =>
        prev.map((f) =>
          f.id === pending.id
            ? { ...f, status: "error", errorMessage: e?.message ?? "Error desconocido" }
            : f
        )
      );
      return false;
    }
  };

  const handleSubmit = async () => {
    if (!selectedPackageId) {
      toast.error("Selecciona un viaje");
      return;
    }
    const validFiles = pendingFiles.filter((f) => f.status === "pending");
    if (validFiles.length === 0) {
      toast.error("Agrega al menos una foto válida para subir");
      return;
    }
    setIsSubmitting(true);
    try {
      const results = await Promise.all(
        validFiles.map((f) => uploadOne(f, selectedPackageId as Id<"travelPackages">))
      );
      const successCount = results.filter(Boolean).length;
      const failCount = results.length - successCount;
      if (successCount > 0) {
        toast.success(
          failCount > 0
            ? `${successCount} foto(s) subidas, ${failCount} fallaron`
            : `${successCount} foto(s) subidas correctamente`
        );
        onUploaded?.();
      } else {
        toast.error("No se pudo subir ninguna foto");
      }
      if (successCount === validFiles.length) {
        onOpenChange(false);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const validCount = pendingFiles.filter((f) => f.status === "pending").length;
  const isLoadingPackages = completedPackages === undefined;
  const hasCompletedPackages =
    !isLoadingPackages && (completedPackages?.length ?? 0) > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg gap-0 p-0 max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader className="p-6 pb-3 shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <ImagePlus className="h-5 w-5 text-primary" />
            Subir fotos de viaje
          </DialogTitle>
          <DialogDescription>
            Comparte los recuerdos de los viajes que ya finalizaron. Máximo 5 MB
            por foto (JPEG, PNG o WebP).
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-2">
          <div className="flex flex-col gap-5 pb-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="photo-trip">Viaje</Label>
              {isLoadingPackages ? (
                <div className="h-10 rounded-md border bg-muted/40 flex items-center px-3 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Cargando viajes…
                </div>
              ) : !hasCompletedPackages ? (
                <div className="rounded-md border bg-muted/30 p-3 text-sm text-muted-foreground">
                  Aún no tienes viajes finalizados. Las fotos se pueden subir
                  cuando el viaje haya terminado.
                </div>
              ) : (
                <select
                  id="photo-trip"
                  value={selectedPackageId}
                  onChange={(e) => handlePackageChange(e.target.value)}
                  disabled={isSubmitting}
                  className="h-10 rounded-md border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">Selecciona un viaje…</option>
                  {completedPackages!.map((pkg) => (
                    <option key={pkg._id} value={pkg._id}>
                      {pkg.title} — {pkg.destination} (
                      {format(new Date(pkg.endDate), "MMM yyyy", { locale: es })})
                      {pkg.photoCount > 0
                        ? ` • ${pkg.photoCount} foto(s)`
                        : ""}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {hasCompletedPackages && (
              <div className="flex flex-col gap-2">
                <Label>Fotos</Label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  onChange={handleFileInputChange}
                  disabled={isSubmitting}
                  className="hidden"
                  id="photo-file-input"
                />
                <label
                  htmlFor="photo-file-input"
                  className={`flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-muted/30 p-6 cursor-pointer hover:bg-muted/50 transition-colors ${
                    isSubmitting ? "opacity-50 cursor-not-allowed" : ""
                  }`}
                >
                  <Camera className="h-8 w-8 text-muted-foreground" />
                  <span className="text-sm font-medium">
                    Selecciona una o varias fotos
                  </span>
                  <span className="text-xs text-muted-foreground">
                    JPEG, PNG o WebP • máximo 5 MB cada una
                  </span>
                </label>

                {pendingFiles.length > 0 && (
                  <ul className="flex flex-col gap-2 mt-2">
                    {pendingFiles.map((f) => (
                      <li
                        key={f.id}
                        className="flex gap-3 rounded-lg border bg-card p-2"
                      >
                        <div className="h-20 w-20 shrink-0 rounded-md overflow-hidden bg-muted">
                          <img
                            src={f.previewUrl}
                            alt={f.file.name}
                            className="h-full w-full object-cover"
                          />
                        </div>
                        <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                          <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">
                              {f.file.name}
                            </p>
                            <p className="text-xs font-medium text-foreground/70 flex items-center gap-1">
                              <HardDrive className="h-3 w-3" />
                              {formatFileSize(f.file.size)}
                            </p>
                          </div>
                            {f.status === "pending" && (
                              <button
                                type="button"
                                onClick={() => removeFile(f.id)}
                                disabled={isSubmitting}
                                className="p-1 rounded hover:bg-muted shrink-0"
                                aria-label="Quitar"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                          {f.status === "pending" && (
                            <input
                              type="text"
                              value={f.caption}
                              onChange={(e) =>
                                updateFileCaption(f.id, e.target.value)
                              }
                              placeholder="Descripción opcional…"
                              maxLength={MAX_CAPTION_LENGTH}
                              disabled={isSubmitting}
                              className="text-xs h-8 rounded border bg-background px-2 focus:outline-none focus:ring-1 focus:ring-primary"
                            />
                          )}
                          {f.status === "uploading" && (
                            <span className="text-xs text-blue-600 flex items-center gap-1">
                              <Loader2 className="h-3 w-3 animate-spin" />
                              Subiendo…
                            </span>
                          )}
                          {f.status === "saving" && (
                            <span className="text-xs text-blue-600 flex items-center gap-1">
                              <Loader2 className="h-3 w-3 animate-spin" />
                              Guardando…
                            </span>
                          )}
                          {f.status === "done" && (
                            <span className="text-xs text-green-600">
                              ✓ Subida
                            </span>
                          )}
                          {f.status === "error" && (
                            <span className="text-xs text-destructive flex items-center justify-between gap-2">
                              <span className="truncate">
                                {f.errorMessage ?? "Error"}
                              </span>
                              <button
                                type="button"
                                onClick={() => removeFile(f.id)}
                                className="shrink-0 p-1 rounded hover:bg-muted"
                                aria-label="Quitar"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </span>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {hasCompletedPackages && validCount > 0 && (
              <div className="text-xs text-muted-foreground bg-muted/40 border rounded-lg p-3 flex items-center gap-2">
                <MapPin className="h-4 w-4 shrink-0" />
                <span>
                  {validCount} foto(s) listas para subir. Las descripciones
                  son opcionales.
                </span>
              </div>
            )}
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
            onClick={handleSubmit}
            disabled={isSubmitting || !hasCompletedPackages || validCount === 0}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Subiendo…
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Subir {validCount > 0 ? `(${validCount})` : ""}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
