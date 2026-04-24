import { api } from "@proy_vibetribe/backend/convex/_generated/api";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import { Save, Camera, X, Image as ImageIcon, Trash2, AlertTriangle } from "lucide-react";
import { format } from "date-fns";

import { Button } from "@proy_vibetribe/ui/components/button";
import { Input } from "@proy_vibetribe/ui/components/input";
import { Label } from "@proy_vibetribe/ui/components/label";
import { Badge } from "@proy_vibetribe/ui/components/badge";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogCancel,
  AlertDialogAction,
} from "@proy_vibetribe/ui/components/alert-dialog";
import { Skeleton } from "@proy_vibetribe/ui/components/skeleton";
import { LocationInput } from "@/components/location-input";
import { getGoogleMapsApiKey } from "@/lib/maps";
import { PageHeader } from "@/components/page-header";

export const Route = createFileRoute("/packages/$id/edit")({
  component: EditPackageScreen,
});

const DEFAULT_TAGS = [
  "playa", "montaña", "cultura", "aventura", "relax", "gastronomía", "naturaleza"
];

function EditPackageScreen() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const pkg = useQuery(api.packages.getById, { id: id as any });
  const profile = useQuery(api.profiles.getMine);
  const updateMutation = useMutation(api.packages.update);
  const removeMutation = useMutation(api.packages.remove);

  const [loading, setLoading] = useState(false);
  const [coverImage, setCoverImage] = useState<string | null>(null);
  const [priceDisplay, setPriceDisplay] = useState("");
  const [price, setPrice] = useState(0);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    title: "",
    destination: "",
    description: "",
    maxParticipants: 10,
    startDateStr: "",
    endDateStr: "",
    tags: [] as string[],
    accommodation: "",
  });

  useEffect(() => {
    if (pkg) {
      setFormData({
        title: pkg.title || "",
        destination: pkg.destination || "",
        description: pkg.description || "",
        maxParticipants: pkg.maxParticipants || 10,
        startDateStr: pkg.startDate ? format(new Date(pkg.startDate), "yyyy-MM-dd") : "",
        endDateStr: pkg.endDate ? format(new Date(pkg.endDate), "yyyy-MM-dd") : "",
        tags: pkg.tags || [],
        accommodation: pkg.accommodation || "",
      });
      setCoverImage(pkg.imageUrl || null);
      setPrice(pkg.price || 0);
      setPriceDisplay(pkg.price ? new Intl.NumberFormat("es-CO").format(pkg.price) : "");
    }
  }, [pkg]);

  const toggleTag = (tag: string) => {
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags.includes(tag)
        ? prev.tags.filter((t) => t !== tag)
        : [...prev.tags, tag],
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("La imagen no debe superar los 5MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64String = event.target?.result as string;
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX_WIDTH = 1200;
        const MAX_HEIGHT = 800;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0, width, height);

        const compressedBase64 = canvas.toDataURL("image/jpeg", 0.8);
        setCoverImage(compressedBase64);
      };
      img.src = base64String;
    };
    reader.readAsDataURL(file);
  };

  const formatPriceInput = (value: string) => {
    const numericValue = value.replace(/\D/g, "");
    if (!numericValue) {
      setPriceDisplay("");
      setPrice(0);
      return;
    }
    const num = parseInt(numericValue, 10);
    const formatted = new Intl.NumberFormat("es-CO").format(num);
    setPriceDisplay(formatted);
    setPrice(num);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!formData.title || !formData.destination) {
        throw new Error("Por favor completa los campos requeridos");
      }

      const start = formData.startDateStr ? new Date(formData.startDateStr).getTime() : pkg!.startDate;
      const end = formData.endDateStr ? new Date(formData.endDateStr).getTime() : pkg!.endDate;

      if (start >= end) {
        throw new Error("La fecha de regreso debe ser después de la fecha de ida");
      }

      await updateMutation({
        id: id as any,
        title: formData.title,
        destination: formData.destination,
        description: formData.description,
        price: price,
        maxParticipants: Number(formData.maxParticipants),
        startDate: start,
        endDate: end,
        tags: formData.tags,
        imageUrl: coverImage,
        accommodation: formData.accommodation || undefined,
      });

      toast.success("¡Paquete actualizado!");
      navigate({ to: "/packages/$id", params: { id } });
    } catch (error: any) {
      toast.error(error.message || "No se pudo actualizar el paquete");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setLoading(true);
    try {
      await removeMutation({ id: id as any });
      toast.success("Paquete eliminado");
      navigate({ to: "/dashboard" });
    } catch (error: any) {
      toast.error(error.message || "No se pudo eliminar el paquete");
    } finally {
      setLoading(false);
      setShowDeleteDialog(false);
    }
  };

  if (pkg === undefined || profile === undefined) {
    return <EditPackageSkeleton />;
  }

  const isCreator = profile?._id === pkg.creatorId;

  if (!isCreator && pkg) {
    return (
      <div className="flex-1 w-full max-w-md mx-auto bg-background min-h-screen">
        <PageHeader title="Editar Viaje" backTo={`/packages/${id}`} />
        <div className="flex h-[60vh] flex-col items-center justify-center gap-4 text-center p-6">
          <AlertTriangle className="h-12 w-12 text-destructive" />
          <h2 className="text-xl font-bold">No tienes permiso</h2>
          <p className="text-muted-foreground">Solo el creador puede editar este paquete.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 w-full max-w-md mx-auto bg-background min-h-screen">
      <PageHeader
        title="Editar Viaje"
        backTo={`/packages/${id}`}
        actions={
          <Button
            variant="ghost"
            size="icon"
            className="text-destructive hover:bg-destructive/10"
            onClick={() => setShowDeleteDialog(true)}
          >
            <Trash2 className="h-5 w-5" />
          </Button>
        }
      />

      <form onSubmit={handleUpdate} className="p-5 flex flex-col gap-6">
        <section className="flex flex-col gap-4 bg-card p-4 rounded-xl border shadow-sm">
          <h2 className="font-semibold text-foreground border-b pb-2">Imagen de Portada</h2>
          <div
            className="relative h-48 w-full rounded-lg border-2 border-dashed border-muted-foreground/25 overflow-hidden cursor-pointer hover:border-primary/50 transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            {coverImage ? (
              <>
                <img src={coverImage} alt="Cover" className="h-full w-full object-cover" />
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      setCoverImage(null);
                    }}
                  >
                    <X className="h-4 w-4 mr-1" />
                    Cambiar
                  </Button>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full gap-2 text-muted-foreground">
                <ImageIcon className="h-10 w-10" />
                <p className="text-sm font-medium">Agregar foto del destino</p>
              </div>
            )}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*"
              className="hidden"
            />
          </div>
        </section>

        <section className="flex flex-col gap-4 bg-card p-4 rounded-xl border shadow-sm">
          <h2 className="font-semibold text-foreground border-b pb-2">Información Principal</h2>

          <div className="grid gap-2">
            <Label htmlFor="title">Título del Viaje *</Label>
            <Input
              id="title"
              placeholder="Ej. Aventura en la Sierra Nevada"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="destination">Destino *</Label>
            <LocationInput
              apiKey={getGoogleMapsApiKey()}
              value={formData.destination}
              onChange={(val) => setFormData({ ...formData, destination: val })}
              placeholder="Ej. Santa Marta, Colombia"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="description">Descripción</Label>
            <textarea
              id="description"
              className="flex min-h-[100px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              placeholder="Describe lo increíble que será este viaje..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="accommodation">Alojamiento (opcional)</Label>
            <Input
              id="accommodation"
              placeholder="Ej. Hotel 4 estrellas con vista al mar"
              value={formData.accommodation}
              onChange={(e) => setFormData({ ...formData, accommodation: e.target.value })}
            />
          </div>
        </section>

        <section className="flex flex-col gap-4 bg-card p-4 rounded-xl border shadow-sm">
          <h2 className="font-semibold text-foreground border-b pb-2">Categorías</h2>
          <div className="flex flex-wrap gap-2">
            {DEFAULT_TAGS.map((tag) => (
              <Badge
                key={tag}
                variant={formData.tags.includes(tag) ? "default" : "outline"}
                className={`cursor-pointer px-3 py-1 text-xs capitalize ${formData.tags.includes(tag) ? "" : "hover:bg-muted"}`}
                onClick={() => toggleTag(tag)}
              >
                {tag}
              </Badge>
            ))}
          </div>
        </section>

        <section className="grid sm:grid-cols-2 gap-4 bg-card p-4 rounded-xl border shadow-sm">
          <h2 className="font-semibold text-foreground border-b pb-2 sm:col-span-2">Logística</h2>

          <div className="grid gap-2">
            <Label htmlFor="price">Precio (COP) *</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
              <Input
                id="price"
                type="text"
                inputMode="numeric"
                placeholder="0"
                value={priceDisplay}
                onChange={(e) => formatPriceInput(e.target.value)}
                className="pl-6"
                required
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="maxParticipants">Cupos Máximos *</Label>
            <Input
              id="maxParticipants"
              type="number"
              min="1"
              placeholder="10"
              value={formData.maxParticipants}
              onChange={(e) => setFormData({ ...formData, maxParticipants: Number(e.target.value) })}
              required
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="startDate">Fecha de Inicio *</Label>
            <Input
              id="startDate"
              type="date"
              value={formData.startDateStr}
              onChange={(e) => setFormData({ ...formData, startDateStr: e.target.value })}
              required
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="endDate">Fecha de Fin *</Label>
            <Input
              id="endDate"
              type="date"
              value={formData.endDateStr}
              onChange={(e) => setFormData({ ...formData, endDateStr: e.target.value })}
              required
            />
          </div>
        </section>

        <div className="pt-4 pb-12">
          <Button
            type="submit"
            className="w-full rounded-full h-12 text-base font-semibold shadow-md"
            disabled={loading}
          >
            <Save className="mr-2 h-5 w-5" />
            {loading ? "Guardando..." : "Guardar Cambios"}
          </Button>
        </div>
      </form>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Cancelar Paquete
            </AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de que quieres cancelar este paquete? Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowDeleteDialog(false)}>
              Mantener
            </AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={handleDelete} disabled={loading}>
              {loading ? "Eliminando..." : "Sí, Cancelar Paquete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function EditPackageSkeleton() {
  return (
    <div className="flex-1 w-full max-w-md mx-auto animate-pulse p-5 space-y-6">
      <Skeleton className="h-48 w-full rounded-xl" />
      <Skeleton className="h-64 w-full rounded-xl" />
      <Skeleton className="h-48 w-full rounded-xl" />
    </div>
  );
}