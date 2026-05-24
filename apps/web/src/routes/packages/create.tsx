import { api } from "@proy_vibetribe/backend/convex/_generated/api";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation } from "convex/react";
import { useState, useRef } from "react";
import { toast } from "sonner";
import { Save, Camera, X, Image as ImageIcon, Plus, Pencil, Trash2, MapPin, Calendar, Map, ChevronDown, ChevronUp } from "lucide-react";
import { format } from "date-fns";

import { Button } from "@proy_vibetribe/ui/components/button";
import { Input } from "@proy_vibetribe/ui/components/input";
import { Label } from "@proy_vibetribe/ui/components/label";
import { Badge } from "@proy_vibetribe/ui/components/badge";
import { Textarea } from "@proy_vibetribe/ui/components/textarea";
import { Checkbox } from "@proy_vibetribe/ui/components/checkbox";
import { Separator } from "@proy_vibetribe/ui/components/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@proy_vibetribe/ui/components/dialog";
import { LocationInput } from "@/components/location-input";
import { getGoogleMapsApiKey } from "@/lib/maps";
import { PageHeader } from "@/components/page-header";

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
  const [coverImage, setCoverImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [price, setPrice] = useState(0);
  const [priceDisplay, setPriceDisplay] = useState("");

  const [formData, setFormData] = useState({
    title: "",
    destination: "",
    description: "",
    accommodation: "",
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

  const [activities, setActivities] = useState<any[]>([]);
  const [isActivityDialogOpen, setIsActivityDialogOpen] = useState(false);
  const [editingActivityIndex, setEditingActivityIndex] = useState<number | null>(null);
  const [showAdvancedAct, setShowAdvancedAct] = useState(false);
  const actFileInputRef = useRef<HTMLInputElement>(null);

  const [actForm, setActForm] = useState({
    title: "",
    description: "",
    dateStr: "",
    location: "",
    duration: "1 día",
    isIncluded: true,
    cost: 0,
    imageUrl: null as string | null,
    accommodation: "",
    increasePackagePrice: false,
  });

  const resetActForm = () => {
    setActForm({
      title: "",
      description: "",
      dateStr: formData.startDateStr || "",
      location: "",
      duration: "1 día",
      isIncluded: true,
      cost: 0,
      imageUrl: null,
      accommodation: "",
      increasePackagePrice: false,
    });
    setEditingActivityIndex(null);
    setShowAdvancedAct(false);
  };

  const handleActImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error("La imagen debe ser menor a 2MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const b64 = event.target?.result as string;
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX = 800;
        let w = img.width, h = img.height;
        if (w > h) { if (w > MAX) { h *= MAX / w; w = MAX; } } 
        else { if (h > MAX) { w *= MAX / h; h = MAX; } }
        canvas.width = w; canvas.height = h;
        canvas.getContext("2d")?.drawImage(img, 0, 0, w, h);
        setActForm(f => ({ ...f, imageUrl: canvas.toDataURL("image/jpeg", 0.7) }));
      };
      img.src = b64;
    };
    reader.readAsDataURL(file);
  };

  const saveActivity = () => {
    if (!actForm.title || !actForm.location) {
      toast.error("Completa título y ubicación");
      return;
    }

    if (actForm.dateStr) {
      if (!formData.startDateStr || !formData.endDateStr) {
        toast.error("Por favor define primero las fechas de inicio y fin del paquete en la sección de Logística.");
        return;
      }
      if (actForm.dateStr < formData.startDateStr || actForm.dateStr > formData.endDateStr) {
        toast.error("La fecha de la parada debe estar entre el inicio y el fin del viaje.");
        return;
      }
    }

    const newAct = {
      title: actForm.title,
      description: actForm.description,
      date: actForm.dateStr ? new Date(actForm.dateStr).getTime() : Date.now(),
      location: actForm.location,
      duration: actForm.duration,
      isIncluded: actForm.isIncluded,
      cost: actForm.cost,
      imageUrl: actForm.imageUrl,
      accommodation: actForm.accommodation || undefined,
    };

    if (editingActivityIndex !== null) {
      const updated = [...activities];
      updated[editingActivityIndex] = newAct;
      setActivities(updated);
    } else {
      setActivities([...activities, newAct]);
    }
    
    // Automatically increase package price if user checked the box and cost is > 0
    if (!actForm.isIncluded && actForm.cost > 0 && actForm.increasePackagePrice) {
      const newTotal = price + actForm.cost;
      setPrice(newTotal);
      setPriceDisplay(new Intl.NumberFormat("es-CO").format(newTotal));
    }
    
    setIsActivityDialogOpen(false);
    resetActForm();
  };

  const editActivity = (index: number) => {
    const act = activities[index];
    setActForm({
      title: act.title,
      description: act.description,
      dateStr: act.date ? format(new Date(act.date), "yyyy-MM-dd") : "",
      location: act.location,
      duration: act.duration,
      isIncluded: act.isIncluded,
      cost: act.cost || 0,
      imageUrl: act.imageUrl || null,
      accommodation: act.accommodation || "",
      increasePackagePrice: false, // Reset this so they don't accidentally add the price again
    });
    setEditingActivityIndex(index);
    setShowAdvancedAct(!!act.accommodation || (!act.isIncluded && (act.cost || 0) > 0));
    setIsActivityDialogOpen(true);
  };

  const removeActivity = (index: number) => {
    const updated = [...activities];
    updated.splice(index, 1);
    setActivities(updated);
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
        price: price,
        maxParticipants: Number(formData.maxParticipants),
        startDate: start,
        endDate: end,
        tags: formData.tags,
        imageUrl: coverImage || undefined,
        accommodation: formData.accommodation || undefined,
        activities: activities,
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
      <PageHeader title="Crear Viaje" />

      <form onSubmit={handleCreate} className="p-5 flex flex-col gap-6">
        {/* Cover Image */}
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
                <p className="text-xs">Haz clic o arrastra una imagen aquí</p>
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
              className="flex min-h-[100px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="Describe lo increíble que será este viaje..."
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
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

        {/* Itinerary Editor */}
        <section className="flex flex-col gap-4 bg-card p-4 rounded-xl border shadow-sm">
          <div className="flex items-center justify-between border-b pb-2">
            <h2 className="font-semibold text-foreground">Itinerario</h2>
            <Button 
              type="button"
              variant="outline" 
              size="sm" 
              className="h-8 gap-1"
              onClick={() => { resetActForm(); setIsActivityDialogOpen(true); }}
            >
              <Plus className="h-4 w-4" />
              Añadir Parada
            </Button>
          </div>

          <div className="flex flex-col gap-3 mt-2">
            {activities.length === 0 ? (
              <div className="text-center p-6 text-muted-foreground bg-muted/30 rounded-lg border border-dashed">
                <Map className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No hay paradas en el itinerario aún.</p>
                <p className="text-xs mt-1">Añade destinos o actividades para formar el pipeline.</p>
              </div>
            ) : (
              activities.sort((a, b) => a.date - b.date).map((act, i) => (
                <div key={i} className="flex gap-3 items-start group relative bg-background p-3 rounded-lg border shadow-sm">
                  <div className="flex flex-col items-center mt-1">
                    <div className="h-6 w-6 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-xs">
                      {i + 1}
                    </div>
                    {i !== activities.length - 1 && (
                      <Separator orientation="vertical" className="h-10 mt-1" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <h3 className="font-semibold text-sm line-clamp-1">{act.title}</h3>
                      <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                        <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => editActivity(i)}>
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button type="button" variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:bg-destructive/10" onClick={() => removeActivity(i)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    <div className="flex items-center text-xs text-muted-foreground mt-1 gap-3">
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" /> {act.location}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" /> {act.date ? format(new Date(act.date), "MMM d") : ""}
                      </span>
                    </div>
                  </div>
                  {act.imageUrl && (
                    <div className="h-12 w-12 rounded object-cover overflow-hidden bg-muted shrink-0">
                      <img src={act.imageUrl} alt="" className="h-full w-full object-cover" />
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </section>

        {/* Logistics Info */}
        <section className="grid sm:grid-cols-2 gap-4 bg-card p-4 rounded-xl border shadow-sm">
          <h2 className="font-semibold text-foreground border-b pb-2 sm:col-span-2">Logística</h2>
          
          <div className="grid gap-2">
            <Label htmlFor="price">Precio por persona (COP) *</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                $
              </span>
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
            <p className="text-xs text-muted-foreground">
              {price > 0 && (
                <span>Valor: {new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP" }).format(price)}</span>
              )}
            </p>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="maxParticipants">Cupos máximos *</Label>
            <Input 
              id="maxParticipants"
              type="number"
              min="1"
              placeholder="10"
              value={formData.maxParticipants}
              onChange={(e) => setFormData({...formData, maxParticipants: Number(e.target.value)})}
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
              onChange={(e) => setFormData({ ...formData, endDateStr: e.target.value })}
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

      {/* Activity Modal */}
      <Dialog open={isActivityDialogOpen} onOpenChange={setIsActivityDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{editingActivityIndex !== null ? "Editar Parada" : "Añadir Parada"}</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div
              className="relative h-32 w-full rounded-lg border-2 border-dashed border-muted-foreground/25 overflow-hidden cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => actFileInputRef.current?.click()}
            >
              {actForm.imageUrl ? (
                <>
                  <img src={actForm.imageUrl} alt="Parada" className="h-full w-full object-cover" />
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                    <Button type="button" variant="secondary" size="sm" onClick={(e) => { e.stopPropagation(); setActForm(f => ({...f, imageUrl: null})); }}>
                      <X className="h-4 w-4 mr-1" /> Remover
                    </Button>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center h-full gap-2 text-muted-foreground">
                  <Camera className="h-8 w-8" />
                  <p className="text-xs font-medium">Añadir foto de la parada</p>
                </div>
              )}
              <input type="file" ref={actFileInputRef} onChange={handleActImage} accept="image/*" className="hidden" />
            </div>

            <div className="grid gap-2">
              <Label>Título *</Label>
              <Input placeholder="Ej. Llegada a París" value={actForm.title} onChange={e => setActForm(f => ({...f, title: e.target.value}))} />
            </div>

            <div className="grid gap-2">
              <Label>Ubicación *</Label>
              <LocationInput apiKey={getGoogleMapsApiKey()} value={actForm.location} onChange={v => setActForm(f => ({...f, location: v}))} placeholder="Ej. Torre Eiffel, París" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Fecha</Label>
                <Input type="date" value={actForm.dateStr} onChange={e => setActForm(f => ({...f, dateStr: e.target.value}))} />
              </div>
              <div className="grid gap-2">
                <Label>Duración</Label>
                <Input placeholder="Ej. 2 horas" value={actForm.duration} onChange={e => setActForm(f => ({...f, duration: e.target.value}))} />
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Descripción</Label>
              <Textarea placeholder="Qué se hará en este punto..." value={actForm.description} onChange={e => setActForm(f => ({...f, description: e.target.value}))} />
            </div>

            <div className="flex items-center space-x-2 pt-2 border-t">
              <Checkbox id="included" checked={actForm.isIncluded} onCheckedChange={(c: boolean) => setActForm(f => ({...f, isIncluded: c}))} />
              <Label htmlFor="included" className="font-normal cursor-pointer">Actividad gratuita / Ya incluida en el precio base</Label>
            </div>

            <Button
              type="button"
              variant="ghost"
              className="w-full flex items-center justify-between mt-2"
              onClick={() => setShowAdvancedAct(!showAdvancedAct)}
            >
              <span className="text-sm font-medium">Opciones Adicionales</span>
              {showAdvancedAct ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>

            {showAdvancedAct && (
              <div className="grid gap-4 bg-muted/30 p-3 rounded-lg border border-dashed animate-in fade-in slide-in-from-top-2">
                <div className="grid gap-2">
                  <Label>Alojamiento específico (opcional)</Label>
                  <Input placeholder="Ej. Hotel 4 estrellas en esta parada" value={actForm.accommodation} onChange={e => setActForm(f => ({...f, accommodation: e.target.value}))} />
                </div>

                {!actForm.isIncluded && (
                  <div className="grid gap-3 pt-2">
                    <div className="grid gap-2">
                      <Label>Costo adicional estimado (COP)</Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                        <Input type="number" placeholder="0" className="pl-6" value={actForm.cost || ""} onChange={e => setActForm(f => ({...f, cost: Number(e.target.value)}))} />
                      </div>
                    </div>
                    <div className="flex items-start space-x-2">
                      <Checkbox id="increasePackagePrice" checked={actForm.increasePackagePrice} onCheckedChange={(c: boolean) => setActForm(f => ({...f, increasePackagePrice: c}))} />
                      <div className="grid gap-1.5 leading-none">
                        <Label htmlFor="increasePackagePrice" className="cursor-pointer font-medium">Sumar automáticamente al valor del viaje</Label>
                        <p className="text-[11px] text-muted-foreground">Si marcas esto, el costo de esta parada se sumará al precio total del paquete de viaje.</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsActivityDialogOpen(false)}>Cancelar</Button>
            <Button onClick={saveActivity}>Guardar Parada</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}