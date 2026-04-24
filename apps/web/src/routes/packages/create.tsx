import { api } from "@proy_vibetribe/backend/convex/_generated/api";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation } from "convex/react";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Save } from "lucide-react";

import { Button } from "@proy_vibetribe/ui/components/button";
import { Input } from "@proy_vibetribe/ui/components/input";
import { Label } from "@proy_vibetribe/ui/components/label";
import { Badge } from "@proy_vibetribe/ui/components/badge";

export const Route = createFileRoute("/packages/create")({
  component: CreatePackageScreen,
});

const DEFAULT_TAGS = [
  "playa", "montaña", "cultura", "aventura", "relax", "gastronomía", "naturaleza"
];

function CreatePackageScreen() {
  const navigate = useNavigate();
  const createMutation = useMutation(api.packages.create);

  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    destination: "",
    description: "",
    durationDays: 1,
    price: 0,
    maxParticipants: 10,
    startDateStr: "",
    endDateStr: "",
    tags: [] as string[],
  });

  const toggleTag = (tag: string) => {
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags.includes(tag)
        ? prev.tags.filter((t) => t !== tag)
        : [...prev.tags, tag],
    }));
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!formData.title || !formData.destination || !formData.startDateStr || !formData.endDateStr) {
        throw new Error("Por favor completa los campos requeridos");
      }

      const start = new Date(formData.startDateStr).getTime();
      const end = new Date(formData.endDateStr).getTime();

      if (start >= end) {
        throw new Error("La fecha de regreso debe ser después de la fecha de ida");
      }

      await createMutation({
        title: formData.title,
        destination: formData.destination,
        description: formData.description,
        durationDays: Number(formData.durationDays),
        price: Number(formData.price),
        maxParticipants: Number(formData.maxParticipants),
        startDate: start,
        endDate: end,
        tags: formData.tags,
      });

      toast.success("¡Paquete de viaje creado exitosamente!");
      navigate({ to: "/dashboard" });
    } catch (error: any) {
      toast.error(error.message || "No se pudo crear el paquete");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 w-full max-w-md mx-auto md:max-w-2xl bg-background min-h-screen">
      {/* Header */}
      <div className="sticky top-0 z-10 flex items-center justify-between p-4 bg-background/80 backdrop-blur-md border-b">
        <div className="flex items-center gap-3">
          <Button 
            variant="ghost" 
            size="icon" 
            className="rounded-full"
            onClick={() => window.history.back()}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold">Crear Viaje</h1>
        </div>
      </div>

      <form onSubmit={handleCreate} className="p-5 flex flex-col gap-6">
        {/* Basic Info */}
        <section className="flex flex-col gap-4 bg-card p-4 rounded-xl border shadow-sm">
          <h2 className="font-semibold text-foreground border-b pb-2">Información Principal</h2>
          
          <div className="grid gap-2">
            <Label htmlFor="title">Título del Viaje *</Label>
            <Input 
              id="title"
              placeholder="Ej. Aventura en la Sierra Nevada"
              value={formData.title}
              onChange={(e) => setFormData({...formData, title: e.target.value})}
              required
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="destination">Destino *</Label>
            <Input 
              id="destination"
              placeholder="Ej. Santa Marta, Colombia"
              value={formData.destination}
              onChange={(e) => setFormData({...formData, destination: e.target.value})}
              required
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="description">Descripción</Label>
            <textarea 
              id="description"
              className="flex min-h-[100px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="Describe lo increíble que será este viaje..."
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
            />
          </div>
        </section>

        {/* Categories */}
        <section className="flex flex-col gap-4 bg-card p-4 rounded-xl border shadow-sm">
          <h2 className="font-semibold text-foreground border-b pb-2">Categorías</h2>
          <div className="flex flex-wrap gap-2">
            {DEFAULT_TAGS.map(tag => (
              <Badge 
                key={tag}
                variant={formData.tags.includes(tag) ? "default" : "outline"}
                className={`cursor-pointer px-3 py-1 text-xs capitalize ${
                  formData.tags.includes(tag) ? "" : "hover:bg-muted"
                }`}
                onClick={() => toggleTag(tag)}
              >
                {tag}
              </Badge>
            ))}
          </div>
        </section>

        {/* Logistics Info */}
        <section className="grid sm:grid-cols-2 gap-4 bg-card p-4 rounded-xl border shadow-sm">
          <h2 className="font-semibold text-foreground border-b pb-2 sm:col-span-2">Logística</h2>
          
          <div className="grid gap-2">
            <Label htmlFor="price">Precio por persona (COP) *</Label>
            <Input 
              id="price"
              type="number"
              min="0"
              placeholder="0"
              value={formData.price}
              onChange={(e) => setFormData({...formData, price: e.target.value})}
              required
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="maxParticipants">Cupos máximos *</Label>
            <Input 
              id="maxParticipants"
              type="number"
              min="1"
              placeholder="10"
              value={formData.maxParticipants}
              onChange={(e) => setFormData({...formData, maxParticipants: e.target.value})}
              required
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="startDate">Fecha de Inicio *</Label>
            <Input 
              id="startDate"
              type="date"
              value={formData.startDateStr}
              onChange={(e) => setFormData({...formData, startDateStr: e.target.value})}
              required
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="endDate">Fecha de Fin *</Label>
            <Input 
              id="endDate"
              type="date"
              value={formData.endDateStr}
              onChange={(e) => setFormData({...formData, endDateStr: e.target.value})}
              required
            />
          </div>

          <div className="grid gap-2 sm:col-span-2">
            <Label htmlFor="durationDays">Duración (Días) *</Label>
            <Input 
              id="durationDays"
              type="number"
              min="1"
              placeholder="1"
              value={formData.durationDays}
              onChange={(e) => setFormData({...formData, durationDays: e.target.value})}
              required
            />
          </div>
        </section>

        <div className="pt-4 pb-12 sm:pb-6">
          <Button 
            type="submit" 
            className="w-full rounded-full h-12 text-base font-semibold shadow-md hover:shadow-lg transition-all"
            disabled={loading}
          >
            {loading ? (
              "Creando tu aventura..."
            ) : (
              <>
                <Save className="mr-2 h-5 w-5" />
                Publicar Viaje
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}